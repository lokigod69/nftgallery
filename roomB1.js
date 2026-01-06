// Room B1 - Extension of the B Gallery Series
// - Cloned from roomB.js with different metal and copper textures
// - Uses metal3 for walls instead of metal2
// - Uses copper1, copper4a, copper4b, copper4c for decorations
// - Loads 60 NFTs from RoomB1 folder (PNG format)
// - Features floor portal to Room B2
// - Same room dimensions, special jumping physics (high jump, slow fall)

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadTextureWithDiagnostics, logTextureLoadingSummary, getTextureUrl, getRoomBNftUrl } from './src/core/asset-utils.js';

// ----------------------------------------------------------------------
// Scene Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b8e9f); // Slightly darker blue-gray for Room B1

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Constants for room dimensions and player settings
const roomWidth = 120;
const roomLength = 120;
const roomHeight = 60;
const groundLevel = 0;
const eyeHeight = 8.0; // Increased from 5.5 to give a higher viewpoint
let isJumping = false;
let jumpVelocity = 0;
const gravity = -10; // Slow fall gravity
const initialJumpVelocity = 35; // High jump to reach ceiling
const hoverZoneHeight = roomHeight - 3; // Near-ceiling hover zone (57 units)
const hoverGravity = -2; // Very slow fall in hover zone
const bounceCoefficient = 0.3; // Ceiling bounce
const speed = 60.0;

// Movement and controls
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let prevTime = performance.now();
const clock = new THREE.Clock();

// Global reference to the loaded model
let loadedModel = null;
let modelLoaded = false;
let modelLoadingError = false;

// Global reference for the mirror ceiling
let mirrorCubeCamera = null;
let mirrorCubeRenderTarget = null;
let ceilingMirror = null;

// Create controls
const controls = new PointerLockControls(camera, document.body);

scene.add(controls.getObject());

// Key handlers
const onKeyDown = function (event) {
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
        jumpVelocity = initialJumpVelocity;
        isJumping = true;
      }
      break;
  }
};

const onKeyUp = function (event) {
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

// Add the event listeners for movement controls
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Window resize handler
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Update mirror camera when window is resized
  if (mirrorCubeRenderTarget) {
    mirrorCubeRenderTarget.setSize(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );
  }
});

// ----------------------------------------------------------------------
// Create Room Structure
// ----------------------------------------------------------------------
function createBasicRoom() {
  // Create floor with wood textures
  createMixedFloor();
  
  // Create textured walls
  createTexturedWalls();
  
  // Add lighting
  createLighting();
}

function createMixedFloor() {
  // Load custom B1 floor texture
  const textureLoader = new THREE.TextureLoader();

  // Load b1floor2 texture for the main floor
  const floorTexture = textureLoader.load('/assets/RoomB1/b1floor2.png', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);  // Tile the texture 4x4 across the floor
    texture.colorSpace = THREE.SRGBColorSpace;
    console.log('✓ B1 floor texture loaded successfully');
  }, undefined, function(error) {
    console.error('Error loading B1 floor texture:', error);
  });

  // Create main floor with b1floor2 texture
  const mainFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
  const mainFloorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    roughness: 0.7,
    metalness: 0.15
  });
  const mainFloor = new THREE.Mesh(mainFloorGeometry, mainFloorMaterial);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.position.y = groundLevel;
  mainFloor.receiveShadow = true;
  scene.add(mainFloor);

  console.log('✓ B1 custom floor created');
}

function createTexturedWalls() {
  // Wall thickness
  const wallThickness = 0.5;

  // Create plain base walls (no copper/metal decorations)
  createBaseWalls(wallThickness);
}

function createBaseWalls(thickness) {
  // Create simple neutral wall material (no metal/copper textures)
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, // Dark neutral gray
    roughness: 0.8,
    metalness: 0.1
  });
  
  // Front wall
  const frontWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, thickness);
  const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
  frontWall.position.set(0, roomHeight/2, roomLength/2);
  frontWall.castShadow = true;
  frontWall.receiveShadow = true;
  scene.add(frontWall);
  
  // Back wall
  const backWallGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, thickness);
  const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWall.position.set(0, roomHeight/2, -roomLength/2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  scene.add(backWall);
  
  // Left wall
  const leftWallGeometry = new THREE.BoxGeometry(thickness, roomHeight, roomLength);
  const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
  leftWall.position.set(-roomWidth/2, roomHeight/2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  scene.add(leftWall);
  
  // Right wall
  const rightWallGeometry = new THREE.BoxGeometry(thickness, roomHeight, roomLength);
  const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
  rightWall.position.set(roomWidth/2, roomHeight/2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  scene.add(rightWall);
  
  // Create mirror ceiling using dynamic cube camera
  createMirrorCeiling();
}

function createMirrorCeiling() {
  // Create a dynamic cube render target with HDR format for better reflections
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
    format: THREE.RGBFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  
  // Create cube camera for environment mapping
  const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
  cubeCamera.position.set(0, roomHeight - 0.5, 0); // Position just below the ceiling
  scene.add(cubeCamera);
  
  // Create a mirror material using the environment map from the cube camera
  const mirrorMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.05,     // Very low roughness for clear reflection
    metalness: 1.0,      // Fully metallic
    reflectivity: 1.0,   // Maximum reflectivity
    envMap: cubeRenderTarget.texture,  // Use the dynamic cube map
    envMapIntensity: 1.0, // Full intensity reflections
    color: 0xffffff,     // White base color for pure reflection
    side: THREE.FrontSide, // Only render front side for performance
  });
  
  // Create ceiling geometry (flipped to ensure normal direction is correct)
  const ceilingGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
  const ceiling = new THREE.Mesh(ceilingGeometry, mirrorMaterial);
  ceiling.rotation.x = Math.PI / 2; // Face downward
  ceiling.position.y = roomHeight;
  ceiling.receiveShadow = false; // Disable shadow receiving for mirror
  scene.add(ceiling);
  
  // Store references to update in animation loop
  mirrorCubeCamera = cubeCamera;
  mirrorCubeRenderTarget = cubeRenderTarget;
  ceilingMirror = ceiling;
  
  // Add some subtle colored lights near the ceiling to enhance reflections
  const ceilingAccentLight1 = new THREE.PointLight(0xc0ffff, 0.5, 60);
  ceilingAccentLight1.position.set(roomWidth * 0.25, roomHeight - 5, roomLength * 0.25);
  scene.add(ceilingAccentLight1);
  
  const ceilingAccentLight2 = new THREE.PointLight(0xffc0ff, 0.5, 60);
  ceilingAccentLight2.position.set(-roomWidth * 0.25, roomHeight - 5, -roomLength * 0.25);
  scene.add(ceilingAccentLight2);
}

