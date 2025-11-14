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
// - Created walls decorated with NFT artwork facing inward

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
let jumpVelocity = 0;
const gravity = -30;
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

// ----------------------------------------------------------------------
// Controls Setup
// ----------------------------------------------------------------------
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Initial camera position - raised height
camera.position.set(0, groundLevel + eyeHeight, 0);
camera.lookAt(0, groundLevel + eyeHeight, 10);

// Click handler to lock controls
window.addEventListener('click', () => {
  if (!controls.isLocked) {
    controls.lock();
  }
});

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
        jumpVelocity = 10;
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

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// Window resize handler
window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  const woodTexture2 = textureLoader.load('/assets/wood_floor2.jpeg', function(texture) {
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
  const woodTexture1 = textureLoader.load('/assets/wood_floor1.jpeg', function(texture) {
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
  
  // Add artwork to walls
  addArtworkToWalls();
}

function createBaseWalls(thickness) {
  // Create basic walls in white/neutral color
  const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xf5f5f5, // Light neutral color
    roughness: 0.9,
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
  
  // Create ceiling
  const ceilingGeometry = new THREE.PlaneGeometry(roomWidth, roomLength);
  const ceilingMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xffffff,
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4
  });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomHeight;
  ceiling.receiveShadow = true;
  scene.add(ceiling);
}

function addArtworkToWalls() {
  // Load NFT images for artwork
  const textureLoader = new THREE.TextureLoader();
  const nftImages = [];
  
  // Select a curated set of NFT images
  const nftFiles = [
    'nft73.png', 'nft74.png', 'nft75.png', 'nft76.png', 'nft77.png', 'nft78.png',
    'nft79.png', 'nft80.png', 'nft81.png', 'nft82.png', 'nft83.png', 'nft84.png',
    'nft85.png', 'nft86.png', 'nft87.png', 'nft88.png', 'nft89.png', 'nft90.png',
    'nft91.png', 'nft92.png', 'nft93.png', 'nft94.png', 'nft95.png', 'nft96.png',
    'nft97.png', 'nft98.png', 'nft99.png', 'nft100.png', 'nft101.png', 'nft102.png',
    'nft103.png', 'nft104.png', 'nft105.png', 'nft106.png', 'nft107.png'
  ];
  
  // Preload all NFT images
  for (const filename of nftFiles) {
    const texture = textureLoader.load('/assets/' + filename, function(tex) {
      tex.encoding = THREE.sRGBEncoding;
      console.log(`Loaded NFT texture: ${filename}`);
    }, undefined, function(error) {
      console.error(`Error loading NFT texture ${filename}:`, error);
    });
    nftImages.push(texture);
  }
  
  // Add artwork to each wall
  addArtworkToWall('front', nftImages);
  addArtworkToWall('back', nftImages);
  addArtworkToWall('left', nftImages);
  addArtworkToWall('right', nftImages);
}

function addArtworkToWall(side, images) {
  // Number of frames on each wall
  let frameCount, wallWidth, wallHeight, wallX, wallZ, rotationY;
  const frameSize = 10; // Size of artwork frames
  const frameSpacing = 5; // Space between frames
  const frameHeight = 20; // Height from floor to center of frame
  
  // Configure based on wall side
  switch(side) {
    case 'front':
      frameCount = 8; // Fewer on entrance wall
      wallWidth = roomWidth;
      wallHeight = roomHeight;
      wallX = 0;
      wallZ = roomLength/2 - 0.3; // Slightly offset from wall
      rotationY = 0;
      break;
    case 'back':
      frameCount = 10;
      wallWidth = roomWidth;
      wallHeight = roomHeight;
      wallX = 0;
      wallZ = -roomLength/2 + 0.3; // Slightly offset from wall
      rotationY = Math.PI;
      break;
    case 'left':
      frameCount = 8;
      wallWidth = roomLength;
      wallHeight = roomHeight;
      wallX = -roomWidth/2 + 0.3; // Slightly offset from wall
      wallZ = 0;
      rotationY = Math.PI / 2;
      break;
    case 'right':
      frameCount = 8;
      wallWidth = roomLength;
      wallHeight = roomHeight;
      wallX = roomWidth/2 - 0.3; // Slightly offset from wall
      wallZ = 0;
      rotationY = -Math.PI / 2;
      break;
  }
  
  // Space available for placing frames
  const availableWidth = wallWidth - (frameSpacing * 2);
  const widthPerFrame = availableWidth / frameCount;
  
  // Create frames with artwork along the wall
  for (let i = 0; i < frameCount; i++) {
    // Select a random image from our collection
    const imageIndex = Math.floor(Math.random() * images.length);
    const imageTexture = images[imageIndex];
    
    // Calculate position
    let frameX, frameZ;
    
    if (side === 'front' || side === 'back') {
      frameX = -wallWidth/2 + frameSpacing + (i * widthPerFrame) + (widthPerFrame/2);
      frameZ = 0;
    } else {
      frameX = 0;
      frameZ = -wallWidth/2 + frameSpacing + (i * widthPerFrame) + (widthPerFrame/2);
    }
    
    // Create frame with art
    createArtFrame(
      imageTexture,
      frameSize,
      wallX + frameX,
      frameHeight,
      wallZ + frameZ,
      rotationY
    );
  }
  
  // Add a second row of artwork above the first for visual interest
  for (let i = 0; i < frameCount - 1; i++) {
    // Offset the position to create a staggered effect
    let frameX, frameZ;
    
    if (side === 'front' || side === 'back') {
      frameX = -wallWidth/2 + frameSpacing + ((i + 0.5) * widthPerFrame) + (widthPerFrame/2);
      frameZ = 0;
    } else {
      frameX = 0;
      frameZ = -wallWidth/2 + frameSpacing + ((i + 0.5) * widthPerFrame) + (widthPerFrame/2);
    }
    
    // Select a different random image
    const imageIndex = Math.floor(Math.random() * images.length);
    const imageTexture = images[imageIndex];
    
    // Create frame with art at a higher position
    createArtFrame(
      imageTexture,
      frameSize * 0.85, // Slightly smaller frames in top row
      wallX + frameX,
      frameHeight + frameSize + frameSpacing, // Position above the first row
      wallZ + frameZ,
      rotationY
    );
  }
}

function createArtFrame(texture, size, x, y, z, rotationY) {
  // Create frame backing
  const frameBackGeometry = new THREE.BoxGeometry(size + 0.8, size + 0.8, 0.2);
  const frameBackMaterial = new THREE.MeshStandardMaterial({
    color: 0x332211, // Dark wood color
    roughness: 0.8,
    metalness: 0.2
  });
  const frameBack = new THREE.Mesh(frameBackGeometry, frameBackMaterial);
  frameBack.position.set(x, y, z);
  frameBack.rotation.y = rotationY;
  frameBack.castShadow = true;
  scene.add(frameBack);
  
  // Create actual artwork
  const artGeometry = new THREE.PlaneGeometry(size, size);
  const artMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide
  });
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
  
  artwork.position.set(x + xOffset, y, z + zOffset);
  artwork.rotation.y = rotationY;
  scene.add(artwork);
  
  // Add a subtle spotlight to illuminate the artwork
  const spotLight = new THREE.SpotLight(0xffffff, 0.3, 30, Math.PI/8, 0.8, 1);
  spotLight.position.set(x - xOffset * 8, y + 5, z - zOffset * 8); // Position light to shine on artwork
  spotLight.target.position.set(x, y, z);
  scene.add(spotLight);
  scene.add(spotLight.target);
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
    document.getElementById('controls-description').textContent = 'Approach portal to return to Observatory (Room A)';
    document.getElementById('controls-description').style.display = 'block';
    
    // When player is within 3.5 units of the portal, teleport automatically
    if (distance < 3.5) {
      console.log('Teleporting to Room A');
      
      // Show loading screen
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
      }
      
      // Add a small delay before teleporting for smoother transition
      setTimeout(() => {
        window.location.href = 'roomA.html';
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
  console.log("Creating room structure...");
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
    /assets/aviary_gallery.glb',
    
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
  
  // Handle controls and movement
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
    
    // Handle jumping and gravity
    if (isJumping) {
      // Apply gravity
      jumpVelocity += gravity * delta;
      
      // Update position based on velocity
      let newY = camera.position.y + jumpVelocity * delta;
      
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

// Initialize the room (already handled by window load event)
setTimeout(() => {
  try {
    if (!document.getElementById('controls-description')) {
      console.log("Fallback initialization triggered");
      initializeRoom();
    } else {
      console.log("Initialization already handled by window load event");
    }
  } catch(e) {
    console.error("Failed to initialize room:", e);
  }
}, 2000); 