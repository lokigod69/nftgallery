# Architecture Overview - NFT Gallery

## Tech Stack Summary

### Core Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Build Tool** | Vite | 6.3.5 | Fast ES module-based bundler |
| **3D Engine** | Three.js | 0.161.0 | WebGL 3D graphics |
| **Language** | Vanilla JavaScript | ES6+ | Main implementation (rooms 0-9, A, B) |
| **Future Framework** | React/TypeScript | - | Scaffolds for rooms 10-12 |
| **Mobile Controls** | nipplejs | 0.10.2 | Virtual joystick |
| **Camera Controls** | PointerLockControls | Three.js | First-person navigation |
| **Deployment** | Vercel | - | Hosting platform |

### Key Libraries & Dependencies

```json
{
  "three": "^0.161.0",
  "nipplejs": "^0.10.2",
  "vite": "^6.3.5"
}
```

**Important Note**: This is **NOT** a React or Next.js application for the main experience. The core gallery (rooms 0-9, A, B) uses vanilla JavaScript with Three.js directly. React/TypeScript scaffolds exist for rooms 10-12 but are not yet integrated.

---

## Project Structure

```
nftgallery/
├── index.html                  # Redirects to room0.html
├── room0.html                  # Ocean entry hub
├── room1.html                  # Main gallery (via main.js)
├── room2.html - room9.html     # Gallery rooms 2-9
├── roomA.html, roomB.html      # Special themed rooms
├── roomA1.html                 # Sub-room for Room A
│
├── room0.js                    # Room 0 scene logic
├── main.js                     # Room 1 scene logic
├── room2.js - room9.js         # Room 2-9 scene logic
├── roomA.js, roomB.js, roomA1.js  # Special room logic
├── nav.js                      # Navigation menu
├── style.css                   # Global styles
│
├── rooms/                      # Future React-based rooms
│   ├── 10/Room10Scene.tsx      # Minimalist cube gallery (React)
│   ├── 11/Room11Scene.tsx      # Gravity-defying cube (React)
│   └── 12/Room12Scene.tsx      # Spherical gallery (React)
│
├── public/assets/              # Primary assets
│   ├── nft1.png - nft142.png   # NFT image library
│   ├── vid*.mp4                # Video displays
│   ├── *.jpg                   # Textures (wood, water, metal, copper)
│   ├── room11/, room12/        # Room-specific assets
│   └── Room7/, RoomB/, RoomC/  # Room-specific assets
│
├── assets/                     # Secondary assets (legacy?)
│   ├── Room8/, RoomC/
│   └── wood_floor*.jpeg
│
├── public/blender/             # 3D models (fish, etc.)
├── build.js                    # Custom build script
├── vite.config.js              # Vite configuration
├── vercel.json                 # Deployment config
└── package.json                # Dependencies
```

---

## Entry Point & Bootstrap Flow

### 1. Initial Load Sequence

```
User navigates to site
    ↓
index.html loads
    ↓
Immediate redirect to room0.html
    ↓
Room 0 (Ocean Entry Hub) initializes
```

### 2. Room Initialization Pattern

Every room follows this bootstrap sequence:

```javascript
// 1. HTML structure loads
<html>
  <head>
    <link rel="stylesheet" href="style.css">
    <script src="nav.js" defer></script>
  </head>
  <body>
    <div class="loading-overlay">
      <div class="loading-content">
        <div class="loading-text">Loading Room...</div>
        <div class="loading-bar-container">
          <div class="loading-bar"></div>
        </div>
      </div>
    </div>
    <script type="module" src="room0.js"></script>
  </body>
</html>

// 2. Room module executes
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// 3. Scene initialization
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// 4. Asset loading (textures, models, videos)
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

// 5. Controls initialization
const controls = new PointerLockControls(camera, document.body);

// 6. Loading overlay management
setTimeout(() => {
    loadingOverlay.style.display = 'none';
}, 1000-3000); // Varies by room

// 7. Animation loop begins
function animate() {
    requestAnimationFrame(animate);
    // Movement, portal checks, rendering
    renderer.render(scene, camera);
}
animate();
```

### 3. Mobile Detection & Controls

```javascript
const isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);

if (isMobile) {
    // Create virtual joysticks using nipplejs
    const moveJoystick = nipplejs.create({ zone: leftJoystickZone });
    const lookJoystick = nipplejs.create({ zone: rightJoystickZone });
} else {
    // Use PointerLock + WASD keyboard controls
    controls = new PointerLockControls(camera, document.body);
}
```

---

## Room Architecture

### Room Definition Pattern

Each room is self-contained with:

