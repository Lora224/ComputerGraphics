import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { clone as cloneSkel } from '../libs/SkeletonUtils.js';
export const env = {
  playerPos:          new THREE.Vector3(),
  torchDir:           new THREE.Vector3(),
  torchAngleCos:      Math.cos( THREE.MathUtils.degToRad(15) ),
  torchRange:         80,
  predatorDetectRange:30,
  playerAvoidRange:   15
};
// Define your species configurations
const speciesConfigs = [
  { name: 'Normal_fish', path: './models/animals/Normal_fish.glb', count: 1, scale: 1 },
  { name: 'Blue_Tang',    path: './models/animals/Tang_fish.glb',    count: 1, scale: 1 },
  { name: 'Anglerfish',     path: './models/animals/Anglerfish.glb',     count: 1,  scale: 2 },
  { name: 'MantaRay',     path: './models/animals/Manta_ray.glb',     count: 1,  scale: 5 },
  { name: 'Blobfish',     path: './models/animals/Blobfish.glb',     count: 1,  scale: 5 },
  { name: 'Shark',        path: './models/animals/Shark.glb',        count: 1,  scale: 8 },
  { name: 'Crab',         path: './models/animals/Crab.glb',         count: 1, scale: 0.1},
 // { name: 'Starfish',     path: './models/animals/Starfish.glb',     count: 8,  scale: 2 },
  { name: 'Octopus',      path: './models/animals/Octopus.glb',      count: 1,  scale: 2 },
];
let terrainGeom = null;
// Pools and storage
export const animalPool = [];
export const mixers = [];
// Keep loaded GLTFs for dynamic spawning
export const speciesGltfs = {}; // key: species name, value: { gltf, config }

let lastSpawnPosition = new THREE.Vector3();
const spawnDistanceThreshold = 20; // distance moved before spawning
const maxDynamicFish = 100;

/**
 * Load and initialize static animal instances
 */
export async function initAnimals(scene, terrainGeometry) {
  terrainGeom = terrainGeometry;
  const loader = new GLTFLoader();
  const tasks = speciesConfigs.map(cfg =>
    loader.loadAsync(cfg.path).then(gltf => ({ cfg, gltf }))
  );
  const data = await Promise.all(tasks);

  // Store loaded GLTFs for dynamic spawning
  data.forEach(({ cfg, gltf }) => {
    speciesGltfs[cfg.name] = { gltf, config: cfg };
  });

  // Static initial population
  data.forEach(({ cfg, gltf }) => {
    for (let i = 0; i < cfg.count; i++) {
      spawnInstance(gltf.scene, cfg, scene, env);
    }
  });
  lastSpawnPosition.copy(env.playerPos);
}
// getHeightFromGeometry function to get the height of the terrain at a specific x, z position
function getHeightFromGeometry(geometry, x, z) {
  const posAttr = geometry.attributes.position;
  const width   = geometry.parameters.width;
  const height  = geometry.parameters.height;
  const segX    = geometry.parameters.widthSegments;
  const segZ    = geometry.parameters.heightSegments;

  const relX  = (x + width  / 2) / width;
  const relZ  = (z + height / 2) / height;
  const gridX = Math.floor(relX * segX);
  const gridZ = Math.floor(relZ * segZ);

  const idx = gridZ * (segX + 1) + gridX;
  return posAttr.getZ(idx);
}

/**
 * Clone a GLTF scene, setup mesh, animation, and add to scene and pools.
 */
function spawnInstance(originalScene, cfg, scene, env) {
  const mesh = cloneSkel(originalScene);
  mesh.name = cfg.name;
  mesh.scale.setScalar(cfg.scale);
  // random or around player
  const angle = Math.random() * Math.PI * 2;
  const radius = cfg.dynamicRadius || 10;
  const center = cfg.spawnAroundPlayer ? env.playerPos : new THREE.Vector3(0, 0, 0);
  const x = center.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 5;
  const z = center.z + Math.sin(angle) * radius + (Math.random() - 0.5) * 5;
  const y = getHeightFromGeometry(terrainGeom, x, z);
  mesh.position.set(x, y, z);
  // velocity init
  mesh.userData.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.5,
    0,
    (Math.random() - 0.5) * 0.5
  );
  scene.add(mesh);
  animalPool.push({ mesh, config: cfg });
  // animation
  const mixer = new THREE.AnimationMixer(mesh);
  speciesGltfs[cfg.name].gltf.animations.forEach(clip => mixer.clipAction(clip).play());
  mixers.push(mixer);
}

/**
 * Check player movement and spawn fish dynamically
 */
export function dynamicSpawn(scene, env) {
  const dist = lastSpawnPosition.distanceTo(env.playerPos);
  if (dist < spawnDistanceThreshold) return;
  lastSpawnPosition.copy(env.playerPos);

  // spawn a few new fish around player
  const keys = Object.keys(speciesGltfs);
  const toSpawn = Math.min(5, maxDynamicFish - animalPool.length);
  for (let i = 0; i < toSpawn; i++) {
    const name = keys[Math.floor(Math.random() * keys.length)];
    const { gltf, config } = speciesGltfs[name];
    spawnInstance(gltf.scene, { ...config, spawnAroundPlayer: true, dynamicRadius: 15 }, scene, env);
  }
}

