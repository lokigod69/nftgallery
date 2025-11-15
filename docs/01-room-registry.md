# Room Registry - NFT Gallery

Complete mapping of all rooms, their connections, and current status.

---

## Room 0: Ocean Entry Hub

**Route/Path**: `/` → redirects to `room0.html`

**Entry Files**:
- HTML: [room0.html](../room0.html)
- JavaScript: [room0.js](../room0.js)

**Description**:
Infinite ocean environment with a floating octagonal platform (22-unit radius). Features:
- Five wooden doors positioned around the platform perimeter
- Water shader with animated waves
- Sky with clouds
- Flower-of-life pattern on platform (highly transparent/glass-like)
- Camera starts at height 11.5 units

**NFT Content**: None (hub room)

**Portals OUT**:

| Label | Target | Position | Status | Notes |
|-------|--------|----------|--------|-------|
| Main Gallery | [room1.html](../room1.html) | North edge (z=22) | ✅ Working | Primary progression path |
| Undersea Observatory | [roomA.html](../roomA.html) | NE edge (15.56, 15.56) | ✅ Working | Branch A |
| NFT Gallery Room | [roomB.html](../roomB.html) | SE edge (15.56, -15.56) | ✅ Working | Branch B |
| Frame Waterfall Gallery | roomC.html | SW edge (-15.56, -15.56) | ❌ **BROKEN** | **File doesn't exist!** |
| Room D (Coming Soon) | future_roomD.html | NW edge (-15.56, 15.56) | ⚠️ Disabled | Intentionally blocked |

**Portals IN**:
- From Room 1
- From Room A
- From Room A1
- From Room B

**Status**: ✅ Working (but has broken link to Room C)

**Issues**:
- **CRITICAL**: Room C door references `roomC.html` which doesn't exist (neither .html nor .js files found)
- Room D is intentionally disabled with placeholder destination

---

## Room 1: Main Gallery

**Route/Path**: [room1.html](../room1.html)

**Entry Files**:
- HTML: [room1.html](../room1.html)
- JavaScript: [main.js](../main.js) ⚠️ Note: uses `main.js`, not `room1.js`

**Description**:
Traditional art gallery with grey photographic frames on walls. Features:
- Rectangular room (50x50 units)
- Wood-textured floor
- Divider wall in center
- NFT frames on perimeter walls and divider
- Teal portal back to Room 0
- Blue portal forward to Room 2

**NFT Content**:
- **NFT Range**: 1-28 (28 total NFTs)
- **Asset Paths**: `/assets/nft1.png` through `/assets/nft28.png`
- **Frame Style**: Grey photographic frames (2.0 x 3.0 x 0.2 units)
- **Picture Planes**: 1.8 x 2.7 units inside frames

