import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal } from './src/core/portal-utils.js';

// Room X: "The Ascent" (Challenge Arena)
// Concept: Legendary challenge room - climb to escape
// Tone: Epic, vast, mysterious
// Challenge: Vertical jump puzzle through floating platforms

// ----------------------------------------------------------------------
// Tunable Jump Mechanics
// ----------------------------------------------------------------------
const PLAYER_HEIGHT = 2.5;           // Eye height / spawn height
const JUMP_VELOCITY = 12.0;          // Initial upward velocity
const GRAVITY = -25.0;               // Downward acceleration
const JUMP_HEIGHT = 3.0;             // Approximate max jump height (for platform spacing)
const MAX_HORIZONTAL_JUMP_DISTANCE = 4.5; // Max horizontal distance player can jump
const MOVE_SPEED = 80.0;             // Horizontal movement speed

// ----------------------------------------------------------------------
// Arena Parameters
// ----------------------------------------------------------------------
const SPHERE_RADIUS = 70;            // Giant hollow sphere
const PLATFORM_COUNT = 28;           // Number of platforms in the ascent
const PLATFORM_SIZE = 2.5;           // Platform width/depth
const SPIRAL_ROTATIONS = 3.5;        // Number of full rotations around sphere
const VERTICAL_CLIMB_HEIGHT = SPHERE_RADIUS * 1.6; // Total vertical distance to climb

// ----------------------------------------------------------------------
// Movement State
// ----------------------------------------------------------------------
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;
let isOnPlatform = false;

// ----------------------------------------------------------------------
// Scene Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000510); // Deep space blue-black
scene.fog = new THREE.Fog(0x000510, 30, SPHERE_RADIUS * 0.9);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -SPHERE_RADIUS + PLAYER_HEIGHT + 5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

document.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
});

controls.addEventListener('lock', () => {
  const overlay = document.getElementById('controls-description');
  if (overlay) overlay.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  const overlay = document.getElementById('controls-description');
  if (overlay) overlay.style.display = 'block';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------------------
// Lighting - Epic atmospheric lighting
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x2244aa, 0.4);
scene.add(ambientLight);

// Dramatic directional lights from above
const topLight = new THREE.DirectionalLight(0x6699ff, 0.6);
topLight.position.set(0, SPHERE_RADIUS, 0);
scene.add(topLight);

const sideLight1 = new THREE.DirectionalLight(0xff8844, 0.3);
sideLight1.position.set(SPHERE_RADIUS * 0.5, SPHERE_RADIUS * 0.3, 0);
scene.add(sideLight1);

const sideLight2 = new THREE.DirectionalLight(0x44ff88, 0.3);
sideLight2.position.set(-SPHERE_RADIUS * 0.5, SPHERE_RADIUS * 0.3, 0);
scene.add(sideLight2);

// Point light at spawn point
const spawnLight = new THREE.PointLight(0x66aaff, 1.0, 30);
spawnLight.position.set(0, -SPHERE_RADIUS + 10, 0);
scene.add(spawnLight);

// Point light at top (portal area)
const goalLight = new THREE.PointLight(0xffaa66, 1.5, 40);
goalLight.position.set(0, SPHERE_RADIUS - 15, 0);
scene.add(goalLight);

// ----------------------------------------------------------------------
// Create Hollow Sphere
// ----------------------------------------------------------------------
function createHollowSphere() {
  const sphereGeometry = new THREE.SphereGeometry(
    SPHERE_RADIUS,
    64,
    64,
    0,
    Math.PI * 2,
    0,
    Math.PI
  );

  // Starfield-like material with subtle gradient
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a20,
    metalness: 0.3,
    roughness: 0.7,
    side: THREE.BackSide,
    flatShading: false
  });

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // Add subtle star particles
  const starCount = 800;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = SPHERE_RADIUS * 0.98;

    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    transparent: true,
    opacity: 0.8
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  return { sphere, stars };
}

// ----------------------------------------------------------------------
// Generate Spiral Platform Path
// ----------------------------------------------------------------------
function generatePlatforms() {
  const platforms = [];
  const platformMeshes = [];

  const startY = -SPHERE_RADIUS + PLAYER_HEIGHT + 3; // Just above spawn
  const endY = startY + VERTICAL_CLIMB_HEIGHT;

  for (let i = 0; i < PLATFORM_COUNT; i++) {
    const progress = i / (PLATFORM_COUNT - 1);

    // Vertical position - gradual climb
    const y = startY + progress * VERTICAL_CLIMB_HEIGHT;

    // Spiral angle around sphere
    const angle = progress * SPIRAL_ROTATIONS * Math.PI * 2;

    // Horizontal distance from center (gradually move inward as we climb)
    const radiusOffset = 15 - progress * 8; // Start far, end closer to center
    const x = Math.cos(angle) * radiusOffset;
    const z = Math.sin(angle) * radiusOffset;

    // Platform geometry - hexagonal for visual interest
    const platformGeometry = new THREE.CylinderGeometry(
      PLATFORM_SIZE,
      PLATFORM_SIZE,
      0.4,
      6
    );

    // Color gradient - cooler colors at bottom, warmer at top
    const hue = 210 - progress * 60; // Blue to orange
    const saturation = 70 + progress * 20;
    const lightness = 40 + progress * 20;

    const platformMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100),
      metalness: 0.6,
      roughness: 0.3,
      emissive: new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 200),
      emissiveIntensity: 0.3
    });

    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(x, y, z);

    // Slight random rotation for organic feel
    platform.rotation.y = Math.random() * Math.PI * 2;

    scene.add(platform);
    platformMeshes.push(platform);

    // Store platform data for collision detection
    platforms.push({
      position: new THREE.Vector3(x, y, z),
      radius: PLATFORM_SIZE,
      mesh: platform,
      index: i
    });

    // Add a subtle glow point light to each platform
    if (i % 3 === 0) {
      const platformLight = new THREE.PointLight(
        new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100),
        0.5,
        10
      );
      platformLight.position.set(x, y + 1, z);
      scene.add(platformLight);
    }
  }

  return { platforms, platformMeshes };
}

