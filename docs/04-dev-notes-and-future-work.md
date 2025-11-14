# Developer Notes & Future Work

Guide for extending and improving the NFT gallery. This document provides step-by-step instructions for common development tasks and identifies extension points for future features.

---

## Quick Start for Developers

### Project Setup

```bash
# Clone repository
git clone <repository-url>
cd nftgallery

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

### Tech Stack Summary

- **Build**: Vite 6.3.5
- **3D Engine**: Three.js 0.161.0
- **Language**: Vanilla JavaScript ES6+ (main), TypeScript (future rooms)
- **Controls**: PointerLockControls (desktop), nipplejs (mobile)
- **Deployment**: Vercel

### Architecture Pattern

- **Multi-Page Application** (MPA), NOT Single-Page Application
- Each room = separate HTML + JS pair
- Navigation via `window.location.href` (full page reload)
- No shared state between rooms
- Assets loaded per-room

---

## How to Add a New Room

### Option A: Vanilla JavaScript Room (Recommended for Consistency)

Follow this process to add a new room that matches the existing vanilla JS architecture:

#### Step 1: Create HTML File

Create `roomX.html` (replace X with your room number/letter):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NFT Gallery - Room X</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <!-- Navigation menu -->
  <div class="nav-menu">
    <button class="nav-toggle">☰</button>
    <nav class="nav-dropdown" style="display: none;">
      <a href="room0.html">Room 0 (Home)</a>
      <a href="room1.html">Room 1</a>
      <!-- Add your new room here -->
      <a href="roomX.html">Room X</a>
    </nav>
  </div>

  <!-- Loading overlay -->
  <div class="loading-overlay" id="loading-overlay">
    <div class="loading-content">
      <div class="loading-text">Loading Room X...</div>
      <div class="loading-bar-container">
        <div class="loading-bar"></div>
      </div>
    </div>
  </div>

  <!-- Controls overlay -->
  <div class="controls-description" id="controls-description">
    <p>Click to start</p>
    <p>Controls: WASD - Move, Mouse - Look, ESC - Toggle camera</p>
  </div>

  <!-- Load navigation script -->
  <script src="nav.js" defer></script>

  <!-- Load room script as module -->
  <script type="module" src="roomX.js"></script>
</body>
</html>
```

#### Step 2: Create JavaScript File

Create `roomX.js` with this template:

