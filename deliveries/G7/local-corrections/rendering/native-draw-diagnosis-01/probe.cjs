const { chromium } = require('../../../../../app/node_modules/@playwright/test');
const fs = require('node:fs'), path = require('node:path');
(async () => {
 const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist'] });
 const page = await browser.newPage({ viewport:{width:390,height:650} });
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 try {
  await page.goto('http://127.0.0.1:3161'); await page.waitForFunction(()=>window.ready);
  await page.evaluate(()=>window.setTier('high',true,true)); await page.waitForTimeout(1000);
  const result = await page.evaluate(()=>({inspect:window.inspect(), sample:window.samples.at(-1), inventory:(()=>{const rows=[];window.scene.traverse(mesh=>{if(!mesh.isMesh)return;const material=mesh.material;rows.push({name:mesh.name,material:material.name,layer:mesh.layers.mask,constructor:mesh.constructor.name,materialType:material.type,index:mesh.geometry.index?.array.constructor.name,groups:mesh.geometry.groups,transmission:material.transmission,transparent:material.transparent,normalType:material.normalMapType,attributes:Object.keys(mesh.geometry.attributes),worldMatrix:mesh.matrixWorld.elements});});return rows;})()}));
  fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify({scope:'Reconstructed diagnosis; not full-app acceptance',errors,...result},null,2));
  const materialStates = await page.evaluate(()=>{const rows=new Map(); window.scene.traverse(mesh=>{if(!mesh.isMesh)return; const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const m of materials)rows.set(m.uuid,m.toJSON());});return [...rows.values()];});
  fs.writeFileSync(path.join(__dirname,'material-states.json'),JSON.stringify(materialStates,null,2));
  console.log(JSON.stringify({ calls:result.sample.calls, materials:materialStates.map(m=>({name:m.name,type:m.type,color:m.color,roughness:m.roughness,metalness:m.metalness,emissive:m.emissive,side:m.side,map:m.map})) },null,2));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
