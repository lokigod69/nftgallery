import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getNftUrl } from './src/core/asset-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';
import { initScene } from './src/core/scene-setup.js';
import { initUnifiedNFTViewer, MAX_NFT_INTERACTION_DISTANCE } from './src/core/nft-viewer.js';
import { applyOuterWallCollision, applyDividerCollision } from './src/core/collision-helpers.js';
import { initMobileControls } from './src/core/mobile-controls.js';

// ----------------------------------------------------------------------
// Global Variables for Jump Physics
// ----------------------------------------------------------------------
const groundLevels = { 1: 2.3 }; // Lowered for better NFT frame alignment
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;

// ----------------------------------------------------------------------
// Global Variables and Picture Viewer Setup
// ----------------------------------------------------------------------
let picturePlanes = [];  // Store picture plane meshes for click detection
let nftViewer = null;    // Unified viewer instance

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: groundLevels[1], z: 5 },
  background: 0x0a0a0a,
  outputEncoding: 'Linear'
});

// Room 1 uses FogExp2 (not regular Fog)
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

// Clock for animation timing
const clock = new THREE.Clock();

// ----------------------------------------------------------------------
// Audio Setup
// ----------------------------------------------------------------------
const listener = new THREE.AudioListener();
camera.add(listener);
const ambientSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/assets/ambient.mp3', function (buffer) {
  ambientSound.setBuffer(buffer);
  ambientSound.setLoop(true);
  ambientSound.setVolume(0.5);
  ambientSound.play();
});

// ----------------------------------------------------------------------
// Controls & Movement Setup
// ----------------------------------------------------------------------
// Controls are now initialized by initScene()
// Sync rotation to prevent spawn teleport (position sync handled by initScene)
controls.getObject().rotation.copy(camera.rotation);

// Initialize global movement flags (shared by desktop keyboard and mobile joystick)
window.moveForward = false;
window.moveBackward = false;
window.moveLeft = false;
window.moveRight = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const prevPosition = new THREE.Vector3();  // Track previous position for collision detection

// Jump function (shared by keyboard and mobile joystick tap)
function triggerJump() {
  if (!isJumping) {
    console.log('[R1] Jump triggered');
    isJumping = true;
    jumpVelocity = 8; // initial jump velocity
  }
}

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': window.moveForward = true; break;
    case 'KeyA': window.moveLeft = true; break;
    case 'KeyS': window.moveBackward = true; break;
    case 'KeyD': window.moveRight = true; break;
    case 'Space':
      triggerJump();
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Lower intensity for night mode
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0x00aaff, 0.5); // Cool blue tint
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// ----------------------------------------------------------------------
// Floor: Create a Random Tiled Texture
// ----------------------------------------------------------------------
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  // Fill entire canvas with a base color
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Divide the canvas into a 10x10 grid and randomly adjust some tiles
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
// Room Structure: Outer Walls, Floor & Ceiling (Single Room)
// ----------------------------------------------------------------------
let walls = {};

function createWallsAndFloor() {
  // Subtle reflective wall material
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x404040,
    roughness: 0.5,  // Lower roughness for subtle reflections
    metalness: 0.2   // Increased metalness for a slight sheen
  });

  const floorTexture = createFloorTexture();
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5;
  scene.add(floor);

  const wallGeometry = new THREE.PlaneGeometry(40, 15);
  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, 2.5, -20);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-20, 2.5, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(20, 2.5, 0);
  scene.add(rightWall);

  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, 2.5, 20);
  scene.add(frontWall);

  return { backWall, leftWall, rightWall, frontWall };
}
walls = createWallsAndFloor();

// ----------------------------------------------------------------------
// Ceiling with an Optical Illusion
// ----------------------------------------------------------------------
function createCeiling() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  const gridSize = 64;
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  const ceilingTexture = new THREE.CanvasTexture(canvas);
  ceilingTexture.wrapS = THREE.RepeatWrapping;
  ceilingTexture.wrapT = THREE.RepeatWrapping;
  ceilingTexture.repeat.set(1, 1);

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    map: ceilingTexture
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 10;
  scene.add(ceiling);
}
createCeiling();

