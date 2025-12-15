import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { getNftUrl } from './src/core/asset-utils.js';

// ============================================
// Configuration
// ============================================
const ROOM_WIDTH = 48;           // Widened by 20% for more tile movement range
const ROOM_DEPTH = 250;          // Extended length
const ROOM_HEIGHT = 28;          // Tall ceiling for large NFT display
const FLOOR_DROP = 100;          // Much deeper pit
const EYE_HEIGHT = 4.0;          // Raised camera height for better tile view
const MOVE_SPEED = 12.0;         // Much slower for precise platforming
const GRAVITY = -30;
const JUMP_FORCE = 14;           // Slightly higher jump

// Platform heights
const TILE_PLATFORM_Y = 0;         // Y level where tiles float
const SPAWN_PLATFORM_Y = TILE_PLATFORM_Y;  // Starting platform at same level
const FLOOR_Y = -FLOOR_DROP;       // Deep floor for falling

// Tile grid configuration - 3 columns with symmetric movement
const TILE_SIZE = 5.0;           // Bigger tiles for easier platforming
const TILE_HEIGHT = 0.5;         // Slightly thicker
const TILE_SPACING_X = 12;       // Horizontal spacing between column centers
const TILE_SPACING_Z = 8;        // Vertical spacing between rows
const TILE_MOVE_DISTANCE = 3.0;  // How far tiles move (left/right meet in middle)
const TILE_MOVE_SPEED = 0.6;     // Slower, more hypnotic oscillation

// Spawn position - moved closer to tiles (halfway)
const SPAWN_X = 0;
const SPAWN_Z = ROOM_DEPTH / 4;  // Halfway into the room, closer to tiles

// NFT configuration
const NFT_START_INDEX = 50;
const NFT_SPACING = 12;  // Space between NFTs along the walls

// Fall reset configuration
const FALL_RESET_TIME = 3.0;  // Seconds before reset when falling

// Soft muted color palette for tiles
const TILE_COLORS = [
  0xd4a5a5,  // Dusty rose
  0xa5c4d4,  // Soft blue
  0xb5d4a5,  // Sage green
  0xd4c4a5,  // Soft sand
  0xc4a5d4,  // Lavender
  0xa5d4c4,  // Mint
  0xd4b5a5,  // Peach
  0xa5b5d4,  // Periwinkle
  0xc4d4a5,  // Pale lime
  0xd4a5c4,  // Soft pink
  0xa5d4d4,  // Aqua
  0xd4d4a5,  // Cream
];

// ============================================
// Scene Setup
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 10, 150);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ============================================
// Controls
// ============================================
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

let moveForward = false, moveBackward = false;
let moveLeft = false, moveRight = false;
let isJumping = false;
let jumpVelocity = 0;
let isFalling = false;
let fallTimer = 0;

