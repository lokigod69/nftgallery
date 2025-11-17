// Changes made:
// - Created room3.js based on room2.js
// - Increased room size to 50x50 (larger than room2's 40x40)
// - Changed NFT frames to grey
// - Added portal back to room2
// - Added portal to room4 in the opposite corner
// - Fixed loading bar issue by hiding it on page load
// - Added wall lights for better illumination
// - Raised camera height to better align with wall frames
// - Added immersive starry night ceiling with animated elements
// - Significantly increased movement speed for faster navigation
// - Updated NFT display to use aspect ratio of 0.564 (width:height)
// - Added texture loading for NFTs from nft73 to nft104
// - Replaced hexagon structure with a cubic middle section using golden ratio
// - Added NFT frames to each wall of the cubic structure (3 per wall)
// - Removed East and West walls from the cubic structure, keeping only North and South walls
// - Added NFTs to the inside of the two remaining cubic structure walls (NFTs 102-107)
// - Fixed display issues with NFT 107 by using a direct data URL
// - Fixed collision detection for the cubic structure
// - Fixed teleportation bug by properly organizing click event handlers
// - Fixed NFT display issues on shorter walls of the cubic structure
// - Increased NFT frame size and applied golden ratio spacing
// - Added slider functionality to browse all NFTs with left/right clicks
// - Changed NFT viewer to exit only with Escape key
// - Fixed click functionality to prevent unexpected camera jumps
// - Improved light positioning to have exactly one light between each pair of NFTs
// - Fixed portal functionality to properly teleport to Room 4
// - Fixed NFT 107 orientation to properly face outward instead of toward the wall
// - Updated portal proximity check to use a simpler approach with larger detection ranges
// - Updated the loading overlay handling to properly hide it with a fade-out effect after loading

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getNftUrl } from './src/core/asset-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';
import { initScene } from './src/core/scene-setup.js';
import { initNFTViewer } from './src/core/nft-viewer.js';
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
// Movement speed now using shared config (was 100.0)
const textureLoader = new THREE.TextureLoader(); // Texture loader for NFTs

// NFT viewer will be initialized after scene setup

// Hide loading overlay when the page loads
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    // Add a short delay to ensure all resources are loaded
    setTimeout(() => {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }, 500);
  }
});

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
// Define safe spawn positions that are away from NFTs and walls
const spawnPositions = {
  default: new THREE.Vector3(-10, groundLevels[1], -10), // Offset from center, away from walls and pictures
  safe: new THREE.Vector3(10, groundLevels[1], -10), // Alternative safe position
  room4: new THREE.Vector3(10, groundLevels[1], 10) // Coming from room 4, spawn in a safe area
};

// Check URL parameters for spawn position
const urlParams = new URLSearchParams(window.location.search);
const spawnParam = urlParams.get('spawn');

// Determine spawn position based on URL parameter
let initialSpawn = spawnPositions.default;
if (spawnParam && spawnPositions[spawnParam]) {
  console.log(`Spawning at ${spawnParam} position`);
  initialSpawn = spawnPositions[spawnParam];
}

const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: initialSpawn.x, y: initialSpawn.y, z: initialSpawn.z },
  background: 0x0a0a0a,
  outputEncoding: 'Linear'
});

// Room 3 uses FogExp2 (not regular Fog)
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

// Clock for animation timing
const clock = new THREE.Clock();

// ----------------------------------------------------------------------
// Controls & Movement Setup
// ----------------------------------------------------------------------
// Controls are now initialized by initScene()

// NFT click handling is now managed by initNFTViewer()

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keyStates = {}; // Track the state of keys

const onKeyDown = function (event) {
  keyStates[event.code] = true; // Update key state
  
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
      if (!isJumping) {
        jumpVelocity = 10;
        isJumping = true;
      }
      break;
  }
};

