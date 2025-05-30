// placeStaticModels.js
import { GLTFLoader } from '../libs/GLTFLoader.js';

export function placeStaticModels(size, scene, getTerrainHeight, THREE) {
  const loader      = new GLTFLoader();
  const area        = 200;
  const sampleStep  = 1;

  // Rock materials matching terrain hues
  const rockMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x2c4d4d }),
    new THREE.MeshStandardMaterial({ color: 0x335555 }),
    new THREE.MeshStandardMaterial({ color: 0x3a6666 }),
    new THREE.MeshStandardMaterial({ color: 0x294848 })
  ];

  // your original model configs
  const modelConfigs = [
    { model: 'Clam.glb',     scale: 3,  yOffset: 0.4, category: 'plants', range: [0.8,1.2], count: 10 },
    { model: 'Coral1.glb',   scale: 1,  yOffset:-0.7, category: 'plants', range: [0.8,1.2] },
    { model: 'Coral2.glb',   scale: 3,  yOffset: 1.1, category: 'plants', range: [0.8,1.2] },
    { model: 'Coral3.glb',   scale: 6,  yOffset: 0.7, category: 'plants', range: [0.8,1.2] },
    { model: 'Coral4.glb',   scale: 3,  yOffset: 2.0, category: 'plants', range: [0.8,1.2] },
    { model: 'Seaweed1.glb', scale: 3,  yOffset: 1.0, category: 'plants', range: [1.0,2.0] },
    { model: 'Seaweed2.glb', scale: 5,  yOffset: 4.5, category: 'plants', range: [1.0,2.0] },
    { model: 'Seaweed3.glb', scale: 5,  yOffset: 1.1, category: 'plants', range: [1.0,2.0] },
    { model: 'Seaweed4.glb', scale: 5,  yOffset: 1.3, category: 'plants', range: [1.0,2.0] },
    { model: 'Rock1.glb',    scale: 3,  yOffset:-0.1, category: 'rock',   range: [0.5,1.5], count: 40 },
    { model: 'Rock2.glb',    scale: 1,  yOffset: 0.1, category: 'rock',   range: [0.5,1.5], count: 40 },
    { model: 'Rock3.glb',    scale: 1,  yOffset:-0.3, category: 'rock',   range: [0.5,1.5], count: 40 },
    { model: 'Rock4.glb',    scale: 1,  yOffset: 0.1, category: 'rock',   range: [0.5,1.5], count: 40 },
    { model: 'Rock5.glb',    scale: 2,  yOffset:-0.3, category: 'rock',   range: [0.5,1.5], count: 40 },
    { model: 'Rock6.glb',    scale: 0.3,yOffset:-0.4, category: 'rock',   range: [0.5,1.5], count: 40 },
    { model: 'Rock7.glb',    scale: 0.5,yOffset:-0.5, category: 'rock',   range: [0.5,1.5], count: 40 },
    { model: 'Rock8.glb',    scale: 0.5,yOffset:-0.5, category: 'rock',   range: [0.5,1.5], count: 40 }
  ];

  // detection parameters (you can tweak these)
  const ruinRadius    = 20;   // search flat circle radius for Ruin
  const shipRadius    = 30;   // for Ship
  const maxDelta      = 5;    // max height difference inside circle
  const scanStep      = 20;   // grid step for candidate centers
  const interiorStep  = 10;   // interior sampling spacing
  const minSeparation = 150;  // minimum distance between the two centers

  const halfRange = size / 2;

  // check if terrain is flat enough in a circle
  function isFlatArea(cx, cz, radius) {
    const centerH = getTerrainHeight(cx, cz);

    // boundary sampling every 30°
    for (let a = 0; a < 360; a += 30) {
      const rad = a * Math.PI / 180;
      const sx  = cx + Math.cos(rad) * radius;
      const sz  = cz + Math.sin(rad) * radius;
      if (Math.abs(getTerrainHeight(sx, sz) - centerH) > maxDelta) {
        return false;
      }
    }

    // interior grid sampling
    for (let dx = -radius; dx <= radius; dx += interiorStep) {
      for (let dz = -radius; dz <= radius; dz += interiorStep) {
        if (dx*dx + dz*dz > radius*radius) continue;
        if (Math.abs(getTerrainHeight(cx + dx, cz + dz) - centerH) > maxDelta) {
          return false;
        }
      }
    }

    return true;
  }

  // find a flat center of given radius, excluding areas around 'exclude'
  function findFlatCenter(radius, exclude = []) {
    const maxRadius = halfRange - radius;  // max distance from origin
    // for each concentric ring at distance d from origin
    for (let d = 0; d <= maxRadius; d += scanStep) {
      // sample points around the ring every 30°
      for (let a = 0; a < 360; a += 30) {
        const rad = a * Math.PI / 180;
        const cx  = Math.cos(rad) * d;
        const cz  = Math.sin(rad) * d;
        // skip if too close to origin
        if (d < radius) continue;
        // skip if overlaps any excluded circle
        if (exclude.some(e => Math.hypot(cx - e.x, cz - e.z) < e.radius + radius)) continue;
        // test flatness
        if (isFlatArea(cx, cz, radius)) {
          return { x: cx, z: cz };
        }
      }
    }
    // fallback
    return { x: radius, z: radius };
  }


  // 1) locate Ruin center
  const ruinCenter = findFlatCenter(ruinRadius);

  // 2) locate Ship center, excluding area around Ruin and enforcing minSeparation
  const shipCenter = findFlatCenter(shipRadius, [
    { x: ruinCenter.x, z: ruinCenter.z, radius: Math.max(ruinRadius, minSeparation - shipRadius) }
  ]);

  // place Ruin (scale doubled, yOffset doubled)
  loader.load('./models/building/Ruin.glb', gltf => {
    const o = gltf.scene.clone();
    o.scale.setScalar(20);
    o.position.set(
      ruinCenter.x,
      getTerrainHeight(ruinCenter.x, ruinCenter.z) + 8,
      ruinCenter.z
    );
    scene.add(o);
  });

  // place Ship
  loader.load('./models/building/Ship.glb', gltf => {
    const o = gltf.scene.clone();
    o.scale.setScalar(2);
    o.position.set(
      shipCenter.x,
      getTerrainHeight(shipCenter.x, shipCenter.z),
      shipCenter.z
    );
    scene.add(o);
  });

  // helper: skip placement inside a patch
  function inPatch(x, z, center, r) {
    return Math.hypot(x - center.x, z - center.z) < r;
  }

  // rest of your original placement logic,
  // but skip any (x,z) inside ruinRadius around ruinCenter
  // or inside shipRadius around shipCenter:

  // === Plant clusters ===
  const plantModels = modelConfigs.filter(cfg => cfg.category === 'plants' && !cfg.model.includes('Clam'));
  const clusterCount = size * 0.4;          // increased number of clusters
  const minClusterDist = 20;        // min distance between cluster centers
  const minMemberDist = 2.0;        // min distance between members

  plantModels.forEach(config => {
    const centers = [];
    for (let c = 0; c < clusterCount; c++) {
      let centerX, centerZ, attempts = 0;
      do {
        centerX = (Math.random() * 2 - 1) * area;
        centerZ = (Math.random() * 2 - 1) * area;
        attempts++;
      } while (
        attempts < 10 &&
        centers.some(pt => ((pt.x - centerX) ** 2 + (pt.z - centerZ) ** 2) < minClusterDist * minClusterDist)
      );
      // skip patch areas
      if (inPatch(centerX, centerZ, ruinCenter, ruinRadius) ||
          inPatch(centerX, centerZ, shipCenter, shipRadius)) {
        continue;
      }
      centers.push({ x: centerX, z: centerZ });

      const baseAngle = Math.random() * Math.PI * 2;
      const groupSize = Math.floor(Math.random() * 6) + 5;
      const members = [];

      for (let i = 0; i < groupSize; i++) {
        let x, z, mAttempts = 0;
        do {
          x = centerX + (Math.random() - 0.5) * 8;
          z = centerZ + (Math.random() - 0.5) * 8;
          mAttempts++;
        } while (
          mAttempts < 10 &&
          members.some(pt => ((pt.x - x) ** 2 + (pt.z - z) ** 2) < minMemberDist * minMemberDist)
        );
        // skip patch areas
        if (inPatch(x, z, ruinCenter, ruinRadius) ||
            inPatch(x, z, shipCenter, shipRadius)) {
          continue;
        }
        members.push({ x, z });

        const y     = getTerrainHeight(x, z);
        const slope = computeSlope(x, z);

        const isSeaweed = config.model.includes('Seaweed');
        const isCoral   = config.model.includes('Coral');

        if ((isSeaweed && y < 10 && slope < 0.4) ||
            (isCoral   && y < 25 && slope < 0.6)) {
          const factor = Math.random() * (config.range[1] - config.range[0]) + config.range[0];
          loader.load(`./models/${config.category}/${config.model}`, gltf => {
            const obj = gltf.scene.clone();
            obj.scale.setScalar(config.scale * factor);
            obj.position.set(x, y + config.yOffset * factor, z);
            obj.rotation.y = baseAngle + (Math.random() - 0.5) * 0.3;
            scene.add(obj);
          });
        }
      }
    }
  });

  // === Clam & Rock scatter ===
  const scatterModels = modelConfigs.filter(cfg =>
    (cfg.category === 'plants' && cfg.model.includes('Clam')) || cfg.category === 'rock'
  );

  scatterModels.forEach(config => {
    for (let i = 0; i < (config.count || 1); i++) {
      const x = (Math.random() * 2 - 1) * area;
      const z = (Math.random() * 2 - 1) * area;
      // skip patch areas
      if (inPatch(x, z, ruinCenter, ruinRadius) ||
          inPatch(x, z, shipCenter, shipRadius)) {
        continue;
      }

      const y     = getTerrainHeight(x, z);
      const slope = computeSlope(x, z);

      const isClam = config.model.includes('Clam');
      const isRock = config.category === 'rock';

      if ((isClam && y < 20 && slope < 0.4) ||
          (isRock && y < 10)) {
        const factor = Math.random() * (config.range[1] - config.range[0]) + config.range[0];
        loader.load(`./models/${config.category}/${config.model}`, gltf => {
          const obj = gltf.scene.clone();
          if (isRock) {
            obj.traverse(child => {
              if (child.isMesh) {
                child.material = rockMaterials[Math.floor(Math.random() * rockMaterials.length)];
              }
            });
          }
          obj.scale.setScalar(config.scale * factor);
          obj.position.set(x, y + config.yOffset * factor, z);
          obj.rotation.y = Math.random() * Math.PI * 2;
          scene.add(obj);
        });
      }
    }
  });

  // helper to compute local slope
  function computeSlope(x, z) {
    const h  = getTerrainHeight(x, z);
    const dx = Math.abs(getTerrainHeight(x + sampleStep, z) - h);
    const dz = Math.abs(getTerrainHeight(x, z + sampleStep) - h);
    return Math.max(dx, dz);
  }
}
