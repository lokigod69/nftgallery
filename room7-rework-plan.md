# Room 7 Rework Plan: "Helix Crossing" NFT Platformer

## Current State
- 35 NFT images scattered randomly on floor
- No platforming mechanics
- Simple floor-walking with basic jump
- Portal at z=45

## Vision
Transform into a platforming challenge where NFTs ARE the platforms:
- Two intertwined helix/S-curve paths
- NFTs are elevated, jumpable platforms
- Fall to floor = respawn at start
- Must navigate from spawn to portal by jumping on NFT platforms

---

## Phase 1: Configuration & Constants Setup
**Goal**: Establish room configuration system

- [ ] Create ROOM7_CONFIG object with all parameters
- [ ] Define room dimensions (square, e.g., 60x60)
- [ ] Set platform/NFT sizes (larger, ~3-4 units)
- [ ] Configure platform heights (elevated ~2 units above floor)
- [ ] Set player physics (eyeHeight, jumpVelocity, gravity)
- [ ] Define spawn position (one end, opposite portal)
- [ ] Define portal position (other end)

---

## Phase 2: Helix Path Generation
**Goal**: Create the double-helix NFT platform layout

Mathematical approach for two intertwined S-curves:
- Path 1 (Left): Starts left, curves right, crosses center, curves left
- Path 2 (Right): Starts right, curves left, crosses center, curves right

```
Spawn [P]                                    Portal [X]
   |                                              |
   |    /--\      /--\      /--\                  |
   +---+    +----+    +----+    +----+------------+
       \--/      \--/      \--/
```

- [ ] Define parametric equations for helix paths
- [ ] Calculate platform positions along paths
- [ ] Ensure paths cross at regular intervals
- [ ] Paths reach ~50% room width at maximum amplitude
- [ ] Space platforms for challenging but fair jumps (~4-6 units apart)

---

## Phase 3: Platform System
**Goal**: Create NFT platforms player can stand on

- [ ] Create spawn platform (larger, at start position)
- [ ] Create end platform (larger, near portal)
- [ ] Generate NFT platforms along helix paths
- [ ] Each platform: elevated box with NFT texture on top
- [ ] Platform collision detection system
- [ ] Platform visual style (glowing edges, distinct look)

---

## Phase 4: Player Physics & Respawn
**Goal**: Implement platforming mechanics

- [ ] Platform collision detection (standing on platforms)
- [ ] Fall detection (touching floor level)
- [ ] Respawn system (reset to spawn platform on fall)
- [ ] Jump physics tuned for platform gaps
- [ ] Smooth landing transitions

---

## Phase 5: Visual Polish
**Goal**: Make it look good

- [ ] Keep starry ceiling effect
- [ ] Dark/void floor (danger zone)
- [ ] Platform lighting (each NFT platform glows)
- [ ] Ambient atmosphere
- [ ] Portal at end position

---

## Phase 6: Testing & Tuning
**Goal**: Make it playable and fun

- [ ] Test all jump distances
- [ ] Tune platform spacing
- [ ] Verify respawn works correctly
- [ ] Ensure all platforms are reachable
- [ ] Test portal functionality

---

## Technical Specifications

### Room Dimensions
- Floor size: 60 x 60 units
- Room is oriented along Z-axis (spawn at -Z, portal at +Z)

### Platform Layout
- Total platforms: ~20-25 (using available 35 images)
- Platform size: 3.5 x 3.5 units (can stand and view)
- Platform height: 2.0 units above floor
- Platform thickness: 0.5 units

### Helix Parameters
- Path length: ~50 units (Z direction)
- Maximum amplitude: 15 units (half of 30 from center to edge)
- Wavelength: ~20 units (2-3 full oscillations)
- Two paths, 180° out of phase

### Player Physics
- Eye height: 3.5 units
- Jump velocity: 12 (tuned for gaps)
- Gravity: -30
- Platform collision tolerance: 0.5 units

### Spawn & Portal
- Spawn: (0, platformHeight + eyeHeight, -25) on larger spawn platform
- Portal: (0, platformHeight + eyeHeight, 25) near end platform

---

## Implementation Order

1. **Phase 1**: Set up config (10 min)
2. **Phase 2**: Generate helix path coordinates (20 min)
3. **Phase 3**: Create platform meshes with NFTs (20 min)
4. **Phase 4**: Implement physics & respawn (20 min)
5. **Phase 5**: Visual polish (10 min)
6. **Phase 6**: Testing & tuning (ongoing)

Total estimated effort: ~80 minutes of implementation
