import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

import { createTerrain } from './terrain.js';
import { loadPlants } from './plants.js';
import { setupLighting } from './lighting.js';
import { initAnimals, updateAnimals } from './animals.js';


// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x001033);

const clock = new THREE.Clock();

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
renderer.shadowMap.enabled = true;                 // turn on shadows 
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputEncoding      = THREE.sRGBEncoding;   // correct colour space


// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.update();


// Lighting 
setupLighting(scene, THREE);

//cone shaped torch(temporary) 
//TODO: replace with actual torch operator
const torch = new THREE.SpotLight(
  0xffffff,             // colour
  10,                    // intensity  (1 = default; bump it so it’s obvious)
  0,                   // distance   (0 = infinite; 80 is fine for tests)
  Math.PI / 6,          // angle      (30 deg)
  0.1,                  // penumbra   (soft edge)
  0.5                     // decay      (brightness fall‑off)
);
torch.position.set(0, 0, 1);
torch.castShadow = true;
const torchTarget = new THREE.Object3D();
torchTarget.position.set(0, 0, -1);   // straight ahead
torch.target = torchTarget;

// parent both to the *camera*
camera.add(torch);
camera.add(torchTarget);

// !! IMPORTANT !!  the camera must now live in the scene graph
scene.add(camera);  


const torchHelper = new THREE.SpotLightHelper(torch);
scene.add(torchHelper);


// Terrain
const geometry = createTerrain(scene, THREE);

// Plants
loadPlants(scene, THREE, GLTFLoader, geometry);

// Animals
await initAnimals(scene, THREE, GLTFLoader);  

// Animate
function animate() {
  requestAnimationFrame(animate);
  
  const dt = clock.getDelta();
  updateAnimals(dt,camera,torch);              // Update animal positions
  torchHelper.update();                    // Update the torch helper
  controls.update();
  renderer.render(scene, camera);
}
animate();