function addCopperWavePatterns() {
  // Load copper textures (different subset for Room B1)
  const textureLoader = new THREE.TextureLoader();
  const copperTextures = [];

  const copperFiles = [
    getTextureUrl('copper1'),
    getTextureUrl('copper4a'),
    getTextureUrl('copper4b'),
    getTextureUrl('copper4c')
  ];
  
  // Load all copper textures
  copperFiles.forEach((file, index) => {
    const texture = textureLoader.load(file, function(texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      console.log(`Copper texture ${index+1} loaded successfully`);
    }, undefined, function(error) {
      console.error(`Error loading copper texture ${index+1}:`, error);
    });
    copperTextures.push(texture);
  });
  
  // Create materials for each copper texture
  const copperMaterials = copperTextures.map(texture => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.6,
      metalness: 0.8,
      color: 0xddaa88 // Slight copper tint
    });
  });
  
  // Define the golden ratio
  const phi = 1.618033988749895;
  
  // Define tile dimensions - significantly smaller than before
  const tileWidth = 3.5;  // Reduced from 8
  const tileHeight = 3.5; // Reduced from 8
  const tileDepth = 0.12;
  
  // Add copper decorations to each wall
  addWaveToWall('front', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
  addWaveToWall('back', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
  addWaveToWall('left', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
  addWaveToWall('right', copperMaterials, tileWidth, tileHeight, tileDepth, phi);
}

function addWaveToWall(wallType, materials, tileWidth, tileHeight, tileDepth, phi) {
  // Determine wall dimensions and orientation
  let wallLength, wallHeight, isHorizontal;
  let baseX, baseY, baseZ, rotationY;
  const wallOffset = 0.25; // Increased offset from wall to make tiles clearly visible
  
  switch(wallType) {
    case 'front':
      wallLength = roomWidth;
      wallHeight = roomHeight;
      isHorizontal = true;
      baseX = 0;
      baseY = 0;
      baseZ = roomLength/2 - wallOffset; // Positioned clearly in front of the wall
      rotationY = 0;
      break;
    case 'back':
      wallLength = roomWidth;
      wallHeight = roomHeight;
      isHorizontal = true;
      baseX = 0;
      baseY = 0;
      baseZ = -roomLength/2 + wallOffset; // Positioned clearly in front of the wall
      rotationY = Math.PI;
      break;
    case 'left':
      wallLength = roomLength;
      wallHeight = roomHeight;
      isHorizontal = false;
      baseX = -roomWidth/2 + wallOffset; // Positioned clearly in front of the wall
      baseY = 0;
      baseZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallLength = roomLength;
      wallHeight = roomHeight;
      isHorizontal = false;
      baseX = roomWidth/2 - wallOffset; // Positioned clearly in front of the wall
      baseY = 0;
      baseZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }
  
  // Calculate the vertical range for tile placement
  const minHeight = 0;
  const maxHeight = 2 * phi;
  
  // Number of tiles to create
  const tilesPerWall = Math.floor(wallLength / tileWidth * 0.4);
  
  // Calculate horizontal bounds for placing tiles
  const leftBound = -wallLength/2 + tileWidth;
  const rightBound = wallLength/2 - tileWidth;
  
  // Create bottom area copper tiles
  for (let i = 0; i < tilesPerWall; i++) {
    // Random position within the bottom area
    const randomPosition = Math.random() * (rightBound - leftBound) + leftBound;
    const randomHeight = Math.random() * maxHeight + minHeight;
    
    // Select a random copper material
    const randomMaterialIndex = Math.floor(Math.random() * materials.length);
    const selectedMaterial = materials[randomMaterialIndex].clone();
    
    // Enhance material settings to make tiles more visible
    selectedMaterial.roughness = 0.4; // More shiny
    selectedMaterial.metalness = 0.9; // More metallic
    selectedMaterial.emissive = new THREE.Color(0x331100); // Subtle glow
    selectedMaterial.emissiveIntensity = 0.15;
    
    // Use BoxGeometry for 3D appearance but very thin (visible depth)
    const shapeType = Math.floor(Math.random() * 3);
    let tileGeometry;
    let aspectRatio = 1.0; // Default is square
    
    switch(shapeType) {
      case 0:
        // Standard rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth, tileHeight, 0.1);
        break;
      case 1:
        // Wider rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 1.2, tileHeight * 0.8, 0.1);
        aspectRatio = 1.5;
        break;
      case 2:
        // Taller rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 0.8, tileHeight * 1.2, 0.1);
        aspectRatio = 0.75;
        break;
    }
    
    const tile = new THREE.Mesh(tileGeometry, selectedMaterial);
    
    // Position tile based on wall orientation with small random offset for depth variation
    const depthVariation = (Math.random() * 0.1) + 0.05; // Small random additional offset
    
    if (isHorizontal) {
      // For front/back walls
      tile.position.set(
        baseX + randomPosition,
        baseY + tileHeight/2 + randomHeight,
        baseZ - (wallType === 'front' ? depthVariation : -depthVariation)
      );
      // Make sure correct face is showing
      if (wallType === 'front') {
        tile.rotation.y = Math.PI;
      }
    } else {
      // For left/right walls
      tile.position.set(
        baseX - (wallType === 'left' ? -depthVariation : depthVariation),
        baseY + tileHeight/2 + randomHeight,
        baseZ + randomPosition
      );
      // Make sure correct face is showing
      if (wallType === 'left') {
        tile.rotation.y = Math.PI;
      }
    }
    
    // Apply wall rotation - this makes the tile face outward from the wall
    tile.rotation.y += rotationY;
    
    // Random scale factor for varied sizes but maintaining the tile's aspect ratio
    const randomScale = 0.3 + Math.random() * 1.5;
    if (aspectRatio === 1.0) {
      tile.scale.set(randomScale, randomScale, 1);
    } else if (aspectRatio > 1.0) {
      // For wider tiles
      tile.scale.set(randomScale * aspectRatio, randomScale, 1);
    } else {
      // For taller tiles
      tile.scale.set(randomScale, randomScale / aspectRatio, 1);
    }
    
    tile.castShadow = true; // Enable shadows to increase visibility
    tile.receiveShadow = true;
    scene.add(tile);
  }
  
  // Create top area copper tiles (mirror of bottom area)
  for (let i = 0; i < tilesPerWall; i++) {
    // Random position within the top area
    const randomPosition = Math.random() * (rightBound - leftBound) + leftBound;
    const randomHeight = Math.random() * maxHeight + minHeight;
    
    // Select a random copper material
    const randomMaterialIndex = Math.floor(Math.random() * materials.length);
    const selectedMaterial = materials[randomMaterialIndex].clone();
    
    // Enhance material settings to make tiles more visible
    selectedMaterial.roughness = 0.4; // More shiny
    selectedMaterial.metalness = 0.9; // More metallic
    selectedMaterial.emissive = new THREE.Color(0x331100); // Subtle glow
    selectedMaterial.emissiveIntensity = 0.15;
    
    // Use BoxGeometry for 3D appearance but very thin (visible depth)
    const shapeType = Math.floor(Math.random() * 3);
    let tileGeometry;
    let aspectRatio = 1.0; // Default is square
    
    switch(shapeType) {
      case 0:
        // Standard rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth, tileHeight, 0.1);
        break;
      case 1:
        // Wider rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 1.2, tileHeight * 0.8, 0.1);
        aspectRatio = 1.5;
        break;
      case 2:
        // Taller rectangular tile
        tileGeometry = new THREE.BoxGeometry(tileWidth * 0.8, tileHeight * 1.2, 0.1);
        aspectRatio = 0.75;
        break;
    }
    
    const tile = new THREE.Mesh(tileGeometry, selectedMaterial);
    
    // Position tile based on wall orientation with small random offset for depth variation
    const depthVariation = (Math.random() * 0.1) + 0.05; // Small random additional offset
    
    if (isHorizontal) {
      // For front/back walls
      tile.position.set(
        baseX + randomPosition,
        baseY + wallHeight - tileHeight/2 - randomHeight,
        baseZ - (wallType === 'front' ? depthVariation : -depthVariation)
      );
      // Make sure correct face is showing
      if (wallType === 'front') {
        tile.rotation.y = Math.PI;
      }
    } else {
      // For left/right walls
      tile.position.set(
        baseX - (wallType === 'left' ? -depthVariation : depthVariation),
        baseY + wallHeight - tileHeight/2 - randomHeight,
        baseZ + randomPosition
      );
      // Make sure correct face is showing
      if (wallType === 'left') {
        tile.rotation.y = Math.PI;
      }
    }
    
    // Apply wall rotation - this makes the tile face outward from the wall
    tile.rotation.y += rotationY;
    
    // Random scale factor for varied sizes but maintaining the tile's aspect ratio
    const randomScale = 0.3 + Math.random() * 1.5;
    if (aspectRatio === 1.0) {
      tile.scale.set(randomScale, randomScale, 1);
    } else if (aspectRatio > 1.0) {
      // For wider tiles
      tile.scale.set(randomScale * aspectRatio, randomScale, 1);
    } else {
      // For taller tiles
      tile.scale.set(randomScale, randomScale / aspectRatio, 1);
    }
    
    tile.castShadow = true; // Enable shadows to increase visibility
    tile.receiveShadow = true;
    scene.add(tile);
  }
  
  // Add stronger lighting to highlight copper tiles
  const spotLight = new THREE.SpotLight(0xffe8d6, 0.8); // Increased intensity
  if (isHorizontal) {
    spotLight.position.set(baseX, wallHeight * 0.6, baseZ - (wallType === 'front' ? 15 : -15));
    spotLight.target.position.set(baseX, wallHeight * 0.3, baseZ);
  } else {
    spotLight.position.set(baseX - (wallType === 'right' ? 15 : -15), wallHeight * 0.6, baseZ);
    spotLight.target.position.set(baseX, wallHeight * 0.3, baseZ);
  }
  spotLight.angle = Math.PI / 5; // Wider angle
  spotLight.penumbra = 0.5; // Softer edges
  spotLight.decay = 1.2;
  spotLight.distance = 60;
  scene.add(spotLight);
  scene.add(spotLight.target);
  
  // Add a second highlight light from different angle
  const accentLight = new THREE.PointLight(0xffccaa, 0.5);
  if (isHorizontal) {
    accentLight.position.set(baseX + 20, wallHeight * 0.25, baseZ - (wallType === 'front' ? 10 : -10));
  } else {
    accentLight.position.set(baseX - (wallType === 'right' ? 10 : -10), wallHeight * 0.25, baseZ + 20);
  }
  scene.add(accentLight);
}

// Create a global position registry to track occupied positions on each wall
const positionRegistry = {
  front: [],
  back: [],
  left: [],
  right: []
};

// Utility function to check if a position is occupied
function isPositionOccupied(wallType, centerX, centerY, width, height, buffer = 1.0) {
  const registry = positionRegistry[wallType];
  
  // Create bounding box for the new item with buffer
  const newItemBounds = {
    left: centerX - (width / 2) - buffer,
    right: centerX + (width / 2) + buffer,
    top: centerY + (height / 2) + buffer,
    bottom: centerY - (height / 2) - buffer
  };
  
  // Check against all existing items
  for (const item of registry) {
    // Check for overlap with simple rectangle intersection
    if (!(newItemBounds.left > item.right || 
          newItemBounds.right < item.left || 
          newItemBounds.bottom > item.top || 
          newItemBounds.top < item.bottom)) {
      return true; // Overlap detected
    }
  }
  
  return false; // No overlap
}

// Utility function to register a position as occupied
function registerOccupiedPosition(wallType, centerX, centerY, width, height, buffer = 1.0) {
  const registry = positionRegistry[wallType];
  
  registry.push({
    left: centerX - (width / 2) - buffer,
    right: centerX + (width / 2) + buffer,
    top: centerY + (height / 2) + buffer,
    bottom: centerY - (height / 2) - buffer,
    centerX: centerX,
    centerY: centerY
  });
}

// Function to find a random unoccupied position on a wall
function findUnoccupiedPosition(wallType, itemWidth, itemHeight, minHeight, maxHeight) {
  const wallDimensions = getWallDimensions(wallType);
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Generate random position within wall bounds (accounting for item size)
    const buffer = itemWidth * 0.5;
    const randomX = Math.random() * (wallDimensions.width - (itemWidth + buffer * 2)) - wallDimensions.width/2 + itemWidth/2 + buffer;
    
    // Randomly choose a height between minHeight and maxHeight
    const randomY = Math.random() * (maxHeight - minHeight) + minHeight;
    
    // Check if position is occupied
    if (!isPositionOccupied(wallType, randomX, randomY, itemWidth, itemHeight)) {
      // Register this position as occupied
      registerOccupiedPosition(wallType, randomX, randomY, itemWidth, itemHeight);
      return { x: randomX, y: randomY };
    }
  }
  
  console.warn(`Could not find unoccupied position for ${wallType} wall after ${maxAttempts} attempts`);
  return null; // Could not find unoccupied position
}

// Helper function to get wall dimensions
function getWallDimensions(wallType) {
  switch(wallType) {
    case 'front':
    case 'back':
      return { width: roomWidth, height: roomHeight };
    case 'left':
    case 'right':
      return { width: roomLength, height: roomHeight };
    default:
      return { width: 0, height: 0 };
  }
}

function addMixedDecorationsToWalls() {
  // Load copper textures (different subset for Room B1)
  const textureLoader = new THREE.TextureLoader();
  const copperTextures = [];

  const copperFiles = [
    getTextureUrl('copper1'),
    getTextureUrl('copper4a'),
    getTextureUrl('copper4b'),
    getTextureUrl('copper4c')
  ];

  // Batched loading configuration
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 400; // 400ms delay between batches

  // Load copper textures in batches
  function loadCopperBatch(startIndex) {
    const endIndex = Math.min(startIndex + BATCH_SIZE, copperFiles.length);

    for (let i = startIndex; i < endIndex; i++) {
      const file = copperFiles[i];
      const texture = textureLoader.load(file, function(texture) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        console.log(`Copper texture ${i+1}/${copperFiles.length} loaded`);
      }, undefined, function(error) {
        console.error(`Error loading copper texture ${i+1}:`, error);
      });
      copperTextures.push(texture);
    }

    // Load next batch if there are more textures
    if (endIndex < copperFiles.length) {
      setTimeout(() => loadCopperBatch(endIndex), BATCH_DELAY);
    } else {
      // Start loading NFT textures after copper textures are queued
      setTimeout(() => loadNFTBatch(0), BATCH_DELAY);
    }
  }

  // Create materials for each copper texture (will be populated as textures load)
  const copperMaterials = copperFiles.map(() => {
    return new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.8,
      color: 0xddaa88 // Slight copper tint
    });
  });

  // Update materials as textures load
  copperTextures.forEach((texture, index) => {
    copperMaterials[index].map = texture;
    copperMaterials[index].needsUpdate = true;
  });

  // NFT Loading System - Load images first to get dimensions, then place with correct aspect ratio
  // This ensures all artwork is displayed in its original proportions

  // Room B1 NFT files (60 PNG images with descriptive names)
  const nftFiles = [
    'aha_its_over_--ar_34_--profile_4qkwdsq_--v_7_244e75f1-3bb1-41e0-8e04-50760d654377_0',
    'aha_its_over_--ar_34_--profile_4qkwdsq_--v_7_244e75f1-3bb1-41e0-8e04-50760d654377_2',
    'art_--ar_34_--profile_4qkwdsq_--v_7_94bfd84a-c95b-46b8-b1e8-d0bc8de511bf_3',
    'discombobulating_--ar_34_--v_7_c1d1258a-272a-4089-92e0-5fc250b71120_3',
    'dissolve_dissect_disperse_--ar_34_--profile_4qkwdsq_--v_7_cc45f451-c075-4703-a724-03c62e40d2c5_0',
    'dissolve_dissect_disperse_--ar_34_--profile_4qkwdsq_--v_7_cc45f451-c075-4703-a724-03c62e40d2c5_3',
    'dont_die_--ar_34_--v_7_870345a9-8c53-4805-bd11-c21f749b4403_0',
    'fever_in_style_--ar_34_--profile_4qkwdsq_--v_7_988a066a-9e98-47a2-a2eb-d6279088a44a_3',
    'forever_and_never_--ar_34_--profile_4qkwdsq_--v_7_cd78cef2-c57f-40ff-8af5-f79c938abd59_1',
    'fren_jaa_ko_ok_issa_min_baba_--chaos_15_--ar_34_--stylize_600_219366e1-b082-4f34-aa6e-10075bec2445_3',
    'frinda_lofte_berti_frassa_--chaos_35_--ar_34_--profile_4qkwds_e7a078e7-7ea6-4e3d-98d9-accee4cd5326_0',
    'frinda_lofte_berti_frassa_--chaos_35_--ar_34_--profile_4qkwds_e7a078e7-7ea6-4e3d-98d9-accee4cd5326_1',
    'fumbling_the_leader_--ar_34_--profile_4qkwdsq_--v_7_a7f391eb-9880-4ed6-a874-cad3bab76f73_0',
    'fumbling_the_leader_--ar_34_--profile_4qkwdsq_--v_7_a7f391eb-9880-4ed6-a874-cad3bab76f73_3',
    'guffaw_at_crossroad_station_--ar_34_--profile_4qkwdsq_--v_7_e430732a-e9b6-4ba1-9e4e-d621d17d65cc_0',
    'guffaw_at_crossroad_station_--ar_34_--profile_4qkwdsq_--v_7_e430732a-e9b6-4ba1-9e4e-d621d17d65cc_1',
    'guffaw_at_crossroad_station_--ar_34_--profile_4qkwdsq_--v_7_e430732a-e9b6-4ba1-9e4e-d621d17d65cc_3',
    'iubwdq_quwibpd_puioqnwodim_qmpwodmq_p_mqpwdmn_oqq_nwnwpq_d_nq_1308193b-9674-49be-9a6b-f23f417b78bb_0',
    'iubwdq_quwibpd_puioqnwodim_qmpwodmq_p_mqpwdmn_oqq_nwnwpq_d_nq_1308193b-9674-49be-9a6b-f23f417b78bb_3',
    'juntar_robnik_grasdu_plecki_--chaos_35_--ar_34_--profile_4qkw_c917eed1-6ff2-4d4e-a5c9-d9107642d6fe_0',
    'juntar_robnik_grasdu_plecki_--chaos_35_--ar_34_--profile_4qkw_c917eed1-6ff2-4d4e-a5c9-d9107642d6fe_3',
    'juuuuce_in_floooodin_bunt_schwarz_weis_brei_--chaos_35_--ar_3_71ef9bbc-8d03-47ff-9503-5c1332d4a450_0',
    'juuuuce_in_floooodin_bunt_schwarz_weis_brei_--chaos_35_--ar_3_71ef9bbc-8d03-47ff-9503-5c1332d4a450_2',
    'juuuuce_in_floooodin_bunt_schwarz_weis_brei_--chaos_35_--ar_3_71ef9bbc-8d03-47ff-9503-5c1332d4a450_3',
    'kin_--ar_34_--profile_4qkwdsq_--v_7_e043d59a-5db8-44d9-81d8-7a82cace814a_2',
    'klaaar_1_waran_bvjskdj_--chaos_15_--ar_34_--stylize_600_--wei_932f8c4a-da46-466d-b46f-7f3586153e45_1',
    'klaaar_1_waran_bvjskdj_--chaos_15_--ar_34_--stylize_600_--wei_932f8c4a-da46-466d-b46f-7f3586153e45_3',
    'lakidaci_nagasaki_kaki_flaki_--chaos_35_--ar_34_--stylize_250_aca4c470-5a67-4d6a-9b94-24b75c80239b_1',
    'lakidaci_nagasaki_kaki_flaki_--chaos_35_--ar_34_--stylize_250_aca4c470-5a67-4d6a-9b94-24b75c80239b_3',
    'licking_boots_while_feeding_moods_circus_de_macabre_lemur_dan_e03846cd-e87f-4276-93e4-8aa3a2ebd13d_0',
    'licking_boots_while_feeding_moods_circus_de_macabre_lemur_dan_e03846cd-e87f-4276-93e4-8aa3a2ebd13d_3',
    'lokopterin_brazzs_freek_--chaos_35_--ar_34_--profile_4qkwdsq__8a07fc15-2251-4ed0-93e2-656297ddef53_0',
    'lokopterin_brazzs_freek_--chaos_35_--ar_34_--profile_4qkwdsq__8a07fc15-2251-4ed0-93e2-656297ddef53_1',
    'lokopterin_brazzs_freek_--chaos_35_--ar_34_--profile_4qkwdsq__8a07fc15-2251-4ed0-93e2-656297ddef53_2',
    'lokopterin_brazzs_freek_--chaos_35_--ar_34_--profile_4qkwdsq__8a07fc15-2251-4ed0-93e2-656297ddef53_3',
    'lugubrious_ducks_--ar_34_--profile_4qkwdsq_--v_7_625312db-00c1-4aac-810b-6d7d51b7ce5c_0',
    'luntar_progir_dembel_kallun_--chaos_35_--ar_34_--profile_4qkw_8fecfaeb-5660-44f8-8c0c-c36279f5df31_0',
    'obfuscate_--ar_34_--v_7_60f612de-8d3e-4365-9f5e-6a6ca22902d1_0',
    'purgatory_--ar_34_--profile_4qkwdsq_--v_7_de305a88-c937-428a-8c55-26026821f9c8_2',
    'simp_--ar_34_--profile_4qkwdsq_--v_7_b0c9b510-9fd7-4889-aa4e-6c3909ab19c1_0',
    'simp_--ar_34_--profile_4qkwdsq_--v_7_b0c9b510-9fd7-4889-aa4e-6c3909ab19c1_2',
    'smear_campaign_in_Pamplona_--ar_34_--profile_4qkwdsq_--v_7_1978fa5c-7f2c-4e04-8abc-aca640d3ff8b_1',
    'tann_freee_q_q_2_--chaos_35_--ar_34_--profile_4qkwdsq_--styli_e85249cf-1f98-4a99-997c-1da9d49ff7ca_0',
    'tann_freee_q_q_2_--chaos_35_--ar_34_--profile_4qkwdsq_--styli_e85249cf-1f98-4a99-997c-1da9d49ff7ca_1',
    'tann_freee_q_q_2_--chaos_35_--ar_34_--profile_4qkwdsq_--styli_e85249cf-1f98-4a99-997c-1da9d49ff7ca_2',
    'tann_freee_q_q_2_--chaos_35_--ar_34_--profile_4qkwdsq_--styli_e85249cf-1f98-4a99-997c-1da9d49ff7ca_3',
    'tantalizing_idols_--chaos_35_--ar_34_--profile_4qkwdsq_--styl_c076f05f-ad0f-4da7-9978-e66e0dfc2b99_0',
    'tantalizing_idols_--chaos_35_--ar_34_--profile_4qkwdsq_--styl_c076f05f-ad0f-4da7-9978-e66e0dfc2b99_3',
    'tartufon_pho_n_e_ai_nut_--chaos_35_--ar_34_--stylize_250_--we_8dc61495-e5a8-4f97-8965-50ce127efec0_2',
    'tartufon_pho_n_e_ai_nut_--chaos_35_--ar_34_--stylize_250_--we_8dc61495-e5a8-4f97-8965-50ce127efec0_3',
    'trembling_haze_licking_one_color_code_--chaos_50_--ar_34_--pr_e61beb04-1cb4-4369-8365-8b1f6b03c9d3_2',
    'trouble_beyond_repair_--ar_34_--profile_eamzyo3_--v_7_ca2c34b7-9c92-467f-a31a-f1dc5ca2e0fb_1',
    'truc_sinbaa_qokaju_inpim_--chaos_35_--ar_34_--stylize_250_--w_c73a34c8-479f-46d6-90dd-07e2c1567b22_1',
    'truc_sinbaa_qokaju_inpim_--chaos_35_--ar_34_--stylize_250_--w_c73a34c8-479f-46d6-90dd-07e2c1567b22_2',
    'tuton_faseda_lilino_pitcha_caan_--chaos_35_--ar_34_--profile__0dcbcf1d-68a1-49e4-aa85-a6731dea5cdc_2',
    'water_dripping_viscous_oozing_monochrome_liquids_solo_color_i_efa0881a-a126-4d45-9fc3-061253c7a22e_1',
    'what_when_where_--ar_34_--profile_4qkwdsq_--v_7_78bc0823-14e1-43ca-ae20-0ee0f69af435_0',
    'what_when_where_--ar_34_--profile_4qkwdsq_--v_7_78bc0823-14e1-43ca-ae20-0ee0f69af435_1',
    'what_when_where_--ar_34_--profile_4qkwdsq_--v_7_78bc0823-14e1-43ca-ae20-0ee0f69af435_2',
    'what_when_where_--ar_34_--profile_4qkwdsq_--v_7_78bc0823-14e1-43ca-ae20-0ee0f69af435_3'
  ].map(name => `RoomB1/${name}`);

  const minHeight = 5;
  const maxHeight = roomHeight - 5;
  const wallTypes = ['front', 'back', 'left', 'right'];
  const maxFrameDimension = 12; // Maximum size for any dimension
  const minFrameDimension = 6;  // Minimum size for any dimension

  let loadedCount = 0;
  let currentWallIndex = 0;

  console.log('Loading NFTs with proper aspect ratios...');

  // Load each NFT, get its dimensions, then place it with correct aspect ratio
  function loadAndPlaceNFT(index) {
    if (index >= nftFiles.length) {
      console.log(`Finished loading ${loadedCount} NFTs with proper aspect ratios`);
      return;
    }

    const filename = nftFiles[index];
    const img = new Image();

    img.onload = function() {
      // Calculate aspect ratio and frame dimensions
      const aspectRatio = img.width / img.height;
      let frameWidth, frameHeight;

      if (aspectRatio >= 1) {
        // Wider than tall (landscape or square)
        frameWidth = maxFrameDimension;
        frameHeight = maxFrameDimension / aspectRatio;
        if (frameHeight < minFrameDimension) {
          frameHeight = minFrameDimension;
          frameWidth = frameHeight * aspectRatio;
        }
      } else {
        // Taller than wide (portrait)
        frameHeight = maxFrameDimension;
        frameWidth = maxFrameDimension * aspectRatio;
        if (frameWidth < minFrameDimension) {
          frameWidth = minFrameDimension;
          frameHeight = frameWidth / aspectRatio;
        }
      }

      // Distribute across walls evenly
      const wallType = wallTypes[currentWallIndex % 4];
      currentWallIndex++;

      // Find position for this NFT
      const position = findUnoccupiedPosition(wallType, frameWidth, frameHeight, minHeight, maxHeight);

      if (position) {
        // Load the actual texture
        textureLoader.load(
          `/assets/${filename}.png`,
          function(tex) {
            tex.colorSpace = THREE.SRGBColorSpace;

            const artMaterial = new THREE.MeshBasicMaterial({
              map: tex,
              side: THREE.DoubleSide
            });

            placeArtFrameOnWallWithMaterial(wallType, artMaterial, frameWidth, frameHeight, position.x, position.y);
            loadedCount++;
            console.log(`Placed NFT ${loadedCount}/${nftFiles.length}: ${filename} (${img.width}x${img.height} -> ${frameWidth.toFixed(1)}x${frameHeight.toFixed(1)})`);

            // Load next NFT
            setTimeout(() => loadAndPlaceNFT(index + 1), 30);
          },
          undefined,
          function(error) {
            console.error(`Error loading NFT texture ${filename}:`, error);
            setTimeout(() => loadAndPlaceNFT(index + 1), 30);
          }
        );
      } else {
        // Try other walls if first choice didn't work
        let placed = false;
        for (const tryWall of wallTypes) {
          const tryPos = findUnoccupiedPosition(tryWall, frameWidth, frameHeight, minHeight, maxHeight);
          if (tryPos) {
            textureLoader.load(
              `/assets/${filename}.png`,
              function(tex) {
                tex.colorSpace = THREE.SRGBColorSpace;
                const artMaterial = new THREE.MeshBasicMaterial({
                  map: tex,
                  side: THREE.DoubleSide
                });
                placeArtFrameOnWallWithMaterial(tryWall, artMaterial, frameWidth, frameHeight, tryPos.x, tryPos.y);
                loadedCount++;
                console.log(`Placed NFT ${loadedCount}/${nftFiles.length}: ${filename}`);
                setTimeout(() => loadAndPlaceNFT(index + 1), 30);
              },
              undefined,
              function(error) {
                console.error(`Error loading NFT texture ${filename}:`, error);
                setTimeout(() => loadAndPlaceNFT(index + 1), 30);
              }
            );
            placed = true;
            break;
          }
        }
        if (!placed) {
          console.warn(`Could not place NFT ${index + 1}: ${filename}`);
          setTimeout(() => loadAndPlaceNFT(index + 1), 30);
        }
      }
    };

    img.onerror = function() {
      console.error(`Error loading image dimensions for ${filename}`);
      setTimeout(() => loadAndPlaceNFT(index + 1), 30);
    };

    // Start loading the image to get dimensions
    img.src = `/assets/${filename}.png`;
  }

  // Start loading NFTs (multiple concurrent loaders for faster loading)
  const CONCURRENT_LOADERS = 4;
  for (let i = 0; i < CONCURRENT_LOADERS; i++) {
    setTimeout(() => loadAndPlaceNFT(i * Math.ceil(nftFiles.length / CONCURRENT_LOADERS)), i * 100);
  }

  // STEP 3: Start loading copper textures (they run in parallel)
  loadCopperBatch(0);

  // STEP 4: Place copper tiles in remaining spaces (after NFT positions are reserved)

  // Define copper tile dimensions
  const tileWidth = 3.5;
  const tileHeight = 3.5;
  const phi = 1.618033988749895; // Golden ratio for reference
  
  // Calculate the number of copper tiles per wall (many more than NFTs)
  const maxCopperTilesPerWall = 80; // Increased number for better filling
  
  // For each wall type, place copper tiles
  wallTypes.forEach(wallType => {
    let tilesPlaced = 0;
    let consecutiveFailures = 0;
    
    while (tilesPlaced < maxCopperTilesPerWall && consecutiveFailures < 50) {
      // Randomly vary the tile size
      const randomScale = 0.3 + Math.random() * 1.2;
      let aspectRatio = 1.0;
      
      // Select a shape type
      const shapeType = Math.floor(Math.random() * 3);
      let actualWidth, actualHeight;
      
      switch(shapeType) {
        case 0: // Square
          actualWidth = tileWidth * randomScale;
          actualHeight = tileHeight * randomScale;
          break;
        case 1: // Wider
          actualWidth = tileWidth * randomScale * 1.2;
          actualHeight = tileHeight * randomScale * 0.8;
          aspectRatio = 1.5;
          break;
        case 2: // Taller
          actualWidth = tileWidth * randomScale * 0.8;
          actualHeight = tileHeight * randomScale * 1.2;
          aspectRatio = 0.75;
          break;
      }
      
      // Randomize vertical position more freely now
      const position = findUnoccupiedPosition(wallType, actualWidth, actualHeight, 1, roomHeight - 1);
      
      if (position) {
        // Place copper tile
        placeCopperTileOnWall(
          wallType,
          copperMaterials,
          actualWidth,
          actualHeight,
          position.x,
          position.y,
          aspectRatio
        );
        
        tilesPlaced++;
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
      }
    }
    
    console.log(`Placed ${tilesPlaced} copper tiles on ${wallType} wall`);
  });
}

