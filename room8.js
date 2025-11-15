import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';

// Room 8: "Liminal Passage"
// Concept: Minimal geometric tunnel, transitional space
// Tone: Cool, meditative, clean
// Performance: Lightest room in the project

// Room parameters
const TUNNEL_LENGTH = 60;
const TUNNEL_RADIUS = 6;
const eyeHeight = 2.5;
const speed = 100.0;
const gravity = -30;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12); // Very dark blue-black
scene.fog = new THREE.Fog(0x0a0a12, 20, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, eyeHeight, -TUNNEL_LENGTH / 2 + 5);

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
// Lighting
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x4466ff, 0.3);
scene.add(ambientLight);

// Two directional lights for clean definition
const light1 = new THREE.DirectionalLight(0x6699ff, 0.4);
light1.position.set(10, 10, 10);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xff9966, 0.3);
light2.position.set(-10, 5, -10);
scene.add(light2);

// Accent point lights along tunnel
const accentLight1 = new THREE.PointLight(0x66ffff, 0.5, 20);
accentLight1.position.set(0, 0, -10);
scene.add(accentLight1);

const accentLight2 = new THREE.PointLight(0xff66ff, 0.5, 20);
accentLight2.position.set(0, 0, 10);
scene.add(accentLight2);

// ----------------------------------------------------------------------
// Tunnel Structure
// ----------------------------------------------------------------------
function createTunnel() {
  // Main cylindrical tunnel
  const tunnelGeometry = new THREE.CylinderGeometry(
    TUNNEL_RADIUS,
    TUNNEL_RADIUS,
    TUNNEL_LENGTH,
    32,
    1,
    false
  );

  // Gradient material with iridescent feel
  const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    metalness: 0.6,
    roughness: 0.3,
    side: THREE.BackSide,
    flatShading: false
  });

  const tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
  tunnel.rotation.z = Math.PI / 2;
  scene.add(tunnel);

  // Floor walkway - subtle guide
  const floorGeometry = new THREE.PlaneGeometry(3, TUNNEL_LENGTH);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f0f1a,
    metalness: 0.4,
    roughness: 0.6
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -TUNNEL_RADIUS + 0.1;
  scene.add(floor);

  return { tunnel, floor };
}

// ----------------------------------------------------------------------
// Floating Geometric Forms
// ----------------------------------------------------------------------
function createGeometricForms() {
  const forms = [];
  const geometries = [
    new THREE.SphereGeometry(0.8, 16, 16),
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.TorusGeometry(0.7, 0.3, 16, 32),
    new THREE.OctahedronGeometry(0.9),
    new THREE.TetrahedronGeometry(1.0)
  ];

  const colors = [
    0x4466ff, // Cool blue
    0x66ffff, // Cyan
    0xff66ff, // Magenta
    0x6699ff, // Light blue
    0x9966ff  // Purple
  ];

  // Create 14 floating forms distributed along tunnel
  for (let i = 0; i < 14; i++) {
    const geomIndex = i % geometries.length;
    const colorIndex = i % colors.length;

    const material = new THREE.MeshStandardMaterial({
      color: colors[colorIndex],
      metalness: 0.8,
      roughness: 0.2,
      emissive: colors[colorIndex],
      emissiveIntensity: 0.2
    });

    const form = new THREE.Mesh(geometries[geomIndex], material);

    // Position along tunnel with radial offset
    const angle = (i / 14) * Math.PI * 2;
    const radius = TUNNEL_RADIUS - 2;
    const zPos = -TUNNEL_LENGTH / 2 + (i + 1) * (TUNNEL_LENGTH / 15);

    form.position.set(
      Math.cos(angle) * radius * 0.6,
      Math.sin(angle) * radius * 0.6,
      zPos
    );

    // Random rotation
    form.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Store animation data
    form.userData.rotationSpeed = {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.3
    };

    scene.add(form);
    forms.push(form);
  }

  return forms;
}

// ----------------------------------------------------------------------
// Create Scene Elements
// ----------------------------------------------------------------------
const { tunnel, floor } = createTunnel();
const geometricForms = createGeometricForms();

// ----------------------------------------------------------------------
// Portal to Room 5
// ----------------------------------------------------------------------
const portalObj = createLinkedPortal({
  scene,
  fromRoom: '8',
  toRoom: '5',
  x: 0,
  y: eyeHeight,
  z: TUNNEL_LENGTH / 2 - 2,
  rotationY: Math.PI,
  createLabel: true
});

const portalToRoom5 = portalObj.portal;
const portalGlow = portalObj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: [
    {
      position: new THREE.Vector3(0, eyeHeight, TUNNEL_LENGTH / 2 - 2),
      name: 'Eternal Eclipse (Room 5)',
      url: 'room5.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    }
  ],
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

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
      if (!isJumping) { jumpVelocity = 10; isJumping = true; }
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
    if (isJumping) {
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;
      if (camera.position.y <= eyeHeight) {
        camera.position.y = eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
      }
    }

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Keep player inside tunnel bounds
    const maxRadius = TUNNEL_RADIUS - 1.5;
    const distFromCenter = Math.sqrt(camera.position.x ** 2 + camera.position.y ** 2);
    if (distFromCenter > maxRadius) {
      const angle = Math.atan2(camera.position.y, camera.position.x);
      camera.position.x = Math.cos(angle) * maxRadius;
      camera.position.y = Math.sin(angle) * maxRadius;
    }

    // Z-axis bounds
    const halfLength = TUNNEL_LENGTH / 2;
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfLength + 2, halfLength - 2);

    // Check portal proximity
    checkPortalProximity();
  }

  // Animate geometric forms
  geometricForms.forEach(form => {
    form.rotation.x += form.userData.rotationSpeed.x * delta;
    form.rotation.y += form.userData.rotationSpeed.y * delta;
    form.rotation.z += form.userData.rotationSpeed.z * delta;
  });

  // Animate accent lights (subtle pulsing)
  accentLight1.intensity = 0.5 + Math.sin(time * 0.5) * 0.2;
  accentLight2.intensity = 0.5 + Math.cos(time * 0.7) * 0.2;

  // Animate portal
  animateLinkedPortal(portalToRoom5, portalGlow);

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
