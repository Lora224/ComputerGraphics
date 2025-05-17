import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

import { createTerrain } from './terrain.js';
import { loadPlants } from './plants.js';
import { setupLighting } from './lighting.js';
import { initAnimals, updateAnimals } from './animals.js';

import { loadSubmarine, updateSubmarine, getSubmarine, setupSubmarineControls } from './submarine.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001033);

const clock = new THREE.Clock();

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

// Controls (for dev testing only)
const controls = new OrbitControls(camera, renderer.domElement);

// Lighting 
setupLighting(scene, THREE);

// Terrain
const geometry = createTerrain(scene, THREE);

// Plants
loadPlants(scene, THREE, GLTFLoader, geometry);

// Animals
await initAnimals(scene, THREE, GLTFLoader);

// Submarine
await loadSubmarine(scene, THREE, GLTFLoader);
const submarine = getSubmarine();

// Setup controls
setupSubmarineControls();

// Animate loop
function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    updateAnimals(dt, camera);        // Removed torch reference
    updateSubmarine(dt, camera, THREE);

    renderer.render(scene, camera);
}
animate();
