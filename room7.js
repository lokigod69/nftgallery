import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getRoom7ArtUrl } from './src/core/asset-utils.js';

// ═══════════════════════════════════════════════════════════════════════
// Room 7: "Helix Crossing" - NFT Platform Jumping Challenge
// ═══════════════════════════════════════════════════════════════════════
/**
 * CONCEPT: Two intertwined helix paths of NFT platforms
 * - Player must jump from platform to platform
 * - Each platform displays an NFT artwork
 * - Fall to floor = respawn at start
 * - Navigate from spawn to portal
 */

// Room 7 Master Configuration
const ROOM7_CONFIG = {
  // Room dimensions - ORIGINAL large room
  roomSize: 100,             // Original large square room
  roomLength: 80,            // Path length (Z-axis)

  // Platform settings
  platformSize: 4.0,         // NFT platform size (slightly larger for easier landing)
  platformHeight: 2.0,       // Height above floor
  platformThickness: 0.5,    // Platform depth
  spawnPlatformSize: 5.0,    // Larger spawn platform
  endPlatformSize: 5.0,      // Larger end platform

  // Zigzag path parameters - jumpable alternating pattern
  zigzagAmplitude: 8,        // Max horizontal distance from center (reduced for jumpability)
  platformSpacingZ: 4.5,     // Z distance between platforms (closer together)

  // Player physics
  eyeHeight: 2.0,            // Original eye height
  speed: 80.0,
  gravity: -30,
  jumpVelocity: 14,          // Increased for longer jumps

  // Spawn and portal positions
  spawnZ: -40,               // Start position (negative Z)
  portalZ: 40,               // End position (positive Z)

  // Floor (danger zone)
  floorY: 0,
  respawnOnFloorTouch: true
};

const eyeHeight = ROOM7_CONFIG.eyeHeight;
const speed = ROOM7_CONFIG.speed;
const gravity = ROOM7_CONFIG.gravity;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let isFalling = false;
let jumpVelocity = 0;
let fallVelocity = 0;
let currentPlatform = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);  // Original black background

// Spawn position: on spawn platform
const spawnY = ROOM7_CONFIG.platformHeight + ROOM7_CONFIG.platformThickness / 2 + eyeHeight;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, spawnY, ROOM7_CONFIG.spawnZ);
camera.rotation.y = Math.PI;  // Face forward (toward +Z where the platforms and portal are)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
});

controls.addEventListener('lock', () => {
  const overlay = document.getElementById('controls-description');
  if (overlay) overlay.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  const overlay = document.getElementById('controls-description');
  if (overlay) overlay.style.display = 'block';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Original lighting setup
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);

// Scatter warm spotlights around the scene for better illumination (original)
const floorSize = ROOM7_CONFIG.roomSize;
for (let i = 0; i < 20; i++) {
  const spot = new THREE.SpotLight(0xffaa88, 0.5, 50, Math.PI / 6, 0.5);
  spot.position.set(
    (Math.random() - 0.5) * 40,
    Math.random() * 10 + 5,
    (Math.random() - 0.5) * 40
  );
  spot.target.position.set(0, 0, -i * 2);
  scene.add(spot);
  scene.add(spot.target);
}

// Original reflective black floor
const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.8, roughness: 0.2 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Raised starry ceiling - higher and more spread out
const starGeo = new THREE.BufferGeometry();
const starVerts = [];
for (let i = 0; i < 1500; i++) {
  const x = Math.random() * 120 - 60;       // Wider spread
  const y = Math.random() * 40 + 25;        // Much higher: 25-65 (was 10-30)
  const z = Math.random() * 120 - 60;       // Wider spread
  starVerts.push(x, y, z);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 });  // Slightly smaller
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// ═══════════════════════════════════════════════════════════════════════
// Wall Ambient Lighting - Visible glowing orbs around perimeter
// ═══════════════════════════════════════════════════════════════════════

const wallLights = [];
const wallOffset = 45;  // Near the edges of the 100-unit room

// Glowing orb material - visible emissive spheres
const orbMaterial = new THREE.MeshBasicMaterial({
  color: 0x6688bb,
  transparent: true,
  opacity: 0.8
});

const orbGeometry = new THREE.SphereGeometry(0.8, 16, 16);

/**
 * Create a visible glowing light orb with point light
 */
function createWallOrb(x, y, z, intensity = 1.5, color = 0x4466aa) {
  const group = new THREE.Group();

  // Visible glowing sphere
  const orb = new THREE.Mesh(orbGeometry, orbMaterial.clone());
  orb.material.color.setHex(color);
  group.add(orb);

  // Inner brighter core
  const coreGeo = new THREE.SphereGeometry(0.4, 12, 12);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xaaccff });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Point light for actual illumination
  const light = new THREE.PointLight(color, intensity, 50);
  group.add(light);

  group.position.set(x, y, z);
  scene.add(group);
  wallLights.push(group);

  return group;
}