// ----------------------------------------------------------------------
// Helper: Compute Evenly Spaced Positions for a Given Width
// ----------------------------------------------------------------------
function getPositions(totalWidth, numFrames) {
  const positions = [];
  const gap = totalWidth / (numFrames + 1);
  for (let i = 0; i < numFrames; i++) {
    positions.push(-totalWidth / 2 + (i + 1) * gap);
  }
  return positions;
}
const wallPositions5 = getPositions(40, 5);

// ----------------------------------------------------------------------
// NFT Frames on Outer Walls
// Using MeshBasicMaterial so that the images display unlit.
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

  const loader = new THREE.TextureLoader();
  loader.load(
    getNftUrl(index + 1),
    (tex) => {
      tex.encoding = THREE.LinearEncoding;
      const picturePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(pictureWidth, pictureHeight),
        new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.DoubleSide
        })
      );
      picturePlane.userData.isNFT = true;
      picturePlane.userData.index = index + 1;
      picturePlane.userData.imageUrl = getNftUrl(index + 1);
      picturePlane.position.z = 0.11;
      frameGroup.add(picturePlane);
      picturePlanes.push(picturePlane);
    },
    undefined,
    (err) => {
      console.error(`Error loading texture: nft${index + 1}.webp`, err);
    }
  );

  frameGroup.position.set(position.x, position.y, position.z);
  frameGroup.rotation.set(rotation.x, rotation.y, rotation.z);
  scene.add(frameGroup);
}

const backWallNFTPositions = wallPositions5.map(x => ({ pos: { x: x, y: 2, z: -19.5 }, rot: { x: 0, y: 0, z: 0 } }));
const leftWallNFTPositions = getPositions(40, 5).map(z => ({ pos: { x: -19.5, y: 2, z: z }, rot: { x: 0, y: Math.PI / 2, z: 0 } }));
const rightWallNFTPositions = getPositions(40, 5).map(z => ({ pos: { x: 19.5, y: 2, z: z }, rot: { x: 0, y: -Math.PI / 2, z: 0 } }));
const frontWallNFTPositions = wallPositions5.map(x => ({ pos: { x: x, y: 2, z: 19.5 }, rot: { x: 0, y: Math.PI, z: 0 } }));

backWallNFTPositions.forEach((data, i) => createNFT(i, data.pos, data.rot));
leftWallNFTPositions.forEach((data, i) => createNFT(i + 5, data.pos, data.rot));
rightWallNFTPositions.forEach((data, i) => createNFT(i + 10, data.pos, data.rot));
frontWallNFTPositions.forEach((data, i) => createNFT(i + 15, data.pos, data.rot));

// ----------------------------------------------------------------------
// Particle/Snow Effects on Outer Walls
// ----------------------------------------------------------------------
function createSnowForWall(wallMesh, frameCenters) {
  const particleCount = 300;
  const positions = [];
  const margin = 0.3;
  const halfPicW = 0.9 + margin;
  const halfPicH = 1.35 + margin;
  for (let i = 0; i < particleCount; i++) {
    const x = THREE.MathUtils.randFloat(-20, 20);
    const y = THREE.MathUtils.randFloat(-7.5, 7.5);
    let skip = false;
    for (const center of frameCenters) {
      if (Math.abs(x - center.x) < halfPicW && Math.abs(y - center.y) < halfPicH) {
        skip = true;
        break;
      }
    }
    if (!skip) positions.push(x, y, 0);
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0.8
  });
  const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
  particleSystem.position.z = 0.01;
  wallMesh.add(particleSystem);
}

const backWallFrameCenters = backWallNFTPositions.map(data => ({ x: data.pos.x, y: data.pos.y - 2.5 }));
const frontWallFrameCenters = frontWallNFTPositions.map(data => ({ x: data.pos.x, y: data.pos.y - 2.5 }));
const leftWallFrameCenters = leftWallNFTPositions.map(data => ({ x: data.pos.z, y: data.pos.y - 2.5 }));
const rightWallFrameCenters = rightWallNFTPositions.map(data => ({ x: -data.pos.z, y: data.pos.y - 2.5 }));

createSnowForWall(walls.backWall, backWallFrameCenters);
createSnowForWall(walls.frontWall, frontWallFrameCenters);
createSnowForWall(walls.leftWall, leftWallFrameCenters);
createSnowForWall(walls.rightWall, rightWallFrameCenters);

