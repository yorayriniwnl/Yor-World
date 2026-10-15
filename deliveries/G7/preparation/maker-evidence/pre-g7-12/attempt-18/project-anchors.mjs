import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../../../../../../app/node_modules/three/build/three.module.js';
const root = 'deliveries/G7/preparation/maker-evidence/pre-g7-12/attempt-18/';
const groups = JSON.parse(fs.readFileSync(`${root}glb-group-bounds.json`, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(`${root}glb-node-inventory.json`, 'utf8'));
const fixtureInventory = JSON.parse(fs.readFileSync(`${root}fixture-node-inventory.json`, 'utf8'));
const group = (name) => groups.groups.find((entry) => entry.name === name);
const node = (name) => inventory.relevantNodes.find((entry) => entry.name === name);
const bounds = (entry) => entry?.subtreeBounds?.min ? { min: entry.subtreeBounds.min, max: entry.subtreeBounds.max } : entry?.mesh?.primitives?.[0]?.bounds ? entry.mesh.primitives[0].bounds : null;
const union = (entries) => {
  const result = new THREE.Box3();
  for (const entry of entries) if (entry) result.union(new THREE.Box3(new THREE.Vector3(...entry.min), new THREE.Vector3(...entry.max)));
  return result.isEmpty() ? null : { min: result.min.toArray(), max: result.max.toArray() };
};
const transformed = (box, fn) => {
  if (!box) return null;
  const result = new THREE.Box3();
  for (let mask=0;mask<8;mask+=1) result.expandByPoint(fn(new THREE.Vector3(mask&1?box.max[0]:box.min[0],mask&2?box.max[1]:box.min[1],mask&4?box.max[2]:box.min[2])));
  return { min: result.min.toArray(), max: result.max.toArray() };
};
const children = (groupName, pattern) => group(groupName).children.filter((entry)=>pattern.test(entry.name)).map((entry)=>({min:entry.min,max:entry.max}));
const shiftedRightSpeaker = transformed(union(children('audio_and_accessories',/^speaker_right_/)),(p)=>p.add(new THREE.Vector3(-0.2,0.5,0)));
const fixtureChairBounds = union(fixtureInventory.relevantNodes.filter((entry)=>entry.chain.includes('chair-root') && entry.mesh).flatMap((entry)=>entry.mesh.primitives.map((primitive)=>primitive.bounds)).filter(Boolean));
const panelPositions={hex_panel_1:[-0.2235,1.87],hex_panel_2:[0,1.87],hex_panel_3:[0.2235,1.87],hex_panel_4:[-0.33525,1.6675],hex_panel_5:[-0.11175,1.6675],hex_panel_6:[0.11175,1.6675],hex_panel_7:[0.33525,1.6675]};
const anchors = [
  {id:'desk',source:'GLB group desk',bounds:bounds(group('desk'))},
  {id:'central monitor',source:'GLB group monitor',bounds:bounds(group('monitor'))},
  {id:'warm monitor bar',source:'GLB nodes lightbar_chassis/lightbar_emissive/lightbar_mount',bounds:union(children('monitor',/^lightbar_/))},
  {id:'two speakers',source:'GLB speaker_left_* and speaker_right_*; right speaker elevated beside monitor',bounds:union([union(children('audio_and_accessories',/^speaker_left_/)),shiftedRightSpeaker])},
  {id:'left speaker',source:'GLB speaker_left_*',bounds:union(children('audio_and_accessories',/^speaker_left_/))},
  {id:'right speaker',source:'GLB speaker_right_* with in-memory x -= 0.20, y += 0.50',bounds:shiftedRightSpeaker},
  {id:'pink/lilac panel cluster',source:'GLB nodes hex_panel_1..7; shader-clipped existing boxes and in-memory layout',bounds:union(inventory.relevantNodes.filter((entry)=>/^hex_panel_/.test(entry.name)).map((entry)=>{
    const [x,y]=panelPositions[entry.name]; const center=new THREE.Vector3(x,y,-1.61); const old=bounds(entry);

    const size=new THREE.Vector3((old.max[0]-old.min[0])*0.675,(old.max[1]-old.min[1])*0.675,(old.max[2]-old.min[2])*0.5);
    return {min:center.clone().sub(size).toArray(),max:center.clone().add(size).toArray()};
  }))},
  {id:'plant grouping',source:'GLB group plants; x += 0.72',bounds:transformed(bounds(group('plants')),(p)=>p.add(new THREE.Vector3(0.72,0,0)))},
  {id:'shelf monstera leaves',source:'GLB monstera_leaf_* and pot_monstera under plants; x += 0.72 and z -= 0.85',bounds:transformed(union(children('plants',/monstera_leaf_|pot_monstera|monstera_stand/)),(p)=>p.add(new THREE.Vector3(0.72,0,-0.85)))},
  {id:'ivy shelf leaves',source:'GLB ivy_vine_* and pot_ivy under plants; x += 0.72',bounds:transformed(union(children('plants',/ivy_vine_|ivy_mound|pot_ivy/)),(p)=>p.add(new THREE.Vector3(0.72,0,0)))},
  {id:'upper shelf board',source:'GLB node shelf_rear_upper under shelves',bounds:union(children('shelves',/^shelf_rear_upper$/))},
  {id:'shelf boards and props',source:'GLB group shelves',bounds:bounds(group('shelves'))},
  {id:'shelf camera',source:'GLB group ai-real-camera; center-scaled to target',bounds:transformed(bounds(group('ai-real-camera')),(p)=>new THREE.Vector3(-1.45,1.78,-1.32).add(p.sub(new THREE.Vector3(-1.45,1.7,-1.48)).multiplyScalar(1.8)))},
  {id:'microphone',source:'GLB group talks-microphone',bounds:bounds(group('talks-microphone'))},
  {id:'PC tower',source:'GLB group helios-pc',bounds:bounds(group('helios-pc'))},
  {id:'pegboard and controller',source:'GLB group pegboard_system; x += 3',bounds:transformed(bounds(group('pegboard_system')),(p)=>p.add(new THREE.Vector3(3,0,0)))},
  {id:'code-native headset stand',source:'PRE-G7-12 group at (1.12,0,-0.68)',bounds:{min:[1.025,0.756,-0.758],max:[1.215,0.993,-0.602]}},
  {id:'chair',source:'fixture-production.glb chair-root subtree; integrated at identity',bounds:fixtureChairBounds},
];
function project(box, camera, width, height) {
  if (!box) return null;
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  const projected=[];
  for(let mask=0;mask<8;mask+=1){const p=new THREE.Vector3(mask&1?box.max[0]:box.min[0],mask&2?box.max[1]:box.min[1],mask&4?box.max[2]:box.min[2]).project(camera);if(p.z>=-1&&p.z<=1)projected.push(p);}
  if(!projected.length)return null;
  const left=(Math.min(...projected.map(p=>p.x))+1)*width/2,right=(Math.max(...projected.map(p=>p.x))+1)*width/2,top=(1-Math.max(...projected.map(p=>p.y)))*height/2,bottom=(1-Math.min(...projected.map(p=>p.y)))*height/2;
  const visibleW=Math.max(0,Math.min(width,right)-Math.max(0,left)),visibleH=Math.max(0,Math.min(height,bottom)-Math.max(0,top)),fullW=Math.max(0,right-left),fullH=Math.max(0,bottom-top);
  return {left,top,right,bottom,width:fullW,height:fullH,visibleAreaRatio:fullW*fullH?(visibleW*visibleH)/(fullW*fullH):0};
}
const viewports=[
  {label:'desktop-1440x900',width:1440,height:900,position:[-.5,1.85,1.3],target:[0,1.27,-1.22],fov:48},
  {label:'mobile-390x844',width:390,height:844,position:[-.55,1.55,1.45],target:[0,1.1,-1.2],fov:100},
];
const modelBytes=fs.readFileSync('app/public/models/production-room-full.glb');
const modelSha256=createHash('sha256').update(modelBytes).digest('hex');
const fixtureBytes=fs.readFileSync('app/public/models/fixture-production.glb');
const fixtureSha256=createHash('sha256').update(fixtureBytes).digest('hex');
const result={model:'app/public/models/production-room-full.glb',modelSha256,fixture:'app/public/models/fixture-production.glb',fixtureSha256,viewports:viewports.map((view)=>{
  const camera=new THREE.PerspectiveCamera(view.fov,view.width/view.height,.05,30);camera.position.set(...view.position);camera.lookAt(...view.target);
  return {viewport:{width:view.width,height:view.height},cameraPreset:view.label.startsWith('desktop')?'home-desktop':'home-mobile',anchors:anchors.map((anchor)=>({id:anchor.id,source:anchor.source,bounds:anchor.bounds,projected:project(anchor.bounds,camera,view.width,view.height)})),panelCenters:Object.entries(panelPositions).map(([id,[x,y]])=>{const point=new THREE.Vector3(x,y,-1.61).project(camera);return {id,x:(point.x+1)*view.width/2,y:(1-point.y)*view.height/2,z:point.z};})};
})};
fs.writeFileSync(`${root}measurements/projected-anchor-bounds.json`,JSON.stringify(result,null,2)+'\n');
for(const view of result.viewports){console.log(`\n${view.cameraPreset} ${view.viewport.width}x${view.viewport.height}`);for(const anchor of view.anchors)console.log(`${anchor.id}: ${anchor.projected?`x${anchor.projected.left.toFixed(0)}..${anchor.projected.right.toFixed(0)} y${anchor.projected.top.toFixed(0)}..${anchor.projected.bottom.toFixed(0)} visible=${anchor.projected.visibleAreaRatio.toFixed(2)}`:'behind'} source=${anchor.source}`);}