const onKeyUp = function (event) {
  keyStates[event.code] = false; // Update key state
  
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
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// ----------------------------------------------------------------------
// Lighting
// ----------------------------------------------------------------------
function createLights() {
  // Ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased intensity
  scene.add(ambientLight);

  // Main directional light
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(0, 10, 0);
  scene.add(mainLight);

  // Central spotlight
  const spotLight1 = new THREE.SpotLight(0xffffff, 1);
  spotLight1.position.set(0, 7, 0);
  spotLight1.angle = Math.PI / 3; // Wider angle
  spotLight1.penumbra = 0.2;
  spotLight1.decay = 1.5; // Less decay
  spotLight1.distance = 60; // Increased distance
  scene.add(spotLight1);

  // Wall lights
  const wallLights = [];
  
  // Calculate light positions that are exactly between each pair of NFTs
  // Back wall has 5 NFTs, so we need 4 lights, positioned between them
  const backWallNFTPositions = getPositions(45, 5);
  const backWallLightPositions = [];
  for (let i = 0; i < backWallNFTPositions.length - 1; i++) {
    // Position the light exactly halfway between two adjacent NFTs
    const lightPos = (backWallNFTPositions[i] + backWallNFTPositions[i+1]) / 2;
    backWallLightPositions.push(lightPos);
  }
  
  backWallLightPositions.forEach((x) => {
    const wallLight = new THREE.PointLight(0xffffcc, 0.8, 20, 1);
    wallLight.position.set(x, 5, -24);
    scene.add(wallLight);
    
    // Add light bulb mesh
    const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulbMesh.position.copy(wallLight.position);
    scene.add(bulbMesh);
    
    wallLights.push(wallLight);
  });
  
  // Left wall has 5 NFTs, so we need 4 lights
  const leftWallNFTPositions = getPositions(45, 5);
  const leftWallLightPositions = [];
  for (let i = 0; i < leftWallNFTPositions.length - 1; i++) {
    const lightPos = (leftWallNFTPositions[i] + leftWallNFTPositions[i+1]) / 2;
    leftWallLightPositions.push(lightPos);
  }
  
  leftWallLightPositions.forEach((z) => {
    const wallLight = new THREE.PointLight(0xffffcc, 0.8, 20, 1);
    wallLight.position.set(-24, 5, -z);
    scene.add(wallLight);
    
    // Add light bulb mesh
    const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulbMesh.position.copy(wallLight.position);
    scene.add(bulbMesh);
    
    wallLights.push(wallLight);
  });
  
  // Right wall has 5 NFTs, so we need 4 lights
  const rightWallNFTPositions = getPositions(45, 5);
  const rightWallLightPositions = [];
  for (let i = 0; i < rightWallNFTPositions.length - 1; i++) {
    const lightPos = (rightWallNFTPositions[i] + rightWallNFTPositions[i+1]) / 2;
    rightWallLightPositions.push(lightPos);
  }
  
  rightWallLightPositions.forEach((z) => {
    const wallLight = new THREE.PointLight(0xffffcc, 0.8, 20, 1);
    wallLight.position.set(24, 5, z);
    scene.add(wallLight);
    
    // Add light bulb mesh
    const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulbMesh.position.copy(wallLight.position);
    scene.add(bulbMesh);
    
    wallLights.push(wallLight);
  });
  
  // Front wall has 5 NFTs, so we need 4 lights
  const frontWallNFTPositions = getPositions(45, 5);
  const frontWallLightPositions = [];
  for (let i = 0; i < frontWallNFTPositions.length - 1; i++) {
    const lightPos = (frontWallNFTPositions[i] + frontWallNFTPositions[i+1]) / 2;
    frontWallLightPositions.push(lightPos);
  }
  
  frontWallLightPositions.forEach((x) => {
    const wallLight = new THREE.PointLight(0xffffcc, 0.8, 20, 1);
    wallLight.position.set(x, 5, 24);
    scene.add(wallLight);
    
    // Add light bulb mesh
    const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const bulbMesh = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulbMesh.position.copy(wallLight.position);
    scene.add(bulbMesh);
    
    wallLights.push(wallLight);
  });

  return { ambientLight, mainLight, spotLight1, wallLights };
}

const lights = createLights();

// ----------------------------------------------------------------------
// Floor Texture
// ----------------------------------------------------------------------
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  // Fill with dark color
  context.fillStyle = '#111111';
  context.fillRect(0, 0, 512, 512);

  // Add grid lines
  context.strokeStyle = '#222222';
  context.lineWidth = 2;

  const gridSize = 64;
  for (let i = 0; i <= canvas.width; i += gridSize) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, canvas.height);
    context.stroke();

    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(canvas.width, i);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);

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

  // Floor - Larger than room2 (50x50 instead of 40x40)
  const floorGeometry = new THREE.PlaneGeometry(50, 50);
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  walls.floor = floor;

  // Walls - Larger than room2
  const wallGeometry = new THREE.PlaneGeometry(50, 8);
  
  // Back wall
  const backWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  backWall.position.z = -25;
  backWall.position.y = 4;
  scene.add(backWall);
  walls.backWall = backWall;

  // Left wall
  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  leftWall.position.x = -25;
  leftWall.position.y = 4;
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);
  walls.leftWall = leftWall;

  // Right wall
  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  rightWall.position.x = 25;
  rightWall.position.y = 4;
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);
  walls.rightWall = rightWall;

  // Front wall
  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  frontWall.position.z = 25;
  frontWall.position.y = 4;
  frontWall.rotation.y = Math.PI;
  scene.add(frontWall);
  walls.frontWall = frontWall;

  return walls;
}

