// Changes made:
// - Created room5.js implementing the "Eternal Eclipse" theme
// - Added a massive dark sun with corona effect at the center of the ceiling
// - Created a shadowy, atmospheric environment with minimal lighting
// - Implemented floating NFTs arranged in a dodecagon formation
// - Added reflective obsidian floor with warped reflections
// - Created matte black walls with subtle fractured patterns
// - Implemented dynamic shadow and lighting system
// - Added atmospheric haze effect
// - Added portal back to Room 4
// - Updated to display 12 NFT frames (assets 131-142) instead of 8 frames

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { getNftUrl } from './src/core/asset-utils.js';
import { createLinkedPortal, createPortalLabel, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getPortalStyle } from './src/core/portal-styles.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';
import { initScene } from './src/core/scene-setup.js';
import { initNFTViewer } from './src/core/nft-viewer.js';
import { initMobileControls } from './src/core/mobile-controls.js';

// ----------------------------------------------------------------------
// Global Variables
// ----------------------------------------------------------------------
const groundLevel = 0;
const eyeHeight = 5.0; // UPDATED: Raised camera height to be level with the NFTs
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;
// Movement speed now using shared config (was 90.0)
const textureLoader = new THREE.TextureLoader();

// Room dimensions
const roomRadius = 30;
const ceilingHeight = 20;

// Keep track of all NFTs
const allNFTs = [];
let currentNFTIndex = -1;
const picturePlanes = [];

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
leftArrow.innerHTML = '&#9664;';
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
rightArrow.innerHTML = '&#9654;';
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

const viewerInstructions = document.createElement('div');
viewerInstructions.style.position = 'absolute';
viewerInstructions.style.bottom = '20px';
viewerInstructions.style.color = 'white';
viewerInstructions.style.fontSize = '14px';
viewerInstructions.style.opacity = '0.7';
viewerInstructions.textContent = 'Left/Right Click to Navigate • Press ESC to Close';
viewerOverlay.appendChild(viewerInstructions);

document.body.appendChild(viewerOverlay);

// Hide loading overlay when the page loads
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
});

// ----------------------------------------------------------------------
// NFT Viewer Functions
// ----------------------------------------------------------------------
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
      // Prevent the event from propagating to avoid requiring multiple presses
      event.preventDefault();
      event.stopPropagation();
    } else if (event.key === 'ArrowRight') {
      showNextNFT();
      // Prevent the event from propagating to avoid requiring multiple presses
      event.preventDefault();
      event.stopPropagation();
    }
  }
});

// Define a separate variable to track key states for NFT navigation
const nftNavKeyStates = {};

// Create a more responsive keyboard handler specifically for NFT navigation
function setupNFTKeyboardNavigation() {
  // Remove any existing handlers with the same function to avoid duplicates
  document.removeEventListener('keydown', handleNFTKeyDown);
  
  // Add the dedicated handler
  document.addEventListener('keydown', handleNFTKeyDown);
}

// Handle NFT navigation key presses
function handleNFTKeyDown(event) {
  // Only process if the viewer is open and the key hasn't been pressed already
  if (viewerOverlay.style.display === 'flex' && !nftNavKeyStates[event.code]) {
    nftNavKeyStates[event.code] = true;
    
    if (event.code === 'ArrowLeft') {
      showPreviousNFT();
      event.preventDefault();
      event.stopPropagation();
    } else if (event.code === 'ArrowRight') {
      showNextNFT();
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Reset key state after a short delay to allow for quick repeat presses
    setTimeout(() => {
      nftNavKeyStates[event.code] = false;
    }, 150); // Short delay to prevent accidental double triggers
  }
}

// Call setup function to initialize the NFT keyboard navigation
setupNFTKeyboardNavigation();

// Add keyup handler to reset key states
document.addEventListener('keyup', (event) => {
  if (viewerOverlay.style.display === 'flex') {
    nftNavKeyStates[event.code] = false;
  }
});

function openImageViewer(imageUrl, nftIndex) {
  console.log("Opening image viewer for:", imageUrl);
  
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
  
  // Reset key states when opening the viewer
  // This ensures keyboard navigation works immediately
  Object.keys(nftNavKeyStates).forEach(key => {
    nftNavKeyStates[key] = false;
  });
  
  // Focus the viewer overlay to ensure keyboard events work properly
  viewerOverlay.tabIndex = -1;
  viewerOverlay.focus();
}

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: groundLevel + eyeHeight, z: 0 },
  background: 0x000000
});