```javascript
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// ============================================
// Configuration
// ============================================
const ROOM_WIDTH = 50;
const ROOM_DEPTH = 50;
const ROOM_HEIGHT = 10;
const EYE_HEIGHT = 2.5;
const MOVE_SPEED = 80.0;
const GRAVITY = -30;
const JUMP_FORCE = 10;

// NFT configuration for this room
const NFT_START_INDEX = 1;  // First NFT to display
const NFT_COUNT = 20;       // How many NFTs in this room

// ============================================
// Scene Setup
// ============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue or your choice

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, EYE_HEIGHT, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ============================================
// Controls
// ============================================
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// Mobile detection
const isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);

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
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 10);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
}

// ============================================
// Room Structure
// ============================================
function createRoomStructure() {
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Walls (use box geometry or individual planes)
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    roughness: 0.9,
    metalness: 0.1
  });

  // North wall
  const northWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
    wallMaterial
  );
  northWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  scene.add(northWall);

  // South wall
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
}

// ============================================
// NFT Display
// ============================================
const picturePlanes = []; // For click detection

function createNFTFrame(index, position, rotation) {
  const frameGroup = new THREE.Group();

  // Frame backing
  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 3.0, 0.2),
    new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.7,
      metalness: 0.3
    })
  );
  frameGroup.add(frameBox);

  // Picture plane
  const imageUrl = `/assets/nft${index}.png`;
  const textureLoader = new THREE.TextureLoader();

  textureLoader.load(
    imageUrl,
    (texture) => {
      const picturePlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 2.7),
        new THREE.MeshBasicMaterial({ map: texture })
      );
      picturePlane.position.z = 0.11; // In front of frame
      picturePlane.userData = {
        imageUrl: imageUrl,
        index: index,
        isNFT: true
      };
      frameGroup.add(picturePlane);
      picturePlanes.push(picturePlane);
    },
    undefined,
    (error) => console.error(`Failed to load NFT ${index}:`, error)
  );

  frameGroup.position.copy(position);
  frameGroup.rotation.y = rotation;
  scene.add(frameGroup);
}

function setupNFTDisplay() {
  // Example: Place NFTs along north wall
  const nftSpacing = 5;
  const startX = -(NFT_COUNT * nftSpacing) / 2;

  for (let i = 0; i < NFT_COUNT; i++) {
    const position = new THREE.Vector3(
      startX + i * nftSpacing,
      ROOM_HEIGHT / 2,
      -ROOM_DEPTH / 2 + 0.1 // Slightly in front of wall
    );
    createNFTFrame(NFT_START_INDEX + i, position, 0);
  }
}

// ============================================
// Portals
// ============================================
function createPortal(position, targetRoom, color = 0x4444ff) {
  const portalGeometry = new THREE.CircleGeometry(1.5, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  portal.position.copy(position);

  // Glow effect
  const glowGeometry = new THREE.CircleGeometry(1.8, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(position);

  scene.add(portal, glow);

  return {
    portal,
    glow,
    target: targetRoom,
    activated: false
  };
}

// Example portals
const portalToRoom0 = createPortal(
  new THREE.Vector3(0, EYE_HEIGHT, ROOM_DEPTH / 2 - 2),
  'room0.html',
  0x00ffff // Teal for hub
);

const portalToNextRoom = createPortal(
  new THREE.Vector3(0, EYE_HEIGHT, -ROOM_DEPTH / 2 + 2),
  'roomX+1.html',
  0x4444ff // Blue for next
);

const portals = [portalToRoom0, portalToNextRoom];

// ============================================
// Portal Proximity Check
// ============================================
function checkPortalProximity() {
  portals.forEach(portalData => {
    const distance = camera.position.distanceTo(portalData.portal.position);

    if (distance < 2.5) {
      // Show instruction
      const overlay = document.getElementById('controls-description');
      overlay.textContent = `Approaching portal to ${portalData.target}`;
      overlay.style.display = 'block';

      if (distance < 1.5) {
        // Navigate
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        setTimeout(() => {
          window.location.href = portalData.target;
        }, 500);
      }
    }
  });
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

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

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

    // Check portals
    checkPortalProximity();
  }

  // Animate portals
  portals.forEach(p => {
    p.portal.rotation.z += 0.01;
    p.glow.rotation.z -= 0.01;
  });

  renderer.render(scene, camera);
}

// ============================================
// Initialize
// ============================================
setupLighting();
createRoomStructure();
setupNFTDisplay();

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
```

#### Step 3: Register in Build Configuration

Edit [vite.config.js](../vite.config.js):

```javascript
export default {
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        room0: 'room0.html',
        room1: 'room1.html',
        // ... existing rooms ...
        roomX: 'roomX.html',  // ← Add your room here
      }
    }
  }
};
```

#### Step 4: Update Navigation Menu

Edit [nav.js](../nav.js) to add your room to the dropdown:

```javascript
<a href="roomX.html">Room X (Your Name)</a>
```

#### Step 5: Connect to Existing Room (Optional)

To add a portal from an existing room to your new room:

Edit the source room's `.js` file (e.g., `room0.js`):

```javascript
// In room0.js, add a new door:
const doors = [
  // ... existing doors ...
  {
    x: <position>,
    z: <position>,
    y: 2.75,
    rotation: Math.PI,
    destination: 'roomX.html',
    name: 'Your Room Name'
  }
];
```

OR add a portal in another room:

```javascript
// In any room.js file:
const portalToRoomX = createPortal(
  new THREE.Vector3(x, y, z),
  'roomX.html',
  0x4444ff // color
);
```

#### Step 6: Test