document.addEventListener('keydown', (e) => {
  switch(e.code) {
    case 'KeyW': case 'ArrowUp': moveForward = true; break;
    case 'KeyS': case 'ArrowDown': moveBackward = true; break;
    case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
    case 'KeyD': case 'ArrowRight': moveRight = true; break;
    case 'Space':
      if (!isJumping && !isFalling) {
        jumpVelocity = JUMP_FORCE;
        isJumping = true;
      }
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch(e.code) {
    case 'KeyW': case 'ArrowUp': moveForward = false; break;
    case 'KeyS': case 'ArrowDown': moveBackward = false; break;
    case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
    case 'KeyD': case 'ArrowRight': moveRight = false; break;
  }
});

document.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// Spawn/Reset Function
// ============================================
function resetToSpawn() {
  camera.position.set(SPAWN_X, SPAWN_PLATFORM_Y + TILE_HEIGHT + EYE_HEIGHT, SPAWN_Z);
  jumpVelocity = 0;
  isJumping = false;
  isFalling = false;
  fallTimer = 0;
}

// Initialize camera position
resetToSpawn();

// ============================================
// Lighting
// ============================================
function setupLighting() {
  // Soft ambient light
  const ambientLight = new THREE.AmbientLight(0x6666aa, 0.5);
  scene.add(ambientLight);

  // Directional light from above
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(0, ROOM_HEIGHT, 0);
  scene.add(directionalLight);

  // Soft colored lights along the room
  for (let z = -ROOM_DEPTH / 2 + 20; z < ROOM_DEPTH / 2; z += 40) {
    const leftLight = new THREE.PointLight(0x8888ff, 0.6, 30);
    leftLight.position.set(-ROOM_WIDTH / 2 + 2, ROOM_HEIGHT - 2, z);
    scene.add(leftLight);

    const rightLight = new THREE.PointLight(0xff8888, 0.6, 30);
    rightLight.position.set(ROOM_WIDTH / 2 - 2, ROOM_HEIGHT - 2, z);
    scene.add(rightLight);
  }
}

// ============================================
// Room Structure
// ============================================
function createRoomStructure() {
  // Floor - very deep down, barely visible
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x080810,
    roughness: 0.9,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  scene.add(floor);

  // Wall material
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x16213e,
    roughness: 0.8,
    metalness: 0.2
  });

  // North wall (extends down to floor)
  const wallHeight = ROOM_HEIGHT + FLOOR_DROP;
  const northWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, wallHeight),
    wallMaterial
  );
  northWall.position.set(0, (ROOM_HEIGHT - FLOOR_DROP) / 2, -ROOM_DEPTH / 2);
  scene.add(northWall);

  // South wall (with portal)
  const southWall = northWall.clone();
  southWall.position.z = ROOM_DEPTH / 2;
  southWall.rotation.y = Math.PI;
  scene.add(southWall);

  // East wall
  const eastWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_DEPTH, wallHeight),
    wallMaterial
  );
  eastWall.position.set(ROOM_WIDTH / 2, (ROOM_HEIGHT - FLOOR_DROP) / 2, 0);
  eastWall.rotation.y = -Math.PI / 2;
  scene.add(eastWall);

  // West wall
  const westWall = eastWall.clone();
  westWall.position.x = -ROOM_WIDTH / 2;
  westWall.rotation.y = Math.PI / 2;
  scene.add(westWall);

  // Dark ceiling backing
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f0f1e,
    roughness: 0.9,
    metalness: 0.1
  });
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    ceilingMaterial
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT + 0.1;  // Slightly above mirror
  scene.add(ceiling);

  // Mirror ceiling with frosted glass effect
  createMirrorCeiling();
}

// ============================================
// Mirror Ceiling with Frosted Glass Effect
// ============================================
let mirrorCeiling = null;
let reflectionGroup = null;

function createMirrorCeiling() {
  // Create a frosted mirror surface that reflects tiles below
  const mirrorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH - 2, ROOM_DEPTH - 2);

  // Frosted glass effect - semi-transparent to see reflections through
  const mirrorMaterial = new THREE.MeshStandardMaterial({
    color: 0x8899aa,           // Cool blue-grey tint
    roughness: 0.3,            // Slightly frosted
    metalness: 0.9,            // Highly reflective
    transparent: true,
    opacity: 0.4,              // More transparent to see reflections
    side: THREE.DoubleSide
  });

  mirrorCeiling = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
  mirrorCeiling.rotation.x = Math.PI / 2;
  mirrorCeiling.position.y = ROOM_HEIGHT;
  scene.add(mirrorCeiling);
}

function createMirrorReflections() {
  // Create inverted tile copies above the mirror ceiling
  // Position them so they appear as reflections when looking up
  reflectionGroup = new THREE.Group();

  // Create reflection meshes for each tile
  movingTiles.forEach((tileData, index) => {
    const tileColor = TILE_COLORS[index % TILE_COLORS.length];

    // Reflection geometry (same size as tiles)
    const reflectionGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
    const reflectionMat = new THREE.MeshBasicMaterial({
      color: tileColor,
      transparent: true,
      opacity: 0.35,  // Visible reflection
    });

    const reflection = new THREE.Mesh(reflectionGeo, reflectionMat);

    // Position reflection above ceiling - mirrored from tile position
    // Mirror formula: reflection_y = 2 * mirror_y - object_y
    const mirrorY = ROOM_HEIGHT;
    const reflectedY = 2 * mirrorY - tileData.mesh.position.y;
    reflection.position.set(
      tileData.mesh.position.x,
      reflectedY,
      tileData.mesh.position.z
    );

    // Store reference for animation sync
    tileData.reflection = reflection;
    reflectionGroup.add(reflection);
  });

  scene.add(reflectionGroup);
}

