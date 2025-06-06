import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Basic parameters
const corridorLength = 100;
const corridorWidth = 20;
const wallHeight = 10;
const eyeHeight = 2.5;
const speed = 60.0;
const gravity = -30;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, eyeHeight, 5);

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

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
light.position.set(0, 20, 0);
scene.add(light);

// Floor
const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Walls
const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(corridorLength, wallHeight), wallMat);
leftWall.position.set(-corridorWidth / 2, wallHeight / 2, -corridorLength / 2);
leftWall.rotation.y = Math.PI / 2;
scene.add(leftWall);

const rightWall = leftWall.clone();
rightWall.position.set(corridorWidth / 2, wallHeight / 2, -corridorLength / 2);
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

// Curved ceiling
const ceilingGeo = new THREE.CylinderGeometry(corridorWidth / 2, corridorWidth / 2, corridorLength, 32, 1, true, 0, Math.PI);
const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.BackSide });
const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
ceiling.position.set(0, wallHeight, -corridorLength / 2);
ceiling.rotation.z = Math.PI / 2;
scene.add(ceiling);

// Load videos
const videoFiles = [
  'Amy1.mp4','Angel1.mp4','Anna1.mp4','April1.mp4','Cara1.mp4','Claire1.mp4','Cynthia2.mp4','Dasha1.mp4','Devon2.mp4','Huong1.mp4','Lucy1.mp4','Ruby1.mp4','Sarah1.mp4'
];

const videoPlanes = [];
const spacing = corridorLength / (videoFiles.length + 1);
videoFiles.forEach((file, index) => {
  const video = document.createElement('video');
  video.src = `videos/${file}`;
  video.loop = true;
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.display = 'none';
  document.body.appendChild(video);

  const texture = new THREE.VideoTexture(video);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), material);
  const z = -spacing * (index + 1);
  const side = index % 2 === 0 ? -1 : 1;
  plane.position.set(side * (corridorWidth / 2 - 2), eyeHeight + 0.5, z);
  plane.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  scene.add(plane);
  videoPlanes.push(plane);
});

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
  }

  renderer.render(scene, camera);
}

animate();
