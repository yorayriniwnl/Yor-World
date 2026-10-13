import { describe, expect, it } from '../../../../../app/node_modules/vitest/dist/index.js';
import * as THREE from '../../../../../app/node_modules/three/build/three.module.js';
import {appendFileSync} from 'node:fs';
import { ExperienceController } from '../../../../../app/src/features/experience/controller';
import { WorldInteractionBinding } from '../../../../../app/src/features/world/WorldInteractionBinding';

function fixture() {
  const scene=new THREE.Scene();
  const monitor=new THREE.Mesh(new THREE.BoxGeometry(2,1,0.2),new THREE.MeshBasicMaterial());monitor.name='monitor';scene.add(monitor);
  const camera=new THREE.PerspectiveCamera(60,1,0.1,20);camera.position.z=5;camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  const canvas=Object.assign(new EventTarget(),{style:{cursor:''},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})}) as unknown as HTMLCanvasElement;
  const controller=new ExperienceController();const binding=new WorldInteractionBinding({scene,camera,canvas,controller,enabled:()=>true,reducedMotion:()=>false});
  const proxy=new THREE.Mesh(new THREE.BoxGeometry(2.4,1,0.2),new THREE.MeshBasicMaterial());proxy.userData['isHitProxy']=true;proxy.userData['assetId']='main-monitor';
  const optional=new THREE.Group();optional.add(proxy);
  return {scene,monitor,camera,canvas,controller,binding,proxy,optional};
}
function click(f:ReturnType<typeof fixture>,x=50) {
  for(const type of ['pointerdown','pointerup']) f.canvas.dispatchEvent(Object.assign(new Event(type),{button:0,pointerId:7,clientX:x,clientY:50}));
}
function close(f:ReturnType<typeof fixture>) {f.binding.dispose();f.controller.stop();for(const mesh of [f.monitor,f.proxy]){mesh.geometry.dispose();mesh.material.dispose();}}
function record(id:string,data:unknown){appendFileSync(process.env.DELTA_OBSERVATIONS!,JSON.stringify({id,data})+'\n');}
describe('Independent RUI-01/RUI-02 actual Three delta checks',()=>{
  it('retains essential named monitor activation before optional arrival',()=>{
    const f=fixture();click(f);const panel=f.controller.getSnapshot().activePanel;record('essential',{panel});close(f);expect(panel).toBe('launcher');
  });
  it('valid proxy expands visible target outside original mesh geometry',()=>{
    const f=fixture();f.scene.updateMatrixWorld(true);f.camera.updateMatrixWorld(true);f.optional.updateMatrixWorld(true);
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(0.38,0),f.camera);
    const originalHits=ray.intersectObject(f.monitor,false);const proxyHits=ray.intersectObject(f.proxy,false);
    expect(originalHits).toHaveLength(0);expect(proxyHits.length).toBeGreaterThan(0);
    const point=proxyHits[0]!.point;expect(new THREE.Box3().setFromObject(f.monitor).expandByScalar(0.12).containsPoint(point)).toBe(true);
    click(f,69);expect(f.controller.getSnapshot().activePanel).toBeNull();
    expect(f.binding.attachInteractionScene(f.optional)).toBe(true);click(f,69);
    const panel=f.controller.getSnapshot().activePanel;
    record('expanded-visible',{originalHits:originalHits.length,proxyHits:proxyHits.length,hitPoint:point.toArray(),panel});close(f);expect(panel).toBe('launcher');
  });
  it('opaque front mesh blocks proxy and visible production target',()=>{
    const f=fixture();const wall=new THREE.Mesh(new THREE.BoxGeometry(3,2,0.2),new THREE.MeshBasicMaterial());wall.position.z=2;f.scene.add(wall);
    expect(f.binding.attachInteractionScene(f.optional)).toBe(true);click(f,69);
    const panel=f.controller.getSnapshot().activePanel;record('occluded',{panel,lastActivated:f.binding.getDiagnostics().lastActivatedId});close(f);wall.geometry.dispose();wall.material.dispose();expect(panel).toBeNull();
  });
  it('hidden production target is rejected after proxy arrival',()=>{
    const f=fixture();f.monitor.visible=false;expect(f.binding.attachInteractionScene(f.optional)).toBe(true);click(f);
    const panel=f.controller.getSnapshot().activePanel;record('hidden-target',{panel,lastActivated:f.binding.getDiagnostics().lastActivatedId});close(f);expect(panel).toBeNull();
  });
  it('hidden production ancestor is rejected after proxy arrival',()=>{
    const f=fixture();const parent=new THREE.Group();f.scene.add(parent);parent.add(f.monitor);parent.visible=false;
    expect(f.binding.attachInteractionScene(f.optional)).toBe(true);click(f);
    const panel=f.controller.getSnapshot().activePanel;record('hidden-ancestor',{panel,lastActivated:f.binding.getDiagnostics().lastActivatedId});close(f);expect(panel).toBeNull();
  });
  it('disposed binding rejects late optional attachment',()=>{
    const f=fixture();f.binding.dispose();const attached=f.binding.attachInteractionScene(f.optional);record('disposed',{attached,proxies:f.binding.getDiagnostics().frozenHitProxyCount});close(f);expect(attached).toBe(false);
  });
});
