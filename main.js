import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// ----------------------------------------------------------------------
// Global Variables for Jump Physics
// ----------------------------------------------------------------------
const groundLevels = { 1: 2 };
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;

// ----------------------------------------------------------------------
// Global Variables and Picture Viewer Setup
// ----------------------------------------------------------------------
let picturePlanes = [];  // Store picture plane meshes for click detection

// Create a full-screen image viewer overlay (initially hidden)
const viewerOverlay = document.createElement('div');
viewerOverlay.style.position = 'fixed';
viewerOverlay.style.top = '0';
viewerOverlay.style.left = '0';
viewerOverlay.style.width = '100%';
viewerOverlay.style.height = '100%';
viewerOverlay.style.backgroundColor = 'black';
viewerOverlay.style.display = 'none';
viewerOverlay.style.alignItems = 'center';
viewerOverlay.style.justifyContent = 'center';
viewerOverlay.style.flexDirection = 'column'; // stack image and link vertically
viewerOverlay.style.zIndex = '1000';

const viewerImage = document.createElement('img');
viewerImage.style.maxWidth = '80%';
viewerImage.style.maxHeight = '80%';
viewerOverlay.appendChild(viewerImage);

const purchaseLink = document.createElement('a');
purchaseLink.href = 'https://opensea.io';  // Placeholder link – update as needed.
purchaseLink.innerText = 'Buy NFT on OpenSea';
purchaseLink.style.marginTop = '20px';
purchaseLink.style.color = '#fff';
purchaseLink.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
purchaseLink.style.padding = '10px 20px';
purchaseLink.style.textDecoration = 'none';
purchaseLink.style.borderRadius = '5px';
viewerOverlay.appendChild(purchaseLink);

document.body.appendChild(viewerOverlay);

// Close viewer on left-click if it's already open
window.addEventListener('click', (event) => {
  if (event.button !== 0) return; // Only process left clicks
  if (viewerOverlay.style.display === 'flex') {
    viewerOverlay.style.display = 'none';
    controls.lock(); // Re-enable controls when closing the viewer
    return;
  }
});

function openImageViewer(imageUrl) {
  viewerImage.src = imageUrl;
  viewerOverlay.style.display = 'flex';
  controls.unlock(); // Disable controls when viewing an NFT
}

// ----------------------------------------------------------------------
// Scene, Camera & Renderer Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
// Permanently set to night mode:
scene.background = new THREE.Color(0x0a0a0a); // Night mode background
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Start camera at ground level.
camera.position.set(0, groundLevels[1], 5);

// Clock for animation timing
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Set output encoding to Linear so that the pictures use their original brightness.
renderer.outputEncoding = THREE.LinearEncoding;
document.body.appendChild(renderer.domElement);

// ----------------------------------------------------------------------
// Audio Setup
// ----------------------------------------------------------------------
const listener = new THREE.AudioListener();
camera.add(listener);
const ambientSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load('/assets/ambient.mp3', function (buffer) {
  ambientSound.setBuffer(buffer);
  ambientSound.setLoop(true);
  ambientSound.setVolume(0.5);
  ambientSound.play();
});

// ----------------------------------------------------------------------
// Controls & Movement Setup
// ----------------------------------------------------------------------
const controls = new PointerLockControls(camera, document.body);

// Only lock controls on click if we're not viewing an NFT
document.addEventListener('click', () => {
  if (viewerOverlay.style.display !== 'flex') {
    controls.lock();
  }
});

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const speed = 20.0;

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyD': moveRight = true; break;
    case 'Space':
      if (!isJumping) {
        isJumping = true;
        jumpVelocity = 8; // initial jump velocity
      }
      break;
    case 'Escape':
      if (viewerOverlay.style.display === 'flex') {
        viewerOverlay.style.display = 'none';
        controls.lock(); // Re-enable controls when closing the viewer
      } else {
        controls.unlock(); // Allow normal escape functionality when not viewing NFT
      }
      break;
  }
});
document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyD': moveRight = false; break;
  }
});

// ----------------------------------------------------------------------
// Lighting
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Lower intensity for night mode
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0x00aaff, 0.5); // Cool blue tint
directionalLight.position.set(0, 10, 0);
scene.add(directionalLight);

// ----------------------------------------------------------------------
// Floor: Create a Random Tiled Texture (unchanged)
// ----------------------------------------------------------------------
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  // Fill entire canvas with a base color
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Divide the canvas into a 10x10 grid and randomly adjust some tiles
  const cols = 10, rows = 10;
  const tileWidth = canvas.width / cols;
  const tileHeight = canvas.height / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (Math.random() < 0.3) {
        const h = Math.floor(Math.random() * 360);
        const s = Math.floor(10 + Math.random() * 20);
        const l = Math.floor(40 + Math.random() * 30);
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;
        ctx.fillRect(i * tileWidth, j * tileHeight, tileWidth, tileHeight);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

// ----------------------------------------------------------------------
// Room Structure: Outer Walls, Floor & Ceiling (Single Room)
// ----------------------------------------------------------------------
let walls = {};

function createWallsAndFloor() {
  // Subtle reflective wall material
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x404040,
    roughness: 0.5,  // Lower roughness for subtle reflections
    metalness: 0.2   // Increased metalness for a slight sheen
  });

  const floorTexture = createFloorTexture();
  const floorMaterial = new THREE.MeshStandardMaterial({ map: floorTexture });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5;
  scene.add(floor);

  const wallGeometry = new THREE.PlaneGeometry(40, 15);
  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, 2.5, -20);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-20, 2.5, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(20, 2.5, 0);
  scene.add(rightWall);

  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial.clone());
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, 2.5, 20);
  scene.add(frontWall);

  return { backWall, leftWall, rightWall, frontWall };
}
walls = createWallsAndFloor();

