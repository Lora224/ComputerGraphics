export function setupLighting(scene, THREE) {
    // Ambient light - subtle blue to simulate underwater feel
    const ambientLight = new THREE.AmbientLight(0x223344, 0.4);
    scene.add(ambientLight);

    // Main directional light - simulating sunlight from above
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(30, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Fill light - gentle light from side to soften shadows
    const fillLight = new THREE.PointLight(0x88aaff, 0.5, 100);
    fillLight.position.set(-50, 30, -30);
    scene.add(fillLight);

    
}
