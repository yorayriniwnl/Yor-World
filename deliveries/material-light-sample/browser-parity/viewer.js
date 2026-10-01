import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LightingController } from './lighting-controller.js';

const canvas = document.getElementById('webgl-canvas');
const statusEl = document.getElementById('status');

// 1. Renderer Setup
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// 2. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#CFCDD9');

// 3. Cameras
const cameras = {
  reference_match: {
    pos: new THREE.Vector3(-1.95, 2.10, 1.55),
    target: new THREE.Vector3(0.22, 0.90, -1.15),
    fov: 52
  },
  home_desktop: {
    pos: new THREE.Vector3(-2.15, 1.70, 1.55),
    target: new THREE.Vector3(0.12, 1.25, -1.15),
    fov: 60
  },
  monitor_detail: {
    pos: new THREE.Vector3(0.0, 1.18, -0.52),
    target: new THREE.Vector3(0.0, 1.10, -1.36),
    fov: 46
  }
};

let currentCamKey = 'reference_match';
const camera = new THREE.PerspectiveCamera(
  cameras.reference_match.fov,
  window.innerWidth / window.innerHeight,
  0.1,
  50.0
);

function applyCamera(key) {
  const cfg = cameras[key];
  if (!cfg) return;
  currentCamKey = key;
  camera.fov = cfg.fov;
  camera.position.copy(cfg.pos);
  camera.lookAt(cfg.target);
  camera.updateProjectionMatrix();
}
applyCamera('reference_match');

// 4. Lighting Rig (Runtime Coordinates)
const ambient = new THREE.AmbientLight(0xE8EEF8, 0.65);
scene.add(ambient);

// Hex Lights Fill (Pink/Lilac)
const hexLight = new THREE.PointLight(0xF1A5F3, 3.2, 5.0, 1.2);
hexLight.position.set(-0.30, 2.25, -1.68);
scene.add(hexLight);

// Warm Monitor Lightbar Spot (Downlight onto keyboard)
const lightbarSpot = new THREE.SpotLight(0xFFE28A, 4.5, 3.5, Math.PI * 0.40, 0.5, 1.0);
lightbarSpot.position.set(0.0, 1.32, -1.33);
const lightbarTarget = new THREE.Object3D();
lightbarTarget.position.set(0.0, 0.75, -0.95);
scene.add(lightbarTarget);
lightbarSpot.target = lightbarTarget;
scene.add(lightbarSpot);

// Cyan Under-Desk Fill
const cyanUnderdesk = new THREE.PointLight(0x00E5FF, 3.0, 3.0, 1.2);
cyanUnderdesk.position.set(0.0, 0.35, -1.25);
scene.add(cyanUnderdesk);

// Cyan Monitor Backlight Halo
const cyanHalo = new THREE.PointLight(0x25D5FF, 2.5, 3.5, 1.2);
cyanHalo.position.set(0.0, 1.15, -1.55);
scene.add(cyanHalo);

// PC Internal RGB Point Light
const pcRgb = new THREE.PointLight(0xFF40C8, 2.0, 2.0, 1.2);
pcRgb.position.set(1.00, 0.96, -1.15);
scene.add(pcRgb);

// Pegboard Overhead Spot
const pegSpot = new THREE.SpotLight(0xFFF5E8, 2.2, 4.0, Math.PI * 0.30, 0.4, 1.0);
pegSpot.position.set(1.28, 2.35, -0.90);
const pegTarget = new THREE.Object3D();
pegTarget.position.set(1.30, 1.68, -1.15);
scene.add(pegTarget);
pegSpot.target = pegTarget;
scene.add(pegSpot);

// Front Key Fill Light
const keyFill = new THREE.DirectionalLight(0xE8F0FF, 1.4);
keyFill.position.set(-1.10, 2.10, 1.10);
const keyTarget = new THREE.Object3D();
keyTarget.position.set(0.10, 0.85, -1.10);
scene.add(keyTarget);
keyFill.target = keyTarget;
scene.add(keyFill);

const lights = {
  ambient,
  hexLight,
  lightbarSpot,
  cyanUnderdesk,
  cyanHalo,
  pcRgb,
  pegSpot,
  keyFill
};

const materials = {};
let lightingController = null;

// 5. Load GLTF
const loader = new GLTFLoader();
loader.load(
  '../workstation-sample.glb',
  (gltf) => {
    scene.add(gltf.scene);
    statusEl.textContent = 'Workstation GLTF Ready';
    statusEl.style.color = '#4ade80';

    // Count triangles and draw calls
    let totalTriangles = 0;
    let totalMeshes = 0;
    gltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        totalMeshes++;
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => materials[m.name] = m);
          } else {
            materials[obj.material.name] = obj.material;
          }
        }
        if (obj.geometry) {
          if (obj.geometry.index) {
            totalTriangles += obj.geometry.index.count / 3;
          } else if (obj.geometry.attributes.position) {
            totalTriangles += obj.geometry.attributes.position.count / 3;
          }
        }
      }
    });

    // Initialize LightingController
    lightingController = new LightingController(lights, materials);
    window.WorldLighting = lightingController;

    window.__DIAGNOSTICS__ = {
      loaded: true,
      totalMeshes,
      totalTriangles,
      camera: currentCamKey,
      renderInfo: renderer.info.render
    };

    window.__WORLD_READY__ = true;
    console.log('Three.js Workstation Sample Loaded Successfully:', window.__DIAGNOSTICS__);

    // Signal UI update if present
    if (window.__UPDATE_UI__) window.__UPDATE_UI__();
  },
  undefined,
  (error) => {
    console.error('Failed to load GLTF:', error);
    statusEl.textContent = 'Error loading GLTF: ' + error.message;
    statusEl.style.color = '#ef4444';
  }
);

// Global Camera Switcher
window.__SWITCH_CAMERA__ = function(name) {
  applyCamera(name);
  if (window.__DIAGNOSTICS__) {
    window.__DIAGNOSTICS__.camera = name;
  }
  renderer.render(scene, camera);
};

window.__SET_RESOLUTION__ = function(width, height) {
  canvas.width = width;
  canvas.height = height;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  renderer.render(scene, camera);
};

window.__GET_SCREENSHOT__ = function() {
  renderer.render(scene, camera);
  return canvas.toDataURL('image/png');
};

// 6. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
