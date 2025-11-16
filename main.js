import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getNftUrl } from './src/core/asset-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';

// ----------------------------------------------------------------------
// Global Variables for Jump Physics
// ----------------------------------------------------------------------
const groundLevels = { 1: 2 };
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;

// ----------------------------------------------------------------------
// Global Variables and Picture Viewer Setup
// ----------------------------------------------------------------------
let picturePlanes = [];  // Store picture plane meshes for click detection

// Keep track of all NFTs in the room for the slider functionality
const allNFTs = [];
let currentNFTIndex = -1;

// Create a full-screen image viewer overlay (initially hidden)
const viewerOverlay = document.createElement('div');
viewerOverlay.style.position = 'fixed';
viewerOverlay.style.top = '0';
viewerOverlay.style.left = '0';
viewerOverlay.style.width = '100%';
viewerOverlay.style.height = '100%';
viewerOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
viewerOverlay.style.display = 'none';
viewerOverlay.style.alignItems = 'center';
viewerOverlay.style.justifyContent = 'center';
viewerOverlay.style.flexDirection = 'column'; // stack image and link vertically
viewerOverlay.style.zIndex = '1000';

// Create a container for the image and navigation arrows
const viewerContainer = document.createElement('div');
viewerContainer.style.position = 'relative';
viewerContainer.style.width = '80%';
viewerContainer.style.height = '80%';
viewerContainer.style.display = 'flex';
viewerContainer.style.alignItems = 'center';
viewerContainer.style.justifyContent = 'center';
viewerOverlay.appendChild(viewerContainer);

// Left arrow for navigation
const leftArrow = document.createElement('div');
leftArrow.style.position = 'absolute';
leftArrow.style.left = '20px';
leftArrow.style.fontSize = '48px';
leftArrow.style.color = 'white';
leftArrow.style.cursor = 'pointer';
leftArrow.style.userSelect = 'none';
leftArrow.innerHTML = '&#9664;'; // Left-pointing triangle
leftArrow.style.opacity = '0.7';
leftArrow.style.transition = 'opacity 0.2s';
leftArrow.addEventListener('mouseover', () => leftArrow.style.opacity = '1');
leftArrow.addEventListener('mouseout', () => leftArrow.style.opacity = '0.7');
viewerContainer.appendChild(leftArrow);

const viewerImage = document.createElement('img');
viewerImage.style.maxWidth = '90%';
viewerImage.style.maxHeight = '90%';
viewerImage.style.objectFit = 'contain';
viewerContainer.appendChild(viewerImage);

// Right arrow for navigation
const rightArrow = document.createElement('div');
rightArrow.style.position = 'absolute';
rightArrow.style.right = '20px';
rightArrow.style.fontSize = '48px';
rightArrow.style.color = 'white';
rightArrow.style.cursor = 'pointer';
rightArrow.style.userSelect = 'none';
rightArrow.innerHTML = '&#9654;'; // Right-pointing triangle
rightArrow.style.opacity = '0.7';
rightArrow.style.transition = 'opacity 0.2s';
rightArrow.addEventListener('mouseover', () => rightArrow.style.opacity = '1');
rightArrow.addEventListener('mouseout', () => rightArrow.style.opacity = '0.7');
viewerContainer.appendChild(rightArrow);

// NFT info display
const nftInfo = document.createElement('div');
nftInfo.style.marginTop = '20px';
nftInfo.style.color = 'white';
nftInfo.style.fontSize = '18px';
nftInfo.style.textAlign = 'center';
viewerOverlay.appendChild(nftInfo);

const purchaseLink = document.createElement('a');
purchaseLink.href = 'https://opensea.io';  // Placeholder link – update as needed.
purchaseLink.innerText = 'Buy NFT on OpenSea';
purchaseLink.style.marginTop = '20px';
purchaseLink.style.color = '#fff';
purchaseLink.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
purchaseLink.style.padding = '10px 20px';
purchaseLink.style.textDecoration = 'none';
purchaseLink.style.borderRadius = '5px';
viewerOverlay.appendChild(purchaseLink);

// Instructions for navigation
const viewerInstructions = document.createElement('div');
viewerInstructions.style.position = 'absolute';
viewerInstructions.style.bottom = '20px';
viewerInstructions.style.color = 'white';
viewerInstructions.style.fontSize = '14px';
viewerInstructions.style.opacity = '0.7';
viewerInstructions.textContent = 'Left/Right Click to Navigate • Press ESC to Close';
viewerOverlay.appendChild(viewerInstructions);

document.body.appendChild(viewerOverlay);

// Navigation handlers for the NFT viewer
function showPreviousNFT() {
  if (allNFTs.length === 0) return;
  
  currentNFTIndex--;
  if (currentNFTIndex < 0) currentNFTIndex = allNFTs.length - 1;
  
  updateNFTViewer();
}

