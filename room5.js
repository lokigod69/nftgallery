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
import { showAccessCodePrompt } from './src/core/access-code-gate.js';
import { getPortalStyle } from './src/core/portal-styles.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';
import { initScene } from './src/core/scene-setup.js';
import { initUnifiedNFTViewer, MAX_NFT_INTERACTION_DISTANCE } from './src/core/nft-viewer.js';
import { initMobileControls } from './src/core/mobile-controls.js';

// Room 5 NFT Files - 14 WebP images from Room5 folder
const room5NftFiles = [
  'ComfyUI_03062_',
  'ComfyUI_03065_',
  'ComfyUI_03066_',
  'ComfyUI_03067_',
  'ComfyUI_03068_',
  'ComfyUI_03069_',
  'ComfyUI_03070_',
  'ComfyUI_03071_',
  'ComfyUI_03072_',
  'ComfyUI_03073_',
  'ComfyUI_03099_',
  'ComfyUI_03100_',
  'ComfyUI_03105_',
  'ComfyUI_03107_'
];

// Helper function to get Room5 NFT URL by index (0-13)
function getRoom5NftUrl(index) {
  const filename = room5NftFiles[index % room5NftFiles.length];
  return `/assets/Room5/${filename}.webp`;
}

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
let nftViewer = null;  // Unified viewer instance

// Room dimensions
const roomRadius = 30;
const ceilingHeight = 20;

// Keep track of all NFTs
const picturePlanes = [];

// Hide loading overlay when the page loads
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
});

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: groundLevel + eyeHeight, z: 0 },
  background: 0x000000
});

// Reinforce gimbal lock prevention (ensure settings are applied)
camera.rotation.order = 'YXZ';
controls.minPolarAngle = Math.PI * 0.05;  // Can look almost straight up (9°)
controls.maxPolarAngle = Math.PI * 0.95;  // Can look almost straight down (171°)

// Room 5 uses FogExp2 for subtle depth effect
scene.fog = new THREE.FogExp2(0x000000, 0.015);

// Room 5 specific renderer settings
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows for the eclipse effect

