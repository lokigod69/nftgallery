import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { getNftUrl } from './src/core/asset-utils.js';

// ============================================
// Configuration
// ============================================
const ROOM_WIDTH = 30;
const ROOM_DEPTH = 200;  // 5x longer than original
const ROOM_HEIGHT = 8;
const EYE_HEIGHT = 2.5;
const MOVE_SPEED = 60.0;
const GRAVITY = -30;
const JUMP_FORCE = 12;

// Tile grid configuration
const TILE_CELL_SIZE = 8;      // Size of each grid cell
const TILE_SIZE = 3.5;          // Size of each tile platform
const TILE_HEIGHT = 0.4;        // Thickness of tiles
const TILE_MOVE_DISTANCE = 2.0; // How far tiles move from center
const TILE_MOVE_SPEED = 0.8;    // Speed of tile oscillation

// NFT configuration
const NFT_START_INDEX = 50;
const NFT_SPACING = 12;  // Space between NFTs along the walls

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
scene.fog = new THREE.Fog(0x1a1a2e, 10, 120);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, EYE_HEIGHT, ROOM_DEPTH / 2 - 5);

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
let currentPlatformY = 0;  // Track which platform we're on

document.addEventListener('keydown', (e) => {
  switch(e.code) {
    case 'KeyW': case 'ArrowUp': moveForward = true; break;
    case 'KeyS': case 'ArrowDown': moveBackward = true; break;
    case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
    case 'KeyD': case 'ArrowRight': moveRight = true; break;
    case 'Space':
      if (!isJumping) {
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
  // Floor - dark but visible
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x111118,
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;  // Slightly below tiles
  floor.receiveShadow = true;
  scene.add(floor);

  // Wall material
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x16213e,
    roughness: 0.8,
    metalness: 0.2
  });

  // North wall
  const northWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
    wallMaterial
  );
  northWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  scene.add(northWall);

  // South wall (with portal)
  const southWall = northWall.clone();
  southWall.position.z = ROOM_DEPTH / 2;
  southWall.rotation.y = Math.PI;
  scene.add(southWall);

  // East wall
  const eastWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
    wallMaterial
  );
  eastWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  eastWall.rotation.y = -Math.PI / 2;
  scene.add(eastWall);

  // West wall
  const westWall = eastWall.clone();
  westWall.position.x = -ROOM_WIDTH / 2;
  westWall.rotation.y = Math.PI / 2;
  scene.add(westWall);

  // Ceiling
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
  ceiling.position.y = ROOM_HEIGHT;
  scene.add(ceiling);
}

// ============================================
// Moving Tiles System
// ============================================
const movingTiles = [];

function createMovingTiles() {
  // Calculate grid dimensions
  const gridCols = Math.floor(ROOM_WIDTH / TILE_CELL_SIZE);
  const gridRows = Math.floor(ROOM_DEPTH / TILE_CELL_SIZE);

  // Center offset to center the grid in the room
  const offsetX = (ROOM_WIDTH - gridCols * TILE_CELL_SIZE) / 2 - ROOM_WIDTH / 2 + TILE_CELL_SIZE / 2;
  const offsetZ = (ROOM_DEPTH - gridRows * TILE_CELL_SIZE) / 2 - ROOM_DEPTH / 2 + TILE_CELL_SIZE / 2;

  // Direction patterns - creates a connected network
  // 0 = top-right, 1 = top-left, 2 = bottom-right, 3 = bottom-left
  const directions = [
    { dx: 1, dz: -1 },   // 0: top-right
    { dx: -1, dz: -1 },  // 1: top-left
    { dx: 1, dz: 1 },    // 2: bottom-right
    { dx: -1, dz: 1 }    // 3: bottom-left
  ];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      // Determine direction based on checkerboard pattern
      // This ensures adjacent tiles move to meet each other
      let dirIndex;
      if (row % 2 === 0) {
        dirIndex = col % 2 === 0 ? 0 : 1;  // Even row: alternate top-right/top-left
      } else {
        dirIndex = col % 2 === 0 ? 2 : 3;  // Odd row: alternate bottom-right/bottom-left
      }

      const dir = directions[dirIndex];

      // Cell center position
      const centerX = offsetX + col * TILE_CELL_SIZE;
      const centerZ = offsetZ + row * TILE_CELL_SIZE;

      // Pick a color from the palette
      const colorIndex = (row * gridCols + col) % TILE_COLORS.length;
      const tileColor = TILE_COLORS[colorIndex];

      // Create tile geometry and material
      const tileGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
      const tileMat = new THREE.MeshStandardMaterial({
        color: tileColor,
        roughness: 0.4,
        metalness: 0.3,
        emissive: tileColor,
        emissiveIntensity: 0.15  // Soft faint glow
      });

      const tile = new THREE.Mesh(tileGeo, tileMat);
      tile.position.set(centerX, TILE_HEIGHT / 2, centerZ);
      tile.castShadow = true;
      tile.receiveShadow = true;

      // Add subtle point light under each tile for extra glow
      const tileLight = new THREE.PointLight(tileColor, 0.3, 6);
      tileLight.position.set(centerX, TILE_HEIGHT + 0.5, centerZ);
      scene.add(tileLight);

      scene.add(tile);

      // Store tile data for animation
      movingTiles.push({
        mesh: tile,
        light: tileLight,
        centerX,
        centerZ,
        dirX: dir.dx,
        dirZ: dir.dz,
        phase: (row + col) * 0.3  // Offset phase for wave effect
      });
    }
  }

  console.log(`Created ${movingTiles.length} moving tiles in a ${gridCols}x${gridRows} grid`);
}

