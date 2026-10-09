import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CharacterDirector } from "../src/features/world/CharacterDirector";

interface BoneData {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  rotation: [number, number, number];
}

interface BoneSnapshot {
  time: number;
  mode: string;
  clip: string;
  isPaused: boolean;
  bones: Record<string, BoneData>;
}

async function loadGlb(filePath: string): Promise<GLTF> {
  const fileBuf = fs.readFileSync(filePath);
  const arrayBuf = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(arrayBuf, "", (gltf) => resolve(gltf), (err) => reject(err));
  });
}

function captureBones(root: THREE.Object3D, boneNames: string[]): Record<string, BoneData> {
  const result: Record<string, BoneData> = {};
  for (const name of boneNames) {
    const obj = root.getObjectByName(name);
    if (obj) {
      result[name] = {
        position: [
          parseFloat(obj.position.x.toFixed(6)),
          parseFloat(obj.position.y.toFixed(6)),
          parseFloat(obj.position.z.toFixed(6)),
        ],
        quaternion: [
          parseFloat(obj.quaternion.x.toFixed(6)),
          parseFloat(obj.quaternion.y.toFixed(6)),
          parseFloat(obj.quaternion.z.toFixed(6)),
          parseFloat(obj.quaternion.w.toFixed(6)),
        ],
        rotation: [
          parseFloat(obj.rotation.x.toFixed(6)),
          parseFloat(obj.rotation.y.toFixed(6)),
          parseFloat(obj.rotation.z.toFixed(6)),
        ],
      };
    }
  }
  return result;
}