// ----------------------------------------------------------------------
// Create Visual Portal at Top (Non-functional)
// ----------------------------------------------------------------------
function createTopPortal() {
  const portalY = -SPHERE_RADIUS + PLAYER_HEIGHT + VERTICAL_CLIMB_HEIGHT + 8;

  const portalObj = createLinkedPortal({
    scene,
    fromRoom: '10',
    toRoom: '???',
    x: 0,
    y: portalY,
    z: 0,
    rotationY: 0,
    createLabel: false
  });

  // Add a floating "ESCAPE" text above portal
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 512;
  textCanvas.height = 128;
  const textCtx = textCanvas.getContext('2d');
  textCtx.fillStyle = '#ffffff';
  textCtx.font = 'bold 80px Arial';
  textCtx.textAlign = 'center';
  textCtx.fillText('ESCAPE', 256, 90);

  const textTexture = new THREE.CanvasTexture(textCanvas);
  const textMaterial = new THREE.SpriteMaterial({
    map: textTexture,
    transparent: true,
    opacity: 0.9
  });

  const textSprite = new THREE.Sprite(textMaterial);
  textSprite.scale.set(10, 2.5, 1);
  textSprite.position.set(0, portalY + 4, 0);
  scene.add(textSprite);

  return { portal: portalObj.portal, glow: portalObj.glow, textSprite };
}

// ----------------------------------------------------------------------
// Create Scene Elements
// ----------------------------------------------------------------------
const { sphere, stars } = createHollowSphere();
const { platforms, platformMeshes } = generatePlatforms();
const topPortal = createTopPortal();

// ----------------------------------------------------------------------
// Platform Collision Detection
// ----------------------------------------------------------------------
function checkPlatformCollision(position) {
  for (const platform of platforms) {
    const dx = position.x - platform.position.x;
    const dz = position.z - platform.position.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    // Check if player is within platform radius horizontally
    if (horizontalDist < platform.radius) {
      const verticalDist = position.y - platform.position.y;

      // Check if player is just above the platform (landing on it)
      if (verticalDist > -0.3 && verticalDist < 0.5) {
        return platform;
      }
    }
  }
  return null;
}

// ----------------------------------------------------------------------
// Movement Controls
// ----------------------------------------------------------------------
function onKeyDown(event) {
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
      if (isOnPlatform && !isJumping) {
        jumpVelocity = JUMP_VELOCITY;
        isJumping = true;
        isOnPlatform = false;
      }
      break;
  }
}

function onKeyUp(event) {
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
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (controls.isLocked) {
    // Apply gravity
    if (isJumping || !isOnPlatform) {
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += GRAVITY * delta;
    }

    // Check platform collision
    const currentPlatform = checkPlatformCollision(camera.position);

    if (currentPlatform && jumpVelocity <= 0) {
      // Land on platform
      camera.position.y = currentPlatform.position.y + 0.2 + PLAYER_HEIGHT;
      isJumping = false;
      jumpVelocity = 0;
      isOnPlatform = true;

      // Subtle visual feedback - pulse the platform
      currentPlatform.mesh.material.emissiveIntensity = 0.6;
    } else if (!currentPlatform && isOnPlatform) {
      // Walked off platform
      isOnPlatform = false;
      isJumping = true;
    }

    // Horizontal movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * MOVE_SPEED * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * MOVE_SPEED * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Keep player inside sphere bounds
    const distFromCenter = Math.sqrt(
      camera.position.x ** 2 +
      camera.position.y ** 2 +
      camera.position.z ** 2
    );

    if (distFromCenter > SPHERE_RADIUS - 2) {
      const direction = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z
      ).normalize();

      camera.position.copy(direction.multiplyScalar(SPHERE_RADIUS - 2));
    }

    // Death plane - fall too far, respawn at start
    if (camera.position.y < -SPHERE_RADIUS - 10) {
      camera.position.set(0, -SPHERE_RADIUS + PLAYER_HEIGHT + 5, 0);
      jumpVelocity = 0;
      isJumping = false;
      isOnPlatform = false;
    }
  }

  // Animate platforms - subtle floating motion
  platformMeshes.forEach((platform, index) => {
    const floatOffset = Math.sin(time * 0.5 + index * 0.2) * 0.15;
    platform.position.y = platforms[index].position.y + floatOffset;

    // Fade emissive intensity back to normal
    if (platform.material.emissiveIntensity > 0.3) {
      platform.material.emissiveIntensity -= delta * 0.5;
    }
  });

  // Animate portal
  animateLinkedPortal(topPortal.portal, topPortal.glow);

  // Pulse the "ESCAPE" text
  topPortal.textSprite.material.opacity = 0.7 + Math.sin(time * 2) * 0.2;

  // Subtle star twinkle
  stars.rotation.y += 0.0001;

  // Pulsing goal light
  goalLight.intensity = 1.5 + Math.sin(time * 1.5) * 0.5;

  renderer.render(scene, camera);
}

animate();

// ----------------------------------------------------------------------
// Loading Overlay Management
// ----------------------------------------------------------------------
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    setTimeout(() => {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }, 500);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }
  }
});
