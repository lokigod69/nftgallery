import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const ROOM_SIZE = 10; // 10x10 meters
const ROOM_HEIGHT = 5; // height
const FRAME_SIZE = 1; // 1x1 meter frames
const eyeHeight = 1.7;
const speed = 80.0;
const gravity = -30;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, eyeHeight, 0);

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

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);

// ---------- Room Structure ---------
const half = ROOM_SIZE / 2;
const frameOffset = 0.01; // avoid z-fighting

const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
const boxGeo = new THREE.BoxGeometry(ROOM_SIZE, ROOM_HEIGHT, ROOM_SIZE);
const roomBox = new THREE.Mesh(boxGeo, blackMat);
scene.add(roomBox);

const frameMat = new THREE.MeshBasicMaterial({ color: 0x808080 });
const frameGeo = new THREE.PlaneGeometry(FRAME_SIZE, FRAME_SIZE);

function addFrame(x, y, z, rx, ry, rz) {
  const frame = new THREE.Mesh(frameGeo, frameMat.clone());
  frame.position.set(x, y, z);
  frame.rotation.set(rx, ry, rz);
  scene.add(frame);
}

function populateFace(face) {
  const step = FRAME_SIZE;
  const startXY = -half + FRAME_SIZE / 2;
  const endXY = half - FRAME_SIZE / 2;
  const startY = FRAME_SIZE / 2;
  const endY = ROOM_HEIGHT - FRAME_SIZE / 2;
  for (let i = startXY; i <= endXY; i += step) {
    const jStart = (face === 'floor' || face === 'ceiling') ? startXY : startY;
    const jEnd = (face === 'floor' || face === 'ceiling') ? endXY : endY;
    for (let j = jStart; j <= jEnd; j += step) {
      const indexA = Math.round((i - startXY) / step);
      const indexB = (face === 'floor' || face === 'ceiling')
        ? Math.round((j - startXY) / step)
        : Math.round((j - startY) / step);
      if ((indexA + indexB) % 2 !== 0) continue;
      switch (face) {
        case 'floor':
          addFrame(i, frameOffset, j, -Math.PI / 2, 0, 0);
          break;
        case 'ceiling':
          addFrame(i, ROOM_HEIGHT - frameOffset, j, Math.PI / 2, 0, 0);
          break;
        case 'north':
          addFrame(i, j, -half - frameOffset, 0, 0, 0);
          break;
        case 'south':
          addFrame(i, j, half + frameOffset, 0, Math.PI, 0);
          break;
        case 'west':
          addFrame(-half - frameOffset, j, i, 0, Math.PI / 2, 0);
          break;
        case 'east':
          addFrame(half + frameOffset, j, i, 0, -Math.PI / 2, 0);
          break;
      }
    }
  }
}

populateFace('floor');
populateFace('ceiling');
populateFace('north');
populateFace('south');
populateFace('west');
populateFace('east');

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
portalToRoom0.position.set(0, eyeHeight, half - 0.5);
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

    const limitX = half - 0.5;
    const limitZ = half - 0.5;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limitX, limitX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limitZ, limitZ);
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, eyeHeight, ROOM_HEIGHT - 0.1);
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