// Room 5 uses FogExp2 for subtle depth effect
scene.fog = new THREE.FogExp2(0x000000, 0.015);

// Room 5 specific renderer settings
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows for the eclipse effect

// Note: Pointer lock controls, resize handling, and overlay management
// are now provided by initScene()

// Click handler
function handleClick(event) {
  if (viewerOverlay.style.display === 'flex') return;
  
  // Check if we clicked on an NFT
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObjects(picturePlanes, false);
  
  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (object.userData && object.userData.isNFT) {
      console.log("NFT clicked:", object.userData.index);
      openImageViewer(object.userData.imageUrl, object.userData.index);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
  
  // If we didn't click on an NFT and controls are not locked, lock them
  if (!controls.isLocked && event.target === renderer.domElement) {
    controls.lock();
    event.preventDefault();
    event.stopPropagation();
  }
}

window.removeEventListener('click', handleClick);
window.addEventListener('click', handleClick);

// Movement variables - now on window object for mobile/desktop sharing
window.moveForward = false;
window.moveBackward = false;
window.moveLeft = false;
window.moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keyStates = {};

// Key handlers
const onKeyDown = function (event) {
  keyStates[event.code] = true;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      window.moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      window.moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      window.moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      window.moveRight = true;
      break;
    case 'Space':
      if (!isJumping) {
        jumpVelocity = 10;
        isJumping = true;
      }
      break;
  }
};

const onKeyUp = function (event) {
  keyStates[event.code] = false;

  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      window.moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      window.moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      window.moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      window.moveRight = false;
      break;
  }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// ----------------------------------------------------------------------
// Create the Eternal Eclipse Room
// ----------------------------------------------------------------------

// Create matte black walls with fracture patterns
function createWalls() {
  // Create circular wall with precise height to match ceiling
  const wallGeometry = new THREE.CylinderGeometry(roomRadius, roomRadius, ceilingHeight, 64, 1, true);
  
  // UPDATED: Create a highly reflective mirror material for the walls
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0f0f0, // Light silver color for better reflections
    roughness: 0.01,  // Extremely smooth for mirror effect
    metalness: 0.98,  // Highly metallic for reflections
    side: THREE.BackSide, // Render inside of cylinder
    transparent: false,
    opacity: 1.0,
    depthWrite: true
  });
  
  const walls = new THREE.Mesh(wallGeometry, wallMaterial);
  walls.position.y = ceilingHeight / 2; // Position exactly at half height
  walls.receiveShadow = true;
  walls.userData.isPartOfRoom = true;
  scene.add(walls);
  
  // Create top rim to seal the gap between walls and ceiling
  const rimGeometry = new THREE.RingGeometry(roomRadius - 0.1, roomRadius + 0.1, 64);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x010101, // Match ceiling color
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.rotation.x = Math.PI / 2; // Horizontal orientation
  rim.position.y = ceilingHeight - 0.01; // Just below ceiling
  rim.userData.isPartOfRoom = true;
  scene.add(rim);
  
  // Create an environment map for reflections with higher resolution
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter
  });
  
  const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
  cubeCamera.position.set(0, ceilingHeight / 2, 0);
  scene.add(cubeCamera);
  
  // Update the environment map
  function updateEnvironmentMap() {
    // Hide the walls temporarily to prevent recursion
    walls.visible = false;
    cubeCamera.update(renderer, scene);
    walls.visible = true;
    
    // Apply the environment map to the walls and floor
    wallMaterial.envMap = cubeRenderTarget.texture;
    wallMaterial.envMapIntensity = 1.5; // Increase reflection intensity
    wallMaterial.needsUpdate = true;
    
    const floor = scene.getObjectByName('reflectiveFloor');
    if (floor && floor.material) {
      floor.material.envMap = cubeRenderTarget.texture;
      floor.material.needsUpdate = true;
    }
  }
  
  // Add to animation loop (will be called in animate())
  walls.userData.updateEnvironmentMap = updateEnvironmentMap;
  
  // Run initial update
  updateEnvironmentMap();
  
  return walls;
}

