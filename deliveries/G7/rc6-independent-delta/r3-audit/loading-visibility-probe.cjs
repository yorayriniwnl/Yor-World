// Independent review harness: execute committed WorldRuntime methods with deterministic
// RAF, loader, and renderer adapters. This is not physical/browser GPU evidence.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const repo = path.resolve(__dirname, '../../../..');
const appRequire = createRequire(path.join(repo, 'app/package.json'));
const ts = appRequire('typescript');
const three = appRequire('three');
const finalSource = process.argv[2]; if (!/^[a-f0-9]{40}$/.test(finalSource || '')) throw new Error('A full frozen source commit is required'); const revisions = ['c34e01bb5bff210d924f42d5266e2fa1ed13288e', '6c7200ae4222557f6f8aecce4e2b7d88755ca6f3', finalSource];

function source(revision, file) {
  return execFileSync('git', ['show', `${revision}:${file}`], { cwd: repo, encoding: 'utf8' });
}
function moduleFromSource(code, imports, globals) {
  const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, require: name => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, ...globals });
  return module.exports;
}

async function run(revision, visibilityDuringLoading) {
  let nextRaf = 1;
  let renders = 0;
  let resolveAssets;
  const raf = new Map();
  const assetPromise = new Promise(resolve => { resolveAssets = resolve; });
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible', querySelectorAll: () => [canvas] });
  const canvas = Object.assign(new EventTarget(), { isConnected: true, dataset: {}, parentElement: { clientWidth: 1440, clientHeight: 900 } });
  const globals = { console, performance, AbortController, Event, CustomEvent, setTimeout, clearTimeout,
    document, window: { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1 },
    requestAnimationFrame: callback => { const id = nextRaf++; raf.set(id, callback); return id; },
    cancelAnimationFrame: id => raf.delete(id),
  };
  const { LifecycleManager } = moduleFromSource(source(revision, 'app/src/features/world/LifecycleManager.ts'), {}, globals);
  class Renderer {
    shadowMap = {}; info = { render: { calls: 1, triangles: 1 } };
    getContext() { return { getExtension: () => null, getParameter: () => 'review-renderer' }; }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    render() { renders++; } getPixelRatio() { return 1; }
  }
  class Camera {
    setReducedMotion() {} resize() {} getDiagnostics() { return {}; } getCurrentPreset() { return 'home-desktop'; } dispose() {}
  }
  class Character {
    mode = 'coding'; currentClip = 'coding_idle'; ownerId = 'review';
    advance() {} getDiagnostics() { return {}; } dispose() {}
  }
  class Experience {
    greeting = { setCharacterDirector() {} };
    advance() {} stop() {} getSnapshot() { return { phase: 'explore' }; }
  }
  class Entrance { skip() {} dispose() {} getDiagnostics() { return {}; } }
  class Transition { dispose() {} }
  class Binding { dispose() {} getDiagnostics() { return {}; } }
  class MaterialQuality { apply() {} dispose() {} }
  class Loader { loadSession() { return assetPromise; } getOwnerId() { return 'review-loader'; } }
  const imports = {
    three: { ...three, WebGLRenderer: Renderer },
    './SceneIntegrator': { integrateScene: () => ({ scene: new three.Group(), nodeCounts: {}, resident: null, chairRoot: null }) },
    './CharacterDirector': { CharacterDirector: Character },
    './CameraDirector': { CameraDirector: Camera },
    './AssetLoader': { AssetLoader: Loader },
    './EntranceCoordinator': { EntranceCoordinator: Entrance },
    './TransitionCoordinator': { TransitionCoordinator: Transition },
    './LifecycleManager': { LifecycleManager },
    '../experience/controller': { ExperienceController: Experience },
    '../portfolio/public-content': { publishedProjects: [] },
    './WorldInteractionBinding': { WorldInteractionBinding: Binding },
    './ProductionLighting': { configureProductionLighting() {} },
    './RuntimeMaterialQuality': { RuntimeMaterialQuality: MaterialQuality },
    './LowQualityBatch': {},
    './device-capabilities': { isSoftwareRenderer: () => false },
    './types': { WORLD_RENDERED_FRAME_EVENT: 'yor-world-rendered-frame' },
    '../experience/return-snapshot': { saveReturnSnapshot() {} },
  };
  const { WorldRuntime } = moduleFromSource(source(revision, 'app/src/features/world/WorldRuntime.ts'), imports, globals);
  const runtime = new WorldRuntime({ canvas, reducedMotion: true, initialTier: 'low' });
  const stateBefore = runtime.lifecycleManager.getState();
  if (visibilityDuringLoading) {
    document.visibilityState = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
    document.visibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
  }
  const scheduledBeforeAssets = raf.size;
  const gltf = () => ({ scene: new three.Group(), animations: [] });
  resolveAssets({ w1Gltf: gltf(), avatarGltf: gltf(), fixtureGltf: gltf(), interactionGltf: null });
  await new Promise(resolve => setImmediate(resolve));
  const scheduledAfterAssets = raf.size;
  const beforeTick = renders;
  const callbacks = [...raf.values()]; raf.clear();
  const timestamp = performance.now() + 16.67;
  for (const callback of callbacks) callback(timestamp);
  const rendersInOneBrowserTick = renders - beforeTick;
  const stateAfter = runtime.lifecycleManager.getState();
  runtime.dispose();
  const remainingCallbacksImmediatelyAfterDispose = raf.size;
  const rendersAtDispose = renders;
  const staleCallbacks = [...raf.values()]; raf.clear();
  for (const callback of staleCallbacks) callback(timestamp + 16.67);
  return { revision, visibilityDuringLoading, stateBefore, scheduledBeforeAssets, scheduledAfterAssets, stateAfter, rendersInOneBrowserTick,
    singleRenderLoop: scheduledAfterAssets === 1 && rendersInOneBrowserTick === 1,
    remainingCallbacksImmediatelyAfterDispose,
    rendersAfterDispose: renders - rendersAtDispose, queuedAfterDisposedCallback: raf.size,
    executionClass: 'committed production source with deterministic renderer/loader/RAF adapters; not actual browser rendering' };
}

(async () => {
  const results = [];
  for (const revision of revisions) {
    results.push(await run(revision, false));
    results.push(await run(revision, true));
  }
  const output = { measuredAt: new Date().toISOString(), command: 'node deliveries/G7/rc6-independent-delta/r3-audit/loading-visibility-probe.cjs ' + finalSource, results };
  fs.writeFileSync(path.join(__dirname, 'loading-visibility-probe.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
