// Changes made:
// - Created roomB.js with an open space design featuring a simple floor with surrounding walls
// - Added a portal connection to room0
// - Implemented minimalist design with simple geometry and wood texture floor
// - Used the same controls as other rooms for movement and camera panning
// - Created an enclosed box structure with high ceilings
// - Fixed camera controls to match other rooms
// - Increased camera height for better visibility (now at 8.0)
// - Increased movement speed for faster navigation
// - Added GLB model loading functionality with GLTFLoader
// - Fixed loading bar issues
// - Removed all platforms and ramps as requested
// - Added textured wood floor with mosaic pattern: wood_floor2 with wood_floor1 inlays positioned in top-left corner, center, and bottom-right of each tile
// - Created walls decorated with NFT artwork randomly scattered across all four walls
// - Added randomly scattered copper tiles at the top and bottom of all four walls using multiple copper textures (copper1-4) with varying sizes and orientations
// - Applied metal2.jpeg texture to the walls for a full metallic room theme
// - Made the ceiling reflective to create a mirror effect that reflects the entire room
// - Randomized NFT placement and mixed with copper tiles while preventing overlaps

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ----------------------------------------------------------------------
// Scene Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Light blue sky background

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
let isFloating = false; // New state for floating camera mode
let jumpVelocity = 0;
const gravity = -10; // Reduced further from -15 to create even slower descent
const initialJumpVelocity = 35; // Increased from 20 to reach near ceiling
const bounceCoefficient = 0.3; // Reduced from 0.5 for softer bounces
const hoverZoneHeight = roomHeight - 3; // Define hover zone 3 units from ceiling
const hoverGravity = -2; // Much weaker gravity in the hover zone
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

// Create both control types
const controls = new PointerLockControls(camera, document.body);
const orbitControls = new OrbitControls(camera, document.body);
orbitControls.enabled = false; // Start with orbit controls disabled
orbitControls.enableZoom = false; // Disable zooming
orbitControls.enablePan = false; // Disable panning
orbitControls.enableDamping = true; // Enable smooth damping
orbitControls.dampingFactor = 0.05;

// Add constraints to orbit controls
orbitControls.maxDistance = 20; // Limit how far you can orbit from the point
orbitControls.minDistance = 1; // Limit how close you can get
orbitControls.maxPolarAngle = Math.PI * 0.85; // Limit vertical rotation
orbitControls.minPolarAngle = Math.PI * 0.15; // Limit vertical rotation

// Store camera position and rotation for switching between control modes
let savedCameraPosition = new THREE.Vector3();
let savedCameraRotation = new THREE.Euler();
let savedOrbitTarget = new THREE.Vector3();

scene.add(controls.getObject());

// Add state variables for storing jump state
let savedJumpVelocity = 0;
let wasJumpingBeforeFloat = false;

// Modified key handlers
const onKeyDown = function (event) {
    if (event.code === 'Escape' && isFloating) {
        // When pressing ESC in floating mode:
        // - Stop the music
        // - Keep current camera position and state
        // - Resume jump from saved state
        audioPlayer.pause();
        isFloating = false;
        orbitControls.enabled = false;
        
        // Restore complete jump state
        isJumping = wasJumpingBeforeFloat;
        jumpVelocity = savedJumpVelocity;
        
        // Lock controls to return to normal movement mode
    controls.lock();
        return;
    }

    if (isFloating && event.code === 'Space') {
        // Resume normal movement
        isFloating = false;
        orbitControls.enabled = false;
        controls.lock();
        return;
    }

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
            if (!isJumping && !isFloating) {
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

// Add audio player
const audioPlayer = new Audio('/assets/songroomB.mp3');
audioPlayer.loop = true; // Optional: make the song loop when it ends

// Modified pointer lock change handler
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === null && isJumping) {
        // When exiting pointer lock while jumping, enter floating mode
        isFloating = true;
        
        // Save complete jump state
        wasJumpingBeforeFloat = isJumping;
        savedJumpVelocity = jumpVelocity;
        savedCameraPosition.copy(camera.position);
        savedCameraRotation.copy(camera.rotation);
        
        // Set orbit controls target to a point in front of the camera
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(camera.rotation);
        savedOrbitTarget.copy(camera.position).add(direction.multiplyScalar(10));
        orbitControls.target.copy(savedOrbitTarget);
        
        // Enable orbit controls from current position
        orbitControls.enabled = true;
        orbitControls.update();
        
        // Play audio from where it was paused
        audioPlayer.play();
    }
});

