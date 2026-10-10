// Copied unchanged into diagnostic candidate/tests/unit/ for execution.
// Expectations assert the accepted contract; FAIL results are retained defects.
import { afterEach, describe, expect, it, vi } from "vitest";
import { appendFileSync } from "node:fs";
import * as THREE from "three";
import { AssetLoader } from "../../src/features/world/AssetLoader";
import { SessionResourceLedger } from "../../src/features/world/asset-resources";
import { LifecycleManager } from "../../src/features/world/LifecycleManager";
import { RuntimeMaterialQuality } from "../../src/features/world/RuntimeMaterialQuality";
import { WorldRuntime } from "../../src/features/world/WorldRuntime";
import { LowQualityBatch } from "../../src/features/world/LowQualityBatch";
import { ExperienceController } from "../../src/features/experience/controller";
import { PreferencesSchema, defaultPreferences } from "../../src/contracts/experience";
import { PreferencesStore, resetDocumentScopedFallback } from "../../src/features/experience/preferences-store";

const harness = vi.hoisted(() => ({ requests: [] as string[], parseCalls: 0, failRequired: false }));
vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    async parseAsync() { harness.parseCalls++; return { scene: new THREE.Group(), animations: [] }; }
    async loadAsync(url: string) { harness.requests.push(url); if(harness.failRequired) throw new Error("held failure"); return { scene: new THREE.Group(), animations: [] }; }
  },
}));
const aborts: AbortController[] = [];
const observe = (id: string, data: unknown) => appendFileSync(process.env.FINISH_AUDIT_OBSERVATIONS!,JSON.stringify({id,data})+"\n");
async function flush() { for (let i=0;i<30;i++) await Promise.resolve(); }
function controller() { const c=new AbortController(); aborts.push(c); return c; }
function progress(lm: LifecycleManager, loaded: number, generation=lm.getSessionGeneration()) {
  return { session:{generation,token:lm.getSessionToken()}, stage:"download", progress:loaded/100,
    bytes:{kind:"determinate" as const,scope:"required-session" as const,loaded,total:100},
    requiredLoaded:0,requiredTotal:3,optionalLoaded:0,optionalTotal:2,retryCount:0,maxRetries:2,attempt:1 as const };
}
function holdTextures() { vi.spyOn(THREE.TextureLoader.prototype,"loadAsync").mockImplementation(() => new Promise(() => {})); }
async function browserLoad(response: () => Response | Record<string,unknown>) {
  holdTextures(); vi.stubGlobal("window", {});
  const requests: string[]=[]; const events: any[]=[];
  vi.stubGlobal("fetch", vi.fn(async (url:string) => { requests.push(url); return response(); }));
  await new AssetLoader().loadSession({sessionToken:1,sessionGeneration:20,signal:controller().signal,onProgress:p => events.push({...p,requestsStarted:requests.length})});
  return {requests,events};
}
function runtime(scene: THREE.Group, quality: RuntimeMaterialQuality | null = null) {
  return Object.assign(Object.create(WorldRuntime.prototype),{integratedResult:{scene},materialQuality:quality}) as any;
}
afterEach(() => {
  for (const c of aborts.splice(0)) c.abort();
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); resetDocumentScopedFallback();
  harness.requests=[];harness.parseCalls=0;harness.failRequired=false;
});