// Corner orbs (4 corners, 2 heights each)
const cornerPositions = [
  { x: -wallOffset, z: -wallOffset },
  { x: wallOffset, z: -wallOffset },
  { x: -wallOffset, z: wallOffset },
  { x: wallOffset, z: wallOffset }
];

cornerPositions.forEach(pos => {
  // Lower corner orb
  createWallOrb(pos.x, 6, pos.z, 1.5, 0x4466aa);
  // Upper corner orb
  createWallOrb(pos.x, 18, pos.z, 1.0, 0x3355aa);
});

// Mid-wall orbs (along the 4 edges)
const midWallPositions = [
  { x: 0, z: -wallOffset },   // Back wall center
  { x: 0, z: wallOffset },    // Front wall center
  { x: -wallOffset, z: 0 },   // Left wall center
  { x: wallOffset, z: 0 }     // Right wall center
];

midWallPositions.forEach(pos => {
  createWallOrb(pos.x, 10, pos.z, 1.2, 0x5577bb);
});

console.log(`✓ Added ${wallLights.length} visible wall light orbs`);

// ═══════════════════════════════════════════════════════════════════════
// Zigzag Path Generation - Jumpable alternating pattern
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate zigzag path positions
 * Creates a single path that alternates left-center-right in a jumpable pattern
 * Pattern: center → left → right → center → left → right...
 * Each platform is reachable from the previous one
 */
function generateZigzagPath() {
  const cfg = ROOM7_CONFIG;
  const positions = [];

  const startZ = cfg.spawnZ + 5;  // First platform after spawn
  const endZ = cfg.portalZ - 5;   // Last platform before end
  const pathLength = endZ - startZ;

  // Calculate number of platforms based on Z spacing
  const numPlatforms = Math.floor(pathLength / cfg.platformSpacingZ);

  // Zigzag pattern positions (X offsets)
  // Pattern repeats: center(0) → left(-amp) → right(+amp) → center(0) → left(-amp) → right(+amp)
  // This creates a weaving path that's always jumpable
  const amp = cfg.zigzagAmplitude;

  for (let i = 0; i < numPlatforms; i++) {
    const z = startZ + i * cfg.platformSpacingZ;

    // Create zigzag pattern with 6-step cycle for visual variety
    // 0: center, 1: left, 2: center-right, 3: right, 4: center-left, 5: left-center
    const patternIndex = i % 6;
    let x;

    switch (patternIndex) {
      case 0: x = 0; break;                    // Center
      case 1: x = -amp * 0.7; break;           // Left
      case 2: x = amp * 0.4; break;            // Slight right
      case 3: x = amp; break;                  // Full right
      case 4: x = amp * 0.3; break;            // Slight right (coming back)
      case 5: x = -amp * 0.5; break;           // Half left
    }

    positions.push({ x: x, z: z, index: i });
  }

  console.log(`Generated ${positions.length} platform positions in zigzag pattern`);
  return positions;
}

// ═══════════════════════════════════════════════════════════════════════
// Platform Creation System
// ═══════════════════════════════════════════════════════════════════════

const platforms = [];  // All platforms for collision detection
const loader = new THREE.TextureLoader();

/**
 * Create a single NFT platform
 */
function createPlatform(x, y, z, size, textureUrl, isSpecial = false) {
  const cfg = ROOM7_CONFIG;
  const group = new THREE.Group();

  // Platform base (box)
  const baseGeo = new THREE.BoxGeometry(size, cfg.platformThickness, size);

  // Platform edge material - black borders
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: isSpecial ? 0x4488ff : 0x000000,
    emissive: isSpecial ? 0x2244aa : 0x000000,
    emissiveIntensity: 0.5,
    metalness: 0.7,
    roughness: 0.3
  });

  const base = new THREE.Mesh(baseGeo, edgeMaterial);
  base.position.y = -cfg.platformThickness / 2;
  group.add(base);

  // NFT texture on top
  if (textureUrl) {
    const texture = loader.load(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const topMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false
    });

    const topGeo = new THREE.PlaneGeometry(size * 0.9, size * 0.9);
    const top = new THREE.Mesh(topGeo, topMaterial);
    top.rotation.x = -Math.PI / 2;
    top.rotation.z = Math.PI;  // Rotate 180 degrees to flip image
    top.position.y = 0.01;  // Slightly above base
    group.add(top);
  }

  // Point light under each platform for subtle glow effect
  const light = new THREE.PointLight(isSpecial ? 0x4488ff : 0x222222, 0.3, 6);
  light.position.y = -1;
  group.add(light);

  // Position the platform
  group.position.set(x, y, z);

  // Store collision data
  group.userData = {
    isPlatform: true,
    size: size,
    isSpecial: isSpecial
  };

  scene.add(group);
  platforms.push(group);

  return group;
}