// Add right-click handler
document.addEventListener('contextmenu', (event) => {
  if (isFloating) {
    event.preventDefault(); // Prevent default right-click menu
  }
});

// Add mouse button handlers
document.addEventListener('mousedown', (event) => {
  if (isFloating && event.button === 2) { // Right click
    orbitControls.enabled = true;
  }
});

document.addEventListener('mouseup', (event) => {
  if (isFloating && event.button === 2) { // Right click release
    orbitControls.enabled = false;
    // Preserve the last position and rotation
    savedCameraPosition.copy(camera.position);
    savedCameraRotation.copy(camera.rotation);
  }
});

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
  // Load wood floor textures
  const textureLoader = new THREE.TextureLoader();
  
  // Load wood_floor2 texture (main floor)
  const woodTexture2 = textureLoader.load('public/assets/wood_floor2.jpeg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Instead of repeating the whole texture 10x10 times, we'll use a smaller repeat
    // to make the individual tiles more visible for our mosaic pattern
    texture.repeat.set(12, 12);
    texture.encoding = THREE.sRGBEncoding;
    console.log('Wood floor 2 texture loaded successfully');
  }, undefined, function(error) {
    console.error('Error loading wood floor 2 texture:', error);
  });
  
  // Load wood_floor1 texture (inlay sections)
  const woodTexture1 = textureLoader.load('public/assets/wood_floor1.jpeg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    texture.encoding = THREE.sRGBEncoding;
    console.log('Wood floor 1 texture loaded successfully');
  }, undefined, function(error) {
    console.error('Error loading wood floor 1 texture:', error);
  });
  
  // Create main floor with wood_floor2 texture
  const mainFloorGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
  const mainFloorMaterial = new THREE.MeshStandardMaterial({ 
    map: woodTexture2,
    roughness: 0.8, 
    metalness: 0.2
  });
  const mainFloor = new THREE.Mesh(mainFloorGeometry, mainFloorMaterial);
  mainFloor.rotation.x = -Math.PI / 2;
  mainFloor.position.y = groundLevel;
  mainFloor.receiveShadow = true;
  scene.add(mainFloor);
  
  // Now create a grid of inlays using wood_floor1 texture
  const tilesPerRow = 12;
  const tilesPerCol = 12;
  const tileWidth = roomWidth / tilesPerRow;
  const tileLength = roomLength / tilesPerCol;
  
  // For each tile, create inlays in top-left corner, center, and bottom-right
  for (let row = 0; row < tilesPerRow; row++) {
    for (let col = 0; col < tilesPerCol; col++) {
      // Calculate the size of the inlay (20% of the tile)
      const inlayWidth = tileWidth * 0.2;
      const inlayLength = tileLength * 0.2;
      
      // Create and place the top-left inlay
      createTileInlay(
        woodTexture1, 
        inlayWidth, 
        inlayLength, 
        -roomWidth/2 + col * tileWidth + inlayWidth/2, // Position at top-left of tile
        -roomLength/2 + (row + 1) * tileLength - inlayLength/2,
        col, 
        row, 
        tilesPerRow, 
        tilesPerCol
      );
      
      // Create and place the center inlay
      createTileInlay(
        woodTexture1, 
        inlayWidth, 
        inlayLength, 
        -roomWidth/2 + col * tileWidth + tileWidth/2, // Position at center of tile
        -roomLength/2 + row * tileLength + tileLength/2,
        col, 
        row, 
        tilesPerRow, 
        tilesPerCol
      );
      
      // Create and place the bottom-right inlay
      createTileInlay(
        woodTexture1, 
        inlayWidth, 
        inlayLength, 
        -roomWidth/2 + (col + 1) * tileWidth - inlayWidth/2, // Position at bottom-right of tile
        -roomLength/2 + row * tileLength + inlayLength/2,
        col, 
        row, 
        tilesPerRow, 
        tilesPerCol
      );
    }
  }
  
  // Helper function to create an inlay with proper UV mapping
  function createTileInlay(texture, width, length, posX, posZ, col, row, tilesPerRow, tilesPerCol) {
    // Create inlay geometry
    const inlayGeometry = new THREE.PlaneGeometry(width, length);
    
    // Use the upper 10% portion of wood_floor1 texture
    const inlayMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.25
    });
    
    // To capture the upper 10% of the source texture for each inlay,
    // we need to modify the UV mapping of the geometry
    const uvs = inlayGeometry.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      // Shrink UVs to 20% of their range and offset to upper region
      uvs.setXY(
        i,
        uvs.getX(i) * 0.2 + (col / tilesPerRow),
        uvs.getY(i) * 0.2 + (0.8 + (row / tilesPerCol) * 0.2)
      );
    }
    
    const inlay = new THREE.Mesh(inlayGeometry, inlayMaterial);
    inlay.rotation.x = -Math.PI / 2;
    
    inlay.position.set(
      posX,
      groundLevel + 0.01, // Slightly above main floor
      posZ
    );
    
    inlay.receiveShadow = true;
    scene.add(inlay);
  }
}

