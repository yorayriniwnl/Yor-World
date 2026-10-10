import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0c1017');

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 30);
camera.position.set(-1.9, 1.7, 1.55);
camera.lookAt(0.12, 1.25, -1.15);

const loader = new GLTFLoader();

export async function loadAssets() {
  const [room, resident, fixture, groupB, onDemand] = await Promise.all([
    loader.loadAsync('../../assets/room.glb'),
    loader.loadAsync('../../assets/resident.glb'),
    loader.loadAsync('../../assets/fixture.glb'),
    loader.loadAsync('../../assets/group-b-props.glb'),
    loader.loadAsync('../../assets/on-demand-projects.glb')
  ]);

  scene.add(room.scene);
  scene.add(resident.scene);
  scene.add(fixture.scene);
  scene.add(groupB.scene);
  scene.add(onDemand.scene);

  // Apply production lighting calibration
  const lightCalibrations: Record<string, number> = {
    Light_CeilingAmbient: 1.2,
    Light_CyanFill: 1.8,
    Light_HexWall: 2.2,
    Light_TaskDownlight: 2.5
  };

  for (const [name, intensity] of Object.entries(lightCalibrations)) {
    scene.getObjectByName(name)?.traverse((child) => {
      if ((child as THREE.Light).isLight) {
        (child as THREE.Light).intensity = intensity;
      }
    });
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

loadAssets().then(() => animate());