function showNextNFT() {
  if (allNFTs.length === 0) return;
  
  currentNFTIndex++;
  if (currentNFTIndex >= allNFTs.length) currentNFTIndex = 0;
  
  updateNFTViewer();
}

function updateNFTViewer() {
  if (currentNFTIndex < 0 || currentNFTIndex >= allNFTs.length) return;
  
  const currentNFT = allNFTs[currentNFTIndex];
  viewerImage.src = currentNFT.imageUrl;
  nftInfo.textContent = `NFT #${currentNFT.index} (${currentNFTIndex + 1}/${allNFTs.length})`;
  purchaseLink.href = `https://opensea.io/assets/${currentNFT.index}`;
}

// Add click event listeners for navigation
leftArrow.addEventListener('click', (event) => {
  event.stopPropagation();
  showPreviousNFT();
});

rightArrow.addEventListener('click', (event) => {
  event.stopPropagation();
  showNextNFT();
});

// Handle mouse clicks on the viewer overlay for navigation
viewerOverlay.addEventListener('click', (event) => {
  // Only consider left and right mouse buttons
  if (event.button === 0) { // Left click
    showNextNFT();
  } else if (event.button === 2) { // Right click
    showPreviousNFT();
  }
  event.stopPropagation();
});

// Prevent context menu on right-click while in the viewer
viewerOverlay.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Handle keyboard navigation and escape to close
document.addEventListener('keydown', (event) => {
  if (viewerOverlay.style.display === 'flex') {
    if (event.key === 'Escape') {
      viewerOverlay.style.display = 'none';
      controls.lock(); // Re-enable controls when closing the viewer
    } else if (event.key === 'ArrowLeft') {
      showPreviousNFT();
    } else if (event.key === 'ArrowRight') {
      showNextNFT();
    }
  }
});

function openImageViewer(imageUrl, nftIndex) {
  // If this is the first time opening, gather all NFTs
  if (allNFTs.length === 0) {
    for (const plane of picturePlanes) {
      if (plane.userData && plane.userData.isNFT) {
        allNFTs.push({
          index: plane.userData.index,
          imageUrl: plane.userData.imageUrl
        });
      }
    }
    
    // Sort NFTs by index
    allNFTs.sort((a, b) => a.index - b.index);
  }
  
  // Find the index of the current NFT in the array
  currentNFTIndex = allNFTs.findIndex(nft => nft.index === nftIndex);
  if (currentNFTIndex === -1 && allNFTs.length > 0) {
    currentNFTIndex = 0;
  }
  
  updateNFTViewer();
  viewerOverlay.style.display = 'flex';
  controls.unlock(); // Disable controls when viewing an NFT
}

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
// Permanently set to night mode:
scene.background = new THREE.Color(0x0a0a0a); // Night mode background
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Start camera at ground level.
camera.position.set(0, groundLevels[1], 5);

// Clock for animation timing
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Set output encoding to Linear so that the pictures use their original brightness.
renderer.outputEncoding = THREE.LinearEncoding;
document.body.appendChild(renderer.domElement);

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
const controls = new PointerLockControls(camera, document.body);

// Only lock controls on click if we're not viewing an NFT
document.addEventListener('click', () => {
  if (viewerOverlay.style.display !== 'flex') {
    controls.lock();
  }
});

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
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
        jumpVelocity = 8; // initial jump velocity
      }
      break;
    case 'Escape':
      if (viewerOverlay.style.display === 'flex') {
        viewerOverlay.style.display = 'none';
        controls.lock(); // Re-enable controls when closing the viewer
      } else {
        controls.unlock(); // Allow normal escape functionality when not viewing NFT
      }
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Lower intensity for night mode
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0x00aaff, 0.5); // Cool blue tint
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// ----------------------------------------------------------------------
// Floor: Create a Random Tiled Texture (unchanged)
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
// Ceiling with an Optical Illusion (unchanged)
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
// Add click detection functionality for NFTs
// ----------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onNFTClick(event) {
  if (controls.isLocked === false) return;
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(picturePlanes, false);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (object.userData && object.userData.isNFT) {
      console.log("NFT clicked:", object.userData.index); // Debug log
      openImageViewer(object.userData.imageUrl, object.userData.index);
    }
  }
}

// Make sure we only add the click event listener once
window.removeEventListener('click', onNFTClick);
window.addEventListener('click', onNFTClick, false);

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
// Portal Interaction
// ----------------------------------------------------------------------
// Portal proximity checking is now handled by createMultiPortalChecker() above

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

  if (controls.isLocked) {
    const speedDelta = MOVEMENT_CONFIG.getEffectiveSpeed() * delta;
    velocity.x = 0;
    velocity.z = 0;
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    if (moveForward || moveBackward) velocity.z -= direction.z * speedDelta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speedDelta;
    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);

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

// ----------------------------------------------------------------------
// Handle Window Resize
// ----------------------------------------------------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
