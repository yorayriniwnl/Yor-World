import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Bounded W2 sampler. This is not the later B4 CharacterDirector.
const durations = { coding_idle: 6, notice_visitor: .6, turn_to_visitor: 1.2, greeting_nod: .9, return_to_work: 1.3 };
const $ = s => document.querySelector(s);
const canvas = $('canvas'), stage = $('#stage');
const manual = new URLSearchParams(location.search).has('manual');
let renderer, scene, camera, avatar, fixture, resident, chair, base, bodyTurn, head;
let ready = false, paused = false, current = { clip: 'coding_idle', time: 0 };
let queue = [], mode = 'loading', revision = 0, lastFrame = 0, lastHud = 0, recording;
const actors = [], skins = [], colliders = [];
let restBody, restChair, restHead, keyTop;
const rootExpected = new THREE.Vector3(.3, 0, -.36);
const v = new THREE.Vector3(), q = new THREE.Quaternion();
const normalName = name => name.replaceAll('.', '');
const cameras = {
  proof: { position: [-2.15, 1.72, 2.10], target: [0, .72, -.64], fov: 44 },
  side: { position: [2.25, 1.40, -.3], target: [.3, .75, -.55], fov: 42 },
  top: { position: [.3, 3.5, -.1], target: [.3, 0, -.5], fov: 43 }
};
function setCamera(name) {
  const p = cameras[name]; camera.position.fromArray(p.position); camera.fov = p.fov;
  camera.lookAt(new THREE.Vector3(...p.target)); camera.updateProjectionMatrix(); render();
}
function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height, false); camera.aspect = width / height;
  camera.updateProjectionMatrix(); render();
}
function matrices() { scene.updateMatrixWorld(true); for (const m of skins) m.skeleton.update(); }
function render() { if (renderer && ready) { matrices(); renderer.render(scene, camera); } }
function apply(clip, time) {
  if (!(clip in durations)) throw Error(`Unknown clip: ${clip}`);
  const t = THREE.MathUtils.clamp(time, 0, durations[clip]);
  for (const actor of actors) {
    if (actor.current !== clip) {
      actor.mixer.stopAllAction();
      const action = actor.actions[clip];
      action.reset().setEffectiveWeight(1).setLoop(THREE.LoopOnce, 1).play();
      action.clampWhenFinished = true; action.paused = true; actor.current = clip;
    }
    actor.actions[clip].time = t; actor.mixer.update(0);
  }
  current = { clip, time: t }; matrices();
}
// Both actors sample the same exported clip/time. No accumulating rotations,
// independent wall-clock timers, crossfade warping or stale completion callbacks.
const segment = (clip, from, to) => ({ clip, from, to, elapsed: 0 });
function replacePath(segments, label) {
  revision++; queue = segments; mode = label; paused = false;
  if (queue.length) apply(queue[0].clip, queue[0].from); else apply('coding_idle', 0);
  hud(); render(); return revision;
}
function playSequence() {
  if (mode === 'sequence') return revision;
  return replacePath([
    segment('coding_idle', 0, 1.5), segment('notice_visitor', 0, .6),
    segment('turn_to_visitor', 0, 1.2), segment('greeting_nod', 0, .9),
    segment('return_to_work', 0, 1.3)
  ], 'sequence');
}
function inspect(clip, time = 0) {
  revision++; queue = []; mode = 'inspection'; paused = true;
  apply(clip, time); hud(); render();
}
function cancel() {
  const { clip, time } = current;
  if (mode === 'safe-return') return revision;
  let segments = [];
  if (clip === 'notice_visitor') segments = [segment(clip, time, 0)];
  if (clip === 'turn_to_visitor') segments = [segment(clip, time, 0), segment('notice_visitor', .6, 0)];
  if (clip === 'greeting_nod') segments = [segment(clip, time, 0), segment('turn_to_visitor', 1.2, 0), segment('notice_visitor', .6, 0)];
  if (clip === 'return_to_work') segments = [segment(clip, time, 1.3)];
  return replacePath(segments, segments.length ? 'safe-return' : 'coding');
}
function settle() { return replacePath([], 'coding'); }
function advance(dt) {
  if (!ready || paused) return;
  if (!Number.isFinite(dt) || dt < 0) throw Error('Invalid delta');
  let remaining = dt;
  while (queue.length) {
    const s = queue[0], duration = Math.abs(s.to - s.from);
    const take = Math.min(remaining, Math.max(0, duration - s.elapsed));
    s.elapsed += take; remaining -= take;
    apply(s.clip, s.from + Math.sign(s.to - s.from) * s.elapsed);
    if (s.elapsed < duration - 1e-10) return;
    apply(s.clip, s.to); queue.shift();
    if (queue.length) apply(queue[0].clip, queue[0].from);
    else { mode = 'coding'; apply('coding_idle', 0); }
    if (remaining < 1e-10) return;
  }
  if (mode === 'coding') apply('coding_idle', (current.time + remaining) % 6);
}
function heading(object, rest) {
  object.getWorldQuaternion(q); q.multiply(rest.clone().invert());
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  return THREE.MathUtils.radToDeg(Math.atan2(-f.x, -f.z));
}
function diagnostics(full = true) {
  matrices();
  const root = resident.getWorldPosition(new THREE.Vector3());
  const result = { ...current, mode, revision, paused, pendingSegments: queue.length,
    rootPosition: root.toArray(), rootErrorM: root.distanceTo(rootExpected),
    chairRootErrorM: chair.getWorldPosition(new THREE.Vector3()).distanceTo(rootExpected),
    baseRootErrorM: base.getWorldPosition(new THREE.Vector3()).distanceTo(rootExpected),
    chairYawDeg: heading(chair, restChair), bodyYawDeg: heading(bodyTurn, restBody),
    headLocalAngleDeg: THREE.MathUtils.radToDeg(head.quaternion.angleTo(restHead)), keyTopM: keyTop,
    baseQuaternion: base.getWorldQuaternion(new THREE.Quaternion()).toArray(),
    avatarActionTime: actors[0].actions[current.clip].time, fixtureActionTime: actors[1].actions[current.clip].time };
  if (!full) return result;
  const feet = { footL: { sole: Infinity, maxY: -Infinity }, footR: { sole: Infinity, maxY: -Infinity } };
  let pelvisBottom = Infinity, handGap = Infinity, handMinY = Infinity, topY = -Infinity;
  let desktopInteriorVertices = 0, tableTriangleHits = 0, pedestalTriangleHits = 0;
  const boxes = colliders.map(o => ({ name: o.name, box: new THREE.Box3().setFromObject(o).expandByScalar(-.0005) }));
  const tri = new THREE.Triangle(), handBounds = new THREE.Box3();
  for (const mesh of skins) {
    const points = [], indices = mesh.geometry.index, si = mesh.geometry.attributes.skinIndex;
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld);
      const p = v.clone(); points.push(p);
      const bone = normalName(mesh.skeleton.bones[si.getX(i)].name);
      if (bone in feet) { feet[bone].sole = Math.min(feet[bone].sole, p.y); feet[bone].maxY = Math.max(feet[bone].maxY, p.y); }
      if (bone === 'pelvis') pelvisBottom = Math.min(pelvisBottom, p.y);
      if (bone.startsWith('hand')) { handGap = Math.min(handGap, p.z + .75); handMinY = Math.min(handMinY, p.y); handBounds.expandByPoint(p); }
      topY = Math.max(topY, p.y);
      if (p.x > -1.2995 && p.x < 1.2995 && p.z > -1.5495 && p.z < -.7505 && p.y > .6905 && p.y < .7495) desktopInteriorVertices++;
    }
    for (let i = 0; i < (indices?.count ?? points.length); i += 3) {
      tri.set(points[indices ? indices.getX(i) : i], points[indices ? indices.getX(i + 1) : i + 1], points[indices ? indices.getX(i + 2) : i + 2]);
      for (const { name, box } of boxes) if (box.intersectsTriangle(tri)) {
        if (name === 'desk') tableTriangleHits++; else pedestalTriangleHits++;
      }
    }
  }
  for (const key of Object.keys(feet)) {
    const bone = skins[0].skeleton.bones.find(b => normalName(b.name) === key);
    feet[key].ankle = bone.getWorldPosition(new THREE.Vector3()).toArray();
  }
  return { ...result, feet, pelvisBottomM: pelvisBottom, seatGapM: pelvisBottom - .46,
    handFrontGapM: handGap, handMinYM: handMinY, handBounds: { min: handBounds.min.toArray(), max: handBounds.max.toArray() },
    avatarTopM: topY, desktopInteriorVertices, tableTriangleHits, pedestalTriangleHits };
}
function hud() {
  if (!ready) return;
  const d = diagnostics();
  $('#caption').textContent = `${current.clip} · ${current.time.toFixed(2)} s`;
  $('#status').textContent = `${mode} · ${queue.length} pending segments`;
  $('#metrics').textContent = `Chair yaw    ${d.chairYawDeg.toFixed(2)}°\nBody yaw     ${d.bodyYawDeg.toFixed(2)}°\nRoot error   ${(d.rootErrorM * 1000).toFixed(4)} mm\nSole L / R   ${(d.feet.footL.sole * 1000).toFixed(2)} / ${(d.feet.footR.sole * 1000).toFixed(2)} mm\nSeat gap     ${(d.seatGapM * 1000).toFixed(3)} mm\nHand edge gap ${(d.handFrontGapM * 1000).toFixed(1)} mm\nTable hits   ${d.tableTriangleHits}\nPedestal hits ${d.pedestalTriangleHits}`;
}
function positions() {
  matrices(); const result = [];
  for (const mesh of skins) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); result.push(...v.toArray());
  }
  return result;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0; lastFrame = now;
  if (document.hidden) return;
  if (!manual) advance(dt);
  if (now - lastHud > 180) { hud(); lastHud = now; } render();
}
async function recordStart() {
  const stream = canvas.captureStream(30), chunks = [];
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(MediaRecorder.isTypeSupported);
  if (!mimeType) throw Error('No WebM support');
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2200000 });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise(resolve => { recorder.onstop = resolve; });
  recording = { recorder, stream, chunks, mimeType, stopped }; recorder.start(100);
}
async function recordStop() {
  const r = recording; r.recorder.stop(); await r.stopped;
  for (const track of r.stream.getTracks()) track.stop();
  const blob = new Blob(r.chunks, { type: r.mimeType });
  return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
}
async function init() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#e7ebf5');
  camera = new THREE.PerspectiveCamera(44, 1, .05, 30);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x687c9a, 2.1));
  const white = new THREE.DirectionalLight(0xfff5e8, 3.1); white.position.set(-2, 4, 3); scene.add(white);
  white.castShadow = true; white.shadow.mapSize.set(2048, 2048);
  Object.assign(white.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: .1, far: 12 });
  white.shadow.bias = -.00015; white.shadow.normalBias = .012;
  const cyan = new THREE.PointLight(0x78e4ff, 15, 8); cyan.position.set(2, 2, -1); scene.add(cyan);
  const pink = new THREE.PointLight(0xffa4e6, 14, 8); pink.position.set(-1, 2.1, -1.6); scene.add(pink);
  const loader = new GLTFLoader();
  [avatar, fixture] = await Promise.all([loader.loadAsync('../avatar-proof.glb'), loader.loadAsync('../fixture-proof.glb')]);
  for (const gltf of [avatar, fixture]) {
    scene.add(gltf.scene); const mixer = new THREE.AnimationMixer(gltf.scene), actions = {};
    gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    for (const clip of gltf.animations) {
      if (!(clip.name in durations) || Math.abs(clip.duration - durations[clip.name]) > 1e-5) throw Error(`Unexpected timing: ${clip.name} ${clip.duration}`);
      actions[clip.name] = mixer.clipAction(clip);
    }
    if (Object.keys(actions).length !== 5) throw Error('Missing clips');
    actors.push({ mixer, actions, current: null });
  }
  resident = avatar.scene.getObjectByName('resident'); chair = fixture.scene.getObjectByName('chair-root');
  base = fixture.scene.getObjectByName('chair-base'); bodyTurn = avatar.scene.getObjectByName('body-turn');
  head = avatar.scene.getObjectByName('head');
  if (!resident || !chair || !base || !bodyTurn) throw Error('Exported root missing');
  avatar.scene.traverse(o => { if (o.isSkinnedMesh) { skins.push(o); o.frustumCulled = false; } });
  fixture.scene.traverse(o => { if (o.isMesh && (o.name === 'desk' || o.name.startsWith('desk-pedestal'))) colliders.push(o); });
  apply('coding_idle', 0);
  restBody = bodyTurn.getWorldQuaternion(new THREE.Quaternion()); restChair = chair.getWorldQuaternion(new THREE.Quaternion());
  restHead = head.quaternion.clone();
  const keyBounds = new THREE.Box3();
  fixture.scene.traverse(o => { if (o.isMesh && o.name.startsWith('key')) keyBounds.union(new THREE.Box3().setFromObject(o)); });
  keyTop = keyBounds.max.y;
  ready = true; mode = 'coding'; setCamera('proof'); resize(); hud();
  document.querySelectorAll('[disabled]').forEach(e => { e.disabled = false; }); requestAnimationFrame(frame);
  console.info('W2_READY', Object.keys(durations));
}
window.W2 = {
  ready: () => ready, inspect, diagnostics, advance, playSequence, cancel, settle,
  setCamera, render, recordStart, recordStop, positions,
  sample: (clip, time) => { apply(clip, time); return diagnostics(); },
  setPaused: value => { paused = value; },
  info: () => {
    const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { threeRevision: THREE.REVISION, userAgent: navigator.userAgent,
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      viewport: [innerWidth, innerHeight], canvas: [canvas.width, canvas.height], dpr: renderer.getPixelRatio(), cameras,
      clips: actors.map(a => Object.values(a.actions).map(x => ({ name: x.getClip().name, seconds: x.getClip().duration }))),
      bones: skins[0].skeleton.bones.map(b => b.name), renderStats: { ...renderer.info.render },
      fixtureRoots: fixture.scene.children.map(o => o.name), avatarRoots: avatar.scene.children.map(o => o.name),
      desk: new THREE.Box3().setFromObject(fixture.scene.getObjectByName('desk')) };
  }
};
$('#sequence').onclick = playSequence; $('#cancel').onclick = cancel; $('#settle').onclick = settle;
$('#pause').onclick = () => { paused = !paused; hud(); }; $('#camera').onchange = e => setCamera(e.target.value);
$('#clip').onchange = e => { $('#scrub').value = 0; inspect(e.target.value); };
$('#scrub').oninput = e => { const clip = $('#clip').value; inspect(clip, Number(e.target.value) * durations[clip]); };
document.addEventListener('keydown', e => { if (ready && e.key === 'Escape') settle(); });
document.addEventListener('visibilitychange', () => { lastFrame = 0; if (document.hidden && ready) settle(); });
window.addEventListener('resize', () => { if (ready) resize(); });
init().catch(err => { console.error(err); mode = 'failed'; const f = $('#failure'); f.hidden = false; f.textContent = `Playback unavailable: ${err.message}. Inspect report.md and logs.`; });