// Function to place an art frame with a pre-created material (for progressive loading)
function placeArtFrameOnWallWithMaterial(wallType, artMaterial, frameWidth, frameHeight, xPosition, yPosition) {
  // Determine the wall position and orientation
  let wallX, wallZ, rotationY;

  switch(wallType) {
    case 'front':
      wallX = 0;
      wallZ = roomLength/2 - 0.3;
      rotationY = 0;
      break;
    case 'back':
      wallX = 0;
      wallZ = -roomLength/2 + 0.3;
      rotationY = Math.PI;
      break;
    case 'left':
      wallX = -roomWidth/2 + 0.3;
      wallZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallX = roomWidth/2 - 0.3;
      wallZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }

  // Calculate the final position based on wall orientation
  let finalX, finalZ;

  if (wallType === 'front' || wallType === 'back') {
    finalX = xPosition;
    finalZ = 0;
  } else {
    finalX = 0;
    finalZ = xPosition;
  }

  // Create frame backing
  const frameBackGeometry = new THREE.BoxGeometry(frameWidth + 0.8, frameHeight + 0.8, 0.2);
  const frameBackMat = new THREE.MeshStandardMaterial({
    color: 0x332211,
    roughness: 0.8,
    metalness: 0.2
  });
  const frameBack = new THREE.Mesh(frameBackGeometry, frameBackMat);
  frameBack.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  frameBack.rotation.y = rotationY;
  frameBack.castShadow = true;
  scene.add(frameBack);

  // Create actual artwork with the provided material
  const artGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight);
  const artwork = new THREE.Mesh(artGeometry, artMaterial);

  // Position just in front of the frame backing
  let artOffset = 0.15;
  let zOffset = 0, xOffset = 0;

  if (rotationY === 0) {
    zOffset = -artOffset;
  } else if (rotationY === Math.PI) {
    zOffset = artOffset;
  } else if (rotationY === Math.PI / 2) {
    xOffset = artOffset;
  } else if (rotationY === -Math.PI / 2) {
    xOffset = -artOffset;
  }

  artwork.position.set(wallX + finalX + xOffset, yPosition, wallZ + finalZ + zOffset);

  if (rotationY === Math.PI / 2 || rotationY === -Math.PI / 2) {
    artwork.rotation.y = rotationY + Math.PI;
  } else {
    artwork.rotation.y = rotationY;
  }

  scene.add(artwork);

  // Add spotlight
  const spotLight = new THREE.SpotLight(0xffffff, 0.3, 30, Math.PI/8, 0.8, 1);

  if (rotationY === 0) {
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ + 8);
  } else if (rotationY === Math.PI) {
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ - 8);
  } else if (rotationY === Math.PI / 2) {
    spotLight.position.set(wallX + finalX - 8, yPosition + 5, wallZ + finalZ);
  } else if (rotationY === -Math.PI / 2) {
    spotLight.position.set(wallX + finalX + 8, yPosition + 5, wallZ + finalZ);
  }

  spotLight.target.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  scene.add(spotLight);
  scene.add(spotLight.target);
}

