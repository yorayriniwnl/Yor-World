import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { appendFileSync } from "node:fs";
import { AssetLoader } from "./assembly/app/src/features/world/AssetLoader";
import { RuntimeMaterialQuality } from "./assembly/app/src/features/world/RuntimeMaterialQuality";
import { WorldRuntime } from "./assembly/app/src/features/world/WorldRuntime";
import { LifecycleManager } from "./assembly/app/src/features/world/LifecycleManager";

const harness = vi.hoisted(() => ({ parses: 0, failThird: false }));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    async parseAsync() {
      harness.parses++;
      if (harness.failThird && harness.parses === 3) throw new Error("fixture decode rejected after EOF");
      const scene = new THREE.Group();
      return { scene, scenes: [scene], animations: [] };
    }
  }
}));
vi.mock("three", async (original) => {
  const real = await original<typeof import("three")>();
  return { ...real, TextureLoader: class { async loadAsync() { return new real.Texture(); } } };
});
function record(id: string, data: unknown) {
  appendFileSync(new URL("./observations.jsonl", import.meta.url), JSON.stringify({id, data}) + "\n");
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); harness.parses = 0; harness.failThird = false; });

describe("Independent accepted C1 boundary requirements", () => {
  it("uncertain encoding metadata never becomes a factual required-session aggregate", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1,2,3,4]), { headers: {"content-length":"4"} })));
    const abort = new AbortController();
    const events: unknown[] = [];
    const result = await new AssetLoader().loadSession({sessionToken:1, sessionGeneration:901, signal:abort.signal,
      onProgress:(p)=>events.push(p), onOptionalConsumer:()=>"rejected"});
    const determinate = (events as Array<{bytes:{kind:string}}>).filter(p=>p.bytes.kind==="determinate");
    record("unknown-encoding", determinate);
    result.resourceLedger?.dispose(); abort.abort();
    expect(determinate).toHaveLength(0);
  });
  it("retires failed-attempt bytes before the next retry is announced", async () => {
    vi.useFakeTimers(); vi.stubGlobal("window", {}); harness.failThird = true;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1,2,3,4]), {
      headers: {"content-length":"4", "content-encoding":"identity"}
    })));
    const abort = new AbortController();
    const events: Array<{stage:string;attempt?:number;bytes:{kind:string;loaded?:number;total?:number}}> = [];
    const completion = new AssetLoader().loadSession({sessionToken:2, sessionGeneration:902,signal:abort.signal,
      onProgress:p=>events.push(p),onOptionalConsumer:()=>"rejected"}).catch(error=>error);
    try {
      for(let i=0;i<500 && !events.some(p=>p.stage.startsWith("Retrying"));i++) await Promise.resolve();
      const retry = events.find(p=>p.stage.startsWith("Retrying"));
      record("retry-counter-before-backoff", retry);
      expect(retry).toBeDefined();
      expect(retry?.attempt).toBe(2);
      expect(retry?.bytes.kind).toBe("indeterminate");
    } finally { abort.abort(); await completion; await vi.runOnlyPendingTimersAsync(); }
  });
  it("preserves the GLB map flipY convention for late textures", () => {
    const originalMap = new THREE.Texture(); originalMap.flipY = false;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({map:originalMap}));
    const scene = new THREE.Group(); scene.add(mesh);
    const quality = new RuntimeMaterialQuality(scene); const late = new THREE.Texture();
    try {
      quality.installColorMap(mesh,late);
      record("late-flipY",{originalFlipY:originalMap.flipY,adoptedFlipY:(mesh.material as THREE.MeshStandardMaterial).map?.flipY});
      expect((mesh.material as THREE.MeshStandardMaterial).map?.flipY).toBe(false);
    } finally { quality.dispose(); }
  });
  it("preserves the original UV channel and transforms during late-map adoption", () => {
    const originalMap = new THREE.Texture(); originalMap.channel=1; originalMap.offset.set(.2,.4);
    originalMap.repeat.set(2,3); originalMap.rotation=.5; originalMap.wrapS=THREE.RepeatWrapping;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:originalMap}));
    const scene = new THREE.Group();scene.add(mesh);const quality=new RuntimeMaterialQuality(scene);
    try {
      quality.installColorMap(mesh,new THREE.Texture());
      const map=(mesh.material as THREE.MeshStandardMaterial).map!;
      record("late-UV-transform",{expected:{channel:1,offset:[.2,.4],repeat:[2,3],rotation:.5,wrapS:THREE.RepeatWrapping},
        observed:{channel:map.channel,offset:map.offset.toArray(),repeat:map.repeat.toArray(),rotation:map.rotation,wrapS:map.wrapS}});
      expect(map.channel).toBe(originalMap.channel);
      expect(map.offset.toArray()).toEqual(originalMap.offset.toArray());
      expect(map.repeat.toArray()).toEqual(originalMap.repeat.toArray());
      expect(map.rotation).toBe(originalMap.rotation);
      expect(map.wrapS).toBe(originalMap.wrapS);
    } finally {quality.dispose();}
  });
  it("restores quality registration after a target connection throws", () => {
    const original=new THREE.MeshStandardMaterial({map:new THREE.Texture()});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(),original);const scene=new THREE.Group();scene.add(mesh);
    const quality=new RuntimeMaterialQuality(scene);let visible:THREE.Material|THREE.Material[]=original;let failOnce=true;
    Object.defineProperty(mesh,"material",{configurable:true,get:()=>visible,set:(next)=>{
      if(failOnce){failOnce=false;throw new Error("target connection failed");} visible=next;
    }});
    try {
      expect(()=>quality.installColorMap(mesh,new THREE.Texture())).toThrow("target connection failed");
      expect(visible).toBe(original);
      quality.apply("high");
      record("failed-map-registration",{expectedOriginalUuid:original.uuid,observedUuid:(visible as THREE.Material).uuid});
      expect(visible).toBe(original);
    } finally {quality.dispose();}
  });
  it("removes the obsolete greeting timer when the runtime is disposed", () => {
    vi.useFakeTimers();
    const lm=new LifecycleManager();const token=lm.requestEntry();lm.startLoading(token);lm.startEntrance(token,true);
    const runtime=Object.create(WorldRuntime.prototype) as WorldRuntime;
    Object.assign(runtime,{isDisposed:false,lifecycleManager:lm,sessionToken:token,scene:new THREE.Scene(),renderer:null,
      characterDirector:{playGreeting:()=>1,dispose:()=>{}},loadingAbort:new AbortController(),optionalAbort:new AbortController(),
      pendingOptionalTextures:new Map(),resourceLedger:null,animationFrameId:null,canvas:null,
      interactionBinding:null,lowQualityBatch:null,materialQuality:null,cameraDirector:null,entranceCoordinator:null,
      transitionCoordinator:null,experienceController:null,unsubscribeLifecycle:null});
    runtime.greet();const before=vi.getTimerCount();runtime.dispose();vi.advanceTimersByTime(0);
    const after=vi.getTimerCount();record("greeting-timer-after-dispose",{before,after});
    expect(before).toBe(1);expect(after).toBe(0);vi.clearAllTimers();
  });
});

