//TODO: adjust fish swimming speed

import * as THREE from '../libs/three.module.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import { clone as cloneSkel } from '../libs/SkeletonUtils.js';

export const env = {
  playerPos:           new THREE.Vector3(),
  torchDir:            new THREE.Vector3(),
  torchAngleCos:       Math.cos(THREE.MathUtils.degToRad(15)),
  torchRange:          80,
  predatorDetectRange: 60,
  playerAvoidRange:    25
};

const ANIMAL_SCALE_FACTOR = 0.2;
function randomStateDuration() { return 3 + Math.random()*3; }

// ————— SCHOOL CONFIG —————
// species that school: how many clusters, how big, and minimum inter‐fish distance
const SCHOOL_CONFIG = {
  Normal_fish: { schools: 16, clusterRadius: 20, minDist: 0.5, heightRange: 5 },
  Jellyfish:   { schools: 12, clusterRadius: 10, minDist: 1.0 }
};

const speciesConfigs = [
  { name:'Normal_fish', path:'./models/animals/Normal_fish.glb', count:360, scale:4 },
  { name:'Anglerfish',   path:'./models/animals/Anglerfish.glb',  count:6,  scale:4   },
  { name:'MantaRay',     path:'./models/animals/Manta_ray.glb',   count:10,  scale:16  },
  { name:'Blobfish',     path:'./models/animals/Blobfish.glb',    count:10, scale:10  },
  { name:'Shark',        path:'./models/animals/Shark.glb',       count:6,  scale:20  },
  { name:'Crab',         path:'./models/animals/Crab.glb',        count:25, scale:0.04},
  { name:'Octopus',      path:'./models/animals/Octopus.glb',     count:6,  scale:8   },
  { name:'Jellyfish',    path:'./models/animals/Jellyfish.glb',  count:140, scale:35  }
];

let worldSize = 0;
let terrainGeom = null;
let getHeightFunc = null;

export const animalPool = [];
export const mixers     = [];
export const speciesGltfs= {};

// ————— INIT ALL ANIMALS —————
export async function initAnimals(scene, terrainData, ws) {
  // resolve terrain geometry + height function
  if (terrainData.mesh && terrainData.getTerrainHeight) {
    terrainGeom   = terrainData.mesh.geometry;
    getHeightFunc = terrainData.getTerrainHeight;
    worldSize     = terrainGeom.parameters.width;
  } else {
    terrainGeom   = terrainData;
    getHeightFunc = (x,z)=> getHeightFromGeometry(terrainGeom,x,z);
    worldSize     = ws || terrainGeom.parameters.width;
  }

  // load all glTFs
  const loader = new GLTFLoader();
  const loadTasks = speciesConfigs.map(cfg=>
    loader.loadAsync(cfg.path).then(gltf=>({cfg,gltf}))
  );
  const loaded = await Promise.all(loadTasks);
  loaded.forEach(({cfg,gltf})=>{
    speciesGltfs[cfg.name] = { gltf, config: cfg };
  });

  // spawn each species
  loaded.forEach(({cfg,gltf})=>{
    const schoolDef = SCHOOL_CONFIG[cfg.name];
    if (schoolDef) {
      // — cluster spawning —
      const { schools, clusterRadius, minDist, heightRange} = schoolDef;
      const perCluster = Math.floor(cfg.count / schools);
      let spawned = 0;

      // pick cluster centers
      const centers = Array.from({length: schools}, () => {
        const cx = (Math.random()-0.5)*worldSize;
        const cz = (Math.random()-0.5)*worldSize;
        const baseY = getHeightFunc(cx, cz);
        // choose one random cluster-height per school
        const halfH = heightRange * 0.5;
        const maxY = 100;  // same maxHeight as Submarine.js :contentReference[oaicite:1]{index=1}
        const cy = THREE.MathUtils.randFloat(
          baseY + 1 + halfH,
          maxY - halfH
        );

        return { cx, cz, cy };
      });


      // for each center, spawn perCluster fish
      centers.forEach(({ cx, cz, cy }, idx) => {
        const positions = [];
        for (let i=0; i<perCluster; i++, spawned++) {
          let x,z,tries=0;
          do {
            const a = Math.random()*Math.PI*2;
            const r = Math.random()*clusterRadius;
            x = cx + Math.cos(a)*r;
            z = cz + Math.sin(a)*r;
            tries++;
          } while (tries<10 && positions.some(p=>((p.x-x)**2+(p.z-z)**2)<minDist*minDist));
          positions.push({x,z});
          // pick a random height within ±heightRange/2 of the cluster center
          const halfH = heightRange * 0.5;
          const randomY = THREE.MathUtils.randFloat(cy - halfH, cy + halfH);
          const mesh = spawnInstance(gltf.scene, cfg, scene, x, z, randomY);
          mesh.userData.isSchooling = true;
          mesh.userData.schoolId    = idx;

        }
      });

      // any remainders spawn randomly but still spaced
      while (spawned++ < cfg.count) {
        const mesh = spawnInstance(gltf.scene, cfg, scene);
        mesh.userData.isSchooling = true;
      }
    }
    else {
      // non‐schooling species: just spawn at random
      for (let i=0; i<cfg.count; i++) {
        const mesh = spawnInstance(gltf.scene, cfg, scene);
        mesh.userData.isSchooling = false;
      }
    }
  });
}