function createTexturedWalls() {
  // Wall thickness
  const wallThickness = 0.5;
  
  // Create plain base walls
  createBaseWalls(wallThickness);
  
  // Add mixed artwork and copper tiles to walls
  addMixedDecorationsToWalls();
}

function createBaseWalls(thickness) {
  // Load metal2 texture for walls
  const textureLoader = new THREE.TextureLoader();
  const metalTexture = textureLoader.load('public/assets/metal2.jpeg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 4); // Repeat to cover the large walls
    console.log('Metal wall texture loaded successfully');
  }, undefined, function(error) {
    console.error('Error loading metal wall texture:', error);
  });
  
  // Create walls with metal texture
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    map: metalTexture,
    roughness: 0.6, 
    metalness: 0.7,
    color: 0xffffff // Default color, texture will override
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

  // Add copper wave pattern decorations to walls
  addCopperWavePatterns();
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
  // Load all copper textures
  const textureLoader = new THREE.TextureLoader();
  const copperTextures = [];
  
  const copperFiles = [
    'public/assets/copper1.jpeg',
    'public/assets/copper2.jpeg',
    'public/assets/copper3.jpeg',
    'public/assets/copper4.jpeg',
    'public/assets/copper4a.jpeg',
    'public/assets/copper4b.jpeg',
    'public/assets/copper4c.jpeg'
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
  // Load all copper textures
  const textureLoader = new THREE.TextureLoader();
  const copperTextures = [];
  
  const copperFiles = [
    'public/assets/copper1.jpeg',
    'public/assets/copper2.jpeg',
    'public/assets/copper3.jpeg',
    'public/assets/copper4.jpeg',
    'public/assets/copper4a.jpeg',
    'public/assets/copper4b.jpeg',
    'public/assets/copper4c.jpeg'
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
  
  // Load all NFT images
  const nftImages = [];
  const nftDimensions = []; // Array to store the original dimensions of each NFT
  
  // Generate file names B1.png to B60.png
  const nftFiles = [];
  for (let i = 1; i <= 60; i++) {
    nftFiles.push(`RoomB/B${i}.png`);
  }
  
  // Preload all Room B NFT images
  for (const filename of nftFiles) {
    const texture = textureLoader.load('public/assets/' + filename, function(tex) {
      tex.encoding = THREE.sRGBEncoding;
      
      // Store the actual dimensions of the loaded texture
      const dimensions = {
        width: tex.image.width,
        height: tex.image.height,
        aspectRatio: tex.image.width / tex.image.height
      };
      nftDimensions.push(dimensions);
      
      console.log(`Loaded NFT texture: ${filename} (${dimensions.width}x${dimensions.height})`);
    }, undefined, function(error) {
      console.error(`Error loading NFT texture ${filename}:`, error);
      // Push a default dimension in case of error
      nftDimensions.push({ width: 512, height: 512, aspectRatio: 1 });
    });
    nftImages.push(texture);
  }
  
  // Define the range for the NFT and copper tile placement
  const minHeight = 5; // Minimum height from floor (meters)
  const maxHeight = roomHeight - 5; // Maximum height from floor (meters)
  
  // Define wall types
  const wallTypes = ['front', 'back', 'left', 'right'];
  
  // 1. Randomly distribute NFTs across all four walls
  const nftsPerWall = Math.ceil(60 / 4); // Equal distribution by default
  let nftIndex = 0;
  
  // For each wall type, place NFTs first (they're more important)
  wallTypes.forEach(wallType => {
    const nftsForThisWall = Math.min(nftsPerWall, 60 - nftIndex);
    
    for (let i = 0; i < nftsForThisWall && nftIndex < 60; i++) {
      // Get the current NFT
      const currentTexture = nftImages[nftIndex];
      const dimensions = nftDimensions[nftIndex] || { width: 512, height: 512, aspectRatio: 1 };
      
      // Calculate frame size based on a reasonable base size
      const baseSize = 7 + (Math.random() * 6); // Random size between 7 and 13
      let frameWidth, frameHeight;
      
      // Calculate dimensions based on aspect ratio
      if (dimensions.aspectRatio >= 1) {
        // Wider than tall
        frameWidth = baseSize * Math.sqrt(dimensions.aspectRatio);
        frameHeight = baseSize / Math.sqrt(dimensions.aspectRatio);
      } else {
        // Taller than wide
        frameWidth = baseSize * dimensions.aspectRatio;
        frameHeight = baseSize / dimensions.aspectRatio;
      }
      
      // Find an unoccupied position for this NFT
      const position = findUnoccupiedPosition(wallType, frameWidth, frameHeight, minHeight, maxHeight);
      
      if (position) {
        // Place the NFT at this position
        placeArtFrameOnWall(
          wallType,
          currentTexture,
          dimensions,
          frameWidth,
      frameHeight,
          position.x,
          position.y
        );
        
        nftIndex++;
      } else {
        // Couldn't find a position on this wall, try another wall
        break;
      }
    }
  });
  
  // If we still have NFTs left, distribute them anywhere we can find space
  while (nftIndex < 60) {
    // Choose a random wall
    const randomWallType = wallTypes[Math.floor(Math.random() * wallTypes.length)];
    
    // Get the current NFT
    const currentTexture = nftImages[nftIndex];
    const dimensions = nftDimensions[nftIndex] || { width: 512, height: 512, aspectRatio: 1 };
    
    // Calculate frame size
    const baseSize = 7 + (Math.random() * 6); // Random size between 7 and 13
    let frameWidth, frameHeight;
    
    // Calculate dimensions based on aspect ratio
    if (dimensions.aspectRatio >= 1) {
      frameWidth = baseSize * Math.sqrt(dimensions.aspectRatio);
      frameHeight = baseSize / Math.sqrt(dimensions.aspectRatio);
    } else {
      frameWidth = baseSize * dimensions.aspectRatio;
      frameHeight = baseSize / dimensions.aspectRatio;
    }
    
    // Find an unoccupied position
    const position = findUnoccupiedPosition(randomWallType, frameWidth, frameHeight, minHeight, maxHeight);
    
    if (position) {
      // Place the NFT at this position
      placeArtFrameOnWall(
        randomWallType,
        currentTexture,
        dimensions,
        frameWidth,
        frameHeight,
        position.x,
        position.y
      );
      
      nftIndex++;
    } else {
      // Try another wall if we can't place it on this one
      continue;
    }
  }
  
  // 2. Now add copper tiles where there are still free spaces
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

// Function to place an art frame on a specific wall
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
// Create Portal Back to Room 0
// ----------------------------------------------------------------------
function createPortalToRoom0() {
  const portalGeometry = new THREE.CircleGeometry(3.5, 32); // Larger portal for larger room
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0x00aaaa, // Match room0 portal color
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  
  // Position portal at the back wall near the center at eye height
  portal.position.set(0, groundLevel + eyeHeight, roomLength/2 - 15);
  portal.rotation.y = Math.PI; // Face toward the center of the room
  scene.add(portal);

  const glowGeometry = new THREE.CircleGeometry(4.2, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00cccc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(portal.position);
  glow.rotation.copy(portal.rotation);
  scene.add(glow);

  // Add a light to make the portal more visible
  const portalLight = new THREE.PointLight(0x00aaaa, 2.0, 20);
  portalLight.position.copy(portal.position);
  portalLight.position.z -= 1; // Position light slightly in front of portal
  scene.add(portalLight);

  // Add a label above the portal
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512; // Larger canvas for better text quality
  canvas.height = 128;
  context.fillStyle = '#ffffff';
  context.font = 'Bold 32px Arial'; // Larger font
  context.textAlign = 'center';
  context.fillText('Back to Ocean Room', canvas.width / 2, canvas.height / 2);
  
  const labelTexture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: labelTexture,
    side: THREE.DoubleSide,
    transparent: true
  });
  
  const labelGeometry = new THREE.PlaneGeometry(6, 1.5); // Larger label
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.set(portal.position.x, portal.position.y + 4, portal.position.z);
  label.rotation.copy(portal.rotation);
  scene.add(label);

  return { portal, glow, portalLight, label };
}

// ----------------------------------------------------------------------
// Check Portal Proximity for Teleportation
// ----------------------------------------------------------------------
function checkPortalProximity() {
  // Calculate distance between player and portal
  const portalPosition = new THREE.Vector3(0, groundLevel + eyeHeight, roomLength/2 - 15);
  const distance = camera.position.distanceTo(portalPosition);
  
  // When player is within 7 units of the portal (increased for larger room), show prompt
  if (distance < 7) {
    document.getElementById('controls-description').textContent = 'Approach portal to return to Ocean Room';
    document.getElementById('controls-description').style.display = 'block';
    
    // When player is within 3.5 units of the portal, teleport automatically
    if (distance < 3.5) {
      console.log('Teleporting to Room 0');
      
      // Show loading screen
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
      }
      
      // Add a small delay before teleporting for smoother transition
      setTimeout(() => {
        window.location.href = 'room0.html';
      }, 200);
    }
  } else {
    document.getElementById('controls-description').textContent = 'Controls: WASD - Move, Mouse - Look, SPACE - Jump';
  }
}

