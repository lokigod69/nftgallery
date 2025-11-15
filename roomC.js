import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { getNftUrl } from './src/core/asset-utils.js';

// ============================================
// Configuration
// ============================================
const ROOM_WIDTH = 30;
const ROOM_DEPTH = 40;
const ROOM_HEIGHT = 8;
const EYE_HEIGHT = 2.5;
const MOVE_SPEED = 60.0;
const GRAVITY = -30;
const JUMP_FORCE = 10;

// NFT configuration - using a small selection from main collection
const NFT_START_INDEX = 50;
const NFT_COUNT = 6;

// ============================================
// Scene Setup
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // Dark blue-grey for "concept chamber"
scene.fog = new THREE.Fog(0x1a1a2e, 1, 50);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, EYE_HEIGHT, ROOM_DEPTH / 2 - 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ============================================
// Controls
// ============================================
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Movement state
let moveForward = false, moveBackward = false;
let moveLeft = false, moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

// Keyboard controls
document.addEventListener('keydown', (e) => {
  switch(e.code) {
    case 'KeyW': case 'ArrowUp': moveForward = true; break;
    case 'KeyS': case 'ArrowDown': moveBackward = true; break;
    case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
    case 'KeyD': case 'ArrowRight': moveRight = true; break;
    case 'Space':
      if (!isJumping) {
        jumpVelocity = JUMP_FORCE;
        isJumping = true;
      }
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch(e.code) {
    case 'KeyW': case 'ArrowUp': moveForward = false; break;
    case 'KeyS': case 'ArrowDown': moveBackward = false; break;
    case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
    case 'KeyD': case 'ArrowRight': moveRight = false; break;
  }
});

// Click to lock pointer
document.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
});

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// Lighting
// ============================================
function setupLighting() {
  // Ambient light - moody and dim
  const ambientLight = new THREE.AmbientLight(0x4444ff, 0.4);
  scene.add(ambientLight);

  // Directional light from above
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(0, ROOM_HEIGHT, 0);
  scene.add(directionalLight);

  // Add some colored point lights for atmosphere
  const pointLight1 = new THREE.PointLight(0x4444ff, 0.8, 20);
  pointLight1.position.set(-10, 5, 0);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xff4444, 0.8, 20);
  pointLight2.position.set(10, 5, 0);
  scene.add(pointLight2);

  // Spotlights on NFT areas
  const spotLight1 = new THREE.SpotLight(0xffffff, 1.0, 30, Math.PI / 6);
  spotLight1.position.set(-8, ROOM_HEIGHT - 1, -ROOM_DEPTH / 2 + 5);
  spotLight1.target.position.set(-8, EYE_HEIGHT, -ROOM_DEPTH / 2 + 1);
  scene.add(spotLight1);
  scene.add(spotLight1.target);

  const spotLight2 = new THREE.SpotLight(0xffffff, 1.0, 30, Math.PI / 6);
  spotLight2.position.set(8, ROOM_HEIGHT - 1, -ROOM_DEPTH / 2 + 5);
  spotLight2.target.position.set(8, EYE_HEIGHT, -ROOM_DEPTH / 2 + 1);
  scene.add(spotLight2);
  scene.add(spotLight2.target);
}

// ============================================
// Room Structure
// ============================================
function createRoomStructure() {
  // Floor - dark metallic
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.3,
    metalness: 0.7
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls - darker material
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x16213e,
    roughness: 0.8,
    metalness: 0.2
  });

  // North wall (with NFTs)
  const northWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
    wallMaterial
  );
  northWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  scene.add(northWall);

  // South wall (with portal)
  const southWall = northWall.clone();
  southWall.position.z = ROOM_DEPTH / 2;
  southWall.rotation.y = Math.PI;
  scene.add(southWall);

  // East wall
  const eastWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
    wallMaterial
  );
  eastWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  eastWall.rotation.y = -Math.PI / 2;
  scene.add(eastWall);

  // West wall
  const westWall = eastWall.clone();
  westWall.position.x = -ROOM_WIDTH / 2;
  westWall.rotation.y = Math.PI / 2;
  scene.add(westWall);

  // Ceiling - with grid pattern
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f0f1e,
    roughness: 0.9,
    metalness: 0.1
  });
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    ceilingMaterial
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  scene.add(ceiling);
}

// ============================================
// "Work in Progress" Sign
// ============================================
function createWIPSign() {
  // Create a canvas for the text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 1024;
  canvas.height = 256;

  // Background
  context.fillStyle = '#16213e';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  context.strokeStyle = '#4444ff';
  context.lineWidth = 10;
  context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  // Text
  context.fillStyle = '#ffffff';
  context.font = 'Bold 80px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('CONCEPT CHAMBER', canvas.width / 2, canvas.height / 2 - 40);

  context.font = '40px Arial';
  context.fillStyle = '#aaaaaa';
  context.fillText('Work in Progress', canvas.width / 2, canvas.height / 2 + 40);

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);

  // Create mesh
  const signMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true
  });
  const signGeometry = new THREE.PlaneGeometry(8, 2);
  const sign = new THREE.Mesh(signGeometry, signMaterial);
  sign.position.set(0, ROOM_HEIGHT - 2, -ROOM_DEPTH / 2 + 0.1);
  scene.add(sign);
}