// ————— CLONE & POSITION ONE INSTANCE —————
// xOverride,zOverride optional: gives cluster control
function spawnInstance(originalScene, cfg, scene, xOverride, zOverride, yOverride) {
  const mesh = cloneSkel(originalScene);
  mesh.name = cfg.name;
  mesh.scale.setScalar(cfg.scale * ANIMAL_SCALE_FACTOR);

  // choose X,Z
  const x = (xOverride !== undefined
    ? xOverride
    : (Math.random()-0.5)*worldSize);
  const z = (zOverride !== undefined
    ? zOverride
    : (Math.random()-0.5)*worldSize);

// base terrain height
const terrainY = getHeightFunc(x, z);
// if cluster or manual override provided, use it; otherwise pick random
let y = (yOverride !== undefined)
  ? yOverride
  : terrainY;

// for all swimmers (not crabs/octopus on the ground),
// pick a random Y between terrain+1 and the submarine ceiling
if (cfg.name !== 'Crab' && cfg.name !== 'Octopus') {
  const minY = terrainY + 1;
  const maxY = 100;  // same maxHeight as Submarine.js :contentReference[oaicite:1]{index=1}
  if (maxY > minY) {
    y = THREE.MathUtils.randFloat(minY, maxY);
  }
}

mesh.position.set(x, y, z);


  // initialize velocity & behaviour flags
  mesh.userData.velocity   = new THREE.Vector3();
  mesh.userData.baseHeight = mesh.position.y;

  if (cfg.name==='Crab' || cfg.name==='Octopus') {
    // ground‐stayers: no velocity
  }
  else if (cfg.name==='Jellyfish') {
    // gentle vertical bob
    mesh.userData.velocity.set(0,(Math.random()-0.5)*0.1,0);
    // dim emissive glow
    mesh.traverse(c=> {
      if (c.material) {
        c.material.emissive = new THREE.Color(0x00ffcc);
        c.material.emissiveIntensity = 0.5;
        c.material.transparent = true;
        c.material.opacity = 0.7;
      }
    });
  }
  else if (cfg.name==='Shark') {
    mesh.userData.state      = 'active';
    mesh.userData.stateTimer = randomStateDuration();
    mesh.userData.wanderAngle= Math.random()*Math.PI*2;
  }
  else if (['MantaRay','Blobfish','Anglerfish'].includes(cfg.name)) {
    mesh.userData.isFreeSwimmer = true;
    mesh.userData.freeTimer     = 2 + Math.random()*3;
    const a = Math.random()*Math.PI*2;
    mesh.userData.velocity.set(Math.cos(a),0,Math.sin(a)).multiplyScalar(1.5);
  }
  else {
    // schooling fish initial random swim
    mesh.userData.velocity.set(
      (Math.random()-0.5)*1, 0,
      (Math.random()-0.5)*1
    );
  }

  scene.add(mesh);
  animalPool.push({ mesh, config: cfg });

  // start any glTF animations
  const mixer = new THREE.AnimationMixer(mesh);
  speciesGltfs[cfg.name].gltf.animations.forEach(clip=>
    mixer.clipAction(clip).play()
  );
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
  const maxSpeed = 3;
  const maxForce = 0.05;
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
    const avoid = toP.setLength(maxSpeed*1.5)
      .sub(fish.userData.velocity).clampLength(0, maxForce * 4);
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
  const speed = 2.5;
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
   const chaseSpeed = 4.0;       // chase at 4× speed :contentReference[oaicite:3]{index=3}
   predator.position.add(dir.multiplyScalar(chaseSpeed * dt))
    predator.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
  } else {
    // simple wander
   ud.wanderAngle += (Math.random() - 0.5) * 0.5 * dt;
   const dir = new THREE.Vector3(Math.cos(ud.wanderAngle), 0, Math.sin(ud.wanderAngle));
   predator.position.add(dir.multiplyScalar(speed * dt));  // faster roam :contentReference[oaicite:4]{index=4}
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
    mesh.userData.velocity.set(Math.cos(a), 0, Math.sin(a)).multiplyScalar(1.5);
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