// Function to place an art frame on a specific wall (legacy - used by copper tiles)
function placeArtFrameOnWall(wallType, texture, dimensions, frameWidth, frameHeight, xPosition, yPosition) {
  // Determine the wall position and orientation
  let wallX, wallZ, rotationY;

  switch(wallType) {
    case 'front':
      wallX = 0;
      wallZ = roomLength/2 - 0.3;
      rotationY = 0;
      break;
    case 'back':
      wallX = 0;
      wallZ = -roomLength/2 + 0.3;
      rotationY = Math.PI;
      break;
    case 'left':
      wallX = -roomWidth/2 + 0.3;
      wallZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallX = roomWidth/2 - 0.3;
      wallZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }

  // Calculate the final position based on wall orientation
  let finalX, finalZ;

  if (wallType === 'front' || wallType === 'back') {
    finalX = xPosition;
    finalZ = 0;
  } else { // left or right
    finalX = 0;
    finalZ = xPosition; // Use xPosition as z-coordinate for side walls
  }

  // Create frame backing
  const frameBackGeometry = new THREE.BoxGeometry(frameWidth + 0.8, frameHeight + 0.8, 0.2);
  const frameBackMaterial = new THREE.MeshStandardMaterial({
    color: 0x332211, // Dark wood color
    roughness: 0.8,
    metalness: 0.2
  });
  const frameBack = new THREE.Mesh(frameBackGeometry, frameBackMaterial);
  frameBack.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  frameBack.rotation.y = rotationY;
  frameBack.castShadow = true;
  scene.add(frameBack);
  
  // Create actual artwork
  const artGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight);
  const artMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide // Allow viewing from both sides to be safe
  });
  const artwork = new THREE.Mesh(artGeometry, artMaterial);
  
  // Position just in front of the frame backing
  let artOffset = 0.15;
  let zOffset = 0, xOffset = 0;
  
  // Calculate offset direction based on wall orientation
  // Ensure artwork faces inward for all walls
  if (rotationY === 0) { // Front wall
    zOffset = -artOffset; // Offset toward room center
  } else if (rotationY === Math.PI) { // Back wall
    zOffset = artOffset; // Offset toward room center
  } else if (rotationY === Math.PI / 2) { // Left wall
    xOffset = artOffset; // Offset toward room center
  } else if (rotationY === -Math.PI / 2) { // Right wall
    xOffset = -artOffset; // Offset toward room center
  }
  
  artwork.position.set(wallX + finalX + xOffset, yPosition, wallZ + finalZ + zOffset);
  
  // Set artwork rotation to face inward for all walls
  // For left and right walls, we need to adjust the rotation by 180 degrees
  if (rotationY === Math.PI / 2) { // Left wall
    artwork.rotation.y = rotationY + Math.PI; // Add 180 degrees to face inward
  } else if (rotationY === -Math.PI / 2) { // Right wall
    artwork.rotation.y = rotationY + Math.PI; // Add 180 degrees to face inward
  } else {
  artwork.rotation.y = rotationY;
  }
  
  scene.add(artwork);
  
  // Add a subtle spotlight to illuminate the artwork
  const spotLight = new THREE.SpotLight(0xffffff, 0.3, 30, Math.PI/8, 0.8, 1);
  
  // Adjust spotlight position to shine toward the artwork from inside the room
  if (rotationY === 0) { // Front wall
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ + 8); // Position inside room
  } else if (rotationY === Math.PI) { // Back wall
    spotLight.position.set(wallX + finalX, yPosition + 5, wallZ + finalZ - 8); // Position inside room
  } else if (rotationY === Math.PI / 2) { // Left wall
    spotLight.position.set(wallX + finalX - 8, yPosition + 5, wallZ + finalZ); // Position inside room
  } else if (rotationY === -Math.PI / 2) { // Right wall
    spotLight.position.set(wallX + finalX + 8, yPosition + 5, wallZ + finalZ); // Position inside room
  }
  
  spotLight.target.position.set(wallX + finalX, yPosition, wallZ + finalZ);
  scene.add(spotLight);
  scene.add(spotLight.target);
}