1. **HTML file** (`roomX.html`): Minimal structure + script import
2. **JavaScript module** (`roomX.js`): Complete Three.js scene implementation
3. **Assets**: Room-specific textures, models, NFT ranges

### Standard Room Components

Every room typically includes:

```javascript
// Scene elements
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(...);
const renderer = new THREE.WebGLRenderer(...);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, intensity);
const directionalLight = new THREE.DirectionalLight(...);

// Environment
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: floorTexture })
);

// Walls (collision boundaries)
const walls = [
    new THREE.Mesh(/* North wall */),
    new THREE.Mesh(/* South wall */),
    // etc.
];

// NFT frames
function createNFT(index, position, rotation) {
    // Grey frame box + picture plane with texture
}

// Portals (navigation)
function createPortal(targetRoom, position, color) {
    // Glowing circle mesh + proximity detection
}

// Animation loop
function animate() {
    // Handle movement
    // Check portal proximity
    // Render scene
}
```

---

## Navigation & Routing System

### Architecture: Multi-Page Application (MPA)

**Not a Single Page Application** - Navigation uses traditional browser page loads.

### Navigation Mechanism

```javascript
// Portal proximity detection
function checkPortalProximity() {
    const distance = camera.position.distanceTo(portal.position);

    if (distance < THRESHOLD) {  // Typically 1.5-3.0
        // Show loading overlay
        loadingOverlay.style.display = 'flex';

        // Navigate to new page
        setTimeout(() => {
            window.location.href = 'room2.html';
        }, 500);
    }
}
```

### Navigation Methods

1. **Portals** (Primary):
   - Glowing circular meshes in 3D space
   - Proximity-based activation
   - Visual feedback (glow intensifies, instructions appear)
   - Distance threshold typically 1.5-3.0 units

2. **Doors** (Room 0 specific):
   - 3D wooden door models
   - Positioned on floating platform
   - 5 doors leading to different branches

3. **Nav Menu** (Global):
   - Hamburger menu (top-right corner)
   - Direct links to all room HTML files
   - Works from any room

4. **URL Parameters** (Advanced):
   - Some rooms accept spawn point parameters
   - Example: `room3.html?spawn=safe`
   - Allows entry at different positions

### Portal Visual Design

```javascript
// Main portal
const portalGeometry = new THREE.CircleGeometry(1.2, 32);
const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0x4444ff,  // Blue, green, purple, or teal
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
});

// Outer glow ring
const glowGeometry = new THREE.CircleGeometry(1.5, 32);
const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x6666ff,
    transparent: true,
    opacity: 0.3
});

// Animation
portal.rotation.z += 0.01;  // Continuous rotation
```

### Loading Overlay System

```javascript
// CSS-based animated overlay
<div class="loading-overlay">
    <div class="loading-text">Loading Room...</div>
    <div class="loading-bar-container">
        <div class="loading-bar"></div>  <!-- Animated via CSS -->
    </div>
</div>

// Hide after assets load
setTimeout(() => {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 500);
}, 1000-3000);

// Safety timeout to prevent stuck overlays
setTimeout(() => {
    loadingOverlay.style.display = 'none';
}, 10000);
```

---

## NFT & Image Management

### Data Source: Hardcoded File Paths

**No JSON configuration files** - All NFT paths are constructed programmatically:

```javascript
// Standard pattern
const imageUrl = `/assets/nft${index + 1}.png`;

// Example: NFT #1 = /assets/nft1.png
//          NFT #142 = /assets/nft142.png
```

### NFT Asset Library

Location: `/public/assets/`

- `nft1.png` through `nft142.png` (142 total NFT images)
- Video files: `vid1.mp4`, `vid2.mp4`, etc. (17+ videos)
- Textures: `wood.jpg`, `copper.jpg`, `metal.jpg`, `waternormals.jpg`

### NFT Distribution Across Rooms

| Room | NFT Range | Count |
|------|-----------|-------|
| Room 1 | 1-28 | 28 |
| Room 2 | 29-72 | 44 |
| Room 3 | 73-107 | 35 |
| Room 4 | 108-127 | 20 |
| Room 5+ | Various | TBD |
| Room A | Videos | 17 video frames |
| Room B | Videos | TBD |

### NFT Frame Component