```bash
npm run dev
# Navigate to http://localhost:5173/roomX.html
# Or navigate from connected room via portal
```

---

### Option B: React/TypeScript Room (Future Direction)

To create a React-based room (following Rooms 10-12 pattern):

1. Create folder: `rooms/X/`
2. Create component: `rooms/X/RoomXScene.tsx`
3. Create HTML entry: `roomX.html` that mounts React
4. Configure Vite to build React + Three.js

**Note**: Current architecture is vanilla JS. React integration requires additional setup.

---

## How to Register a New Portal

### Portal Creation Pattern

```javascript
function createPortal(position, targetDestination, color, label) {
  // Main portal circle
  const portal = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
  );
  portal.position.copy(position);

  // Outer glow
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.8, 32),
    new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
  );
  glow.position.copy(position);

  // Optional: Add floating label
  if (label) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'Bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, 128, 40);

    const labelTexture = new THREE.CanvasTexture(canvas);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 1),
      new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true })
    );
    labelMesh.position.copy(position);
    labelMesh.position.y += 2;
    scene.add(labelMesh);
  }

  scene.add(portal, glow);

  return {
    portal,
    glow,
    target: targetDestination,
    position: position
  };
}

// Usage:
const myPortal = createPortal(
  new THREE.Vector3(0, 2, -20),
  'room5.html',
  0x8844ff, // Purple
  'To Eternal Eclipse'
);
```

### Portal Color Conventions (Recommended)

| Color | Hex | Use Case |
|-------|-----|----------|
| Blue | 0x4444ff | Forward progression (next room) |
| Teal | 0x00ffff / 0x44ffff | Return to hub (Room 0) |
| Purple | 0x8844ff | Special connections, branches |
| Green | 0x44ff44 | Alternative paths |
| Orange | 0xff8844 | Backwards (previous room) |

---

## How to Add NFTs/Images to a Room

### Method 1: Use Main NFT Collection (nft1.png - nft142.png)

```javascript
// Define your range
const NFT_START = 50;   // Start at NFT 50
const NFT_COUNT = 20;   // Display 20 NFTs (50-69)

for (let i = 0; i < NFT_COUNT; i++) {
  const nftIndex = NFT_START + i;
  const imageUrl = `/assets/nft${nftIndex}.png`;

  // Create frame and load texture
  createNFTFrame(nftIndex, position, rotation);
}
```

### Method 2: Use Room-Specific Assets

```javascript
// Create a folder: /public/assets/RoomX/

// Load from that folder:
const roomAssets = ['image1.png', 'image2.png', 'image3.png'];

roomAssets.forEach((filename, index) => {
  const imageUrl = `/assets/RoomX/${filename}`;
  textureLoader.load(imageUrl, (texture) => {
    // Create mesh with texture
  });
});
```

### Method 3: Load from JSON Configuration

```javascript
// Create nft-metadata.json:
{
  "room_x_nfts": [
    {
      "id": 1,
      "path": "/assets/nft50.png",
      "title": "Cosmic Dawn",
      "artist": "Artist Name"
    }
  ]
}

// In your room.js:
fetch('/nft-metadata.json')
  .then(res => res.json())
  .then(data => {
    data.room_x_nfts.forEach(nft => {
      createNFTFrame(nft.id, position, rotation, nft.path);
    });
  });
```

---

## Extension Points for Future Features

### 1. Mini Games Integration

**Where to Add**: Best integrated into individual room files

**Example: Simple Click Game**

```javascript
// In roomX.js

let score = 0;
let gameActive = false;

function startMiniGame() {
  gameActive = true;
  score = 0;

  // Create game UI
  const gameUI = document.createElement('div');
  gameUI.id = 'minigame-ui';
  gameUI.innerHTML = `
    <div style="position: fixed; top: 20px; left: 20px; color: white; font-size: 24px;">
      Score: <span id="score">0</span>
    </div>
  `;
  document.body.appendChild(gameUI);

  // Create clickable targets in 3D scene
  createGameTargets();
}

function createGameTargets() {
  for (let i = 0; i < 5; i++) {
    const target = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    target.position.set(
      Math.random() * 20 - 10,
      Math.random() * 5 + 1,
      Math.random() * 20 - 10
    );
    target.userData.isGameTarget = true;
    scene.add(target);
  }
}

// In click handler:
window.addEventListener('click', (event) => {
  if (!gameActive) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    if (hit.userData.isGameTarget) {
      score++;
      document.getElementById('score').textContent = score;
      scene.remove(hit); // Remove hit target
    }
  }
});

// Trigger game start via portal or special object interaction
```

