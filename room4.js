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

// ----------------------------------------------------------------------
// Global Variables
// ----------------------------------------------------------------------
const groundLevel = 0; // This is the ground level
const eyeHeight = 2.5; // Raised from 1.7 to 2.5 to align with outer row NFTs
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;
const speed = 100.0;
const textureLoader = new THREE.TextureLoader();

// Keep track of all NFTs
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
}

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, groundLevel + eyeHeight, 0); // Position camera at new eye height

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Pointer lock controls
const controls = new PointerLockControls(camera, document.body);
controls.addEventListener('lock', () => {
  document.getElementById('controls-description').style.display = 'none';
});
controls.addEventListener('unlock', () => {
  document.getElementById('controls-description').style.display = 'block';
});

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

// Movement variables
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const keyStates = {};

// Key handlers
const onKeyDown = function (event) {
  keyStates[event.code] = true;
  
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
  keyStates[event.code] = false;
  
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
  
  // Calculate the actual NFT number to use (108-127)
  const nftIndex = 107 + displayIndex; // Map display indexes 1-20 to NFT indexes 108-127
  
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
  ctx.fillText(`NFT #${nftIndex}`, canvas.width/2, canvas.height/2 - 50);
  ctx.font = '32px Arial';
  ctx.fillText('Floating Gallery', canvas.width/2, canvas.height/2 + 50);
  
  // Add a border to the fallback
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 12;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
  
  // Create a fallback texture immediately
  const fallbackTexture = new THREE.CanvasTexture(canvas);
  
  // Create the NFT path with cache-busting to prevent texture caching issues
  const timestamp = Date.now(); // Use a timestamp to prevent caching
  const nftPath = `/assets/nft${nftIndex}.png?t=${timestamp}`;
  
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
        material.map = texture;
        material.needsUpdate = true;
        console.log(`Successfully loaded NFT texture ${nftIndex}`);
      },
      // Progress callback
      function(xhr) {
        if (xhr.total !== 0) {
          console.log(`${nftIndex} loading: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
        }
      },
      // Error callback
      function(err) {
        console.error(`Error loading NFT texture ${nftIndex}:`, err);
        
        if (retryCount < maxRetries) {
          // Retry with exponential backoff
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`Retrying to load NFT ${nftIndex} in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          setTimeout(() => loadNFTTexture(retryCount + 1), delay);
        } else {
          console.log(`Max retries reached for NFT ${nftIndex}, using fallback`);
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
    index: nftIndex,
    imageUrl: nftPath.split('?')[0] // Remove cache-busting query string for viewer
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
// Create Portal Back to Room 3
// ----------------------------------------------------------------------
function createPortalToRoom3() {
  // Use CircleGeometry for the portal
  const portalGeometry = new THREE.CircleGeometry(1.5, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0x4477ff, // Blue color for Room 3 portal
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  
  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  
  // UPDATED: Make portal vertical and float in the air
  portal.position.set(0, groundLevel + 3, 15); // Raised to eye level (3 units above ground)
  scene.add(portal);
  
  // Glow effect
  const glowGeometry = new THREE.CircleGeometry(1.8, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x0088ff, // Blue glow
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  });
  
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(portal.position);
  glow.rotation.copy(portal.rotation);
  glow.position.z -= 0.01; // Slight offset to avoid z-fighting
  scene.add(glow);
  
  // Add point light for the portal
  const portalLight = new THREE.PointLight(0x4477ff, 1, 8);
  portalLight.position.copy(portal.position);
  scene.add(portalLight);
  
  // Animation
  function animatePortal() {
    const time = Date.now() * 0.001;
    portal.rotation.z = time * 0.5; // Rotate the portal
    glow.rotation.z = -time * 0.3; // Rotate the glow in opposite direction
    portalLight.intensity = 0.5 + Math.sin(time * 2) * 0.5; // Pulsing light
  }
  
  return { portal, glow, portalLight, animate: animatePortal };
}

// ----------------------------------------------------------------------
// Create Portal to Room 5
// ----------------------------------------------------------------------
function createPortalToRoom5() {
  // Use CircleGeometry to match other portals
  const portalGeometry = new THREE.CircleGeometry(1.5, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0x8844aa, // Purple color for Room 5 portal
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  
  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  
  // UPDATED: Make portal vertical and float in the air
  portal.position.set(0, groundLevel + 3, -15); // Raised to eye level (3 units above ground)
  scene.add(portal);
  
  // Glow effect
  const glowGeometry = new THREE.CircleGeometry(1.8, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x6600aa, // Deeper purple glow
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  });
  
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(portal.position);
  glow.rotation.copy(portal.rotation);
  glow.position.z += 0.01; // Slight offset to avoid z-fighting
  scene.add(glow);
  
  // Add point light for the portal
  const portalLight = new THREE.PointLight(0x8844aa, 1, 8);
  portalLight.position.copy(portal.position);
  scene.add(portalLight);
  
  // Add particles around the portal
  const particleCount = 30;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 1.5 + 0.5;
    particlePositions[i * 3] = portal.position.x + Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = portal.position.y + Math.sin(angle) * radius;
    particlePositions[i * 3 + 2] = portal.position.z;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xaa77ff,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  
  // Animation
  function animatePortal() {
    const time = Date.now() * 0.001;
    portal.rotation.z = time * 0.5; // Rotate the portal
    glow.rotation.z = -time * 0.3; // Rotate the glow in opposite direction
    portalLight.intensity = 0.5 + Math.sin(time * 2) * 0.5; // Pulsing light
    
    // Animate particles
    const positions = particles.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const angle = time + i * 0.1;
      const radius = 1 + 0.3 * Math.sin(time * 0.5 + i * 0.2);
      
      positions[i3] = portal.position.x + Math.cos(angle) * radius;
      positions[i3 + 1] = portal.position.y + Math.sin(angle) * radius;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }
  
  return { portal, glow, portalLight, particles, animate: animatePortal };
}

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
function checkPortalProximity() {
  // Portal to room 3
  const portalPosition = new THREE.Vector3(0, groundLevel + 3, 15);
  const distanceToPortal = camera.position.distanceTo(portalPosition);
  
  // UPDATED: Check if player is very close to the portal and show info
  if (distanceToPortal < 3 && distanceToPortal >= 1.5) {
    document.getElementById('controls-description').textContent = 'Approach portal to enter Room 3';
    document.getElementById('controls-description').style.display = 'block';
  } 
  // UPDATED: Automatically teleport when player walks through the portal
  else if (distanceToPortal < 1.5) {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    // Teleport to Room 3
    window.location.href = 'room3.html?spawn=safe';
  }
  
  // Portal to room 5
  const portal5Position = new THREE.Vector3(0, groundLevel + 3, -15);
  const distanceToPortal5 = camera.position.distanceTo(portal5Position);
  
  // UPDATED: Check if player is very close to the portal and show info
  if (distanceToPortal5 < 3 && distanceToPortal5 >= 1.5) {
    document.getElementById('controls-description').textContent = 'Approach portal to enter Room 5';
    document.getElementById('controls-description').style.display = 'block';
  } 
  // UPDATED: Automatically teleport when player walks through the portal
  else if (distanceToPortal5 < 1.5) {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    // Teleport to Room 5
    window.location.href = 'room5.html';
  }
  
  // Default text when not near any portal
  if (distanceToPortal >= 3 && distanceToPortal5 >= 3) {
    document.getElementById('controls-description').textContent = 'Controls: WASD - Move, Mouse - Look, ESC - Toggle camera';
  }
}

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

// Add a second inner ring of NFTs (120-127)
const innerNFTCount = 8;
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
  
  // Create with display index 13-20, which maps to NFTs 120-127
  const nft = createFloatingNFT(i + 13, position, rotation);
  floatingNFTs.push(nft);
}

// Create portal back to room 3
const portalToRoom3 = createPortalToRoom3();

// Create portal to room 5
const portalToRoom5 = createPortalToRoom5();

// Create lights
const lights = createLights();

// Create particles
const particles = createParticles();

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  if (controls.isLocked === true) {
    const delta = clock.getDelta();
    
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
    
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Keep player on the island - boundary check for larger island
    const distanceFromCenter = Math.sqrt(
      camera.position.x * camera.position.x +
      camera.position.z * camera.position.z
    );
    
    if (distanceFromCenter > 19.5) { // Slightly less than island radius
      // Push player back toward center
      const angle = Math.atan2(camera.position.z, camera.position.x);
      camera.position.x = Math.cos(angle) * 19.5;
      camera.position.z = Math.sin(angle) * 19.5;
    }
    
    // If player falls off
    if (camera.position.y < -10) {
      camera.position.set(0, groundLevel + eyeHeight, 0);
      velocity.set(0, 0, 0);
    }
    
    // Maintain camera height when not jumping
    if (!isJumping) {
      camera.position.y = groundLevel + eyeHeight;
    }
    
    // Check if near portal
    checkPortalProximity();
  }
  
  // Animate portal to Room 3
  if (portalToRoom3 && portalToRoom3.animate) {
    portalToRoom3.animate();
  }
  
  // Animate portal to Room 5
  if (portalToRoom5 && portalToRoom5.animate) {
    portalToRoom5.animate();
  }
  
  // Animate particles
  particles.animate();
  
  renderer.render(scene, camera);
}

animate(); 