// ============================================
// Fixed Starting Platform
// ============================================
let spawnPlatform = null;

function createSpawnPlatform() {
  // Large fixed platform at spawn point
  const platformSize = 8;
  const platformThickness = 1.0;  // Thicker platform
  const platformGeo = new THREE.BoxGeometry(platformSize, platformThickness, platformSize);
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a6a,
    roughness: 0.3,
    metalness: 0.5,
    emissive: 0x2a2a4a,
    emissiveIntensity: 0.2
  });

  spawnPlatform = new THREE.Mesh(platformGeo, platformMat);
  spawnPlatform.position.set(SPAWN_X, SPAWN_PLATFORM_Y - platformThickness / 2 + TILE_HEIGHT, SPAWN_Z);
  scene.add(spawnPlatform);

  // Edge glow ring around platform (below, no overlap)
  const edgeGeo = new THREE.BoxGeometry(platformSize + 0.4, 0.2, platformSize + 0.4);
  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0x6666aa,
    transparent: true,
    opacity: 0.4
  });
  const edge = new THREE.Mesh(edgeGeo, edgeMat);
  edge.position.set(SPAWN_X, SPAWN_PLATFORM_Y - platformThickness + TILE_HEIGHT - 0.1, SPAWN_Z);
  scene.add(edge);

  // Label floating above platform
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  ctx.fillStyle = '#6666aa';
  ctx.font = 'Bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('START', 128, 40);

  const labelTex = new THREE.CanvasTexture(canvas);
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
  const labelGeo = new THREE.PlaneGeometry(3, 0.75);
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.set(SPAWN_X, SPAWN_PLATFORM_Y + TILE_HEIGHT + 1.5, SPAWN_Z);
  label.rotation.x = -Math.PI / 2;
  scene.add(label);
}

// ============================================
// Moving Tiles System - 3 Column Symmetric Layout
// ============================================
const movingTiles = [];
const OUTSIDE_CURVATURE = 0.3;  // 30% curvature for outside tiles

function createMovingTiles() {
  // 3 columns: left (-TILE_SPACING_X), center (0), right (+TILE_SPACING_X)
  // Outside columns have curvature (curved movement path)
  const columns = [
    { x: -TILE_SPACING_X, dirX: 1, dirZ: 0, hasCurvature: true },   // Left column moves RIGHT with curve
    { x: 0, dirX: 0, dirZ: 1, hasCurvature: false },                 // Center column moves FORWARD/BACK
    { x: TILE_SPACING_X, dirX: -1, dirZ: 0, hasCurvature: true }    // Right column moves LEFT with curve
  ];

  // Calculate number of rows
  const numRows = Math.floor((ROOM_DEPTH - 30) / TILE_SPACING_Z);  // Leave space at ends
  const startZ = -ROOM_DEPTH / 2 + 15;  // Start from north end

  let tileCounter = 0;  // For alternating (every second tile removal)

  for (let row = 0; row < numRows; row++) {
    const rowZ = startZ + row * TILE_SPACING_Z;

    // Skip rows that would overlap with spawn platform
    if (Math.abs(rowZ - SPAWN_Z) < 6) {
      continue;
    }

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      // Remove every second tile from all columns
      tileCounter++;
      if (tileCounter % 2 === 0) {
        continue;  // Skip every second tile
      }

      const col = columns[colIdx];
      const centerX = col.x;
      const centerZ = rowZ;

      // Pick a color - alternating pattern for visual variety
      const colorIndex = (row * 3 + colIdx) % TILE_COLORS.length;
      const tileColor = TILE_COLORS[colorIndex];

      // Create tile geometry and material
      const tileGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
      const tileMat = new THREE.MeshStandardMaterial({
        color: tileColor,
        roughness: 0.4,
        metalness: 0.3,
        emissive: tileColor,
        emissiveIntensity: 0.15
      });

      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(centerX, TILE_PLATFORM_Y + TILE_HEIGHT / 2, centerZ);
      tile.castShadow = true;
      tile.receiveShadow = true;

      // Add subtle point light under each tile
      const tileLight = new THREE.PointLight(tileColor, 0.2, 8);
      tileLight.position.set(centerX, TILE_PLATFORM_Y + TILE_HEIGHT + 0.5, centerZ);
      scene.add(tileLight);

      scene.add(tile);

      // Phase offset creates wave pattern down the corridor
      // Left and right columns have opposite phase so they move toward each other
      let phase;
      if (colIdx === 0) {
        phase = row * 0.4;  // Left column
      } else if (colIdx === 2) {
        phase = row * 0.4;  // Right column - same phase, opposite direction
      } else {
        phase = row * 0.4 + Math.PI / 2;  // Center column - offset by 90 degrees
      }

      // Store tile data for animation
      movingTiles.push({
        mesh: tile,
        light: tileLight,
        centerX,
        centerZ,
        dirX: col.dirX,
        dirZ: col.dirZ,
        hasCurvature: col.hasCurvature,
        phase,
        prevX: centerX,
        prevZ: centerZ,
        velocityX: 0,
        velocityZ: 0
      });
    }
  }

  console.log(`Created ${movingTiles.length} moving tiles in 3-column symmetric layout (every second removed)`);
}

