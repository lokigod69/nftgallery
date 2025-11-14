# Code Structure & Hygiene Analysis

Analysis of code quality, patterns, duplication, and opportunities for improvement. This document helps future developers understand what's good, what's problematic, and where refactoring would help.

---

## Executive Summary

**Overall Code Quality**: ⭐⭐⭐ (3/5)

**Strengths**:
- ✅ Clean separation: each room is independent
- ✅ Consistent Three.js patterns
- ✅ Good comments in newer rooms
- ✅ Mobile support implemented

**Weaknesses**:
- ❌ Massive duplication across rooms (80%+ identical code)
- ❌ No shared utilities or common modules
- ❌ Hardcoded values throughout
- ❌ Inconsistent naming conventions
- ❌ No configuration management

**Refactoring Priority**: 🔴 **HIGH** - Current structure makes adding rooms slow and error-prone

---

## Code Duplication Analysis

### Duplication Severity: CRITICAL

**Estimated Code Reuse**: ~5-10% unique per room, ~90-95% duplicated

### Common Duplicated Blocks

#### 1. Scene Setup (100% duplicated)

**Found in**: Every room file (room0.js through room9.js, roomA.js, roomB.js)

**Duplicated Code** (~50 lines per room):
```javascript
// Appears in ALL rooms with minor variations:
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x??????);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

**Impact**: 50 lines × 12 rooms = **600 lines of duplicate code**

**Solution**: Create `RoomBase.js` module:
```javascript
// RoomBase.js
export function createBaseScene(config) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.backgroundColor || 0x87ceeb);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(...config.cameraStart);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());

  setupResize(camera, renderer);

  return { scene, camera, renderer, controls };
}
```

---

#### 2. Movement Controls (95% duplicated)

**Found in**: All rooms

**Duplicated Code** (~80 lines):
```javascript
// Movement state
let moveForward = false, moveBackward = false;
let moveLeft = false, moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

// Keyboard handlers
const onKeyDown = function (event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    // ... etc for all keys
  }
};

const onKeyUp = function (event) {
  // ... mirror of onKeyDown
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// In animation loop:
if (controls.isLocked) {
  const speedDelta = speed * delta;
  // ... movement logic ...
}
```

**Impact**: 80 lines × 12 rooms = **960 lines of duplicate code**

**Solution**: Create `MovementController.js` module

---

#### 3. NFT Frame Creation (90% duplicated)

**Found in**: Rooms 1, 2, 3, 4, 5 with minor variations

**Duplicated Pattern**:
```javascript
function createNFT(index, position, rotation) {
  const frameGroup = new THREE.Group();

  // Grey frame box
  const frameBox = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 3.0, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x555555, /* ... */ })
  );
  frameGroup.add(frameBox);

  // Picture plane
  const imageUrl = `/assets/nft${index + 1}.png`;
  textureLoader.load(imageUrl, (texture) => {
    const picturePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 2.7),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    picturePlane.position.z = 0.11;
    picturePlane.userData = { /* ... */ };
    frameGroup.add(picturePlane);
    picturePlanes.push(picturePlane);
  });

  // Position and add to scene
  frameGroup.position.copy(position);
  frameGroup.rotation.y = rotation;
  scene.add(frameGroup);
}
```

**Variations**:
- Frame dimensions: 2.0×3.0 (most rooms) vs 2.5×? (Room 5) vs custom (Room B)
- Colors: 0x555555 (grey) vs 0x000000 (black)
- Position offsets

**Impact**: ~60 lines × 5 rooms = **300 lines of duplicate code**

**Solution**: Create `NFTFrame.js` module with configurable parameters

---

#### 4. Portal Creation (85% duplicated)

**Found in**: Rooms 1, 2, 3, 4, 5, A, B

**Duplicated Pattern**:
```javascript
function createPortal() {
  const portal = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 32),
    new THREE.MeshBasicMaterial({
      color: 0x4444ff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
  );

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0x6666ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
  );

  // Position, add to scene, return
}

