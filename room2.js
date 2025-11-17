import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getNftUrl } from './src/core/asset-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';
import { initScene } from './src/core/scene-setup.js';
import { initNFTViewer } from './src/core/nft-viewer.js';
import { applyOuterWallCollision, applyDividerCollision } from './src/core/collision-helpers.js';
import { initMobileControls } from './src/core/mobile-controls.js';

// ----------------------------------------------------------------------
// Global Variables for Jump Physics
// ----------------------------------------------------------------------
const groundLevels = { 1: 4.0 }; // Eye height set to measured NFT center Y (data-driven)
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;

// ----------------------------------------------------------------------
// Global Variables and Picture Viewer Setup
// ----------------------------------------------------------------------
let picturePlanes = [];
let nftCenterMeasured = false;  // Flag to measure NFT center Y only once

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: groundLevels[1], z: 5 },
  background: 0x0a0a0a,
  outputEncoding: 'Linear'
});

// Room 2 uses FogExp2 (not regular Fog)
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

// Clock for animation timing
const clock = new THREE.Clock();

// ----------------------------------------------------------------------
// Controls & Movement Setup
// ----------------------------------------------------------------------
// Controls are now initialized by initScene()
// NFT click handling is managed by initNFTViewer()

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const prevPosition = new THREE.Vector3();  // Track previous position for collision detection
// Movement speed now using shared config (was 20.0)

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space':
      if (!isJumping) {
        isJumping = true;
        jumpVelocity = 8;
      }
      break;
    case 'Escape':
      // Viewer close is handled by initNFTViewer
      // This only handles unlocking controls in normal gameplay
      controls.unlock();
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyD': moveRight = false; break;
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

  const nftIndex = index + 29; // Adjusted to start from nft29
  const imageUrl = getNftUrl(nftIndex);
  
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
      // Add necessary userData properties for click detection and slider functionality
      picturePlane.userData = {
        isNFT: true,
        index: nftIndex,
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
// NFT Viewer initialization will happen after all NFTs are created
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Separate handler for divider NFTs
// ----------------------------------------------------------------------
function createDividerNFT(nftNumber, localX, localZ, rotationY, parentGroup) {
  const frameGroup = new THREE.Group();
  const frameWidth = 2.0, frameHeight = 3.0;
  const pictureWidth = 1.8, pictureHeight = 2.7;
  
  // Create frame
  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(frameWidth, frameHeight, 0.2),
    photographicGreyMaterial
  );
  frameGroup.add(frameBox);

  // Load NFT texture
  const textureUrl = getNftUrl(nftNumber);
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
        index: nftNumber,
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

// Create NFTs on outer walls (28 NFTs, numbers 29-56)
const wallPositions7 = getPositions(40, 7); // 7 NFTs per wall

// Back wall NFTs (29-35)
const backWallNFTPositions = wallPositions7.map(x => ({ pos: { x: x, y: 4, z: -19.5 }, rot: { x: 0, y: 0, z: 0 } }));
backWallNFTPositions.forEach((data, i) => createNFT(i, data.pos, data.rot));

// Left wall NFTs (36-42)
const leftWallNFTPositions = wallPositions7.map(z => ({ pos: { x: -19.5, y: 4, z: z }, rot: { x: 0, y: Math.PI / 2, z: 0 } }));
leftWallNFTPositions.forEach((data, i) => createNFT(i + 7, data.pos, data.rot));

// Right wall NFTs (43-49)
const rightWallNFTPositions = wallPositions7.map(z => ({ pos: { x: 19.5, y: 4, z: z }, rot: { x: 0, y: -Math.PI / 2, z: 0 } }));
rightWallNFTPositions.forEach((data, i) => createNFT(i + 14, data.pos, data.rot));

// Front wall NFTs (50-56)
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

  // Left divider - front side (NFTs 57-60)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(57 + i, localX, frameOffset, 0, leftDividerGroup);
  }

  // Left divider - back side (NFTs 61-64)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(61 + i, localX, -frameOffset, Math.PI, leftDividerGroup);
  }

  // Right divider - front side (NFTs 65-68)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(65 + i, localX, frameOffset, 0, rightDividerGroup);
  }

  // Right divider - back side (NFTs 69-72)
  for (let i = 0; i < 4; i++) {
    const localX = -wallLength/2 + margin + (i * spacing);
    createDividerNFT(69 + i, localX, -frameOffset, Math.PI, rightDividerGroup);
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

  // Apply outer wall collision using centralized helper
  applyOuterWallCollision(position, {
    minX: outer.minX,
    maxX: outer.maxX,
    minZ: outer.minZ,
    maxZ: outer.maxZ,
    radius: r
  });

  // Apply left divider collision using centralized helper
  applyDividerCollision(position, {
    dividerX: { min: div.left.minX, max: div.left.maxX },
    frontLimit: div.frontPictureZ + r,  // 0.51 + 0.3 = 0.81
    backLimit: div.backPictureZ - r     // -0.51 - 0.3 = -0.81
  });

  // Apply right divider collision using centralized helper
  applyDividerCollision(position, {
    dividerX: { min: div.right.minX, max: div.right.maxX },
    frontLimit: div.frontPictureZ + r,  // 0.51 + 0.3 = 0.81
    backLimit: div.backPictureZ - r     // -0.51 - 0.3 = -0.81
  });
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

// Portal to Room 3 (vertical portal in corner)
const portalToRoom3 = createLinkedPortal({
  scene,
  fromRoom: '2',
  toRoom: '3',
  x: 18,
  y: 4.0,
  z: -18,
  createLabel: true
});

// Set up multi-portal proximity checker
const allPortals = [
  { ...portalToRoom1, name: 'Room 1 (Main Gallery)', url: 'index.html',
    position: new THREE.Vector3(0, 2, 0) },
  { ...portalToRoom3, name: 'Room 3', url: 'room3.html',
    position: new THREE.Vector3(18, 4.0, -18) }
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

  // Update mobile controls (auto-level and camera rotation)
  if (mobileControls.enabled) {
    mobileControls.updateAutoLevel(delta);
    mobileControls.updateCameraRotation();
  }

  // Allow movement on desktop (pointer locked) or mobile (mobile controls enabled)
  const isActiveControls = controls.isLocked || (mobileControls && mobileControls.enabled);
  if (isActiveControls) {
    const player = controls.getObject();

    // Store previous position before movement
    prevPosition.copy(player.position);

    const speedDelta = MOVEMENT_CONFIG.getEffectiveSpeed('room2') * delta;
    velocity.x = 0;
    velocity.z = 0;
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    if (moveForward || moveBackward) velocity.z -= direction.z * speedDelta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speedDelta;
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
// Initialize NFT Viewer
// ----------------------------------------------------------------------
// Prepare NFT metadata from picturePlanes
const nftMetadata = picturePlanes
  .filter(plane => plane.userData && plane.userData.isNFT)
  .map(plane => ({
    id: plane.userData.index,
    url: plane.userData.imageUrl,
    title: `NFT #${plane.userData.index}`,
    description: ''
  }))
  .sort((a, b) => a.id - b.id);

// Initialize the NFT viewer
const nftViewer = initNFTViewer({
  scene,
  camera,
  controls,
  renderer,
  nftMeshes: picturePlanes,
  nftMetadata
});

// ----------------------------------------------------------------------
// Mobile Controls Integration
// ----------------------------------------------------------------------
const mobileControls = initMobileControls({
  camera,
  controls,
  sensitivity: { look: 0.04, move: 1.0 },
  pitchLimits: { min: -Math.PI / 3, max: Math.PI / 4 },
  autoLevel: { enabled: true, speed: 0.3, threshold: 0.1 },
  onInteract: (raycaster) => {
    const intersects = raycaster.intersectObjects(picturePlanes, false);
    if (intersects.length > 0) {
      const nft = intersects[0].object;
      if (nft.userData?.isNFT && typeof nftViewer?.open === 'function') {
        nftViewer.open(nft.userData.index);  // Pass NFT ID directly
      }
    }
  }
});

// ----------------------------------------------------------------------
// Handle Window Resize
// ----------------------------------------------------------------------
// Resize handling is now managed by initScene()