**Suggested Integration Points**:
- Room 8 (currently empty) - Perfect for mini game room
- Room 9 (tunnel) - Could have targets along corridor
- Special "arcade room" branch from Room 0

---

### 2. NFT Paywalls / Access Control

**Where to Add**: Portal proximity check or room entry

**Example: NFT Ownership Check**

```javascript
// At room entry or portal proximity:

async function checkNFTOwnership(walletAddress, requiredNFT) {
  // Example using a blockchain API (pseudocode)
  const response = await fetch(`https://api.nft-service.com/check?wallet=${walletAddress}&nft=${requiredNFT}`);
  const data = await response.json();
  return data.owns;
}

// In portal proximity check:
async function checkPortalProximity() {
  const distance = camera.position.distanceTo(portal.position);

  if (distance < 2.5) {
    // Check if portal requires NFT
    if (portal.requiresNFT) {
      const walletAddress = getUserWalletAddress(); // Get from Web3 wallet
      const hasAccess = await checkNFTOwnership(walletAddress, portal.requiresNFT);

      if (!hasAccess) {
        // Block access, show message
        showMessage('You need NFT #' + portal.requiresNFT + ' to enter this room');
        return;
      }
    }

    // Grant access
    if (distance < 1.5) {
      navigateToRoom(portal.target);
    }
  }
}

// Portal with NFT requirement:
const lockedPortal = {
  portal: portalMesh,
  target: 'secretRoom.html',
  requiresNFT: 'special-key-001',  // NFT ID/hash
  color: 0xffff00  // Gold color for locked
};
```

**Integration Suggestions**:
- Add Web3 wallet connection button in UI
- Create "VIP Room" accessible only to NFT holders
- Special content behind NFT gates
- Could use existing Room D slot for VIP content

---

### 3. Riddles / Puzzles

**Where to Add**: Special interactive objects in rooms

**Example: Code Lock Puzzle**

```javascript
// Create puzzle object in room
function createCodeLockPuzzle() {
  // Visual representation
  const lockBox = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  lockBox.position.set(5, 1, -20);
  lockBox.userData.isPuzzle = true;
  lockBox.userData.puzzleType = 'codeLock';
  scene.add(lockBox);

  // Add label
  createTextLabel('Enter Code', lockBox.position);
}

// Click interaction
window.addEventListener('click', (event) => {
  const raycaster = new THREE.Raycaster();
  // ... raycasting setup ...

  const intersects = raycaster.intersectObjects(scene.children);
  if (intersects.length > 0) {
    const object = intersects[0].object;

    if (object.userData.isPuzzle && object.userData.puzzleType === 'codeLock') {
      showCodeLockUI();
    }
  }
});

function showCodeLockUI() {
  // Create UI overlay
  const puzzleUI = document.createElement('div');
  puzzleUI.innerHTML = `
    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.9); padding: 40px; color: white;">
      <h2>Enter 4-Digit Code</h2>
      <input type="text" id="code-input" maxlength="4" style="font-size: 24px; padding: 10px;">
      <button onclick="submitCode()">Submit</button>
      <button onclick="closePuzzle()">Cancel</button>
    </div>
  `;
  document.body.appendChild(puzzleUI);
  controls.unlock(); // Unlock camera to interact with UI
}

function submitCode() {
  const code = document.getElementById('code-input').value;
  const correctCode = '1337';

  if (code === correctCode) {
    alert('Correct! Portal activated.');
    // Reveal hidden portal or unlock door
    createHiddenPortal();
    closePuzzle();
  } else {
    alert('Incorrect code. Try again.');
  }
}

