import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import * as THREE from "../../../../../../app/node_modules/three/build/three.module.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repo = path.resolve(root, "../../../..");
const require = createRequire(path.join(repo, "app/package.json"));
const validator = require("gltf-validator");
const output = process.argv[2] || "export-inspection-attempt-01.json";
if (path.basename(output) !== output) throw new Error("Output must be one new evidence filename");
const sha = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
const environmentAttempt = process.argv[3] || "build-attempt-01";
const fixtureAttempt = process.argv[4] || "fixture-attempt-01";

function inspect(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error("Not GLB2");
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20,20+jsonLength).toString("utf8"));
  const binaryStart = 20+jsonLength+8;
  const bin = bytes.subarray(binaryStart);
  const world = new Map(), parents = new Map();
  function walk(id, matrix, parent = null) {
    const node = json.nodes[id];
    const local = node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
      new THREE.Vector3(...(node.translation || [0,0,0])), new THREE.Quaternion(...(node.rotation || [0,0,0,1])), new THREE.Vector3(...(node.scale || [1,1,1])));
    const next = matrix.clone().multiply(local);
    world.set(id,next); parents.set(id,parent);
    for (const child of node.children || []) walk(child,next,id);
  }
  for (const id of json.scenes[json.scene || 0].nodes || []) walk(id,new THREE.Matrix4());
  const nodes = [...world.entries()].map(([id, matrix]) => {
    const node=json.nodes[id];
    const row = {name:node.name || `unnamed-${id}`, parent:parents.get(id)===null ? null : json.nodes[parents.get(id)].name,
      worldPosition:new THREE.Vector3().setFromMatrixPosition(matrix).toArray(), worldMatrix:matrix.toArray()};
    if (node.mesh !== undefined) {
      const bounds = new THREE.Box3();
      let triangles=0;
      for (const primitive of json.meshes[node.mesh].primitives) {
        const accessor = json.accessors[primitive.attributes.POSITION];
        const view = json.bufferViews[accessor.bufferView];
        const offset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
        const stride = view.byteStride || 12;
        for (let i=0;i<accessor.count;i++) {
          const o=offset+i*stride;
          bounds.expandByPoint(new THREE.Vector3(bin.readFloatLE(o),bin.readFloatLE(o+4),bin.readFloatLE(o+8)).applyMatrix4(matrix));
        }
        triangles += (primitive.indices!==undefined ? json.accessors[primitive.indices].count : accessor.count)/3;
      }
      row.worldBounds = {min:bounds.min.toArray(),max:bounds.max.toArray()};
      row.triangles = triangles;
    }
    return row;
  });
  const imageViews = new Set((json.images || []).map(i=>i.bufferView).filter(i=>i!==undefined));
  let decodedTextureEstimate=0;
  const textureImages=[];
  for (const image of json.images || []) {
    if(image.bufferView===undefined) throw new Error("Unexpected external image in frozen GLB");
    const v=json.bufferViews[image.bufferView];
    const imageBytes=bin.subarray(v.byteOffset || 0,(v.byteOffset || 0)+v.byteLength);
    if(imageBytes.readUInt32BE(0)!==0x89504e47) throw new Error("Expected PNG; derive actual dimensions before counting a new format");
    const width=imageBytes.readUInt32BE(16),height=imageBytes.readUInt32BE(20);
    const estimate=Math.ceil(width*height*4*4/3);
    decodedTextureEstimate += estimate;
    textureImages.push({name:image.name,width,height,encodedBytes:imageBytes.length,estimatedRgbaMipBytes:estimate});
  }
  const geometryBufferEstimate=(json.bufferViews || []).reduce((sum,v,i)=>sum+(imageViews.has(i)?0:v.byteLength),0);
  const triangles=(json.meshes || []).flatMap(m=>m.primitives).reduce((sum,p)=>sum+(p.indices!==undefined?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count)/3,0);
  const clips=(json.animations || []).map(a=>({name:a.name,durationSec:Math.max(...a.samplers.map(s=>json.accessors[s.input].max?.[0] || 0)),channels:a.channels.length}));
  return {nodes,triangles,materials:json.materials?.length || 0,estimatedGpuBytes:geometryBufferEstimate+decodedTextureEstimate,
    gpuEstimateMethod:"all geometry/animation buffer views plus unique embedded PNG decoded RGBA8 with 4/3 mip overhead; asset-derived conservative estimate, not total measured GPU allocation",
    textureImages,clips};
}

const results=[];
for (const [attempt,names] of [[environmentAttempt,["group-a-essential","group-b-props","on-demand-projects","production-room-full","mobile-room-lod"]],[fixtureAttempt,["fixture-production"]]]) {
  const authored=JSON.parse(fs.readFileSync(path.join(root,"evidence",attempt,"authored-scene.json"),"utf8"));
  const authoredByName=new Map(authored.nodes.map(n=>[n.name,n]));
  for(const name of names) {
    const file=path.join(root,"evidence",attempt,"runtime",`${name}.glb`);
    const bytes=fs.readFileSync(file);
    const info=inspect(bytes);
    const validation=await validator.validateBytes(new Uint8Array(bytes),{uri:path.basename(file),maxIssues:1000});
    const transformChecks=info.nodes.filter(n=>authoredByName.has(n.name)).map(n=>{
      const expected=authoredByName.get(n.name);
      const positionDelta=Math.max(...n.worldPosition.map((v,i)=>Math.abs(v-expected.worldPosition[i])));
      const boundsContainment= !n.worldBounds || n.worldBounds.min.every((v,i)=>v>=expected.worldBounds.min[i]-0.00002) && n.worldBounds.max.every((v,i)=>v<=expected.worldBounds.max[i]+0.00002);
      return {name:n.name,parent:n.parent,positionDelta,boundsContainedInAuthoredBox:boundsContainment,status:positionDelta<0.00002 && boundsContainment ? "PASS":"FAIL"};
    });
    results.push({logicalName:name,path:path.relative(repo,file).replaceAll("\\","/"),bytes:bytes.length,sha256:sha(bytes),
      status:validation.issues.numErrors || transformChecks.some(c=>c.status!=="PASS") ? "FAIL":"PASS",
      gltfValidator:{version:validator.version(),numErrors:validation.issues.numErrors,numWarnings:validation.issues.numWarnings,messages:validation.issues.messages},
      ...info,transformChecks});
    console.log(`${name}: ${results.at(-1).status}; ${info.triangles} triangles; ${info.materials} materials; ${validation.issues.numErrors} glTF errors; ${transformChecks.filter(c=>c.status==='FAIL').length} transform failures`);
  }
}
fs.writeFileSync(path.join(root,"evidence",output),JSON.stringify({executor:"local Codex /root/remediation_art_maker",kind:"actual export structure and authored/rest-pose transform proof; no visual acceptance",generatedAt:new Date().toISOString(),results},null,2)+"\n",{flag:"wx"});
if(results.some(r=>r.status!=="PASS")) process.exitCode=1;
