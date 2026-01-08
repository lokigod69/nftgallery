// Changes made:
// - Created room4.js as a floating island gallery
// - Added a circular island platform with natural textures
// - Created a dynamic skybox with gradient colors
// - Added floating NFT frames that hover above the island
// - Implemented a portal back to Room 3
// - Added basic lighting and particle effects
// - Used simplified physics and controls similar to other rooms
// - Fixed NFT display by ensuring fallback images are generated
// - Used more reliable paths for NFT loading
// - Fixed player positioning to properly stand on the floor
// - Made the island much larger and adjusted all elements accordingly
// - Improved structure placement to ensure everything sits on the floor
// - Updated portal design to match other rooms
// - Added a new purple portal to Room 5
// - Updated NFT numbering to use assets 108-127
// - Fixed NFTs disappearing by ensuring reliable texture loading
// - Made NFTs visible on both sides of each frame
// - Removed gray frames to show only NFT images with glow effect
// - Made NFTs completely static to prevent disappearing issues
// - Raised camera height to better align with outer row of NFTs
// - Enhanced vegetation with taller grass and added small trees

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { getNftUrl } from './src/core/asset-utils.js';
import { initSpeedControl } from './src/ui/speed-control.js';
import { initScene } from './src/core/scene-setup.js';
import { initUnifiedNFTViewer, MAX_NFT_INTERACTION_DISTANCE } from './src/core/nft-viewer.js';
import { initMobileControls } from './src/core/mobile-controls.js';

// Room 4 NFT Files - 23 PNG images from Room4 folder
const room4NftFiles = [
  'ComfyUI_03074_',
  'ComfyUI_03075_',
  'ComfyUI_03076_',
  'ComfyUI_03077_',
  'ComfyUI_03078_',
  'ComfyUI_03079_',
  'ComfyUI_03080_',
  'ComfyUI_03081_',
  'ComfyUI_03082_',
  'ComfyUI_03083_',
  'ComfyUI_03084_',
  'ComfyUI_03085_',
  'ComfyUI_03086_',
  'ComfyUI_03087_',
  'ComfyUI_03088_',
  'ComfyUI_03089_',
  'ComfyUI_03090_',
  'ComfyUI_03091_',
  'ComfyUI_03092_',
  'ComfyUI_03093_',
  'ComfyUI_03094_',
  'ComfyUI_03095_',
  'ComfyUI_03096_'
];

// Helper function to get Room4 NFT URL by index (0-22)
function getRoom4NftUrl(index) {
  const filename = room4NftFiles[index % room4NftFiles.length];
  return `/assets/Room4/${filename}.png`;
}

// ----------------------------------------------------------------------
// Global Variables
// ----------------------------------------------------------------------
const groundLevel = 0; // This is the ground level
const eyeHeight = 2.5; // Raised from 1.7 to 2.5 to align with outer row NFTs
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;
// Movement speed now using shared config (was 100.0)
const textureLoader = new THREE.TextureLoader();
let nftViewer = null;  // Unified viewer instance

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
  spawnPosition: { x: 0, y: groundLevel + eyeHeight, z: 0 }
});

// Room 4 specific renderer settings
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// Note: Pointer lock controls, resize handling, and overlay management
// are now provided by initScene()

// Movement flags now on window object for mobile/desktop sharing
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
// Create Skybox
// ----------------------------------------------------------------------
function createSkybox() {
  // Create a larger skybox for the bigger room
  const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);

  // Load skybox textures
  const directions = ['ft', 'bk', 'up', 'dn', 'rt', 'lf'];
  const materialArray = [];

  // Create a gradient sky material for each face
  const gradientTop = new THREE.Color(0x1a237e);    // Deep blue
  const gradientMiddle = new THREE.Color(0x5c6bc0); // Medium purple/blue
  const gradientBottom = new THREE.Color(0xffb74d); // Orange/gold

  for (let i = 0; i < 6; i++) {
    // Create a canvas to generate gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Create different gradients based on the face
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);

    if (i === 2) { // Top face - mostly blue
      gradient.addColorStop(0, gradientTop.getStyle());
      gradient.addColorStop(1, gradientMiddle.getStyle());
    } else if (i === 3) { // Bottom face - mostly orange
      gradient.addColorStop(0, gradientMiddle.getStyle());
      gradient.addColorStop(1, gradientBottom.getStyle());
    } else { // Side faces - full gradient
      gradient.addColorStop(0, gradientTop.getStyle());
      gradient.addColorStop(0.5, gradientMiddle.getStyle());
      gradient.addColorStop(1, gradientBottom.getStyle());

      // Add some stars to the side faces
      const starCount = 100;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = 'white';
      for (let s = 0; s < starCount; s++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256; // Stars only in top half
        const size = Math.random() * 2 + 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      materialArray.push(new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      }));
      continue;
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    materialArray.push(new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    }));
  }

  const skybox = new THREE.Mesh(skyboxGeometry, materialArray);
  scene.add(skybox);

  return skybox;
}