function checkPortalProximity() {
  const distance = camera.position.distanceTo(portal.position);
  if (distance < 1.5) {
    loadingOverlay.style.display = 'flex';
    setTimeout(() => {
      window.location.href = 'room2.html';
    }, 500);
  }
}
```

**Impact**: ~40 lines × 7 rooms = **280 lines of duplicate code**

**Solution**: Create `Portal.js` module

---

#### 5. NFT Viewer Overlay (100% duplicated)

**Found in**: Rooms 1, 2, 3, 4, 5

**Duplicated Code**: Entire NFT viewer system (~200 lines) copy-pasted across 5 rooms

**Impact**: 200 lines × 5 rooms = **1000 lines of duplicate code**

**Solution**: Create `NFTViewer.js` module loaded globally

---

#### 6. Loading Overlay Management (100% duplicated)

**Found in**: All rooms

```javascript
// Hide loading overlay
setTimeout(() => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
      loadingOverlay.style.display = 'none';
    }, 500);
  }
}, 1000-3000);

// Safety timeout
setTimeout(() => {
  loadingOverlay.style.display = 'none';
}, 10000);
```

**Impact**: ~15 lines × 12 rooms = **180 lines**

**Solution**: Create `LoadingManager.js` module

---

### Duplication Summary Table

| Component | Lines per Room | Rooms with Duplicate | Total Duplicate Lines |
|-----------|----------------|---------------------|----------------------|
| Scene setup | 50 | 12 | 600 |
| Movement controls | 80 | 12 | 960 |
| NFT frame creation | 60 | 5 | 300 |
| Portal creation | 40 | 7 | 280 |
| NFT viewer | 200 | 5 | 1000 |
| Loading overlay | 15 | 12 | 180 |
| **TOTAL** | **445** | - | **3,320 lines** |

**Estimated Reduction**: Refactoring into shared modules could eliminate ~2,500-3,000 lines of code (~70-80% reduction)

---

## Naming Inconsistencies

### Room Naming

**Inconsistent Pattern**:
- `main.js` (should be `room1.js` for consistency)
- `room0.js`, `room2.js` - `room9.js` ✅
- `roomA.js`, `roomB.js` (letters instead of numbers)
- `roomA1.js` (mixed letter+number)

**Recommendation**: Standardize on either:
- Option A: All numbers (`room0` - `room15`)
- Option B: Numbers for main path, letters for branches (`room0-5`, `roomA`, `roomB`, `roomC`)

---

### Variable Naming

**Inconsistent Patterns Found**:

**Good Examples** (consistent across rooms):
```javascript
const eyeHeight = 2.5;
const moveForward = false;
const textureLoader = new THREE.TextureLoader();
```

**Bad Examples** (inconsistent):
```javascript
// Different names for same concept:
const speed = 80.0;        // Room 1
const MOVE_SPEED = 100.0;  // Room 2
const moveSpeed = 60.0;    // Room 3

// Inconsistent casing:
const roomWidth = 50;      // camelCase
const ROOM_WIDTH = 50;     // UPPER_CASE
const room_width = 50;     // snake_case (rarely used)

// Abbreviations vs full names:
const dir = new THREE.DirectionalLight();  // Abbreviated
const directionalLight = new THREE.DirectionalLight();  // Full name
```

**Recommendation**: Establish naming convention:
- Constants: `UPPER_SNAKE_CASE` (e.g., `EYE_HEIGHT`, `MOVE_SPEED`)
- Variables: `camelCase` (e.g., `moveForward`, `textureLoader`)
- Functions: `camelCase` (e.g., `createPortal`, `checkProximity`)

---

### File Naming

**Current Inconsistencies**:
```
room0.html / room0.js     ✅ Consistent
room1.html / main.js      ❌ Mismatch
roomA.html / roomA.js     ✅ Consistent
roomA1.html missing       ❌ Incomplete
```

**Recommendation**: HTML and JS files should always match:
- `room1.html` → `room1.js` (rename `main.js`)
- `roomA1.html` → `roomA1.js` (create missing HTML)

---

## Good Patterns (Keep & Replicate)

### ✅ Pattern 1: Self-Contained Rooms

**What**: Each room is a complete, independent module

**Why it's good**:
- Easy to understand one room in isolation
- Changes to one room don't affect others
- Can delete/add rooms without refactoring

**Example**:
```javascript
// room5.js is self-contained
// Has everything it needs
// No dependencies on other rooms
```

**Recommendation**: Keep this pattern, but extract shared code into utility modules

---

### ✅ Pattern 2: Loading Manager Pattern (Room 0, Room B)

**What**: Proper use of Three.js LoadingManager

**Example from Room B**:
```javascript
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  console.log(`Loading: ${Math.round(itemsLoaded / itemsTotal * 100)}%`);
  const loadingBar = loadingOverlay.querySelector('.loading-bar');
  if (loadingBar) {
    loadingBar.style.width = `${Math.round(itemsLoaded / itemsTotal * 100)}%`;
  }
};

