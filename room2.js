import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';
import { initMobileControls } from './src/core/mobile-controls.js';
import { initUnifiedNFTViewer, MAX_NFT_INTERACTION_DISTANCE } from './src/core/nft-viewer.js';

// Room 2 NFT files (44 PNG images from Room2 folder - randomized order)
const ROOM2_NFTS = [
  'ComfyUI_03653_', 'ComfyUI_00374_', 'ComfyUI_03942_', 'ComfyUI_00190_',
  'ComfyUI_00516_', 'ComfyUI_03557_', 'ComfyUI_00344_', 'ComfyUI_01032_',
  'ComfyUI_00977_', 'ComfyUI_03700_', 'ComfyUI_00389_', 'ComfyUI_00215_',
  'ComfyUI_03592_', 'ComfyUI_00427_', 'ComfyUI_03664_', 'ComfyUI_00166_',
  'ComfyUI_03470_', 'ComfyUI_00450_', 'ComfyUI_00913_', 'ComfyUI_03421_',
  'ComfyUI_00336_', 'ComfyUI_03772_', 'ComfyUI_00497_', 'ComfyUI_00981_',
  'ComfyUI_03444_', 'ComfyUI_00179_', 'ComfyUI_03905_', 'ComfyUI_00335_',
  'ComfyUI_03615_', 'ComfyUI_00388_', 'ComfyUI_03559_', 'ComfyUI_00992_',
  'ComfyUI_00577_', 'ComfyUI_03874_', 'ComfyUI_00369_', 'ComfyUI_03660_',
  'ComfyUI_00433_', 'ComfyUI_00961_', 'ComfyUI_00243_', 'ComfyUI_03442_',
  'ComfyUI_00340_', 'ComfyUI_00404_', 'ComfyUI_03697_', 'ComfyUI_00514_'
];

function getRoom2NftUrl(index) {
  if (index >= 0 && index < ROOM2_NFTS.length) {
    return `/assets/Room2/${ROOM2_NFTS[index]}.png`;
  }
  return `/assets/Room2/${ROOM2_NFTS[0]}.png`; // Fallback
}

// ----------------------------------------------------------------------
// Global Variables for Jump Physics
// ----------------------------------------------------------------------
const groundLevels = { 1: 4.0 }; // Eye height set to measured NFT center Y (data-driven)
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;

// ----------------------------------------------------------------------
// Global Variables
// ----------------------------------------------------------------------
let picturePlanes = [];
let nftCenterMeasured = false;  // Flag to measure NFT center Y only once
let nftViewer = null;  // Unified viewer instance

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, groundLevels[1], 5);

const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.LinearEncoding;
document.body.appendChild(renderer.domElement);

// ----------------------------------------------------------------------
// Controls & Movement Setup
// ----------------------------------------------------------------------
const controls = new PointerLockControls(camera, document.body);

// Movement flags now on window object for mobile/desktop sharing
window.moveForward = false;
window.moveBackward = false;
window.moveLeft = false;
window.moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const prevPosition = new THREE.Vector3();  // Track previous position for collision detection
// Movement speed now using shared config (was 20.0)

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': window.moveForward = true; break;
    case 'KeyA': window.moveLeft = true; break;
    case 'KeyS': window.moveBackward = true; break;
    case 'KeyD': window.moveRight = true; break;
    case 'Space':
      if (!isJumping) {
        isJumping = true;
        jumpVelocity = 8;
      }
      break;
    case 'Escape':
      if (nftViewer && nftViewer.isOpen()) {
        nftViewer.close();
      } else {
        controls.unlock();
      }
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': window.moveForward = false; break;
    case 'KeyA': window.moveLeft = false; break;
    case 'KeyS': window.moveBackward = false; break;
    case 'KeyD': window.moveRight = false; break;
  }
});

// ----------------------------------------------------------------------
// Lighting
// ----------------------------------------------------------------------
function createLights() {
  // Ambient light for overall brightness
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  // Main directional light
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(0, 10, 0);
  scene.add(mainLight);

  // Additional point lights for better NFT visibility
  const pointLightPositions = [
    { pos: [0, 8, 0], intensity: 0.8 },
    { pos: [-15, 8, -15], intensity: 0.6 },
    { pos: [15, 8, -15], intensity: 0.6 },
    { pos: [-15, 8, 15], intensity: 0.6 },
    { pos: [15, 8, 15], intensity: 0.6 }
  ];

  pointLightPositions.forEach(config => {
    const pointLight = new THREE.PointLight(0xffffff, config.intensity);
    pointLight.position.set(...config.pos);
    scene.add(pointLight);
  });
}

