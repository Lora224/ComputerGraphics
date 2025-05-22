import { GLTFLoader } from '../libs/GLTFLoader.js';

export function placeStaticModels(size, scene, getTerrainHeight, THREE) {
  const loader = new GLTFLoader();
  const area = 200;
  const sampleStep = 1;

  // Rock materials matching terrain hues
  const rockMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x2c4d4d }),
    new THREE.MeshStandardMaterial({ color: 0x335555 }),
    new THREE.MeshStandardMaterial({ color: 0x3a6666 }),
    new THREE.MeshStandardMaterial({ color: 0x294848 })
  ];

  const modelConfigs = [
    { model: 'Clam.glb', scale: 3, yOffset: 0.4, category: 'plants', range: [0.8, 1.2], count: 10 },
    { model: 'Coral1.glb', scale: 1, yOffset: -0.7, category: 'plants', range: [0.8, 1.2] },
    { model: 'Coral2.glb', scale: 3, yOffset: 1.1, category: 'plants', range: [0.8, 1.2] },
    { model: 'Coral3.glb', scale: 6, yOffset: 0.7, category: 'plants', range: [0.8, 1.2] },
    { model: 'Coral4.glb', scale: 3, yOffset: 2.0, category: 'plants', range: [0.8, 1.2] },
    { model: 'Seaweed1.glb', scale: 3, yOffset: 1.0, category: 'plants', range: [1.0, 2.0] },
    { model: 'Seaweed2.glb', scale: 5, yOffset: 4.5, category: 'plants', range: [1.0, 2.0] },
    { model: 'Seaweed3.glb', scale: 5, yOffset: 1.1, category: 'plants', range: [1.0, 2.0] },
    { model: 'Seaweed4.glb', scale: 5, yOffset: 1.3, category: 'plants', range: [1.0, 2.0] },
    { model: 'Rock1.glb', scale: 3, yOffset: -0.1, category: 'rock', range: [0.5, 1.5], count: 40 },
    { model: 'Rock2.glb', scale: 1, yOffset: 0.1, category: 'rock', range: [0.5, 1.5], count: 40 },
    { model: 'Rock3.glb', scale: 1, yOffset: -0.3, category: 'rock', range: [0.5, 1.5], count: 40 },
    { model: 'Rock4.glb', scale: 1, yOffset: 0.1, category: 'rock', range: [0.5, 1.5], count: 40 },
    { model: 'Rock5.glb', scale: 2, yOffset: -0.3, category: 'rock', range: [0.5, 1.5], count: 40 },
    { model: 'Rock6.glb', scale: 0.3, yOffset: -0.4, category: 'rock', range: [0.5, 1.5], count: 40 },
    { model: 'Rock7.glb', scale: 0.5, yOffset: -0.5, category: 'rock', range: [0.5, 1.5], count: 40 },
    { model: 'Rock8.glb', scale: 0.5, yOffset: -0.5, category: 'rock', range: [0.5, 1.5], count: 40 }
  ];

  // === Plant clusters for Coral & Seaweed ===
  const plantModels = modelConfigs.filter(cfg => cfg.category === 'plants' && !cfg.model.includes('Clam'));
  const clusterCount = size * 0.1;          // increased number of clusters
  const minClusterDist = 20;        // min distance between cluster centers
  const minMemberDist = 2.0;        // min distance between members

  plantModels.forEach(config => {
    const centers = [];
    for (let c = 0; c < clusterCount; c++) {
      let centerX, centerZ;
      let attempts = 0;
      do {
        centerX = (Math.random() * 2 - 1) * area;
        centerZ = (Math.random() * 2 - 1) * area;
        attempts++;
      } while (attempts < 10 && centers.some(pt => ((pt.x - centerX) ** 2 + (pt.z - centerZ) ** 2) < minClusterDist * minClusterDist));
      centers.push({ x: centerX, z: centerZ });

      const baseAngle = Math.random() * Math.PI * 2;
      const groupSize = Math.floor(Math.random() * 6) + 5;  // 5~10 density
      const members = [];

      for (let i = 0; i < groupSize; i++) {
        let x, z;
        let mAttempts = 0;
        do {
          x = centerX + (Math.random() - 0.5) * 8;
          z = centerZ + (Math.random() - 0.5) * 8;
          mAttempts++;
        } while (mAttempts < 10 && members.some(pt => ((pt.x - x) ** 2 + (pt.z - z) ** 2) < minMemberDist * minMemberDist));
        members.push({ x, z });

        const y = getTerrainHeight(x, z);
        const slope = computeSlope(x, z);

        const isSeaweed = config.model.includes('Seaweed');
        const isCoral = config.model.includes('Coral');

        if ((isSeaweed && y < 10 && slope < 0.4) || (isCoral && y < 25 && slope < 0.6)) {
          const factor = randomInRange(config.range);
          loader.load(`./models/${config.category}/${config.model}`, gltf => {
            const obj = gltf.scene;
            obj.scale.setScalar(config.scale * factor);
            obj.position.set(x, y + config.yOffset * factor, z);
            obj.rotation.y = baseAngle + (Math.random() - 0.5) * 0.3;
            scene.add(obj);
          });
        }
      }
    }
  });

  // === Place Clam & Rock with updated altitude limit ===
  const scatterModels = modelConfigs.filter(cfg => (cfg.category === 'plants' && cfg.model.includes('Clam')) || cfg.category === 'rock');

  scatterModels.forEach(config => {
    for (let i = 0; i < config.count; i++) {
      const x = (Math.random() * 2 - 1) * area;
      const z = (Math.random() * 2 - 1) * area;
      const y = getTerrainHeight(x, z);
      const slope = computeSlope(x, z);

      const isClam = config.model.includes('Clam');
      const isRock = config.category === 'rock';

      if ((isClam && y < 20 && slope < 0.4) || (isRock && y < 10)) {
        const factor = randomInRange(config.range);
        loader.load(`./models/${config.category}/${config.model}`, gltf => {
          const obj = gltf.scene;
          obj.traverse(child => {
            if (child.isMesh && isRock) {
              const mat = rockMaterials[Math.floor(Math.random() * rockMaterials.length)];
              child.material = mat;
            }
          });
          obj.scale.setScalar(config.scale * factor);
          obj.position.set(x, y + config.yOffset * factor, z);
          obj.rotation.y = Math.random() * Math.PI * 2;
          scene.add(obj);
        });
      }
    }
  });

  function randomInRange([min, max]) {
    return Math.random() * (max - min) + min;
  }

  function computeSlope(x, z) {
    const h = getTerrainHeight(x, z);
    const dx = Math.abs(getTerrainHeight(x + sampleStep, z) - h);
    const dx2 = Math.abs(getTerrainHeight(x - sampleStep, z) - h);
    const dz = Math.abs(getTerrainHeight(x, z + sampleStep) - h);
    const dz2 = Math.abs(getTerrainHeight(x, z - sampleStep) - h);
    return Math.max(dx, dx2, dz, dz2);
  }
}