// Store previous tile positions before animation update
function storeTilePreviousPositions() {
  movingTiles.forEach(tile => {
    tile.prevX = tile.mesh.position.x;
    tile.prevZ = tile.mesh.position.z;
  });
}

function animateMovingTiles(time) {
  movingTiles.forEach(tile => {
    // Oscillate between center and corner
    const t = Math.sin(time * TILE_MOVE_SPEED + tile.phase) * 0.5 + 0.5;

    let x = tile.centerX + tile.dirX * TILE_MOVE_DISTANCE * t;
    let z = tile.centerZ + tile.dirZ * TILE_MOVE_DISTANCE * t;

    // Add curvature to outside tiles (30% Z offset based on sine of X movement)
    if (tile.hasCurvature) {
      // Create curved path by adding perpendicular movement
      const curveOffset = Math.sin(t * Math.PI) * TILE_MOVE_DISTANCE * OUTSIDE_CURVATURE;
      z += curveOffset;
    }

    tile.mesh.position.x = x;
    tile.mesh.position.z = z;

    // Move the light with the tile
    tile.light.position.x = x;
    tile.light.position.z = z;

    // Sync reflection position (mirrored above ceiling)
    if (tile.reflection) {
      tile.reflection.position.x = x;
      tile.reflection.position.z = z;
      // Mirror formula: reflection_y = 2 * mirror_y - object_y
      tile.reflection.position.y = 2 * ROOM_HEIGHT - tile.mesh.position.y;
    }

    // Calculate velocity for this frame
    tile.velocityX = tile.mesh.position.x - tile.prevX;
    tile.velocityZ = tile.mesh.position.z - tile.prevZ;
  });
}

// ============================================
// NFT Display on Side Walls - Large format, no lighting effects
// ============================================
const NFT_FRAME_HEIGHT = 10;   // Large NFT frames
const NFT_FRAME_WIDTH = 7;     // Wide frames
const NFT_Y_POSITION = ROOM_HEIGHT / 2;  // Centered vertically on wall

function createNFTFrames() {
  const textureLoader = new THREE.TextureLoader();

  // Calculate how many NFTs fit along the room length
  const nftCount = Math.floor((ROOM_DEPTH - 20) / NFT_SPACING);
  let nftIndex = NFT_START_INDEX;

  // West wall NFTs (left side) - facing into the room
  for (let i = 0; i < nftCount; i++) {
    const z = -ROOM_DEPTH / 2 + 10 + i * NFT_SPACING;
    createNFTFrame(textureLoader, -ROOM_WIDTH / 2 + 0.5, NFT_Y_POSITION, z, 'west', nftIndex++);
  }

  // East wall NFTs (right side) - facing into the room
  for (let i = 0; i < nftCount; i++) {
    const z = -ROOM_DEPTH / 2 + 10 + i * NFT_SPACING;
    createNFTFrame(textureLoader, ROOM_WIDTH / 2 - 0.5, NFT_Y_POSITION, z, 'east', nftIndex++);
  }

  console.log(`Created ${(nftIndex - NFT_START_INDEX)} NFT frames on side walls`);
}