**Portals OUT**:
| Target | Color | Position | Code Line |
|--------|-------|----------|-----------|
| [room0.html](../room0.html) | Teal (0x00ffff) | North side | [main.js:822](../main.js#L822) |
| [room2.html](../room2.html) | Blue (0x4444ff) | South side | [main.js:778](../main.js#L778) |

**Portals IN**:
- From Room 0
- From Room 2 (implied, not explicitly coded)

**Status**: ✅ Working

**Issues**: None identified

---

## Room 2: Gallery Continuation

**Route/Path**: [room2.html](../room2.html)

**Entry Files**:
- HTML: [room2.html](../room2.html)
- JavaScript: [room2.js](../room2.js)

**Description**:
Larger gallery space continuing the main exhibition flow. Features:
- Expanded room dimensions
- Similar grey frame aesthetic to Room 1
- Wood floor
- Portal progression system

**NFT Content**:
- **NFT Range**: 29-72 (44 total NFTs)
- **Asset Paths**: `/assets/nft29.png` through `/assets/nft72.png`
- **Frame Style**: Consistent with Room 1

**Portals OUT**:
| Target | Color | Code Line |
|--------|-------|-----------|
| [room3.html](../room3.html) | Green (0x44ff44) | [room2.js:882](../room2.js#L882) |

**Portals IN**:
- From Room 1

**Status**: ✅ Working

**Issues**:
- No explicit portal back to Room 1 (one-way flow may be intentional)

---

## Room 3: Large Cubic Gallery

**Route/Path**: [room3.html](../room3.html)
**Spawn Parameter Support**: `?spawn=safe` (entry from Room 4)

**Entry Files**:
- HTML: [room3.html](../room3.html)
- JavaScript: [room3.js](../room3.js)

**Description**:
Massive cubic gallery structure. Features:
- Large room (50x50 units)
- Cubic framing structure
- Copper-textured floor
- Tall walls creating cathedral-like space
- Bidirectional portals

**NFT Content**:
- **NFT Range**: 73-107 (35 total NFTs)
- **Asset Paths**: `/assets/nft73.png` through `/assets/nft107.png`

**Portals OUT**:
| Target | Color | Code Line | Notes |
|--------|-------|-----------|-------|
| [room2.html](../room2.html) | Blue | [room3.js:1239](../room3.js#L1239) | Back to Room 2 |
| [room4.html](../room4.html) | Purple | [room3.js:1252](../room3.js#L1252) | Forward to Room 4 |

**Portals IN**:
- From Room 2
- From Room 4 (with spawn point safety parameter)

**Status**: ✅ Working

**Issues**: None identified

---

## Room 4: Floating Island

**Route/Path**: [room4.html](../room4.html)

**Entry Files**:
- HTML: [room4.html](../room4.html)
- JavaScript: [room4.js](../room4.js)

**Description**:
Floating island in a sky environment. Features:
- Natural island terrain
- Sky background
- Atmospheric floating aesthetic
- NFT displays integrated into landscape

**NFT Content**:
- **NFT Range**: 108-127 (20 total NFTs)
- **Asset Paths**: `/assets/nft108.png` through `/assets/nft127.png`

**Portals OUT**:
| Target | Color | Code Line | Notes |
|--------|-------|-----------|-------|
| [room3.html?spawn=safe](../room3.html) | Purple | [room4.js:991](../room4.js#L991) | Uses spawn parameter |
| [room5.html](../room5.html) | Purple | [room4.js:1012](../room4.js#L1012) | To Eternal Eclipse |

**Portals IN**:
- From Room 3
- From Room 5

**Status**: ✅ Working

**Issues**: None identified

---

## Room 5: Eternal Eclipse

**Route/Path**: [room5.html](../room5.html)

**Entry Files**:
- HTML: [room5.html](../room5.html)
- JavaScript: [room5.js](../room5.js)

**Description**:
Dark atmospheric room with eclipse theme. Features:
- Circular room (30-unit radius, 20-unit height)
- Black background with fog
- Dark sun with corona effect at ceiling center
- Reflective silver mirror walls (highly reflective)
- Obsidian floor
- 12 double-sided floating NFT frames in dodecagon formation
- Atmospheric haze particles (1500 particles)
- Purple portal back to Room 4

**NFT Content**:
- **NFT Range**: 131-142 (12 total NFTs)
- **Asset Paths**: `/assets/nft131.png` through `/assets/nft142.png`
- **Display Style**: Double-sided floating frames (2.5 x 1.41 units)
- **Formation**: Dodecagon (12-sided polygon) at 60% room radius

**Portals OUT**:
| Target | Color | Position | Code Line | Notes |
|--------|-------|----------|-----------|-------|
| [room4.html](../room4.html) | Purple (0x8844aa) | (0, 5, 25) | [room5.js:~923](../room5.js) | Back to Room 4 |
| [room6.html](../room6.html) | Cyan (0x00ccff) | (0, 5, -25) | [room5.js:~946](../room5.js) | Video Corridor (optional branch) |

**Portals IN**:
- From Room 4
- From Room 6

**Status**: ✅ Working (Simple progression room: 4 ↔ 5 ↔ 6)

**Notes**:
- **NO LONGER A HUB**: Rooms 7, 8, 9 portals removed (2025-11-15)
- Simple progression: Room 4 → Room 5 → Room 6 (optional)
- Some NFT loading issues mentioned in comments (texture loading with fallbacks)
- Anti-flicker measures implemented

---

## Room 6: Video Corridor

**Route/Path**: [room6.html](../room6.html)

**Entry Files**:
- HTML: [room6.html](../room6.html)
- JavaScript: [room6.js](../room6.js)
- Bundle: 4.53 kB (1.94 kB gzip)

**Description**:
Linear corridor with curved ceiling featuring video displays. Features:
- Corridor dimensions: 100 units long × 20 units wide × 10 units height
- Curved cylindrical ceiling (dark metal, 0x222222, metalness 0.8)
- Metallic grey walls (0x444444, metalness 0.7)
- Dark metallic floor (0x333333, metalness 0.5)
- Video screens alternating on left/right walls
- Confined linear path with 0.5m boundary buffer

**NFT Content**: **None** - Uses video files instead

**Video Content**:
- **Count**: 13 video files (MP4 format)
- **Source Path**: `/assets/` (FIXED: was `/videos/`)
- **Files**: Amy1.mp4, Angel1.mp4, Anna1.mp4, April1.mp4, Cara1.mp4, Claire1.mp4, Cynthia2.mp4, Dasha1.mp4, Devon2.mp4, Huong1.mp4, Lucy1.mp4, Ruby1.mp4, Sarah1.mp4
- **Display**: 4m × 4m video planes, alternating left/right walls, ~7.7m apart
- **Position**: Eye height + 0.5m, rotated 90° to face inward
- **Performance**: Auto-playing videos (muted), uses VideoTexture (performance-intensive)

**Portals OUT**:
| Target | Color | Position | Code Line | Notes |
|--------|-------|----------|-----------|-------|
| [room5.html](../room5.html) | Cyan (0x00ccff) | (0, eyeHeight, -98) | [room6.js:~234](../room6.js) | ✅ Returns to Eternal Eclipse (Room 5) |

**Portals IN**:
- From Room 5 (cyan portal at position (0, eyeHeight, -25))

**Status**: ✅ **Working** - Connected to Room 5 progression path

**Technical Quirks**:
- Heavy asset load: Video files are highest-bandwidth content in gallery
- CPU/GPU intensive: Dynamic VideoTexture rendering for all 13 videos
- Auto-play trigger on first click event (line 120-129)
- No LOD optimization for videos
- Fixed asset paths recently corrected from `/videos/` to `/assets/`

**Issues**:
- **Performance**: All videos auto-start, no lazy loading or culling

---

## Room 7: Starry Gallery

**Route/Path**: [room7.html](../room7.html)

**Entry Files**:
- HTML: [room7.html](../room7.html)
- JavaScript: [room7.js](../room7.js)
- Bundle: 8.26 kB (2.84 kB gzip) - **LARGEST BUNDLE**

**Description**:
Dark atmospheric gallery with starry ceiling and dramatic lighting. Features:
- Large floor: 100×100 units, highly reflective black surface (metalness 1.0, roughness 0.1)
- Dark background with black fog (density 0.02)
- Starry particle system: 1000 white star particles scattered throughout space
- Dramatic lighting: 20 warm spotlights (0xffaa88) randomly positioned
- AI-generated art images on vertical display planes
- Deep space observatory aesthetic

**NFT Content**:
- **Count**: 38 PNG images
- **Source Path**: `/assets/Room7/`
- **Files**: AI-generated imagery with long descriptive filenames
  - Example: `lokigod69._A_female_model_standing_in_a_stark_monochrome_space__461d3cd1-91d2-4213-90e0-567676b9955d.png`
  - Example: `lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_4512005b-b6b4-48bf-8a1c-3739d9c4a119.png`
- **Display**: Vertical planes (3m × 4m), arranged around gallery space
- **Frame Style**: Minimal/frameless - direct image planes
- **Estimated Total Size**: ~4-7 MB per image (high-resolution AI art)

**Portals OUT**:
| Target | Color | Position | Code Line | Notes |
|--------|-------|----------|-----------|-------|
| [room0.html](../room0.html) | Teal (0x00ffff) | (0, eyeHeight, 45) | [room7.js:265](../room7.js#L265) | Returns to Ocean Hub |

**Portals IN**:
- ⚠️ **NONE** - Room 5 no longer has portal to Room 7 (removed 2025-11-15)

**Status**: ⚠️ **ORPHANED** - Room functional but no portal IN

**Technical Quirks**:
- **Heavy texture load**: 38 high-resolution PNG images (~150-300 MB total VRAM)
- **Expensive lighting**: 20 SpotLights with shadows (performance-intensive)
- **Particle system**: 1000 point particles (moderate CPU overhead)
- **Reflective floor**: High metalness + low roughness = expensive real-time reflections
- No texture loading fallbacks or error handling
- No LOD or culling optimization for images

**Issues**:
- ⚠️ **ORPHANED**: No way to reach from navigation (Room 5 portal removed 2025-11-15)
- **Performance**: Heavy VRAM usage from 38 high-res textures loaded simultaneously
- **Performance**: 20 spotlights with shadows can cause frame drops on lower-end GPUs
- **UX**: Dark aesthetic may make navigation difficult for some users

---

## Room 8: Liminal Passage (Geometric Tunnel)

**Route/Path**: [room8.html](../room8.html)

**Entry Files**:
- HTML: [room8.html](../room8.html)
- JavaScript: [room8.js](../room8.js)
- Bundle: 4.42 kB (1.93 kB gzip)

**Description**:
Abstract geometric tunnel serving as transitional space between Room 5 and the bonus content. Features:
- **Concept**: "Liminal Passage" - cool, meditative, minimal aesthetic
- **Tunnel dimensions**: 60m length × 6m radius
- **Atmosphere**: Dark blue-black background (0x0a0a12) with atmospheric fog
- **Floor walkway**: 3m wide path for navigation guidance
- **14 floating geometric forms**: Spheres, cubes, toruses, octahedrons, tetrahedrons
  - Cool color palette: blues, cyans, magentas, purples
  - Emissive materials with slow rotation animations
  - Distributed radially along tunnel length
- **Lighting**: 2 directional lights + 2 pulsing accent point lights
- **Materials**: Gradient iridescent materials (metalness 0.6, roughness 0.3)

**Content**:
- **Type**: Procedural geometric art
- **Count**: 14 floating 3D forms (5 geometry types × varied colors)
- **Display**: Radially positioned along tunnel with slow rotation
- **Materials**: Material-based with emissive properties (no external textures)
- **Performance**: Lightweight procedural geometry, no asset loading

**Portals OUT**:
| Target | Color | Position | Code Line | Notes |
|--------|-------|----------|-----------|-------|
| [room5.html](../room5.html) | Silver (0xaaaaaa) | (0, 2.5, 28) | [room8.js:208](../room8.js#L208) | ⚠️ **ORPHANED** - Room 5 portal to Room 8 removed |

**Portals IN**:
- ⚠️ **NONE** - Room 5 no longer has portal to Room 8 (removed 2025-11-15)

**Status**: ⚠️ **ORPHANED** - v1 redesign complete, but no portal IN

**Technical Details**:
- **Procedural content**: All forms generated via code, zero external assets
- **Performance optimized**: Simple geometries with efficient materials
- **Backside rendering**: Tunnel uses THREE.BackSide to show interior
- **Fog effect**: Atmospheric depth with Fog (near: 20, far: 50)
- **Animation**: Geometric forms rotate based on stored rotation speeds
- **Lighting animation**: Accent lights pulse with subtle sine wave variation

**Visual Identity**:
- **Tone**: Cool, synthetic, transitional
- **Colors**: Blue spectrum (0x4466ff, 0x66ffff, 0xff66ff, 0x6699ff, 0x9966ff)
- **Differentiation**: Contrasts with Room 9's warm organic aesthetic

---

## Room 9: Organic Tunnel (Bio-luminescent Passage)

**Route/Path**: [room9.html](../room9.html)

**Entry Files**:
- HTML: [room9.html](../room9.html)
- JavaScript: [room9.js](../room9.js)
- Bundle: 4.99 kB (2.21 kB gzip)

**Description**:
Natural, cave-like passage with bio-luminescent accents and embedded art surfaces. Features:
- **Concept**: "Organic Tunnel" - warm, mysterious, alive aesthetic
- **Tunnel dimensions**: 55m length with irregular organic segments
  - 12 segments with varying radius (5.5m ± 0.3-0.5m variation)
  - Warm brown HSL-based materials (hue 25-35°)
  - High roughness (0.9) for natural stone texture
- **16 embedded art alcoves**: Material-based "relief art" along tunnel walls
  - Recessed alcove backgrounds (1.8m × 1.8m)
  - Art surfaces with emissive accents (1.4m × 1.4m)
  - Warm earth tones: saddle brown, peru, olive drab, sea green, goldenrod
- **Bio-luminescent accents**: Small glowing spheres near each alcove
  - Alternating green and amber emissive materials
  - Subtle pulsing animation
- **8 bio-luminescent point lights** with breathing effect
- **Floor path**: 2.5m stone walkway (rough, dark material)

**Content**:
- **Type**: Procedural material-based art
- **Count**: 16 art alcoves with relief surfaces
- **Display**: Embedded in tunnel walls, radially distributed
- **Materials**: Emissive earth tones with warm glow (no external textures)
- **Performance**: Lightweight procedural geometry and materials

**Portals OUT**:
| Target | Color | Position | Code Line | Notes |
|--------|-------|----------|-----------|-------|
| [room5.html](../room5.html) | Lavender (0xaa88ff) | (0, 2.5, 25.5) | [room9.js:263](../room9.js#L263) | ⚠️ **ORPHANED** - Room 5 portal to Room 9 removed |

**Portals IN**:
- ⚠️ **NONE** - Room 5 no longer has portal to Room 9 (removed 2025-11-15)

**Status**: ⚠️ **ORPHANED** - v1 redesign complete, but no portal IN

**Technical Details**:
- **Organic geometry**: 12 cylinder segments with radius variation
- **Procedural materials**: HSL color generation for warm earth tones
- **Bio-luminescent lighting**: 8 point lights with breathing animation
  - Intensity pulsing via sine wave (0.8 × breathe factor)
  - Phase-shifted for natural variation
- **Backside rendering**: Segments use THREE.BackSide for interior view
- **Emissive animation**: Alcove accents pulse independently
- **Performance**: No texture loading, all procedural materials

**Visual Identity**:
- **Tone**: Warm, natural, mysterious
- **Colors**: Earth spectrum (browns, ambers, greens, golds)
- **Differentiation**: Contrasts with Room 8's cool geometric aesthetic
- **Unique implementation**: Zero code overlap with Room 8

---

## Room 10: The Ascent (Room X - Challenge Arena)

**Route/Path**: [room10.html](../room10.html)

**Entry Files**:
- HTML: [room10.html](../room10.html)
- JavaScript: [room10.js](../room10.js)
- Bundle: 5.29 kB (2.37 kB gzip)

**Description**:
Legendary challenge room featuring a gigantic hollow sphere with vertical jump puzzle. Features:
- **Concept**: "The Ascent" - Epic spherical arena where players must climb floating platforms to escape
- **Sphere dimensions**: 70-unit radius hollow sphere
- **Atmosphere**: Deep space aesthetic with starfield (0x000510 background, atmospheric fog)
- **28 floating platforms** arranged in spiral path from bottom to top
  - Hexagonal platforms (2.5-unit radius, 0.4-unit height)
  - Color gradient from cool blues (bottom) to warm oranges (top)
  - Emissive materials with subtle floating animation
  - Radial spiral distribution (3.5 full rotations)
  - Vertical climb height: ~112 units
- **Jump mechanics**: Physics-based platforming with tunable constants
  - Jump velocity: 12.0 units/sec
  - Gravity: -25.0 units/sec²
  - Max jump height: ~3.0 units
  - Max horizontal jump distance: ~4.5 units
- **800 star particles** scattered across sphere interior
- **Visual portal at top** with "ESCAPE" text (non-functional)
- **Death plane**: Fall too far → respawn at start

**Content**:
- **Type**: Procedural platforming challenge
- **Count**: 28 hexagonal platforms with gradient materials
- **Display**: Spiral path ascending through sphere interior
- **Materials**: HSL-generated emissive materials (procedural, no textures)
- **Performance**: Lightweight procedural geometry, efficient animations

**Portals OUT**:
| Target | Color | Position | Code Line | Notes |
|--------|-------|----------|-----------|-------|
| TBD | TBD | Top of sphere | [room10.js:~257](../room10.js) | ⚠️ **VISUAL ONLY** - Portal not functional yet |

**Portals IN**:
- ⚠️ **NONE** - Room not yet wired into navigation graph

**Status**: ✅ **Working** - Self-contained challenge room (not connected to navigation)

**Technical Details**:
- **Hollow sphere rendering**: Starfield interior with BackSide material
- **Platform generation**: Algorithmic spiral path (not hardcoded positions)
- **Collision detection**: Custom platform collision system
  - Horizontal radius check + vertical distance check
  - Landing feedback via emissive intensity pulse
- **Physics system**: Custom gravity and jump velocity implementation
- **Respawn mechanic**: Death plane at y < -80 units
- **Lighting**: 6 lights total (ambient + 2 directional + 2 side + spawn + goal point lights)
- **Animations**:
  - Platforms: Subtle floating motion (sine wave)
  - Portal: Standard portal rotation
  - "ESCAPE" text: Pulsing opacity
  - Star field: Slow rotation
  - Goal light: Intensity pulsing

**Visual Identity**:
- **Tone**: Epic, vast, mysterious, challenging
- **Colors**: Deep space blues transitioning to warm escape glow
- **Differentiation**: Only vertical platforming challenge in gallery

**Challenge Design**:
- **Difficulty**: Legendary - requires precise jumping and spatial awareness
- **Path finding**: Spiral pattern provides clear visual guidance
- **Risk/reward**: Death plane enforces consequence of falling
- **Goal**: Reach portal at top (~112 units vertical climb)

---

## Room A: Undersea Observatory

**Route/Path**: [roomA.html](../roomA.html)

**Entry Files**:
- HTML: [roomA.html](../roomA.html)
- JavaScript: [roomA.js](../roomA.js)

**Description**:
Underwater dome environment with video screens. Features:
- Domed glass observatory structure
- Underwater caustic lighting effects
- Animated fish models (GLB/GLTF)
- Blue/teal aquatic color scheme
- 17 video frames on walls
- Water particle effects

**NFT Content**: **None** - Uses video files instead

**Video Content**:
- **Count**: 17 video files
- **Source Path**: `/assets/` (vid1.mp4 through vid17.mp4)
- **Display**: Video frames arranged on observatory walls

**Portals OUT**:
| Target | Color | Code Line | Notes |
|--------|-------|-----------|-------|
| [room0.html](../room0.html) | Teal | [roomA.js:1626](../roomA.js#L1626) | Back to Ocean Hub |
| [roomA1.html](../roomA1.html) | - | [roomA.js:1647](../roomA.js#L1647) | To Room A1 |

**Portals IN**:
- From Room 0

**Status**: ⚠️ **Partially Working**

**Issues**:
- **CRITICAL**: Portal to roomA1.html exists but **roomA1.html doesn't exist** (only roomA1.js found)
- Missing HTML entry point for Room A1

---

## Room A1: Observatory Annex

**Route/Path**: [roomA1.html](../roomA1.html)

**Entry Files**:
- HTML: ✅ [roomA1.html](../roomA1.html) **FIXED**
- JavaScript: ✅ [roomA1.js](../roomA1.js)

**Description**:
Large gallery room serving as an annex to the Undersea Observatory (Room A). Features:
- Dimensions: 120x120 units × 60 units height
- Light blue sky background
- Wood floor with mosaic pattern
- High ceilings
- GLB model loading capability
- PointerLock controls for movement

**NFT Content**: Wall-mounted NFT frames (specific range TBD in JS implementation)

**Portals OUT**:
| Target | Code Line |
|--------|-----------|
| [roomA.html](../roomA.html) | [roomA1.js:720](../roomA1.js#L720) |

**Portals IN**:
- From Room A (Undersea Observatory)

**Status**: ✅ **Working** - Fixed by creating missing HTML entry point

**Issues**: None - Portal from Room A now works correctly

---

## Room B: Musical Journey

**Route/Path**: [roomB.html](../roomB.html)

**Entry Files**:
- HTML: [roomB.html](../roomB.html)
- JavaScript: [roomB.js](../roomB.js)

**Description**:
Audiovisual world with music and dense visual content. Features:
- Dimensions: 120x120 units × 60 units height
- Light blue sky background
- Wood floor with mosaic pattern (wood_floor2 + wood_floor1 inlays)
- Metal2.jpeg textured walls
- Mirror ceiling (reflective using CubeCamera)
- 60 NFT frames scattered across all walls
- Copper tile decorations interspersed
- Floating/jumping mechanic with special "hover zone" near ceiling
- Audio player (songroomB.mp3)
- GLB model loading (aviary_gallery.glb)

**NFT Content**:
- **Count**: 60 NFT images
- **Source Path**: `/assets/RoomB/`
- **Files**: B1.png through B60.png
- **Display**: Randomly scattered across all 4 walls
- **Frame Size**: Variable (7-13 units base size, aspect ratio preserved)
- **Positioning**: Prevents overlaps using position registry system

**Portal Details**:
| Target | Color | Position | Code Line |
|--------|-------|----------|-----------|
| [room0.html](../room0.html) | Teal (0x00aaaa) | Back wall center | [roomB.js:1505](../roomB.js#L1505) |

**Portals IN**:
- From Room 0

**Status**: ✅ Working

**Issues**:
- Complex copper tile placement may have performance impact
- GLB model path may not exist (`/assets/aviary_gallery.glb`)
- Audio file path (`/assets/songroomB.mp4`) may not exist

---

## Room C: Frame Waterfall Gallery (Concept Chamber)

**Route/Path**: [roomC.html](../roomC.html)

**Entry Files**:
- HTML: ✅ [roomC.html](../roomC.html) **CREATED**
- JavaScript: ✅ [roomC.js](../roomC.js) **CREATED**

**Description**:
Concept chamber with dark industrial aesthetic. A work-in-progress room featuring:
- Dimensions: 30×40 units × 8 units height
- Dark blue-grey background (0x1a1a2e) with fog
- Metallic dark floor and industrial walls
- Moody atmospheric lighting with colored point lights (blue and red)
- "CONCEPT CHAMBER - Work in Progress" sign on north wall

**NFT Content**:
- **NFT Range**: 50-55 (6 total NFTs)
- **Asset Paths**: `/assets/nft50.png` through `/assets/nft55.png`
- **Display**: 3 frames on north wall, 3 frames on east wall
- **Frame Style**: Dark grey metallic frames (2.5 x 3.5 x 0.15 units)

**Portals OUT**:
| Target | Color | Position | Description |
|--------|-------|----------|-------------|
| [room0.html](../room0.html) | Teal (0x00ffff) | South wall | Back to Ocean Hub |

**Portals IN**:
- From Room 0 (SW door)

**Status**: ✅ **Working** - Newly created as functional stub room

**Issues**: None - Portal from Room 0 now works correctly. Room is intentionally minimal as a "work in progress" concept space.

---

## Room D: Coming Soon (Intentionally Disabled)

**Route/Path**: future_roomD.html (placeholder)

**Entry Files**: None (intentionally not created)

**Description**: Placeholder for future content

**NFT Content**: N/A

**Portals OUT**: N/A

**Portals IN**:
- Room 0 NW door (blocked with alert message)

**Status**: ⚠️ **Disabled** - Intentional

**Issues**: None - Working as intended (disabled state)

---

## React Scaffold Rooms (Future - Not Integrated)

### Room 10: Minimalist Cube Gallery

**Entry Files**:
- Component: [rooms/10/Room10Scene.tsx](../rooms/10/Room10Scene.tsx)
- No HTML entry point

**Description**: React/TypeScript scaffold for floating cube gallery

**Status**: 🚧 **Not Integrated** - Scaffold only

**Issues**: Not connected to navigation, uses placeholder grey images

---

### Room 11: Gravity-Defying Cube

**Entry Files**:
- Component: [rooms/11/Room11Scene.tsx](../rooms/11/Room11Scene.tsx)
- No HTML entry point

**Description**: React/TypeScript scaffold with central rotating cube

**Status**: 🚧 **Not Integrated** - Scaffold only

**Issues**: Not connected to navigation, uses placeholder grey images

---

### Room 12: Spherical Gallery

**Entry Files**:
- Component: [rooms/12/Room12Scene.tsx](../rooms/12/Room12Scene.tsx)
- No HTML entry point

**Description**: React/TypeScript scaffold with spherical NFT arrangement

**Status**: 🚧 **Not Integrated** - Scaffold only

**Issues**: Not connected to navigation, uses placeholder grey images

---

## Summary Statistics

### Room Count

| Category | Count | Rooms |
|----------|-------|-------|
| **Fully Working** | 12 | Room 0, 1, 2, 3, 4, 5, 6, A, A1, B, C, 10 (direct URL) |
| **Orphaned** (no portals IN) | 4 | Room 7, 8, 9 (Room 5 hub removed), Room 10 (intentional) |
| **Broken** (missing files) | 0 | None - All fixed! |
| **Disabled** (intentional) | 1 | Room D |
| **Future** (React scaffolds) | 2 | Room 11, 12 |
| **Total Implemented** | 16 | - |

### NFT Distribution

| Room | NFT Range | Count | Status |
|------|-----------|-------|--------|
| Room 0 | None | 0 | Hub room |
| Room 1 | 1-28 | 28 | ✅ |
| Room 2 | 29-72 | 44 | ✅ |
| Room 3 | 73-107 | 35 | ✅ |
| Room 4 | 108-127 | 20 | ✅ |
| Room 5 | 131-142 | 12 | ✅ |
| Room 6 | Videos | 13 videos | ✅ (via Room 5) |
| Room 7 | Room7 folder | ~20+ | ⚠️ ORPHANED (Room 5 hub removed) |
| Room 8 | Geometric art | 14 forms | ⚠️ ORPHANED (Room 5 hub removed) |
| Room 9 | Material art | 16 alcoves | ⚠️ ORPHANED (Room 5 hub removed) |
| Room 10 | Platforming | 28 platforms | ⚠️ ORPHANED (not wired yet) |
| Room A | Videos | 17 videos | ✅ |
| Room A1 | TBD | TBD | ✅ Fixed |
| Room B | RoomB/B1-B60 | 60 | ✅ |
| Room C | 50-55 | 6 | ✅ Created |
| **Total NFT Images** | **1-142 + specials** | **245+** | Mixed |

### Critical Issues Summary

1. ~~**Room C**: Door in Room 0 points to non-existent roomC.html~~ **FIXED** - Created roomC.html and roomC.js
2. ~~**Room A1**: Room A portal points to non-existent roomA1.html~~ **FIXED** - Created roomA1.html
3. ~~**Rooms 6, 7, 8, 9**: Completely orphaned, no way to reach via navigation~~ **CHANGED** - Room 5 hub removed, only Room 6 accessible
4. ~~**Rooms 6, 7, 8, 9**: All have BROKEN return portals (connect to Room 0 instead of Room 5)~~ **FIXED** - All now return to Room 5
5. ~~**Rooms 8, 9**: Missing NFT assets (`/assets/nft{1-40}.png` do not exist)~~ **FIXED** - Redesigned with procedural content
6. ~~**Room 9**: Complete code duplication with Room 8 (maintenance debt)~~ **FIXED** - Unique implementation, zero code overlap
7. ⚠️ **NEW: Rooms 7, 8, 9**: Now orphaned - Room 5 hub removed (2025-11-15), no portal IN
8. ⚠️ **Room 7**: Heavy performance issues (38 high-res textures, 20 spotlights, 1000 particles)
9. **NFT gap**: Room 5 uses 131-142, skipping 128-130
10. **Asset path confusion**: Multiple asset directories (/, /assets/, /public/assets/, /assets/Room7/, /assets/RoomB/, /assets/RoomC/)

---

## Navigation Graph

```
┌──────────────────────────────────────────────────────────────────┐
│                         ROOM 0                                   │
│                      (Ocean Hub)                                 │
│                                                                  │
│  [Main Gallery] [Observatory] [Gallery B] [Concept] [DISABLED]  │
└──┬──────────────┬────────────┬───────────┬──────────┬───────────┘
   │              │            │           │          │
   │              │            │           │          └─> Room D
   │              │            │           │              (disabled)
   │              │            │           │
   │              │            │           └─> Room C ✅
   │              │            │               (Concept Chamber)
   │              │            │               └─> Back to Room 0 ⚠️
   │              │            │
   │              │            └─> Room B ✅
   │              │                └─> Back to Room 0 ✅
   │              │
   │              └─> Room A ✅
   │                  ├─> Back to Room 0 ✅
   │                  └─> Room A1 ✅ (Observatory Annex)
   │                      └─> Back to Room A ✅
   │
   └─> Room 1 ✅ (Main Gallery)
       ├─> Back to Room 0 ✅
       └─> Room 2 ✅
           ├─> Back to Room 1 ✅
           └─> Room 3 ✅
               ├─> Back to Room 2 ✅
               └─> Room 4 ✅ (Floating Island)
                   ├─> Back to Room 3 ✅
                   └─> Room 5 ✅ (Eternal Eclipse - Simple Progression)
                       ├─> Back to Room 4 ✅
                       │
                       └─> Room 6 ✅ (Video Corridor - Optional Branch)
                           └─> Back to Room 5 ✅


NAVIGATION FLOW SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Main Progression: Room 0 → 1 ↔ 2 ↔ 3 → 4 → 5 ↔ 6 (optional)

Branch Paths:     Room 0 → A ↔ A1
                  Room 0 → B
                  Room 0 → C

⚠️  ROOM 5 HUB REMOVED (2025-11-15):
   - Room 5 NO LONGER connects to Rooms 7, 8, 9
   - Simple progression: Room 4 ↔ Room 5 ↔ Room 6 only
   - Rooms 7, 8, 9 now ORPHANED (no portal IN)


ORPHANED ROOMS (no portal IN - accessible via direct URL or nav menu only):
┌────────────────────────────────────────────────────────────────┐
│ Room 7: Starry Gallery        │ Room 8: Liminal Passage       │
│ ⚠️ No IN (Room 5 hub removed) │ ⚠️ No IN (Room 5 hub removed) │
│ Portal OUT → Room 0            │ Portal OUT → Room 5           │
│ Direct URL: room7.html         │ Direct URL: room8.html        │
├────────────────────────────────┼───────────────────────────────┤
│ Room 9: Organic Tunnel         │ Room X: The Ascent            │
│ ⚠️ No IN (Room 5 hub removed) │ ⚠️ No IN (intentional)        │
│ Portal OUT → Room 5            │ Portal OUT → TBD              │
│ Direct URL: room9.html         │ Direct URL: room10.html       │
└────────────────────────────────┴───────────────────────────────┘

FUTURE ROOMS (React scaffolds, not integrated):
┌───────────┐  ┌───────────┐
│ Room 11   │  │ Room 12   │
│ (Gravity) │  │ (Sphere)  │
└───────────┘  └───────────┘
  🚧 Scaffold    🚧 Scaffold
```