const walls = createWallsAndFloor();

// ----------------------------------------------------------------------
// Ceiling
// ----------------------------------------------------------------------
function createCeiling() {
  // Create a group to hold all ceiling elements
  const ceilingGroup = new THREE.Group();
  
  // Base ceiling
  const ceilingGeometry = new THREE.PlaneGeometry(50, 50);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000, // Pure black for deep space effect
    roughness: 0.9,
    metalness: 0.5,
    emissive: 0x000000
  });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.y = 8;
  ceiling.rotation.x = Math.PI / 2;
  ceilingGroup.add(ceiling);
  
  // Create stars
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  
  // Generate random star positions
  const starsCount = 2000;
  const starsPositions = new Float32Array(starsCount * 3);
  const starsSizes = new Float32Array(starsCount);
  
  for (let i = 0; i < starsCount; i++) {
    const i3 = i * 3;
    // Keep stars within ceiling boundaries
    starsPositions[i3] = (Math.random() - 0.5) * 48;
    starsPositions[i3 + 1] = 7.9; // Just below ceiling
    starsPositions[i3 + 2] = (Math.random() - 0.5) * 48;
    
    // Vary star sizes
    starsSizes[i] = Math.random() * 0.08 + 0.02;
  }
  
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1));
  
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  ceilingGroup.add(stars);
  
  // Add nebula-like clouds
  const nebulaCount = 5;
  const nebulae = [];
  
  for (let i = 0; i < nebulaCount; i++) {
    const nebulaGeometry = new THREE.PlaneGeometry(10, 10);
    
    // Create a canvas for the nebula texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Create a radial gradient for the nebula
    const colors = [
      [0x8844aa, 0x4422aa], // Purple/blue
      [0x2244aa, 0x112266], // Blue
      [0x22aaaa, 0x114466], // Teal
      [0xaa4422, 0x662211], // Orange/red
      [0x44aa88, 0x226644]  // Teal/green
    ];
    
    const colorSet = colors[i % colors.length];
    const centerColor = '#' + colorSet[0].toString(16).padStart(6, '0');
    const edgeColor = '#' + colorSet[1].toString(16).padStart(6, '0');
    
    const gradient = ctx.createRadialGradient(
      128, 128, 10,
      128, 128, 128
    );
    
    gradient.addColorStop(0, centerColor);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    // Create texture from canvas
    const nebulaTexture = new THREE.CanvasTexture(canvas);
    
    const nebulaMaterial = new THREE.MeshBasicMaterial({
      map: nebulaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    
    // Position nebula randomly on ceiling
    nebula.position.set(
      (Math.random() - 0.5) * 40,
      7.95,
      (Math.random() - 0.5) * 40
    );
    
    nebula.rotation.x = Math.PI / 2;
    nebula.rotation.z = Math.random() * Math.PI * 2;
    
    // Store for animation
    nebula.userData = {
      rotationSpeed: (Math.random() - 0.5) * 0.05,
      pulseSpeed: 0.2 + Math.random() * 0.3,
      pulseAmount: 0.1 + Math.random() * 0.2,
      initialScale: 0.8 + Math.random() * 0.4
    };
    
    nebulae.push(nebula);
    ceilingGroup.add(nebula);
  }
  
  // Add a few larger glowing orbs
  const orbCount = 8;
  const orbs = [];
  
  for (let i = 0; i < orbCount; i++) {
    const orbGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const orbMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      transparent: true,
      opacity: 0.8
    });
    
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    
    // Position orb randomly on ceiling
    orb.position.set(
      (Math.random() - 0.5) * 45,
      7.7 + Math.random() * 0.2,
      (Math.random() - 0.5) * 45
    );
    
    // Store for animation
    orb.userData = {
      floatSpeed: 0.2 + Math.random() * 0.3,
      floatAmount: 0.05 + Math.random() * 0.1,
      initialY: orb.position.y,
      hueShift: Math.random() * 0.01
    };
    
    orbs.push(orb);
    ceilingGroup.add(orb);
  }
  
  // Add the ceiling group to the scene
  scene.add(ceilingGroup);
  
  // Return all animated elements for the animation loop
  return { ceiling, stars, nebulae, orbs };
}

