export function loadPlants(scene, THREE, GLTFLoader, terrainGeometry) {
    const plantFiles = {
      'Clam.glb': { scale: 5, heightOffset: 1 },
      'Coral1.glb': { scale: 2, heightOffset: 0 },
      'Coral2.glb': { scale: 5, heightOffset: 3 },
      'Coral3.glb': { scale: 10, heightOffset: 2 },
      'Coral4.glb': { scale: 5, heightOffset: 4 },
      'Seaweed1.glb': { scale: 5, heightOffset: 3 },
      'Seaweed2.glb': { scale: 1, heightOffset: -8 },
      'Seaweed3.glb': { scale: 5, heightOffset: 0 },
      'Seaweed4.glb': { scale: 5, heightOffset: 0 },
      'Seaweed5.glb': { scale: 5, heightOffset: 2 },
      'Seaweed6.glb': { scale: 5, heightOffset: 2 },
      'Seaweed7.glb': { scale: 5, heightOffset: 10 },
      'Seaweed8.glb': { scale: 5, heightOffset: 1.5 }
    };
  
    const terrainSize = terrainGeometry.parameters.width;
    const maxModels = 100;
  
    const entries = Object.entries(plantFiles);
  
    for (let i = 0; i < maxModels; i++) {
      const [file, config] = entries[Math.floor(Math.random() * entries.length)];
      const x = Math.random() * terrainSize - terrainSize / 2;
      const z = Math.random() * terrainSize - terrainSize / 2;
      const y = getHeightFromGeometry(terrainGeometry, x, z) + config.heightOffset;
  
      loadModel(`models/plants/${file}`, new THREE.Vector3(x, y, z), config.scale, scene, THREE, GLTFLoader);
    }
  }
  
  function loadModel(path, position, scale, scene, THREE, GLTFLoader) {
    const loader = new GLTFLoader();
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(scale);
        model.position.copy(position);
        scene.add(model);
      },
      undefined,
      (err) => {
        console.error(`Failed to load ${path}`, err);
      }
    );
  }
  
  function getHeightFromGeometry(geometry, x, z) {
    const posAttr = geometry.attributes.position;
    const width = geometry.parameters.width;
    const height = geometry.parameters.height;
    const segX = geometry.parameters.widthSegments;
    const segZ = geometry.parameters.heightSegments;
  
    const relX = (x + width / 2) / width;
    const relZ = (z + height / 2) / height;
    const gridX = Math.floor(relX * segX);
    const gridZ = Math.floor(relZ * segZ);
  
    const index = gridZ * (segX + 1) + gridX;
    return posAttr.getZ(index);
  }  
  