// ----------------------------------------------------------------------
// Divider (Mid-Room Wall) with Additional NFTs (Numbers 21-28)
// ----------------------------------------------------------------------
function createDivider() {
  const dividerGroup = new THREE.Group();
  const dividerGeometry = new THREE.BoxGeometry(30, 13, 0.2);
  const dividerMaterial = new THREE.MeshStandardMaterial({
    color: 0x505050,
    roughness: 0.7,
    metalness: 0.1
  });
  const dividerMesh = new THREE.Mesh(dividerGeometry, dividerMaterial);
  dividerGroup.add(dividerMesh);
  dividerGroup.position.set(0, 1.5, 0);
  scene.add(dividerGroup);

  function createDividerNFT(nftNumber, localX, localZ, rotationY) {
    const frameGroup = new THREE.Group();
    const frameWidth = 2.0, frameHeight = 3.0;
    const pictureWidth = 1.8, pictureHeight = 2.7;
    const frameBox = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, 0.2),
      photographicGreyMaterial
    );
    frameGroup.add(frameBox);

    const loader = new THREE.TextureLoader();
    loader.load(
      getNftUrl(nftNumber),
      (tex) => {
        tex.encoding = THREE.LinearEncoding;
        const picturePlane = new THREE.Mesh(
          new THREE.PlaneGeometry(pictureWidth, pictureHeight),
          new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.DoubleSide
          })
        );
        picturePlane.userData.isNFT = true;
        picturePlane.userData.index = nftNumber;
        picturePlane.userData.imageUrl = getNftUrl(nftNumber);
        picturePlane.position.z = 0.11;
        frameGroup.add(picturePlane);
        picturePlanes.push(picturePlane);
      },
      undefined,
      (err) => { console.error(`Error loading texture: nft${nftNumber}.webp`, err); }
    );
    frameGroup.position.set(localX, 0.5, localZ);
    frameGroup.rotation.y = rotationY;
    dividerGroup.add(frameGroup);
  }

  const dividerPositions = getPositions(30, 4);
  dividerPositions.forEach((localX, i) => {
    createDividerNFT(21 + i, localX, 0.21, 0);
  });
  dividerPositions.forEach((localX, i) => {
    createDividerNFT(25 + i, localX, -0.21, Math.PI);
  });
}
createDivider();

