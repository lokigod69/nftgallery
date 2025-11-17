# NFT Gallery – Project Overview (Architecture & Room System Summary)

_Last updated: This build cycle._  
This document summarizes the entire structure, logic, and design philosophy of the NFT Gallery so any coding agent can instantly understand the project and continue working on Rooms 6–9 and beyond.

## 1. Project Purpose

This repository contains a fully navigable, first-person NFT gallery built with Three.js and PointerLockControls, composed of multiple interconnected “rooms.”  
Each room is its own self-contained world with:

- Layout (geometry, walls, floors, tiles)
- Lighting
- NFT display logic
- Portals to other rooms
- Room-specific physics and collision rules

The project is structured as a mini game engine where each room is implemented in its own JS file and loaded individually via `/roomX.html`.

## 2. Folder & File Structure

**Note:** The project has undergone engine-level refactoring (Phases 1-3 complete). Core systems are now centralized in `/src/core/`.

```text
/public
    /assets
        /RoomX
        /RoomB
        /Room7
        /textures
        favicon.svg      ← Global site icon
    index.html
    room0.html
    room1.html
    …
    roomA1.html
    roomB.html
    roomC.html

/src
    /core
        movement-config.js    ← Central movement system
        asset-utils.js        ← WebP asset loader helpers
        scene-setup.js        ← Centralized scene/camera/renderer/controls setup
        nft-viewer.js         ← Unified NFT viewer (Rooms 1-5)
        collision-helpers.js  ← Reusable collision patterns (Rooms 1-2)
        portal-utils.js       ← Portal creation and proximity checking
        portal-styles.js      ← Portal visual themes
    /ui
        speed-control.js      ← Speed slider UI

room0.js
main.js             ← Room 1
room2.js
room3.js
room4.js
room5.js
room6.js
room7.js
room8.js
room9.js
room10.js           ← Room X (hex-tile jump room)
roomA1.js
roomB.js
roomC.js
```

## 3. Global Systems

### 3.1 Movement System

Implemented in `/src/core/movement-config.js`.

Every room uses:

```js
const speed = MOVEMENT_CONFIG.getEffectiveSpeed('roomX') * delta;
```

Each room has its own base speed:

- Room 1: 2.7 eye height
- Room 2: 3.2
- Room 3: 3.2
- Room 4: balanced
- Room 5: balanced
- Room 6: 60 (jump-corridor)

Speed slider (0.5x–2.0x) exists in top-right via `/src/ui/speed-control.js`.

Mouse wheel also modifies speed multiplier.

### 3.2 PointerLock + Camera Framework

**Modern Pattern (Rooms 1-5, 8):** Use centralized scene setup

```js
import { initScene } from './src/core/scene-setup.js';

const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: 2.5, z: 0 },
  background: 0x000000,
  outputEncoding: 'sRGB'
});
```

This prevents spawn teleport or jitter and eliminates ~30 lines of boilerplate per room.

**Legacy Pattern (Rooms 0, 6-7, 9-10, A, A1, B, C):** Manual setup still in use

```js
const controls = new PointerLockControls(camera, document.body);
controls.getObject().position.copy(camera.position);
```

All movement and collision is applied only to `controls.getObject().position`, not the camera.

### 3.3 WebP Asset Pipeline

All PNG/JPG textures have been migrated to WebP via `/src/core/asset-utils.js`.

Example helpers:

```js
getTextureUrl(path);        // /assets/path.webp
getNftUrl(index);           // /assets/nft{index}.webp
getRoomBNftUrl(index);
getRoomXNftUrl(index);
```

PNG/JPG assets in `/public/assets` are no longer used.

### 3.4 Portal System

Portals all share the same structure:

```js
createLinkedPortal({
    color,
    position,
    scale,
    targetRoom: "room4.html",
    camera: controls.getObject(),
    triggerDistance,
    showDistance
});
```

