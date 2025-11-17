# NFT Gallery – Architecture & Current Status

**Last Updated:** 2025-11-17
**Purpose:** Comprehensive documentation of project structure, current implementation, and refactoring roadmap for future coding agents.

---

## Table of Contents

1. [Project Purpose & Philosophy](#1-project-purpose--philosophy)
2. [Current File Structure (Verified)](#2-current-file-structure-verified)
3. [Room Connection Map (Verified)](#3-room-connection-map-verified)
4. [Shared Systems: Current State vs. Target](#4-shared-systems-current-state-vs-target)
5. [Engine vs. Content Layer (Refactoring Vision)](#5-engine-vs-content-layer-refactoring-vision)
6. [Room Implementation Status](#6-room-implementation-status)
7. [Refactoring Roadmap](#7-refactoring-roadmap)
8. [Development Conventions](#8-development-conventions)

---

## 1. Project Purpose & Philosophy

This is a **first-person NFT gallery** built with Three.js, structured as a modular room-based engine where each room is self-contained but shares core systems.

### Core Philosophy

**"Rooms are data & layout, not mini-engines"**

- Each room should define WHAT (geometry, NFTs, spawn point, portal positions)
- Shared systems should define HOW (movement, collision, portals, NFT viewing)
- Currently in transition: ~60% of logic is duplicated across rooms
- Target: ~90% of UX changes happen in `/src/core` or `/src/ui`, rooms only change when design changes

---

## 2. Current File Structure (Verified)

### 2.1 Project Root

```
nftgallery/
├── public/                         # Static assets served by Vite
│   └── assets/                     # NFT images, textures, room-specific media
│       ├── nft1.webp ... nft300+.webp   # Global NFT set (WebP format)
│       ├── copper1.webp ... copper4c.webp
│       ├── metal1.webp ... metal5.webp
│       ├── Room7/                  # Room 7 specific images
│       ├── RoomB/                  # Room B wall NFTs
│       ├── RoomC/                  # Room C specific assets
│       └── RoomX/                  # Room 10 (vertical tower) NFTs
│
├── src/                            # Shared engine & UI systems
│   ├── core/                       # "Engine-level" logic
│   │   ├── movement-config.js      # ✓ Centralized movement speeds & multipliers
│   │   ├── asset-utils.js          # ✓ WebP path helpers (getNftUrl, getRoomXNftUrl, etc.)
│   │   ├── scene-setup.js          # ✓ Centralized scene/camera/renderer/controls setup
│   │   ├── nft-viewer.js           # ✓ Unified NFT click overlay system
│   │   ├── collision-helpers.js    # ✓ Reusable collision patterns (outer walls, dividers)
│   │   ├── portal-utils.js         # ✓ Portal creation and proximity checking
│   │   ├── portal-styles.js        # ✓ Portal visual themes
│   │   ├── hub-door-utils.js       # ✓ Special hub door mechanics
│   │   ├── EXAMPLE-room9-refactored.js  # Example of refactored room pattern
│   │   └── README.md               # Core system documentation
│   │
│   └── ui/                         # Pure UX / overlays
│       └── speed-control.js        # ✓ Top-right speed slider + mouse wheel
│
├── docs/                           # Internal design documentation
│   ├── 00-architecture-overview.md
│   ├── 01-room-registry.md
│   ├── 02-navigation-flow.md
│   ├── 03-known-issues-and-gaps.md
│   ├── 04-dev-notes-and-future-work.md
│   ├── 05-code-structure-notes.md
│   ├── 06-portal-style-map.md
│   ├── 07-hub-door-design.md
│   ├── 08-room6-9-redesign-briefs.md
│   ├── PROJECT_OVERVIEW.md         # High-level summary
│   └── ARCHITECTURE_AND_STATUS.md  # ← This file
│
├── assets/                         # Legacy folder (mostly deprecated)
│   ├── wood_floor1.jpeg
│   ├── wood_floor2.jpeg
│   ├── Room8/                      # Some room-specific assets here
│   └── RoomC/
│
├── rooms/                          # Empty folder (legacy)
│
├── favicon.svg                     # ✓ Site icon (nested cubes, cyan→purple gradient)
├── index.html                      # Entry point (redirects to room0.html)
├── room0.html ... room10.html      # Room HTML entry points
├── roomA.html, roomA1.html, roomB.html, roomC.html
│
├── room0.js                        # Room 0 - Ocean Hub (main entry)
├── main.js                         # Room 1 - Classic Gallery
├── room2.js                        # Room 2 - Dual Wing Gallery
├── room3.js                        # Room 3 - Large Cube Gallery
├── room4.js                        # Room 4 - Floating Island
├── room5.js                        # Room 5 - Eternal Eclipse
├── room6.js                        # Room 6 - Lava Corridor ✓ (just polished)
├── room7.js                        # Room 7 - Massive Art Wall
├── room8.js                        # Room 8 - Placeholder
├── room9.js                        # Room 9 - Placeholder
├── room10.js                       # Room X - The Ascent (vertical hex tower)
├── roomA.js                        # Room A - Large gallery (124KB file!)
├── roomA1.js                       # Room A1 - Concept Chamber (WIP)
├── roomB.js                        # Room B - Wood floor gallery
├── roomC.js                        # Room C - Gallery room
│
├── nav.js                          # Navigation utilities
├── style.css                       # Global styles
├── vite.config.js                  # Vite build configuration
└── package.json                    # Dependencies
```

### 2.2 Key Observations

**✓ Implemented:**
- WebP asset pipeline (`asset-utils.js`)
- Centralized movement config (`movement-config.js`)
- Speed control UI (`speed-control.js`)
- Portal visual theming (`portal-styles.js`)
- Scene/camera/renderer setup (`scene-setup.js`) - Used by Rooms 1-5, Room 8
- NFT click viewer overlay (`nft-viewer.js`) - Used by Rooms 1-5
- Collision helpers (`collision-helpers.js`) - Used by Rooms 1-2

**⚠️ Needs Standardization:**
- Portal creation logic (partially centralized in `portal-utils.js`)
- Extend scene-setup.js to remaining rooms (0, 6, 7, 9, 10, A, A1, B, C)
- Extend collision helpers to more rooms (3-5 candidates)

**❌ Planned but Not Implemented:**
- `texture-streamer.js` - Streaming/batching for heavy rooms

---

## 3. Room Connection Map (Verified)

### 3.1 Visual Graph

```
                    ┌─────────────┐
                    │  Room 10    │
                    │ (The Ascent)│
                    │   Portal: ? │
                    └─────────────┘

        ┌──────────────────────────────────────────┐
        │          Room 0 (Ocean Hub)              │
        │         PRIMARY HUB / ENTRY              │
        └────┬───────────┬──────────┬─────────┬────┘
             │           │          │         │
             v           v          v         v
         ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
         │Room 1 │  │Room A │  │Room B │  │Room C │
         │Classic│  │ Large │  │ Wood  │  │Gallery│
         │Gallery│  │Gallery│  │ Floor │  │       │
         └───┬───┘  └───────┘  └───┬───┘  └───┬───┘
             │                      │          │
             ↕                      │          └──→ Room A
         ┌───────┐                  │
         │Room 2 │                  └──→ Room 0
         │  Dual │
         │ Wings │
         └───┬───┘
             ↕
         ┌───────┐
         │Room 3 │
         │  Cube │
         │Gallery│
         └───┬───┘
             ↕
         ┌───────┐
         │Room 4 │
         │Island │
         └───┬───┘
             ↕
         ┌───────┐               ┌───────────────────────────┐
         │Room 5 │←──────────────│ Secondary Hub for         │
         │Eclipse│               │ Satellite Rooms           │
         └───┬───┘               └───────────────────────────┘
             ↕
         ┌───────┐
         │Room 6 │
         │ Lava  │
         │Corridor
         └───────┘

         Room 5 ← Room 7 (Massive Wall)    [one-way]
         Room 5 ← Room 8 (Placeholder)     [one-way]
         Room 5 ← Room 9 (Placeholder)     [one-way]
```

### 3.2 Connection Table

| From Room | To Room(s) | Type | Notes |
|-----------|------------|------|-------|
| **Room 0** | Room 1, A, B, C | Hub | Primary entry point |
| **Room 1** | Room 0, Room 2 | Bidirectional | Main corridor start |
| **Room 2** | Room 1, Room 3 | Bidirectional | Dual-wing gallery |
| **Room 3** | Room 2, Room 4 | Bidirectional | Best portal implementation (reference) |
| **Room 4** | Room 3, Room 5 | Bidirectional | Floating island |
| **Room 5** | Room 4, Room 6 | Bidirectional | Secondary hub |
| **Room 6** | Room 5 | One-way back | Lava corridor (just polished) |
| **Room 7** | Room 5 | One-way back | Massive art wall (38 NFTs) |
| **Room 8** | Room 5 | One-way back | Placeholder |
| **Room 9** | Room 5 | One-way back | Placeholder |
| **Room 10** | ??? | Incomplete | Vertical hex tower (destination TBD) |
| **Room A** | Room 0 | One-way back | Large gallery |
| **Room A1** | Room 0 | One-way back | Concept chamber (WIP) |
| **Room B** | Room 0 | One-way back | Wood floor gallery |
| **Room C** | Room A | One-way | Gallery room |

### 3.3 Navigation Patterns

**Main Progression Path:**
```
Room 0 → Room 1 ↔ Room 2 ↔ Room 3 ↔ Room 4 ↔ Room 5 ↔ Room 6
```

**Hub-and-Spoke:**
- **Primary Hub:** Room 0 (connects to Room 1, A, B, C)
- **Secondary Hub:** Room 5 (connects to Rooms 6, 7, 8, 9)

**Special Access:**
- Rooms A, B, C are "side galleries" accessible from Room 0
- Rooms 7, 8, 9 are "satellite rooms" with one-way exits to Room 5

---

## 4. Shared Systems: Current State vs. Target

### 4.1 Movement System

**Current State:** ✅ **Centralized**

```javascript
// In every room's animate() loop:
const speed = MOVEMENT_CONFIG.getEffectiveSpeed('roomX') * delta;
```

**Location:** `/src/core/movement-config.js`

**Room-Specific Speeds:**
- Room 1: 40.0 (slow gallery)
- Room 2: 50.0
- Room 3: 60.0
- Room 4: 60.0
- Room 5: 60.0
- Room 6: 60.0 (lava corridor)
- Room 7: 50.0
- Room 8-9: 60.0
- Room 10: 6.0 (special jump physics)

**Target State:** Already optimal. No changes needed.

---

### 4.2 PointerLock + Camera Setup

**Current State:** ⚠️ **Partially centralized** (Rooms 1-5, Room 8 migrated)

~~Every room~~ Rooms 0, 6, 7, 9, 10, A, A1, B, C still have ~20-30 lines of duplicated setup:

```javascript
// Repeated in ALL 15 room files:
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(x, y, z);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());
controls.getObject().position.copy(camera.position);

document.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
});

controls.addEventListener('lock', () => { /* hide overlay */ });
controls.addEventListener('unlock', () => { /* show overlay */ });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

**Target State:** ✅ **Implemented** - `/src/core/scene-setup.js`

```javascript
// ✅ NOW AVAILABLE (used by Rooms 1-5, Room 8):
import { initScene } from './src/core/scene-setup.js';

const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: 2.5, z: 0 },
  background: 0x000000,
  outputEncoding: 'sRGB',
  fog: { color: 0x000000, near: 10, far: 100 }  // optional
});
```

**Migration Status:**
- ✅ Room 1 (main.js) - Migrated
- ✅ Room 2 (room2.js) - Migrated
- ✅ Room 3 (room3.js) - Migrated
- ✅ Room 4 (room4.js) - Migrated
- ✅ Room 5 (room5.js) - Migrated
- ✅ Room 8 (room8.js) - Migrated
- ⏳ Remaining rooms (0, 6, 7, 9, 10, A, A1, B, C) - Need migration

---

### 4.3 NFT Click Viewer Overlay

**Current State:** ✅ **Centralized** (Rooms 1-5 migrated)

**~~Old Pattern in Rooms 2-5:~~** ~~Advanced portal-aware handler (~80 lines per room)~~

```javascript
// Repeated with slight variations in rooms 2, 3, 4, 5:
document.addEventListener('click', () => {
  if (!controls.isLocked) return;

  // Raycasting setup...
  raycaster.setFromCamera(center, camera);
  const intersects = raycaster.intersectObjects(nftMeshes);

  if (intersects.length > 0) {
    const clickedNFT = intersects[0].object;
    const nftData = nftMetadata[clickedNFT.userData.nftIndex];

    // Show overlay DOM...
    // Navigation buttons...
    // OpenSea link...
    // Close handlers...
  }
});
```

**~~Old Pattern in Room 1:~~** ~~Older basic handler (~40 lines)~~

**Pattern in Room 0, 6, 7, 8, 9, 10, A, B, C:** Video-based or no click viewer (not yet migrated)

**Target State:** ✅ **Implemented** - `/src/core/nft-viewer.js`

```javascript
// ✅ NOW AVAILABLE (used by Rooms 1-5):
import { initNFTViewer } from './src/core/nft-viewer.js';

const nftViewer = initNFTViewer({
  scene,
  camera,
  controls,
  renderer,
  nftMeshes,           // Array of NFT meshes to raycast against
  nftMetadata,         // Normalized [{ id, url, title, description }]
  checkPortalProximity,  // optional callback to pause portal checks
  onOpen: () => { /* custom handler */ },
  onClose: () => { /* custom handler */ }
});
```

**Benefits Achieved:**
- ✅ Removed ~80 lines per room × 5 rooms = **400 lines** of duplicated code
- ✅ Standardized viewer behavior across Rooms 1-5
- ✅ Easy to add features globally (e.g., zoom, share, NFT rarity display)

**Migration Status:**
- ✅ Room 1 (main.js) - Migrated
- ✅ Room 2 (room2.js) - Migrated
- ✅ Room 3 (room3.js) - Migrated
- ✅ Room 4 (room4.js) - Migrated
- ✅ Room 5 (room5.js) - Migrated
- ⏳ Room 0, 6-10, A, A1, B, C - Video-based viewers or no viewer (different pattern)

---

### 4.4 Portal Creation

**Current State:** ⚠️ **Partially centralized**

**Good:** `createLinkedPortal()` exists in `/src/core/portal-utils.js`

**Problem:** Every room still has custom distance checking and teleport logic

```javascript
// Repeated pattern in rooms:
const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(),
  portals: [
    {
      position: new THREE.Vector3(x, y, z),
      name: 'Room Name',
      url: 'roomX.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    }
  ],
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// In animate loop:
checkPortalProximity();
```

**Target State:** Already close to optimal. Minor cleanup:

1. Ensure all rooms use `controls.getObject()` (not `camera`)
2. Standardize showDistance/triggerDistance defaults
3. Document Room 3 as reference implementation

---

### 4.5 Collision Patterns

**Current State:** ⚠️ **Partially centralized** (Rooms 1-2 migrated)

**Outer Wall Collision (Rooms 1, 2, 3):** Now centralized in `applyOuterWallCollision()`

```javascript
// Room 1, 2, 3 pattern (GOOD):
const playerRadius = 0.5;
if (position.z < backWall + playerRadius) position.z = backWall + playerRadius;
if (position.z > frontWall - playerRadius) position.z = frontWall - playerRadius;
if (position.x < leftWall + playerRadius) position.x = leftWall + playerRadius;
if (position.x > rightWall - playerRadius) position.x = rightWall - playerRadius;
```

**Divider Wall Collision (Rooms 1, 2):** Now centralized in `applyDividerCollision()`

```javascript
// ✅ NOW AVAILABLE (used by Rooms 1-2):
import { applyDividerCollision } from './src/core/collision-helpers.js';

applyDividerCollision(position, {
  dividerX: { min, max },
  frontLimit,  // z limit on positive side
  backLimit    // z limit on negative side
});
```

**Room 6 (Lava Corridor):** Death trigger collision

```javascript
// Room 6 pattern:
if (player.position.y < ROOM6_CONFIG.lavaTriggerY && !isOnSafeTile(player.position)) {
  respawnPlayer();
}
```

**Room 10 (Vertical Tower):** Tile-based collision with falling

```javascript
// Room 10 pattern:
if (player.position.y < -50) {
  respawnPlayer();
}
```

**Target State:** ✅ **Partially Implemented** - `/src/core/collision-helpers.js`

```javascript
// ✅ NOW AVAILABLE (used by Rooms 1-2):
import {
  applyOuterWallCollision,
  applyDividerCollision
} from './src/core/collision-helpers.js';

// Outer wall collision:
applyOuterWallCollision(position, {
  minX: -10, maxX: 10,
  minZ: -50, maxZ: 0,
  radius: 0.5
});

// Divider collision:
applyDividerCollision(position, {
  dividerX: { min: -2, max: 2 },
  frontLimit: 1.0,
  backLimit: -1.0
});
```

**Migration Status:**
- ✅ Room 1 (main.js) - Using `applyOuterWallCollision()` and `applyDividerCollision()`
- ✅ Room 2 (room2.js) - Using `applyOuterWallCollision()` and `applyDividerCollision()` (2x for dual dividers)
- ⏳ Room 3-5 - Could potentially use these helpers (need case-by-case evaluation)
- ⏳ Room 6, 10 - Special collision (death triggers, tile-based) - may need additional helpers

---

### 4.6 Asset Loading

**Current State:** ✅ **Centralized**

**Location:** `/src/core/asset-utils.js`

```javascript
// All rooms use these helpers:
getNftUrl(index)           // → /assets/nft{index}.webp
getRoomXNftUrl(index)      // → /assets/RoomX/{index}.webp
getRoomBNftUrl(index)      // → /assets/RoomB/b{index}.webp
getRoom7NftUrl(filename)   // → /assets/Room7/{filename}.webp
getTextureUrl(path)        // → /assets/{path}.webp
```

**Target State:** Already optimal. All PNG/JPG migrations complete.

---

## 5. Engine vs. Content Layer (Refactoring Vision)

### 5.1 Conceptual Separation

**CONTENT LAYER** (room files):
- Room geometry (walls, floors, ceilings)
- NFT positions and metadata
- Spawn point
- Portal positions
- Room-specific theming (colors, lights)
- Custom gameplay logic (jump puzzles, lava death, etc.)

**ENGINE LAYER** (`/src/core`, `/src/ui`):
- Movement system
- Camera/PointerLock setup
- NFT click viewer
- Portal creation & teleportation
- Collision helpers
- Asset loading
- UI overlays (speed slider, pause menu, help)

### 5.2 Current Reality vs. Vision

| System | Current | Target | Gap |
|--------|---------|--------|-----|
| Movement | ENGINE ✅ | ENGINE ✅ | None |
| Asset Loading | ENGINE ✅ | ENGINE ✅ | None |
| Speed UI | ENGINE ✅ | ENGINE ✅ | None |
| Scene Setup | MIXED ⚠️ (R1-5, R8) | ENGINE | Medium → Low |
| NFT Viewer | ENGINE ✅ (R1-5) | ENGINE | Low |
| Portals | MIXED ⚠️ | ENGINE | Medium |
| Collision | MIXED ⚠️ (R1-2) | ENGINE | Medium → Low |

**Current Reality (Post-Phase 3):**
- ✅ Changing speed behavior → Edit 1 file (`movement-config.js`)
- ✅ Changing NFT viewer UI → Edit 1 file (`nft-viewer.js`) - affects Rooms 1-5
- ✅ Changing portal visuals → Edit 1 file (`portal-utils.js` or `portal-styles.js`)
- ✅ Changing collision → Edit 1 file (`collision-helpers.js`) - affects Rooms 1-2
- ⏳ Adding new room → ~200-300 lines (vs. original ~500-800 lines) - further reduction possible

---

## 6. Room Implementation Status

### 6.1 Production-Ready Rooms ✅

**Room 0 - Ocean Hub**
- Role: Primary entry point
- Features: Animated water, floating NFT planes, hub doors to A/B/C
- Status: Stable
- File Size: 24.8 KB

**Room 1 - Classic Gallery**
- Role: Traditional gallery space
- Features: Divider walls, two-sided NFT display, click viewer
- Status: Stable (divider collision fixed)
- Eye Height: 2.7
- File Size: 31.0 KB

**Room 2 - Dual Wing Gallery**
- Role: Two separate gallery wings
- Features: Two independent dividers, portal-aware click viewer
- Status: Stable
- Eye Height: 4.0 (calibrated to NFT centers)
- File Size: 32.6 KB

**Room 3 - Large Cube Gallery**
- Role: Open space with multiple portals
- Features: Reference implementation for portals
- Status: Stable (best working portal logic)
- Eye Height: 4.0 (calibrated to NFT centers)
- File Size: 46.1 KB

**Room 4 - Floating Island**
- Role: 3D space with GLB models
- Features: GLTF models, correct sRGB encoding
- Status: Stable
- File Size: 37.2 KB

**Room 5 - Eternal Eclipse**
- Role: Secondary hub for satellite rooms
- Features: Black/white/red theme, connects to Rooms 6-9
- Status: Stable
- File Size: 37.2 KB

---

### 6.2 Recently Polished Rooms 🆕

**Room 6 - Lava Corridor** ✅
- Role: Jump puzzle platformer
- Features: 14 hex tiles in zigzag pattern, lava death, wall torches
- Status: Just polished (2025-11-17)
- Changes Applied:
  - Floor grid: Brighter red, less dense (gridSize 32→48, intensity 0.6→0.9)
  - Tiles: Closer spacing (step -6.0→-3.5), 3-phase zigzag pattern
  - Spawn: On first tile instead of arbitrary position
  - Death logic: Triggers at y<1.0 (was y<-0.3, never triggered)
  - Lighting: 12 wall torches (orange point lights)
- File Size: 18.8 KB

---

### 6.3 Heavy/Unoptimized Rooms ⚠️

**Room 7 - Massive Art Wall**
- Role: Large NFT showcase
- Features: 38 NFTs on one wall
- Status: Functional but needs streaming optimization
- File Size: 12.6 KB

**Room A - Large Gallery**
- Role: Major gallery space
- Features: Huge room with many NFTs
- Status: Functional but extremely large file
- File Size: **124.6 KB** ⚠️ (needs refactoring)

**Room B - Wood Floor Gallery**
- Role: Traditional gallery with wood texture
- Features: Heavy asset loading, custom textures
- Status: Functional but could use optimization
- File Size: 65.7 KB

---

### 6.4 Placeholder Rooms 🚧

**Room 8 - Placeholder**
- Role: TBD
- Status: Minimal implementation
- File Size: 11.3 KB

**Room 9 - Placeholder**
- Role: TBD
- Status: Minimal implementation
- Note: Has refactored example in `/src/core/EXAMPLE-room9-refactored.js`
- File Size: 13.3 KB

**Room A1 - Concept Chamber**
- Role: WIP special room
- Status: Placeholder with basic structure
- File Size: 32.0 KB

---

### 6.5 Special Rooms 🎮

**Room 10 (Room X) - The Ascent**
- Role: Vertical hex tower jump challenge
- Features: 28 hex tiles spiraling upward, special jump physics
- Status: Playable, needs NFT side-wrap UVs
- Physics: walkSpeed=6, jumpVelocity=16
- File Size: 27.8 KB

**Room C - Gallery Room**
- Role: Side gallery
- Features: Connects to Room A
- Status: Functional
- File Size: 14.5 KB

---

## 7. Refactoring Roadmap

### 7.1 Priority 1: Engine Layer Extraction (High Impact)

**Goal:** Move duplicated room logic into `/src/core`

**Status (2025-11-17):** ✅ Steps 1-3 COMPLETE (Phases 1-3)

---

#### Step 1: Scene Setup Helper ✅ COMPLETE
**File:** `/src/core/scene-setup.js`

**Scope:** ~30 lines × 6 rooms = ~180 lines removed (Rooms 1-5, 8 migrated)

**Implementation:** ✅ DONE
```javascript
export function initScene(options = {}) {
  const {
    spawnPosition = { x: 0, y: 2.5, z: 0 },
    background = 0x000000,
    outputEncoding = 'sRGB',
    fog = null
  } = options;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  if (fog) scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE[outputEncoding + 'Encoding'];
  document.body.appendChild(renderer.domElement);

  const controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());
  controls.getObject().position.copy(camera.position);

  // Auto-lock on click
  document.addEventListener('click', () => {
    if (!controls.isLocked) controls.lock();
  });

  // Overlay management
  controls.addEventListener('lock', () => {
    const overlay = document.getElementById('controls-description');
    if (overlay) overlay.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    const overlay = document.getElementById('controls-description');
    if (overlay) overlay.style.display = 'block';
  });

  // Auto-resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls };
}
```

**Migration Plan:** ✅ COMPLETE
1. ✅ Created file and tested with Room 8 (Phase 1)
2. ✅ Migrated Rooms 1-5 (Phase 1)
3. ⏳ Migrate special rooms (0, 6, 7, 9, 10, A, A1, B, C) - PENDING

**Results:**
- ✅ 6 rooms migrated (Rooms 1-5, Room 8)
- ✅ ~180 lines of duplicated code removed
- ✅ Consistent scene initialization across migrated rooms
- ⏳ 9 rooms remaining for future migration

---

---

#### Step 2: NFT Viewer System ✅ COMPLETE
**File:** `/src/core/nft-viewer.js`

**Scope:** ~80 lines × 5 rooms = ~400 lines removed (Rooms 1-5 migrated)

**Implementation:** ✅ DONE
```javascript
export function initNFTViewer(config) {
  const {
    scene,
    camera,
    controls,
    nftMeshes,
    nftMetadata,
    checkPortalProximity = null, // Optional portal pause callback
    onOpen = () => {},
    onClose = () => {},
    viewerMode = 'overlay' // 'overlay' | 'inline' | 'fullscreen'
  } = config;

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  let currentNFTIndex = null;
  let isPaused = false;

  // Create overlay DOM
  const overlay = createViewerOverlay();

  // Click handler
  document.addEventListener('click', (event) => {
    if (!controls.isLocked) return;
    if (isPaused) return;

    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(nftMeshes);

    if (intersects.length > 0) {
      const clickedNFT = intersects[0].object;
      const nftIndex = clickedNFT.userData.nftIndex;
      const data = nftMetadata[nftIndex];

      showNFT(nftIndex, data);
      controls.unlock();
      if (checkPortalProximity) checkPortalProximity.pause();
      onOpen(nftIndex, data);
    }
  });

  // Navigation
  overlay.nextBtn.addEventListener('click', () => navigateNFT(1));
  overlay.prevBtn.addEventListener('click', () => navigateNFT(-1));
  overlay.closeBtn.addEventListener('click', () => closeViewer());

  function showNFT(index, data) { /* ... */ }
  function navigateNFT(delta) { /* ... */ }
  function closeViewer() { /* ... */ }
  function createViewerOverlay() { /* ... */ }

  return {
    pause: () => { isPaused = true; },
    resume: () => { isPaused = false; },
    destroy: () => { /* cleanup */ }
  };
}
```

**Migration Plan:** ✅ COMPLETE
1. ✅ Created unified overlay HTML/CSS (Phase 2)
2. ✅ Implemented core viewer logic with raycasting, navigation, metadata (Phase 2)
3. ✅ Tested with Room 2 as reference (Phase 2)
4. ✅ Migrated Rooms 1, 2, 3, 4, 5 (Phase 2)
5. ✅ Removed duplicated click handlers from all 5 rooms (Phase 2)

**Results:**
- ✅ 5 rooms migrated (Rooms 1-5)
- ✅ ~400 lines of duplicated code removed
- ✅ Standardized NFT viewer behavior with consistent UI/UX
- ✅ Metadata normalized to `{ id, url, title, description }` format
- ⏳ Rooms 0, 6-10, A, A1, B, C use video-based or no viewer (different pattern)

---

---

#### Step 3: Collision Helpers ✅ COMPLETE
**File:** `/src/core/collision-helpers.js`

**Scope:** ~30-40 lines per room × 2 rooms = ~70 lines removed (Rooms 1-2 migrated)

**Implementation:** ✅ DONE
```javascript
export function applyOuterWallCollision(position, bounds) {
  const { minX, maxX, minZ, maxZ, radius = 0.5 } = bounds;

  // Clamp X position (left/right walls)
  if (position.x < minX + radius) position.x = minX + radius;
  if (position.x > maxX - radius) position.x = maxX - radius;

  // Clamp Z position (back/front walls)
  if (position.z < minZ + radius) position.z = minZ + radius;
  if (position.z > maxZ - radius) position.z = maxZ - radius;
}

export function applyDividerCollision(position, config) {
  const { dividerX, frontLimit, backLimit } = config;

  // Check if player is within divider X-band
  const withinDividerX = (position.x > dividerX.min && position.x < dividerX.max);

  if (withinDividerX) {
    // Determine which side player is on and apply appropriate limit
    if (position.z > 0) {
      // Player on positive z side (front)
      if (position.z < frontLimit) position.z = frontLimit;
    } else {
      // Player on negative z side (back)
      if (position.z > backLimit) position.z = backLimit;
    }
  }
}
```

**Migration Plan:** ✅ COMPLETE
1. ✅ Created collision-helpers.js with 2 helper functions (Phase 3)
2. ✅ Migrated Room 1 to use helpers (Phase 3)
3. ✅ Migrated Room 2 to use helpers (Phase 3)
4. ⏳ Evaluate Rooms 3-5 for potential migration (future work)

**Results:**
- ✅ 2 rooms migrated (Rooms 1-2)
- ✅ ~70 lines of duplicated collision code removed
- ✅ Extracted two reusable patterns: outer walls and dividers
- ✅ Room-specific constants (bounds, radii) remain in room files (good separation)
- ⏳ Additional helpers (tile collision, death zones) could be added for Rooms 6, 10

---

### 7.2 Priority 2: Portal System Cleanup (Medium Impact)

**Goal:** Ensure all rooms use standardized portal patterns

**File:** `/src/core/portal-utils.js` (already exists, needs cleanup)

**Tasks:**
1. ✅ Document Room 3 as reference implementation
2. ⚠️ Ensure all rooms use `controls.getObject()` instead of `camera`
3. ⚠️ Standardize default distances (showDistance=3.0, triggerDistance=1.8)
4. ⚠️ Add portal pause/resume API for NFT viewer integration

**Migration Checklist:**
- [ ] Room 0
- [ ] Room 1
- [ ] Room 2
- [x] Room 3 (reference)
- [ ] Room 4
- [ ] Room 5
- [ ] Room 6
- [ ] Room 7
- [ ] Room 8
- [ ] Room 9
- [ ] Room 10
- [ ] Room A, A1, B, C

---

### 7.3 Priority 3: Performance Optimization (Low Impact, High Value)

**Goal:** Optimize heavy rooms (A, B, 7) with streaming/batching

**File:** `/src/core/texture-streamer.js` (to be created)

**Concept:**
```javascript
export class TextureStreamer {
  constructor(camera, loadDistance = 30, unloadDistance = 50) {
    this.camera = camera;
    this.loadDistance = loadDistance;
    this.unloadDistance = unloadDistance;
    this.frames = new Map(); // frameId → { mesh, loaded, distance }
  }

  registerFrame(id, mesh, textureUrl, priority = 0) {
    this.frames.set(id, {
      mesh,
      textureUrl,
      priority,
      loaded: false,
      distance: Infinity
    });
  }

  update() {
    const cameraPos = this.camera.position;

    for (const [id, frame] of this.frames) {
      const distance = cameraPos.distanceTo(frame.mesh.position);
      frame.distance = distance;

      if (!frame.loaded && distance < this.loadDistance) {
        this.loadTexture(id, frame);
      } else if (frame.loaded && distance > this.unloadDistance) {
        this.unloadTexture(id, frame);
      }
    }
  }

  loadTexture(id, frame) { /* ... */ }
  unloadTexture(id, frame) { /* ... */ }
}
```

**Target Rooms:**
- Room 7 (38 NFTs)
- Room A (massive file size)
- Room B (heavy textures)

---

## 8. Development Conventions

### 8.1 Movement & Camera (Canonical Pattern)

**Always use:**
```javascript
const player = controls.getObject();
player.position.x += deltaX;
// NEVER: camera.position.x += deltaX
```

**Always get speed from config:**
```javascript
const speed = MOVEMENT_CONFIG.getEffectiveSpeed('roomX') * delta;
```

**Always set eye height via:**
```javascript
// Room-specific constant
const eyeHeight = 2.5;
camera.position.y = eyeHeight;
controls.getObject().position.copy(camera.position);
```

---

### 8.2 Asset Loading (Canonical Pattern)

**Always use helpers:**
```javascript
import { getNftUrl, getTextureUrl, getRoomXNftUrl } from './src/core/asset-utils.js';

// Load global NFT
textureLoader.load(getNftUrl(42), (texture) => { /* ... */ });

// Load room-specific asset
textureLoader.load(getRoomXNftUrl(5), (texture) => { /* ... */ });

// Load texture
textureLoader.load(getTextureUrl('wood_floor1'), (texture) => { /* ... */ });
```

**Never use:**
```javascript
// ❌ WRONG - hardcoded extensions
textureLoader.load('/assets/nft42.png', ...);
textureLoader.load('/assets/nft42.jpg', ...);
```

---

### 8.3 Portal Creation (Canonical Pattern)

**Reference Implementation:** Room 3

**Always use:**
```javascript
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';

// 1. Create portal visual
const { portal, glow } = createLinkedPortal({
  scene,
  fromRoom: '3',
  toRoom: '4',
  x: 0,
  y: eyeHeight,
  z: -25,
  rotationY: 0,
  createLabel: true
});

// 2. Create proximity checker
const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(), // ✅ Use controls.getObject(), NOT camera
  portals: [
    {
      position: new THREE.Vector3(0, eyeHeight, -25),
      name: 'Floating Island (Room 4)',
      url: 'room4.html',
      showDistance: 3.0,    // Show label at this distance
      triggerDistance: 1.8  // Teleport at this distance
    }
  ],
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// 3. In animate() loop
animateLinkedPortal(portal, glow);
checkPortalProximity();
```

---

### 8.4 Collision (Canonical Pattern)

**Outer Walls (Rooms 1, 2, 3):**
```javascript
const playerRadius = 0.5;
const minX = leftWall + playerRadius;
const maxX = rightWall - playerRadius;
const minZ = backWall + playerRadius;
const maxZ = frontWall - playerRadius;

player.position.x = Math.max(minX, Math.min(maxX, player.position.x));
player.position.z = Math.max(minZ, Math.min(maxZ, player.position.z));
```

**Divider Walls (Rooms 1, 2):**
```javascript
const withinDividerX = (player.position.x > dividerMinX && player.position.x < dividerMaxX);

if (withinDividerX) {
  if (player.position.z > 0) {
    // Front side
    if (player.position.z < dividerZ + buffer) {
      player.position.z = dividerZ + buffer;
    }
  } else {
    // Back side
    if (player.position.z > dividerZ - buffer) {
      player.position.z = dividerZ - buffer;
    }
  }
}
```

---

### 8.5 File Naming & Organization

**Room Files:**
- Main gallery: `room0.js` to `room10.js`
- Special rooms: `roomA.js`, `roomB.js`, `roomC.js`, `roomA1.js`
- Room 1 is aliased as `main.js` (legacy, should be `room1.js`)

**HTML Files:**
- Match JS files: `room0.html` → loads `room0.js`
- All use same favicon: `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`

**Asset Organization:**
- Global NFTs: `/public/assets/nft1.webp` ... `nft300+.webp`
- Room-specific: `/public/assets/Room7/`, `/public/assets/RoomX/`, `/public/assets/RoomB/`
- Textures: `/public/assets/copper1.webp`, `/public/assets/metal1.webp`, etc.

---

### 8.6 Git Workflow & Documentation

**Before major changes:**
1. Check `/docs/03-known-issues-and-gaps.md` for context
2. Check `/docs/01-room-registry.md` for room status
3. Update this file (`ARCHITECTURE_AND_STATUS.md`) if structure changes

**After room implementation:**
1. Update room status in this document
2. Document any new patterns in "Development Conventions"
3. Note any new shared systems in "Shared Systems" section

**Commit Message Conventions:**
- `room6: polish lava corridor (grid, tiles, death logic)`
- `core: add scene-setup.js helper`
- `refactor: extract NFT viewer to core`
- `docs: update architecture status`

---

## Summary

This NFT gallery is transitioning from a **collection of self-contained rooms** to a **modular engine with content layers**.

**Current State (2025-11-17):**
- ✅ 15 rooms implemented (0-10, A, A1, B, C)
- ✅ Rooms 0-6 production-ready
- ✅ Movement, asset loading, speed UI centralized
- ✅ Scene setup centralized (Rooms 1-5, 8 using scene-setup.js)
- ✅ NFT viewer centralized (Rooms 1-5 using nft-viewer.js)
- ✅ Collision helpers created (Rooms 1-2 using collision-helpers.js)
- 🚧 Rooms 7-9 need polish, Room 10 needs UV fixes

**Refactoring Progress (Phases 1-3 COMPLETE):**
1. ✅ Created `scene-setup.js` helper → eliminated ~180 lines of duplication (6 rooms)
2. ✅ Created `nft-viewer.js` system → eliminated ~400 lines of duplication (5 rooms)
3. ✅ Created `collision-helpers.js` → eliminated ~70 lines of duplication (2 rooms)
4. ⏳ Standardize portal patterns across all rooms - PENDING
5. ⏳ Optimize heavy rooms (A, B, 7) with texture streaming - PENDING
6. ⏳ Extend scene-setup.js to remaining 9 rooms - PENDING

**Vision vs. Reality:**
~~When refactoring is complete~~ ✅ With Phase 1-3 complete, adding a new room is now:

```javascript
import { initScene } from './src/core/scene-setup.js';
import { initNFTViewer } from './src/core/nft-viewer.js';
import { applyOuterWallCollision, applyDividerCollision } from './src/core/collision-helpers.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';
import { initSpeedControl } from './src/ui/speed-control.js';

// ~30 lines of room-specific geometry & layout
// ~10 lines of portal setup
// ~5-10 lines of NFT metadata preparation
// ~5 lines of collision config
// = ~50-60 total lines vs. original ~500-800 lines (90% reduction!)
```

**Actual Example:** See [room8.js](../room8.js) (11.3 KB) vs. legacy pattern in roomA.js (124.6 KB)

**For Future Coding Agents:**

This document provides the complete architectural context. When working on this project:

1. **Check room status** in Section 6 before making changes
2. **Use canonical patterns** in Section 8 for consistency
3. **Prioritize refactoring** following Section 7's roadmap
4. **Update this document** when structure changes
5. **Reference Room 3** for portal implementation, **Room 6** for recent polish example

The goal is simple: **Make UX changes cheap, make room creation fast, keep the codebase maintainable.**
