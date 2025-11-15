# Portal Style Map - Visual Language Reference

## Overview

This document defines the centralized portal style system that ensures consistent visual language throughout the NFT gallery. Portal pairs (A↔B) share the same color, orientation, and effect type, so players learn to recognize connections visually.

**Design Philosophy:**
- **Consistency**: Same connection = same visual style in both directions
- **Recognition**: Players learn which portals connect to which rooms
- **Visual Grammar**: Colors and effects communicate room relationships

## Implementation

The portal standardization system is implemented in two core files:

### Core Files

1. **[src/core/portal-styles.js](../src/core/portal-styles.js)**
   - Centralized style map defining all room-to-room connections
   - Color palette (PORTAL_COLORS)
   - Effect configurations (FX_TYPES)
   - Helper functions: getPortalStyle(), getPortalStylesForRoom(), validatePortalStyles()

2. **[src/core/portal-utils.js](../src/core/portal-utils.js)**
   - createLinkedPortal(): Auto-applies style from central map
   - createPortalLabel(): Canvas-based labels with color-matched glow
   - animateLinkedPortal(): Uses style-defined rotation speeds
   - createMultiPortalChecker(): Unified proximity detection

3. **[src/core/hub-door-utils.js](../src/core/hub-door-utils.js)** ⭐ NEW
   - createHubDoor(): Premium 3D gateway structures for Room 0 hub
   - animateHubDoor(): Portal pulsing, glow rotation, light effects
   - Grounded architectural doors with pillars, base, header
   - See [Hub Door Design Documentation](07-hub-door-design.md)

### Canonical Examples

- **[room0.js](../room0.js)**: Ocean Hub - Premium 3D hub doors with standardized colors (see [Hub Door Design](07-hub-door-design.md))
- **[room5.js](../room5.js)**: Eternal Eclipse - Circular portals with full style system

## Portal Style Definitions

### Main Progression Path: 0 → 1 → 2/3 → 4 → 5

| Link | Color | Hex | Orientation | FX Type | Description |
|------|-------|-----|-------------|---------|-------------|
| **0↔1** | Ocean Blue | `0x0088ff` | Vertical | Hub | Ocean hub to main gallery - primary entry |
| **1↔2** | Cyan | `0x00ccff` | Vertical | Default | Main gallery progression |
| **1↔3** | Emerald | `0x00ff88` | Vertical | Default | Alternative main path branch |
| **2↔4** | Purple | `0x8844aa` | Vertical | Default | Path to floating island |
| **4↔5** | Purple | `0x8844aa` | Vertical | Special | Deep progression to bonus hub |

### Bonus Hub Connections: Room 5 ↔ Rooms 6, 7, 8, 9

Room 5 (Eternal Eclipse) serves as the end-game bonus hub with 4 portals to bonus content:

| Link | Color | Hex | Orientation | FX Type | Label from Room 5 |
|------|-------|-----|-------------|---------|-------------------|
| **5↔6** | Light Blue | `0x66ccff` | Vertical | Bonus | Room 6 (Video Corridor) ⬆ |
| **5↔7** | Gold | `0xffaa00` | Vertical | Bonus | Room 7 (Starry Gallery) ➡ |
| **5↔8** | Silver | `0xaaaaaa` | Vertical | Bonus | Room 8 (Abstract Art) ⬅ |
| **5↔9** | Lavender | `0xaa88ff` | Vertical | Bonus | Room 9 (Tunnel) ↗ |

### Special Connections

| Link | Color | Hex | Orientation | FX Type | Description |
|------|-------|-----|-------------|---------|-------------|
| **0↔A** | Deep Blue | `0x0055aa` | Vertical | Hub | Hub to undersea observatory |
| **0↔B** | Emerald | `0x00ff88` | Vertical | Hub | Hub to NFT gallery room |
| **0↔C** | Amber | `0xff8800` | Vertical | Secret | Hub to concept chamber (WIP) |
| **A↔A1** | Deep Blue | `0x0055aa` | Vertical | Special | Observatory to annex |

## Effect Type Configurations

### FX_TYPES

| Type | Glow Intensity | Rotation Speed | Particles | Notes |
|------|----------------|----------------|-----------|-------|
| **default** | 0.3 | 0.01 | No | Standard room-to-room portals |
| **hub** | 0.5 | 0.015 | No | Main hub connections (Room 0) |
| **bonus** | 0.4 | 0.012 | No | Bonus content from Room 5 |
| **special** | 0.6 | 0.02 | Yes (40) | Important progression portals |
| **secret** | 0.25 | 0.008 | No | Hidden/WIP areas (subtle) |

## Color Palette Visual Reference

```
Main Progression:
  🔵 Ocean Blue  (0x0088ff) - Room 0↔1
  🔵 Cyan        (0x00ccff) - Room 1↔2
  🟢 Emerald     (0x00ff88) - Room 1↔3, 0↔B
  🟣 Purple      (0x8844aa) - Room 2↔4, 4↔5

Bonus Content:
  🔵 Light Blue  (0x66ccff) - Room 5↔6
  🟡 Gold        (0xffaa00) - Room 5↔7
  ⚪ Silver      (0xaaaaaa) - Room 5↔8
  🟣 Lavender    (0xaa88ff) - Room 5↔9

Special Areas:
  🔵 Deep Blue   (0x0055aa) - Room 0↔A, A↔A1
  🟠 Amber       (0xff8800) - Room 0↔C
```