// Create the dark obsidian floor with reflections
function createFloor() {
  // Create a large circular floor
  const floorGeometry = new THREE.CircleGeometry(roomRadius, 64);
  
  // Create a custom shader material for the floor to have reflections
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x101010, // Near black
    roughness: 0.1,   // Very smooth for reflections
    metalness: 0.8,   // Highly reflective
    envMap: null      // Will be set when environment map is created
  });
  
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Lay flat
  floor.position.y = groundLevel;
  floor.receiveShadow = true;
  floor.name = 'reflectiveFloor'; // Name for easy finding later
  scene.add(floor);
  
  // Create subtle pattern texture for the floor
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Fill with dark background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add subtle fractured patterns
  for (let i = 0; i < 20; i++) {
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    const length = 50 + Math.random() * 150;
    const angle = Math.random() * Math.PI * 2;
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    
    ctx.strokeStyle = `rgba(30, 30, 30, ${Math.random() * 0.5 + 0.1})`;
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  
  const floorTexture = new THREE.CanvasTexture(canvas);
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(4, 4);
  
  floorMaterial.map = floorTexture;
  floorMaterial.normalScale.set(0.1, 0.1); // Subtle normal mapping
  
  return floor;
}

// Create domed ceiling with the dark sun and eclipse effect
function createCeiling() {
  // COMPLETELY REDESIGNED: Replace dome with flat ceiling
  const ceilingGeometry = new THREE.CircleGeometry(roomRadius, 64);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x010101, // Near black
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.FrontSide, // Only render the bottom side
    transparent: false,
    depthWrite: true
  });
  
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.y = ceilingHeight;
  ceiling.rotation.x = Math.PI / 2; // Flat orientation
  ceiling.userData.isPartOfRoom = true;
  scene.add(ceiling);
  
  // Create the dark sun
  const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000, // Pure black
    transparent: true,
    opacity: 0.95
  });
  
  const darkSun = new THREE.Mesh(sunGeometry, sunMaterial);
  darkSun.position.set(0, ceilingHeight - 5, 0); // Center at the top
  scene.add(darkSun);
  
  // Create the corona effect around the dark sun
  const coronaGeometry = new THREE.RingGeometry(5, 7, 32);
  const coronaMaterial = new THREE.MeshBasicMaterial({
    color: 0xaaaaaa, // Silver-gray
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  
  const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
  corona.position.copy(darkSun.position);
  corona.rotation.x = Math.PI / 2; // Align with the ceiling
  scene.add(corona);
  
  // Create outer glow
  const outerCoronaGeometry = new THREE.RingGeometry(7, 12, 32);
  const outerCoronaMaterial = new THREE.MeshBasicMaterial({
    color: 0x777777, // Lighter silver
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
  });
  
  const outerCorona = new THREE.Mesh(outerCoronaGeometry, outerCoronaMaterial);
  outerCorona.position.copy(darkSun.position);
  outerCorona.rotation.x = Math.PI / 2;
  scene.add(outerCorona);
  
  // Add a point light for the corona's glow
  const coronaLight = new THREE.PointLight(0xcccccc, 0.4, 50);
  coronaLight.position.copy(darkSun.position);
  coronaLight.position.y -= 2; // Slightly below the sun
  scene.add(coronaLight);
  
  // Create a spotlight for the eclipse effect
  const eclipseLight = new THREE.SpotLight(0x999999, 0.3, 100, Math.PI / 4, 0.5);
  eclipseLight.position.copy(darkSun.position);
  eclipseLight.position.y -= 1;
  eclipseLight.target.position.set(0, 0, 0); // Point toward center of room
  scene.add(eclipseLight);
  scene.add(eclipseLight.target);
  
  // Add subtle shadow casting
  eclipseLight.castShadow = true;
  eclipseLight.shadow.mapSize.width = 1024;
  eclipseLight.shadow.mapSize.height = 1024;
  eclipseLight.shadow.camera.near = 0.5;
  eclipseLight.shadow.camera.far = 50;
  
  // Add subtle lighting around the room perimeter
  const ambientLight = new THREE.AmbientLight(0x111111, 0.5);
  scene.add(ambientLight);
  
  // Create an array of all ceiling elements for animation
  return { 
    ceiling, 
    darkSun, 
    corona, 
    outerCorona, 
    coronaLight, 
    eclipseLight,
    ambientLight
  };
}

// Create NFT displays in a dodecagon formation
function createNFTPedestals() {
  const nftCount = 12; // 12 NFTs in a dodecagon
  const nfts = [];
  
  // Use NFTs 131-142
  const startNFTIndex = 131;
  
  // Create NFTs in a dodecagon (12-sided polygon)
  for (let i = 0; i < nftCount; i++) {
    const angle = (i / nftCount) * Math.PI * 2;
    const radius = roomRadius * 0.6; // Position in a circle
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // Create floating NFT with glow effects
    const nftIndex = startNFTIndex + i;
    createDoubleSidedNFT(nftIndex, new THREE.Vector3(x, 5, z), angle);
  }
  
  return nfts;
}

// Create a double-sided floating NFT display
function createDoubleSidedNFT(index, position, angle) {
  // Frame dimensions
  const frameHeight = 2.5;
  const frameWidth = frameHeight * 0.564; // Aspect ratio 0.564
  
  // Create fallback texture immediately
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 910;
  const ctx = canvas.getContext('2d');
  
  // Draw a solid background for the fallback to prevent flickering
  ctx.fillStyle = '#000033';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add text to the fallback
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`NFT #${index}`, canvas.width/2, canvas.height/2 - 50);
  ctx.font = '32px Arial';
  ctx.fillText('Loading...', canvas.width/2, canvas.height/2 + 50);
  
  // Add a border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  
  const fallbackTexture = new THREE.CanvasTexture(canvas);
  fallbackTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  fallbackTexture.needsUpdate = true;
  
  // Calculate direct vector to center
  const vectorToCenter = new THREE.Vector3(0, position.y, 0).sub(position).normalize();
  
  // Create FRONT SIDE (facing center)
  // ---------------------------------------------------------
  
  // Create anti-flicker material settings
  const nftMaterialFront = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: fallbackTexture,
    transparent: false,
    side: THREE.FrontSide, // Only render front side for performance
    depthWrite: true,
    depthTest: true
  });
  
  // Create the NFT plane (front side)
  const nftGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight);
  const nftMeshFront = new THREE.Mesh(nftGeometry, nftMaterialFront);
  
  // Position precisely
  nftMeshFront.position.copy(position);
  
  // Manual orientation calculation to guarantee facing center
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), // Default plane normal
    vectorToCenter    // Direction to center
  );
  nftMeshFront.setRotationFromQuaternion(quaternion);
  
  // Add to scene
  scene.add(nftMeshFront);
  
  // Create BACK SIDE (facing away from center)
  // ---------------------------------------------------------
  
  // Create the back side with same material (will load same texture)
  const nftMaterialBack = nftMaterialFront.clone();
  const nftMeshBack = new THREE.Mesh(nftGeometry, nftMaterialBack);
  
  // Position at same spot
  nftMeshBack.position.copy(position);
  
  // Manual orientation for back side (opposite direction)
  const oppositeQuaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1), // Default plane normal
    vectorToCenter.clone().negate() // Opposite direction from center
  );
  nftMeshBack.setRotationFromQuaternion(oppositeQuaternion);
  
  // Add to scene
  scene.add(nftMeshBack);
  
  // Simple dark frame for both sides
  const frameGeometryFront = new THREE.PlaneGeometry(frameWidth + 0.1, frameHeight + 0.1);
  const frameMaterialFront = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.FrontSide
  });
  
  const frameFront = new THREE.Mesh(frameGeometryFront, frameMaterialFront);
  frameFront.position.copy(nftMeshFront.position);
  frameFront.quaternion.copy(nftMeshFront.quaternion);
  frameFront.position.addScaledVector(vectorToCenter, -0.01); // Slightly behind the NFT
  scene.add(frameFront);
  
  // Back frame
  const frameGeometryBack = new THREE.PlaneGeometry(frameWidth + 0.1, frameHeight + 0.1);
  const frameMaterialBack = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.FrontSide
  });
  
  const frameBack = new THREE.Mesh(frameGeometryBack, frameMaterialBack);
  frameBack.position.copy(nftMeshBack.position);
  frameBack.quaternion.copy(nftMeshBack.quaternion);
  frameBack.position.addScaledVector(vectorToCenter.clone().negate(), -0.01); // Slightly behind back NFT
  scene.add(frameBack);
  
  // Add lights for both sides
  const lightFront = new THREE.DirectionalLight(0xffffff, 1.0);
  lightFront.position.copy(position);
  lightFront.position.addScaledVector(vectorToCenter, -5); // Position in front of the front NFT
  lightFront.target = nftMeshFront;
  scene.add(lightFront);
  scene.add(lightFront.target);
  
  const lightBack = new THREE.DirectionalLight(0xffffff, 1.0);
  lightBack.position.copy(position);
  lightBack.position.addScaledVector(vectorToCenter.clone().negate(), -5); // Position in front of the back NFT
  lightBack.target = nftMeshBack;
  scene.add(lightBack);
  scene.add(lightBack.target);
  
  // IMPROVED ANTI-FLICKER: Texture loading with prioritization
  console.log(`Attempting to load NFT texture: ${index}`);
  
  // Set texture loading priority and options
  textureLoader.setCrossOrigin('anonymous');
  
  // NFT path formats to try
  const timestamp = Date.now();
  const pathFormats = [
    `/assets/nft${index}.png?t=${timestamp}`,
    `/assets/nft${index}.png?t=${timestamp}`,
    getNftUrl(index),
    getNftUrl(index),
    `../assets/nft${index}.png?t=${timestamp}`,
    `./assets/nft${index}.png?t=${timestamp}`
  ];
  
  let loadAttempt = 0;
  let loadSuccess = false;
  
  // Function to try loading with a given path
  const attemptLoad = (path) => {
    textureLoader.load(
      path,
      function(texture) {
        // If we already have a successful load, ignore
        if (loadSuccess) return;
        
        loadSuccess = true;
        console.log(`Successfully loaded NFT texture ${index} from ${path}`);

        // ANTI-FLICKER: Apply best possible texture settings
        texture.encoding = THREE.sRGBEncoding; // Correct color representation
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        
        // Apply to both front and back materials
        nftMaterialFront.map = texture;
        nftMaterialFront.needsUpdate = true;
        
        nftMaterialBack.map = texture;
        nftMaterialBack.needsUpdate = true;
      },
      undefined,
      function(err) {
        console.error(`Error loading NFT texture ${index} from ${path}:`, err);
        
        // Try next path format if available
        loadAttempt++;
        if (loadAttempt < pathFormats.length) {
          console.log(`Trying alternative path ${loadAttempt} for NFT ${index}: ${pathFormats[loadAttempt]}`);
          attemptLoad(pathFormats[loadAttempt]);
        }
      }
    );
  };
  
  // Start the loading attempts
  attemptLoad(pathFormats[0]);
  
  // Store for click detection
  nftMeshFront.userData.isNFT = true;
  nftMeshFront.userData.index = index;
  nftMeshFront.userData.imageUrl = pathFormats[0].split('?')[0];
  
  nftMeshBack.userData.isNFT = true;
  nftMeshBack.userData.index = index;
  nftMeshBack.userData.imageUrl = pathFormats[0].split('?')[0];
  
  // Add both sides to picturePlanes for interaction
  picturePlanes.push(nftMeshFront);
  picturePlanes.push(nftMeshBack);
  
  return { 
    front: { mesh: nftMeshFront, frame: frameFront, light: lightFront },
    back: { mesh: nftMeshBack, frame: frameBack, light: lightBack }
  };
}