// Example riddle:
// "The sum of the first four prime numbers" → Answer: 2+3+5+7 = 17
```

**Puzzle Integration Ideas**:
- Room 7 (starry): Constellation puzzle
- Room 8 (frames): Pattern matching puzzle
- Room 0: Riddle to unlock Room D
- Hidden room accessible only via puzzle solution

---

### 4. Dynamic NFT Loading from API

**Where to Add**: Room initialization

**Example: Load NFTs from OpenSea API**

```javascript
async function loadNFTsFromAPI() {
  const contractAddress = '0x...'; // Your NFT contract
  const apiUrl = `https://api.opensea.io/api/v1/assets?asset_contract_address=${contractAddress}&limit=20`;

  const response = await fetch(apiUrl, {
    headers: {
      'X-API-KEY': 'your-api-key'
    }
  });

  const data = await response.json();

  data.assets.forEach((nft, index) => {
    const position = calculateNFTPosition(index);
    loadNFTFromURL(nft.image_url, position, nft.name, nft.token_id);
  });
}

function loadNFTFromURL(imageUrl, position, title, tokenId) {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(imageUrl, (texture) => {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    plane.position.copy(position);
    plane.userData = {
      isNFT: true,
      title: title,
      tokenId: tokenId,
      imageUrl: imageUrl
    };
    scene.add(plane);
  });
}

// Call at room init:
loadNFTsFromAPI();
```

---

### 5. Audio/Music System

**Where to Add**: Global or per-room

**Example: Background Music with Spatial Audio**

```javascript
// Create audio listener (once per scene)
const listener = new THREE.AudioListener();
camera.add(listener);

// Create background music
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

audioLoader.load('/assets/music/room-ambient.mp3', (buffer) => {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(0.5);
  sound.play();
});

// Create positional audio (e.g., from NFT frame)
const positionalSound = new THREE.PositionalAudio(listener);
audioLoader.load('/assets/sounds/nft-description.mp3', (buffer) => {
  positionalSound.setBuffer(buffer);
  positionalSound.setRefDistance(5); // Audible within 5 units
  nftFrame.add(positionalSound); // Attach to 3D object
});
```

**Room-Specific Music**:
- Room 0: Ocean waves
- Room A: Underwater ambiance (already has audio player)
- Room B: Gallery music (implemented as Audio element)
- Room 5: Eerie eclipse sounds

---

### 6. Multiplayer / Social Features

**Where to Add**: Requires server-side infrastructure

**Basic Approach**:

1. **Setup WebSocket Server** (Node.js + Socket.io):

```javascript
// server.js
const io = require('socket.io')(3000);

const users = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('position', (data) => {
    users[socket.id] = data;
    socket.broadcast.emit('users', users);
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
  });
});
```

2. **Client Integration** (in room.js):

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Send position updates
setInterval(() => {
  socket.emit('position', {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z
  });
}, 100); // 10 times per second

// Receive other users
socket.on('users', (users) => {
  Object.keys(users).forEach(id => {
    if (id !== socket.id) {
      updateOtherUser(id, users[id]);
    }
  });
});

function updateOtherUser(id, position) {
  // Create or update avatar mesh for other user
  if (!avatars[id]) {
    const avatar = new THREE.Mesh(
      new THREE.SphereGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    avatars[id] = avatar;
    scene.add(avatar);
  }

  avatars[id].position.set(position.x, position.y, position.z);
}
```

---

## Best Practices & Patterns

### 1. Asset Loading

**DO**:
```javascript
// Use try-catch or error callbacks
textureLoader.load(
  url,
  (texture) => { /* success */ },
  undefined,
  (error) => console.error('Failed:', error)
);

// Preload critical assets before hiding loading screen
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
  hideLoadingOverlay();
};
```

**DON'T**:
```javascript
// Don't assume assets exist
const texture = textureLoader.load(url); // No error handling

// Don't hide loading before assets load
setTimeout(() => hideLoading(), 1000); // May not be ready
```

