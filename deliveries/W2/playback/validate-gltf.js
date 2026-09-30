const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dep = require('./dependencies.cjs');
const validator = dep('gltf-validator');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, 'evidence/r2');
const expected = {coding_idle:6,notice_visitor:.6,turn_to_visitor:1.2,greeting_nod:.9,return_to_work:1.3};
async function run() {
  const outputs = {};
  const hierarchy = [];
  const checks = [];
  function check(name, pass, detail) { checks.push({name,status:pass?'PASS':'FAIL',detail}); }
  for (const name of ['avatar-proof.glb','fixture-proof.glb']) {
    const bytes=fs.readFileSync(path.join(root,name));
    const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    const validation=await validator.validateBytes(new Uint8Array(bytes),{uri:name,maxIssues:1000});
    fs.writeFileSync(path.join(evidence,name+'.validator.json'),JSON.stringify(validation,null,2));
    const nodes=gltf.nodes.map((n,i)=>({index:i,...n}));
    hierarchy.push(name);
    function describe(i,depth=0){
      const n=gltf.nodes[i];
      hierarchy.push('  '.repeat(depth)+`[${i}] ${n.name} `+JSON.stringify({translation:n.translation||[0,0,0],rotation:n.rotation||[0,0,0,1],scale:n.scale||[1,1,1],mesh:n.mesh,skin:n.skin}));
      for(const child of n.children||[])describe(child,depth+1);
    }
    gltf.scenes[0].nodes.forEach(i=>describe(i));
    const animations=(gltf.animations||[]).map(a=>({name:a.name,
      start:Math.min(...a.samplers.map(s=>gltf.accessors[s.input].min[0])),
      end:Math.max(...a.samplers.map(s=>gltf.accessors[s.input].max[0])),
      channels:a.channels.map(c=>({node:c.target.node,name:gltf.nodes[c.target.node].name,path:c.target.path}))}));
    const triangles=gltf.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+gltf.accessors[p.indices??p.attributes.POSITION].count/3,0);
    outputs[name]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),generator:gltf.asset.generator,
      validationIssues:validation.issues,triangles,materials:gltf.materials.length,textures:gltf.textures||[],
      decodedBufferBytes:gltf.buffers.reduce((s,b)=>s+b.byteLength,0),roots:gltf.scenes[0].nodes,nodes,animations,skins:gltf.skins||[]};
    check(name+' validator',validation.issues.numErrors===0&&validation.issues.numWarnings===0,validation.issues);
    check(name+' clip timing',animations.length===5&&animations.every(a=>a.name in expected&&Math.abs(a.start)<1e-6&&Math.abs(a.end-expected[a.name])<1e-6),animations.map(a=>({name:a.name,start:a.start,end:a.end})));
    if(name.startsWith('avatar')) {
      check('avatar excludes furniture',nodes.every(n=>!/^chair|^desk|^fixture/.test(n.name)),nodes.map(n=>n.name));
      check('skin at scene root',nodes.filter(n=>n.skin!==undefined).every(n=>gltf.scenes[0].nodes.includes(n.index)),gltf.scenes[0].nodes);
    } else {
      check('fixture integration roots',JSON.stringify(gltf.scenes[0].nodes.map(i=>gltf.nodes[i].name).sort())===JSON.stringify(['chair-base','chair-root','fixture-static'].sort()),gltf.scenes[0].nodes.map(i=>gltf.nodes[i].name));
      check('chair-root sole animated furniture node',animations.every(a=>a.channels.every(c=>c.name==='chair-root')),animations);
    }
  }
  const result={timestamp:new Date().toISOString(),validatorVersion:validator.version(),outputs,checks};
  fs.writeFileSync(path.join(evidence,'export-inspection.json'),JSON.stringify(result,null,2));
  fs.writeFileSync(path.join(evidence,'export-hierarchy.txt'),hierarchy.join('\n'));
  console.log(JSON.stringify(checks.map(c=>({name:c.name,status:c.status})),null,2));
  process.exitCode=checks.some(c=>c.status==='FAIL')?1:0;
}
run().catch(e=>{console.error(e);process.exitCode=1;});
