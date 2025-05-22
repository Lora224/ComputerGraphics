import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { clone as cloneSkel } from '../libs/SkeletonUtils.js';

export const env = {
  playerPos:           new THREE.Vector3(),
  torchDir:            new THREE.Vector3(),
  torchAngleCos:       Math.cos(THREE.MathUtils.degToRad(15)),
  torchRange:          80,
  predatorDetectRange: 30,
  playerAvoidRange:    15
};

// Scale down all animals for world proportion
const ANIMAL_SCALE_FACTOR = 0.2;

// Random duration between 3–6s for predator states
function randomStateDuration() {
  return 3 + Math.random() * 3;
}

// Species definitions: remove Blue_Tang, add Jellyfish
const speciesConfigs = [
  { name: 'Normal_fish', path: './models/animals/Normal_fish.glb', count: 60, scale: 1.5 },
  { name: 'Anglerfish',   path: './models/animals/Anglerfish.glb',  count: 6, scale: 4 },
  { name: 'MantaRay',     path: './models/animals/Manta_ray.glb',   count: 7, scale: 16 },
  { name: 'Blobfish',     path: './models/animals/Blobfish.glb',    count: 10, scale: 10 },
  { name: 'Shark',        path: './models/animals/Shark.glb',       count: 3, scale: 16 },
  { name: 'Crab',         path: './models/animals/Crab.glb',        count: 25, scale: 0.05 },
  { name: 'Octopus',      path: './models/animals/Octopus.glb',     count: 14, scale: 8 },
  { name: 'Jellyfish',    path: './models/animals/Jellyfish.glb',  count: 15, scale: 30 }
];

let worldSize = 0;
let terrainGeom = null;
let getHeightFunc = null;

export const animalPool = [];
export const mixers     = [];
export const speciesGltfs= {};

/**
 * Initialize all animals once on load
 * Accepts either { mesh, getTerrainHeight } or raw geometry + ws
 */
export async function initAnimals(scene, terrainData, ws) {
  if (terrainData.mesh && typeof terrainData.getTerrainHeight === 'function') {
    terrainGeom   = terrainData.mesh.geometry;
    getHeightFunc = terrainData.getTerrainHeight;
    worldSize     = terrainGeom.parameters.width;
  } else {
    terrainGeom   = terrainData;
    getHeightFunc = (x, z) => getHeightFromGeometry(terrainGeom, x, z);
    worldSize     = ws || terrainGeom.parameters.width;
  }

  // Load all species glTFs
  const loader = new GLTFLoader();
  const tasks  = speciesConfigs.map(cfg =>
    loader.loadAsync(cfg.path).then(gltf => ({ cfg, gltf }))
  );
  const data = await Promise.all(tasks);

  // Store for cloning
  data.forEach(({ cfg, gltf }) => {
    speciesGltfs[cfg.name] = { gltf, config: cfg };
  });

  // Spawn exactly count for each species
data.forEach(({ cfg, gltf }) => {
  if (cfg.name === 'Normal_fish') {
    const schools = 2;
    const perSchool = Math.floor(cfg.count / schools);
    let spawned = 0;

    for (let s = 0; s < schools; s++) {
      for (let i = 0; i < perSchool; i++, spawned++) {
        const mesh = spawnInstance(gltf.scene, cfg, scene);
        mesh.userData.schoolId    = s;
        mesh.userData.isSchooling = true;
      }
    }

    while (spawned++ < cfg.count) {
      const mesh = spawnInstance(gltf.scene, cfg, scene);
      mesh.userData.schoolId    = schools - 1;
      mesh.userData.isSchooling = true;
    }
  } else {
    for (let i = 0; i < cfg.count; i++) {
      const mesh = spawnInstance(gltf.scene, cfg, scene);
      mesh.userData.isSchooling = false;
    }
  }
});
}