// Create atmospheric haze effect
function createAtmosphericHaze() {
  // Create a large number of tiny particles
  const particleCount = 1500; // Reduced from 2000
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    // Create particles within a cylinder shape (the room)
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * roomRadius * 0.8; // Keep further away from walls (0.9 -> 0.8)
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.random() * ceilingHeight * 0.9; // Distribute vertically
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x555555,
    size: 0.04, // Smaller size
    transparent: true,
    opacity: 0.08, // Reduced opacity
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  
  return particles;
}

// Create all portals using standardized portal system
function createAllPortals() {
  const portals = [];

  // Portal to Room 4 (Floating Island) - South - Blood red theme
  const portal4 = createLinkedPortal({
    scene,
    fromRoom: '5',
    toRoom: '4',
    x: 0,
    y: groundLevel + eyeHeight,
    z: roomRadius - 5,
    rotationX: 0.1,
    createLabel: true,
    overrideColor: 0xaa1122,    // Deep blood red
    overrideOpacity: 0.85        // Slightly more solid
  });
  portals.push({ ...portal4, name: 'Room 4', url: 'room4.html', position: new THREE.Vector3(0, groundLevel + eyeHeight, roomRadius - 5) });

  // Portal to Room 6 (Video Corridor) - North - White theme
  const portal6 = createLinkedPortal({
    scene,
    fromRoom: '5',
    toRoom: '6',
    x: 0,
    y: eyeHeight,
    z: -(roomRadius - 5),
    rotationX: 0.1,
    createLabel: true,
    overrideColor: 0xffffff      // Pure white
  });
  portals.push({ ...portal6, name: 'Room 6', url: 'room6.html', position: new THREE.Vector3(0, eyeHeight, -(roomRadius - 5)) });

  // REMOVED: Portals to Room 7, 8, 9
  // Room 5 is NO LONGER a bonus hub - just simple progression: 4 ↔ 5 ↔ 6

  return portals;
}

