# Hub Door Design - Room 0 (Ocean Hub)

## Overview

The hub door system provides premium, grounded 3D gateway structures for Room 0 (Ocean Hub). These doors serve as the first impression of the gallery and are designed to look authoritative and substantial, not like floating placeholders.

**Status**: ✅ Implemented and deployed in Room 0

**File**: [src/core/hub-door-utils.js](../src/core/hub-door-utils.js)

## Design Philosophy

**Problem**: Original Room 0 doors were cheap-looking and floaty:
- Thin PlaneGeometry panels with transparent frames
- Floating at arbitrary y: 2.75 with no ground connection
- No sense of depth or substance
- Looked like placeholders, not main hub gateways

**Solution**: Three-dimensional, grounded portal structures that:
- Sit flush on the platform surface
- Have proper architectural framing (pillars, base, header)
- Use portal colors from the centralized style map
- Feel like real gateways to other realms
- Are texture-ready for future customization

## Structure

Each hub door consists of 7 components:

### 1. Base Platform (Plinth)

```javascript
Dimensions: 5m (width) × 0.3m (height) × 2.5m (depth)
Position: Sits flush on platform at groundLevel (-1.0)
Material: Dark blue-grey (0x1a1a2e)
          Roughness: 0.7, Metalness: 0.3
          Subtle emissive glow matching portal color (intensity: 0.05)
```

The base anchors the door visually and prevents the "floating" look.

### 2. Vertical Pillars (Left & Right)

```javascript
Dimensions: 0.6m (width) × 6m (height) × 0.6m (depth)
Spacing: 3.5m between centers
Material: Slightly lighter than base (0x2a2a3e)
          Roughness: 0.6, Metalness: 0.4
          Portal color accent (emissive intensity: 0.1)
```

Pillars frame the gateway and provide architectural presence.

### 3. Header/Arch

```javascript
Dimensions: 4.2m (width) × 0.5m (height) × 0.6m (depth)
Position: Connects tops of pillars
Material: Matches pillars
```

The header completes the frame and creates a cohesive portal structure.

### 4. Inner Portal (The Gateway)

```javascript
Dimensions: 3m × 5m PlaneGeometry
Material: Portal color from style map
          Emissive intensity: 0.5
          Transparent, opacity: 0.85
          Double-sided
Position: Centered vertically in frame, z: 0.01 (front)
```

This is the actual navigable surface - the "portal" players approach.

### 5. Glow Effect

```javascript
Dimensions: 3.5m × 5.5m PlaneGeometry
Material: Portal color, opacity: 0.2
Position: z: -0.05 (behind portal)
Animation: Rotates slowly (animateHubDoor)
```

Adds depth and visual interest behind the portal.

### 6. Door Panel (Texture-Ready Surface)

```javascript
Dimensions: 2.8m × 4.8m PlaneGeometry
Material: White base, very subtle (opacity: 0.15)
          Ready to receive texture maps
Position: z: 0.02 (in front of portal)
userData: { isTexturePanel: true }
```

This panel is where custom door textures can be applied in the future.

### 7. Accent Light

```javascript
Type: PointLight
Color: Matches portal color from style map
Intensity: 0.8 (base), pulses 0.5-1.1
Range: 8 units
Position: Center of portal, z: 0.5 (slightly forward)
```

Provides ambient lighting and enhances the portal glow effect.

### 8. Label

```javascript
Canvas-based text label
Dimensions: 3.5m × 0.875m
Position: Above header (y: +0.8)
Style: Semi-transparent black background
       White text with color-matched glow effect
```

## Portal Color Integration

Hub doors automatically apply colors from the portal style map:

| Door | Connection | Style Map Key | Color | Hex |
|------|------------|---------------|-------|-----|
| North | Main Gallery | `0-1` | OCEAN_BLUE | `0x0088ff` |
| Northeast | Undersea Observatory | `0-A` | DEEP_BLUE | `0x0055aa` |
| Southeast | NFT Gallery Room | `0-B` | EMERALD | `0x00ff88` |
| Southwest | Concept Chamber | `0-C` | AMBER | `0xff8800` |

**Automatic Styling**: The `createHubDoor()` function calls `getPortalStyle(fromRoom, toRoom)` to retrieve the correct color, ensuring consistency with the portal standardization system.

## Usage

### Creating a Hub Door

```javascript
import { createHubDoor } from './src/core/hub-door-utils.js';

const hubDoor = createHubDoor({
  scene,
  position: { x: 0, y: 0, z: 22 },  // Y=0 is camera level, door grounds itself
  rotation: Math.PI,                 // Face inward
  fromRoom: '0',
  toRoom: '1',
  name: 'Main Gallery',
  destination: 'room1.html',
  groundLevel: -1.0,                 // Platform surface Y position
  createLabel: true
});

// Returns:
// {
//   group,      // THREE.Group containing all components
//   portal,     // Main portal mesh (for navigation)
//   glow,       // Glow effect mesh
//   pillars,    // { left, right }
//   header,     // Header mesh
//   base,       // Base platform mesh
//   panel,      // Texture-ready panel
//   light,      // Accent light
//   label,      // Text label (if createLabel: true)
//   style,      // Applied portal style from map
//   applyTexture(texture),       // Helper method
//   applyNormalMap(normalMap)    // Helper method
// }
```

### Animating Hub Doors

