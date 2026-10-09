import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
const workspace = path.resolve(import.meta.dirname, '../../../..');
const require = createRequire(path.join(workspace, 'app/package.json'));
const ts = require('typescript');
const threeURL = pathToFileURL(path.join(path.dirname(require.resolve('three')), 'three.module.js')).href;
const THREE = await import(threeURL);
const files = ['SceneIntegrator.ts', 'CharacterDirector.ts'].map(name => path.join(workspace, 'app/src/features/world', name));
const sources = files.map(file => fs.readFileSync(file, 'utf8'));
const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replaceAll('"three"', JSON.stringify(threeURL));
const sceneModule = `data:text/javascript;base64,${Buffer.from(transpile(sources[0])).toString('base64')}`;
const characterModule = `data:text/javascript;base64,${Buffer.from(transpile(sources[1]).replace('"./SceneIntegrator"', JSON.stringify(sceneModule))).toString('base64')}`;
const { CharacterDirector } = await import(characterModule);
const avatar = new THREE.Object3D();
const chair = new THREE.Object3D();
const avatarMixer = new THREE.AnimationMixer(avatar);
const chairMixer = new THREE.AnimationMixer(chair);
const avatarActions = {}, chairActions = {};
for (const [name, duration] of Object.entries({ coding_idle: 6, notice_visitor: .6, turn_to_visitor: 1.2, greeting_nod: .9, return_to_work: 1.3 })) {
  const clip = new THREE.AnimationClip(name, duration, [new THREE.NumberKeyframeTrack('.position[x]', [0, duration], [0, 1])]);
  avatarActions[name] = avatarMixer.clipAction(clip);
  chairActions[name] = chairMixer.clipAction(clip);
}
const director = new CharacterDirector(avatarMixer, chairMixer, avatarActions, chairActions, avatar, chair);
const initial = { scheduled: avatarActions.coding_idle.isScheduled(), x: avatar.position.x, time: director.currentTime };
director.advance(1);
const afterIdle = { scheduled: avatarActions.coding_idle.isScheduled(), x: avatar.position.x, time: director.currentTime };
director.playGreeting();
director.advance(4.5);
const afterGreeting = { scheduled: avatarActions.coding_idle.isScheduled(), x: avatar.position.x, time: director.currentTime, clip: director.currentClip };
const result = {
  scope: 'Canonical source loaded by TypeScript transpilation without production edits; real Three AnimationMixer with synthetic transform tracks. This demonstrates action activation, not actual GLB bone/skin deformation.',
  inputHashes: files.map((file, i) => ({ file: path.relative(workspace, file), sha256: crypto.createHash('sha256').update(Buffer.from(sources[i])).digest('hex') })),
  initial, afterIdle, afterGreeting,
  result: !initial.scheduled && !afterIdle.scheduled && afterIdle.x === 0 && afterIdle.time > 0 && afterGreeting.scheduled && afterGreeting.x > 0 ? 'FAIL: initial coding action is unscheduled until a greeting changes the clip' : 'INCONCLUSIVE',
};
fs.writeFileSync(path.join(import.meta.dirname, 'character-startup-result.json'), JSON.stringify(result, null, 2) + '\n');
director.dispose();
console.log(JSON.stringify(result));
