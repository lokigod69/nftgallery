import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';

// ----------------------------------------------------------------------
// Room 6: "Lava Corridor" - Platforming Challenge
// ----------------------------------------------------------------------

// ROOM 6 CURRENT STATE (inspection before lava rework)
// - Scene background: 0xffffff (WHITE) - causing bright atmosphere
// - Floor: y = -0.5, lava grid texture (dark base + red grid), positioned at z = -50 (corridor center)
// - Ceiling: y = 10, color 0x050507 (dark), has emissive bands
// - Spawn: (0, 2.5, -5) - near front wall (z=0)
// - Exit portal: (0, 2.5, -98) - near back wall (z=-100)
// - Tiles: 16 tiles, start z = -10, step z = +5.5
//   → First tile at z = -10
//   → Last tile at z = -10 + (15 * 5.5) = 72.5
//   → PROBLEM: Tiles go toward POSITIVE Z (away from portal at z=-98)
// - Tiles: Side material 0x111111, emissive 0x441111 (very dark), top 0x000000 (black)
//   → Tiles barely visible against dark floor
// - Death/reset logic: Present in animate() loop, uses isOnSafeTile() check
// - Movement: Uses controls.getObject().position (correct)

// Basic parameters
const corridorLength = 100;
const corridorWidth = 20;
const wallHeight = 10;
const eyeHeight = 2.5;
const gravity = -30;

// Lava & platform configuration
const ROOM6_CONFIG = {
  lavaFloorY: -0.5,                 // Y threshold for lava death
  safeHeightThreshold: -0.3,        // Player falls below this → death check
  respawnPosition: new THREE.Vector3(0, eyeHeight, -5), // Corridor start

  // Hex tile settings
  tileCount: 14,                    // 14 tiles to reach portal
  tileRadius: 1.3,
  tileHeight: 0.4,
  tileStartZ: -10,                  // Start near spawn (z=-5)
  tileStepZ: -6.0,                  // NEGATIVE step toward portal (z=-98)
  tileSafeRadius: 1.5,              // Slightly bigger than tile for forgiveness
  tileFloatAmplitude: 0.05,         // Subtle hover animation
  tileFloatSpeed: 1.0
};

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;
let videosStarted = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f); // Dark background, no blinding white

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, eyeHeight, -5);

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

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
light.position.set(0, 20, 0);
scene.add(light);

// ----------------------------------------------------------------------
// Lava Floor - "Laser Lava" Grid
// ----------------------------------------------------------------------
function createLavaFloor() {
  const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);

  // Create procedural grid texture for lava
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark base
  ctx.fillStyle = '#050509';
  ctx.fillRect(0, 0, 512, 512);

  // Red grid lines
  ctx.strokeStyle = '#440000';
  ctx.lineWidth = 2;
  const gridSize = 32;
  for (let i = 0; i <= 512; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const gridTexture = new THREE.CanvasTexture(canvas);
  gridTexture.wrapS = THREE.RepeatWrapping;
  gridTexture.wrapT = THREE.RepeatWrapping;
  gridTexture.repeat.set(4, 10); // Repeat along corridor

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x050509,
    emissive: 0x330000,
    emissiveMap: gridTexture,
    emissiveIntensity: 0.6, // Increased for visibility
    roughness: 0.9,
    metalness: 0.1
  });

  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, ROOM6_CONFIG.lavaFloorY, -corridorLength / 2);
  scene.add(floor);

  return floor;
}

const floor = createLavaFloor();

// Walls
const wallMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.1 });
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(corridorLength, wallHeight), wallMat);
leftWall.position.set(-corridorWidth / 2, wallHeight / 2, -corridorLength / 2);
leftWall.rotation.y = Math.PI / 2;
scene.add(leftWall);

const rightWall = leftWall.clone();
rightWall.position.set(corridorWidth / 2, wallHeight / 2, -corridorLength / 2);
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

// Front and back walls to fully enclose the corridor
const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth, wallHeight), wallMat);
frontWall.position.set(0, wallHeight / 2, 0);
frontWall.rotation.y = Math.PI;
scene.add(frontWall);

