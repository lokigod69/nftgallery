# Core Utilities

Shared utilities to reduce code duplication across room files.

## Portal Standardization System ⭐ NEW

**Files**: [portal-styles.js](portal-styles.js) + [portal-utils.js](portal-utils.js)

The portal standardization system ensures consistent visual language throughout the gallery. Portal pairs (A↔B) share the same color, orientation, and effect type automatically.

**Key Principle:** Same connection = same visual style in both directions. Players learn which portals connect to which rooms visually.

### Quick Start (Recommended Approach)

```javascript
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';

// Automatically applies correct style from portal-styles.js
const { portal, glow, label } = createLinkedPortal({
  scene,
  fromRoom: '5',     // Starting room ID
  toRoom: '6',       // Destination room ID
  x: 0,
  y: 5,
  z: -25,
  rotationY: 0,
  createLabel: true  // Auto-creates label with color-matched glow
});

// In animate() loop:
animateLinkedPortal(portal, glow);  // Uses style-defined rotation speed
```

**See**: [docs/06-portal-style-map.md](../../docs/06-portal-style-map.md) for complete style definitions and examples.

**Canonical Examples:**
- ✅ **[room0.js](../../room0.js)**: Doors with standardized colors
- ✅ **[room5.js](../../room5.js)**: Circular portals with full style system

---

## Portal Utilities (Legacy + Standard)

**File**: [portal-utils.js](portal-utils.js)

Provides reusable functions for creating and managing portals throughout the gallery.

### Usage Example

```javascript
import {
  createPortal,
  animatePortal,
  createPortalProximityChecker,
  PORTAL_COLORS
} from './src/core/portal-utils.js';

// Create a portal back to Room 0
const { portal, glow } = createPortal({
  scene: scene,
  x: 0,
  y: eyeHeight,
  z: 25,
  color: PORTAL_COLORS.TEAL,  // Teal for return to hub
  rotationY: Math.PI
});

// Create proximity checker
const checkPortal = createPortalProximityChecker({
  camera: camera,
  portalPosition: new THREE.Vector3(0, eyeHeight, 25),
  destinationUrl: 'room0.html',
  portalName: 'Ocean Hub (Room 0)'
});

// In your animate() loop:
function animate() {
  requestAnimationFrame(animate);

  // Animate portal
  animatePortal(portal, glow);

  // Check proximity
  if (controls.isLocked) {
    checkPortal();
  }

  renderer.render(scene, camera);
}
```

### Multiple Portals Example

```javascript
import { createMultiPortalChecker } from './src/core/portal-utils.js';

// Create multiple portals
const portals = [
  { position: new THREE.Vector3(0, 5, 25), name: 'Room 4', url: 'room4.html' },
  { position: new THREE.Vector3(0, 5, -25), name: 'Room 6', url: 'room6.html' },
  { position: new THREE.Vector3(25, 5, 0), name: 'Room 7', url: 'room7.html' }
];

const checkPortals = createMultiPortalChecker({
  camera: camera,
  portals: portals
});

// In animate loop:
checkPortals();
```

## Portal Color Standards

Use consistent colors for portal types:

| Color | Hex | Usage |
|-------|-----|-------|
| **Teal** | `0x00ffff` | Return to hub/Room 0 |
| **Purple** | `0x8844aa` | Main progression path |
| **Cyan** | `0x00ccff` | Room 6 (Video Corridor) |
| **Gold** | `0xffaa00` | Room 7 (Starry Gallery) |
| **Silver** | `0xaaaaaa` | Room 8 (Checkered Frame) |
| **Light Purple** | `0xaa88ff` | Room 9 (Tunnel) |

```javascript
import { PORTAL_COLORS } from './src/core/portal-utils.js';

createPortal({
  // ...
  color: PORTAL_COLORS.TEAL  // Instead of hardcoding 0x00ffff
});
```

## API Reference

### `createPortal(options)`

Creates a circular portal with glow effect.

**Parameters:**
- `scene` (THREE.Scene) - Scene to add portal to
- `x, y, z` (number) - Portal position
- `color` (number) - Portal color in hex (e.g. 0x00ffff)
- `size` (number, optional) - Portal radius, default: 1.5
- `glowSize` (number, optional) - Glow radius, default: 1.8
- `opacity` (number, optional) - Portal opacity, default: 0.8
- `glowOpacity` (number, optional) - Glow opacity, default: 0.3
- `rotationX, rotationY, rotationZ` (number, optional) - Rotation in radians, default: 0

**Returns:** `{ portal, glow }` - Portal and glow mesh objects

---

### `animatePortal(portal, glow, speed?)`

Animates portal with counter-rotating effect.

**Parameters:**
- `portal` (THREE.Mesh) - Portal mesh
- `glow` (THREE.Mesh) - Glow mesh
- `speed` (number, optional) - Rotation speed, default: 0.01