// ----------------------------------------------------------------------
// Create Floating Island
// ----------------------------------------------------------------------
function createIsland() {
  // Create a much larger circular platform
  const islandRadius = 20; // Increased from 7 to 20
  const islandGeometry = new THREE.CylinderGeometry(islandRadius, islandRadius * 1.2, 2, 64);

  // Create ground texture with canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1024; // Increased for better texture quality
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Fill with green base
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, 1024, 1024);

  // Add texture variations for grass and dirt
  for (let i = 0; i < 2000; i++) { // More texture details
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const size = Math.random() * 4 + 1;
    const hue = 100 + Math.random() * 30; // Green hues
    const lightness = 30 + Math.random() * 40;
    ctx.fillStyle = `hsl(${hue}, 60%, ${lightness}%)`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const groundTexture = new THREE.CanvasTexture(canvas);
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(8, 8); // More texture repetition for larger island

  const islandMaterial = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.8,
    metalness: 0.2
  });

  const island = new THREE.Mesh(islandGeometry, islandMaterial);
  // Position the island so its top surface is at groundLevel
  island.position.y = groundLevel - 1; // Half the height below ground level so top surface is at groundLevel
  island.receiveShadow = true;
  scene.add(island);

  // Add some rocks around the edge - more rocks for the larger island
  const rockCount = 24;
  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2;
    const radius = islandRadius * 0.9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const rockGeometry = new THREE.SphereGeometry(0.8 + Math.random() * 0.8, 6, 6);
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
      roughness: 0.9,
      metalness: 0.1
    });

    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(x, groundLevel, z);
    rock.scale.y = 0.5; // Flatten the rock a bit
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  // Add tall grass tufts across the island
  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * islandRadius * 0.95;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Taller grass tufts (increased size and height)
    const grassHeight = 0.3 + Math.random() * 0.5; // Taller grass (0.3-0.8 units tall)
    const grassWidth = 0.1 + Math.random() * 0.1; // Slightly wider grass

    const grassGeometry = new THREE.ConeGeometry(grassWidth, grassHeight, 4);
    const grassMaterial = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.4 ? 0x4CAF50 : 0xFDD835, // Green or yellow
      roughness: 0.9,
      metalness: 0.0
    });

    const grass = new THREE.Mesh(grassGeometry, grassMaterial);

    // Position above the ground so they're fully visible
    grass.position.set(x, groundLevel + grassHeight/2, z);
    grass.rotation.y = Math.random() * Math.PI;
    grass.castShadow = true;
    scene.add(grass);
  }

  // Add some small tree-like structures
  const treeCount = 12;
  for (let i = 0; i < treeCount; i++) {
    // Position trees away from the center and portals
    const angle = Math.random() * Math.PI * 2;
    const radius = islandRadius * (0.3 + Math.random() * 0.5); // Middle area of the island
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Check if too close to portals (at 0,0,15 and 0,0,-15)
    const distanceToPortal1 = Math.sqrt(x*x + Math.pow(z-15, 2));
    const distanceToPortal2 = Math.sqrt(x*x + Math.pow(z+15, 2));
    if (distanceToPortal1 < 3 || distanceToPortal2 < 3) continue; // Skip this position if too close to a portal

    // Create tree trunk (cylinder)
    const trunkHeight = 0.8 + Math.random() * 1.2; // 0.8-2.0 units tall
    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, trunkHeight, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown
      roughness: 0.9
    });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, groundLevel + trunkHeight/2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    // Create tree foliage (cone or sphere)
    const foliageType = Math.random() > 0.5 ? 'cone' : 'sphere';
    let foliageGeometry;

    if (foliageType === 'cone') {
      foliageGeometry = new THREE.ConeGeometry(0.6, 1.2, 8);
    } else {
      foliageGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    }

    const foliageColor = Math.random() > 0.3 ?
      0x228B22 : // Forest Green
      0x556B2F;  // Dark Olive Green

    const foliageMaterial = new THREE.MeshStandardMaterial({
      color: foliageColor,
      roughness: 0.8
    });

    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    // Position foliage on top of trunk
    foliage.position.set(x, groundLevel + trunkHeight + (foliageType === 'cone' ? 0.6 : 0), z);
    foliage.castShadow = true;
    scene.add(foliage);
  }

  return island;
}