function getHeightFromGeometry(geometry, x, z) {
  const posAttr = geometry.attributes.position;
  const width   = geometry.parameters.width;
  const height  = geometry.parameters.height;
  const segX    = geometry.parameters.widthSegments;
  const segZ    = geometry.parameters.heightSegments;
  const relX    = (x + width / 2) / width;
  const relZ    = (z + height / 2) / height;
  const ix      = Math.floor(relX * segX);
  const iz      = Math.floor(relZ * segZ);
  const idx     = iz * (segX + 1) + ix;
  return posAttr.getY(idx);
}

function spawnInstance(originalScene, cfg, scene) {
  const mesh = cloneSkel(originalScene);
  mesh.name = cfg.name;
  mesh.scale.setScalar(cfg.scale * ANIMAL_SCALE_FACTOR);

  // Choose X,Z in world or around player (unused dynamic spawn)
  let x = (Math.random() - 0.5) * worldSize;
  let z = (Math.random() - 0.5) * worldSize;

  // Terrain Y
  let y = getHeightFunc(x, z);

  // Special: Jellyfish hovers above terrain
  if (cfg.name === 'Jellyfish') {
    const hover = 2;
    y += hover;
  }

  mesh.position.set(x, y, z);

  // Movement & state
  mesh.userData.velocity = new THREE.Vector3();
  if (cfg.name === 'Crab' || cfg.name === 'Octopus') {
    // no movement
  } else if (cfg.name === 'Jellyfish') {
    // gentle vertical bob
    mesh.userData.velocity.set(0, (Math.random() - 0.5) * 0.1, 0);
    // add glow: emissive dim
    mesh.traverse(child => {
      if (child.material) {
        child.material.emissive = new THREE.Color(0x00ffcc);
        child.material.emissiveIntensity = 0.25;
        child.material.transparent = true;
        child.material.opacity = 0.7;
      }
    });
  } else if (cfg.name === 'Shark') {
    mesh.userData.state = 'active';
   mesh.userData.state       = 'active';
   mesh.userData.stateTimer  = randomStateDuration();
   // store a wander angle and baseHeight so they can roam
   mesh.userData.wanderAngle = Math.random() * Math.PI * 2;
   mesh.userData.baseHeight  = mesh.position.y;
  }  else if (['MantaRay','Blobfish'].includes(cfg.name)) {
  mesh.userData.isFreeSwimmer = true;
  mesh.userData.freeTimer     = 2 + Math.random() * 3;    // pick new dir every 2–5s
  mesh.userData.baseHeight    = mesh.position.y;
  // initial direction
  const a = Math.random() * Math.PI * 2;
  mesh.userData.velocity = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.5);
}

  else {
    // schooling fish initial velocity
    mesh.userData.velocity.set(
      (Math.random() - 0.5) * 0.4,
      0,
      (Math.random() - 0.5) * 0.4
    );
   mesh.userData.baseHeight = mesh.position.y;
    mesh.userData.freeTimer  = 2 + Math.random() * 3;
  }

  scene.add(mesh);
  animalPool.push({ mesh, config: cfg });

  // Setup animations
  const mixer = new THREE.AnimationMixer(mesh);
  speciesGltfs[cfg.name].gltf.animations.forEach(clip => mixer.clipAction(clip).play());
  mixers.push(mixer);
  return mesh;
}

export function dynamicSpawn() {
  // Disabled: all spawn on load only
}