// Function to place a copper tile on a specific wall
function placeCopperTileOnWall(wallType, materials, tileWidth, tileHeight, xPosition, yPosition, aspectRatio) {
  // Determine the wall position and orientation
  let wallX, wallZ, rotationY;
  const wallOffset = 0.25;
  
  switch(wallType) {
    case 'front':
      wallX = 0;
      wallZ = roomLength/2 - wallOffset;
      rotationY = 0;
      break;
    case 'back':
      wallX = 0;
      wallZ = -roomLength/2 + wallOffset;
      rotationY = Math.PI;
      break;
    case 'left':
      wallX = -roomWidth/2 + wallOffset;
      wallZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      wallX = roomWidth/2 - wallOffset;
      wallZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }
  
  // Calculate the final position based on wall orientation
  let finalX, finalZ;
  
  if (wallType === 'front' || wallType === 'back') {
    finalX = xPosition;
    finalZ = 0;
  } else { // left or right
    finalX = 0;
    finalZ = xPosition; // Use xPosition as z-coordinate for side walls
  }
  
  // Select a random copper material
  const randomMaterialIndex = Math.floor(Math.random() * materials.length);
  const selectedMaterial = materials[randomMaterialIndex].clone();
  
  // Enhance material settings to make tiles more visible
  selectedMaterial.roughness = 0.4; // More shiny
  selectedMaterial.metalness = 0.9; // More metallic
  selectedMaterial.emissive = new THREE.Color(0x331100); // Subtle glow
  selectedMaterial.emissiveIntensity = 0.15;
  
  // Create tile geometry
  const tileGeometry = new THREE.BoxGeometry(tileWidth, tileHeight, 0.1);
  const tile = new THREE.Mesh(tileGeometry, selectedMaterial);
  
  // Position tile with small random depth variation
  const depthVariation = (Math.random() * 0.1) + 0.05;
  
  // Position based on wall type
  if (wallType === 'front') {
    tile.position.set(wallX + finalX, yPosition, wallZ - depthVariation);
    tile.rotation.y = Math.PI; // Face inward
  } else if (wallType === 'back') {
    tile.position.set(wallX + finalX, yPosition, wallZ + depthVariation);
    tile.rotation.y = 0; // Face inward
  } else if (wallType === 'left') {
    tile.position.set(wallX + depthVariation, yPosition, wallZ + finalZ);
    tile.rotation.y = -Math.PI / 2; // Face inward
  } else if (wallType === 'right') {
    tile.position.set(wallX - depthVariation, yPosition, wallZ + finalZ);
    tile.rotation.y = Math.PI / 2; // Face inward
  }
  
  // Subtle random rotation for variety, but not too much
  tile.rotation.z = (Math.random() - 0.5) * 0.2;
  tile.rotation.x = (Math.random() - 0.5) * 0.2;
  
  tile.castShadow = true;
  tile.receiveShadow = true;
  scene.add(tile);
  
  // Add a very subtle point light near some tiles for additional highlights
  if (Math.random() > 0.8) { // Only 20% of tiles get lights
    const tileLight = new THREE.PointLight(0xffccaa, 0.2, 10);
    tileLight.position.copy(tile.position);
    
    // Move light slightly toward room center
    if (wallType === 'front') {
      tileLight.position.z -= 2;
    } else if (wallType === 'back') {
      tileLight.position.z += 2;
    } else if (wallType === 'left') {
      tileLight.position.x += 2;
    } else if (wallType === 'right') {
      tileLight.position.x -= 2;
    }
    
    scene.add(tileLight);
  }
}

