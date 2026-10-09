/**
 * Generate input-hashes.json, output-hashes.json, and candidate-asset-manifest.json
 * for YOR WORLD FINISH-B1.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const DELIVERY_DIR = path.resolve(__dirname, '..');

function computeFileHash(filePath) {
  const buf = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  return { hash, size: buf.length };
}

function parseGlbSummary(filePath) {
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const gltf = JSON.parse(jsonStr);

  const animations = (gltf.animations || []).map(a => a.name);
  const meshCount = (gltf.meshes || []).length;
  const materialCount = (gltf.materials || []).length;
  const nodeCount = (gltf.nodes || []).length;

  return {
    nodeCount,
    meshCount,
    materialCount,
    animations
  };
}

const INPUT_FILES = [
  'references/images/main-reference.png',
  'references/manifest.json',
  'references/README.md',
  'references/text/source-discussion.txt',
  'docs/planning/production-prompts/completion-2026-10-09/world-runtime.md',
  'app/src/features/world/WorldInteractionBinding.ts',
  'app/src/features/world/CameraDirector.ts',
  'app/src/features/world/ProductionLighting.ts'
];

function generateInputHashes() {
  console.log('Generating input-hashes.json...');
  const result = {
    generatedAt: new Date().toISOString(),
    milestone: 'FINISH-B1',
    inputs: {}
  };

  for (const rel of INPUT_FILES) {
    const full = path.join(ROOT_DIR, rel);
    if (fs.existsSync(full)) {
      const { hash, size } = computeFileHash(full);
      result.inputs[rel] = { sha256: hash, byteSize: size };
    } else {
      console.warn(`Input not found: ${rel}`);
    }
  }

  const outPath = path.join(DELIVERY_DIR, 'input-hashes.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`Saved ${outPath}`);
}

function walkDir(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walkDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function generateOutputHashes() {
  console.log('Generating output-hashes.json...');
  const allFiles = walkDir(DELIVERY_DIR);
  const result = {
    generatedAt: new Date().toISOString(),
    milestone: 'FINISH-B1',
    outputs: {}
  };

  for (const full of allFiles) {
    const rel = path.relative(DELIVERY_DIR, full).replace(/\\/g, '/');
    if (rel === 'output-hashes.json') continue; // don't self-hash
    const { hash, size } = computeFileHash(full);
    result.outputs[rel] = { sha256: hash, byteSize: size };
  }

  const outPath = path.join(DELIVERY_DIR, 'output-hashes.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
  console.log(`Saved ${outPath}`);
}

function generateCandidateManifest() {
  console.log('Generating candidate-asset-manifest.json...');
  const assetsDir = path.join(DELIVERY_DIR, 'assets');
  const glbFiles = [
    'production-room-full.glb',
    'group-a-essential.glb',
    'group-b-props.glb',
    'on-demand-projects.glb',
    'mobile-room-lod.glb',
    'resident-production.glb',
    'fixture-production.glb'
  ];

  const glbManifest = {};
  for (const f of glbFiles) {
    const full = path.join(assetsDir, f);
    if (fs.existsSync(full)) {
      const { hash, size } = computeFileHash(full);
      const summary = parseGlbSummary(full);
      glbManifest[f] = {
        path: `assets/${f}`,
        sha256: hash,
        byteSize: size,
        kilobytes: Math.round(size / 1024),
        ...summary
      };
    }
  }

  const texturesDir = path.join(assetsDir, 'textures');
  const textureFiles = fs.readdirSync(texturesDir).filter(f => f.endsWith('.png'));
  const textureManifest = {};
  for (const t of textureFiles) {
    const full = path.join(texturesDir, t);
    const { hash, size } = computeFileHash(full);
    textureManifest[t] = {
      path: `assets/textures/${t}`,
      sha256: hash,
      byteSize: size
    };
  }

  const sourceDir = path.join(assetsDir, 'source');
  const blendFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.blend'));
  const blendManifest = {};
  for (const b of blendFiles) {
    const full = path.join(sourceDir, b);
    const { hash, size } = computeFileHash(full);
    blendManifest[b] = {
      path: `assets/source/${b}`,
      sha256: hash,
      byteSize: size
    };
  }

  const candidateManifest = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    milestone: 'FINISH-B1',
    releaseCandidate: '1.0.0-rc1',
    authorLane: 'Gemini #2 (World / art maker)',
    date: '2026-10-09',
    description: 'Candidate asset manifest for FINISH-B1 production room, resident, fixture, and prop GLBs.',
    budgets: {
      budgetFullRoomBytes: 1572864, // 1.5 MB
      actualFullRoomBytes: glbManifest['production-room-full.glb']?.byteSize || 0,
      withinFullRoomBudget: (glbManifest['production-room-full.glb']?.byteSize || 0) <= 1572864,

      budgetResidentBytes: 1048576, // 1.0 MB
      actualResidentBytes: glbManifest['resident-production.glb']?.byteSize || 0,
      withinResidentBudget: (glbManifest['resident-production.glb']?.byteSize || 0) <= 1048576,

      budgetFixtureBytes: 524288, // 512 KB
      actualFixtureBytes: glbManifest['fixture-production.glb']?.byteSize || 0,
      withinFixtureBudget: (glbManifest['fixture-production.glb']?.byteSize || 0) <= 524288
    },
    runtimeGlbs: glbManifest,
    proceduralTextures: textureManifest,
    nativeSources: blendManifest,
    status: 'READY_FOR_AUDIT'
  };

  const outPath = path.join(DELIVERY_DIR, 'candidate-asset-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(candidateManifest, null, 2) + '\n');
  console.log(`Saved ${outPath}`);
}

async function main() {
  generateInputHashes();
  generateCandidateManifest();
  generateOutputHashes();
  console.log('Manifest and hash generation complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
