import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';

import { createTerrain } from './terrain.js';
import { placeStaticModels } from './placeStaticModels.js';
import { setupLighting } from './lighting.js';

import {
  env,
  initAnimals,
  dynamicSpawn,
  animalPool,
  mixers,
  schoolBehaviour,
  predatorBehaviour
} from './animals.js';

import {
  loadSubmarine,
  updateSubmarine,
  getSubmarine,
  setupSubmarineControls
} from './submarine.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);
scene.fog = new THREE.FogExp2(0x000011, 0.035);

const clock = new THREE.Clock();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;

const controls = new OrbitControls(camera, renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
scene.add(ambientLight);
setupLighting(scene, THREE);

const { mesh, getTerrainHeight } = createTerrain(scene, THREE);
placeStaticModels(scene, getTerrainHeight, THREE);

env.playerPos.copy(camera.position);
env.torchDir.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

await loadSubmarine(scene, THREE, GLTFLoader);
const submarine = getSubmarine();
setupSubmarineControls();

function createFloatingParticles(scene, THREE) {
  const particleCount = 1000000;
  const geometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < particleCount; i++) {
    positions.push(
      (Math.random() - 0.5) * 600,
      Math.random() * 100,
      (Math.random() - 0.5) * 600
    );
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      lightPos: { value: new THREE.Vector3() },
      beamDirection: { value: new THREE.Vector3(0, 0, -1) },
      cameraPos: { value: new THREE.Vector3() },
      color: { value: new THREE.Color(0x88ccff) },
      size: { value: 60.0 },
      lightIntensity: { value: 2.0 },
      lightEnabled: { value: 1.0 }
    },
    vertexShader: `
      uniform float size;
      varying vec3 vWorldPosition;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size / -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 lightPos;
      uniform vec3 beamDirection;
      uniform vec3 cameraPos;
      uniform vec3 color;
      uniform float lightIntensity;
      uniform float lightEnabled;
      varying vec3 vWorldPosition;

      void main() {
        // If flashlight is off, discard all particles
        if (lightEnabled < 0.5) discard;

        float dist = length(lightPos - vWorldPosition);
        vec3 toParticle = normalize(vWorldPosition - lightPos);
        float angleFactor = dot(beamDirection, toParticle);

        // Only keep particles inside cone
        float minConeAngle = 0.1; // smaller = wider cone
        if (angleFactor < minConeAngle) discard;

        float brightness = clamp(angleFactor * (1.0 / (dist * dist)) * lightIntensity * 100.0, 0.0, 1.0);
        if (brightness < 0.05) discard;

        gl_FragColor = vec4(color * brightness, brightness);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  return particles;
}

const particles = createFloatingParticles(scene, THREE);

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  env.playerPos.copy(camera.position);
  env.torchDir.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

  if (submarine) {
    const flashlight = submarine.children.find(child => child.isSpotLight);
    if (flashlight) {
      const worldPos = flashlight.getWorldPosition(new THREE.Vector3());
      const targetPos = flashlight.target.getWorldPosition(new THREE.Vector3());

      particles.material.uniforms.lightPos.value.copy(worldPos);
      particles.material.uniforms.beamDirection.value.copy(
        targetPos.clone().sub(worldPos).normalize()
      );
      particles.material.uniforms.lightEnabled.value = flashlight.visible ? 1.0 : 0.0;
    }
  }

  particles.material.uniforms.cameraPos.value.copy(camera.position);
  particles.rotation.y += 0.0005;

  updateSubmarine(dt, camera, THREE);
  mixers.forEach(m => m.update(dt));

  animalPool.forEach(fishObj => {
    if (["Shark", "Anglerfish"].includes(fishObj.config.name)) {
      predatorBehaviour(dt, fishObj, env);
    } else {
      const neighbours = animalPool.filter(o =>
        o !== fishObj &&
        o.mesh.position.distanceTo(fishObj.mesh.position) < 5
      );
      schoolBehaviour(dt, fishObj, neighbours, env);
    }
  });

  renderer.render(scene, camera);
}

animate();