// ----------------------------------------------------------------------
// Create NFT Frames
// ----------------------------------------------------------------------
const picturePlanes = [];

function createFloatingNFT(displayIndex, position, rotation) {
  // Calculate dimensions based on the aspect ratio of 0.564 (width:height)
  const frameHeight = 2.5;
  const frameWidth = frameHeight * 0.564;

  // Calculate the array index to use (0-22 for 23 NFTs)
  const arrayIndex = (displayIndex - 1) % room4NftFiles.length;

  // Create fallback texture immediately so we always have something to display
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 910;
  const ctx = canvas.getContext('2d');

  // Draw a gradient background for the fallback
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#3366cc');
  gradient.addColorStop(1, '#6699ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add text to the fallback
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(`NFT #${displayIndex}`, canvas.width/2, canvas.height/2 - 50);
  ctx.font = '32px Arial';
  ctx.fillText('Floating Gallery', canvas.width/2, canvas.height/2 + 50);

  // Add a border to the fallback
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 12;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Create a fallback texture immediately
  const fallbackTexture = new THREE.CanvasTexture(canvas);

  // Create the NFT path using Room4 helper function
  const nftPath = getRoom4NftUrl(arrayIndex);

  // Create a single material that works on both sides of the plane
  const material = new THREE.MeshBasicMaterial({
    map: fallbackTexture,
    side: THREE.DoubleSide, // Make the material visible from both sides
    transparent: false,     // No transparency to ensure solid rendering
    depthWrite: true        // Ensure proper depth testing
  });

  // Create a single plane for the NFT with DoubleSide material
  const planeGeometry = new THREE.PlaneGeometry(frameWidth, frameHeight);
  const plane = new THREE.Mesh(planeGeometry, material);

  // Position exactly at the specified position
  plane.position.copy(position);

  // Set the rotation but do not animate it later
  plane.rotation.copy(rotation);

  // Add to scene
  scene.add(plane);

  // Try to load the texture with appropriate fallback
  // We define this as a function to allow for retries
  function loadNFTTexture(retryCount = 0) {
    const maxRetries = 3;

    // Create a dedicated loader for this NFT
    const dedicatedLoader = new THREE.TextureLoader();

    dedicatedLoader.load(
      nftPath,
      function(texture) {
        // Success - use the loaded texture
        texture.encoding = THREE.sRGBEncoding; // Correct color representation
        material.map = texture;
        material.needsUpdate = true;
        console.log(`Successfully loaded NFT texture ${displayIndex}`);
      },
      // Progress callback
      function(xhr) {
        if (xhr.total !== 0) {
          console.log(`${displayIndex} loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
        }
      },
      // Error callback
      function(err) {
        console.error(`Error loading NFT texture ${displayIndex}:`, err);

        if (retryCount < maxRetries) {
          // Retry with exponential backoff
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`Retrying to load NFT ${displayIndex} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => loadNFTTexture(retryCount + 1), delay);
        } else {
          console.log(`Max retries reached for NFT ${displayIndex}, using fallback`);
          // Keep using the fallback texture - which is already set
        }
      }
    );
  }

  // Start loading the texture
  loadNFTTexture();

  // Store the plane for click detection
  plane.userData = {
    isNFT: true,
    index: displayIndex,
    imageUrl: nftPath // Use full URL from getNftUrl (don't strip query params)
  };
  picturePlanes.push(plane);

  // Add a subtle glow effect around the plane
  const glowGeometry = new THREE.PlaneGeometry(frameWidth + 0.2, frameHeight + 0.2);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide, // Glow is visible from both sides
    depthWrite: false       // Don't write to depth buffer for glow
  });

  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(position);

  // Position very slightly behind the plane to avoid z-fighting
  const normalVector = new THREE.Vector3(0, 0, 1).applyEuler(rotation);
  glow.position.sub(normalVector.multiplyScalar(0.001));

  glow.rotation.copy(rotation);
  scene.add(glow);

  // No animation function needed - we're keeping everything static
  return { plane, glow };
}

// ----------------------------------------------------------------------
// Create Portals
// ----------------------------------------------------------------------
// Portal back to Room 3 (vertical floating portal)
const portalToRoom3Obj = createLinkedPortal({
  scene,
  fromRoom: '4',
  toRoom: '3',
  x: 0,
  y: 3,
  z: 15,
  rotationY: 0,  // Vertical orientation
  createLabel: true
});