function createLighting() {
  // Ambient light - increased intensity for larger room
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Brighter ambient light for better artwork visibility
  scene.add(ambientLight);
  
  // Main directional light (sunlight) - repositioned for larger room
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(60, 80, 60);
  directionalLight.castShadow = true;
  
  // Optimize shadows for larger room
  directionalLight.shadow.mapSize.width = 4096;
  directionalLight.shadow.mapSize.height = 4096;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 300;
  directionalLight.shadow.camera.left = -150;
  directionalLight.shadow.camera.right = 150;
  directionalLight.shadow.camera.top = 150;
  directionalLight.shadow.camera.bottom = -150;
  directionalLight.shadow.bias = -0.0005;
  scene.add(directionalLight);
  
  // Additional point lights for better illumination in corners
  const pointLight1 = new THREE.PointLight(0xffffff, 0.7, 150);
  pointLight1.position.set(30, 40, 30);
  pointLight1.castShadow = true;
  // Optimize shadows for point light
  pointLight1.shadow.mapSize.width = 1024;
  pointLight1.shadow.mapSize.height = 1024;
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 120);
  pointLight2.position.set(-40, 25, -40);
  pointLight2.castShadow = true;
  pointLight2.shadow.mapSize.width = 1024;
  pointLight2.shadow.mapSize.height = 1024;
  scene.add(pointLight2);
  
  // Add colored accent lighting for visual interest
  const blueLight = new THREE.PointLight(0x0044ff, 0.3, 100);
  blueLight.position.set(-roomWidth * 0.3, 20, roomLength * 0.3);
  scene.add(blueLight);
  
  const purpleLight = new THREE.PointLight(0x8800ff, 0.3, 100);
  purpleLight.position.set(roomWidth * 0.3, 15, roomLength * 0.3);
  scene.add(purpleLight);
  
  // Gallery lighting - soft warm light
  const galleryLight1 = new THREE.PointLight(0xffe3c0, 0.4, 100);
  galleryLight1.position.set(0, roomHeight * 0.7, 0);
  scene.add(galleryLight1);
  
  const galleryLight2 = new THREE.PointLight(0xffe3c0, 0.4, 100);
  galleryLight2.position.set(-roomWidth * 0.25, roomHeight * 0.7, -roomLength * 0.25);
  scene.add(galleryLight2);
  
  const galleryLight3 = new THREE.PointLight(0xffe3c0, 0.4, 100);
  galleryLight3.position.set(roomWidth * 0.25, roomHeight * 0.7, roomLength * 0.25);
  scene.add(galleryLight3);
}