loadingManager.onLoad = function() {
  console.log("All assets loaded");
  hideLoadingOverlay();
};

const textureLoader = new THREE.TextureLoader(loadingManager);
```

**Why it's good**:
- Real loading progress (not fake animated bar)
- Proper asset tracking
- Hides overlay only when ready

**Recommendation**: Use this pattern in ALL rooms (currently only in 2 rooms)

---

### ✅ Pattern 3: userData for Click Detection

**What**: Storing metadata on Three.js objects

**Example**:
```javascript
picturePlane.userData = {
  imageUrl: `/assets/nft${index}.png`,
  index: index,
  isNFT: true,
  opensea: `https://opensea.io/assets/...`
};

// Later, in click handler:
if (object.userData && object.userData.isNFT) {
  openNFTViewer(object.userData.imageUrl, object.userData.index);
}
```

**Why it's good**:
- Clean separation of data and presentation
- Easy to add metadata without changing mesh structure
- Standard Three.js pattern

**Recommendation**: Keep and use consistently

---

### ✅ Pattern 4: Portal Configuration Objects

**What**: Portals as data objects rather than hardcoded

**Example from Room 0**:
```javascript
const doors = [
  {
    x: 0,
    z: 22,
    y: 2.75,
    rotation: Math.PI,
    destination: 'room1.html',
    name: 'Main Gallery'
  },
  {
    x: 15.56,
    z: 15.56,
    y: 2.75,
    rotation: Math.PI + Math.PI / 4,
    destination: 'roomA.html',
    name: 'Undersea Observatory'
  }
];

doors.forEach(door => createDoor(door));
```

**Why it's good**:
- Easy to add/remove doors
- Configuration separate from implementation
- Could be moved to JSON file

**Recommendation**: Apply this pattern to all portals in all rooms

---

### ✅ Pattern 5: Mobile Detection & Adaptive Controls

**What**: Detecting device type and adjusting UI

**Example**:
```javascript
const isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);

if (isMobile) {
  // Create virtual joysticks
  createJoysticks();
} else {
  // Use pointer lock
  usePointerLockControls();
}
```

**Why it's good**:
- Provides appropriate controls for device
- Doesn't assume desktop-only
- Improves accessibility

**Recommendation**: Ensure ALL rooms have this (currently missing in some rooms)

---

## Bad Patterns (Avoid & Refactor)

### ❌ Anti-Pattern 1: Magic Numbers

**What**: Hardcoded values with no explanation

**Bad Examples**:
```javascript
camera.position.set(0, 11.5, 0);  // Why 11.5?
if (distance < 1.5) { /* ... */ }  // Why 1.5?
portal.position.z = 25;  // Why 25?
```

**Why it's bad**:
- Unclear intent
- Hard to adjust
- Easy to break when changing room size

**Better**:
```javascript
const OCEAN_SURFACE_HEIGHT = 11.5;
const PORTAL_ACTIVATION_DISTANCE = 1.5;
const NORTH_WALL_POSITION = 25;

camera.position.set(0, OCEAN_SURFACE_HEIGHT, 0);
if (distance < PORTAL_ACTIVATION_DISTANCE) { /* ... */ }
portal.position.z = NORTH_WALL_POSITION;
```

---

### ❌ Anti-Pattern 2: SetTimeout for Asset Loading

**What**: Using arbitrary delays instead of tracking actual load progress

**Bad Example**:
```javascript
setTimeout(() => {
  loadingOverlay.style.display = 'none';
}, 2000);  // Just hoping assets load in 2 seconds
```

**Why it's bad**:
- May hide overlay before assets load (broken images)
- May keep overlay too long (poor UX)
- Doesn't adapt to slow connections

**Better**: Use LoadingManager (see Good Pattern 2)

---

### ❌ Anti-Pattern 3: Inline Texture Loading in Loops

**What**: Loading textures inside loops without reuse

**Bad Example**:
```javascript
for (let i = 0; i < 100; i++) {
  textureLoader.load(`/assets/nft${i}.png`, (texture) => {
    // Create mesh
  });
}
// Creates 100 separate load operations
```

**Why it's bad**:
- No progress tracking
- Race conditions
- Hard to handle errors
- May overwhelm network

**Better**:
```javascript
// Preload all textures first
const textures = [];
let loaded = 0;