### 2. Performance Optimization

**DO**:
```javascript
// Reuse geometries
const frameGeometry = new THREE.BoxGeometry(2, 3, 0.2);
for (let i = 0; i < 100; i++) {
  const mesh = new THREE.Mesh(frameGeometry, material); // Reuse geometry
}

// Use object pooling for dynamic objects
// Dispose of unused resources
texture.dispose();
geometry.dispose();
material.dispose();
```

**DON'T**:
```javascript
// Don't create new geometry for every instance
for (let i = 0; i < 100; i++) {
  const geometry = new THREE.BoxGeometry(2, 3, 0.2); // Wasteful
  const mesh = new THREE.Mesh(geometry, material);
}
```

### 3. Code Organization

**DO**:
```javascript
// Separate concerns into functions
function setupLighting() { /* ... */ }
function createRoomStructure() { /* ... */ }
function setupNFTDisplay() { /* ... */ }
function createPortals() { /* ... */ }

// Initialize in order
setupLighting();
createRoomStructure();
setupNFTDisplay();
createPortals();
animate();
```

**DON'T**:
```javascript
// Don't put everything in one giant function or global scope
// Avoid deeply nested code
```

### 4. Consistent Naming

**DO**:
```javascript
// Use clear, descriptive names
const ROOM_WIDTH = 50;
const NFT_START_INDEX = 1;
function createPortalToRoom0() { /* ... */ }
```

**DON'T**:
```javascript
// Avoid cryptic abbreviations
const rw = 50;
const nsi = 1;
function cprt0() { /* ... */ }
```

---

## Common Gotchas

### 1. Asset Paths in Dev vs. Production

**Problem**: `/assets/file.png` works in dev but not in production

**Solution**: Use `/assets/` (Vite serves from `/public/` as root)

### 2. PointerLock Not Working on Some Browsers

**Problem**: PointerLock requires user gesture

**Solution**: Only call `controls.lock()` in click handler, not on page load

### 3. Loading Overlay Stuck

**Problem**: Assets fail to load, overlay never hides

**Solution**: Always add safety timeout:
```javascript
setTimeout(() => {
  loadingOverlay.style.display = 'none';
}, 10000); // 10 second max
```

### 4. Portals Trigger Accidentally

**Problem**: User walks near portal and teleports by accident

**Solution**: Add timer or require keypress:
```javascript
let portalTimer = 0;
if (distance < threshold) {
  portalTimer += delta;
  if (portalTimer > 1.0) { // Require 1 second proximity
    navigate();
  }
} else {
  portalTimer = 0;
}
```

---

## Useful Resources

### Three.js Documentation
- [Three.js Docs](https://threejs.org/docs/)
- [Three.js Examples](https://threejs.org/examples/)
- [Three.js Editor](https://threejs.org/editor/)

### Tutorials
- [Three.js Journey](https://threejs-journey.com/)
- [Discover Three.js](https://discoverthreejs.com/)

### Assets
- [Poly Haven](https://polyhaven.com/) - Free textures, HDRIs
- [Sketchfab](https://sketchfab.com/) - 3D models
- [OpenGameArt](https://opengameart.org/) - Game assets

### NFT APIs
- [OpenSea API](https://docs.opensea.io/reference/api-overview)
- [Alchemy NFT API](https://docs.alchemy.com/reference/nft-api-quickstart)
- [Moralis NFT API](https://docs.moralis.io/web3-data-api/evm/nft-api)

---

## Summary

This document provides:
- ✅ Step-by-step guide to add new rooms
- ✅ Portal creation and registration
- ✅ NFT/image loading methods
- ✅ Extension points for mini games, paywalls, puzzles
- ✅ Best practices and common patterns
- ✅ Performance tips
- ✅ Common gotchas and solutions

For fixing existing issues, see [03-known-issues-and-gaps.md](03-known-issues-and-gaps.md).

For understanding the current architecture, see [00-architecture-overview.md](00-architecture-overview.md).