const backWall = frontWall.clone();
backWall.position.set(0, wallHeight / 2, -corridorLength);
backWall.rotation.y = 0;
scene.add(backWall);

// ----------------------------------------------------------------------
// Ceiling - Dark with Subtle Emissive Bands
// ----------------------------------------------------------------------
function createCeiling() {
  // Main ceiling surface - very dark
  const ceilingGeo = new THREE.CylinderGeometry(
    corridorWidth / 2,
    corridorWidth / 2,
    corridorLength,
    32, 1, true, 0, Math.PI
  );
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x050507,
    emissive: 0x111111,
    emissiveIntensity: 0.2,
    roughness: 0.8,
    side: THREE.BackSide
  });

  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.position.set(0, wallHeight, -corridorLength / 2);
  ceiling.rotation.z = Math.PI / 2;
  scene.add(ceiling);

  // Add 3 emissive light bands along ceiling for depth
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x110000,
    emissive: 0x330000,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.6
  });

  const bandPositions = [-30, -50, -70]; // Along corridor
  bandPositions.forEach(z => {
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(corridorWidth * 0.6, 2),
      bandMat
    );
    band.position.set(0, wallHeight - 0.1, z);
    band.rotation.x = -Math.PI / 2;
    scene.add(band);
  });

  return ceiling;
}

const ceiling = createCeiling();

// Load videos
const videoFiles = [
  'Amy1.mp4','Angel1.mp4','Anna1.mp4','April1.mp4','Cara1.mp4','Claire1.mp4','Cynthia2.mp4','Dasha1.mp4','Devon2.mp4','Huong1.mp4','Lucy1.mp4','Ruby1.mp4','Sarah1.mp4'
];

const videoPlanes = [];
const spacing = corridorLength / (videoFiles.length + 1);
videoFiles.forEach((file, index) => {
  const video = document.createElement('video');
  video.src = `/assets/${file}`; // FIXED: Changed from /videos/ to /assets/
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.display = 'none';
  document.body.appendChild(video);

  const texture = new THREE.VideoTexture(video);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), material);
  const z = -spacing * (index + 1);
  const side = index % 2 === 0 ? -1 : 1;
  plane.position.set(side * (corridorWidth / 2 - 0.1), eyeHeight + 0.5, z);
  plane.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  scene.add(plane);
  videoPlanes.push(plane);
});

// Start all videos on first user interaction
document.addEventListener('click', () => {
  if (!videosStarted) {
    document.querySelectorAll('video').forEach(v => {
      if (v.paused) {
        v.play().catch(() => {});
      }
    });
    videosStarted = true;
  }
}, { once: true });

// ----------------------------------------------------------------------
// Hex Tile Platforms - Safe spots above lava
// ----------------------------------------------------------------------
const hexTiles = [];
const tileCenters = [];

function createHexTiles() {
  const cfg = ROOM6_CONFIG;

  // Side material - BRIGHT red for clear visibility
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x550808,
    emissive: 0x330000,
    emissiveIntensity: 0.4, // Much brighter for visibility
    metalness: 0.2,
    roughness: 0.4
  });

  // Top material - pure black placeholder (NFT textures later)
  const topMat = new THREE.MeshBasicMaterial({
    color: 0x000000
  });

  for (let i = 0; i < cfg.tileCount; i++) {
    // Hexagonal prism geometry
    const geom = new THREE.CylinderGeometry(
      cfg.tileRadius,
      cfg.tileRadius,
      cfg.tileHeight,
      6  // 6 segments = hexagon
    );

    // Apply materials: [sides, top, bottom]
    const tile = new THREE.Mesh(geom, [sideMat, topMat.clone(), sideMat]);

    // Position along corridor with mild left/right wiggle
    const z = cfg.tileStartZ + i * cfg.tileStepZ;
    const xOffset = (i % 2 === 0) ? 0.8 : -0.8; // Gentle zigzag for interest
    const baseY = 0.0;

    tile.position.set(xOffset, baseY, z);
    tile.rotation.y = Math.random() * Math.PI * 2; // Random rotation for organic feel

    scene.add(tile);
    hexTiles.push(tile);

    // Store center for collision detection (x, z in 2D)
    tileCenters.push(new THREE.Vector2(xOffset, z));
  }

  const firstZ = cfg.tileStartZ;
  const lastZ = cfg.tileStartZ + (cfg.tileCount - 1) * cfg.tileStepZ;
  console.log(`✓ Room 6: Created ${cfg.tileCount} hex tiles`);
  console.log(`  First tile: z = ${firstZ}`);
  console.log(`  Last tile:  z = ${lastZ}`);
  console.log(`  Spawn: z = -5, Portal: z = -98`);
  console.log(`  Direction: ${cfg.tileStepZ > 0 ? 'POSITIVE (WRONG!)' : 'NEGATIVE (toward portal) ✓'}`);
}