// Portal to Room 5 (vertical floating portal)
const portalToRoom5Obj = createLinkedPortal({
  scene,
  fromRoom: '4',
  toRoom: '5',
  x: 0,
  y: 3,
  z: -15,
  rotationY: 0,  // Vertical orientation
  createLabel: true
});

// Add particle effects for Room 5 portal (preserve existing behavior)
const room5ParticleCount = 30;
const room5ParticleGeometry = new THREE.BufferGeometry();
const room5ParticlePositions = new Float32Array(room5ParticleCount * 3);

for (let i = 0; i < room5ParticleCount; i++) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 1.5 + 0.5;
  room5ParticlePositions[i * 3] = 0 + Math.cos(angle) * radius;
  room5ParticlePositions[i * 3 + 1] = 3 + Math.sin(angle) * radius;
  room5ParticlePositions[i * 3 + 2] = -15;
}

room5ParticleGeometry.setAttribute('position', new THREE.BufferAttribute(room5ParticlePositions, 3));

const room5ParticleMaterial = new THREE.PointsMaterial({
  color: 0xaa77ff,
  size: 0.1,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending
});

const room5Particles = new THREE.Points(room5ParticleGeometry, room5ParticleMaterial);
scene.add(room5Particles);

// Particle animation function for Room 5 portal
function animateRoom5Particles() {
  const time = Date.now() * 0.001;
  const positions = room5Particles.geometry.attributes.position.array;

  for (let i = 0; i < room5ParticleCount; i++) {
    const i3 = i * 3;
    const angle = time + i * 0.1;
    const radius = 1 + 0.3 * Math.sin(time * 0.5 + i * 0.2);

    positions[i3] = 0 + Math.cos(angle) * radius;
    positions[i3 + 1] = 3 + Math.sin(angle) * radius;
  }

  room5Particles.geometry.attributes.position.needsUpdate = true;
}

// Set up multi-portal proximity checker
const allPortals = [
  { ...portalToRoom3Obj, name: 'Room 3', url: 'room3.html?spawn=safe',
    position: new THREE.Vector3(0, 3, 15) },
  { ...portalToRoom5Obj, name: 'Room 5 (Eternal Eclipse)', url: 'room5.html',
    position: new THREE.Vector3(0, 3, -15) }
];

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

// For backward compatibility with existing code
const portalToRoom3 = portalToRoom3Obj;
const portalToRoom5 = portalToRoom5Obj;

// ----------------------------------------------------------------------
// Create Lighting
// ----------------------------------------------------------------------
function createLights() {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Main directional light (sun)
  const sunLight = new THREE.DirectionalLight(0xffffff, 1);
  sunLight.position.set(10, 15, 10);
  sunLight.castShadow = true;

  // Increase shadow quality
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -15;
  sunLight.shadow.camera.right = 15;
  sunLight.shadow.camera.top = 15;
  sunLight.shadow.camera.bottom = -15;

  scene.add(sunLight);

  // Soft point lights around the island
  const pointLightColors = [0xffcf77, 0xff9e7a, 0xff7a8a];
  const pointLights = [];

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const x = Math.cos(angle) * 10;
    const z = Math.sin(angle) * 10;

    const pointLight = new THREE.PointLight(pointLightColors[i], 0.8, 20);
    pointLight.position.set(x, 5, z);
    scene.add(pointLight);
    pointLights.push(pointLight);
  }

  return { ambientLight, sunLight, pointLights };
}

// ----------------------------------------------------------------------
// Create Particles
// ----------------------------------------------------------------------
function createParticles() {
  const particleCount = 500;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    // Create a sphere of particles around the island
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 15;

    positions[i * 3] = Math.sin(angle1) * Math.cos(angle2) * radius;
    positions[i * 3 + 1] = Math.sin(angle1) * Math.sin(angle2) * radius * 0.5 + 5; // Flatten vertically
    positions[i * 3 + 2] = Math.cos(angle1) * radius;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.7
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Animation
  function animateParticles() {
    const positions = particleGeometry.attributes.position.array;

    for (let i = 0; i < particleCount; i++) {
      // Slow swirling movement
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      const distance = Math.sqrt(x*x + z*z);
      const angle = Math.atan2(z, x) + 0.0005 * (distance > 10 ? -1 : 1);

      positions[i3] = Math.cos(angle) * distance;
      positions[i3 + 2] = Math.sin(angle) * distance;
      positions[i3 + 1] = y + Math.sin(Date.now() * 0.001 + i) * 0.01;
    }

    particleGeometry.attributes.position.needsUpdate = true;
  }

  return { particles, animate: animateParticles };
}

