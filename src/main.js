import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

import { createTerrain } from './terrain.js';
import { loadPlants } from './plants.js';
import { setupLighting } from './lighting.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001033);

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 50, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

// Lighting
setupLighting(scene, THREE);

// Terrain
const geometry = createTerrain(scene, THREE);

// Plants
loadPlants(scene, THREE, GLTFLoader, geometry);

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