imageUrls.forEach((url, index) => {
  textureLoader.load(url, (texture) => {
    textures[index] = texture;
    loaded++;
    updateProgress(loaded / imageUrls.length);

    if (loaded === imageUrls.length) {
      createAllFrames(textures);
    }
  });
});
```

---

### ❌ Anti-Pattern 4: Global Variables Everywhere

**What**: Polluting global scope instead of encapsulation

**Bad Example**:
```javascript
// At top level of room.js
const scene = new THREE.Scene();
const camera = /* ... */;
let moveForward = false;
let isJumping = false;
// ... 50 more globals
```

**Why it's bad**:
- Namespace pollution
- Hard to track dependencies
- Can't have multiple instances
- Debugging is harder

**Better**:
```javascript
class Room {
  constructor(config) {
    this.scene = new THREE.Scene();
    this.camera = /* ... */;
    this.state = {
      moveForward: false,
      isJumping: false
    };
  }

  animate() {
    // Access via this.state
  }
}

const room = new Room(config);
```

---

### ❌ Anti-Pattern 5: Hardcoded Asset Paths

**What**: Asset URLs scattered throughout code

**Bad Example**:
```javascript
// Scattered across file:
textureLoader.load('/assets/nft1.png', /* ... */);
textureLoader.load('/assets/wood.jpg', /* ... */);
video.src = '/assets/vid5.mp4';
```

**Why it's bad**:
- Hard to change asset location
- Can't easily switch asset sets
- No validation that files exist

**Better**:
```javascript
// assets.js
export const ASSETS = {
  nfts: (index) => `/assets/nft${index}.png`,
  textures: {
    wood: '/assets/wood.jpg',
    metal: '/assets/metal.jpg'
  },
  videos: (index) => `/assets/vid${index}.mp4`
};

// In room:
import { ASSETS } from './assets.js';
textureLoader.load(ASSETS.nfts(1), /* ... */);
```

---

## Structural Problems

### Problem 1: No Shared Utilities

**Issue**: Common functions duplicated across rooms

**Missing Utilities**:
- `createBasicRoom()` - Floor, walls, ceiling
- `createNFTFrame()` - Standardized frame creation
- `createPortal()` - Portal with glow and proximity check
- `setupMovement()` - Movement controls
- `setupLoading()` - Loading overlay management

**Solution**: Create `utils/` folder:
```
utils/
├── RoomBase.js         # Scene, camera, renderer setup
├── Movement.js         # Movement controls
├── Portal.js           # Portal creation and proximity
├── NFTFrame.js         # NFT frame components
├── NFTViewer.js        # Full-screen viewer
├── LoadingManager.js   # Asset loading tracking
└── Mobile.js           # Mobile detection and joysticks
```

---

### Problem 2: No Configuration Management

**Issue**: No central config for rooms

**Current**: Settings scattered in each room file

**Proposed**: Create `config.json`:
```json
{
  "rooms": {
    "room0": {
      "name": "Ocean Entry Hub",
      "backgroundColor": "0x87ceeb",
      "cameraStart": [0, 11.5, 0],
      "nfts": [],
      "portals": [
        {
          "target": "room1.html",
          "position": [0, 2, 22],
          "color": "0x4444ff",
          "label": "Main Gallery"
        }
      ]
    },
    "room1": {
      "name": "Main Gallery",
      "backgroundColor": "0xcccccc",
      "cameraStart": [0, 2.5, 0],
      "nfts": {
        "start": 1,
        "count": 28
      },
      "portals": [/* ... */]
    }
  }
}
```

**Benefits**:
- See all room settings in one place
- Easy to add new rooms
- Could be edited without touching code
- Validation possible

---

### Problem 3: Inconsistent Error Handling

**Issue**: Some rooms handle errors, others don't

**Examples**:

**Good** (Room 5):
```javascript
textureLoader.load(
  imageUrl,
  (texture) => { /* success */ },
  undefined,
  (error) => console.error(`Failed to load NFT ${index}:`, error)
);
```

**Bad** (Room 1):
```javascript
textureLoader.load(imageUrl, (texture) => {
  // No error handling at all
});
```

**Solution**: Always include error callbacks, use consistent error handling pattern

---

### Problem 4: Build Configuration Maintenance

**Issue**: Adding a room requires manual edit of vite.config.js

**Current** (manual):
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        room0: 'room0.html',
        room1: 'room1.html',
        // ... must manually add each room
      }
    }
  }
};
```