```javascript
import { animateHubDoor } from './src/core/hub-door-utils.js';

// In animate() loop:
const time = Date.now() * 0.001;  // Time in seconds

doors.forEach(door => {
  animateHubDoor(door, time);
});

// Animations:
// - Portal opacity pulses (0.75 - 0.95)
// - Glow rotates slowly (z-axis)
// - Accent light pulses intensity (0.5 - 1.1)
```

### Applying Custom Textures (Future)

```javascript
// Load a door texture
const doorTexture = textureLoader.load('/assets/hub/door_main_gallery.jpg');

// Apply to door
hubDoor.applyTexture(doorTexture);
// This sets panel.material.map = texture and opacity = 1.0

// Optional: Add normal map for surface detail
const normalMap = textureLoader.load('/assets/hub/door_normal.jpg');
hubDoor.applyNormalMap(normalMap);
```

**Texture Requirements** (when adding custom textures):
- Aspect ratio: ~0.58 (width:height) to match 2.8m × 4.8m panel
- Resolution: 1024×1792 or 2048×3584 recommended
- Format: JPG or PNG
- Location: `/public/assets/hub/`

## Implementation in Room 0

### Door Positions

Doors are positioned at the edge of the circular platform (radius: 22m):

```javascript
const doorConfigs = [
  // North: Main Gallery
  { x: 0, z: 22, rotation: Math.PI },

  // Northeast: Observatory
  { x: 15.56, z: 15.56, rotation: Math.PI + Math.PI/4 },

  // Southeast: NFT Gallery
  { x: 15.56, z: -15.56, rotation: Math.PI + Math.PI/1.25 },

  // Southwest: Concept Chamber
  { x: -15.56, z: -15.56, rotation: Math.PI - Math.PI/1.25 }
];
```

### Ground Level Coordination

```javascript
Platform surface: y = waterLevel = -1.0
Camera eye height: y = groundLevel + eyeHeight = 0 + 2.0 = 2.0

Hub doors:
- Base bottom: y = -1.15 (waterLevel - 0.15)
- Base top: y = -1.0 (waterLevel)
- Portal center: y = 2.0 (eyeHeight)
- Header top: y = 5.3
```

Doors are perfectly grounded on the platform with no gap or floating.

### Navigation Integration

Hub doors integrate with the standardized portal system:

```javascript
// Proximity checker uses portal position from door.location
const portalConfigs = doors.map(door => ({
  position: new THREE.Vector3(
    door.location.x,
    door.location.y,  // Portal center height
    door.location.z
  ),
  name: door.location.name,
  url: door.location.destination,
  showDistance: 4.0,
  triggerDistance: 2.0
}));

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: portalConfigs
});
```

## Benefits

### Visual Quality
1. **Premium First Impression**: Hub looks finished, not placeholder
2. **Grounded**: No floating geometry, proper architectural connection to platform
3. **Depth**: 3D structure with real pillars, not flat planes
4. **Consistency**: Automatic color integration from portal style map

### Technical
1. **Reusable**: Hub door system can be used for other hub-style rooms
2. **Texture-Ready**: Easy to add custom door panel textures later
3. **Integrated**: Works seamlessly with portal standardization system
4. **Maintainable**: All hub door logic in one utility file

### User Experience
1. **Navigability**: Clear, substantial gateways are easy to find and approach
2. **Visual Clarity**: Color-coding from portal map helps players learn connections
3. **Professionalism**: Polished hub entrance sets tone for entire gallery

## Code Metrics

**Before** (old createWoodenDoors):
- ~210 lines of ad-hoc door creation code in room0.js
- Thin planes with transparent frames
- Hardcoded positions, manual label creation
- No grounding, floaty appearance

**After** (hub door system):
- hub-door-utils.js: 390 lines (reusable utility)
- room0.js: ~50 lines using createHubDoors()
- Full 3D structures with proper grounding
- Integrated with portal-styles.js
- Texture-ready for future customization

**Result**: More sophisticated system with ~160 less lines in room0.js

## Future Enhancements

### Short-term
- [ ] Add custom door panel textures for each destination
- [ ] Optional particle effects around portal edges
- [ ] Sound effects on approach/activation

### Long-term
- [ ] Different door "styles" (archway, technical, mystical)
- [ ] Dynamic portal "iris" opening animation
- [ ] Environmental lighting from portals (affects nearby objects)
- [ ] Portal "preview" showing glimpse of destination room

## Relationship to Portal Standardization

Hub doors are an **extension** of the portal standardization system:

- **Portal Style Map** ([portal-styles.js](../src/core/portal-styles.js)):
  - Defines colors, orientations, effect types for all room connections
  - Hub doors use this for color consistency

- **Portal Utilities** ([portal-utils.js](../src/core/portal-utils.js)):
  - Provides createLinkedPortal() for circular portals in other rooms
  - Hub doors use getPortalStyle() from this system

- **Hub Door Utilities** ([hub-door-utils.js](../src/core/hub-door-utils.js)):
  - Specialized for Room 0's architectural gateway style
  - Queries portal-styles.js for colors
  - Creates 3D framed structures instead of circular portals

**Design principle**: Same connection = same color, whether it's a circular portal (Room 5) or architectural door (Room 0).

---

**Last Updated:** 2025-11-15
**Canonical Implementation:** [room0.js](../room0.js)
**Related Docs:**
- [Portal Style Map](06-portal-style-map.md)
- [Code Structure Notes](05-code-structure-notes.md)