// ----------------------------------------------------------------------
// Floor Texture
// ----------------------------------------------------------------------
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cols = 10, rows = 10;
  const tileWidth = canvas.width / cols;
  const tileHeight = canvas.height / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (Math.random() < 0.3) {
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(10 + Math.random() * 20);
        const l = Math.floor(40 + Math.random() * 30);
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.fillRect(i * tileWidth, j * tileHeight, tileWidth, tileHeight);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

// ----------------------------------------------------------------------
// Room Structure
// ----------------------------------------------------------------------
function createWallsAndFloor() {
  const walls = {};
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x404040,
    roughness: 0.5,
    metalness: 0.2
  });

  // Floor
  const floorGeometry = new THREE.PlaneGeometry(40, 40);
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  walls.floor = floor;

  // Walls
  const wallGeometry = new THREE.PlaneGeometry(40, 8);

  // Back wall
  const backWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  backWall.position.z = -20;
  backWall.position.y = 4;
  scene.add(backWall);
  walls.backWall = backWall;

  // Left wall
  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  leftWall.position.x = -20;
  leftWall.position.y = 4;
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);
  walls.leftWall = leftWall;

  // Right wall
  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  rightWall.position.x = 20;
  rightWall.position.y = 4;
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);
  walls.rightWall = rightWall;

  // Front wall
  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  frontWall.position.z = 20;
  frontWall.position.y = 4;
  frontWall.rotation.y = Math.PI;
  scene.add(frontWall);
  walls.frontWall = frontWall;

  return walls;
}

// ----------------------------------------------------------------------
// Ceiling
// ----------------------------------------------------------------------
function createCeiling() {
  const ceilingGeometry = new THREE.PlaneGeometry(40, 40);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.y = 8;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // Add some random stars
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1
  });

  const starsVertices = [];
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * 40 - 20;
    const z = Math.random() * 40 - 20;
    starsVertices.push(x, 7.9, z);
  }

  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starsVertices, 3)
  );

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

// ----------------------------------------------------------------------
// NFT Frame Positioning
// ----------------------------------------------------------------------
function getPositions(totalWidth, numFrames) {
  const positions = [];
  const spacing = totalWidth / (numFrames + 1);
  for (let i = 1; i <= numFrames; i++) {
    positions.push((i * spacing) - (totalWidth / 2));
  }
  return positions;
}

// ----------------------------------------------------------------------
// NFT Creation
// ----------------------------------------------------------------------
const photographicGreyMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  metalness: 0.1,
  roughness: 0.7
});

function createNFT(index, position, rotation) {
  const frameGroup = new THREE.Group();
  const frameWidth = 2.0, frameHeight = 3.0;
  const pictureWidth = 1.8, pictureHeight = 2.7;

  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(frameWidth, frameHeight, 0.2),
    photographicGreyMaterial
  );
  frameGroup.add(frameBox);

  // Use Room2 folder images (index 0-27 for outer walls)
  const imageUrl = getRoom2NftUrl(index);

  const loader = new THREE.TextureLoader();
  loader.load(
    imageUrl,
    (tex) => {
      tex.encoding = THREE.LinearEncoding;
      const picturePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(pictureWidth, pictureHeight),
        new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.DoubleSide
        })
      );
      // Add necessary userData properties for click detection and viewer
      picturePlane.userData = {
        isNFT: true,
        index: index,
        imageUrl: imageUrl
      };
      picturePlane.position.z = 0.11;
      frameGroup.add(picturePlane);
      picturePlanes.push(picturePlane);

      // Measure NFT center Y for eye height calibration (first NFT only)
      if (!nftCenterMeasured) {
        nftCenterMeasured = true;
        const box = new THREE.Box3().setFromObject(picturePlane);
        const center = new THREE.Vector3();
        box.getCenter(center);
        console.log('🎯 ROOM 2 NFT center Y:', center.y);
        console.log('   (Current eye height:', groundLevels[1], ')');
      }
    },
    undefined,
    (err) => {
      console.error(`Error loading texture: ${imageUrl}`, err);
    }
  );

  frameGroup.position.set(position.x, position.y, position.z);
  frameGroup.rotation.set(rotation.x, rotation.y, rotation.z);
  scene.add(frameGroup);
}

