import { ImprovedNoise } from '../libs/ImprovedNoise.js';

export function createTerrain(scene, THREE) {
  const size = 500;
  const segments = Math.floor(size * 0.4);
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const noise = new ImprovedNoise();
  const position = geometry.attributes.position;

  const lowFreq = 80;
  const highFreq = 5;
  const largeAmplitude = 80;
  const smallAmplitude = 3;

  const gridSize = segments + 1; // number of vertices per row
  const heightGrid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

  const halfSize = size / 2;
  const step = size / segments;

  for (let i = 0; i < position.count; i++) {
    const ix = i % gridSize;
    const iz = Math.floor(i / gridSize);

    const x = position.getX(i);
    const z = position.getZ(i);

    let y = 0;

    const baseNoise = noise.noise(x / lowFreq, z / lowFreq, 0);
    const peakFactor = noise.noise(x / 100, z / 100, 200);
    const variation = 0.5 + peakFactor * 2.0;

    y += baseNoise * variation * largeAmplitude;
    y += noise.noise(x / highFreq, z / highFreq, 0) * smallAmplitude;

    const dist2 = (x * 0.03) ** 2 + (z * 0.03) ** 2;
    y += 10 * Math.exp(-dist2);

    position.setY(i, y);
    heightGrid[iz][ix] = y;
  }

  geometry.computeVertexNormals();

  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x226666,
    flatShading: true,
  });

  const terrain = new THREE.Mesh(geometry, terrainMaterial);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // === Float position query with bilinear interpolation ===
  function getTerrainHeight(x, z) {
    const localX = x + halfSize;
    const localZ = z + halfSize;

    const fx = localX / step;
    const fz = localZ / step;

    const ix = Math.floor(fx);
    const iz = Math.floor(fz);

    if (
      ix < 0 || ix >= gridSize - 1 ||
      iz < 0 || iz >= gridSize - 1
    ) return 0;

    const tx = fx - ix;
    const tz = fz - iz;

    const h00 = heightGrid[iz][ix];
    const h10 = heightGrid[iz][ix + 1];
    const h01 = heightGrid[iz + 1][ix];
    const h11 = heightGrid[iz + 1][ix + 1];

    const hx0 = h00 * (1 - tx) + h10 * tx;
    const hx1 = h01 * (1 - tx) + h11 * tx;
    return hx0 * (1 - tz) + hx1 * tz;
  }

  return {
    mesh: terrain,
    getTerrainHeight
  };
}