/**
 * Create spawn platform (larger, at start)
 */
function createSpawnPlatform() {
  const cfg = ROOM7_CONFIG;
  const y = cfg.platformHeight;
  return createPlatform(0, y, cfg.spawnZ, cfg.spawnPlatformSize, null, true);
}

/**
 * Create end platform (larger, near portal)
 */
function createEndPlatform() {
  const cfg = ROOM7_CONFIG;
  const y = cfg.platformHeight;
  return createPlatform(0, y, cfg.portalZ, cfg.endPlatformSize, null, true);
}

/**
 * Create all NFT platforms along zigzag path
 */
function createZigzagPlatforms(positions, imageFiles) {
  const cfg = ROOM7_CONFIG;
  const y = cfg.platformHeight;

  positions.forEach((pos, i) => {
    // Cycle through available images
    const imageIndex = i % imageFiles.length;
    const textureUrl = getRoom7ArtUrl(imageFiles[imageIndex]);

    createPlatform(pos.x, y, pos.z, cfg.platformSize, textureUrl, false);
  });

  console.log(`Created ${positions.length} NFT platforms in zigzag pattern`);
}

// Images from /assets/Room7
const imageFiles = [
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__461d3cd1-91d2-4213-90e0-567676b9955d",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__466af283-1d72-466f-bfc1-54e1ee6876c2",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__68b3628b-b6ef-4896-9549-2c5d8a1bd7af",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__7b1a8021-543c-4df1-b042-ca0b831b8958",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__88a763cc-6ccc-4e13-9be3-8f08d461424c",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__bf83db25-9c43-483a-89c7-d2f8c19f5f0b",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__e054a1e9-c25f-42b7-999d-8f70985bd4c5",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_4512005b-b6b4-48bf-8a1c-3739d9c4a119",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_59be43ce-bd6e-4cc3-8450-716fc35dac80",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_85b12a18-2947-48ad-a5af-1d6b33ce774f",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_8759e405-ef7f-4d8a-a442-f66f99e25ecb",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_9482ebf3-7396-4e99-aa02-80ca057b13fa",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_9b619bf6-3921-4ddc-be34-e52b7357be11",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_b0af6fe2-75ea-4db4-8347-e68fb96a8271",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_00f3edec-48a9-4008-9395-b38b6be4d41a",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_14dd4c67-a62e-4129-90fb-30f9190f70f6",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_15eacfaf-36fc-4130-9b7b-bd6077059bb8",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_2929b4b0-7f22-4bfd-b078-bbe50a80d68d",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_2d4349d0-29e3-478b-bcd4-27c7ea85ebc0",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_2ee2d461-2cfa-41f2-8ca9-a9822a0b0a9c",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_33b7a50b-ef28-440e-9e78-a0162a004cbd",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_4bc3ba0e-ee5f-4585-9c69-39006f26ecb0",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_64ee1a46-0467-42fb-9c06-9d5808ed5939",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_7384f469-b030-4a0e-b097-44ba9ee5d4a1",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_7c0d1f36-6efa-482f-8c07-36c9ac51c43f",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_82754cdd-ac8a-4f79-95e1-9dc78238a7bf",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_8705c6aa-ccba-46cb-898e-666f778f7ce4",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_a2a34144-0654-40ab-b56e-511fe17495fe",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_a68832b9-b616-422a-84f5-ce7a3b3e29f9",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_bb3fc202-10a4-4ce9-a1a3-ac78b6be7cc5",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_bf44c9a4-d34b-4fab-b098-823809e660e9",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_ce313a50-bf83-4bdc-8fc2-dc65101c5b35",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_d89a1885-b7ca-41da-8d28-2ca3f3c58d93",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_f76ec122-ce7b-456a-863b-ffd6eb7fcf97",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_fa2abe36-bf87-489f-ad93-315bdf686727.png"
];

// ═══════════════════════════════════════════════════════════════════════
// Create Platforms
// ═══════════════════════════════════════════════════════════════════════

// Create spawn and end platforms
const spawnPlatform = createSpawnPlatform();
const endPlatform = createEndPlatform();

// Generate zigzag path and create NFT platforms
const zigzagPositions = generateZigzagPath();
createZigzagPlatforms(zigzagPositions, imageFiles);

console.log(`✓ Room 7 initialized: ${platforms.length} total platforms (zigzag path)`);

// ═══════════════════════════════════════════════════════════════════════
// Platform Collision Detection
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if player is standing on any platform
 */