function createNFTFrame(textureLoader, x, y, z, wall, nftIndex) {
  const frameGroup = new THREE.Group();

  // Frame backing - oriented to lie flat against wall (larger size)
  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, NFT_FRAME_HEIGHT + 0.5, NFT_FRAME_WIDTH + 0.5),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,  // Dark frame
      roughness: 0.8,
      metalness: 0.2
    })
  );
  frameGroup.add(frameBox);

  // Load NFT image
  const imageUrl = getNftUrl(nftIndex);

  textureLoader.load(
    imageUrl,
    (texture) => {
      // Use MeshBasicMaterial for true original colors (no lighting influence)
      const picturePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(NFT_FRAME_WIDTH, NFT_FRAME_HEIGHT),
        new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false  // Preserve original colors
        })
      );
      // Position picture on the frame, facing into the room
      if (wall === 'west') {
        picturePlane.position.x = 0.12;  // Offset from frame center
        picturePlane.rotation.y = Math.PI / 2;  // Face right (into room)
      } else {
        picturePlane.position.x = -0.12;  // Offset from frame center
        picturePlane.rotation.y = -Math.PI / 2;  // Face left (into room)
      }
      frameGroup.add(picturePlane);
    },
    undefined,
    (error) => {
      console.warn(`NFT ${nftIndex} failed to load, using placeholder`);
      const placeholderPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(NFT_FRAME_WIDTH, NFT_FRAME_HEIGHT),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      if (wall === 'west') {
        placeholderPlane.position.x = 0.12;
        placeholderPlane.rotation.y = Math.PI / 2;
      } else {
        placeholderPlane.position.x = -0.12;
        placeholderPlane.rotation.y = -Math.PI / 2;
      }
      frameGroup.add(placeholderPlane);
    }
  );

  frameGroup.position.set(x, y, z);
  scene.add(frameGroup);

  // No spotlights - NFTs display in original brightness/contrast
}

// ============================================
// "Concept Chamber" Sign
// ============================================
function createWIPSign() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;

  context.fillStyle = '#16213e';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = '#4444ff';
  context.lineWidth = 10;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  context.fillStyle = '#ffffff';
  context.font = 'Bold 80px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('CONCEPT CHAMBER', canvas.width / 2, canvas.height / 2 - 40);

  context.font = '40px Arial';
  context.fillStyle = '#aaaaaa';
  context.fillText('Moving Tiles Gallery', canvas.width / 2, canvas.height / 2 + 40);

  const texture = new THREE.CanvasTexture(canvas);

  const signMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true
  });
  const signGeometry = new THREE.PlaneGeometry(8, 2);
  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.set(0, ROOM_HEIGHT - 2, -ROOM_DEPTH / 2 + 0.1);
  scene.add(sign);
}

// ============================================
// Portal to Room 0
// ============================================
let portalToRoom0 = null;
let portalGlow = null;