/* Schooling behavior (Boids-inspired) for schooling fish
 * 
 * Steps:
 * 1. Alignment: Steer toward average heading of neighbors
 * 2. Cohesion: Steer toward average position of neighbors
 * 3. Separation: Avoid crowding neighbors
 * 4. Player avoidance: Steer away if player is too close
 * 5. Limit speed and update position/orientation
 * 
 * @param {number} dt - Time delta
 * @param {{mesh: THREE.Object3D, config: Object}} fishObj - Fish instance
 * @param {Array} neighbours - Nearby fishObj instances
 * @param {Object} env - Environment (e.g. env.playerPos, env.playerAvoidRange)
 */
export function schoolBehaviour(dt, fishObj, neighbours, env) {
  const fish = fishObj.mesh;
  const maxSpeed = 2;
  const maxForce = 0.05;
  const perception = 5;

  const alignment = new THREE.Vector3();
  const cohesion  = new THREE.Vector3();
  const separation= new THREE.Vector3();
  let total = 0;

  neighbours.forEach(otherObj => {
    const other = otherObj.mesh;
    const distance = fish.position.distanceTo(other.position);
    if (other !== fish && distance < perception) {
      // Alignment: average velocity
      alignment.add(other.userData.velocity);
      // Cohesion: average position
      cohesion.add(other.position);
      // Separation: vector pointing away inversely
      const diff = fish.position.clone().sub(other.position).divideScalar(distance);
      separation.add(diff);
      total++;
    }
  });

  if (total > 0) {
    // Finalize alignment
    alignment.divideScalar(total)
      .setLength(maxSpeed)
      .sub(fish.userData.velocity)
      .clampLength(0, maxForce);

    // Finalize cohesion
    cohesion.divideScalar(total)
      .sub(fish.position)
      .setLength(maxSpeed)
      .sub(fish.userData.velocity)
      .clampLength(0, maxForce);

    // Finalize separation
    separation.divideScalar(total)
      .setLength(maxSpeed)
      .sub(fish.userData.velocity)
      .clampLength(0, maxForce);

    // Apply forces
    fish.userData.velocity.add(alignment.multiplyScalar(1.0));
    fish.userData.velocity.add(cohesion.multiplyScalar(0.8));
    fish.userData.velocity.add(separation.multiplyScalar(1.5));
  }

  // Player avoidance
  const toPlayer = fish.position.clone().sub(env.playerPos);
  if (toPlayer.length() < env.playerAvoidRange) {
    const avoid = toPlayer
      .setLength(maxSpeed)
      .sub(fish.userData.velocity)
      .clampLength(0, maxForce * 2);
    fish.userData.velocity.add(avoid);
  }

  // Limit speed and move
  fish.userData.velocity.clampLength(0, maxSpeed);
  fish.position.add(fish.userData.velocity.clone().multiplyScalar(dt));

  // Update orientation to face direction
  if (fish.userData.velocity.lengthSq() > 0.0001) {
    fish.lookAt(fish.position.clone().add(fish.userData.velocity));
  }
}
/**
 * Predator behavior: wander and chase player on proximity
 *
 * @param {number} dt           Time delta (seconds)
 * @param {{mesh: THREE.Object3D, config: Object}} predatorObj
 * @param {Object} env          Environment (must include playerPos: Vector3 and predatorDetectRange: number)
 */
export function predatorBehaviour(dt, predatorObj, env) {
  const predator = predatorObj.mesh;
  const maxSpeed = 3;
  const maxForce = 0.1;

  // 1. Wander: small random steering
  const wanderForce = new THREE.Vector3(
    (Math.random() - 0.5) * 0.2,
    0,
    (Math.random() - 0.5) * 0.2
  );

  // 2. Check distance to player
  const toPlayer = env.playerPos.clone().sub(predator.position);
  let steer;

  if (toPlayer.length() < env.predatorDetectRange) {
    // Chase: steer toward the player
    const desired = toPlayer.setLength(maxSpeed);
    steer = desired
      .sub(predator.userData.velocity)
      .clampLength(0, maxForce * 2);

    // Optional: trigger a sand-puff particle burst here
    // env.emitParticles(predator.position, 'sand');
  } else {
    // Just wander
    steer = wanderForce
      .sub(predator.userData.velocity)
      .clampLength(0, maxForce);
  }

  // 3. Apply steering force and update velocity
  predator.userData.velocity.add(steer);
  predator.userData.velocity.clampLength(0, maxSpeed);

  // 4. Move the predator
  predator.position.add(
    predator.userData.velocity.clone().multiplyScalar(dt)
  );

  // 5. Orient to face movement direction
  if (predator.userData.velocity.lengthSq() > 1e-4) {
    predator.lookAt(
      predator.position.clone().add(predator.userData.velocity)
    );
  }
}

  // keep everything inside a 250×250×60 box
  function wrap(pos) {
    const LIMIT = 125;
    ['x', 'z'].forEach((axis) => {
      if (pos[axis] > LIMIT) pos[axis] = -LIMIT;
      if (pos[axis] < -LIMIT) pos[axis] = LIMIT;
    });
  }