function detectPlatformCollision(playerPos) {
  const cfg = ROOM7_CONFIG;
  const feetY = playerPos.y - cfg.eyeHeight;

  for (const platform of platforms) {
    const platformTop = platform.position.y + cfg.platformThickness / 2;
    const platformSize = platform.userData.size;
    const halfSize = platformSize / 2;

    // Horizontal bounds check (square platform)
    const dx = Math.abs(playerPos.x - platform.position.x);
    const dz = Math.abs(playerPos.z - platform.position.z);
    const onPlatformXZ = dx <= halfSize + 0.3 && dz <= halfSize + 0.3;

    // Vertical check - feet near platform top
    const vertDist = Math.abs(feetY - platformTop);
    const nearPlatformY = vertDist < 1.5;

    if (onPlatformXZ && nearPlatformY) {
      return platform;
    }
  }

  return null;
}

/**
 * Check if player has fallen to floor (danger zone)
 */
function hasFallenToFloor(playerPos) {
  const cfg = ROOM7_CONFIG;
  const feetY = playerPos.y - cfg.eyeHeight;
  return feetY <= cfg.floorY + 0.5;
}

/**
 * Respawn player at spawn platform
 */
function respawnPlayer() {
  camera.position.set(0, spawnY, ROOM7_CONFIG.spawnZ);
  isJumping = false;
  isFalling = false;
  jumpVelocity = 0;
  fallVelocity = 0;
  currentPlatform = spawnPlatform;
  console.log('Respawned at spawn platform');
}

function onKeyDown(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (!isJumping && !isFalling) {
        jumpVelocity = ROOM7_CONFIG.jumpVelocity;
        isJumping = true;
      }
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Portal to Room 8 - positioned on end platform
const portalY = ROOM7_CONFIG.platformHeight + ROOM7_CONFIG.platformThickness / 2 + eyeHeight;
const portalObj = createLinkedPortal({
  scene,
  fromRoom: '7',
  toRoom: '8',
  x: 0,
  y: portalY,
  z: ROOM7_CONFIG.portalZ,
  rotationY: 0,
  createLabel: true
});

const portalToRoom8 = portalObj.portal;
const portalGlow = portalObj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: [
    {
      position: new THREE.Vector3(0, portalY, ROOM7_CONFIG.portalZ),
      name: 'The Ascent (Room 8)',
      url: 'room8.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    }
  ],
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const cfg = ROOM7_CONFIG;

  if (controls.isLocked) {
    const onPlatform = detectPlatformCollision(camera.position);

    // ─────────────────────────────────────────────────────────────────
    // Vertical Physics (Jumping, Falling, Platform Landing)
    // ─────────────────────────────────────────────────────────────────

    if (isJumping) {
      // Apply jump velocity
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;

      // Check if landed on platform
      if (onPlatform && jumpVelocity <= 0) {
        const platformTop = onPlatform.position.y + cfg.platformThickness / 2;
        const feetY = camera.position.y - cfg.eyeHeight;
        if (feetY <= platformTop + 0.5) {
          camera.position.y = platformTop + cfg.eyeHeight;
          isJumping = false;
          jumpVelocity = 0;
          currentPlatform = onPlatform;
        }
      }

      // Check if fallen to floor (respawn)
      if (hasFallenToFloor(camera.position)) {
        respawnPlayer();
      }

    } else if (isFalling) {
      // Apply fall velocity
      camera.position.y += fallVelocity * delta;
      fallVelocity += gravity * delta * 0.8;

      // Check if landed on platform
      if (onPlatform) {
        const platformTop = onPlatform.position.y + cfg.platformThickness / 2;
        camera.position.y = platformTop + cfg.eyeHeight;
        isFalling = false;
        fallVelocity = 0;
        currentPlatform = onPlatform;
      }

      // Check if fallen to floor (respawn)
      if (hasFallenToFloor(camera.position)) {
        respawnPlayer();
      }

    } else {
      // Not jumping or falling - standing state
      if (onPlatform) {
        // Standing on platform - keep aligned
        const platformTop = onPlatform.position.y + cfg.platformThickness / 2;
        camera.position.y = platformTop + cfg.eyeHeight;
        currentPlatform = onPlatform;
      } else {
        // Not on any platform - start falling
        isFalling = true;
        fallVelocity = 0;
        currentPlatform = null;
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // Horizontal Movement
    // ─────────────────────────────────────────────────────────────────

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Room boundary clamping
    const limit = cfg.roomSize / 2 - 1;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
  }

  // ─────────────────────────────────────────────────────────────────
  // Portal & Rendering
  // ─────────────────────────────────────────────────────────────────

  checkPortalProximity();
  animateLinkedPortal(portalToRoom8, portalGlow);

  renderer.render(scene, camera);
}

animate();

// Loading overlay management
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    setTimeout(() => {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }, 500);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }
  }
});