```javascript
function createNFT(index, position, rotation) {
    const frameGroup = new THREE.Group();

    // 1. Grey photographic frame
    const frameBox = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 3.0, 0.2),
        new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.7,
            metalness: 0.3
        })
    );

    // 2. Picture plane with NFT texture
    const imageUrl = `/assets/nft${index + 1}.png`;
    textureLoader.load(
        imageUrl,
        (texture) => {
            texture.encoding = THREE.LinearEncoding;
            const picturePlane = new THREE.Mesh(
                new THREE.PlaneGeometry(1.8, 2.7),
                new THREE.MeshBasicMaterial({ map: texture })
            );

            // Store metadata for interactions
            picturePlane.userData = {
                imageUrl: imageUrl,
                index: index,
                isNFT: true,
                opensea: `https://opensea.io/assets/.../${index}`
            };

            frameGroup.add(picturePlane);
            picturePlanes.push(picturePlane);  // For click detection
        },
        undefined,
        (error) => console.error(`Failed to load ${imageUrl}`, error)
    );

    frameGroup.add(frameBox);
    frameGroup.position.set(...position);
    frameGroup.rotation.y = rotation;
    scene.add(frameGroup);
}
```

### NFT Viewer Overlay

Interactive full-screen viewer:

```javascript
// Click detection (raycasting)
window.addEventListener('click', (event) => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(picturePlanes);

    if (intersects.length > 0) {
        const nft = intersects[0].object.userData;
        showNFTViewer(nft.imageUrl, nft.index);
    }
});

// Viewer features
- Full-screen image display
- Left/right arrow navigation
- OpenSea purchase links
- Escape to close
- Touch/click friendly
```

---

## Portal & Transition Logic

### Portal Implementation Details

#### 1. Portal Creation

```javascript
function createPortal(position, targetRoom, color = 0x4444ff) {
    // Main portal mesh
    const portal = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 32),
        new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        })
    );
    portal.position.set(...position);
    portal.rotation.y = Math.PI / 2;

    // Outer glow
    const glow = new THREE.Mesh(
        new THREE.CircleGeometry(1.5, 32),
        new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        })
    );
    glow.position.copy(portal.position);
    glow.rotation.copy(portal.rotation);

    scene.add(portal, glow);

    return {
        portal,
        glow,
        target: targetRoom,
        activated: false,
        timer: 0
    };
}
```

#### 2. Proximity Detection

```javascript
// In animation loop
function checkPortals() {
    portals.forEach(portalData => {
        const distance = camera.position.distanceTo(portalData.portal.position);

        if (distance < 1.5) {
            // Show instruction
            instructionDiv.textContent = `Press W to enter portal to ${portalData.target}`;
            instructionDiv.style.display = 'block';

            // Timer-based activation (prevents accidental teleports)
            portalData.timer += delta;

            if (portalData.timer > 1.0) {  // 1 second proximity
                navigateToRoom(portalData.target);
            }
        } else {
            portalData.timer = 0;
            instructionDiv.style.display = 'none';
        }
    });
}
```

#### 3. Navigation Transition

```javascript
function navigateToRoom(targetRoom) {
    // Prevent double-activation
    if (isNavigating) return;
    isNavigating = true;

    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';

    // Brief delay for visual feedback
    setTimeout(() => {
        window.location.href = targetRoom;
    }, 500);

    // Safety timeout in case navigation fails
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        isNavigating = false;
    }, 5000);
}
```

### Portal Color Coding

| Color | Hex | Purpose |
|-------|-----|---------|
| Blue | 0x4444ff | Standard forward progression |
| Green | 0x44ff44 | Alternative paths |
| Purple | 0x8844ff | Special connections |
| Teal | 0x44ffff | Return to hub (Room 0) |

---

## Movement & Physics

### Desktop Controls (PointerLock)

```javascript
const controls = new PointerLockControls(camera, document.body);

// WASD movement
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveSpeed = 50.0;  // Units per second

// Keyboard state tracking
const keys = { w: false, a: false, s: false, d: false };

// In animation loop
if (controls.isLocked) {
    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.a) - Number(keys.d);
    direction.normalize();

    velocity.x = direction.x * moveSpeed * delta;
    velocity.z = direction.z * moveSpeed * delta;

    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);
}
```

### Mobile Controls (Virtual Joysticks)

```javascript
// Movement joystick (left side)
const moveJoystick = nipplejs.create({
    zone: document.getElementById('left-joystick'),
    mode: 'static',
    position: { left: '20%', bottom: '20%' }
});

moveJoystick.on('move', (evt, data) => {
    const forward = Math.cos(data.angle.radian) * data.force;
    const right = Math.sin(data.angle.radian) * data.force;

    camera.position.z -= forward * moveSpeed * delta;
    camera.position.x += right * moveSpeed * delta;
});

// Look joystick (right side)
const lookJoystick = nipplejs.create({
    zone: document.getElementById('right-joystick'),
    mode: 'static',
    position: { right: '20%', bottom: '20%' }
});