**Usage:** Call in your `animate()` loop

---

### `createPortalProximityChecker(options)`

Creates a function that checks camera proximity to a portal and triggers navigation.

**Parameters:**
- `camera` (THREE.Camera) - Three.js camera
- `portalPosition` (THREE.Vector3) - Portal position
- `destinationUrl` (string) - URL to navigate to (e.g. 'room0.html')
- `portalName` (string, optional) - Portal display name, default: 'Portal'
- `showDistance` (number, optional) - Distance to show message, default: 3.0
- `triggerDistance` (number, optional) - Distance to trigger navigation, default: 1.8
- `controlsId` (string, optional) - Controls element ID, default: 'controls-description'
- `overlayId` (string, optional) - Loading overlay element ID, default: 'loading-overlay'
- `loadingDelay` (number, optional) - Delay before navigation in ms, default: 500

**Returns:** `Function` - Checker function to call in animate() loop

---

### `createMultiPortalChecker(options)`

Creates a function that handles proximity checking for multiple portals.

**Parameters:**
- `camera` (THREE.Camera) - Three.js camera
- `portals` (Array<Object>) - Array of portal configs: `[{ position, name, url, showDistance?, triggerDistance? }]`
- `controlsId` (string, optional) - Controls element ID, default: 'controls-description'
- `overlayId` (string, optional) - Loading overlay element ID, default: 'loading-overlay'
- `loadingDelay` (number, optional) - Delay before navigation in ms, default: 500

**Returns:** `Function` - Checker function to call in animate() loop

## Migration Guide

### Before (manual portal creation):

```javascript
// Old way - duplicated across multiple files
let portalToRoom0 = new THREE.Mesh(
  new THREE.CircleGeometry(1.5, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
);
portalToRoom0.position.set(0, eyeHeight, 25);
portalToRoom0.rotation.y = Math.PI;

let portalGlow = new THREE.Mesh(
  new THREE.CircleGeometry(1.8, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
);
portalGlow.position.copy(portalToRoom0.position);
portalGlow.rotation.copy(portalToRoom0.rotation);
scene.add(portalToRoom0, portalGlow);

// Manual proximity checking...
function checkPortalProximity() {
  const dist = camera.position.distanceTo(portalToRoom0.position);
  // ...40+ lines of proximity logic
}

// Manual animation...
portalToRoom0.rotation.z += 0.01;
portalGlow.rotation.z -= 0.01;
```

### After (using utilities):

```javascript
import { createPortal, animatePortal, createPortalProximityChecker, PORTAL_COLORS } from './src/core/portal-utils.js';

// Create portal
const { portal, glow } = createPortal({
  scene,
  x: 0, y: eyeHeight, z: 25,
  color: PORTAL_COLORS.TEAL,
  rotationY: Math.PI
});

// Create checker
const checkPortal = createPortalProximityChecker({
  camera,
  portalPosition: new THREE.Vector3(0, eyeHeight, 25),
  destinationUrl: 'room0.html',
  portalName: 'Ocean Hub (Room 0)'
});

// In animate loop
animatePortal(portal, glow);
checkPortal();
```

**Result**: ~80% less code, standardized behavior, easier to maintain.

## Future Utilities (Planned)

- `scene-utils.js` - Scene, camera, renderer setup
- `movement-utils.js` - WASD controls, jumping, gravity
- `nft-utils.js` - NFT frame creation and loading
- `lighting-utils.js` - Common lighting setups

## Asset Utilities

**File**: [asset-utils.js](asset-utils.js)

Provides diagnostic tools for texture and asset loading.

### Features

- **loadTextureWithDiagnostics()**: Comprehensive error logging for failed texture loads
- **createFallbackMaterial()**: Bright magenta fallback to make missing assets obvious
- **logTextureLoadingSummary()**: Batch loading summary with success/failure stats
- **batchLoadTextures()**: Load multiple textures with automatic diagnostics

See [asset-utils.js](asset-utils.js) for detailed API documentation.

---

## Contributing

When adding new rooms or refactoring existing ones:

### ✅ DO:
- **Use `createLinkedPortal()` for all new portals** - Automatically applies correct colors from the central style map
- **Define new room connections in `portal-styles.js`** before implementation
- **Use `createMultiPortalChecker()` for proximity detection** - Standardized navigation UX
- **Reference canonical examples**: [room0.js](../../room0.js) and [room5.js](../../room5.js)
- **Update [docs/06-portal-style-map.md](../../docs/06-portal-style-map.md)** when adding new room connections

### ❌ DON'T:
- **Hardcode random portal colors** (use the style map instead)
- **Copy-paste portal creation code** (use shared utilities)
- **Create asymmetric portal pairs** (A→B must match B→A visually)
- **Mix orientations for the same link** (both vertical or both horizontal, never mixed)

**Why?** Consistent visual language helps players navigate the gallery intuitively.