// ----------------------------------------------------------------------
// Separate handler for divider NFTs
// ----------------------------------------------------------------------
function createDividerNFT(nftIndex, localX, localZ, rotationY, parentGroup) {
  const frameGroup = new THREE.Group();
  const frameWidth = 2.0, frameHeight = 3.0;
  const pictureWidth = 1.8, pictureHeight = 2.7;

  // Create frame
  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(frameWidth, frameHeight, 0.2),
    photographicGreyMaterial
  );
  frameGroup.add(frameBox);

  // Load NFT texture from Room2 folder (indices 28-43 for dividers)
  const textureUrl = getRoom2NftUrl(nftIndex);
  const loader = new THREE.TextureLoader();
  loader.load(
    textureUrl,
    (tex) => {
      tex.encoding = THREE.LinearEncoding;
      const picturePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(pictureWidth, pictureHeight),
        new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.DoubleSide
        })
      );
      picturePlane.userData = {
        isNFT: true,
        index: nftIndex,
        imageUrl: textureUrl
      };
      picturePlane.position.z = 0.11;
      frameGroup.add(picturePlane);
      picturePlanes.push(picturePlane);
    },
    undefined,
    (err) => { console.error(`Error loading texture: ${textureUrl}`, err); }
  );

  frameGroup.position.set(localX, 0, localZ);  // Adjusted Y position to 0, relative to divider wall
  frameGroup.rotation.y = rotationY;
  parentGroup.add(frameGroup);

  return frameGroup;
}

// ----------------------------------------------------------------------
// Create Room Elements
// ----------------------------------------------------------------------
const walls = createWallsAndFloor();
createCeiling();
createLights();

// Create NFTs on outer walls (28 NFTs from Room2 folder, indices 0-27)
const wallPositions7 = getPositions(40, 7); // 7 NFTs per wall

// Back wall NFTs (indices 0-6)
const backWallNFTPositions = wallPositions7.map(x => ({ pos: { x: x, y: 4, z: -19.5 }, rot: { x: 0, y: 0, z: 0 } }));
backWallNFTPositions.forEach((data, i) => createNFT(i, data.pos, data.rot));

// Left wall NFTs (indices 7-13)
const leftWallNFTPositions = wallPositions7.map(z => ({ pos: { x: -19.5, y: 4, z: z }, rot: { x: 0, y: Math.PI / 2, z: 0 } }));
leftWallNFTPositions.forEach((data, i) => createNFT(i + 7, data.pos, data.rot));

// Right wall NFTs (indices 14-20)
const rightWallNFTPositions = wallPositions7.map(z => ({ pos: { x: 19.5, y: 4, z: z }, rot: { x: 0, y: -Math.PI / 2, z: 0 } }));
rightWallNFTPositions.forEach((data, i) => createNFT(i + 14, data.pos, data.rot));

// Front wall NFTs (indices 21-27)
const frontWallNFTPositions = wallPositions7.map(x => ({ pos: { x: x, y: 4, z: 19.5 }, rot: { x: 0, y: Math.PI, z: 0 } }));
frontWallNFTPositions.forEach((data, i) => createNFT(i + 21, data.pos, data.rot));