// Note: Pointer lock controls, resize handling, and overlay management
// are now provided by initScene()

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
    case 'Escape':
      if (nftViewer && nftViewer.isOpen()) {
        nftViewer.close();
      } else {
        controls.unlock();
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

// Create NFT displays in formation
function createNFTPedestals() {
  const nftCount = 14; // 14 NFTs in formation
  const nfts = [];

  // Use Room5 NFT files (indices 0-13)

  // Create NFTs in a 14-sided polygon
  for (let i = 0; i < nftCount; i++) {
    const angle = (i / nftCount) * Math.PI * 2;
    const radius = roomRadius * 0.6; // Position in a circle
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Create floating NFT with glow effects (using index 0-13)
    createDoubleSidedNFT(i, new THREE.Vector3(x, 5, z), angle);
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

  // NFT path using Room5 helper function
  const timestamp = Date.now();
  const pathFormats = [
    getRoom5NftUrl(index),
    `${getRoom5NftUrl(index)}?t=${timestamp}`
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

  // Store for click detection (use getNftUrl for consistent URL format)
  nftMeshFront.userData.isNFT = true;
  nftMeshFront.userData.index = index + 1; // Display as 1-12
  nftMeshFront.userData.imageUrl = getRoom5NftUrl(index);

  nftMeshBack.userData.isNFT = true;
  nftMeshBack.userData.index = index + 1; // Display as 1-12
  nftMeshBack.userData.imageUrl = getRoom5NftUrl(index);

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

  // Portal to Room 6 (RESTRICTED - Access Code Required) - North - Black-red theme
  const portal6 = createLinkedPortal({
    scene,
    fromRoom: '5',
    toRoom: '6',
    x: 0,
    y: eyeHeight,
    z: -(roomRadius - 5),
    rotationX: 0.1,
    createLabel: true,
    overrideColor: 0x330000,     // Very dark red (almost black)
    overrideOpacity: 0.95         // Nearly opaque
  });
  portals.push({
    ...portal6,
    name: 'Room 6 (Restricted)',
    url: 'room6.html',
    position: new THREE.Vector3(0, eyeHeight, -(roomRadius - 5)),
    requiresAccessCode: true  // Flag for access code gate
  });

  // Room 5 now connects to Room 6 (gated) instead of Room 0
  // Players who can't access Room 6 can return via Room 4 → Room 3 → ... → Room 0

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

// Set up multi-portal proximity checker with access code gate integration
const portalConfigs = allPortals.map(p => ({
  position: p.position,
  name: p.name,
  url: p.url,
  showDistance: 4.0,
  triggerDistance: 2.0,
  requiresAccessCode: p.requiresAccessCode || false
}));

// Custom portal checker that handles access code gate
let isCheckingAccess = false;
function checkPortalProximity() {
  const playerPos = camera.position;

  for (const portal of portalConfigs) {
    const dist = playerPos.distanceTo(portal.position);

    // Show prompt when near
    if (dist < portal.showDistance && dist >= portal.triggerDistance) {
      const desc = document.getElementById('controls-description');
      if (desc) {
        desc.textContent = `Approach ${portal.name}`;
        desc.style.display = 'block';
      }
    }

    // Trigger portal
    if (dist < portal.triggerDistance) {
      // Check if access code is required
      if (portal.requiresAccessCode && !isCheckingAccess) {
        isCheckingAccess = true;

        // Show access code prompt
        showAccessCodePrompt().then((granted) => {
          isCheckingAccess = false;

          if (granted) {
            // Access granted - navigate to room
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
              overlay.style.display = 'flex';
            }
            setTimeout(() => {
              window.location.href = portal.url;
            }, 500);
          }
          // If not granted, user stays in Room 5
        });

        return; // Don't process other portals
      }

      // Normal portal (no access code required)
      if (!portal.requiresAccessCode) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
          overlay.style.display = 'flex';
        }
        setTimeout(() => {
          window.location.href = portal.url;
        }, 500);
      }
    }
  }
}

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
  sensitivity: { look: 0.05, move: 1.0 },
  pitchLimits: { min: -Math.PI / 2, max: Math.PI / 2 },
  autoLevel: { enabled: false, speed: 0.3, threshold: 0.1 },
  joystickOptions: {
    color: 'white',
    size: 120,
    moveDeadZone: 0.3,
    lookDeadZone: 0.0
  },
  onInteract: (raycaster) => {
    // Guard: Don't process interactions when viewer is already open
    if (nftViewer && nftViewer.isOpen && nftViewer.isOpen()) {
      return;
    }

    // Mobile tap interaction - find NFT under center crosshair
    const intersects = raycaster.intersectObjects(picturePlanes, false);
    if (intersects.length === 0) return;

    const hit = intersects[0];
    const nft = hit.object;

    // Front-facing check: reject surfaces not facing the camera
    if (hit.face && nft && nft.matrixWorld) {
      const worldNormal = hit.face.normal.clone().transformDirection(nft.matrixWorld);
      const camToHit = hit.point.clone().sub(camera.position).normalize();
      const alignment = worldNormal.dot(camToHit.clone().multiplyScalar(-1));
      if (alignment < 0.5) return;
    }

    // Validate NFT and distance
    if (!nft.userData?.isNFT) return;
    if (hit.distance > MAX_NFT_INTERACTION_DISTANCE) return;

    if (nftViewer) {
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
  enablePortraitSwipe: true,  // Enable portrait mode with swipe navigation
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
// Desktop Click Handler
// ----------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handleNFTClick(event) {
  // If viewer is already open, let the viewer handle clicks
  if (nftViewer && nftViewer.isOpen && nftViewer.isOpen()) {
    return;
  }

  // Lock-first pattern (matches Room 1): if not locked, lock and wait for next click
  if (!controls.isLocked) {
    controls.lock();
    event.preventDefault();
    event.stopPropagation();
    return;  // Wait for next click
  }

  // Only raycast when controls are already locked
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(picturePlanes, false);
  if (intersects.length === 0) return;

  const hit = intersects[0];
  const object = hit.object;

  // Front-facing check: reject surfaces not facing the camera
  if (hit.face && object && object.matrixWorld) {
    const worldNormal = hit.face.normal.clone().transformDirection(object.matrixWorld);
    const camToHit = hit.point.clone().sub(camera.position).normalize();
    const alignment = worldNormal.dot(camToHit.clone().multiplyScalar(-1));
    if (alignment < 0.5) return;
  }

  // Validate NFT and distance
  if (!object.userData?.isNFT) return;
  if (hit.distance > MAX_NFT_INTERACTION_DISTANCE) return;

  if (nftViewer) {
    nftViewer.openByMesh(object);
    event.preventDefault();
    event.stopPropagation();
  }
}

window.removeEventListener('click', handleNFTClick);
window.addEventListener('click', handleNFTClick);

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
    // Get player object (camera parent in PointerLockControls)
    const player = controls.getObject();

    // Handle jumping and gravity (use player.position.y, not camera.position.y)
    if (isJumping) {
      player.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;

      if (player.position.y <= groundLevel + eyeHeight) {
        player.position.y = groundLevel + eyeHeight;
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
    const playerX = player.position.x;
    const playerZ = player.position.z;
    const distanceFromCenter = Math.sqrt(playerX * playerX + playerZ * playerZ);

    if (distanceFromCenter > roomRadius - 0.5) { // Reduced boundary buffer (1 -> 0.5)
      // Calculate normalized direction from center
      const angle = Math.atan2(playerZ, playerX);
      // Move back inside but closer to wall
      player.position.x = (roomRadius - 0.5) * Math.cos(angle);
      player.position.z = (roomRadius - 0.5) * Math.sin(angle);
    }

    // Maintain player at NFT level when not jumping
    if (!isJumping) {
      player.position.y = groundLevel + eyeHeight;
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
