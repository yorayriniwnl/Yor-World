import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
const harness = vi.hoisted(() => ({ parsed: 0, releaseTexture: null as null | ((x: unknown) => void), textures: [] as unknown[] }));
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({ GLTFLoader: class {
  async parseAsync() { harness.parsed++; return {scene: new THREE.Group(), animations: []}; }
} }));
vi.mock('three', async (original) => {
  const real = await original<typeof import('three')>();
  return { ...real, TextureLoader: class {
    loadAsync() { return new Promise(resolve => { harness.releaseTexture = resolve; }); }
  }};
});
import { AssetLoader } from '../../src/features/world/AssetLoader';
import type { LoadingProgress } from '../../src/features/world/types';
afterEach(() => { vi.unstubAllGlobals(); harness.parsed=0; harness.releaseTexture=null; });
describe('Independent FINISH-C1 observations using actual delivered loader', () => {
  it('required readiness resolves while optional decode is held, but abort during decode still delivers a late texture', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1,2,3,4]), { headers: {'content-length':'4'} })));
    const abort = new AbortController();
    const updates: unknown[]=[];
    const result = await new AssetLoader().loadSession({sessionToken:1,signal:abort.signal,onOptionalReady:o=>updates.push(o)});
    await vi.waitFor(()=>expect(harness.releaseTexture).not.toBeNull());
    expect(harness.parsed).toBe(3);
    expect(result.deskmatTexture).toBeNull();
    expect(updates).toHaveLength(0);
    const texture = new THREE.Texture();
    let disposed=false; texture.addEventListener('dispose',()=>{disposed=true});
    abort.abort();
    harness.releaseTexture!(texture);
    await vi.waitFor(()=>expect(updates).toHaveLength(1));
    expect(updates[0]).toEqual({deskmatTexture:texture});
    expect(disposed).toBe(false);
    writeFileSync('../late-optional-observation.json',JSON.stringify({essentialModelsParsed:3,heldOptionalNonblocking:true,lateCallbackAfterAbort:true,lateTextureDisposed:disposed},null,2));
    console.log('OBSERVATION',JSON.stringify({essentialModelsParsed:3,heldOptionalNonblocking:true,lateCallbackAfterAbort:true,lateTextureDisposed:disposed}));
  });
  it('Content-Length stream produces per-file progress, including decoded bytes exceeding compressed total', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(100), {headers:{'content-length':'80','content-encoding':'gzip'}})));
    const reports: LoadingProgress[]=[];
    const abort=new AbortController();
    await new AssetLoader().loadSession({sessionToken:2,signal:abort.signal,onProgress:p=>reports.push(p)});
    abort.abort();
    const measured=reports.filter(p=>p.bytesTotal!==undefined);
    expect(measured).toHaveLength(3);
    expect(measured[0]?.bytesLoaded).toBe(100);
    expect(measured[0]?.bytesTotal).toBe(80);
    expect(measured[0]?.progress).toBe(1);
    const uiPercent=Math.round(100/80*100);
    expect(uiPercent).toBe(125);
    writeFileSync('../byte-progress-observation.json',JSON.stringify({measuredReports:measured.map(p=>({stage:p.stage,requiredLoaded:p.requiredLoaded,bytesLoaded:p.bytesLoaded,bytesTotal:p.bytesTotal,progress:p.progress})),uiPercent},null,2));
    console.log('OBSERVATION',JSON.stringify({measuredReports:measured.map(p=>({stage:p.stage,requiredLoaded:p.requiredLoaded,bytesLoaded:p.bytesLoaded,bytesTotal:p.bytesTotal,progress:p.progress})),uiPercent}));
  });
});
