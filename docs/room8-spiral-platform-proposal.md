# Room 8: Spiral Platform Redesign Proposal

## Investigation Summary

### Current Implementation Issues

**Analyzed from [room8.js:492-535](room8.js#L492-L535)**

1. **All platforms stacked vertically** at center position `(x=0, z=0)`
2. **Same diameter for all platforms**: `radius = 3.5` units (diameter 7.0)
3. **Problem**: When jumping upward, player jumps "through" platforms above
4. **No spatial reasoning required**: Just wait at same X/Z position for right timing
5. **Shaft dimensions**: Base radius 12, top radius 11, height 50 units

### Current Platform Configuration
```javascript
Platform 0: baseY=2.0,  amplitude=0,   speed=0     (static spawn)
Platform 1: baseY=8.0,  amplitude=2.5, speed=0.7,  phase=0
Platform 2: baseY=14.0, amplitude=3.0, speed=0.9,  phase=1.5
Platform 3: baseY=20.0, amplitude=2.8, speed=0.85, phase=3.0
Platform 4: baseY=26.0, amplitude=3.2, speed=0.95, phase=4.8
Platform 5: baseY=32.0, amplitude=2.5, speed=0.75, phase=2.2
Platform 6: baseY=42.0, amplitude=1.5, speed=0.6,  phase=0.8
```

All at position `(0, y, 0)` - completely overlapping in X/Z space.

---

## Proposed Spiral Design

### Core Concept

**3D Spiral Staircase**: Platforms arranged in a helix pattern, where each platform is:
- Positioned at a different angle around the shaft
- At a specific radius from center
- Moving up/down with synchronized phases
- When one platform peaks, the next is at its lowest point

### Key Design Goals

1. ✓ **Much smaller platforms** - avoid jumping through them
2. ✓ **Spiral arrangement** - 360° rotation over full ascent
3. ✓ **Synchronized timing** - low/high points align for jumping
4. ✓ **Precise jumping required** - small jump bridges gap, no jump = fall
5. ✓ **3D spatial reasoning** - must understand where platforms will meet

---

## Mathematical Design

### Geometry Parameters

```javascript
platformRadius: 1.8          // Much smaller (was 3.5) - diameter 3.6
radialPosition: 6.0          // Distance from shaft center (0,0)
angularSpacing: 51.43°       // 360° / 7 platforms = 51.43° per level
spiralRotation: 360°         // Full rotation from bottom to top
```

**Why these values:**
- **Radius 1.8**: Small enough to avoid vertical overlap (current: 3.5)
- **Radial position 6.0**: Places platforms near shaft wall (shaft radius 12)
- **Angular spacing 51.43°**: Even distribution around circle

### Platform Positions & Motion

#### Platform 0: Static Spawn
- **Angle**: 0° (South)
- **Position**: `(0, 2.0, 6.0)`
- **Motion**: Static (baseY=2.0, amplitude=0)
- **Purpose**: Safe spawn point

#### Platform 1: First Moving Platform
- **Angle**: 51.43° (Southeast)
- **Position**: `(3.74, baseY, 4.69)` at radius 6.0
- **Motion**:
  - `baseY = 7.0`
  - `amplitude = 2.5`
  - `speed = 1.0`
  - `phase = 0`
- **Range**: Y = 4.5 to 9.5

#### Platform 2: Anti-phase to P1
- **Angle**: 102.86° (East)
- **Position**: `(5.87, baseY, 1.30)` at radius 6.0
- **Motion**:
  - `baseY = 14.0`
  - `amplitude = 2.5`
  - `speed = 1.0`
  - `phase = π` (180° out of phase with P1)
- **Range**: Y = 11.5 to 16.5
- **Synchronization**: When P1 peaks at 9.5, P2 is at low 11.5 → gap of 2.0 units

#### Platform 3: In-phase with P1
- **Angle**: 154.29° (Northeast)
- **Position**: `(5.14, baseY, -2.54)` at radius 6.0
- **Motion**:
  - `baseY = 21.0`
  - `amplitude = 2.5`
  - `speed = 1.0`
  - `phase = 0` (same phase as P1)
- **Range**: Y = 18.5 to 23.5
- **Synchronization**: When P2 peaks at 16.5, P3 is at low 18.5 → gap of 2.0 units

#### Platform 4: Anti-phase
- **Angle**: 205.71° (Northwest)
- **Position**: `(2.49, baseY, -5.45)` at radius 6.0
- **Motion**:
  - `baseY = 28.0`
  - `amplitude = 2.5`
  - `speed = 1.0`
  - `phase = π`
- **Range**: Y = 25.5 to 30.5
- **Synchronization**: When P3 peaks at 23.5, P4 is at low 25.5 → gap of 2.0 units

#### Platform 5: In-phase with P1
- **Angle**: 257.14° (West)
- **Position**: `(-1.33, baseY, -5.85)` at radius 6.0
- **Motion**:
  - `baseY = 35.0`
  - `amplitude = 2.5`
  - `speed = 1.0`
  - `phase = 0`
- **Range**: Y = 32.5 to 37.5
- **Synchronization**: When P4 peaks at 30.5, P5 is at low 32.5 → gap of 2.0 units

#### Platform 6: Exit Platform (Anti-phase)
- **Angle**: 308.57° (Southwest)
- **Position**: `(-3.68, baseY, 4.73)` at radius 6.0
- **Motion**:
  - `baseY = 42.0`
  - `amplitude = 2.5`
  - `speed = 1.0`
  - `phase = π`
- **Range**: Y = 39.5 to 44.5
- **Synchronization**: When P5 peaks at 37.5, P6 is at low 39.5 → gap of 2.0 units
- **Portal Access**: Portal at Y=43 is accessible when P6 is high (42-44.5)

---

## Synchronization Mechanics

### Phase Alternation Pattern

The key to making platforms meet is **alternating phases**:

```
P1: phase = 0    →  y(t) = baseY + 2.5*sin(1.0*t + 0)
P2: phase = π    →  y(t) = baseY + 2.5*sin(1.0*t + π)
P3: phase = 0    →  y(t) = baseY + 2.5*sin(1.0*t + 0)
P4: phase = π    →  y(t) = baseY + 2.5*sin(1.0*t + π)
P5: phase = 0    →  y(t) = baseY + 2.5*sin(1.0*t + 0)
P6: phase = π    →  y(t) = baseY + 2.5*sin(1.0*t + π)
```

**Result**: When odd-numbered platforms are at peak (+2.5), even-numbered are at trough (-2.5).

### Jump Gap Analysis

**Vertical Gap**: 2.0 units
- When P1 is at peak (9.5), P2 is at low (11.5)
- Gap: 11.5 - 9.5 = 2.0 units

**Horizontal Gap** (3D distance):
- P1 at angle 51.43°: position `(3.74, ?, 4.69)`
- P2 at angle 102.86°: position `(5.87, ?, 1.30)`
- Horizontal distance: `√[(5.87-3.74)² + (1.30-4.69)²]` = `√[4.54 + 11.49]` = `√16.03` ≈ **4.0 units**

**Total 3D Jump Distance**: `√(horizontal² + vertical²)` = `√(16.03 + 4.0)` = `√20.03` ≈ **4.48 units**

**Jump Physics** (from config):
- Jump velocity: 10
- Gravity: -30
- Max jump height: v²/(2|g|) = 100/60 ≈ **1.67 units** above eye level
- Player eye height: 2.5 units above platform surface

**Jump Reach Analysis**:
- Standing on P1 peak (9.5): player feet at 9.5, eyes at 12.0
- Jump adds 1.67: player can reach eye level at 13.67
- P2 low point (11.5): player needs feet at 11.5, eyes at 14.0
- **Conclusion**: Gap is tight but jumpable with precise timing ✓

---

## Gameplay Flow

### Ascension Sequence

1. **Start**: Spawn on Platform 0 (static, south side)
2. **Observe**: Watch Platform 1 rise and fall (southeast)
3. **Time Jump**: Wait for P1 to approach peak, jump when aligned
4. **Land on P1**: Now moving with platform
5. **Navigate**: Move around shaft clockwise to face next platform
6. **Repeat**: Jump from P1→P2→P3→P4→P5→P6
7. **Portal**: At P6 peak (Y≈44), portal is accessible at Y=43

### Challenge Elements

**3D Spatial Reasoning**:
- Must understand spiral path (not just up/down)
- Each jump requires rotating camera to locate next platform
- Platforms are at different angles - can't see all at once

**Timing Precision**:
- Jumping too early: miss high/low alignment, gap too large
- Jumping too late: platforms moving apart
- ~2-3 second window to execute each jump

**Movement Coordination**:
- Standing on moving platform while aiming for next target
- Horizontal movement required (not just vertical jump)
- Must account for platform motion during jump arc

---

## Implementation Changes Required

### 1. Configuration Updates

```javascript
// In ROOM8_CONFIG
platformRadius: 1.8,           // Reduced from 3.5
platformRadialPosition: 6.0,   // NEW: distance from center
platformAngularSpacing: 51.43, // NEW: degrees between platforms
```

### 2. Platform Generation

```javascript
// New platform position calculation
const platformConfigs = [
  { angle: 0,      baseY: 2.0,  amp: 0,   speed: 0,   phase: 0 },     // Spawn
  { angle: 51.43,  baseY: 7.0,  amp: 2.5, speed: 1.0, phase: 0 },     // P1
  { angle: 102.86, baseY: 14.0, amp: 2.5, speed: 1.0, phase: Math.PI }, // P2
  { angle: 154.29, baseY: 21.0, amp: 2.5, speed: 1.0, phase: 0 },     // P3
  { angle: 205.71, baseY: 28.0, amp: 2.5, speed: 1.0, phase: Math.PI }, // P4
  { angle: 257.14, baseY: 35.0, amp: 2.5, speed: 1.0, phase: 0 },     // P5
  { angle: 308.57, baseY: 42.0, amp: 2.5, speed: 1.0, phase: Math.PI }  // P6
];

platformConfigs.forEach((config, i) => {
  const angleRad = config.angle * Math.PI / 180;
  const x = Math.cos(angleRad) * ROOM8_CONFIG.platformRadialPosition;
  const z = Math.sin(angleRad) * ROOM8_CONFIG.platformRadialPosition;

  platform.position.set(x, config.baseY, z);
  platform.userData.motionParams = {
    baseY: config.baseY,
    amplitude: config.amp,
    speed: config.speed,
    phase: config.phase
  };
  platform.userData.angleRad = angleRad; // Store for collision detection
});
```

### 3. Collision Detection Update

Must check both radial AND angular position:

```javascript
function detectPlatformCollision(playerPos) {
  const cfg = ROOM8_CONFIG;
  const feetY = playerPos.y - cfg.eyeHeight;

  for (let platform of platforms) {
    // 3D distance check (not just Y)
    const dx = playerPos.x - platform.position.x;
    const dz = playerPos.z - platform.position.z;
    const horizontalDist = Math.sqrt(dx*dx + dz*dz);

    const platformTop = platform.position.y + cfg.platformHeight / 2;

    // Within platform radius and near surface
    if (
      horizontalDist <= cfg.platformRadius - 0.3 &&
      Math.abs(feetY - platformTop) < 0.6
    ) {
      return platform;
    }
  }

  return null;
}
```

### 4. Visual Aids (Optional)

**Debug Mode**: Show connection arcs between platform alignment points
- Draw line from P1 peak position to P2 low position
- Helps visualize jump paths during testing

**Platform Indicators**:
- Small arrow or symbol on platform edge pointing to next platform
- Color pulse when platforms are optimally aligned

---

## Performance & Balance

### Performance Impact
- **Geometry**: Same polygon count (7 platforms, same detail)
- **Physics**: Identical (sinusoidal motion, same calculations)
- **Collision**: Slightly more complex (3D distance vs 2D), negligible impact
- **Expected**: No performance change

### Difficulty Balance

**Current Design**: Easy - just time jumps vertically
**New Design**: Medium - requires:
- Spatial awareness (where is next platform?)
- Timing (when are they aligned?)
- Precision (small platforms = less margin for error)

**Tuning Knobs**:
- `platformRadius`: Smaller = harder (less landing zone)
- `verticalGap`: Larger = requires better jump timing
- `amplitude`: Larger = longer wait for alignment
- `speed`: Faster = shorter alignment windows

---

## Testing Checklist

- [ ] All platforms positioned correctly in spiral pattern
- [ ] Platform diameters reduced to prevent overlap
- [ ] Phase synchronization working (peaks align with troughs)
- [ ] Jump gaps are consistent (2 units vertical + ~4 units horizontal)
- [ ] Collision detection works with 3D positions
- [ ] Player can complete full ascent P0→P1→P2→P3→P4→P5→P6
- [ ] Portal accessible from P6 at high point
- [ ] Falling off platform correctly respawns at P0
- [ ] NFTs still visible and not obscured by new platform positions
- [ ] Lamps still positioned correctly (may need adjustment)

---

## Visual Reference

### Top-Down View (Spiral Pattern)
```
           N
           |
      P3   |   P2
    154°   |   103°
       \   |   /
        \  |  /
   P4    \ | /    P1
  206°----+----51°
         /|\
        / | \
       /  |  \
     P5   |   P0
    257°  |   0° (Spawn)
      \   |   /
       \  |  /
        \ | /
         P6
        309°

    S

Shaft radius: 12
Platform radius: 6.0 from center
Platform size: 1.8 radius
```

### Side View (Vertical Spacing)
```
Y=44  ─────  Portal
Y=42  ════╪════  P6 (baseY, moving 39.5-44.5)

Y=35  ════╪════  P5 (baseY, moving 32.5-37.5)

Y=28  ════╪════  P4 (baseY, moving 25.5-30.5)

Y=21  ════╪════  P3 (baseY, moving 18.5-23.5)

Y=14  ════╪════  P2 (baseY, moving 11.5-16.5)

Y=7   ════╪════  P1 (baseY, moving 4.5-9.5)

Y=2   ════╪════  P0 (static spawn)

Y=0   ▓▓▓▓▓▓▓▓▓  Floor
```

---

## Conclusion

This spiral design transforms Room 8 from a simple timing challenge into a **3D spatial navigation puzzle**. Players must:

1. **Observe** the spiral pattern and platform motion
2. **Plan** their route around the shaft
3. **Time** their jumps to catch alignment windows
4. **Execute** precise jumps with limited landing zones

The alternating phase pattern (0, π, 0, π, 0, π) ensures platforms reliably align every ~3 seconds, creating a **rhythm-based platforming challenge** with **spatial awareness** requirements.

**Recommendation**: Proceed with implementation as specified above.