// ----------------------------------------------------------------------
// Initialize Scene
// ----------------------------------------------------------------------
function initializeRoom() {
  console.log("Initializing Room B (Gallery Room)...");
  
  // Create the basic room structure
  console.log("Creating room structure and mixed decorations...");
  createBasicRoom();
  
  // Create portal back to room 0
  console.log("Creating portal to Room 0...");
  createPortalToRoom0();
  
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
    'public/assets/aviary_gallery.glb',
    
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
  
  if (isFloating) {
    // Update orbit controls if enabled
    if (orbitControls.enabled) {
      orbitControls.update();
      
      // Keep camera within room bounds
      const halfWidth = roomWidth / 2 - 2;
      const halfLength = roomLength / 2 - 2;
      
      camera.position.x = Math.max(-halfWidth, Math.min(halfWidth, camera.position.x));
      camera.position.z = Math.max(-halfLength, Math.min(halfLength, camera.position.z));
      camera.position.y = Math.max(eyeHeight, Math.min(roomHeight - 1, camera.position.y));
      
      // Update saved position to current constrained position
      savedCameraPosition.copy(camera.position);
      savedCameraRotation.copy(camera.rotation);
    } else {
      // Keep the camera in place when not orbiting
      camera.position.copy(savedCameraPosition);
      camera.rotation.copy(savedCameraRotation);
    }
  } else if (controls.isLocked) {
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
    
    // Handle jumping and gravity
    if (isJumping) {
      // Apply gravity based on height
      if (camera.position.y >= hoverZoneHeight) {
        // In hover zone - apply much weaker gravity
        jumpVelocity += hoverGravity * delta;
      } else {
        // Normal gravity below hover zone
      jumpVelocity += gravity * delta;
      }
      
      // Update position based on velocity
      let newY = camera.position.y + jumpVelocity * delta;
      
      // Check for ceiling collision (leave 1 unit gap from ceiling)
      if (newY >= roomHeight - 1) {
        newY = roomHeight - 1;
        // Gentler bounce near ceiling
        jumpVelocity = -jumpVelocity * bounceCoefficient;
      }
      
      if (newY <= groundLevel + eyeHeight) {
        // If we're at ground level
        newY = groundLevel + eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
      }
      
      camera.position.y = newY;
    }
    
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
    
    // Check portal proximity
    checkPortalProximity();
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
  if (!controls.isLocked && !isFloating) {
    controls.lock();
  }
}); 