lookJoystick.on('move', (evt, data) => {
    const yaw = Math.sin(data.angle.radian) * data.force * lookSensitivity;
    const pitch = Math.cos(data.angle.radian) * data.force * lookSensitivity;

    camera.rotation.y -= yaw * delta;
    camera.rotation.x += pitch * delta;
});
```

### Jump & Gravity

```javascript
let isJumping = false;
let verticalVelocity = 0;
const GRAVITY = -30.0;
const JUMP_FORCE = 10.0;
const GROUND_LEVEL = 1.6;

// Jump on spacebar
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isJumping) {
        verticalVelocity = JUMP_FORCE;
        isJumping = true;
    }
});

// In animation loop
verticalVelocity += GRAVITY * delta;
camera.position.y += verticalVelocity * delta;

if (camera.position.y <= GROUND_LEVEL) {
    camera.position.y = GROUND_LEVEL;
    verticalVelocity = 0;
    isJumping = false;
}
```

### Collision Detection

```javascript
// Simple boundary walls
const ROOM_BOUNDS = {
    minX: -25, maxX: 25,
    minZ: -25, maxZ: 25
};

// In animation loop
camera.position.x = Math.max(ROOM_BOUNDS.minX, Math.min(ROOM_BOUNDS.maxX, camera.position.x));
camera.position.z = Math.max(ROOM_BOUNDS.minZ, Math.min(ROOM_BOUNDS.maxZ, camera.position.z));
```

---

## Build & Deployment

### Build Configuration

#### Vite Config (`vite.config.js`)

```javascript
export default {
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                room0: 'room0.html',
                room1: 'room1.html',
                // ... all room HTML files
            }
        }
    }
};
```

#### Custom Build Script (`build.js`)

```javascript
// Handles multi-page builds
// Copies assets to dist/
// Processes all HTML entry points
```

### Deployment (Vercel)

```json
// vercel.json
{
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "framework": "vite"
}
```

---

## Future Architecture: React Rooms (10-12)

### Current Status: Scaffolds Only

Rooms 10-12 exist as React/TypeScript scaffolds but are **not yet integrated** into the main navigation flow.

#### Room 10: Minimalist Cube Gallery

[rooms/10/Room10Scene.tsx](rooms/10/Room10Scene.tsx)

```typescript
// Floating cubes with NFT textures
// Grey placeholder images
// Not connected to portal system
```

#### Room 11: Gravity-Defying Cube

[rooms/11/Room11Scene.tsx](rooms/11/Room11Scene.tsx)

```typescript
// Central rotating cube
// Grey placeholder images
// Not connected to portal system
```

#### Room 12: Spherical Gallery

[rooms/12/Room12Scene.tsx](rooms/12/Room12Scene.tsx)

```typescript
// Spherical NFT arrangement
// Grey placeholder images
// Not connected to portal system
```

### Migration Path

To integrate React rooms:

1. Create HTML entry points (room10.html, room11.html, room12.html)
2. Set up React root rendering
3. Add portal connections from existing rooms
4. Replace grey placeholders with actual NFT assets
5. Implement navigation compatibility

---

## Key Design Patterns

### 1. Room Isolation

Each room is **completely independent**:
- Own HTML file
- Own JS module
- Own Three.js scene
- No shared state between rooms
- Page reload resets everything

**Pros**: Simple, no state bugs, easy to develop individual rooms
**Cons**: No state persistence, asset reloading on every transition

### 2. Hardcoded Asset Paths

NFTs use sequential numbering:
```javascript
`/assets/nft${index + 1}.png`
```

**Pros**: Simple, no configuration needed
**Cons**: Hard to reorganize, no metadata, manual index management

### 3. Proximity-Based Navigation

Portals activate on proximity, not click:

**Pros**: Immersive, natural exploration
**Cons**: Can cause accidental teleports, requires careful placement

### 4. Loading Overlay Pattern

Every room manages own loading state:

**Pros**: Visual feedback, hides asset loading pop-in
**Cons**: Duplicated code across rooms, timing can be inconsistent

---

## Summary

This NFT gallery is a **Multi-Page Application (MPA)** built with:

- **Vanilla JavaScript + Three.js** for rooms 0-9, A, B
- **Vite** for modern ES module bundling
- **Direct page navigation** (`window.location.href`) instead of SPA routing
- **Hardcoded NFT asset paths** instead of configuration files
- **Proximity-based portals** for room-to-room travel
- **PointerLock + WASD** for desktop, **nipplejs joysticks** for mobile
- **Self-contained room architecture** with no shared state

Future evolution points toward **React/TypeScript** (rooms 10-12 scaffolds), but current production experience is pure vanilla JS with Three.js.