// ----------------------------------------------------------------------
// Check Portal Proximity
// ----------------------------------------------------------------------
// Portal proximity checking is now handled by createMultiPortalChecker() above

// ----------------------------------------------------------------------
// Create the island environment
// ----------------------------------------------------------------------
// Create the skybox
const skybox = createSkybox();

// Create the island
const island = createIsland();

// Create the floating NFTs - using NFTs 108-127 from the asset folder
const floatingNFTs = [];
const nftCount = 12; // Outer ring has 12 NFTs (108-119)
for (let i = 0; i < nftCount; i++) {
  const angle = (i / nftCount) * Math.PI * 2;
  const radius = 12; // Increased radius to spread NFTs on larger island
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Position around the circle at fixed heights (no random variation)
  const height = 2.5; // Fixed height to prevent vertical movement
  const position = new THREE.Vector3(x, groundLevel + height, z);

  // Face toward the center
  const rotation = new THREE.Euler(0, Math.atan2(x, z), 0);

  // Create with display index 1-12, which maps to NFTs 108-119
  const nft = createFloatingNFT(i + 1, position, rotation);
  floatingNFTs.push(nft);
}

// Add a second inner ring of NFTs (13-23 total)
const innerNFTCount = 11;
for (let i = 0; i < innerNFTCount; i++) {
  const angle = (i / innerNFTCount) * Math.PI * 2 + (Math.PI / innerNFTCount); // Offset from outer ring
  const radius = 6; // Inner radius
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Position around the circle at fixed heights
  const height = 4; // Fixed height for inner ring, slightly higher than outer ring
  const position = new THREE.Vector3(x, groundLevel + height, z);

  // Face toward the center
  const rotation = new THREE.Euler(0, Math.atan2(x, z), 0);

  // Create with display index 13-23 (11 more NFTs for total of 23)
  const nft = createFloatingNFT(i + 13, position, rotation);
  floatingNFTs.push(nft);
}

// Portals are created above using createLinkedPortal()

// Create lights
const lights = createLights();

// Create particles
const particles = createParticles();

// ----------------------------------------------------------------------
// Mobile Controls Integration
// ----------------------------------------------------------------------
let mobileControls = null;

mobileControls = initMobileControls({
  camera,
  controls,
  sensitivity: { look: 0.04, move: 1.0 },
  pitchLimits: { min: -Math.PI / 3, max: Math.PI / 4 },
  autoLevel: { enabled: true, speed: 0.3, threshold: 0.1 },
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
  const delta = clock.getDelta();

  // Update mobile controls
  if (mobileControls && mobileControls.enabled) {
    mobileControls.updateAutoLevel(delta);
    mobileControls.updateCameraRotation();
  }

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
    const baseSpeed = MOVEMENT_CONFIG.getEffectiveSpeed('room4');
    const effectiveSpeed = isMobileActive ? baseSpeed * 0.5 : baseSpeed;
    const speedDelta = effectiveSpeed * delta;

    direction.z = Number(window.moveForward) - Number(window.moveBackward);
    direction.x = Number(window.moveRight) - Number(window.moveLeft);
    direction.normalize();

    if (window.moveForward || window.moveBackward) velocity.z -= direction.z * speedDelta;
    if (window.moveLeft || window.moveRight) velocity.x -= direction.x * speedDelta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Keep player on the island - boundary check for larger island
    const distanceFromCenter = Math.sqrt(
      player.position.x * player.position.x +
      player.position.z * player.position.z
    );

    if (distanceFromCenter > 19.5) { // Slightly less than island radius
      // Push player back toward center
      const angle = Math.atan2(player.position.z, player.position.x);
      player.position.x = Math.cos(angle) * 19.5;
      player.position.z = Math.sin(angle) * 19.5;
    }

    // If player falls off
    if (player.position.y < -10) {
      player.position.set(0, groundLevel + eyeHeight, 0);
      velocity.set(0, 0, 0);
    }

    // Maintain player height when not jumping
    if (!isJumping) {
      player.position.y = groundLevel + eyeHeight;
    }

    // Check if near portal
    checkPortalProximity();
  }

  // Animate portals using standardized system
  allPortals.forEach(portalObj => {
    animateLinkedPortal(portalObj.portal, portalObj.glow);
  });

  // Animate Room 5 portal particles (preserve existing behavior)
  animateRoom5Particles();

  // Animate particles
  particles.animate();

  renderer.render(scene, camera);
}

animate();

// Initialize speed control UI
initSpeedControl();
