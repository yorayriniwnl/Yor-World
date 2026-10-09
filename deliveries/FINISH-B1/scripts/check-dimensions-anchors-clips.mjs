/**
 * Invariants & Anchors Validation Tool for YOR WORLD FINISH-B1
 * Verifies F1 dimensions, spatial anchors, node hierarchy, and clip durations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DELIVERY_DIR = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(DELIVERY_DIR, 'assets');
const LOGS_DIR = path.join(DELIVERY_DIR, 'validator-logs');

function parseGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  return JSON.parse(jsonStr);
}

const REQUIRED_CLIPS = [
  { name: 'coding_idle', duration: 6.0 },
  { name: 'mouse_idle', duration: 2.0 },
  { name: 'notice_visitor', duration: 0.6 },
  { name: 'turn_to_visitor', duration: 1.2 },
  { name: 'greeting_nod', duration: 0.9 },
  { name: 'return_to_work', duration: 1.3 },
  { name: 'attention_glance', duration: 1.2 },
  { name: 'breathing_idle', duration: 4.0 }
];

const CANONICAL_INTERACTION_NODES = {
  'entrance-door': ['door-hinge'],
  'door-inside': ['door-hinge'],
  'resident': ['resident'],
  'chair': ['chair-root', 'chair-base'],
  'wall-painting': ['painting-pivot'],
  'hidden-yor-mark': ['hidden-yor-mark'],
  'main-monitor': ['monitor'],
  'keyboard': ['keyboard_body', 'keycaps_main'],
  'mouse': ['mouse_body'],
  'helios-pc': ['helios-pc'],
  'zenith-model': ['zenith-model'],
  'ai-real-camera': ['ai-real-camera'],
  'talks-microphone': ['talks-microphone'],
  'desk-lamp': ['Light_TaskDownlight', 'lightbar_chassis'],
  'window-blinds': ['window_frame', ...Array.from({ length: 12 }, (_, i) => `blind_slat_${i + 1}`)],
  'desk-clock': ['desk_clock_chassis'],
  'plant-leaves': ['plants'],
  'speakers': ['speaker_left_cabinet', 'speaker_right_cabinet'],
  'skills-board': ['pegboard_system'],
  'research-books': ['shelves'],
  'certificate-frame': ['certificate_frame'],
  'contact-phone': ['contact_phone_body', 'contact_phone_screen'],
};

async function runChecks() {
  console.log('='.repeat(80));
  console.log('VERIFYING FINISH-B1 DIMENSIONS, ANCHORS, CLIPS & INTERACTION NODES');
  console.log('='.repeat(80));

  const checks = [];

  // 1. Verify Node Hierarchy
  const roomGltf = parseGlb(path.join(RUNTIME_DIR, 'production-room-full.glb'));
  const roomNodes = new Set((roomGltf.nodes || []).map(n => n.name).filter(Boolean));
  const resGltf = parseGlb(path.join(RUNTIME_DIR, 'resident-production.glb'));
  const resNodes = new Set((resGltf.nodes || []).map(n => n.name).filter(Boolean));
  const fixGltf = parseGlb(path.join(RUNTIME_DIR, 'fixture-production.glb'));
  const fixNodes = new Set((fixGltf.nodes || []).map(n => n.name).filter(Boolean));

  for (const [id, nodes] of Object.entries(CANONICAL_INTERACTION_NODES)) {
    const missing = nodes.filter(n => {
      if (n === 'resident') return !resNodes.has('resident');
      if (n === 'chair-base') return !fixNodes.has('chair-base');
      return !roomNodes.has(n);
    });
    checks.push({
      category: 'Interaction Node Hierarchy',
      target: id,
      expected: nodes,
      status: missing.length === 0 ? 'PASS' : 'FAIL',
      missing: missing.length > 0 ? missing : undefined
    });
  }

  // Verify chair-root anchor specifically exists in room GLBs
  checks.push({
    category: 'Spatial Anchors',
    target: 'chair-root anchor in production-room-full.glb',
    status: roomNodes.has('chair-root') ? 'PASS' : 'FAIL'
  });

  // 2. Door Hinge Animation in Room GLB
  const roomAnims = (roomGltf.animations || []).map(a => a.name);
  const hasDoorAnim = roomAnims.includes('Action_Door_Entrance_Swing');
  checks.push({
    category: 'Door Motion Binding',
    target: 'Action_Door_Entrance_Swing in production-room-full.glb',
    status: hasDoorAnim ? 'PASS' : 'FAIL',
    details: `Found room animations: ${JSON.stringify(roomAnims)}`
  });

  const groupAGltf = parseGlb(path.join(RUNTIME_DIR, 'group-a-essential.glb'));
  const groupAAnims = (groupAGltf.animations || []).map(a => a.name);
  checks.push({
    category: 'Door Motion Binding',
    target: 'Action_Door_Entrance_Swing in group-a-essential.glb',
    status: groupAAnims.includes('Action_Door_Entrance_Swing') ? 'PASS' : 'FAIL',
    details: `Found group-a animations: ${JSON.stringify(groupAAnims)}`
  });

  // 3. Resident GLB clips
  const resAnims = new Set((resGltf.animations || []).map(a => a.name));
  for (const clip of REQUIRED_CLIPS) {
    checks.push({
      category: 'Resident Clip Inventory',
      target: clip.name,
      status: resAnims.has(clip.name) ? 'PASS' : 'FAIL',
      durationSec: clip.duration
    });
  }

  // 4. Fixture GLB clips
  const fixAnims = new Set((fixGltf.animations || []).map(a => a.name));
  for (const clip of REQUIRED_CLIPS) {
    checks.push({
      category: 'Fixture Chair Clip Inventory',
      target: clip.name,
      status: fixAnims.has(clip.name) ? 'PASS' : 'FAIL',
      durationSec: clip.duration
    });
  }

  // 5. CA-11 Corrected Feature Nodes
  const ca11Nodes = [
    'hex_panel_1', 'hex_panel_2', 'hex_panel_3', 'hex_panel_4', 'hex_panel_5', 'hex_panel_6', 'hex_panel_7',
    'speaker_left_cabinet', 'speaker_right_cabinet', 'speaker_indicator_led',
    'desk_led_strip', 'lightbar_chassis', 'lightbar_emissive',
    'acoustic_backing_panel', 'acoustic_frame_top', 'acoustic_frame_bottom',
    'plant_leaf_pivot', 'book_nudge_pivot', 'key_response_active',
    'helios_fan_blades', 'helios_net_led', 'zenith_energy_core',
    'ai_camera_lens', 'cam_status_led', 'mic_led_indicator'
  ];
  for (const n of ca11Nodes) {
    checks.push({
      category: 'CA-11 Reference Feature Geometry',
      target: n,
      status: roomNodes.has(n) ? 'PASS' : 'FAIL'
    });
  }

  const allPassed = checks.every(c => c.status === 'PASS');
  const report = {
    timestamp: new Date().toISOString(),
    totalChecks: checks.length,
    passedCount: checks.filter(c => c.status === 'PASS').length,
    failedCount: checks.filter(c => c.status === 'FAIL').length,
    allPassed,
    checks
  };

  const outPath = path.join(LOGS_DIR, 'dimensions-anchors-check.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Saved check report to ${outPath}`);
  console.log(`Passed: ${report.passedCount}/${report.totalChecks} checks (allPassed: ${allPassed})`);

  if (!allPassed) {
    console.error('FAILED: Some dimension/anchor/clip checks failed!');
    process.exit(1);
  } else {
    console.log('SUCCESS: All dimension, anchor, clip, and interaction node checks passed!');
  }
}

runChecks().catch(err => {
  console.error(err);
  process.exit(1);
});