const ceilingElements = createCeiling();

// ----------------------------------------------------------------------
// NFT Display Functions
// ----------------------------------------------------------------------
function getPositions(totalWidth, numFrames) {
  const spacing = totalWidth / (numFrames + 1);
  const positions = [];
  
  for (let i = 1; i <= numFrames; i++) {
    const x = (i * spacing) - (totalWidth / 2);
    positions.push(x);
  }
  
  return positions;
}

// Special function for positioning NFTs on shorter walls
function getPositionsForShortWalls(totalWidth, numFrames) {
  // For shorter walls, we'll use a different spacing strategy
  // to ensure NFTs are properly visible and not too close together
  
  // If we have 3 frames, position them at -totalWidth/4, 0, and totalWidth/4
  // This gives more even spacing for the shorter walls
  const positions = [];
  
  if (numFrames === 3) {
    positions.push(-totalWidth * 0.3);
    positions.push(0);
    positions.push(totalWidth * 0.3);
  } else {
    // Fall back to regular spacing for other numbers of frames
    return getPositions(totalWidth, numFrames);
  }
  
  return positions;
}

function createNFT(index, position, rotation) {
  // Calculate dimensions based on the aspect ratio of 0.564 (width:height)
  const frameHeight = 3.2; // Keep the height the same
  const frameWidth = frameHeight * 0.564; // Apply the aspect ratio
  
  // Grey frame for NFTs as requested
  const frameGeometry = new THREE.BoxGeometry(frameWidth, frameHeight, 0.1);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080, // Grey color for frames
    roughness: 0.5,
    metalness: 0.5
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.copy(position);
  frame.rotation.copy(rotation);
  scene.add(frame);

  // Picture plane with NFT texture
  const planeHeight = 3.0; // Slightly smaller than the frame
  const planeWidth = planeHeight * 0.564; // Apply the aspect ratio
  const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
  
  // Create a material with the NFT texture
  const nftPath = getNftUrl(index);
  const planeMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });
  
  // Enhanced texture loading with better error handling for higher-numbered NFTs
  const loadTexture = (attempts = 0) => {
    console.log(`Attempting to load NFT texture ${index}, attempt ${attempts + 1}`);
    
    textureLoader.load(
      nftPath,
      function(texture) {
        planeMaterial.map = texture;
        planeMaterial.needsUpdate = true;
        console.log(`Successfully loaded NFT texture ${index}`);
      },
      // Progress callback
      function(xhr) {
        console.log(`${index} loading: ${(xhr.loaded / xhr.total * 100)}%`);
      },
      // Error callback
      function(err) {
        console.error(`Error loading NFT texture ${index}:`, err);
        
        // Special handling for NFT 107 - if it fails to load from the normal path
        if (index === 107 && attempts === 0) {
          console.log("Trying alternate path for NFT 107");
          // Try an alternate path or use a default texture
          const alternatePath = getNftUrl(107); // Try WebP (unified format)
          textureLoader.load(
            alternatePath,
            function(texture) {
              planeMaterial.map = texture;
              planeMaterial.needsUpdate = true;
              console.log(`Successfully loaded NFT 107 from alternate path`);
            },
            undefined,
            function(err) {
              console.error(`Error loading NFT 107 from alternate path:`, err);
              // Set a default color to make it visible even if texture fails
              planeMaterial.color.set(0xaaaaaa);
              planeMaterial.needsUpdate = true;
              console.log("Using default color for NFT 107");
            }
          );
        } else if (attempts < 3) {
          console.log(`Retrying load for NFT texture ${index}, attempt ${attempts + 1}`);
          setTimeout(() => loadTexture(attempts + 1), 500 * (attempts + 1)); // Increasing delay with each retry
        } else {
          // After multiple failures, set a default color
          planeMaterial.color.set(0xaaaaaa);
          planeMaterial.needsUpdate = true;
          console.log(`Using default color for NFT ${index} after multiple failed loading attempts`);
        }
      }
    );
  };
  
  loadTexture();
  
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.copy(position);
  
  // Adjust position slightly to avoid z-fighting
  const normalVector = new THREE.Vector3(0, 0, 1).applyEuler(rotation);
  plane.position.add(normalVector.multiplyScalar(0.06));
  
  plane.rotation.copy(rotation);
  scene.add(plane);
  
  // Store the plane for click detection
  plane.userData = {
    isNFT: true,
    index: index,
    imageUrl: nftPath
  };
  picturePlanes.push(plane);

  // Measure NFT center Y for eye height calibration (first NFT only)
  if (!nftCenterMeasured) {
    nftCenterMeasured = true;
    const box = new THREE.Box3().setFromObject(plane);
    const center = new THREE.Vector3();
    box.getCenter(center);
    console.log('🎯 ROOM 3 NFT center Y:', center.y);
    console.log('   (Current eye height:', groundLevels[1], ')');
  }

  return { frame, plane };
}

