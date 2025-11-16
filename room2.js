import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getNftUrl } from './src/core/asset-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';

// ----------------------------------------------------------------------
// Global Variables for Jump Physics
// ----------------------------------------------------------------------
const groundLevels = { 1: 3.2 }; // Raised eye height for NFT center alignment at close distance
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;

// ----------------------------------------------------------------------
// Global Variables and Picture Viewer Setup
// ----------------------------------------------------------------------
let picturePlanes = [];

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
viewerOverlay.style.flexDirection = 'column';
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
purchaseLink.href = 'https://opensea.io';
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
      controls.lock();
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
  controls.unlock();
}

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

document.addEventListener('click', () => {
  if (viewerOverlay.style.display !== 'flex') {
    controls.lock();
  }
});

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
      if (viewerOverlay.style.display === 'flex') {
        viewerOverlay.style.display = 'none';
        controls.lock();
      } else {
        controls.unlock();
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
// Centralized Click Handler
// ----------------------------------------------------------------------
function handleClick(event) {
  // If the viewer is open, clicks are handled by the viewer's event listener
  if (viewerOverlay.style.display === 'flex') return;
  
  // Check if we clicked on an NFT
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);
  
  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(picturePlanes, false);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (object.userData && object.userData.isNFT) {
      console.log("NFT clicked:", object.userData.index); // Debug log
      openImageViewer(object.userData.imageUrl, object.userData.index);
      event.stopPropagation(); // Prevent other click handlers from firing
      return;
    }
  }
  
  // If we didn't click on an NFT and controls are not locked, lock them
  if (!controls.isLocked) {
    controls.lock();
    event.stopPropagation(); // Prevent other click handlers from firing
  }
}

// Remove any existing click listeners to prevent duplicates
window.removeEventListener('click', onNFTClick);
window.removeEventListener('click', handleClick);
window.addEventListener('click', handleClick);

// ----------------------------------------------------------------------
// NFT Click Detection (Legacy function - now handled by handleClick)
// ----------------------------------------------------------------------
function onNFTClick(event) {
  // This function is now handled by the centralized click handler
  console.log("onNFTClick is deprecated, using centralized click handler instead");
}

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

// Portal to Room 3 (ground portal in corner)
const portalToRoom3 = createLinkedPortal({
  scene,
  fromRoom: '2',
  toRoom: '3',
  x: 18,
  y: 1.2,
  z: -18,
  rotationX: -Math.PI / 2,  // Flat on ground (horizontal orientation)
  createLabel: true
});

// Set up multi-portal proximity checker
const allPortals = [
  { ...portalToRoom1, name: 'Room 1 (Main Gallery)', url: 'index.html',
    position: new THREE.Vector3(0, 2, 0) },
  { ...portalToRoom3, name: 'Room 3', url: 'room3.html',
    position: new THREE.Vector3(18, 1.2, -18) }
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

  if (controls.isLocked) {
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
// Handle Window Resize
// ----------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
