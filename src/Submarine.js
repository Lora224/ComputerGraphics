let submarine = null;
let flashlight = null;
let flashlightTarget = null;
let flashlightBeam = null;
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
                submarine.position.set(0, 20, 0);

                // Rotate submarine to face forward
                submarine.traverse((child) => {
                    if (child.isMesh) {
                        child.rotation.y = Math.PI;
                    }
                });

                // ✅ Flashlight (spotlight)
                flashlight = new THREE.SpotLight(0xffffff, 100, 700, Math.PI / 4, 1, 0.3);
                flashlight.castShadow = true;
                flashlight.position.set(0, 0, -2);  // near nose
                submarine.add(flashlight);

                // ✅ Target so spotlight points forward
                flashlightTarget = new THREE.Object3D();
                flashlightTarget.position.set(0, 0, -10);
                submarine.add(flashlightTarget);
                flashlight.target = flashlightTarget;

                // ✅ Volumetric flashlight beam (shader-based)
                const beamGeometry = new THREE.ConeGeometry(1.2, 20, 32, 1, true);
                const beamMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        color: { value: new THREE.Color(0x88ccff) },
                        opacity: { value: 0.001 }
                    },
                    vertexShader: `
                        varying float vIntensity;
                        void main() {
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            vIntensity = 1.0 - abs(position.y) / 10.0;
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 color;
                        uniform float opacity;
                        varying float vIntensity;
                        void main() {
                            gl_FragColor = vec4(color, vIntensity * opacity);
                        }
                    `,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    side: THREE.DoubleSide
                });

                flashlightBeam = new THREE.Mesh(beamGeometry, beamMaterial);
                flashlightBeam.rotation.x = Math.PI / 2;
                flashlightBeam.position.set(0, 0, -8);
                submarine.add(flashlightBeam);

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
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        keysPressed[key] = true;

        // ✅ Toggle flashlight & beam
        if (key === 'f' && flashlight) {
            flashlight.visible = !flashlight.visible;
            if (flashlightBeam) flashlightBeam.visible = flashlight.visible;
            console.log(`Flashlight ${flashlight.visible ? 'ON' : 'OFF'}`);
        }
    });

    window.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });
}

export function updateSubmarine(dt, camera, THREE) {
    if (!submarine) return;

    // Movement
    if (keysPressed['w']) submarine.translateZ(-submarineSpeed * dt);
    if (keysPressed['s']) submarine.translateZ(submarineSpeed * dt);
    if (keysPressed['a']) submarine.rotateY(turnSpeed * dt);
    if (keysPressed['d']) submarine.rotateY(-turnSpeed * dt);
    if (keysPressed['q']) submarine.translateY(submarineSpeed * dt);
    if (keysPressed['e']) submarine.translateY(-submarineSpeed * dt);

    // Camera follow
    const followDistance = 15;
const followHeight = 8;

const targetPosition = new THREE.Vector3();
submarine.getWorldPosition(targetPosition);

const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(submarine.quaternion);

const cameraPosition = targetPosition.clone()
    .add(forward.clone().multiplyScalar(-followDistance))
    .add(new THREE.Vector3(0, followHeight, 0));

camera.position.lerp(cameraPosition, 0.1);

// 👇 Look slightly below the submarine
const lookAtOffset = new THREE.Vector3(0, 6, 0);
camera.lookAt(targetPosition.clone().add(lookAtOffset));

}