function createPortal() {
  const portalGeometry = new THREE.CircleGeometry(1.5, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  portalToRoom0 = new THREE.Mesh(portalGeometry, portalMaterial);
  portalToRoom0.position.set(0, EYE_HEIGHT, ROOM_DEPTH / 2 - 2);
  portalToRoom0.rotation.y = Math.PI;

  const glowGeometry = new THREE.CircleGeometry(1.8, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  portalGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  portalGlow.position.copy(portalToRoom0.position);
  portalGlow.rotation.copy(portalToRoom0.rotation);

  scene.add(portalToRoom0, portalGlow);
}

function checkPortalProximity() {
  if (!portalToRoom0) return;

  const distance = camera.position.distanceTo(portalToRoom0.position);
  const controlsDesc = document.getElementById('controls-description');

  if (distance < 3.0) {
    controlsDesc.textContent = 'Approach portal to return to Ocean Hub (Room 0)';
    controlsDesc.style.display = 'block';

    if (distance < 1.8) {
      const loadingOverlay = document.getElementById('loading-overlay');
      loadingOverlay.style.display = 'flex';

      setTimeout(() => {
        window.location.href = 'room0.html';
      }, 500);
    }
  } else {
    controlsDesc.textContent = 'Controls: WASD - Move, Mouse - Look, SPACE - Jump';
  }
}

// ============================================
// Platform Collision Detection
// ============================================
function checkTileCollision() {
  const playerX = camera.position.x;
  const playerZ = camera.position.z;
  const playerY = camera.position.y;
  const feetY = playerY - EYE_HEIGHT;

  let onPlatform = false;
  let platformY = null;
  let activeTile = null;

  // Check spawn platform first (thicker platform, top is at TILE_HEIGHT level)
  if (spawnPlatform) {
    const spawnHalfSize = 4;
    const spawnTop = SPAWN_PLATFORM_Y + TILE_HEIGHT;  // Top surface of spawn platform
    if (Math.abs(playerX - spawnPlatform.position.x) < spawnHalfSize &&
        Math.abs(playerZ - spawnPlatform.position.z) < spawnHalfSize) {
      if (feetY >= spawnTop - 1.0 && feetY <= spawnTop + 2.0) {
        onPlatform = true;
        platformY = spawnTop;
      }
    }
  }

  // Check moving tiles - use slightly larger hitbox for better feel
  for (const tile of movingTiles) {
    const tileX = tile.mesh.position.x;
    const tileZ = tile.mesh.position.z;
    const tileTop = tile.mesh.position.y + TILE_HEIGHT / 2;

    // Slightly larger collision area for forgiving platforming
    const halfSize = TILE_SIZE / 2 + 0.2;
    if (Math.abs(playerX - tileX) < halfSize && Math.abs(playerZ - tileZ) < halfSize) {
      // Check if feet are near tile top (generous vertical range)
      if (feetY >= tileTop - 1.0 && feetY <= tileTop + 2.0) {
        if (!onPlatform || tileTop > platformY) {
          platformY = tileTop;
          onPlatform = true;
          activeTile = tile;
        }
      }
    }
  }

  return { onPlatform, platformY, activeTile };
}

// ============================================
// Animation Loop
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Store previous positions BEFORE animating
  storeTilePreviousPositions();

  // Animate tiles (calculates velocities)
  animateMovingTiles(time);

  if (controls.isLocked) {
    // Check tile collision FIRST to get tile movement
    const collision = checkTileCollision();

    // If standing on a moving tile, apply tile movement to player FIRST
    if (collision.onPlatform && collision.activeTile) {
      camera.position.x += collision.activeTile.velocityX;
      camera.position.z += collision.activeTile.velocityZ;
    }

    // Then apply player's own movement
    const speedDelta = MOVE_SPEED * delta;
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speedDelta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speedDelta;

    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);

    // Re-check collision after player movement (in case they walked off)
    const finalCollision = checkTileCollision();

    if (finalCollision.onPlatform) {
      const groundLevel = finalCollision.platformY + EYE_HEIGHT;

      // Gravity and jumping
      if (isJumping) {
        camera.position.y += jumpVelocity * delta;
        jumpVelocity += GRAVITY * delta;

        if (camera.position.y <= groundLevel) {
          camera.position.y = groundLevel;
          isJumping = false;
          jumpVelocity = 0;
        }
      } else {
        camera.position.y = groundLevel;
      }

      // Reset fall state
      isFalling = false;
      fallTimer = 0;
    } else {
      // Not on any platform - falling!
      if (!isFalling) {
        isFalling = true;
        fallTimer = 0;
        if (!isJumping) {
          isJumping = true;
          jumpVelocity = 0;
        }
      }

      // Apply gravity while falling
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += GRAVITY * delta;

      // Count fall time
      fallTimer += delta;

      // Reset after fall time exceeded
      if (fallTimer >= FALL_RESET_TIME) {
        resetToSpawn();
      }
    }

    // Boundary check (walls)
    camera.position.x = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, camera.position.x));
    camera.position.z = Math.max(-ROOM_DEPTH / 2 + 1, Math.min(ROOM_DEPTH / 2 - 1, camera.position.z));

    checkPortalProximity();
  }

  // Animate portals
  if (portalToRoom0) {
    portalToRoom0.rotation.z += 0.01;
    portalGlow.rotation.z -= 0.01;
  }

  renderer.render(scene, camera);
}

// ============================================
// Initialize
// ============================================
setupLighting();
createRoomStructure();
createWIPSign();
createSpawnPlatform();
createMovingTiles();
createMirrorReflections();  // Create reflections after tiles exist
createNFTFrames();
createPortal();

// Hide loading overlay
setTimeout(() => {
  const loadingOverlay = document.getElementById('loading-overlay');
  loadingOverlay.style.opacity = '0';
  setTimeout(() => {
    loadingOverlay.style.display = 'none';
  }, 500);
}, 2000);

// Start animation
animate();
