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
import { ProgressiveTextureLoader } from './src/core/progressive-loader.js';

// ----------------------------------------------------------------------
// Scene Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b8e9f); // Slightly darker blue-gray for Room B1

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Set rotation order to YXZ to prevent gimbal lock with PointerLockControls
camera.rotation.order = 'YXZ';
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
const eyeHeight = 16.0; // Doubled for better viewing angle
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

// Global reference for NFT planes (for texture upgrades)
let picturePlanes = [];

// Create controls
const controls = new PointerLockControls(camera, document.body);

// Set pitch limits to prevent gimbal lock (polar angles)
// These limit how far up/down the user can look
controls.minPolarAngle = Math.PI * 0.05;  // Can look almost straight up (9°)
controls.maxPolarAngle = Math.PI * 0.95;  // Can look almost straight down (171°)

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
  
  // Note: mirrorCubeRenderTarget must stay square (cube maps require square faces)
  // Keep it at its original 1024x1024 size - no resize needed
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
  const floorTexture = textureLoader.load('/assets/RoomB1/b1floor2.webp', function(texture) {
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

  // Place NFTs on walls
  placeNFTsOnWalls();
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

// Organized NFT placement with progressive loading
// - 2 columns per wall (15 per wall = 60 total)
// - Dynamic sizing based on aspect ratio (vertical/horizontal/square)
// - Instant 128×128 gray placeholders for camera responsiveness
// - Progressive upgrade to full-res textures (max 3 concurrent)
function placeNFTsOnWalls() {
  const progressiveLoader = new ProgressiveTextureLoader((loaded, total) => {
    console.log(`Room B1: Loaded ${loaded}/${total} NFTs`);
  });

  // Room B1 NFT files (60 WebP images from RoomB1 folder)
  const nftFiles = [
    'ComfyUI_03174_', 'ComfyUI_03175_', 'ComfyUI_03176_', 'ComfyUI_03178_',
    'ComfyUI_03179_', 'ComfyUI_03180_', 'ComfyUI_03181_', 'ComfyUI_03182_',
    'ComfyUI_03183_', 'ComfyUI_03184_', 'ComfyUI_03185_', 'ComfyUI_03186_',
    'ComfyUI_03187_', 'ComfyUI_03188_', 'ComfyUI_03189_', 'ComfyUI_03190_',
    'ComfyUI_03191_', 'ComfyUI_03192_', 'ComfyUI_03193_', 'ComfyUI_03194_',
    'ComfyUI_03195_', 'ComfyUI_03196_', 'ComfyUI_03197_', 'ComfyUI_03198_',
    'ComfyUI_03199_', 'ComfyUI_03200_', 'ComfyUI_03201_', 'ComfyUI_03202_',
    'ComfyUI_03203_', 'ComfyUI_03204_', 'ComfyUI_03205_', 'ComfyUI_03206_',
    'ComfyUI_03207_', 'ComfyUI_03208_', 'ComfyUI_03209_', 'ComfyUI_03210_',
    'ComfyUI_03211_', 'ComfyUI_03212_', 'ComfyUI_03213_', 'ComfyUI_03214_',
    'ComfyUI_03215_', 'ComfyUI_03216_', 'ComfyUI_03217_', 'ComfyUI_03218_',
    'ComfyUI_03219_', 'ComfyUI_03220_', 'ComfyUI_03221_', 'ComfyUI_03222_',
    'ComfyUI_03223_', 'ComfyUI_03224_', 'ComfyUI_03225_', 'ComfyUI_03226_',
    'ComfyUI_03227_', 'ComfyUI_03228_', 'ComfyUI_03229_', 'ComfyUI_03230_',
    'ComfyUI_03231_', 'ComfyUI_03232_', 'ComfyUI_03233_', 'ComfyUI_03234_'
  ];

  const minY = 10;
  const maxY = roomHeight - 8;
  const columns = 2;
  const nftsPerWall = 15;
  const wallMargin = 15;
  const spacingBuffer = 2; // Min gap between frames
  const defaultFrameSize = 12; // Default size (updated when image loads)

  // Position registry for collision detection
  const positionRegistry = { front: [], back: [], left: [], right: [] };

  const walls = [
    { name: 'front', pos: new THREE.Vector3(0, 0, roomLength/2),  normal: new THREE.Vector3(0, 0, -1), width: roomWidth },
    { name: 'back',  pos: new THREE.Vector3(0, 0, -roomLength/2), normal: new THREE.Vector3(0, 0, 1),  width: roomWidth },
    { name: 'left',  pos: new THREE.Vector3(-roomWidth/2, 0, 0),  normal: new THREE.Vector3(1, 0, 0),  width: roomLength },
    { name: 'right', pos: new THREE.Vector3(roomWidth/2, 0, 0),   normal: new THREE.Vector3(-1, 0, 0), width: roomLength }
  ];

  function getGridPosition(wall, index, totalOnWall) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const actualRows = Math.ceil(totalOnWall / columns);
    const usableWidth = wall.width - (wallMargin * 2);
    const usableHeight = maxY - minY;
    const colSpacing = usableWidth / (columns + 1);
    const rowSpacing = usableHeight / (actualRows + 1);
    const xPos = -wall.width/2 + wallMargin + colSpacing * (col + 1);
    const yPos = minY + rowSpacing * (row + 1);
    return { x: xPos, y: yPos };
  }

  function calculateFrameSize(aspectRatio) {
    const maxDim = 14;
    if (aspectRatio > 1.5) {
      return { width: maxDim, height: maxDim / aspectRatio };
    } else if (aspectRatio < 0.67) {
      return { width: maxDim * aspectRatio, height: maxDim };
    } else {
      const avgDim = 12;
      return {
        width: avgDim * Math.sqrt(aspectRatio),
        height: avgDim / Math.sqrt(aspectRatio)
      };
    }
  }

  function isPositionOccupied(wallName, centerX, centerY, width, height) {
    const rect1 = {
      left: centerX - width / 2 - spacingBuffer,
      right: centerX + width / 2 + spacingBuffer,
      top: centerY - height / 2 - spacingBuffer,
      bottom: centerY + height / 2 + spacingBuffer
    };
    return positionRegistry[wallName].some(rect2 => {
      return !(rect1.right < rect2.left || rect1.left > rect2.right ||
               rect1.bottom < rect2.top || rect1.top > rect2.bottom);
    });
  }

  function registerPosition(wallName, centerX, centerY, width, height) {
    positionRegistry[wallName].push({
      left: centerX - width / 2 - spacingBuffer,
      right: centerX + width / 2 + spacingBuffer,
      top: centerY - height / 2 - spacingBuffer,
      bottom: centerY + height / 2 + spacingBuffer
    });
  }

  function findNearbyPosition(wallName, basePos, frameSize, maxOffset = 3) {
    const attempts = [
      basePos,
      { x: basePos.x + maxOffset, y: basePos.y },
      { x: basePos.x - maxOffset, y: basePos.y },
      { x: basePos.x, y: basePos.y + maxOffset },
      { x: basePos.x, y: basePos.y - maxOffset }
    ];

    for (const pos of attempts) {
      if (!isPositionOccupied(wallName, pos.x, pos.y, frameSize.width, frameSize.height)) {
        return pos;
      }
    }
    return basePos;
  }

  let nftIndex = 0;

  walls.forEach((wall) => {
    const nftsOnThisWall = Math.min(nftsPerWall, nftFiles.length - nftIndex);

    for (let i = 0; i < nftsOnThisWall && nftIndex < nftFiles.length; i++) {
      const filename = nftFiles[nftIndex];
      const imgPath = `/assets/RoomB1/${filename}.webp`;
      const gridIndex = nftIndex;
      const currentWall = wall;

      // STEP 1: Calculate position using DEFAULT size (before image loads)
      const basePos = getGridPosition(currentWall, i, nftsOnThisWall);
      const defaultSize = { width: defaultFrameSize, height: defaultFrameSize };

      // Check collisions with default size
      let finalPos = basePos;
      if (isPositionOccupied(currentWall.name, basePos.x, basePos.y, defaultSize.width, defaultSize.height)) {
        finalPos = findNearbyPosition(currentWall.name, basePos, defaultSize, 3);
      }
      registerPosition(currentWall.name, finalPos.x, finalPos.y, defaultSize.width, defaultSize.height);

      // STEP 2: Get placeholder material IMMEDIATELY
      const { placeholderMaterial, upgradePromise } = progressiveLoader.loadWithPlaceholder(imgPath, {
        side: THREE.DoubleSide
      });

      // STEP 3: Create frame group with PLACEHOLDER geometry (instant, visible immediately)
      const frameGroup = new THREE.Group();

      // Frame backing with default size
      const backingGeometry = new THREE.BoxGeometry(defaultSize.width, defaultSize.height, 0.2);
      const backingMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const frameBacking = new THREE.Mesh(backingGeometry, backingMaterial);
      frameGroup.add(frameBacking);

      // Plane with placeholder material
      const planeGeometry = new THREE.PlaneGeometry(defaultSize.width * 0.95, defaultSize.height * 0.95);
      const plane = new THREE.Mesh(planeGeometry, placeholderMaterial);
      plane.position.z = 0.5;
      plane.userData = { isNFT: true, index: gridIndex, imageUrl: imgPath };
      frameGroup.add(plane);
      picturePlanes.push(plane);

      // Position on wall
      let x = finalPos.x, y = finalPos.y, z;
      if (currentWall.name === 'front' || currentWall.name === 'back') {
        z = currentWall.pos.z + currentWall.normal.z * 0.25;
      } else {
        z = finalPos.x;
        x = currentWall.pos.x + currentWall.normal.x * 0.25;
      }

      frameGroup.position.set(x, y, z);

      // Rotate to face room
      if (currentWall.name === 'front') frameGroup.rotation.y = 0;
      else if (currentWall.name === 'back') frameGroup.rotation.y = Math.PI;
      else if (currentWall.name === 'left') frameGroup.rotation.y = Math.PI / 2;
      else if (currentWall.name === 'right') frameGroup.rotation.y = -Math.PI / 2;

      // ADD TO SCENE IMMEDIATELY (placeholder visible)
      scene.add(frameGroup);

      // STEP 4: Load image asynchronously to get real dimensions
      const img = new Image();
      img.onload = () => {
        try {
          const aspectRatio = img.width / img.height;
          const newSize = calculateFrameSize(aspectRatio);

          // Only resize if dimensions differ significantly from default
          if (Math.abs(newSize.width - defaultSize.width) > 0.5 ||
              Math.abs(newSize.height - defaultSize.height) > 0.5) {

            // Update backing geometry
            backingGeometry.dispose();
            const newBackingGeometry = new THREE.BoxGeometry(newSize.width, newSize.height, 0.2);
            frameBacking.geometry = newBackingGeometry;

            // Update plane geometry
            planeGeometry.dispose();
            const newPlaneGeometry = new THREE.PlaneGeometry(newSize.width * 0.95, newSize.height * 0.95);
            plane.geometry = newPlaneGeometry;
          }
        } catch (err) {
          console.error(`Error processing image dimensions for ${filename}:`, err);
        }
      };

      img.onerror = () => {
        console.warn(`Failed to load image ${filename} - using placeholder`);
      };

      img.src = imgPath;

      // STEP 5: Upgrade material when texture loads
      upgradePromise.then((fullResMaterial) => {
        plane.material = fullResMaterial;
        plane.material.needsUpdate = true;
      }).catch(err => {
        console.error(`Failed to load texture for ${filename}:`, err);
      });

      nftIndex++;
    }
  });

  console.log(`Room B1: Placing ${nftFiles.length} NFTs in organized grid with progressive loading`);
}

function createMirrorCeiling() {
  // Create a dynamic cube render target with HDR format for better reflections
  const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  // Note: RGBFormat is deprecated in Three.js r152+, omitting format to use default
  
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
    // Get player object (camera parent in PointerLockControls)
    const player = controls.getObject();
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

    // Handle jumping and gravity with hover zone near ceiling (use player.position)
    if (isJumping) {
      // Apply hover gravity when near ceiling, normal gravity otherwise
      const currentGravity = player.position.y >= hoverZoneHeight ? hoverGravity : gravity;
      jumpVelocity += currentGravity * delta;

      // Update position based on velocity
      let newY = player.position.y + jumpVelocity * delta;

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

      player.position.y = newY;
    }

    // Handle falling through the hole
    handleHoleFalling(delta);

    // Add boundary check to keep player inside the room
    const boundaryBuffer = 2;

    // Keep X position inside room boundaries
    if (player.position.x < -roomWidth/2 + boundaryBuffer) {
      player.position.x = -roomWidth/2 + boundaryBuffer;
    } else if (player.position.x > roomWidth/2 - boundaryBuffer) {
      player.position.x = roomWidth/2 - boundaryBuffer;
    }

    // Keep Z position inside room boundaries
    if (player.position.z < -roomLength/2 + boundaryBuffer) {
      player.position.z = -roomLength/2 + boundaryBuffer;
    } else if (player.position.z > roomLength/2 - boundaryBuffer) {
      player.position.z = roomLength/2 - boundaryBuffer;
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