import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Basic dimensions in metres
const CORRIDOR_RADIUS = 5;
const CORRIDOR_LENGTH = 50;
const WALKWAY_WIDTH = 2;
const FLOOR_GLASS_WIDTH = 1;
const PANEL_SIZE = 2;
const PANEL_SPACING = 5;
const SPHERE_DIAMETER = 1;
const SPHERE_SPACING = 10;
const eyeHeight = 2;
const speed = 80.0;
const gravity = -30;

// Helper to load textures
const loader = new THREE.TextureLoader();
const nftImages = Array.from({length: 40}, (_, i) => `/assets/nft${i+1}.png`);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, eyeHeight, -CORRIDOR_LENGTH / 2 + 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
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

// Lights
scene.add(new THREE.AmbientLight(0x99ccff, 0.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.5);
dir.position.set(5, 5, -5);
scene.add(dir);

// Corridor shell
const shellGeo = new THREE.CylinderGeometry(CORRIDOR_RADIUS, CORRIDOR_RADIUS, CORRIDOR_LENGTH, 64, 1, true);
const shellMat = new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: 0xd8d8d8, roughness: 0.4, metalness: 0.1 });
const shell = new THREE.Mesh(shellGeo, shellMat);
shell.rotation.z = Math.PI / 2;
scene.add(shell);

// Walkway
const walkway = new THREE.Mesh(new THREE.PlaneGeometry(WALKWAY_WIDTH, CORRIDOR_LENGTH), new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.2 }));
walkway.rotation.x = -Math.PI / 2;
walkway.position.z = 0;
scene.add(walkway);

// Floor glass strips
const glassMat = new THREE.MeshPhysicalMaterial({ transparent: true, opacity: 0.3, roughness: 0, metalness: 0, transmission: 1 });
for (let i = 0; i < CORRIDOR_LENGTH; i++) {
  const z = -CORRIDOR_LENGTH / 2 + i + 0.5;
  const left = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_GLASS_WIDTH, 1), glassMat);
  left.rotation.x = -Math.PI / 2;
  left.position.set(-WALKWAY_WIDTH / 2 - FLOOR_GLASS_WIDTH / 2, 0, z);
  scene.add(left);
  const right = left.clone();
  right.position.x = WALKWAY_WIDTH / 2 + FLOOR_GLASS_WIDTH / 2;
  scene.add(right);
}

// Wall panels
const panelGeo = new THREE.PlaneGeometry(PANEL_SIZE, PANEL_SIZE);
for (let z = -CORRIDOR_LENGTH / 2 + PANEL_SPACING; z < CORRIDOR_LENGTH / 2; z += PANEL_SPACING) {
  const index = Math.floor((z + CORRIDOR_LENGTH/2) / PANEL_SPACING);
  const side = index % 2 === 0 ? 1 : -1;
  const tex = loader.load(nftImages[index % nftImages.length]);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const panel = new THREE.Mesh(panelGeo, mat);
  panel.position.set(side * (CORRIDOR_RADIUS - 0.1), eyeHeight, z);
  panel.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  scene.add(panel);
}

// Sphere displays
for (let z = -CORRIDOR_LENGTH / 2 + SPHERE_SPACING; z < CORRIDOR_LENGTH / 2; z += SPHERE_SPACING) {
  const tex = loader.load(nftImages[(z + CORRIDOR_LENGTH/2) % nftImages.length]);
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  pedestal.position.set(0, 0.5, z);
  scene.add(pedestal);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_DIAMETER/2, 32, 32), new THREE.MeshStandardMaterial({ map: tex }));
  sphere.position.set(0, 1.5, z);
  scene.add(sphere);
}

// Viewport at end of corridor
const viewport = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
viewport.position.set(0, 3, CORRIDOR_LENGTH/2 + 0.05);
viewport.rotation.y = Math.PI;
scene.add(viewport);

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

// Portal to Room 0
let portalToRoom0 = new THREE.Mesh(
  new THREE.CircleGeometry(1.5, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
);
portalToRoom0.position.set(0, eyeHeight, CORRIDOR_LENGTH / 2 - 2);
portalToRoom0.rotation.y = Math.PI;

let portalGlow = new THREE.Mesh(
  new THREE.CircleGeometry(1.8, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
);
portalGlow.position.copy(portalToRoom0.position);
portalGlow.rotation.copy(portalToRoom0.rotation);
scene.add(portalToRoom0, portalGlow);

function checkPortalProximity() {
  const dist = camera.position.distanceTo(portalToRoom0.position);
  const desc = document.getElementById('controls-description');
  if (dist < 3.0) {
    if (desc) desc.textContent = 'Approach portal to return to Eternal Eclipse (Room 5)';
    if (dist < 1.8) {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.style.display = 'flex';
      setTimeout(() => window.location.href = 'room5.html', 500);
    }
  } else if (desc) {
    desc.textContent = 'Controls: WASD - Move, Mouse - Look, SPACE - Jump';
  }
}

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

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

    const maxZ = CORRIDOR_LENGTH / 2 - 1;
    const minZ = -CORRIDOR_LENGTH / 2 + 1;
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, minZ, maxZ);
    const limitX = WALKWAY_WIDTH / 2 - 0.5;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limitX, limitX);
  }

  // Check portal proximity and animate
  checkPortalProximity();
  if (portalToRoom0) {
    portalToRoom0.rotation.z += 0.01;
    portalGlow.rotation.z -= 0.01;
  }

  renderer.render(scene, camera);
}

animate();

// Loading overlay management
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