**Better** (automatic):
```javascript
// build.js or vite.config.js
import { readdirSync } from 'fs';

const roomFiles = readdirSync('.')
  .filter(f => f.startsWith('room') && f.endsWith('.html'))
  .reduce((acc, file) => {
    const name = file.replace('.html', '');
    acc[name] = file;
    return acc;
  }, {});

export default {
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        ...roomFiles  // Auto-discovers room HTML files
      }
    }
  }
};
```

---

## Refactoring Recommendations

### Priority 1: Extract Shared Utilities (Immediate)

**Action**: Create shared modules to eliminate duplication

**Steps**:
1. Create `utils/` folder
2. Extract scene setup → `RoomBase.js`
3. Extract movement → `Movement.js`
4. Extract portal logic → `Portal.js`
5. Update one room to use utilities (test)
6. Migrate remaining rooms one-by-one

**Estimated Effort**: 2-3 days

**Impact**: Eliminate ~70% of duplicate code

---

### Priority 2: Standardize Naming (Quick Win)

**Action**: Rename inconsistent files and variables

**Steps**:
1. Rename `main.js` → `room1.js`
2. Standardize room naming (all numbers or mixed)
3. Apply consistent variable naming (use linter/formatter)

**Estimated Effort**: 2-3 hours

**Impact**: Improved code readability and maintainability

---

### Priority 3: Add Configuration System (Medium)

**Action**: Create central config for rooms

**Steps**:
1. Create `rooms-config.json`
2. Update Room 0 to load from config
3. Test and validate
4. Migrate other rooms

**Estimated Effort**: 1-2 days

**Impact**: Easier to add new rooms, centralized settings

---

### Priority 4: Improve Error Handling (Low)

**Action**: Add consistent error handling everywhere

**Steps**:
1. Create error handling utility
2. Add to all asset loading calls
3. Add user-friendly error messages

**Estimated Effort**: 1 day

**Impact**: Better debugging, fewer silent failures

---

## Code Quality Metrics

### Current State

| Metric | Value | Grade |
|--------|-------|-------|
| Code Duplication | ~70-80% | ❌ F |
| Naming Consistency | ~60% | 🟡 D |
| Error Handling | ~30% coverage | ❌ F |
| Documentation | ~40% (comments) | 🟡 D |
| Modularity | Low (no shared code) | ❌ F |
| Test Coverage | 0% | ❌ F |

### Target State (After Refactoring)

| Metric | Value | Grade |
|--------|-------|-------|
| Code Duplication | <20% | ✅ A |
| Naming Consistency | >90% | ✅ A |
| Error Handling | >80% coverage | ✅ B |
| Documentation | >70% | ✅ B |
| Modularity | High (shared utils) | ✅ A |
| Test Coverage | >50% | ✅ C |

---

## Conclusion

The NFT gallery codebase is **functional but needs significant refactoring** to be maintainable long-term.

**Main Problems**:
1. ❌ Massive code duplication (~70-80%)
2. ❌ No shared utilities
3. ❌ Inconsistent naming
4. ❌ Poor error handling

**Recommended Actions** (in order):
1. 🔴 **CRITICAL**: Extract shared utilities to eliminate duplication
2. 🟠 **HIGH**: Fix broken navigation (Room C, Room A1)
3. 🟠 **HIGH**: Standardize naming conventions
4. 🟡 **MEDIUM**: Add configuration system
5. 🟢 **LOW**: Improve error handling

**Estimated Total Refactoring Effort**: 1-2 weeks

**Benefits**:
- ~70% reduction in code volume
- Much easier to add new rooms
- Fewer bugs from copy-paste errors
- Better maintainability
- Easier onboarding for new developers

Despite these issues, the code is **well-structured conceptually** (independent rooms, clear patterns) and can be improved incrementally without breaking existing functionality.
