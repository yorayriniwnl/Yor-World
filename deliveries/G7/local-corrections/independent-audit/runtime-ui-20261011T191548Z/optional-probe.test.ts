import { describe, expect, it } from '../../../../../app/node_modules/vitest/dist/index.js';
import * as THREE from '../../../../../app/node_modules/three/build/three.module.js';
import { ExperienceController } from '../../../../../app/src/features/experience/controller';
import { WorldInteractionBinding } from '../../../../../app/src/features/world/WorldInteractionBinding';

function fixture() {
  const scene=new THREE.Scene();
  const monitor=new THREE.Mesh(new THREE.BoxGeometry(2,1,0.2),new THREE.MeshBasicMaterial());monitor.name='monitor';scene.add(monitor);
  const camera=new THREE.PerspectiveCamera(60,1,0.1,20);camera.position.z=5;camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  const canvas=Object.assign(new EventTarget(),{style:{cursor:''},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})}) as unknown as HTMLCanvasElement;
  const controller=new ExperienceController();const binding=new WorldInteractionBinding({scene,camera,canvas,controller,enabled:()=>true,reducedMotion:()=>false});
  const proxy=new THREE.Mesh(new THREE.BoxGeometry(2,1,0.2),new THREE.MeshBasicMaterial());proxy.userData['isHitProxy']=true;proxy.userData['assetId']='main-monitor';
  const optional=new THREE.Group();optional.add(proxy);
  return {scene,monitor,camera,canvas,controller,binding,optional};
}
function click(f:ReturnType<typeof fixture>) {
  for(const type of ['pointerdown','pointerup']) f.canvas.dispatchEvent(Object.assign(new Event(type),{button:0,pointerId:7,clientX:50,clientY:50}));
}
describe('Independent optional proxy precedence and disposal boundary',()=>{
  it('retains named essential monitor activation before optional arrival',()=>{
    const f=fixture();click(f);expect(f.controller.getSnapshot().activePanel).toBe('launcher');f.binding.dispose();f.controller.stop();
  });
  it('rejects optional attachment after binding disposal',()=>{
    const f=fixture();f.binding.dispose();expect(f.binding.attachInteractionScene(f.optional)).toBe(false);expect(f.binding.getDiagnostics().frozenHitProxyCount).toBe(0);f.controller.stop();
  });
  it('optional proxies do not activate a production target behind an opaque wall',()=>{
    const f=fixture();const wall=new THREE.Mesh(new THREE.BoxGeometry(3,2,0.2),new THREE.MeshBasicMaterial());wall.name='opaque-wall';wall.position.z=2;f.scene.add(wall);
    expect(f.binding.attachInteractionScene(f.optional)).toBe(true);click(f);
    const actual=f.controller.getSnapshot().activePanel;f.binding.dispose();f.controller.stop();expect(actual).toBeNull();
  });
  it('optional proxies do not activate a hidden production target',()=>{
    const f=fixture();f.monitor.visible=false;expect(f.binding.attachInteractionScene(f.optional)).toBe(true);click(f);
    const actual=f.controller.getSnapshot().activePanel;f.binding.dispose();f.controller.stop();expect(actual).toBeNull();
  });
});