// ----------------------------------------------------------------------
// Divider Wall with NFTs
// ----------------------------------------------------------------------
function createDivider() {
  // Create divider groups for left and right sections
  const leftDividerGroup = new THREE.Group();
  const rightDividerGroup = new THREE.Group();

  // Thicker wall but same style as room1
  const dividerGeometry = new THREE.BoxGeometry(15, 8, 0.5);
  const dividerMaterial = new THREE.MeshStandardMaterial({
    color: 0x505050,
    roughness: 0.7,
    metalness: 0.1
  });

  // Left divider wall
  const leftDividerMesh = new THREE.Mesh(dividerGeometry, dividerMaterial);
  leftDividerGroup.add(leftDividerMesh);
  leftDividerGroup.position.set(-10, 4, 0);
  scene.add(leftDividerGroup);

  // Right divider wall
  const rightDividerMesh = new THREE.Mesh(dividerGeometry, dividerMaterial);
  rightDividerGroup.add(rightDividerMesh);
  rightDividerGroup.position.set(10, 4, 0);
  scene.add(rightDividerGroup);

  // Calculate positions for 4 NFTs on each side
  const wallLength = 15; // Total length of each divider wall
  const margin = 1.5; // Margin from wall edges
  const usableLength = wallLength - (2 * margin); // Length available for frames
  const spacing = usableLength / 3; // Space between frames (3 gaps for 4 frames)
  const frameOffset = 0.4; // Offset from wall surface

  // Left divider - front side (indices 28-31)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(28 + i, localX, frameOffset, 0, leftDividerGroup);
  }

  // Left divider - back side (indices 32-35)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(32 + i, localX, -frameOffset, Math.PI, leftDividerGroup);
  }

  // Right divider - front side (indices 36-39)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(36 + i, localX, frameOffset, 0, rightDividerGroup);
  }

  // Right divider - back side (indices 40-43)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(40 + i, localX, -frameOffset, Math.PI, rightDividerGroup);
  }
}

// ----------------------------------------------------------------------
// Room 2 Collision System
// ----------------------------------------------------------------------
/**
 * Room 2 collision constants - derived from actual geometry
 *
 * Geometry:
 * - Outer walls at ±20, NFT frames at ±19.5, pictures at ±19.39
 * - Divider groups at x=±10, z=0
 * - Divider frames at z=±0.4, pictures at z=±0.51 (frameOffset + picture offset)
 */
const ROOM2_COLLISION = {
  // Player radius for collision (top-down cylinder)
  playerRadius: 0.3,

  // Outer wall bounds (keep existing good behavior)
  outerBounds: {
    minX: -19,
    maxX: 19,
    minZ: -19,
    maxZ: 19
  },

  // Divider sections (two separate dividers with gap in middle)
  dividers: {
    // Left divider (centered at x=-10)
    left: {
      minX: -17.5,
      maxX: -2.5
    },
    // Right divider (centered at x=10)
    right: {
      minX: 2.5,
      maxX: 17.5
    },
    // Picture plane positions in world space
    frontPictureZ: 0.51,   // Front-facing pictures (frameOffset 0.4 + picture 0.11)
    backPictureZ: -0.51    // Back-facing pictures (-0.4 - 0.11)
  }
};

/**
 * Apply Room 2 collision - outer walls + divider sections
 * Called once per frame after movement is computed
 *
 * @param {THREE.Vector3} position - Player position to constrain (modified in-place)
 * @param {THREE.Vector3} prevPosition - Player position from previous frame (for crossing detection)
 */
function applyRoom2Collisions(position, prevPosition) {
  const r = ROOM2_COLLISION.playerRadius;
  const outer = ROOM2_COLLISION.outerBounds;
  const div = ROOM2_COLLISION.dividers;

  // Outer wall collisions - keep as-is, working correctly per user feedback
  if (position.x < outer.minX + r) {
    position.x = outer.minX + r;
  }
  if (position.x > outer.maxX - r) {
    position.x = outer.maxX - r;
  }
  if (position.z < outer.minZ + r) {
    position.z = outer.minZ + r;
  }
  if (position.z > outer.maxZ - r) {
    position.z = outer.maxZ - r;
  }

  // Divider collision - keep player on whichever side they're on
  // Check if within either divider section's X range
  const inLeftDivider = (position.x > div.left.minX && position.x < div.left.maxX);
  const inRightDivider = (position.x > div.right.minX && position.x < div.right.maxX);

  if (inLeftDivider || inRightDivider) {
    const frontLimit = div.frontPictureZ + r;  // 0.51 + 0.3 = 0.81
    const backLimit = div.backPictureZ - r;    // -0.51 - 0.3 = -0.81

    // If on the front side (positive z), don't let them go past the front NFT plane
    if (position.z > 0) {
      if (position.z < frontLimit) {
        position.z = frontLimit;
      }
    }
    // If on the back side (negative z), don't let them go past the back NFT plane
    else {
      if (position.z > backLimit) {
        position.z = backLimit;
      }
    }
  }
}