// ============================================
// NFT Display
// ============================================
function createNFTFrames() {
  const textureLoader = new THREE.TextureLoader();

  // Create 3 NFT frames on the north wall
  const positions = [
    { x: -10, y: 4, z: -ROOM_DEPTH / 2 + 0.2 },
    { x: 0, y: 4, z: -ROOM_DEPTH / 2 + 0.2 },
    { x: 10, y: 4, z: -ROOM_DEPTH / 2 + 0.2 }
  ];

  positions.forEach((pos, index) => {
    const frameGroup = new THREE.Group();

    // Frame backing
    const frameBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 3.5, 0.15),
      new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.6,
        metalness: 0.4
      })
    );
    frameGroup.add(frameBox);

    // Load NFT image
    const nftIndex = NFT_START_INDEX + index;
    const imageUrl = getNftUrl(nftIndex);

    textureLoader.load(
      imageUrl,
      (texture) => {
        const picturePlane = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 3.2),
          new THREE.MeshBasicMaterial({ map: texture })
        );
        picturePlane.position.z = 0.08;
        frameGroup.add(picturePlane);
      },
      undefined,
      (error) => {
        console.warn(`NFT ${nftIndex} failed to load, using placeholder`);
        // Create a simple colored plane as fallback
        const placeholderPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 3.2),
          new THREE.MeshBasicMaterial({ color: 0x666666 })
        );
        placeholderPlane.position.z = 0.08;
        frameGroup.add(placeholderPlane);
      }
    );

    frameGroup.position.set(pos.x, pos.y, pos.z);
    scene.add(frameGroup);
  });

  // Add 3 more on the east wall
  const eastPositions = [
    { x: ROOM_WIDTH / 2 - 0.2, y: 4, z: -10 },
    { x: ROOM_WIDTH / 2 - 0.2, y: 4, z: 0 },
    { x: ROOM_WIDTH / 2 - 0.2, y: 4, z: 10 }
  ];

  eastPositions.forEach((pos, index) => {
    const frameGroup = new THREE.Group();

    const frameBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 3.5, 0.15),
      new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.6,
        metalness: 0.4
      })
    );
    frameGroup.add(frameBox);

    const nftIndex = NFT_START_INDEX + 3 + index;
    const imageUrl = getNftUrl(nftIndex);

    textureLoader.load(
      imageUrl,
      (texture) => {
        const picturePlane = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 3.2),
          new THREE.MeshBasicMaterial({ map: texture })
        );
        picturePlane.position.z = 0.08;
        frameGroup.add(picturePlane);
      },
      undefined,
      (error) => {
        console.warn(`NFT ${nftIndex} failed to load`);
        const placeholderPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(2.2, 3.2),
          new THREE.MeshBasicMaterial({ color: 0x666666 })
        );
        placeholderPlane.position.z = 0.08;
        frameGroup.add(placeholderPlane);
      }
    );

    frameGroup.position.set(pos.x, pos.y, pos.z);
    frameGroup.rotation.y = -Math.PI / 2;
    scene.add(frameGroup);
  });
}

// ============================================
// Portal to Room 0
// ============================================
let portalToRoom0 = null;
let portalGlow = null;

function createPortal() {
  // Main portal circle
  const portalGeometry = new THREE.CircleGeometry(1.5, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff, // Teal for return to hub
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  portalToRoom0 = new THREE.Mesh(portalGeometry, portalMaterial);
  portalToRoom0.position.set(0, EYE_HEIGHT, ROOM_DEPTH / 2 - 2);
  portalToRoom0.rotation.y = Math.PI;

  // Outer glow
  const glowGeometry = new THREE.CircleGeometry(1.8, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  portalGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  portalGlow.position.copy(portalToRoom0.position);
  portalGlow.rotation.copy(portalToRoom0.rotation);

  scene.add(portalToRoom0, portalGlow);
}

function checkPortalProximity() {
  if (!portalToRoom0) return;

  const distance = camera.position.distanceTo(portalToRoom0.position);
  const controlsDesc = document.getElementById('controls-description');

  if (distance < 3.0) {
    controlsDesc.textContent = 'Approach portal to return to Ocean Hub (Room 0)';
    controlsDesc.style.display = 'block';

    if (distance < 1.8) {
      // Navigate to Room 0
      const loadingOverlay = document.getElementById('loading-overlay');
      loadingOverlay.style.display = 'flex';

      setTimeout(() => {
        window.location.href = 'room0.html';
      }, 500);
    }
  } else {
    controlsDesc.textContent = 'Controls: WASD - Move, Mouse - Look, SPACE - Jump, ESC - Toggle camera';
  }
}

// ============================================
// Animation Loop
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (controls.isLocked) {
    // Movement
    const speedDelta = MOVE_SPEED * delta;
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speedDelta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speedDelta;

    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);

    // Gravity and jumping
    if (isJumping) {
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += GRAVITY * delta;

      if (camera.position.y <= EYE_HEIGHT) {
        camera.position.y = EYE_HEIGHT;
        isJumping = false;
        jumpVelocity = 0;
      }
    }

    // Boundary check
    camera.position.x = Math.max(-ROOM_WIDTH / 2 + 1, Math.min(ROOM_WIDTH / 2 - 1, camera.position.x));
    camera.position.z = Math.max(-ROOM_DEPTH / 2 + 1, Math.min(ROOM_DEPTH / 2 - 1, camera.position.z));

    // Check portal proximity
    checkPortalProximity();
  }

  // Animate portals
  if (portalToRoom0) {
    portalToRoom0.rotation.z += 0.01;
    portalGlow.rotation.z -= 0.01;
  }

  renderer.render(scene, camera);
}

// ============================================
// Initialize
// ============================================
setupLighting();
createRoomStructure();
createWIPSign();
createNFTFrames();
createPortal();

// Hide loading overlay
setTimeout(() => {
  const loadingOverlay = document.getElementById('loading-overlay');
  loadingOverlay.style.opacity = '0';
  setTimeout(() => {
    loadingOverlay.style.display = 'none';
  }, 500);
}, 2000);

// Start animation
animate();