// ----------------------------------------------------------------------
// Initialize Mobile Controls
// ----------------------------------------------------------------------
const mobileControls = initMobileControls({
  camera,
  controls,
  sensitivity: {
    look: 0.04,
    move: 1.0
  },
  pitchLimits: {
    min: -Math.PI / 3,  // -60°
    max: Math.PI / 4    // +45°
  },
  autoLevel: {
    enabled: true,
    speed: 0.3,
    threshold: 0.1
  },
  onJump: () => {
    // Tap left joystick to jump
    triggerJump();
  },
  onInteract: (raycaster) => {
    // Guard: Don't process interactions when viewer is already open
    if (nftViewer && nftViewer.isOpen && nftViewer.isOpen()) {
      console.log('[R1 mobile] onInteract called but viewer is open, ignoring');
      return;
    }

    console.log('[R1 interact] mobile tap, performing raycast');

    // Mobile tap interaction - find NFT under center crosshair
    const intersects = raycaster.intersectObjects(picturePlanes, false);

    if (intersects.length === 0) {
      console.log('[R1 interact] no picturePlanes hit');
      return;
    }

    // Log full intersects list for debugging
    console.log(
      '[R1 interact] intersects:',
      intersects.map((hit, i) => ({
        i,
        distance: hit.distance.toFixed(2),
        name: hit.object.name || '(unnamed)',
        isNFT: !!hit.object.userData?.isNFT,
        userIndex: hit.object.userData?.index
      }))
    );

    const hit = intersects[0];
    const nft = hit.object;

    // Front-facing check: reject surfaces not facing the camera
    let isFrontFacing = true;
    if (hit.face && nft && nft.matrixWorld) {
      const worldNormal = hit.face.normal.clone().transformDirection(nft.matrixWorld);
      const camToHit = hit.point.clone().sub(camera.position).normalize();
      const alignment = worldNormal.dot(camToHit.clone().multiplyScalar(-1));

      console.log('[R1 interact] normal alignment', alignment.toFixed(3));

      if (alignment < 0.5) {
        isFrontFacing = false;
      }
    }

    if (!isFrontFacing) {
      console.log('[R1 interact] rejected: surface not front-facing enough');
      return;
    }

    console.log('[R1 interact]', {
      distance: hit.distance.toFixed(2),
      name: nft.name || '(unnamed)',
      isNFT: !!nft.userData?.isNFT,
      userIndex: nft.userData?.index
    });

    if (!nft.userData?.isNFT) {
      console.log('[R1 interact] hit non-NFT picturePlane, ignoring');
      return;
    }

    if (hit.distance > MAX_NFT_INTERACTION_DISTANCE) {
      console.log('[R1 interact] rejected: too far (distance', hit.distance.toFixed(2), ')');
      return;
    }

    if (nftViewer) {
      console.log('[R1 interact] accepted: opening NFT #', nft.userData.index);
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
  enablePortraitSwipe: true,  // Enable portrait mode with swipe navigation for Room 1
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
// Desktop Click Handler for NFTs
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
    // If not locked, lock on click (aligns with Room 2 behavior)
    controls.lock();
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(picturePlanes, false);

  if (intersects.length === 0) {
    console.log('[R1 interact] desktop click: no picturePlanes hit');
    return;
  }

  // Log full intersects list for debugging
  console.log(
    '[R1 interact] desktop intersects:',
    intersects.map((hit, i) => ({
      i,
      distance: hit.distance.toFixed(2),
      name: hit.object.name || '(unnamed)',
      isNFT: !!hit.object.userData?.isNFT,
      userIndex: hit.object.userData?.index
    }))
  );

  const hit = intersects[0];
  const object = hit.object;

  // Front-facing check: reject surfaces not facing the camera
  let isFrontFacing = true;
  if (hit.face && object && object.matrixWorld) {
    const worldNormal = hit.face.normal.clone().transformDirection(object.matrixWorld);
    const camToHit = hit.point.clone().sub(camera.position).normalize();
    const alignment = worldNormal.dot(camToHit.clone().multiplyScalar(-1));

    console.log('[R1 interact] desktop normal alignment', alignment.toFixed(3));

    if (alignment < 0.5) {
      isFrontFacing = false;
    }
  }

  if (!isFrontFacing) {
    console.log('[R1 interact] desktop rejected: surface not front-facing enough');
    return;
  }

  console.log('[R1 interact] desktop click:', {
    distance: hit.distance.toFixed(2),
    name: object.name || '(unnamed)',
    isNFT: !!object.userData?.isNFT,
    userIndex: object.userData?.index
  });

  if (!object.userData?.isNFT) {
    console.log('[R1 interact] hit non-NFT picturePlane, ignoring');
    return;
  }

  if (hit.distance > MAX_NFT_INTERACTION_DISTANCE) {
    console.log('[R1 interact] rejected: too far (distance', hit.distance.toFixed(2), ')');
    return;
  }

  if (nftViewer) {
    console.log('[R1 interact] accepted: opening NFT #', object.userData.index);
    nftViewer.openByMesh(object);
    event.preventDefault();
    event.stopPropagation();
  }
}

// Make sure we only add the click event listener once
window.removeEventListener('click', handleNFTClick);
window.addEventListener('click', handleNFTClick, false);

// Only lock controls on click if we're not viewing an NFT
document.addEventListener('click', () => {
  if (nftViewer && !nftViewer.isOpen()) {
    controls.lock();
  }
});

// ----------------------------------------------------------------------
// Loading Overlay Management
// ----------------------------------------------------------------------
const loadingOverlay = document.getElementById('loading-overlay');
loadingOverlay.style.opacity = '1';

// Fade out loading overlay
setTimeout(() => {
  loadingOverlay.style.opacity = '0';
  setTimeout(() => {
    loadingOverlay.style.display = 'none';
  }, 1000);
}, 3000);

// ----------------------------------------------------------------------
// Portal Management
// ----------------------------------------------------------------------
// Portal to Room 2 (back-left corner) - Using standardized portal system
const portalToRoom2 = createLinkedPortal({
  scene,
  fromRoom: '1',
  toRoom: '2',
  x: -18,
  y: 2,
  z: -18,
  rotationY: -Math.PI / 4,
  createLabel: true
});

// Portal back to Room 0 (back-right corner) - Using standardized portal system
const portalToRoom0 = createLinkedPortal({
  scene,
  fromRoom: '1',
  toRoom: '0',
  x: 18,
  y: 2,
  z: -18,
  rotationY: Math.PI / 4,
  createLabel: true
});

// Set up multi-portal proximity checker
const allPortals = [
  {
    ...portalToRoom2,
    name: 'Room 2',
    url: 'room2.html',
    position: new THREE.Vector3(-18, 2, -18)
  },
  {
    ...portalToRoom0,
    name: 'Ocean Hub (Room 0)',
    url: 'room0.html',
    position: new THREE.Vector3(18, 2, -18)
  }
];

const portalConfigs = allPortals.map(p => ({
  position: p.position,
  name: p.name,
  url: p.url,
  showDistance: 4.0,
  triggerDistance: 1.5
}));

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: portalConfigs,
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// ----------------------------------------------------------------------
// Room 1 Collision System
// ----------------------------------------------------------------------
/**
 * Room 1 collision constants - derived from actual NFT and wall positions
 *
 * Geometry:
 * - Walls at ±20 units
 * - NFT frames at ±19.5 units (0.5 from wall)
 * - Picture planes at ±19.39 units (frames + 0.11 offset)
 * - Divider at z=0, frames at ±0.21, pictures at ±0.32
 */
const ROOM1_COLLISION = {
  // Player radius for collision (top-down cylinder)
  playerRadius: 0.3,

  // Outer wall picture plane positions (where NFTs actually are)
  walls: {
    back:  -19.39,   // Back wall pictures (z position)
    front:  19.39,   // Front wall pictures (z position)
    left:  -19.39,   // Left wall pictures (x position)
    right:  19.39    // Right wall pictures (x position)
  },

  // Divider wall (center divider with NFTs on both sides)
  divider: {
    minX: -15.0,     // Divider spans x=-15 to x=15
    maxX:  15.0,
    frontPictureZ:  0.32,  // Front-facing pictures (positive z side)
    backPictureZ:  -0.32   // Back-facing pictures (negative z side)
  }
};

/**
 * Apply Room 1 collision - prevents walking through/behind NFTs and walls
 * Called once per frame after movement is computed
 *
 * @param {THREE.Vector3} position - Player position to constrain (modified in-place)
 * @param {THREE.Vector3} prevPosition - Player position from previous frame (for crossing detection)
 */
function applyRoom1Collisions(position, prevPosition) {
  const r = ROOM1_COLLISION.playerRadius;
  const w = ROOM1_COLLISION.walls;
  const d = ROOM1_COLLISION.divider;

  // Apply outer wall collision using centralized helper
  applyOuterWallCollision(position, {
    minX: w.left,
    maxX: w.right,
    minZ: w.back,
    maxZ: w.front,
    radius: r
  });

  // Apply divider collision using centralized helper
  applyDividerCollision(position, {
    dividerX: { min: d.minX, max: d.maxX },
    frontLimit: d.frontPictureZ + r,  // 0.32 + 0.3 = 0.62
    backLimit: d.backPictureZ - r     // -0.32 - 0.3 = -0.62
  });
}

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

  // Mobile controls update (auto-level and camera rotation)
  if (mobileControls && mobileControls.enabled) {
    mobileControls.updateAutoLevel(delta);
    mobileControls.updateCameraRotation();
  }

  // Allow movement on desktop (pointer locked) or mobile (mobile controls enabled)
  const isActiveControls = controls.isLocked || (mobileControls && mobileControls.enabled);
  if (isActiveControls) {
    const player = controls.getObject();

    // Store previous position before movement
    prevPosition.copy(player.position);

    // Apply mobile speed scaling: reduce to 30% on mobile for better control
    const isMobileActive = mobileControls && mobileControls.enabled;
    const baseSpeed = MOVEMENT_CONFIG.getEffectiveSpeed('room1');
    const effectiveSpeed = isMobileActive ? baseSpeed * 0.3 : baseSpeed;
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

    // Apply Room 1 collision system with crossing detection
    applyRoom1Collisions(player.position, prevPosition);

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