createHexTiles();

// ----------------------------------------------------------------------
// Safe Tile Detection - Check if player is above a tile
// ----------------------------------------------------------------------
function isOnSafeTile(position) {
  const px = position.x;
  const pz = position.z;
  const safeRadiusSq = ROOM6_CONFIG.tileSafeRadius * ROOM6_CONFIG.tileSafeRadius;

  for (let i = 0; i < tileCenters.length; i++) {
    const c = tileCenters[i];
    const dx = px - c.x;
    const dz = pz - c.y; // Vector2 uses (x, y) for (x, z) in 3D
    if (dx * dx + dz * dz < safeRadiusSq) {
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------
// Respawn Player - Reset to corridor start on lava death
// ----------------------------------------------------------------------
function respawnPlayer() {
  const player = controls.getObject();
  player.position.copy(ROOM6_CONFIG.respawnPosition);
  velocity.set(0, 0, 0);
  jumpVelocity = 0;
  isJumping = false;
  console.log('💀 Lava death! Respawning at start...');
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
      if (!isJumping) { jumpVelocity = 10; isJumping = true; }
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

// ============================================
// Portal to Room 5
// ============================================
const portalObj = createLinkedPortal({
  scene,
  fromRoom: '6',
  toRoom: '5',
  x: 0,
  y: eyeHeight,
  z: -corridorLength + 2,
  rotationY: 0,
  createLabel: true
});

const portalToRoom5 = portalObj.portal;
const portalGlow = portalObj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(), // Use player position, not camera
  portals: [
    {
      position: new THREE.Vector3(0, eyeHeight, -corridorLength + 2),
      name: 'Eternal Eclipse (Room 5)',
      url: 'room5.html',
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
  const time = performance.now() * 0.001;

  // Hover animation for hex tiles
  hexTiles.forEach((tile, index) => {
    const baseY = 0.0;
    const phase = index * 0.3;
    const amplitude = ROOM6_CONFIG.tileFloatAmplitude;
    const speed = ROOM6_CONFIG.tileFloatSpeed;
    tile.position.y = baseY + Math.sin(time * speed + phase) * amplitude;
  });

  if (controls.isLocked) {
    const player = controls.getObject();

    // Jump physics
    if (isJumping) {
      player.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;
      if (player.position.y <= eyeHeight) {
        player.position.y = eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
      }
    }

    // Movement with shared config
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    const moveSpeed = MOVEMENT_CONFIG.getEffectiveSpeed('room6') || 60.0;

    if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Keep player inside corridor bounds
    const buffer = 0.5;
    const halfWidth = corridorWidth / 2 - buffer;
    const minZ = -corridorLength + buffer;
    const maxZ = -buffer;
    player.position.x = Math.max(-halfWidth, Math.min(halfWidth, player.position.x));
    player.position.z = Math.max(minZ, Math.min(maxZ, player.position.z));

    // Lava death detection
    if (player.position.y < ROOM6_CONFIG.safeHeightThreshold) {
      if (!isOnSafeTile(player.position)) {
        respawnPlayer();
      }
    }

    // Check portal proximity
    checkPortalProximity();
  }

  // Animate portals
  animateLinkedPortal(portalToRoom5, portalGlow);

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

// Allow escape key to dismiss stuck loading overlay
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