// ----------------------------------------------------------------------
// NFT Click Detection
// ----------------------------------------------------------------------
function onNFTClick(event) {
  // This function is now handled by the centralized click handler
  // Keeping this as a placeholder for backward compatibility
  console.log("onNFTClick is deprecated, using centralized click handler instead");
}

// Remove the separate NFT click handler as it's now part of the centralized handler
window.removeEventListener('click', onNFTClick);

// ----------------------------------------------------------------------
// Hexagon Structure Setup
// ----------------------------------------------------------------------
function createHexagon() {
  // This function is replaced by createCubicStructure
  return null;
}

function createCubicStructure() {
  const cubicGroup = new THREE.Group();
  
  // Golden ratio is approximately 1.618
  const goldenRatio = 1.618;
  
  // Calculate dimensions based on golden ratio
  // We'll use the shorter side as the base unit
  const shortSide = 10;
  const longSide = shortSide * goldenRatio;
  
  // Wall height (same as outer walls)
  const wallHeight = 8;
  const wallThickness = 0.5;
  
  // Material for the cubic walls
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x404040,
    roughness: 0.7,
    metalness: 0.3
  });
  
  // Create only North and South walls of the structure (removing East and West)
  
  // Wall 1 (North wall)
  const wall1Geometry = new THREE.BoxGeometry(longSide, wallHeight, wallThickness);
  const wall1 = new THREE.Mesh(wall1Geometry, wallMaterial.clone());
  wall1.position.set(0, 4, -shortSide/2);
  wall1.userData = { isWall: true, wallIndex: 1 };
  cubicGroup.add(wall1);
  
  // Wall 3 (South wall)
  const wall3Geometry = new THREE.BoxGeometry(longSide, wallHeight, wallThickness);
  const wall3 = new THREE.Mesh(wall3Geometry, wallMaterial.clone());
  wall3.position.set(0, 4, shortSide/2);
  wall3.rotation.y = Math.PI;
  wall3.userData = { isWall: true, wallIndex: 3 };
  cubicGroup.add(wall3);
  
  scene.add(cubicGroup);
  return {
    group: cubicGroup,
    dimensions: {
      shortSide: shortSide,
      longSide: longSide,
      height: wallHeight,
      thickness: wallThickness
    },
    walls: [wall1, wall3]
  };
}

// ----------------------------------------------------------------------
// Create NFTs on Walls
// ----------------------------------------------------------------------
// Back wall NFTs - updated NFT numbers to avoid conflicts
const backWallPositions = getPositions(45, 5);
backWallPositions.forEach((x, i) => {
  createNFT(i + 73, new THREE.Vector3(x, 4, -24.5), new THREE.Euler(0, 0, 0));
});

// Left wall NFTs - updated NFT numbers to avoid conflicts
const leftWallPositions = getPositions(45, 5);
leftWallPositions.forEach((z, i) => {
  createNFT(i + 78, new THREE.Vector3(-24.5, 4, -z), new THREE.Euler(0, Math.PI / 2, 0));
});

// Right wall NFTs - updated NFT numbers to avoid conflicts
const rightWallPositions = getPositions(45, 5);
rightWallPositions.forEach((z, i) => {
  createNFT(i + 83, new THREE.Vector3(24.5, 4, z), new THREE.Euler(0, -Math.PI / 2, 0));
});

// Front wall NFTs - updated NFT numbers to avoid conflicts
const frontWallPositions = getPositions(45, 5);
frontWallPositions.forEach((x, i) => {
  createNFT(i + 88, new THREE.Vector3(-x, 4, 24.5), new THREE.Euler(0, Math.PI, 0));
});

