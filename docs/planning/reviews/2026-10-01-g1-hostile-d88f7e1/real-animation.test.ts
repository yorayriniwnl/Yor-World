// Reviewer regression: real W2 GLBs, actual Three mixers; candidate is unchanged.
import { test, expect } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { integrateScene } from '../../src/features/world/SceneIntegrator';
import { CharacterDirector } from '../../src/features/world/CharacterDirector';

async function load(name: string) {
  const bytes=fs.readFileSync(path.resolve('public/models',name));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}
async function setup() {
  const [avatar,fixture]=await Promise.all([load('avatar-proof.glb'),load('fixture-proof.glb')]);
  const room = new THREE.Group();
  const desk = new THREE.Group();desk.name='desk';room.add(desk);
  const result=integrateScene({scene:room} as never,avatar,fixture);
  const director=new CharacterDirector(result.avatarMixer,result.chairMixer,result.avatarActions,result.chairActions,result.bodyTurn,result.chairRoot);
  return {result,director};
}
test('initial real coding_idle must be scheduled for both actual GLBs',async()=>{
  const {result,director}=await setup();
  director.advance(1);
  const observed={clip:director.currentClip,time:director.currentTime,avatarScheduled:result.avatarActions.coding_idle?.isScheduled(),chairScheduled:result.chairActions.coding_idle?.isScheduled()};
  console.log('INITIAL_ACTUAL_ACTIONS',JSON.stringify(observed));
  fs.writeFileSync(path.join(process.env.REVIEWER_EVIDENCE!,'real-animation-initial.json'),JSON.stringify(observed,null,2));
  expect(observed.avatarScheduled).toBe(true);
  expect(observed.chairScheduled).toBe(true);
});
test('real GLBs: repeated greeting/skip stays aligned without root drift or stale queue',async()=>{
  const {result,director}=await setup();
  const origin=result.resident.getWorldPosition(new THREE.Vector3());
  let maximumDrift=0,maximumYawDifference=0,maximumYaw=0;
  for(let cycle=0;cycle<5;cycle++){
    director.playGreeting();const revision=director.revision;director.playGreeting();expect(director.revision).toBe(revision);
    for(let frame=0;frame<250;frame++){
      director.advance(1/60);
      maximumDrift=Math.max(maximumDrift,result.resident.getWorldPosition(new THREE.Vector3()).distanceTo(origin));
      maximumYawDifference=Math.max(maximumYawDifference,Math.abs(director.getBodyYawDeg()-director.getChairYawDeg()));
      maximumYaw=Math.max(maximumYaw,Math.abs(director.getChairYawDeg()));
    }
    director.settle();director.advance(5);expect(director.mode).toBe('coding');
  }
  console.log('REAL_GLB_REPEATS',JSON.stringify({maximumDrift,maximumYawDifference,maximumYaw,avatarIdleScheduled:result.avatarActions.coding_idle?.isScheduled()}));
  fs.writeFileSync(path.join(process.env.REVIEWER_EVIDENCE!,'real-animation-repeats.json'),JSON.stringify({maximumDrift,maximumYawDifference,maximumYaw,avatarIdleScheduled:result.avatarActions.coding_idle?.isScheduled()},null,2));
  expect(maximumDrift).toBeLessThan(0.0001);expect(maximumYawDifference).toBeLessThan(0.01);expect(maximumYaw).toBeGreaterThan(120);
});