Best working implementation lies in Room 3, which other rooms were aligned to.

Portals always:

- Show floating text within `showDistance`
- Teleport when within `triggerDistance`
- Use `controls.getObject()` for position checks

## 4. Collision System (Canonical Patterns)

The room engine uses no physics engine, only manual constraints.

### 4.1 Outer wall collision (Rooms 1, 2, 3)

Canonical form (e.g. Room 1):

```js
if (position.z < back + r) position.z = back + r;
if (position.z > front - r) position.z = front - r;
if (position.x < left + r) position.x = left + r;
if (position.x > right - r) position.x = right - r;
```

Outer walls are always axis-aligned, with stopping distance = `playerRadius`.

### 4.2 Divider wall collision

Modern final version uses side-based blocking (solid wall):

```js
const withinDividerX = (position.x > minX && position.x < maxX);

if (withinDividerX) {
    if (position.z > 0) {
        if (position.z < frontLimit) position.z = frontLimit;
    } else {
        if (position.z > backLimit) position.z = backLimit;
    }
}
```

- Prevents walking through NFTs  
- No jitter  
- No snapping  
- Works in Rooms 1 & 2  

This replaced the older "crossing detection," which was less stable.

**Modern Pattern (Rooms 1-2):** Use centralized collision helpers

```js
import { applyOuterWallCollision, applyDividerCollision } from './src/core/collision-helpers.js';

// Outer walls
applyOuterWallCollision(position, {
  minX, maxX, minZ, maxZ, radius: 0.5
});

// Divider walls
applyDividerCollision(position, {
  dividerX: { min, max },
  frontLimit, backLimit
});
```

This pattern is now used in Rooms 1-2. Room-specific constants remain in room files.

## 5. Room Status Overview

### Room 1 – "Classic Gallery"

- Fixed divider collision (final stable version)
- Correct outer-wall collision
- Correct spawn (no teleport)
- Eye height = 2.7
- Movement speed = slow
- All NFTs WebP and load correctly

Room is fully stable now.

### Room 2 – "Dual Wing Gallery"

- Divider logic corrected for two independent wings
- Outer wall collision perfect
- Eye height = 3.2
- Movement speed = slow
- Consistent NFT loading
- Same NFT viewer behavior as Room 1

Room is fully stable.

### Room 3 – "Large Cube Gallery"

- Best-working portal implementation (Room 2 ↔ 3, Room 3 ↔ 4)
- Outer-wall collision good
- Eye height = 3.2
- Movement speed = medium
- No divider wall
- NFT viewer consistent

Room is fully stable, used as reference baseline.

### Room 4 – "Floating Island"

- No image brightness issues after sRGB fix
- Uses 3D GLB models
- Correct portal logic
- No collision issues

### Room 5 – "Eternal Eclipse"

- Portal removal cleanup (only leads Room 4 → Room 6)
- Room theme intact (black/white/red)
- Lighting fixed so NFTs show correct colors
- Speed good

### Room 6 – “Lava Corridor” (Work in Progress)

**Concept:**

- Long corridor
- Hexagonal tiles you must jump across
- Floor = lava grid
- Touching floor resets you
- Tiles hold NFTs later

**Status:**

- Tiles implemented but need:
  - Adjusted spacing
  - Scattered layout
  - Jump feasibility tuning (`stepZ` too large)
  - Tile materials improved
- Reset logic needs fixing
- Lighting enhancements (torches)

### Room 7 – “Massive Art Wall"

- Heavy image room (38 NFTs)
- Needs streaming optimization later
- WebP migration complete

Room not yet polished.

### Room 8 / 9

- Currently minimal placeholders
- Awaiting design direction and mechanics

### Room X – "The Ascent" (Vertical Jump Tower)

- 28 hex tiles spiraling upward
- Each tile shows an NFT (with side-wrapping shader planned)
- Jump physics tuned (`walkSpeed = 6`, `jumpVelocity = 16`)

