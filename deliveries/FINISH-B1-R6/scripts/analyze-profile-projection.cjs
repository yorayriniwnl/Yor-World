const {createRequire}=require('node:module');
const requireFromScratch=createRequire('F:/Yor-World-B1-R6-Scratch/harness-deps/package.json');
const T=requireFromScratch('three');
const profiles={
 desktop:{w:1920,h:1080,fov:60,pos:[-1.9,1.7,1.55],target:[.12,1.25,-1.15]},
 mobile:{w:720,h:1280,fov:52,pos:[-1.25,1.48,1.15],target:[.16,1.08,-.95]}
};
const points={
 hexLeft:[-.54,2.62,-1.774],hexCenter:[0,2.33,-1.774],hexRight:[.54,2.62,-1.774],
 upperPlant:[.8,2.205,-1.55],camera:[-1.43,1.82,-1.56],
 monitor:[0,1.05,-1.35],keyboard:[0,.794,-.95],pc:[1.05,1,-.887],
 controller:[1.985,1.72,-.68],headset:[1.48,1.19,-1.3],speaker:[.68,.875,-1.165]
};
for(const [name,p] of Object.entries(profiles)){
 const c=new T.PerspectiveCamera(p.fov,p.w/p.h,.05,30);c.position.set(...p.pos);c.lookAt(new T.Vector3(...p.target));c.updateProjectionMatrix();c.updateMatrixWorld(true);
 for(const [key,v] of Object.entries(points)){const ndc=new T.Vector3(...v).project(c);console.log(name,key,JSON.stringify({x:+((ndc.x+1)*p.w/2).toFixed(0),y:+((1-ndc.y)*p.h/2).toFixed(0),visible:ndc.z>=-1&&ndc.z<=1&&Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1}));}
}