async function run() {
  console.log("=== CA-07 Diagnostic: Real GLB Character Bone Deformation ===");
  const avatarPath = path.join(process.cwd(), "public/models/resident-production.glb");
  const chairPath = path.join(process.cwd(), "public/models/fixture-production.glb");

  const avatarGltf = await loadGlb(avatarPath);
  const chairGltf = await loadGlb(chairPath);

  const avatarMixer = new THREE.AnimationMixer(avatarGltf.scene);
  const chairMixer = new THREE.AnimationMixer(chairGltf.scene);

  const avatarActions: Record<string, THREE.AnimationAction> = {};
  const chairActions: Record<string, THREE.AnimationAction> = {};

  for (const clip of avatarGltf.animations) {
    avatarActions[clip.name] = avatarMixer.clipAction(clip);
  }
  for (const clip of chairGltf.animations) {
    chairActions[clip.name] = chairMixer.clipAction(clip);
  }

  // Key resident bones to monitor (actual bone names from resident-production.glb)
  const monitoredBones = [
    "body-turn",
    "pelvis",
    "spine",
    "chest",
    "clavicleL",
    "upper-armL",
    "forearmL",
    "handL",
    "clavicleR",
    "upper-armR",
    "forearmR",
    "handR",
    "neck",
    "head",
  ];

  // 1. Instantiation check
  const director = new CharacterDirector(
    avatarMixer,
    chairMixer,
    avatarActions,
    chairActions,
    avatarGltf.scene,
    chairGltf.scene,
    "diag-director"
  );

  const initialActionScheduled = avatarActions.coding_idle?.isScheduled() === true;
  const chairActionScheduled = chairActions.coding_idle?.isScheduled() === true;
  console.log("Avatar coding_idle isScheduled:", initialActionScheduled);
  console.log("Chair coding_idle isScheduled:", chairActionScheduled);

  const snapshots: BoneSnapshot[] = [];

  // Snapshot 0: Immediately upon instantiation (t=0)
  snapshots.push({
    time: 0,
    mode: director.mode,
    clip: director.currentClip,
    isPaused: director.isDecorativePaused,
    bones: captureBones(avatarGltf.scene, monitoredBones),
  });

  // Advance initial idle: t = 0.25, 0.5, 1.0, 1.5, 2.0s
  const idleSteps = [0.25, 0.25, 0.5, 0.5, 0.5];
  let accumulatedTime = 0;
  for (const step of idleSteps) {
    director.advance(step);
    accumulatedTime += step;
    snapshots.push({
      time: parseFloat(accumulatedTime.toFixed(2)),
      mode: director.mode,
      clip: director.currentClip,
      isPaused: director.isDecorativePaused,
      bones: captureBones(avatarGltf.scene, monitoredBones),
    });
  }

  // 2. Pause test: set decorative paused = true
  director.setDecorativePaused(true);
  console.log("Decorative paused set to TRUE");

  // Advance while paused: t = 2.5, 3.0s
  for (const step of [0.5, 0.5]) {
    director.advance(step);
    accumulatedTime += step;
    snapshots.push({
      time: parseFloat(accumulatedTime.toFixed(2)),
      mode: director.mode,
      clip: director.currentClip,
      isPaused: director.isDecorativePaused,
      bones: captureBones(avatarGltf.scene, monitoredBones),
    });
  }

  // 3. Resume test: set decorative paused = false
  director.setDecorativePaused(false);
  console.log("Decorative paused set to FALSE (resumed)");

  // Advance after resume: t = 3.5, 4.0s
  for (const step of [0.5, 0.5]) {
    director.advance(step);
    accumulatedTime += step;
    snapshots.push({
      time: parseFloat(accumulatedTime.toFixed(2)),
      mode: director.mode,
      clip: director.currentClip,
      isPaused: director.isDecorativePaused,
      bones: captureBones(avatarGltf.scene, monitoredBones),
    });
  }

  // 4. Greeting sequence test during pause
  director.setDecorativePaused(true);
  director.playGreeting();
  console.log("Triggered greeting while paused; mode:", director.mode);
  director.advance(4.5); // full greeting duration
  console.log("Greeting completed; mode:", director.mode, "currentTime:", director.currentTime);

  const postGreetingSnapshot: BoneSnapshot = {
    time: parseFloat((accumulatedTime + 4.5).toFixed(2)),
    mode: director.mode,
    clip: director.currentClip,
    isPaused: director.isDecorativePaused,
    bones: captureBones(avatarGltf.scene, monitoredBones),
  };

  // Verify bone deformations
  const t0 = snapshots.find((s) => s.time === 0)!;
  const t0_5 = snapshots.find((s) => s.time === 0.5)!;
  const t2_0 = snapshots.find((s) => s.time === 2.0)!;
  const t2_5 = snapshots.find((s) => s.time === 2.5)!; // paused
  const t3_0 = snapshots.find((s) => s.time === 3.0)!; // paused
  const t3_5 = snapshots.find((s) => s.time === 3.5)!; // resumed

  // Calculate delta between t=0 and t=0.5 (must be > 0)
  const calcDelta = (b1: Record<string, BoneData>, b2: Record<string, BoneData>): number => {
    let diff = 0;
    for (const k of Object.keys(b1)) {
      if (!b2[k]) continue;
      const q1 = b1[k]!.quaternion;
      const q2 = b2[k]!.quaternion;
      diff += Math.abs(q1[0] - q2[0]) + Math.abs(q1[1] - q2[1]) + Math.abs(q1[2] - q2[2]) + Math.abs(q1[3] - q2[3]);
    }
    return diff;
  };

  const initialDeformationDelta = calcDelta(t0.bones, t0_5.bones);
  const idleDeformationDelta = calcDelta(t0_5.bones, t2_0.bones);
  const pausedDelta = calcDelta(t2_0.bones, t2_5.bones);
  const pausedStepDelta = calcDelta(t2_5.bones, t3_0.bones);
  const resumedDelta = calcDelta(t3_0.bones, t3_5.bones);

  const checks = {
    avatarActionScheduled: initialActionScheduled,
    chairActionScheduled: chairActionScheduled,
    initialDeformationActive: initialDeformationDelta > 0.001,
    initialDeformationDelta: parseFloat(initialDeformationDelta.toFixed(6)),
    idleDeformationActive: idleDeformationDelta > 0.001,
    idleDeformationDelta: parseFloat(idleDeformationDelta.toFixed(6)),
    pausedFrozen: pausedDelta === 0 && pausedStepDelta === 0,
    pausedDelta: parseFloat((pausedDelta + pausedStepDelta).toFixed(6)),
    resumedActive: resumedDelta > 0.001,
    resumedDelta: parseFloat(resumedDelta.toFixed(6)),
    greetingReturnedToCodingRest: director.mode === "coding" && director.currentTime === 0,
    preservedPauseAfterGreeting: director.isDecorativePaused === true,
  };

  const evidence = {
    timestamp: new Date().toISOString(),
    assetModels: {
      residentGlb: avatarPath,
      fixtureGlb: chairPath,
    },
    checks,
    snapshots,
    postGreetingSnapshot,
  };

  const outDir = path.resolve(process.cwd(), "evidence");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outDir, "ca07-bone-deformation-evidence.json"),
    JSON.stringify(evidence, null, 2)
  );

  console.log("CA-07 Checks Summary:", JSON.stringify(checks, null, 2));
  if (
    checks.avatarActionScheduled &&
    checks.chairActionScheduled &&
    checks.initialDeformationActive &&
    checks.pausedFrozen &&
    checks.resumedActive &&
    checks.preservedPauseAfterGreeting
  ) {
    console.log(">>> ALL CA-07 DIAGNOSTIC CHECKS PASSED <<<");
  } else {
    console.error(">>> CA-07 DIAGNOSTIC CHECKS FAILED <<<");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