// ----------------------------------------------------------------------
// Create Hidden Hole Portal to Room B2
// A mysterious hole in the floor - walk into it and fall to the next room
// ----------------------------------------------------------------------
const holePosition = { x: roomWidth/2 - 15, z: roomLength/2 - 15 };
const holeRadius = 4;
const fallDepthToTeleport = 30; // How far to fall before triggering teleport
let isFallingInHole = false;
let fallStartY = 0;
let teleportTriggered = false;

function createHolePortal() {
  // Create a dark pit/hole in the floor
  // The hole is a cylinder going down with dark interior

  // Create the hole rim (a ring around the hole)
  const rimGeometry = new THREE.RingGeometry(holeRadius, holeRadius + 0.5, 32);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(holePosition.x, groundLevel + 0.02, holePosition.z);
  scene.add(rim);

  // Create the dark pit interior (a cylinder going down)
  const pitDepth = 100; // Visual depth of the pit
  const pitGeometry = new THREE.CylinderGeometry(holeRadius, holeRadius, pitDepth, 32, 1, true);
  const pitMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide // Render inside of cylinder
  });
  const pit = new THREE.Mesh(pitGeometry, pitMaterial);
  pit.position.set(holePosition.x, groundLevel - pitDepth/2, holePosition.z);
  scene.add(pit);

  // Add a subtle dark glow around the hole
  const glowGeometry = new THREE.RingGeometry(holeRadius + 0.5, holeRadius + 2, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x111122,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(holePosition.x, groundLevel + 0.01, holePosition.z);
  scene.add(glow);

  // Add dim light inside the pit for mysterious effect
  const pitLight = new THREE.PointLight(0x220033, 0.3, 50);
  pitLight.position.set(holePosition.x, groundLevel - 10, holePosition.z);
  scene.add(pitLight);

  console.log('Created hidden hole portal at', holePosition.x, holePosition.z);
}

// ----------------------------------------------------------------------
// Check if Player is Over the Hole
// ----------------------------------------------------------------------
function isOverHole() {
  const dx = camera.position.x - holePosition.x;
  const dz = camera.position.z - holePosition.z;
  const distance = Math.sqrt(dx * dx + dz * dz);
  return distance < holeRadius;
}