// ----------------------------------------------------------------------
// Create the Room Elements
// ----------------------------------------------------------------------
const floor = createFloor();
const walls = createWalls();
const ceiling = createCeiling();
const pedestals = createNFTPedestals();
const haze = createAtmosphericHaze();
const allPortals = createAllPortals();

// Set up multi-portal proximity checker using standardized system
const portalConfigs = allPortals.map(p => ({
  position: p.position,
  name: p.name,
  url: p.url,
  showDistance: 4.0,
  triggerDistance: 2.0
}));

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: portalConfigs,
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// Collect all portal labels for billboard effect
const portalLabels = allPortals
  .map(p => p.label)
  .filter(label => label !== undefined);

// ----------------------------------------------------------------------
// Mobile Controls Initialization
// ----------------------------------------------------------------------
let mobileControls = null;

mobileControls = initMobileControls({
  camera,
  controls,
  sensitivity: { look: 0.04, move: 1.0 },
  pitchLimits: { min: -Math.PI / 3, max: Math.PI / 4 },
  autoLevel: { enabled: true, speed: 0.3, threshold: 0.1 },
  onInteract: (raycaster) => {
    const intersects = raycaster.intersectObjects(picturePlanes, false);
    if (intersects.length > 0) {
      const nft = intersects[0].object;
      if (nft.userData?.isNFT) {
        openImageViewer(nft.userData.imageUrl, nft.userData.index);
      }
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
// Animation Loop
// ----------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  // Get delta time
  const delta = clock.getDelta();
  const time = Date.now() * 0.001; // Time in seconds

  // Update mobile controls
  if (mobileControls && mobileControls.enabled) {
    mobileControls.updateAutoLevel(delta);
    mobileControls.updateCameraRotation();
  }

  // Update environment map for reflections (every few frames for performance)
  if (Math.floor(time * 10) % 5 === 0) { // Update every half second
    if (walls.userData && walls.userData.updateEnvironmentMap) {
      walls.userData.updateEnvironmentMap();
    }
  }

  // NO ANIMATION FOR NFTs - they are completely static now

  const isActiveControls = controls.isLocked || (mobileControls && mobileControls.enabled);
  if (isActiveControls) {
    // Handle jumping and gravity
    if (isJumping) {
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;

      if (camera.position.y <= groundLevel + eyeHeight) {
        camera.position.y = groundLevel + eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
      }
    }

    // Movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    // Apply mobile speed scaling: halve speed on mobile for better control
    const isMobileActive = mobileControls && mobileControls.enabled;
    const baseSpeed = MOVEMENT_CONFIG.getEffectiveSpeed('room5');
    const effectiveSpeed = isMobileActive ? baseSpeed * 0.5 : baseSpeed;
    const speedDelta = effectiveSpeed * delta;

    direction.z = Number(window.moveForward) - Number(window.moveBackward);
    direction.x = Number(window.moveRight) - Number(window.moveLeft);
    direction.normalize();

    if (window.moveForward || window.moveBackward) velocity.z -= direction.z * speedDelta;
    if (window.moveLeft || window.moveRight) velocity.x -= direction.x * speedDelta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Room boundary check - keep player inside the circular room but closer to walls
    const playerX = camera.position.x;
    const playerZ = camera.position.z;
    const distanceFromCenter = Math.sqrt(playerX * playerX + playerZ * playerZ);

    if (distanceFromCenter > roomRadius - 0.5) { // Reduced boundary buffer (1 -> 0.5)
      // Calculate normalized direction from center
      const angle = Math.atan2(playerZ, playerX);
      // Move back inside but closer to wall
      camera.position.x = (roomRadius - 0.5) * Math.cos(angle);
      camera.position.z = (roomRadius - 0.5) * Math.sin(angle);
    }

    // UPDATED: Maintain camera at NFT level when not jumping
    if (!isJumping) {
      camera.position.y = groundLevel + eyeHeight;
    }

    // Check if near portal
    checkPortalProximity();
  }
  
  // Animate ceiling elements
  ceiling.corona.rotation.z = time * 0.05; // Slow rotation
  ceiling.outerCorona.rotation.z = -time * 0.03; // Opposite rotation

  // Pulsing corona light
  ceiling.coronaLight.intensity = 0.3 + 0.1 * Math.sin(time * 0.5);

  // Animate all portals using standardized system
  allPortals.forEach(portalObj => {
    animateLinkedPortal(portalObj.portal, portalObj.glow);
  });

  // Update billboard labels to always face camera
  portalLabels.forEach(label => {
    if (label) {
      label.lookAt(camera.position);
    }
  });

  renderer.render(scene, camera);
}

animate();

// Initialize speed control UI
initSpeedControl();

// Initialize NFT viewer
const nftMetadata = picturePlanes
  .filter(plane => plane.userData && plane.userData.isNFT)
  .map(plane => ({
    id: plane.userData.index,
    url: plane.userData.imageUrl,
    title: `NFT #${plane.userData.index}`,
    description: ''
  }))
  .sort((a, b) => a.id - b.id);

const nftViewer = initNFTViewer({
  scene,
  camera,
  controls,
  renderer,
  nftMeshes: picturePlanes,
  nftMetadata
}); 