export function schoolBehaviour(dt, fishObj, neighbours, env) {
  if (!fishObj.mesh.userData.isSchooling) return;  
  if (name === 'Crab' || name === 'Octopus' || name === 'Jellyfish') return;

  const fish = fishObj.mesh;
  const maxSpeed = 0.5;
  const maxForce = 0.02;
  const perception = 5;
  const align = new THREE.Vector3();
  const coh   = new THREE.Vector3();
  const sep   = new THREE.Vector3();
  let total   = 0;

  neighbours.forEach(o => {
    const other = o.mesh;
    const d = fish.position.distanceTo(other.position);
    if (other !== fish && d < perception) {
      align.add(other.userData.velocity);
      coh.add(other.position);
      sep.add(fish.position.clone().sub(other.position).divideScalar(d));
      total++;
    }
  });

  if (total > 0) {
    align.divideScalar(total).setLength(maxSpeed)
      .sub(fish.userData.velocity).clampLength(0, maxForce);
    coh.divideScalar(total).sub(fish.position).setLength(maxSpeed)
      .sub(fish.userData.velocity).clampLength(0, maxForce);
    sep.divideScalar(total).setLength(maxSpeed)
      .sub(fish.userData.velocity).clampLength(0, maxForce);
    fish.userData.velocity.add(align)
      .add(coh.multiplyScalar(0.8))
      .add(sep.multiplyScalar(1.5));
  }

  // player avoidance
  const toP = fish.position.clone().sub(env.playerPos);
  if (toP.length() < env.playerAvoidRange) {
    const avoid = toP.setLength(maxSpeed)
      .sub(fish.userData.velocity).clampLength(0, maxForce * 2);
    fish.userData.velocity.add(avoid);
  }

  fish.userData.velocity.clampLength(0, maxSpeed);
  fish.position.add(fish.userData.velocity.clone().multiplyScalar(dt));

  const dir = fish.userData.velocity.clone(); dir.y = 0;
  if (dir.lengthSq() > 1e-4) {
    fish.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  }
}

export function predatorBehaviour(dt, predatorObj, env) {
  const speed = 0.5;
  const predator = predatorObj.mesh;
  const ud       = predator.userData;

  if (!ud.state) {
    ud.state = 'active';
    ud.stateTimer = randomStateDuration();
    ud.wanderAngle = Math.random() * Math.PI * 2;
   ud.baseHeight  = predator.position.y;
  }

  if (ud.state === 'idle') {
    ud.stateTimer -= dt;
    if (ud.stateTimer <= 0) {
      ud.state = 'active';
      ud.stateTimer = randomStateDuration();
    }
    return;
  }

  ud.stateTimer -= dt;
  if (ud.stateTimer <= 0) {
    ud.state = 'idle';
    ud.stateTimer = randomStateDuration();
  }

  // chase player if close
  const toP = env.playerPos.clone().sub(predator.position);
  if (toP.length() < env.predatorDetectRange) {
    const dir = toP.normalize();
    const speed = 0.5;
    predator.position.add(dir.multiplyScalar(speed * dt));
    predator.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  } else {
    // simple wander
   ud.wanderAngle += (Math.random() - 0.5) * 0.5 * dt;
   const dir = new THREE.Vector3(Math.cos(ud.wanderAngle), 0, Math.sin(ud.wanderAngle));
   predator.position.add(dir.multiplyScalar(speed * dt));
   // keep their original depth
   predator.position.y = ud.baseHeight;
   predator.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  }
}
export function jellyfishBehaviour(dt, fishObj) {
  const mesh = fishObj.mesh;
  // apply vertical velocity
  mesh.position.y += mesh.userData.velocity.y * dt;
  // reverse when drifting ±1 unit from spawn
  if (Math.abs(mesh.position.y - mesh.userData.baseHeight) > 1) {
    mesh.userData.velocity.y *= -1;
  }
}

export function freeSwimBehaviour(dt, fishObj) {
  const mesh = fishObj.mesh;
  mesh.userData.freeTimer -= dt;
  if (mesh.userData.freeTimer <= 0) {
    // pick a new random horizontal direction
    const a = Math.random() * Math.PI * 2;
    mesh.userData.velocity.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.5);
    mesh.userData.freeTimer = 2 + Math.random() * 3;
  }

  // move
  mesh.position.x += mesh.userData.velocity.x * dt;
  mesh.position.z += mesh.userData.velocity.z * dt;
  mesh.position.y  = mesh.userData.baseHeight;         // stay at constant depth

  // yaw to heading
  const dir = mesh.userData.velocity.clone(); dir.y = 0;
  if (dir.lengthSq() > 1e-4) {
    mesh.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  }
}
