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
  spawnPlatformSize: 6.0,    // Larger spawn platform
  endPlatformSize: 10.0,     // Much larger end platform

  // Zigzag path parameters - jumpable alternating pattern
  zigzagAmplitude: 8,        // Max horizontal distance from center (reduced for jumpability)
  platformSpacingZ: 4.5,     // Z distance between platforms (closer together)

  // Player physics
  eyeHeight: 2.0,            // Original eye height
  speed: 80.0,
  gravity: -30,
  jumpVelocity: 14,          // Increased for longer jumps

  // Spawn and portal positions
  spawnZ: -45,               // Start position (negative Z)
  portalZ: 48,               // End position - near room edge

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

// Subtle ambient fill lighting (reduced to prevent harsh reflections)
const floorSize = ROOM7_CONFIG.roomSize;

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
// Scattered Color Tiles - Random mosaic on all walls
// ═══════════════════════════════════════════════════════════════════════

// Extended color palette from the artwork
const tileColors = [
  // Warm skin tones
  0xffccaa, 0xffddbb, 0xeebb99, 0xddaa88, 0xcc9977,
  // Coral/peach
  0xff9966, 0xff8855, 0xffaa77, 0xffbb88,
  // Pink accents
  0xff6699, 0xff7799, 0xee5588, 0xff88aa,
  // Teal/cyan
  0x66cccc, 0x55bbbb, 0x77dddd, 0x44aaaa,
  // Blue accents
  0x99ccff, 0x88bbee, 0x77aadd, 0x6699cc,
  // Purple/lavender
  0xcc99ff, 0xbb88ee, 0xaa77dd, 0x9966cc,
  // Orange/warm
  0xffaa55, 0xff9944, 0xee8833, 0xdd7722,
  // Cream/white
  0xffeecc, 0xffeedd, 0xffffee, 0xfff8e0
];

const wallTiles = [];
const wallOffset = 49;
let tileDepthCounter = 0;  // Unique depth for each tile to prevent Z-fighting

/**
 * Create a small color tile on a wall
 * Each tile gets a unique depth offset to prevent Z-fighting flicker
 */
function createWallTile(x, y, z, rotationY, color, opacity, size, hasGlow) {
  const tileGeo = new THREE.PlaneGeometry(size, size * 0.4);  // Horizontal rectangle
  const tileMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.FrontSide,  // Only render front face
    depthWrite: true,       // Write to depth buffer
    polygonOffset: true,    // Enable polygon offset to prevent Z-fighting
    polygonOffsetFactor: -1 - tileDepthCounter * 0.1,  // Unique offset per tile
    polygonOffsetUnits: -1
  });

  // Calculate depth offset - each tile slightly in front of previous
  const depthOffset = tileDepthCounter * 0.02;  // Small unique offset
  tileDepthCounter++;

  const tile = new THREE.Mesh(tileGeo, tileMat);

  // Apply position with depth offset perpendicular to wall
  let finalX = x, finalZ = z;
  if (rotationY === 0) {
    finalZ = z + depthOffset;  // Back wall - offset toward center
  } else if (rotationY === Math.PI) {
    finalZ = z - depthOffset;  // Front wall - offset toward center
  } else if (rotationY === Math.PI / 2) {
    finalX = x + depthOffset;  // Left wall - offset toward center
  } else {
    finalX = x - depthOffset;  // Right wall - offset toward center
  }

  tile.position.set(finalX, y, finalZ);
  tile.rotation.y = rotationY;
  tile.renderOrder = tileDepthCounter;  // Explicit render order
  scene.add(tile);
  wallTiles.push(tile);

  // Some tiles get a subtle glow light
  if (hasGlow) {
    const glowLight = new THREE.PointLight(color, 0.08, 15, 2);
    glowLight.position.set(
      finalX + (rotationY === 0 || rotationY === Math.PI ? 0 : (rotationY > 0 ? 1 : -1)),
      y,
      finalZ + (rotationY === 0 ? 1 : (rotationY === Math.PI ? -1 : 0))
    );
    scene.add(glowLight);
  }

  return tile;
}

/**
 * Scatter tiles on a wall with random variation
 */
function scatterTilesOnWall(wallType, count) {
  for (let i = 0; i < count; i++) {
    // Random position along the wall
    const spread = 85;  // How far tiles spread along wall
    const pos = (Math.random() - 0.5) * spread;
    const y = Math.random() * 12 + 2;  // Height 2-14

    // Random color from palette
    const color = tileColors[Math.floor(Math.random() * tileColors.length)];

    // Random opacity - mostly muted, some vibrant
    const opacityRoll = Math.random();
    let opacity;
    if (opacityRoll < 0.5) {
      opacity = 0.03 + Math.random() * 0.05;  // Very muted (0.03-0.08)
    } else if (opacityRoll < 0.85) {
      opacity = 0.08 + Math.random() * 0.08;  // Medium (0.08-0.16)
    } else {
      opacity = 0.18 + Math.random() * 0.12;  // Vibrant (0.18-0.30)
    }

    // Random size
    const size = 1.5 + Math.random() * 4;  // 1.5 to 5.5 units wide

    // Some tiles glow (the more vibrant ones)
    const hasGlow = opacity > 0.15 && Math.random() > 0.5;

    let x, z, rotationY;

    switch (wallType) {
      case 'back':  // Z = -wallOffset
        x = pos;
        z = -wallOffset;
        rotationY = 0;
        break;
      case 'front':  // Z = +wallOffset
        x = pos;
        z = wallOffset;
        rotationY = Math.PI;
        break;
      case 'left':  // X = -wallOffset
        x = -wallOffset;
        z = pos;
        rotationY = Math.PI / 2;
        break;
      case 'right':  // X = +wallOffset
        x = wallOffset;
        z = pos;
        rotationY = -Math.PI / 2;
        break;
    }

    createWallTile(x, y, z, rotationY, color, opacity, size, hasGlow);
  }
}

// Scatter tiles on all four walls
scatterTilesOnWall('back', 40);
scatterTilesOnWall('front', 40);
scatterTilesOnWall('left', 35);
scatterTilesOnWall('right', 35);

console.log(`✓ Added ${wallTiles.length} scattered color tiles on walls`);

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

  // Platform edge material - chrome black for special, matte black for regular
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: isSpecial ? 0x222222 : 0x000000,
    emissive: isSpecial ? 0x111111 : 0x000000,
    emissiveIntensity: 0.2,
    metalness: isSpecial ? 0.95 : 0.7,   // High metalness for chrome look
    roughness: isSpecial ? 0.1 : 0.3     // Low roughness for reflective chrome
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
  const light = new THREE.PointLight(isSpecial ? 0xffffff : 0x222222, 0.4, 8);
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