// ----------------------------------------------------------------------
// Ceiling with an Optical Illusion (unchanged)
// ----------------------------------------------------------------------
function createCeiling() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 4;
  const gridSize = 64;
  for (let x = 0; x <= canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  const ceilingTexture = new THREE.CanvasTexture(canvas);
  ceilingTexture.wrapS = THREE.RepeatWrapping;
  ceilingTexture.wrapT = THREE.RepeatWrapping;
  ceilingTexture.repeat.set(1, 1);

  const ceilingMaterial = new THREE.MeshStandardMaterial({
    map: ceilingTexture
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 10;
  scene.add(ceiling);
}
createCeiling();

// ----------------------------------------------------------------------
// Helper: Compute Evenly Spaced Positions for a Given Width
// ----------------------------------------------------------------------
function getPositions(totalWidth, numFrames) {
  const positions = [];
  const gap = totalWidth / (numFrames + 1);
  for (let i = 0; i < numFrames; i++) {
    positions.push(-totalWidth / 2 + (i + 1) * gap);
  }
  return positions;
}
const wallPositions5 = getPositions(40, 5);

// ----------------------------------------------------------------------
// NFT Frames on Outer Walls
// Using MeshBasicMaterial so that the images display unlit.
const photographicGreyMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
  metalness: 0.1,
  roughness: 0.7
});

function createNFT(index, position, rotation) {
  const frameGroup = new THREE.Group();
  const frameWidth = 2.0, frameHeight = 3.0;
  const pictureWidth = 1.8, pictureHeight = 2.7;

  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(frameWidth, frameHeight, 0.2),
    photographicGreyMaterial
  );
  frameGroup.add(frameBox);

  const loader = new THREE.TextureLoader();
  loader.load(
    `/assets/nft${index + 1}.png`,
    (tex) => {
      tex.encoding = THREE.LinearEncoding;
      const picturePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(pictureWidth, pictureHeight),
        new THREE.MeshBasicMaterial({
          map: tex,
          side: THREE.DoubleSide
        })
      );
      picturePlane.userData.imageUrl = `/assets/nft${index + 1}.png`;
      picturePlane.position.z = 0.11;
      frameGroup.add(picturePlane);
      picturePlanes.push(picturePlane);
    },
    undefined,
    (err) => {
      console.error(`Error loading texture: nft${index + 1}.png`, err);
    }
  );

  frameGroup.position.set(position.x, position.y, position.z);
  frameGroup.rotation.set(rotation.x, rotation.y, rotation.z);
  scene.add(frameGroup);
}

const backWallNFTPositions = wallPositions5.map(x => ({ pos: { x: x, y: 2, z: -19.5 }, rot: { x: 0, y: 0, z: 0 } }));
const leftWallNFTPositions = getPositions(40, 5).map(z => ({ pos: { x: -19.5, y: 2, z: z }, rot: { x: 0, y: Math.PI / 2, z: 0 } }));
const rightWallNFTPositions = getPositions(40, 5).map(z => ({ pos: { x: 19.5, y: 2, z: z }, rot: { x: 0, y: -Math.PI / 2, z: 0 } }));
const frontWallNFTPositions = wallPositions5.map(x => ({ pos: { x: x, y: 2, z: 19.5 }, rot: { x: 0, y: Math.PI, z: 0 } }));

backWallNFTPositions.forEach((data, i) => createNFT(i, data.pos, data.rot));
leftWallNFTPositions.forEach((data, i) => createNFT(i + 5, data.pos, data.rot));
rightWallNFTPositions.forEach((data, i) => createNFT(i + 10, data.pos, data.rot));
frontWallNFTPositions.forEach((data, i) => createNFT(i + 15, data.pos, data.rot));

// ----------------------------------------------------------------------
// Particle/Snow Effects on Outer Walls
// ----------------------------------------------------------------------
function createSnowForWall(wallMesh, frameCenters) {
  const particleCount = 300;
  const positions = [];
  const margin = 0.3;
  const halfPicW = 0.9 + margin;
  const halfPicH = 1.35 + margin;
  for (let i = 0; i < particleCount; i++) {
    const x = THREE.MathUtils.randFloat(-20, 20);
    const y = THREE.MathUtils.randFloat(-7.5, 7.5);
    let skip = false;
    for (const center of frameCenters) {
      if (Math.abs(x - center.x) < halfPicW && Math.abs(y - center.y) < halfPicH) {
        skip = true;
        break;
      }
    }
    if (!skip) positions.push(x, y, 0);
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.2,
    transparent: true,
    opacity: 0.8
  });
  const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
  particleSystem.position.z = 0.01;
  wallMesh.add(particleSystem);
}