function animateMovingTiles(time) {
  movingTiles.forEach(tile => {
    // Oscillate between center and corner
    const t = Math.sin(time * TILE_MOVE_SPEED + tile.phase) * 0.5 + 0.5;  // 0 to 1

    const x = tile.centerX + tile.dirX * TILE_MOVE_DISTANCE * t;
    const z = tile.centerZ + tile.dirZ * TILE_MOVE_DISTANCE * t;

    tile.mesh.position.x = x;
    tile.mesh.position.z = z;

    // Move the light with the tile
    tile.light.position.x = x;
    tile.light.position.z = z;
  });
}

// ============================================
// NFT Display on Side Walls
// ============================================
function createNFTFrames() {
  const textureLoader = new THREE.TextureLoader();

  // Calculate how many NFTs fit along the room length
  const nftCount = Math.floor((ROOM_DEPTH - 20) / NFT_SPACING);
  let nftIndex = NFT_START_INDEX;

  // West wall NFTs (left side)
  for (let i = 0; i < nftCount; i++) {
    const z = -ROOM_DEPTH / 2 + 10 + i * NFT_SPACING;
    createNFTFrame(textureLoader, -ROOM_WIDTH / 2 + 0.2, 4, z, Math.PI / 2, nftIndex++);
  }

  // East wall NFTs (right side)
  for (let i = 0; i < nftCount; i++) {
    const z = -ROOM_DEPTH / 2 + 10 + i * NFT_SPACING;
    createNFTFrame(textureLoader, ROOM_WIDTH / 2 - 0.2, 4, z, -Math.PI / 2, nftIndex++);
  }

  console.log(`Created ${(nftIndex - NFT_START_INDEX)} NFT frames on side walls`);
}

function createNFTFrame(textureLoader, x, y, z, rotationY, nftIndex) {
  const frameGroup = new THREE.Group();

  // Frame backing
  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 3.5, 2.5),
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.6,
      metalness: 0.4
    })
  );
  frameGroup.add(frameBox);

  // Load NFT image
  const imageUrl = getNftUrl(nftIndex);

  textureLoader.load(
    imageUrl,
    (texture) => {
      const picturePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 3.2),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      picturePlane.rotation.y = Math.PI / 2;
      picturePlane.position.x = 0.08;
      frameGroup.add(picturePlane);
    },
    undefined,
    (error) => {
      console.warn(`NFT ${nftIndex} failed to load, using placeholder`);
      const placeholderPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 3.2),
        new THREE.MeshBasicMaterial({ color: 0x666666 })
      );
      placeholderPlane.rotation.y = Math.PI / 2;
      placeholderPlane.position.x = 0.08;
      frameGroup.add(placeholderPlane);
    }
  );

  frameGroup.position.set(x, y, z);
  frameGroup.rotation.y = rotationY;
  scene.add(frameGroup);

  // Add spotlight for each NFT
  const spotlight = new THREE.SpotLight(0xffffff, 0.8, 15, Math.PI / 8);
  spotlight.position.set(x + (rotationY > 0 ? 3 : -3), y + 2, z);
  spotlight.target.position.set(x, y, z);
  scene.add(spotlight);
  scene.add(spotlight.target);
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

  let onTile = false;
  let highestTileY = -0.5;  // Floor level

  for (const tile of movingTiles) {
    const tileX = tile.mesh.position.x;
    const tileZ = tile.mesh.position.z;
    const tileTop = tile.mesh.position.y + TILE_HEIGHT / 2;

    // Check if player is within tile bounds horizontally
    const halfSize = TILE_SIZE / 2;
    if (Math.abs(playerX - tileX) < halfSize && Math.abs(playerZ - tileZ) < halfSize) {
      // Check if feet are near tile top
      if (feetY >= tileTop - 0.5 && feetY <= tileTop + 1.0) {
        if (tileTop > highestTileY) {
          highestTileY = tileTop;
          onTile = true;
        }
      }
    }
  }

  return { onTile, tileY: highestTileY };
}

// ============================================
// Animation Loop
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Animate tiles
  animateMovingTiles(time);

  if (controls.isLocked) {
    // Movement
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

    // Check tile collision
    const collision = checkTileCollision();
    const groundLevel = collision.tileY + EYE_HEIGHT;

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
      // Gravity when not on a tile
      if (camera.position.y > groundLevel + 0.1) {
        isJumping = true;
        jumpVelocity = 0;
      } else {
        camera.position.y = groundLevel;
      }
    }

    // Boundary check
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
createMovingTiles();
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