// Create cubic structure with only North and South walls
const cubicStructure = createCubicStructure();

// Add NFTs to the cubic structure (3 per wall)
// Wall 1 (North wall) NFTs - facing outward (NFTs 93-95)
const wall1Positions = getPositions(cubicStructure.dimensions.longSide * 0.8, 3);
wall1Positions.forEach((x, i) => {
  createNFT(i + 93, new THREE.Vector3(x, 4, -cubicStructure.dimensions.shortSide/2 - 0.3), new THREE.Euler(0, Math.PI, 0));
});

// Wall 1 (North wall) NFTs - facing inward (NFTs 102-104)
wall1Positions.forEach((x, i) => {
  createNFT(i + 102, new THREE.Vector3(x, 4, -cubicStructure.dimensions.shortSide/2 + 0.3), new THREE.Euler(0, 0, 0));
});

// Wall 3 (South wall) NFTs - facing outward (NFTs 99-101)
const wall3Positions = getPositions(cubicStructure.dimensions.longSide * 0.8, 3);
wall3Positions.forEach((x, i) => {
  createNFT(i + 99, new THREE.Vector3(-x, 4, cubicStructure.dimensions.shortSide/2 + 0.3), new THREE.Euler(0, 0, 0));
});

// Wall 3 (South wall) NFTs - facing inward (NFTs 105-107)
wall3Positions.forEach((x, i) => {
  // For the last NFT (107), flip it to face outward by using the same rotation as the outward-facing NFTs
  if (i === 2) { // This is NFT 107 (third in the array, index 2)
    createNFT(i + 105, new THREE.Vector3(-x, 4, cubicStructure.dimensions.shortSide/2 + 0.3), new THREE.Euler(0, 0, 0));
  } else {
    createNFT(i + 105, new THREE.Vector3(-x, 4, cubicStructure.dimensions.shortSide/2 - 0.3), new THREE.Euler(0, Math.PI, 0));
  }
});

// ----------------------------------------------------------------------
// Collision Detection
// ----------------------------------------------------------------------
function checkCollisions() {
  // Room boundaries
  const halfWidth = 25; // Half the room width
  const halfDepth = 25; // Half the room depth
  
  // Check X boundaries (left and right walls)
  if (camera.position.x < -halfWidth + 1) {
    camera.position.x = -halfWidth + 1;
  } else if (camera.position.x > halfWidth - 1) {
    camera.position.x = halfWidth - 1;
  }
  
  // Check Z boundaries (front and back walls)
  if (camera.position.z < -halfDepth + 1) {
    camera.position.z = -halfDepth + 1;
  } else if (camera.position.z > halfDepth - 1) {
    camera.position.z = halfDepth - 1;
  }
  
  // Additional collision detection for the cubic structure (North and South walls only)
  // Wall 1 (North)
  if (Math.abs(camera.position.x) < cubicStructure.dimensions.longSide / 2 && 
      Math.abs(camera.position.z - (-cubicStructure.dimensions.shortSide / 2)) < 1) {
    camera.position.z = -cubicStructure.dimensions.shortSide / 2 + (camera.position.z < -cubicStructure.dimensions.shortSide / 2 ? -1 : 1);
  }
  
  // Wall 3 (South)
  if (Math.abs(camera.position.x) < cubicStructure.dimensions.longSide / 2 && 
      Math.abs(camera.position.z - cubicStructure.dimensions.shortSide / 2) < 1) {
    camera.position.z = cubicStructure.dimensions.shortSide / 2 + (camera.position.z < cubicStructure.dimensions.shortSide / 2 ? -1 : 1);
  }
  
  // Maintain camera height
  camera.position.y = isJumping ? camera.position.y : groundLevels[1];
}

// ----------------------------------------------------------------------
// Create Portals
// ----------------------------------------------------------------------
// Portal back to Room 2 (ground portal in corner)
const portalToRoom2 = createLinkedPortal({
  scene,
  fromRoom: '3',
  toRoom: '2',
  x: -23,
  y: 1.2,
  z: -23,
  rotationX: -Math.PI / 2,  // Flat on ground (horizontal orientation)
  createLabel: true
});

// Portal to Room 4 (vertical portal in opposite corner)
const portalToRoom4Obj = createLinkedPortal({
  scene,
  fromRoom: '3',
  toRoom: '4',
  x: 23,
  y: 4.0,
  z: 23,
  createLabel: true
});