## Usage Instructions

### Creating a New Portal

**Using the standardized system (RECOMMENDED):**

```javascript
import { createLinkedPortal } from './src/core/portal-utils.js';

// Automatically applies correct color, size, and effects from style map
const { portal, glow, label } = createLinkedPortal({
  scene,
  fromRoom: '5',     // Starting room ID
  toRoom: '6',       // Destination room ID
  x: 0,
  y: 5,
  z: -25,
  rotationY: 0,      // Optional rotation
  createLabel: true  // Auto-creates label with correct color
});
```

**Animation:**

```javascript
// In your animate() loop
import { animateLinkedPortal } from './src/core/portal-utils.js';

allPortals.forEach(portalObj => {
  animateLinkedPortal(portalObj.portal, portalObj.glow);
});
```

**Proximity Detection:**

```javascript
import { createMultiPortalChecker } from './src/core/portal-utils.js';

const portalConfigs = [
  {
    position: new THREE.Vector3(0, 5, -25),
    name: 'Room 6 (Video Corridor)',
    url: 'room6.html',
    showDistance: 3.0,
    triggerDistance: 1.8
  }
  // ... more portals
];

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: portalConfigs,
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// In animate() loop:
checkPortalProximity();
```

## Navigation Flow

```
Room 0 (Ocean Hub)
  ├─ Room 1 (Main Gallery) ───┬─ Room 2 ── Room 4 (Floating Island) ── Room 5 (Eternal Eclipse)
  │                            │                                             ├─ Room 6 (Video Corridor)
  │                            └─ Room 3                                     ├─ Room 7 (Starry Gallery)
  ├─ Room A (Observatory) ── Room A1                                        ├─ Room 8 (Abstract Art)
  ├─ Room B (NFT Gallery)                                                   └─ Room 9 (Tunnel)
  └─ Room C (Concept Chamber - WIP)
```

## Rules for Future Portal Additions

### Adding a New Room Connection

1. **Define the style in portal-styles.js:**

```javascript
// In PORTAL_STYLES object
'5-10': {  // New link: Room 5 to Room 10
  color: PORTAL_COLORS.CYAN,
  orientation: 'vertical',
  size: 1.5,
  fxType: 'bonus',
  label: {
    from5: 'Room 10 (New Area) →',
    from10: '← Eternal Eclipse (Room 5)'
  },
  description: 'Bonus: New experimental area'
},
```

2. **Add to room implementation:**

```javascript
// In room5.js or room10.js
const portal = createLinkedPortal({
  scene,
  fromRoom: '5',
  toRoom: '10',
  x: ...,
  y: ...,
  z: ...,
  createLabel: true
});
```

3. **Update this documentation:**
   - Add entry to appropriate table
   - Update navigation flow diagram
   - Document any special behavior

### Portal Pair Consistency Checklist

✅ **Both portals use the same color** (defined once in portal-styles.js)
✅ **Both portals use the same orientation** (vertical or horizontal)
✅ **Both portals use the same FX type** (glow intensity, rotation speed, particles)
✅ **Labels are defined for both directions** (fromX and fromY in style map)
✅ **Link is bidirectional** (works correctly A→B and B→A)

### DON'T:

❌ Hardcode random portal colors in room files
❌ Mix vertical and horizontal orientations for the same link
❌ Create asymmetric visual styles (e.g., particles in one direction but not the other)
❌ Duplicate style definitions (use one shared style per link)

## Validation

Run validation to check for consistency issues:

```javascript
import { validatePortalStyles } from './src/core/portal-styles.js';

const report = validatePortalStyles();
console.log(report);
// {
//   valid: true,
//   issues: [],
//   warnings: [],
//   totalLinks: 11
// }
```

## Migration Status

### Refactored (Using portal-utils)

- ✅ **Room 0** - Ocean Hub (doors with standardized colors)
- ✅ **Room 5** - Eternal Eclipse (bonus hub with 5 portals)

### Not Yet Refactored (Using ad-hoc code)

- ⏳ Room 1 - Main Gallery
- ⏳ Room 2
- ⏳ Room 3
- ⏳ Room 4 - Floating Island
- ⏳ Room 6 - Video Corridor
- ⏳ Room 7 - Starry Gallery
- ⏳ Room 8 - Checkered Frame
- ⏳ Room 9 - Tunnel
- ⏳ Room A - Undersea Observatory
- ⏳ Room A1 - Observatory Annex
- ⏳ Room B - NFT Gallery Room
- ⏳ Room C - Concept Chamber

**Future work:** Migrate remaining rooms to use createLinkedPortal() for consistency.

## Benefits of This System

1. **Consistency**: Players learn the visual language - "purple portal = Room 4/5 connection"
2. **Maintainability**: One central definition per connection, not scattered across files
3. **Discoverability**: See all room connections in one file (portal-styles.js)
4. **Code Reduction**: Shared utilities eliminate duplicated portal creation code
5. **Error Prevention**: Impossible to create mismatched portal pairs
6. **Future-Proof**: Easy to add new rooms without breaking existing visual language

---

**Last Updated:** 2025-11-15
**Maintained By:** NFT Gallery Development Team