// Legacy function name for compatibility - now calls new collision system
function checkCollisions() {
  applyRoom2Collisions(camera.position);
}

createDivider();

// ----------------------------------------------------------------------
// Portal
// ----------------------------------------------------------------------
// Portal back to Room 1 (main gallery)
const portalToRoom1 = createLinkedPortal({
  scene,
  fromRoom: '2',
  toRoom: '1',
  x: 0,
  y: 2,
  z: 0,
  rotationY: 0,
  createLabel: true
});

// Portal to Room 3 (vertical portal in corner at NFT height)
const portalToRoom3 = createLinkedPortal({
  scene,
  fromRoom: '2',
  toRoom: '3',
  x: 18,
  y: 4,
  z: -18,
  rotationY: -Math.PI / 4,  // Angled to face center of room
  createLabel: true
});

// Set up multi-portal proximity checker
const allPortals = [
  { ...portalToRoom1, name: 'Room 1 (Main Gallery)', url: 'index.html',
    position: new THREE.Vector3(0, 2, 0) },
  { ...portalToRoom3, name: 'Room 3', url: 'room3.html',
    position: new THREE.Vector3(18, 4, -18) }
];

const portalConfigs = allPortals.map(p => ({
  position: p.position,
  name: p.name,
  url: p.url,
  showDistance: 3.0,
  triggerDistance: 2.0  // Slightly larger for ground portal accessibility
}));

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: portalConfigs,
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// For backward compatibility with existing code
const portal = portalToRoom1;  // Keep reference for animation loop if needed
const room3Portal = portalToRoom3;

// ----------------------------------------------------------------------
// Portal Interaction
// ----------------------------------------------------------------------
// Portal proximity checking is now handled by createMultiPortalChecker() above

// ----------------------------------------------------------------------
// Loading Overlay Management
// ----------------------------------------------------------------------
const loadingOverlay = document.getElementById('loading-overlay');

// Add safety mechanism to ensure loading overlay doesn't stay stuck
document.addEventListener('keydown', function(event) {
  // Allow escape key to hide loading overlay if it gets stuck
  if (event.key === 'Escape' && loadingOverlay.style.display === 'flex') {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 500);
  }
});

// Hide loading overlay after initial load
setTimeout(() => {
  loadingOverlay.style.opacity = '0';
  setTimeout(() => {
    loadingOverlay.style.display = 'none';
  }, 500);
}, 1000);

// ----------------------------------------------------------------------
// Mobile Controls Integration
// ----------------------------------------------------------------------
let mobileControls = null;

mobileControls = initMobileControls({
  camera,
  controls,
  sensitivity: { look: 0.04, move: 1.0 },
  pitchLimits: { min: -Math.PI / 3, max: Math.PI / 4 },
  autoLevel: { enabled: true, speed: 0.3, threshold: 0.1 },
  onInteract: (raycaster) => {
    // Guard: Don't process interactions when viewer is already open
    if (nftViewer && nftViewer.isOpen && nftViewer.isOpen()) {
      return;
    }

    // Mobile tap interaction - find NFT under center crosshair
    const intersects = raycaster.intersectObjects(picturePlanes, false);
    if (intersects.length === 0) return;

    const hit = intersects[0];
    const nft = hit.object;

    // Front-facing check: reject surfaces not facing the camera
    if (hit.face && nft && nft.matrixWorld) {
      const worldNormal = hit.face.normal.clone().transformDirection(nft.matrixWorld);
      const camToHit = hit.point.clone().sub(camera.position).normalize();
      const alignment = worldNormal.dot(camToHit.clone().multiplyScalar(-1));
      if (alignment < 0.5) return;
    }

    // Validate NFT and distance
    if (!nft.userData?.isNFT) return;
    if (hit.distance > MAX_NFT_INTERACTION_DISTANCE) return;

    if (nftViewer) {
      nftViewer.openByMesh(nft);
    }
  }
});

// Hide desktop tooltip on mobile
if (mobileControls && mobileControls.enabled) {
  const desktopTooltip = document.getElementById('controls-description');
  if (desktopTooltip) {
    desktopTooltip.style.display = 'none';
  }
}

