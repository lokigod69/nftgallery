import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const eyeHeight = 2;
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);

// Scatter warm spotlights around the scene for better illumination
for (let i = 0; i < 20; i++) {
  const spot = new THREE.SpotLight(0xffaa88, 0.5, 50, Math.PI / 6, 0.5);
  spot.position.set(
    (Math.random() - 0.5) * 40,
    Math.random() * 10 + 5,
    (Math.random() - 0.5) * 40
  );
  spot.target.position.set(0, 0, -i * 2);
  scene.add(spot);
  scene.add(spot.target);
}

// Reflective black floor
const floorSize = 100;
const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.8, roughness: 0.2 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Starry ceiling
const starGeo = new THREE.BufferGeometry();
const starVerts = [];
for (let i = 0; i < 1000; i++) {
  const x = Math.random() * 100 - 50;
  const y = Math.random() * 20 + 10;
  const z = Math.random() * 100 - 50;
  starVerts.push(x, y, z);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// Images from /assets/Room7
const imageFiles = [
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__461d3cd1-91d2-4213-90e0-567676b9955d.png",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__466af283-1d72-466f-bfc1-54e1ee6876c2.png",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__68b3628b-b6ef-4896-9549-2c5d8a1bd7af.png",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__7b1a8021-543c-4df1-b042-ca0b831b8958.png",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__88a763cc-6ccc-4e13-9be3-8f08d461424c.png",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__bf83db25-9c43-483a-89c7-d2f8c19f5f0b.png",
"lokigod69._A_female_model_standing_in_a_stark_monochrome_space__e054a1e9-c25f-42b7-999d-8f70985bd4c5.png",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_4512005b-b6b4-48bf-8a1c-3739d9c4a119.png",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_59be43ce-bd6e-4cc3-8450-716fc35dac80.png",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_85b12a18-2947-48ad-a5af-1d6b33ce774f.png",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_8759e405-ef7f-4d8a-a442-f66f99e25ecb.png",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_9482ebf3-7396-4e99-aa02-80ca057b13fa.png",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_9b619bf6-3921-4ddc-be34-e52b7357be11.png",
"lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_b0af6fe2-75ea-4db4-8347-e68fb96a8271.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_00f3edec-48a9-4008-9395-b38b6be4d41a.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_14dd4c67-a62e-4129-90fb-30f9190f70f6.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_15eacfaf-36fc-4130-9b7b-bd6077059bb8.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_2929b4b0-7f22-4bfd-b078-bbe50a80d68d.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_2d4349d0-29e3-478b-bcd4-27c7ea85ebc0.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_2ee2d461-2cfa-41f2-8ca9-a9822a0b0a9c.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_33b7a50b-ef28-440e-9e78-a0162a004cbd.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_4bc3ba0e-ee5f-4585-9c69-39006f26ecb0.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_64ee1a46-0467-42fb-9c06-9d5808ed5939.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_7384f469-b030-4a0e-b097-44ba9ee5d4a1.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_7c0d1f36-6efa-482f-8c07-36c9ac51c43f.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_82754cdd-ac8a-4f79-95e1-9dc78238a7bf.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_8705c6aa-ccba-46cb-898e-666f778f7ce4.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_a2a34144-0654-40ab-b56e-511fe17495fe.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_a68832b9-b616-422a-84f5-ce7a3b3e29f9.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_bb3fc202-10a4-4ce9-a1a3-ac78b6be7cc5.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_bf44c9a4-d34b-4fab-b098-823809e660e9.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_ce313a50-bf83-4bdc-8fc2-dc65101c5b35.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_d89a1885-b7ca-41da-8d28-2ca3f3c58d93.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_f76ec122-ce7b-456a-863b-ffd6eb7fcf97.png",
"lokigod69._A_female_model_whose_face_and_body_are_partially_hum_fa2abe36-bf87-489f-ad93-315bdf686727.png"
];

const loader = new THREE.TextureLoader();
const nftTiles = [];
const tileSize = 2;
imageFiles.forEach((file, index) => {
  const texture = loader.load(`/assets/Room7/${file}`);

  // Main image tile
  // MeshBasicMaterial keeps colors unaffected by scene lighting
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(tileSize, tileSize), material);
  tile.rotation.x = -Math.PI / 2;

  // Mirrored base beneath the tile for a 3D effect
  const baseHeight = 0.3;
  const mirroredTexture = texture.clone();
  mirroredTexture.center.set(0.5, 0.5);
  mirroredTexture.rotation = Math.PI;
  mirroredTexture.needsUpdate = true;
  const sideMaterial = new THREE.MeshStandardMaterial({
    map: mirroredTexture,
    metalness: 1.0,
    roughness: 0.0,
  });

  const baseMaterials = [
    sideMaterial, // right
    sideMaterial, // left
    new THREE.MeshStandardMaterial({ color: 0x000000 }), // top
    new THREE.MeshStandardMaterial({ color: 0x000000 }), // bottom
    sideMaterial, // front
    sideMaterial, // back
  ];

  const base = new THREE.Mesh(new THREE.BoxGeometry(tileSize, baseHeight, tileSize), baseMaterials);

  const halfLimit = floorSize / 2 - tileSize;
  const x = (Math.random() - 0.5) * 2 * halfLimit;
  const z = (Math.random() - 0.5) * 2 * halfLimit;
  tile.position.set(x, baseHeight / 2 + 0.01, z);
  base.position.set(x, -baseHeight / 2, z);

  scene.add(base);
  scene.add(tile);

  if (index % 5 === 0) {
    tile.userData.isNFT = true;
    nftTiles.push(tile);
  }
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

// Portal to Room 0
let portalToRoom0 = new THREE.Mesh(
  new THREE.CircleGeometry(1.5, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
);
portalToRoom0.position.set(0, eyeHeight, 45);
let portalGlow = new THREE.Mesh(
  new THREE.CircleGeometry(1.8, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
);
portalGlow.position.copy(portalToRoom0.position);
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

    const limit = floorSize / 2 - 1;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
  }

  nftTiles.forEach(tile => {
    const dx = camera.position.x - tile.position.x;
    const dz = camera.position.z - tile.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1 && !tile.userData.glowing) {
      tile.userData.glowing = true;
      tile.material.emissive.setHex(0x4444ff);
      setTimeout(() => {
        tile.material.emissive.setHex(0x000000);
        tile.userData.glowing = false;
      }, 1000);
    }
  });

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
