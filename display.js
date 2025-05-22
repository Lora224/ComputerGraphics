import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { createTerrain } from '../src/terrain.js';
import { placeStaticModels } from '../src/placeStaticModels.js';


// World side length
const worldSize = 500;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x042033);
//scene.fog = new THREE.Fog(0x042033, 30, 150);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 40, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
const hemiLight = new THREE.HemisphereLight(0x88ccff, 0x223344, 0.7);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(30, 50, -30);
scene.add(dirLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Terrain
const { mesh, getTerrainHeight } = createTerrain(worldSize, scene, THREE);

// Place static models
placeStaticModels(worldSize, scene, getTerrainHeight, THREE);

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
