import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';

// Room 9: "Organic Tunnel"
// Concept: Natural, bio-luminescent passage
// Tone: Warm, mysterious, alive
// Differentiation from Room 8: Organic vs geometric, warm vs cool

// Room parameters
const TUNNEL_LENGTH = 55;
const TUNNEL_RADIUS = 5.5;
const eyeHeight = 2.5;
const speed = 90.0;
const gravity = -30;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0804); // Very dark warm brown
scene.fog = new THREE.Fog(0x0f0804, 15, 45);

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
// Lighting - Bio-luminescent feel
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xff8844, 0.2);
scene.add(ambientLight);

// Warm directional lights
const light1 = new THREE.DirectionalLight(0xffaa66, 0.4);
light1.position.set(5, 8, 5);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xaa6633, 0.3);
light2.position.set(-5, 4, -5);
scene.add(light2);

// Bio-luminescent point lights
const bioLights = [];
for (let i = 0; i < 8; i++) {
  const z = -TUNNEL_LENGTH / 2 + (i + 1) * (TUNNEL_LENGTH / 9);
  const angle = (i / 8) * Math.PI * 2;
  const radius = TUNNEL_RADIUS - 1.5;

  const light = new THREE.PointLight(
    i % 2 === 0 ? 0x66ff99 : 0xffaa44,
    0.6,
    15
  );

  light.position.set(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    z
  );

  scene.add(light);
  bioLights.push({
    light,
    baseIntensity: 0.6,
    phase: Math.random() * Math.PI * 2
  });
}

// ----------------------------------------------------------------------
// Organic Tunnel Structure
// ----------------------------------------------------------------------
function createOrganicTunnel() {
  const segments = 12;
  const tunnelGroup = new THREE.Group();

  // Create irregular tunnel segments
  for (let i = 0; i < segments; i++) {
    const segmentLength = TUNNEL_LENGTH / segments;
    const z = -TUNNEL_LENGTH / 2 + i * segmentLength;

    // Vary radius slightly for organic feel
    const radiusVariation = 0.3 + Math.sin(i * 0.7) * 0.2;
    const segmentRadius = TUNNEL_RADIUS + radiusVariation;

    const geometry = new THREE.CylinderGeometry(
      segmentRadius,
      segmentRadius + 0.1,
      segmentLength,
      24,
      1,
      true
    );

    // Warm, earthy material with variation
    const hue = 25 + Math.random() * 10; // Orange-brown range
    const saturation = 30 + Math.random() * 20;
    const lightness = 15 + Math.random() * 10;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100),
      roughness: 0.9,
      metalness: 0.1,
      side: THREE.BackSide
    });

    const segment = new THREE.Mesh(geometry, material);
    segment.rotation.z = Math.PI / 2;
    segment.position.z = z + segmentLength / 2;

    tunnelGroup.add(segment);
  }

  scene.add(tunnelGroup);

  // Floor path - natural stone feel
  const floorGeometry = new THREE.PlaneGeometry(2.5, TUNNEL_LENGTH);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a0f08,
    roughness: 0.95,
    metalness: 0.05
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -TUNNEL_RADIUS + 0.2;
  scene.add(floor);

  return tunnelGroup;
}

// ----------------------------------------------------------------------
// Embedded Art Alcoves & Bio-luminescent Accents
// ----------------------------------------------------------------------
function createArtAlcoves() {
  const alcoves = [];

  // 16 alcoves/art surfaces along tunnel walls
  for (let i = 0; i < 16; i++) {
    const z = -TUNNEL_LENGTH / 2 + (i + 1) * (TUNNEL_LENGTH / 17);
    const angle = (i / 16) * Math.PI * 2 + Math.PI / 4;
    const radius = TUNNEL_RADIUS - 0.5;

    // Alcove recess (darker background)
    const alcoveDepth = 0.3;
    const alcoveGeometry = new THREE.PlaneGeometry(1.8, 1.8);
    const alcoveMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0502,
      roughness: 0.8,
      metalness: 0.1
    });

    const alcove = new THREE.Mesh(alcoveGeometry, alcoveMaterial);
    alcove.position.set(
      Math.cos(angle) * (radius - alcoveDepth),
      Math.sin(angle) * (radius - alcoveDepth),
      z
    );
    alcove.lookAt(0, 0, z);

    scene.add(alcove);

    // Art surface (material-based "relief art")
    const artGeometry = new THREE.PlaneGeometry(1.4, 1.4);

    // Vary art surface colors - warm earth tones with emissive accents
    const artColors = [
      { color: 0x8b4513, emissive: 0x441100 }, // Saddle brown
      { color: 0xcd853f, emissive: 0x664422 }, // Peru
      { color: 0x6b8e23, emissive: 0x334411 }, // Olive drab
      { color: 0x8fbc8f, emissive: 0x447744 }, // Dark sea green
      { color: 0xdaa520, emissive: 0x665500 }  // Goldenrod
    ];

    const artStyle = artColors[i % artColors.length];
    const artMaterial = new THREE.MeshStandardMaterial({
      color: artStyle.color,
      emissive: artStyle.emissive,
      emissiveIntensity: 0.3,
      roughness: 0.7,
      metalness: 0.3
    });

    const artSurface = new THREE.Mesh(artGeometry, artMaterial);
    artSurface.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      z
    );
    artSurface.lookAt(0, 0, z);

    scene.add(artSurface);

    // Bio-luminescent accent near each alcove
    const accentGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x66ff99 : 0xffaa44,
      emissive: i % 2 === 0 ? 0x66ff99 : 0xffaa44,
      emissiveIntensity: 0.8
    });

    const accent = new THREE.Mesh(accentGeometry, accentMaterial);
    const accentAngle = angle + Math.PI / 8;
    accent.position.set(
      Math.cos(accentAngle) * (radius + 0.2),
      Math.sin(accentAngle) * (radius + 0.2),
      z + 0.3
    );

    scene.add(accent);

    alcoves.push({ alcove, artSurface, accent });
  }

  return alcoves;
}

// ----------------------------------------------------------------------
// Create Scene Elements
// ----------------------------------------------------------------------
const tunnelGroup = createOrganicTunnel();
const alcoves = createArtAlcoves();

// ----------------------------------------------------------------------
// Portal to Room 5
// ----------------------------------------------------------------------
const portalObj = createLinkedPortal({
  scene,
  fromRoom: '9',
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

    // Keep player inside tunnel bounds (with organic irregular radius)
    const maxRadius = TUNNEL_RADIUS - 1.2;
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

  // Animate bio-luminescent lights (breathing effect)
  bioLights.forEach((bioLight, index) => {
    const breathe = Math.sin(time * 0.8 + bioLight.phase) * 0.3 + 0.7;
    bioLight.light.intensity = bioLight.baseIntensity * breathe;
  });

  // Subtle pulsing of bio-luminescent accents
  alcoves.forEach((alcove, index) => {
    const pulse = Math.sin(time * 0.6 + index * 0.5) * 0.2 + 0.8;
    alcove.accent.material.emissiveIntensity = 0.8 * pulse;
  });

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