const backWallFrameCenters = backWallNFTPositions.map(data => ({ x: data.pos.x, y: data.pos.y - 2.5 }));
const frontWallFrameCenters = frontWallNFTPositions.map(data => ({ x: data.pos.x, y: data.pos.y - 2.5 }));
const leftWallFrameCenters = leftWallNFTPositions.map(data => ({ x: data.pos.z, y: data.pos.y - 2.5 }));
const rightWallFrameCenters = rightWallNFTPositions.map(data => ({ x: -data.pos.z, y: data.pos.y - 2.5 }));

createSnowForWall(walls.backWall, backWallFrameCenters);
createSnowForWall(walls.frontWall, frontWallFrameCenters);
createSnowForWall(walls.leftWall, leftWallFrameCenters);
createSnowForWall(walls.rightWall, rightWallFrameCenters);

// ----------------------------------------------------------------------
// Divider (Mid-Room Wall) with Additional NFTs (Numbers 21-28)
// ----------------------------------------------------------------------
function createDivider() {
  const dividerGroup = new THREE.Group();
  const dividerGeometry = new THREE.BoxGeometry(30, 13, 0.2);
  const dividerMaterial = new THREE.MeshStandardMaterial({
    color: 0x505050,
    roughness: 0.7,
    metalness: 0.1
  });
  const dividerMesh = new THREE.Mesh(dividerGeometry, dividerMaterial);
  dividerGroup.add(dividerMesh);
  dividerGroup.position.set(0, 1.5, 0);
  scene.add(dividerGroup);

  function createDividerNFT(nftNumber, localX, localZ, rotationY) {
    const frameGroup = new THREE.Group();
    const frameWidth = 2.0, frameHeight = 3.0;
    const pictureWidth = 1.8, pictureHeight = 2.7;
    const frameBox = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, 0.2),
      photographicGreyMaterial
    );
    frameGroup.add(frameBox);

    const loader = new THREE.TextureLoader();
    loader.load(
      `/assets/nft${nftNumber}.png`,
      (tex) => {
        tex.encoding = THREE.LinearEncoding;
        const picturePlane = new THREE.Mesh(
          new THREE.PlaneGeometry(pictureWidth, pictureHeight),
          new THREE.MeshBasicMaterial({
            map: tex,
            side: THREE.DoubleSide
          })
        );
        picturePlane.userData.imageUrl = `/assets/nft${nftNumber}.png`;
        picturePlane.position.z = 0.11;
        frameGroup.add(picturePlane);
        picturePlanes.push(picturePlane);
      },
      undefined,
      (err) => { console.error(`Error loading texture: nft${nftNumber}.png`, err); }
    );
    frameGroup.position.set(localX, 0.5, localZ);
    frameGroup.rotation.y = rotationY;
    dividerGroup.add(frameGroup);
  }

  const dividerPositions = getPositions(30, 4);
  dividerPositions.forEach((localX, i) => {
    createDividerNFT(21 + i, localX, 0.21, 0);
  });
  dividerPositions.forEach((localX, i) => {
    createDividerNFT(25 + i, localX, -0.21, Math.PI);
  });
}
createDivider();

// ----------------------------------------------------------------------
// Collision Boundaries (for the single room)
// ----------------------------------------------------------------------
function checkCollisions() {
  camera.position.x = Math.max(-19, Math.min(19, camera.position.x));
  camera.position.z = Math.max(-19, Math.min(19, camera.position.z));
  const safeZone = 0.5;
  if (camera.position.x > -15 && camera.position.x < 15 && Math.abs(camera.position.z) < safeZone) {
    camera.position.z = (camera.position.z >= 0) ? safeZone : -safeZone;
  }
}

// ----------------------------------------------------------------------
// Combined Click Handler for Picture Viewing
// ----------------------------------------------------------------------
window.addEventListener('click', (event) => {
  if (event.button !== 0) return;
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  // Check for intersections with NFT picture planes.
  const intersections = raycaster.intersectObjects(picturePlanes, true);
  if (intersections.length > 0) {
    const intersected = intersections[0].object;
    if (intersected.userData && intersected.userData.imageUrl) {
      openImageViewer(intersected.userData.imageUrl);
    }
  }
});

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // Update jump physics and ensure camera stays on the ground level.
  const groundLevel = groundLevels[1];
  if (isJumping) {
    camera.position.y += jumpVelocity * delta;
    jumpVelocity += gravity * delta;
    if (camera.position.y < groundLevel) {
      camera.position.y = groundLevel;
      isJumping = false;
      jumpVelocity = 0;
    }
  } else {
    camera.position.y = groundLevel;
  }

  if (controls.isLocked) {
    velocity.x = 0;
    velocity.z = 0;
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
    controls.moveRight(-velocity.x);
    controls.moveForward(-velocity.z);
  }

  checkCollisions();

  renderer.render(scene, camera);
}
animate();

// ----------------------------------------------------------------------
// Handle Window Resize
// ----------------------------------------------------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
