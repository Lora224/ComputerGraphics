import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

import { createTerrain } from './terrain.js';
import { loadPlants } from './plants.js';
import { setupLighting } from './lighting.js';
import { initAnimals, updateAnimals } from './animals.js';
import {
    loadSubmarine,
    updateSubmarine,
    getSubmarine,
    setupSubmarineControls
} from './submarine.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);
scene.fog = new THREE.FogExp2(0x000011, 0.035);

const clock = new THREE.Clock();

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 2, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

// Controls (optional)
const controls = new OrbitControls(camera, renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);
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
setupSubmarineControls();

// ✅ Enhanced floating particle system
function createFloatingParticles(scene, THREE) {
    const particleCount = 10000;
    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push(
            (Math.random() - 0.5) * 400,  // X range
            Math.random() * 80,          // Y range
            (Math.random() - 0.5) * 400   // Z range
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x88ccff,
        size: 0.5,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    return particles;
}

const particles = createFloatingParticles(scene, THREE);

// Animate loop
function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // Animate particle shimmer
    const time = Date.now() * 0.001;
    particles.rotation.y += 0.0005;
    particles.material.opacity = 0.45 + 0.05 * Math.sin(time);
    particles.material.size = 0.45 + 0.1 * Math.sin(time * 1.5);

    updateAnimals(dt, camera);
    updateSubmarine(dt, camera, THREE);

    renderer.render(scene, camera);
}
animate();