describe("FINISH-04 independent required-outcome diagnostics", () => {
  it("C3-01 historical v1 schema parses without paused", () => {
    const {paused:_,...legacy}=defaultPreferences; const parsed=PreferencesSchema.safeParse(legacy);
    observe("old-schema",parsed); expect(parsed.success).toBe(true);
    if(parsed.success) expect(parsed.data.paused).toBe(false);
  });
  it("C3-01 blocked storage getter keeps document pause across instances", () => {
    vi.stubGlobal("localStorage",undefined);vi.stubGlobal("window",Object.defineProperty({},"localStorage",{get(){throw new DOMException("blocked","SecurityError");}}));
    const a=new PreferencesStore();a.setPaused(true);const b=new PreferencesStore();
    observe("blocked-getter",{first:a.get().paused,second:b.get().paused});expect(b.get().paused).toBe(true);
  });
  it("retained denied getItem memory fallback works", () => {
    vi.stubGlobal("localStorage",{getItem(){throw new Error("blocked");},setItem(){throw new Error("blocked");}});
    const a=new PreferencesStore();a.setPaused(true);const b=new PreferencesStore();
    expect(b.get().paused).toBe(true);
  });
  it("C3-01 finite requested painting returns safely while globally paused", async () => {
    vi.stubGlobal("localStorage",undefined);const ec=new ExperienceController();await ec.send({type:"SET_PAUSED",paused:true});
    ec.painting.triggerPresetTilt();for(let i=0;i<180;i++) ec.advance(1/60);
    observe("paused-painting",{paused:ec.getSnapshot().paused,painting:ec.painting.getState()});
    expect(ec.painting.getState().isSettled).toBe(true);expect(ec.getSnapshot().paused).toBe(true);ec.stop();
  });
  it("C3-01 runtime restores controller pause before director activation", async () => {
    const store=new PreferencesStore();store.setPaused(true);const ec=new ExperienceController({preferencesStore:store});
    const canvas=Object.assign(new EventTarget(),{isConnected:true,dataset:{},style:{}}) as unknown as HTMLCanvasElement;
    const r=new WorldRuntime({canvas,experienceController:ec,simulateRendererError:true});await flush();
    const actual=r.isDecorativePaused;r.dispose();observe("initial-runtime-pause",{controllerPaused:ec.getSnapshot().paused,runtimePaused:actual});expect(actual).toBe(true);
  });
  it("C3-02 does not label first file completion as full required aggregate",async () => {
    const r=await browserLoad(() => new Response(new Uint8Array(4),{headers:{"content-length":"4","content-encoding":"identity"}}));
    const premature=r.events.filter(p=>p.bytes.kind==="determinate"&&p.requestsStarted<3);
    observe("aggregate",premature.map(p=>({requestsStarted:p.requestsStarted,requiredLoaded:p.requiredLoaded,bytes:p.bytes})));
    expect(premature).toHaveLength(0);
  });
  it("C3-02 EOF contradiction invalidates shorter identity response",async () => {
    const r=await browserLoad(() => new Response(new Uint8Array(2),{headers:{"content-length":"4","content-encoding":"identity"}}));
    const e=r.events.filter(p=>p.requestsStarted===1);
    observe("eof-shorter",e.map(p=>({stage:p.stage,bytes:p.bytes})));
    expect(e.some(p=>p.bytes.kind==="indeterminate"&&/mismatch|contradict|length/i.test(p.bytes.reason))).toBe(true);
  });
  it("C3-02 ArrayBuffer fallback reports actual length rather than fabricated header",async () => {
    const r=await browserLoad(() => ({ok:true,body:null,headers:new Headers({"content-length":"4","content-encoding":"identity"}),arrayBuffer:async()=>new ArrayBuffer(2)}));
    observe("arraybuffer-fallback",r.events.filter(p=>p.bytes.kind==="determinate").map(p=>p.bytes));
    expect(r.events.some(p=>p.bytes.kind==="determinate"&&p.bytes.loaded===4&&p.bytes.total===4)).toBe(false);
  });
  it("retained compressed response progress stays indeterminate",async () => {
    const r=await browserLoad(() => new Response(new Uint8Array(8),{headers:{"content-length":"4","content-encoding":"gzip"}}));
    expect(r.events.some(p=>p.bytes.kind==="determinate")).toBe(false);
  });
  it("retained unknown response progress stays indeterminate",async () => {
    const r=await browserLoad(() => new Response(new Uint8Array(8)));
    expect(r.events.some(p=>p.bytes.kind==="determinate")).toBe(false);
  });
  it("C3-02 watchdog resets on new required progress beyond 15s", () => {
    vi.useFakeTimers();const lm=new LifecycleManager();const t=lm.requestEntry();lm.startLoading(t);
    vi.advanceTimersByTime(10000);lm.updateLoadingProgress(t,progress(lm,20));vi.advanceTimersByTime(5000);
    observe("progress-watchdog",{elapsed:15000,state:lm.getState(),timers:vi.getTimerCount()});
    expect(lm.getState()).toBe("LOADING");lm.dispose();
  });
  it("retained true stall fails at exactly 15000ms", () => {
    vi.useFakeTimers();const lm=new LifecycleManager();const t=lm.requestEntry();lm.startLoading(t);
    vi.advanceTimersByTime(14999);expect(lm.getState()).toBe("LOADING");vi.advanceTimersByTime(1);expect(lm.getState()).toBe("FAILURE");lm.dispose();
  });
  it("retained retries use exactly 500 and 1500ms and three attempts",async () => {
    vi.useFakeTimers();harness.failRequired=true;const result=new AssetLoader().loadSession({sessionToken:1,signal:controller().signal}).then(()=>null,e=>e);
    await flush();expect(harness.requests).toHaveLength(1);await vi.advanceTimersByTimeAsync(499);expect(harness.requests).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);expect(harness.requests).toHaveLength(2);await vi.advanceTimersByTimeAsync(1499);expect(harness.requests).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);expect(harness.requests).toHaveLength(3);expect((await result).retryCount).toBe(3);expect(vi.getTimerCount()).toBe(0);
  });
  it("retained backoff abort removes timer and suppresses further requests",async () => {
    vi.useFakeTimers();harness.failRequired=true;const c=controller();const result=new AssetLoader().loadSession({sessionToken:1,signal:c.signal}).then(()=>null,e=>e);
    await flush();expect(vi.getTimerCount()).toBe(1);c.abort();expect((await result).name).toBe("AbortError");expect(vi.getTimerCount()).toBe(0);expect(harness.requests).toHaveLength(1);
  });
  it("C3-02 concurrent sessions do not share mutable retry limits",async () => {
    vi.useFakeTimers();harness.failRequired=true;const loader=new AssetLoader();
    const first=loader.loadSession({sessionToken:1,maxRetries:2,signal:controller().signal}).then(()=>null,e=>e);await flush();
    await loader.loadSession({sessionToken:2,maxRetries:0,signal:controller().signal}).catch(()=>{});
    await vi.advanceTimersByTimeAsync(2000);await first;
    observe("concurrent-retries",{totalFetchAttempts:harness.requests.length,loaderLimit:loader.maxRetries});expect(harness.requests).toHaveLength(4);
  });
  it("C3-02 stale entrance cannot clear current watchdog", () => {
    vi.useFakeTimers();const lm=new LifecycleManager();const t=lm.requestEntry();lm.startLoading(t);
    expect(lm.startEntrance(t-1)).toBe(false);vi.advanceTimersByTime(15000);
    observe("stale-entrance",{state:lm.getState(),timers:vi.getTimerCount()});expect(lm.getState()).toBe("FAILURE");lm.dispose();
  });
  it("C3-02 rejects progress from a different generation", () => {
    vi.useFakeTimers();const lm=new LifecycleManager();const t=lm.requestEntry();lm.startLoading(t);
    const accepted=lm.updateLoadingProgress(t,progress(lm,20,999));observe("stale-generation",{accepted,session:lm.getLoadingProgress().session});
    expect(accepted).toBe(false);lm.dispose();
  });
  it("C3-03 throwing optional consumer immediately disposes decoded result once",async () => {
    const tex=new THREE.Texture();const disposed=vi.spyOn(tex,"dispose");
    vi.spyOn(THREE.TextureLoader.prototype,"loadAsync").mockResolvedValue(tex);
    await new AssetLoader().loadSession({sessionToken:1,signal:controller().signal,onOptionalConsumer(){throw new Error("consumer rejection");}});await flush();
    observe("consumer-throw",{disposeCount:disposed.mock.calls.length});expect(disposed).toHaveBeenCalledTimes(1);
  });
  it("retained optional rejection disposes decoded texture",async () => {
    const textures=[new THREE.Texture(),new THREE.Texture()];const spies=textures.map(t=>vi.spyOn(t,"dispose"));
    vi.spyOn(THREE.TextureLoader.prototype,"loadAsync").mockResolvedValueOnce(textures[0]!).mockResolvedValueOnce(textures[1]!);
    await new AssetLoader().loadSession({sessionToken:1,signal:controller().signal,onOptionalConsumer:()=>"rejected"});await flush();
    spies.forEach(s=>expect(s).toHaveBeenCalledTimes(1));
  });
  it("retained optional decode after cancel disposes once without callback",async () => {
    let release!:(texture:THREE.Texture)=>void;vi.spyOn(THREE.TextureLoader.prototype,"loadAsync").mockImplementation(()=>new Promise<THREE.Texture>(resolve=>release=resolve));
    const c=controller();const consumer=vi.fn(()=>"adopted" as const);await new AssetLoader().loadSession({sessionToken:1,signal:c.signal,onOptionalConsumer:consumer});await flush();
    c.abort();const tex=new THREE.Texture();const disposed=vi.spyOn(tex,"dispose");release(tex);await flush();expect(consumer).not.toHaveBeenCalled();expect(disposed).toHaveBeenCalledTimes(1);
  });
  it("C3-04 adopted optional textures leave loader abort ownership",async () => {
    const textures=[new THREE.Texture(),new THREE.Texture()];const spies=textures.map(t=>vi.spyOn(t,"dispose"));
    vi.spyOn(THREE.TextureLoader.prototype,"loadAsync").mockResolvedValueOnce(textures[0]!).mockResolvedValueOnce(textures[1]!);
    const c=controller();await new AssetLoader().loadSession({sessionToken:1,signal:c.signal,onOptionalConsumer:()=>"adopted"});await flush();c.abort();
    observe("adopted-abort",{disposals:spies.map(s=>s.mock.calls.length)});spies.forEach(s=>expect(s).not.toHaveBeenCalled());
  });
  it("C3-04 shared geometry/material dispose exactly once", () => {
    const geometry=new THREE.BoxGeometry();const material=new THREE.MeshStandardMaterial();const geo=vi.spyOn(geometry,"dispose");const mat=vi.spyOn(material,"dispose");
    const scene=new THREE.Group();scene.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));
    const ledger=new SessionResourceLedger({generation:1,token:1});ledger.registerGltf({scene} as any);ledger.dispose();
    observe("shared-disposal",{geometry:geo.mock.calls.length,material:mat.mock.calls.length});expect(geo).toHaveBeenCalledTimes(1);expect(mat).toHaveBeenCalledTimes(1);
  });
  it("C3-04 pruned source resources remain in ledger", () => {
    const geometry=new THREE.BoxGeometry();const material=new THREE.MeshStandardMaterial();const geo=vi.spyOn(geometry,"dispose");const mat=vi.spyOn(material,"dispose");
    const scene=new THREE.Group();const pruned=new THREE.Mesh(geometry,material);scene.add(pruned);
    const ledger=new SessionResourceLedger({generation:1,token:1});ledger.registerGltf({scene} as any);scene.remove(pruned);ledger.dispose();
    observe("pruned-disposal",{geometry:geo.mock.calls.length,material:mat.mock.calls.length});expect(geo).toHaveBeenCalledTimes(1);expect(mat).toHaveBeenCalledTimes(1);
  });
  it("C3-04 GLTF map textures and ImageBitmaps are released", () => {
    const bitmap={close:vi.fn()};const texture=new THREE.Texture(bitmap as any);const disposed=vi.spyOn(texture,"dispose");
    const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:texture})));
    const ledger=new SessionResourceLedger({generation:1,token:1});ledger.registerGltf({scene} as any);ledger.dispose();
    observe("bitmap-disposal",{texture:disposed.mock.calls.length,bitmap:bitmap.close.mock.calls.length});expect(disposed).toHaveBeenCalledTimes(1);expect(bitmap.close).toHaveBeenCalledTimes(1);
  });
  it("C3-05 late low-tier deskmat survives low/high roundtrip", () => {
    const old=new THREE.Texture();const fresh=new THREE.Texture();const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({map:old}));mesh.name="desk_mat";
    const scene=new THREE.Group();scene.add(mesh);const quality=new RuntimeMaterialQuality(scene);quality.apply("low");runtime(scene,quality).applyDeskmatTexture(fresh);
    const low=(mesh.material as THREE.MeshLambertMaterial).map===fresh;quality.apply("high");const high=(mesh.material as THREE.MeshStandardMaterial).map===fresh;
    observe("late-map-roundtrip",{lowUsesNew:low,highUsesNew:high});expect(low).toBe(true);expect(high).toBe(true);quality.dispose();
  });
  it("C3-05 late target material is isolated from unrelated shared mesh", () => {
    const material=new THREE.MeshStandardMaterial();const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);mesh.name="desk_mat";
    const other=new THREE.Mesh(new THREE.BoxGeometry(),material);other.name="unrelated";const scene=new THREE.Group();scene.add(mesh,other);const fresh=new THREE.Texture();runtime(scene).applyDeskmatTexture(fresh);
    observe("shared-late-material",{sameMaterial:mesh.material===other.material,unrelatedUsesNew:(other.material as THREE.MeshStandardMaterial).map===fresh});expect((other.material as THREE.MeshStandardMaterial).map).toBe(null);
  });
  it("C3-05 late color map is sRGB", () => {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());mesh.name="desk_mat";const scene=new THREE.Group();scene.add(mesh);const texture=new THREE.Texture();runtime(scene).applyDeskmatTexture(texture);
    observe("late-colorspace",{colorSpace:texture.colorSpace});expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });
  it("C3-05 mutable-node matching agrees between runtime and static batching", () => {
    const material=new THREE.MeshLambertMaterial();const a=new THREE.Mesh(new THREE.PlaneGeometry(),material);a.name="desk_mat_overlay";
    const b=new THREE.Mesh(new THREE.PlaneGeometry(),material);b.name="static-wall";const scene=new THREE.Group();scene.add(a,b);
    const batch=new LowQualityBatch(scene);batch.apply("low");
    observe("batch-name-match",{runtimeMatches:/desk_mat|Desk_MatTopography/i.test(a.name),visibleOriginal:!!(a.layers.mask&1),batches:scene.children.filter(n=>n.name==="low-quality-static-batch").length});
    expect(a.layers.mask&1).toBe(1);batch.dispose();
  });
  it("retained current essential names exclude legacy interaction assets", async () => {
    holdTextures();await new AssetLoader().loadSession({sessionToken:1,signal:controller().signal});
    expect(harness.requests).toEqual(["/models/production-room-full.glb","/models/resident-production.glb","/models/fixture-production.glb"]);
  });
});