// ----------------------------------------------------------------------
// Initialize Unified NFT Viewer
// ----------------------------------------------------------------------
// Check if mobile controls are active for resetInput calls
const mobileActive = mobileControls && mobileControls.enabled;

nftViewer = initUnifiedNFTViewer({
  getNFTList: () =>
    picturePlanes
      .filter(p => p.userData?.isNFT)
      .sort((a, b) => (a.userData.index ?? 0) - (b.userData.index ?? 0))
      .map(mesh => ({
        mesh,
        url: mesh.userData.imageUrl,
        title: `NFT #${mesh.userData.index}`,
        description: '',
        index: mesh.userData.index
      })),
  controls,
  enablePortraitSwipe: true,  // Enable portrait mode with swipe navigation
  onOpen: () => {
    if (mobileActive && mobileControls.resetInput) {
      mobileControls.resetInput();
    }
  },
  onClose: () => {
    if (mobileActive && mobileControls.resetInput) {
      mobileControls.resetInput();
    }
  }
});

// ----------------------------------------------------------------------
// Desktop Click Handler
// ----------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handleNFTClick(event) {
  // If viewer is already open, let the viewer handle clicks
  if (nftViewer && nftViewer.isOpen()) {
    return;
  }

  // Only process clicks when controls are locked (in-game mode)
  if (!controls.isLocked) {
    // If not locked, lock on click
    controls.lock();
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(picturePlanes, false);
  if (intersects.length === 0) return;

  const hit = intersects[0];
  const object = hit.object;

  // Front-facing check: reject surfaces not facing the camera
  if (hit.face && object && object.matrixWorld) {
    const worldNormal = hit.face.normal.clone().transformDirection(object.matrixWorld);
    const camToHit = hit.point.clone().sub(camera.position).normalize();
    const alignment = worldNormal.dot(camToHit.clone().multiplyScalar(-1));
    if (alignment < 0.5) return;
  }

  // Validate NFT and distance
  if (!object.userData?.isNFT) return;
  if (hit.distance > MAX_NFT_INTERACTION_DISTANCE) return;

  if (nftViewer) {
    nftViewer.openByMesh(object);
    event.preventDefault();
    event.stopPropagation();
  }
}

window.addEventListener('click', handleNFTClick);

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Update jump physics and ensure camera stays on the ground level.
  const groundLevel = groundLevels[1];
  if (isJumping) {
    camera.position.y += jumpVelocity * delta;
    jumpVelocity += gravity * delta;
    if (camera.position.y < groundLevel) {
      camera.position.y = groundLevel;
      isJumping = false;
      jumpVelocity = 0;
    }
  } else {
    camera.position.y = groundLevel;
  }

  // Update mobile controls
  if (mobileControls && mobileControls.enabled) {
    mobileControls.updateAutoLevel(delta);
    mobileControls.updateCameraRotation();
  }

  const isActiveControls = controls.isLocked || (mobileControls && mobileControls.enabled);
  if (isActiveControls) {
    const player = controls.getObject();

    // Store previous position before movement
    prevPosition.copy(player.position);

    // Apply mobile speed scaling: halve speed on mobile for better control
    const isMobileActive = mobileControls && mobileControls.enabled;
    const baseSpeed = MOVEMENT_CONFIG.getEffectiveSpeed('room2');
    const effectiveSpeed = isMobileActive ? baseSpeed * 0.5 : baseSpeed;
    const speedDelta = effectiveSpeed * delta;

    velocity.x = 0;
    velocity.z = 0;
    direction.z = Number(window.moveForward) - Number(window.moveBackward);
    direction.x = Number(window.moveRight) - Number(window.moveLeft);
    direction.normalize();
    if (window.moveForward || window.moveBackward) velocity.z -= direction.z * speedDelta;
    if (window.moveLeft || window.moveRight) velocity.x -= direction.x * speedDelta;
    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);

    // Check collisions with crossing detection
    applyRoom2Collisions(player.position, prevPosition);

    // Check portal proximity
    checkPortalProximity();
  }

  // Animate portals using standardized system
  allPortals.forEach(portalObj => {
    animateLinkedPortal(portalObj.portal, portalObj.glow);
  });

  renderer.render(scene, camera);
}

animate();

// Initialize speed control UI
initSpeedControl();

// ----------------------------------------------------------------------
// Handle Window Resize
// ----------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
