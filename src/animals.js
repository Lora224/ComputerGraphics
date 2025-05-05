//TODO: Replace the fish with a variety of fish models and behaviours.
//TODO: Make the fish swim in schools, swim away from the player. Occasionally dart forward, then regroup.
//TODO: Make the Lionfish,Blobfish,Shark (predators) swim alone, will be curious and swim towards the player, Tiny sand‑puff particle on movement start/end.
//TODO: Make the Carb/Starfish,octopus stay in the bottom,will stay unless seen by the torchlight


//three kinds of fish 
//1. fish that swim in schools, swim away from the player. Occasionally dart forward, then regroup.
//2. Lionfish,Blobfish,Shark (predators): swim alone, will be curious and swim towards the player, Tiny sand‑puff particle on movement start/end.
//3. Carb/Starfish,octopus: fish stay in the bottom,will stay unless seen by the torchlight
// animals.js  – add near the top
import { Vector3, MathUtils } from '../libs/three.module.js';
import * as SkeletonUtils  from '../libs/SkeletonUtils.js'; 
import { GLTFLoader } from '../libs/GLTFLoader.js';

export const behaviours = [];       
export const mixers      = [];
export const animalPool  = [];

// Torch Light: Context that every behaviour can read each frame
export const env = {
  playerPos: new Vector3(),
  torchDir:  new Vector3(),
  torchAngleCos: Math.cos(MathUtils.degToRad(15)),   // 30° cone
  torchRange: 80
};

const template   = (await new GLTFLoader().loadAsync('./models/animals/Clown_fish.glb'));
const animations = template.animations;                                // keep a handle


export function updateAnimals(dt, camera, torch) {
  // update dynamic context
  env.playerPos.copy(camera.position);
  env.torchDir.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
  behaviours.forEach((fn) => fn(dt, env));
  mixers.forEach((m) => m.update(dt));
}


export async function initAnimals(scene, THREE, GLTFLoader) {
    const fishGLB = await new GLTFLoader().loadAsync('./models/animals/Clown_fish.glb');
  
    const FISH_COUNT = 20;
    for (let i = 0; i < FISH_COUNT; i++) {
      // 1. real clone – duplicates the skeleton, geometry & materials
      const fish = SkeletonUtils.clone( template.scene );                  
      fish.scale.setScalar( 3 );
      fish.position.set(
        MathUtils.randFloatSpread( 200 ),
        MathUtils.randFloat( 2, 40 ),
        MathUtils.randFloatSpread( 200 )
      );
      scene.add( fish );
      animalPool.push( fish );
    
      // Animation
      const mixer = new THREE.AnimationMixer( fish );
      mixer.clipAction( animations[0], fish ).play();                      // ← bind root
      mixers.push( mixer );
  
      // Very simple wander behaviour
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        THREE.MathUtils.randFloat(-0.05, 0.05),   // slight up/down
        Math.random() - 0.5
      ).normalize();
      behaviours.push((dt) => {
        fish.position.addScaledVector(dir, dt * 10);   // 10 = speed
        fish.lookAt(fish.position.clone().add(dir));   // face movement
        wrap(fish.position);                           // teleport back if out of bounds
      });
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