// ----------------------------------------------------------------------
// Handle Falling Through Hole
// ----------------------------------------------------------------------
function handleHoleFalling(delta) {
  if (teleportTriggered) return;

  if (isOverHole()) {
    if (!isFallingInHole) {
      // Start falling into the hole
      isFallingInHole = true;
      fallStartY = camera.position.y;
      isJumping = true; // Use the existing jump/fall system
      jumpVelocity = 0; // Start with no velocity, gravity will pull down
      console.log('Falling into the hole...');
    }

    // Check if we've fallen far enough to trigger teleport
    const fallDistance = fallStartY - camera.position.y;
    if (fallDistance > fallDepthToTeleport && !teleportTriggered) {
      teleportTriggered = true;
      console.log('Teleporting to Room B2 after falling', fallDistance.toFixed(1), 'units');

      // Show loading screen
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
      }

      // Teleport after a short delay
      setTimeout(() => {
        window.location.href = 'roomB2.html';
      }, 500);
    }
  }
}

// ----------------------------------------------------------------------
// Initialize Scene
// ----------------------------------------------------------------------
function initializeRoom() {
  console.log("Initializing Room B1 (Gallery Room)...");

  // Create the basic room structure
  console.log("Creating room structure and mixed decorations...");
  createBasicRoom();

  // Create hidden hole portal to Room B2
  console.log("Creating hidden hole portal to Room B2...");
  createHolePortal();
  
  // Load GLB model
  console.log("Loading GLB model...");
  loadGLBModel();
  
  // Start the animation loop
  console.log("Starting animation loop...");
  animate();
  
  console.log("Room initialization complete!");
}

// ----------------------------------------------------------------------
// Load GLB Model
// ----------------------------------------------------------------------
function loadGLBModel() {
  const loader = new GLTFLoader();
  
  // Show loading progress
  const loadingManager = new THREE.LoadingManager();
  
  loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    console.log(`Loading model: ${Math.round(itemsLoaded / itemsTotal * 100)}%`);
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      const loadingBar = loadingOverlay.querySelector('.loading-bar');
      if (loadingBar) {
        loadingBar.style.width = `${Math.round(itemsLoaded / itemsTotal * 100)}%`;
      }
    }
  };
  
  loadingManager.onLoad = function() {
    console.log("All models loaded successfully");
    modelLoaded = true;
    
    // Hide loading overlay when everything is loaded
    setTimeout(() => {
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
          loadingOverlay.style.display = 'none';
        }, 500);
      }
    }, 500);
  };
  
  loadingManager.onError = function(url) {
    console.error('Error loading:', url);
    modelLoadingError = true;
    
    // Even if loading fails, hide the overlay after a delay
    setTimeout(() => {
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }, 2000);
  };
  
  // Use a loading manager with the GLTFLoader
  const gltfLoader = new GLTFLoader(loadingManager);
  
  // Load the model
  gltfLoader.load(
    // Path to your GLB file
    '/assets/aviary_gallery.glb',
    
    // On successful load
    function(gltf) {
      loadedModel = gltf.scene;
      
      // Scale the model to fit the room 
      loadedModel.scale.set(10, 10, 10);
      
      // Position the model in the center of the room
      loadedModel.position.set(
        0,  // Center X
        1,  // Just above the floor
        0   // Center Z
      );
      
      // Make sure the model casts and receives shadows
      loadedModel.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // Optional: If materials need adjustments
          if (node.material) {
            node.material.roughness = 0.7; // Less shiny
            node.material.metalness = 0.3; // Less metallic
          }
        }
      });
      
      // Add the model to the scene
      scene.add(loadedModel);
      console.log('GLB model loaded successfully');
    },
    
    // On loading progress
    function(xhr) {
      console.log(`Model ${xhr.loaded / xhr.total * 100}% loaded`);
    },
    
    // On error
    function(error) {
      console.error('An error occurred loading the GLB model:', error);
      
      // Even if this specific model fails, allow the scene to be shown
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }
  );
}

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  
  // Update the mirror ceiling reflection
  if (mirrorCubeCamera && ceilingMirror) {
    // Hide the ceiling temporarily to prevent it from being in its own reflection
    ceilingMirror.visible = false;
    
    // Update the cube camera render target
    mirrorCubeCamera.update(renderer, scene);
    
    // Make the ceiling visible again
    ceilingMirror.visible = true;
  }
  
  if (controls.isLocked) {
    const delta = clock.getDelta();

    // Get time delta for smooth movement
    const speedDelta = speed * delta;

    // Apply movement in the direction the camera is facing
    if (moveForward) {
      controls.moveForward(speedDelta);
    }
    if (moveBackward) {
      controls.moveForward(-speedDelta);
    }
    if (moveLeft) {
      controls.moveRight(-speedDelta);
    }
    if (moveRight) {
      controls.moveRight(speedDelta);
    }

    // Handle jumping and gravity with hover zone near ceiling
    if (isJumping) {
      // Apply hover gravity when near ceiling, normal gravity otherwise
      const currentGravity = camera.position.y >= hoverZoneHeight ? hoverGravity : gravity;
      jumpVelocity += currentGravity * delta;

      // Update position based on velocity
      let newY = camera.position.y + jumpVelocity * delta;

      // Ceiling collision - bounce off
      if (newY >= roomHeight - eyeHeight) {
        newY = roomHeight - eyeHeight;
        jumpVelocity = -jumpVelocity * bounceCoefficient; // Bounce down
      }

      // Ground collision - but allow falling through the hole
      if (newY <= groundLevel + eyeHeight) {
        if (isOverHole() && isFallingInHole) {
          // Allow falling through the hole - no ground collision
          // Keep falling
        } else {
          // Normal ground collision
          newY = groundLevel + eyeHeight;
          isJumping = false;
          jumpVelocity = 0;
          isFallingInHole = false; // Reset hole falling state
        }
      }

      camera.position.y = newY;
    }

    // Handle falling through the hole
    handleHoleFalling(delta);

    // Add boundary check to keep player inside the room
    const boundaryBuffer = 2;

    // Keep X position inside room boundaries
    if (camera.position.x < -roomWidth/2 + boundaryBuffer) {
      camera.position.x = -roomWidth/2 + boundaryBuffer;
    } else if (camera.position.x > roomWidth/2 - boundaryBuffer) {
      camera.position.x = roomWidth/2 - boundaryBuffer;
    }

    // Keep Z position inside room boundaries
    if (camera.position.z < -roomLength/2 + boundaryBuffer) {
      camera.position.z = -roomLength/2 + boundaryBuffer;
    } else if (camera.position.z > roomLength/2 - boundaryBuffer) {
      camera.position.z = roomLength/2 - boundaryBuffer;
    }
  }
  
  // Render the scene
  renderer.render(scene, camera);
}

// ----------------------------------------------------------------------
// Fix for loading screen and initialization
// ----------------------------------------------------------------------
window.addEventListener('load', () => {
  console.log("Window loaded, initializing room...");
  
  // Add a listener for the loading overlay to ensure it can be shown/hidden
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    console.log("Loading overlay found, ensuring it's visible during loading");
    loadingOverlay.style.display = 'flex';
  } else {
    console.error("Loading overlay element not found in the HTML");
  }
  
  // Initialize the room after a short delay
setTimeout(() => {
  try {
      initializeRoom();
  } catch(e) {
    console.error("Failed to initialize room:", e);
      // Hide loading overlay even if initialization fails
      if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
      }
    }
  }, 500);
});

// Add error handler to ensure loading overlay is hidden if there's an error
window.addEventListener('error', function(event) {
  console.error('Error caught:', event.error || event.message);
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
});

// Initial camera position - raised height
camera.position.set(0, groundLevel + eyeHeight, 0);
camera.lookAt(0, groundLevel + eyeHeight, 10);

// Click handler to lock controls
window.addEventListener('click', () => {
  if (!controls.isLocked) {
    controls.lock();
  }
}); 