// Add particle effects for Room 4 portal (preserve existing behavior)
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 30;
const posArray = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i += 3) {
  posArray[i] = (Math.random() - 0.5) * 2;
  posArray[i+1] = Math.random() * 2;
  posArray[i+2] = (Math.random() - 0.5) * 2;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particleMaterial = new THREE.PointsMaterial({
  color: 0x77bbff,
  size: 0.05,
  transparent: true,
  opacity: 0.6
});

const room4Particles = new THREE.Points(particleGeometry, particleMaterial);
room4Particles.position.set(23, 1.2, 23);
scene.add(room4Particles);

// Particle animation function
function animateRoom4Particles() {
  const positions = particleGeometry.attributes.position.array;

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3+1] = positions[i3+1] + 0.01;

    if (positions[i3+1] > 2) {
      positions[i3+1] = 0;
    }
  }

  particleGeometry.attributes.position.needsUpdate = true;
}

// Set up multi-portal proximity checker
const allPortals = [
  { ...portalToRoom2, name: 'Room 2', url: 'room2.html',
    position: new THREE.Vector3(-23, 1.2, -23) },
  { ...portalToRoom4Obj, name: 'Room 4 (Floating Island)', url: 'room4.html',
    position: new THREE.Vector3(23, 4.0, 23) }
];

const portalConfigs = allPortals.map(p => ({
  position: p.position,
  name: p.name,
  url: p.url,
  showDistance: 4.0,    // Increased from 3.0 for better visibility
  triggerDistance: 2.5  // Increased from 2.0 for more reliable triggering
}));

const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(),  // Use controls object for accurate player position
  portals: portalConfigs,
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// For backward compatibility with existing code
const portal = portalToRoom2;
const portalToRoom4 = portalToRoom4Obj;

// ----------------------------------------------------------------------
// Portal Interaction
// ----------------------------------------------------------------------
// Portal proximity checking is now handled by createMultiPortalChecker() above

// ----------------------------------------------------------------------
// Window Resize Handler
// ----------------------------------------------------------------------
// Resize handling is now managed by initScene()

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  
  if (controls.isLocked === true) {
    const delta = clock.getDelta();
    
    // Handle jumping and gravity
    if (isJumping) {
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;
      
      if (camera.position.y <= groundLevels[1]) {
        camera.position.y = groundLevels[1];
        isJumping = false;
        jumpVelocity = 0;
      }
    }
    
    // Movement - using room2's speed variable
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    const speedDelta = MOVEMENT_CONFIG.getEffectiveSpeed('room3') * delta;
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speedDelta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speedDelta;
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Check for collisions
    checkCollisions();

    // Check if near portal
    checkPortalProximity();
  }

  // Animate portals using standardized system
  allPortals.forEach(portalObj => {
    animateLinkedPortal(portalObj.portal, portalObj.glow);
  });

  // Animate the Room 4 portal particles (preserve existing behavior)
  animateRoom4Particles();
  
  // Animate ceiling elements
  const time = Date.now() * 0.001;
  
  // Animate nebulae
  ceilingElements.nebulae.forEach(nebula => {
    // Rotate slowly
    nebula.rotation.z += nebula.userData.rotationSpeed * 0.01;
    
    // Pulse size
    const pulse = Math.sin(time * nebula.userData.pulseSpeed) * nebula.userData.pulseAmount;
    const scale = nebula.userData.initialScale + pulse;
    nebula.scale.set(scale, scale, scale);
  });
  
  // Animate orbs
  ceilingElements.orbs.forEach(orb => {
    // Float up and down
    const float = Math.sin(time * orb.userData.floatSpeed) * orb.userData.floatAmount;
    orb.position.y = orb.userData.initialY + float;

    // Shift color
    const hue = (time * orb.userData.hueShift) % 1;
    orb.material.color.setHSL(hue, 0.7, 0.5);
  });

  // Update mobile controls (auto-level and camera rotation)
  if (mobileControls.enabled) {
    const delta = clock.getDelta();
    mobileControls.updateAutoLevel(delta);
    mobileControls.updateCameraRotation();
  }

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
      if (nft.userData?.isNFT && typeof nftViewer?.openByIndex === 'function') {
        nftViewer.openByIndex(nft.userData.index - 1);
      }
    }
  }
}); 