Needs:

- Correct side-wrap texture UVs
- Maybe easier difficulty in early tiles

Room is playable with correct physics.

## 6. NFT Viewer System

**Current state (Post-Phase 2):**

- ✅ Rooms 1-5 use centralized `nft-viewer.js`
- ⏳ Rooms 0, 6-10, A, A1, B, C use video-based or no viewer

**Modern Pattern (Rooms 1-5):**

```js
import { initNFTViewer } from './src/core/nft-viewer.js';

const nftViewer = initNFTViewer({
    scene,
    camera,
    controls,
    renderer,
    nftMeshes,
    nftMetadata,  // [{ id, url, title, description }]
    checkPortalProximity
});
```

**Benefits Achieved:**

- ✅ ~400 lines of code duplication removed across Rooms 1-5
- ✅ Standardized viewer behavior (consistent overlay, navigation, metadata)
- ✅ Easy to add features globally (e.g., zoom, share links, NFT rarity display)

**Legacy Pattern:** Rooms 0, 6-10, A, A1, B, C still use inline click handlers or video-based viewers

## 7. Asset Handling

All NFTs follow:

```text
/public/assets/nft1.webp
/public/assets/nft2.webp
...
/public/assets/RoomX/1.webp
/public/assets/RoomB/b1.webp
/public/assets/Room7/filename.webp
/public/assets/textures/...
```

Use the helper:

```js
textureLoader.load(getNftUrl(index), ...);
```

Every room now loads WebP only.

## 8. Known Conventions / Best Practices

- All movement and collision always use: `controls.getObject().position`
- Camera height always set via: `groundLevels[1] = X`
- Each room has its own base walking speed in `movement-config.js`
- Portals always use player's object position, not camera
- All textures must go through `asset-utils.js` helpers
- No PNG/JPG references anywhere

## 9. Global TODO / Future Tasks

### Core (Engine Layer)

- ✅ ~~Implement unified NFT viewer (`nft-viewer.js`)~~ - COMPLETE (Rooms 1-5)
- ✅ ~~Implement scene setup helper (`scene-setup.js`)~~ - COMPLETE (Rooms 1-5, 8)
- ✅ ~~Implement collision helpers (`collision-helpers.js`)~~ - COMPLETE (Rooms 1-2)
- ⏳ Extend scene-setup.js to remaining rooms (0, 6-7, 9-10, A, A1, B, C)
- ⏳ Evaluate collision helper migration for Rooms 3-5
- Global pause menu / help overlay
- Performance streaming module for heavy rooms (Room B, Room 7)

### Rooms

- **Room 6: main priority**
  - Fix spacing, death logic, lighting, tile scattering, ceiling, atmosphere
- **Room 7: texture streaming upgrade**
- **Room 8 & 9: design & implementation needed**
- **Room X:** finish side-texture wrapping for canvas-like tiles

## 10. Summary

This project is now a **modular, room-based gallery engine** with centralized systems:

**Engine Layer (Centralized):**
- ✅ WebP asset pipeline (`asset-utils.js`)
- ✅ Movement system with user speed control (`movement-config.js`, `speed-control.js`)
- ✅ Scene/camera/renderer setup (`scene-setup.js`) - 6 rooms migrated
- ✅ NFT click viewer (`nft-viewer.js`) - 5 rooms migrated
- ✅ Collision helpers (`collision-helpers.js`) - 2 rooms migrated
- ✅ Portal creation and theming (`portal-utils.js`, `portal-styles.js`)

**Content Layer (Room-Specific):**
- Room geometry and layout
- NFT positions and metadata
- Portal placements
- Collision constants
- Room-specific gameplay (jump puzzles, special mechanics)

Rooms 1–5 are polished and production-ready.  
Rooms 6–10 are now entering their gameplay / feature phase.

This document gives any coding agent enough context to continue seamlessly.
