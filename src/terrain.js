export function createTerrain(scene, THREE) {
    const width = 400;
    const height = 400;
    const segments = 200;
  
    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    const position = geometry.attributes.position;
  
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z =
        Math.sin(x * 0.02) * Math.cos(y * 0.02) * 4 +
        Math.sin(x * 0.005) * Math.cos(y * 0.005) * 2;
      position.setZ(i, z);
    }
  
    geometry.computeVertexNormals();
  
    const material = new THREE.MeshLambertMaterial({
      color: 0x223344,
      side: THREE.DoubleSide,
      flatShading: true
    });
  
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
  
    return geometry;
  }
  