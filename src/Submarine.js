let submarine = null;
const keysPressed = {};

const submarineSpeed = 10;
const turnSpeed = Math.PI;

export async function loadSubmarine(scene, THREE, GLTFLoader) {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
        loader.load(
            '/models/submarine/submarine.glb',
            (gltf) => {
                submarine = gltf.scene;
                submarine.position.set(0, 5, 0);

                // ✅ Find the actual submarine mesh inside gltf.scene and rotate it
                submarine.traverse((child) => {
                    if (child.isMesh) {
                        child.rotation.y = Math.PI;  // Rotate the mesh itself
                    }
                });

                scene.add(submarine);
                resolve();
            },
            undefined,
            (error) => {
                console.error('Failed to load submarine model:', error);
                reject(error);
            }
        );
    });
}

export function getSubmarine() {
    return submarine;
}

export function setupSubmarineControls() {
    window.addEventListener('keydown', (e) => keysPressed[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keysPressed[e.key.toLowerCase()] = false);
}

export function updateSubmarine(dt, camera, THREE) {
    if (!submarine) return;

    if (keysPressed['w']) submarine.translateZ(-submarineSpeed * dt);
    if (keysPressed['s']) submarine.translateZ(submarineSpeed * dt);
    if (keysPressed['a']) submarine.rotateY(turnSpeed * dt);
    if (keysPressed['d']) submarine.rotateY(-turnSpeed * dt);
    if (keysPressed['q']) submarine.translateY(submarineSpeed * dt);
    if (keysPressed['e']) submarine.translateY(-submarineSpeed * dt);

    // Camera follow logic
    const followDistance = 15;
    const followHeight = 5;

    const targetPosition = new THREE.Vector3();
    submarine.getWorldPosition(targetPosition);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(submarine.quaternion);

    const cameraPosition = targetPosition.clone()
        .add(forward.clone().multiplyScalar(-followDistance))
        .add(new THREE.Vector3(0, followHeight, 0));

    camera.position.lerp(cameraPosition, 0.1);
    camera.lookAt(targetPosition);
}
