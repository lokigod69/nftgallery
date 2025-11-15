# Room 6-9 Redesign Briefs - Future Visual & Content Overhaul

High-level design direction for transforming Rooms 6-9 from placeholder/early-draft state into polished, content-rich gallery spaces.

**Status**: 📋 **PLANNING PHASE** - No implementation yet

**Purpose**: Provide clear design briefs for future implementation passes so they don't have to guess at intent or direction.

---

## Room 6: Video Corridor

### Current State

Room 6 is a 100-unit long metallic corridor with 13 auto-playing video files displayed on alternating walls. The corridor uses a curved cylindrical ceiling with dark industrial materials (metallic greys, dark floor). Videos are 4m × 4m planes positioned at eye height + 0.5m. The room suffers from significant performance issues due to 13 concurrent video streams with no optimization (4.53 kB bundle, ~150-300 MB video data).

### Target Concept

**"Cinematic Gallery" - Immersive video art tunnel with sequential discovery**

Transform into a premium video art experience that feels like walking through a curated film festival. The corridor should evoke a sense of progression and discovery, with videos acting as windows into different narratives or artistic visions. The space should feel intentional and curated, not just a technical showcase.

### Design Direction

**Emotional Tone**:
- Contemplative and immersive
- Cinematic atmosphere (low lighting, focused attention)
- Sense of curation and intentionality
- Quiet discovery (videos tell their own stories)

**Visual Aesthetic**:
- **Materials**: Keep dark industrial theme but add warmth
  - Black matte walls with subtle texture
  - Polished concrete floor with reflections
  - Soft ambient lighting (not harsh metallics)
- **Video Frames**: Add premium framing
  - Thin LED borders around video screens (subtle glow)
  - Depth/shadow behind screens (not flat on wall)
  - Screens slightly recessed into walls
- **Atmosphere**: Cinematic mood
  - Dim ambient light with focused spotlights on videos
  - Subtle fog/haze for depth
  - Sound zones (audio fades in/out as you approach each video)

**Content Strategy**:
- **Target Video Count**: 8-10 videos (down from 13)
  - Fewer videos = better performance + more intentional curation
  - Allows each video to have more impact
- **Video Selection Criteria**:
  - High-quality, artisticfilm content
  - Consistent thematic thread or visual style
  - Each video should feel essential (not filler)
- **Display Format**:
  - 16:9 or cinematic aspect ratios (not square)
  - Consistent sizing: 3m × 1.7m (cinematic proportions)
  - Alternating sides with rhythm/pacing

**Special Mechanics**:
- **Progressive Loading**: Videos load/play only when player is within 15 units
- **Pause Culling**: Videos behind player pause to save resources
- **Audio Zones**: Each video has spatial audio that fades in as you approach (5-unit radius)
- **Sequential Experience**: Videos arranged to create a narrative flow (if applicable)
- **Interaction**: Optional - Press 'E' to make video fullscreen with audio

**Technical Constraints**:
- **Performance Budget**: Max 3-4 concurrent video streams at any time
  - Use distance-based loading/unloading
  - Lower resolution videos (1080p max, ideally 720p)
  - Compressed format (H.264 or VP9)
- **Bundle Size**: Keep under 6 kB
- **Video Assets**: Max 50 MB total for all videos
- **Frame Rate Target**: 60 FPS on mid-range hardware
- **Mobile Support**: Fallback to static images or heavily compressed videos on mobile

**Future Enhancements**:
- Video thumbnails/posters when not playing
- Title cards or artist info near each screen
- Optional audio toggle (mute/unmute all)
- Video playlist system (cycle through different collections)

---

## Room 7: Starry Gallery

### Current State

Room 7 is a dark atmospheric space with a 100×100 unit reflective black floor, 1000 white star particles scattered in space, and 20 warm spotlights illuminating 38 high-resolution PNG images from AI-generated art. The room has serious performance issues: 8.26 kB bundle (largest), 150-300 MB VRAM for textures, expensive spotlight shadows, and a highly reflective floor. Visual aesthetic is "deep space observatory" but lacks cohesion.

### Target Concept

**"Cosmic Observatory" - Quiet, contemplative deep-space gallery with celestial focus**

Evoke the feeling of floating in deep space while viewing art - a serene, otherworldly experience. The room should feel vast yet intimate, with art pieces illuminated like constellations. Focus should be on the art, not the spectacle of effects. High contrast between dark void and illuminated art creates drama without chaos.

### Design Direction

**Emotional Tone**:
- Calm and meditative (not overwhelming)
- Sense of vastness and isolation
- Focused attention on individual artworks
- Ethereal, otherworldly ambiance
- Quiet contemplation (anti-frenetic)

**Visual Aesthetic**:
- **Background**: Keep black void but add depth
  - Deep space skybox (subtle nebula textures)
  - Distance fog to create atmosphere
  - No harsh boundaries (infinite void feeling)
- **Floor**: Reduce reflectivity for performance
  - Dark grey (not pure black) with low roughness (0.3-0.4)
  - Subtle texture (not mirror-like)
  - Optional: Faint constellation pattern mapped onto floor
- **Lighting**: Dramatically reduce and focus
  - 6-8 spotlights max (down from 20)
  - Each light illuminates 1-2 artworks
  - Warm white (not colored) for accurate art representation
  - Disable shadows or use baked lightmaps
- **Particles**: Reduce and enhance
  - 300-500 stars (down from 1000)
  - Varying sizes (depth cue)
  - Subtle twinkling animation
  - Optional: Shooting star effect (rare, non-distracting)

**Content Strategy**:
- **Target NFT Count**: 20-24 pieces (down from 38)
  - Curated selection of highest-quality AI art
  - Remove duplicates or lower-quality pieces
  - Focus on thematic consistency
- **Art Selection Criteria**:
  - High visual impact pieces
  - Cohesive style or theme (surreal, cosmic, figurative, etc.)
  - Strong contrast (works well in dark environment)
- **Display Format**:
  - Floating frames in 3D space (not wall-mounted)
  - Varied distances create depth
  - Orbital or spiral arrangement (not grid)
  - Frames glow subtly (0x444488 blue-white)

**Special Mechanics**:
- **Gallery Path**: Suggested walking route through pieces
  - Subtle floor indicators or light path
  - Sequential discovery (not overwhelming all at once)
- **Focal Points**: 3-4 "hero" pieces
  - Larger scale (5m × 7m)
  - Premium lighting
  - Positioned at key viewpoints
- **Dynamic Lighting**: Lights slowly shift intensity (breathing effect)
- **Artwork Info**: Hover prompts show title/artist (if metadata available)

**Technical Constraints**:
- **Performance Budget**: 60 FPS on mid-range hardware mandatory
  - Texture budget: Max 80 MB VRAM total
  - Compress textures: WebP or basis format
  - Max resolution: 2048px longest side
- **Bundle Size**: Target 6 kB (down from 8.26 kB)
- **Lighting**: Max 8 dynamic lights total
  - No shadows or use static shadow maps
  - Consider baked lighting for static elements
- **Particles**: GPU particle system (instanced, not individual objects)
- **Floor Material**: Metalness 0.3-0.5 max (not 1.0)

**Future Enhancements**:
- Slow camera drift/float effect (optional cinematic mode)
- Constellation lines connecting certain artworks
- Audio ambiance (deep space hum, subtle musical tones)
- Seasonal art rotation (swap in new pieces periodically)

---

## Room 8: Cylindrical Corridor (Abstract Art Space)

### Current State

Room 8 is a minimal cylindrical tunnel (5m radius × 50m length) with a grey metallic shell, central walkway, and glass floor strips. It references 40 NFT assets that don't exist (`/assets/nft{1-40}.png`), resulting in an empty geometric space with only the cylinder visible. The room has the smallest bundle (4.05 kB) and simplest geometry but no actual content. Room 9 is a byte-for-byte duplicate, creating maintenance debt.

### Target Concept

**"Liminal Passage" - Abstract geometric space emphasizing form over content**

Embrace the minimal aesthetic and transform this into an intentional artistic statement about geometry, space, and transition. Rather than fighting the empty feeling, lean into it - create a contemplative liminal space that serves as a palate cleanser between richer galleries. The tunnel is the art, not just a container for art.

### Design Direction

**Emotional Tone**:
- Liminal and transitional (in-between spaces)
- Minimal and meditative
- Focus on spatial awareness and geometry
- Gentle, not jarring or empty
- Breathing room after content-heavy galleries

**Visual Aesthetic**:
- **Core Geometry**: Keep cylindrical tunnel but refine
  - Increase radius slightly (6-7m for more breathing room)
  - Smooth transitions at entry/exit
  - Subtle segmentation (not uniform tube)
- **Materials**: Elevate from "test geometry" to intentional design
  - Gradient materials (not flat grey)
  - Iridescent or pearlescent finish (color shifts with viewing angle)
  - Soft metallic (brushed aluminum aesthetic)
  - Glass floor strips with subtle color tint (cool blue-green)
- **Lighting**: Create depth and movement
  - Moving light bands along tunnel walls (slow scan effect)
  - Ambient colored lighting (cool tones: blue, teal, violet)
  - Light at tunnel end (destination indicator)
- **Details**: Add subtle visual interest
  - Thin glowing lines along tunnel length (guide rails)
  - Floating geometric forms (spheres, cubes) at intervals
  - Reflections in glass floor create infinity effect

**Content Strategy**:
- **Primary Content**: Geometric forms as art
  - 12-15 floating abstract shapes along tunnel
  - Varied sizes (0.5m - 2m)
  - Simple geometries: spheres, cubes, toruses, platonic solids
  - Materials: Metallic, glass, holographic
  - Slow rotation animations
- **Secondary Content** (Optional NFTs):
  - **Target NFT Count**: 8-12 pieces (if adding NFTs at all)
  - Small format (1m × 1m) integrated into geometry
  - Abstract or minimalist NFTs only (fits aesthetic)
  - Alternative: Procedural generative art instead of static NFTs

**Special Mechanics**:
- **Movement Feel**: Adjust player speed
  - Slightly faster movement (1.3x normal)
  - Smooth acceleration/deceleration
  - Creates sense of flow/transition
- **Spatial Audio**: Tunnel acoustics
  - Reverb and echo effects
  - Sound changes as you move (entrance → middle → exit)
  - Low ambient hum (mechanical or tonal)
- **Geometric Animation**: Shapes respond to proximity
  - Subtle rotation speed changes as player approaches
  - Glow intensity increases when near
  - Creates interactive feel without explicit interaction

**Technical Constraints**:
- **Performance**: Maintain as lightest room
  - Bundle size: Keep under 5 kB
  - Minimal texture usage (procedural materials preferred)
  - Instanced geometry for repeated forms
  - 60 FPS guaranteed (simplest performance profile)
- **Asset Count**: If using NFTs
  - Max 12 NFT textures
  - Max 1024px resolution
  - Compressed formats only
- **Geometry Complexity**: Keep simple
  - Low poly count for shapes (under 10k triangles total)
  - Use shader effects for visual interest (not geometry)

**Future Enhancements**:
- Procedural tunnel generation (varied each visit)
- Music visualization (shapes react to audio)
- Alternative paths (tunnel branches)
- VR-optimized version (excellent simple geometry)

---

## Room 9: Cylindrical Tunnel (Future Differentiation)

### Current State

Room 9 is currently a byte-for-byte duplicate of Room 8 - identical code, geometry, materials, and missing NFT references. This creates maintenance debt (bugs must be fixed twice), user confusion (seeing the same room twice), and wasted bundle size (4.40 kB duplicate). It offers no differentiation or unique value in its current form.

### Target Concept

**Two Possible Directions:**

**Option A: "Organic Tunnel" - Natural counterpoint to Room 8's geometric minimalism**

If Room 8 becomes a refined geometric/minimal space, Room 9 should be its organic opposite - flowing, natural forms that contrast with Room 8's hard edges. Think: cave passage, underwater tunnel, or organic growth structures.

**Option B: "Glitch Corridor" - Digital/corrupted aesthetic**

A deliberately "broken" or glitched space that plays with digital artifact aesthetics - pixelation, chromatic aberration, geometry distortion. Artistic statement about digital art and its imperfections.

**Recommendation**: **Option A** (Organic Tunnel) provides better thematic variety and complements Room 8 nicely.

### Design Direction (Option A: Organic Tunnel)

**Emotional Tone**:
- Natural and flowing (opposite of Room 8's rigidity)
- Slightly mysterious or alien
- Sense of discovery (exploring cave/underwater passage)
- Organic growth feeling
- Warmer, more alive than Room 8

**Visual Aesthetic**:
- **Core Geometry**: Irregular organic tunnel
  - Variable radius (4m - 8m, flowing transitions)
  - Irregular walls (not perfect cylinder)
  - Organic bumps, ridges, and variations
  - Curved, flowing path (not straight line)
- **Materials**: Natural/organic textures
  - Rock or coral-like surfaces
  - Bioluminescent elements (glowing patterns)
  - Water or moisture effects
  - Moss or organic growth textures
  - Warm earth tones: browns, greens, soft oranges
- **Lighting**: Naturalistic and atmospheric
  - Bioluminescent glow from walls (blue-green, soft purple)
  - Dappled light effects (filtered through water/foliage)
  - Warm ambient light from tunnel end
  - Volumetric fog/god rays
- **Details**: Organic elements
  - Hanging vines or tendrils (simple geometry)
  - Crystalline formations (glowing)
  - Water droplets or particles
  - Subtle animation (swaying, pulsing glow)

**Content Strategy**:
- **Primary Content**: Environmental storytelling
  - NFTs integrated into environment (not floating)
  - Art pieces appear as murals, cave paintings, or natural formations
  - 10-15 pieces arranged organically (not grid)
- **Target NFT Count**: 12-16 pieces
  - Natural/organic themed NFTs preferred
  - Abstract landscapes
  - Bio-art or generative organic forms
  - Earthy color palettes
- **Display Format**:
  - Embedded in walls (part of environment)
  - Irregular sizes and shapes
  - Framed by natural formations (rock arches, crystal frames)

**Special Mechanics**:
- **Atmospheric Sound**: Nature sounds
  - Water dripping
  - Ambient cave acoustics
  - Subtle creature sounds (distant, not scary)
  - Wind or breath-like ambiance
- **Environmental Animation**:
  - Slow camera sway (organic movement feeling)
  - Bioluminescence pulses in waves
  - Particle effects (floating spores, water droplets)
- **Discovery Moments**: Hidden alcoves
  - Side passages with single special piece
  - Rewards exploration off main path

**Technical Constraints**:
- **Performance**: Similar budget to Room 8
  - Bundle target: 5-6 kB
  - Use shader effects for organic look (not complex geometry)
  - Texture compression mandatory
  - 60 FPS on mid-range hardware
- **Geometry**: Organic but optimized
  - Procedural noise-based wall deformation
  - Low poly base mesh with normal maps for detail
  - Instanced small elements (vines, crystals)
- **Lighting**: Baked where possible
  - Static lightmaps for base lighting
  - Few dynamic lights (3-5 point lights max)
  - Emissive materials for bioluminescence (cheaper than lights)

**Differentiation from Room 8**:
- **Geometry**: Organic vs. geometric
- **Color Palette**: Warm earth tones vs. cool metallics
- **Materials**: Natural textures vs. synthetic
- **Movement**: Curved path vs. straight
- **Lighting**: Bioluminescent/natural vs. artificial/abstract
- **Feel**: Living/growing vs. mechanical/precise

**Future Enhancements**:
- Procedural organic growth (different each visit)
- Interactive elements (touch vines to trigger glow)
- Audio-reactive bioluminescence
- Multiple path variations (branching tunnel)

---

## Cross-Room Considerations

### Performance Budget (All Rooms 6-9)

| Room | Current Bundle | Target Bundle | Current VRAM | Target VRAM | Target FPS |
|------|----------------|---------------|--------------|-------------|------------|
| Room 6 | 4.53 kB | 6 kB | ~150-300 MB (videos) | <50 MB | 60 FPS |
| Room 7 | 8.26 kB | 6 kB | ~150-300 MB (textures) | <80 MB | 60 FPS |
| Room 8 | 4.05 kB | 5 kB | Minimal | <20 MB | 60 FPS |
| Room 9 | 4.40 kB | 6 kB | Minimal | <30 MB | 60 FPS |
| **Total** | **21.24 kB** | **23 kB** | **~300-600 MB** | **<180 MB** | **60 FPS** |

### Thematic Coherence

**Room Progression Arc (from Room 5)**:
1. **Room 5** → **Room 6**: Eclipse → Cinematic
   - Dark mystical → Dark intimate
   - Portal: Light Blue
2. **Room 5** → **Room 7**: Eclipse → Cosmic
   - Dark mystical → Dark vast
   - Portal: Gold
3. **Room 5** → **Room 8**: Eclipse → Minimal
   - Dark ornate → Light minimal
   - Portal: Silver
4. **Room 5** → **Room 9**: Eclipse → Organic
   - Dark mystical → Warm natural
   - Portal: Lavender

Each room offers a distinct emotional and visual experience - no two feel the same.

### Asset Reuse Opportunities

**Shared Systems**:
- Portal creation utilities (already standardized)
- NFT loading with fallbacks
- Audio zones (proximity-based sound)
- Loading progress indicators

**Shared Visual Elements** (where appropriate):
- Fog/atmosphere systems
- Particle systems (stars, spores, etc.)
- Lighting rigs (can be configured differently)
- Material shaders (procedural patterns)

### Implementation Priority

**Suggested Order**:
1. **Room 8** - Simplest geometry, smallest scope, foundation for Room 9
2. **Room 9** - Builds on Room 8 systems, adds organic elements
3. **Room 7** - Medium complexity, texture optimization techniques
4. **Room 6** - Most complex (video system optimization)

**Estimated Effort** (relative):
- Room 8: 1x (baseline)
- Room 9: 1.5x (organic modeling/materials)
- Room 7: 2x (content curation + optimization)
- Room 6: 2.5x (video system + audio zones)

---

## Design Principles (All Rooms)

### Quality Over Quantity
- Fewer, better-curated NFTs > maximum asset count
- Every piece should feel intentional
- Remove filler content

### Performance is a Feature
- 60 FPS on mid-range hardware is non-negotiable
- Visible quality can coexist with optimization
- Use modern techniques (compression, LOD, culling)

### Respect Player Time
- Clear navigation (portals back to Room 5)
- No dead ends or confusion
- Allow for both quick pass-through and deep exploration

### Cohesive Experience
- Each room has distinct identity
- Rooms complement each other (variety)
- Consistent quality bar across all spaces

### Future-Proof
- Modular systems allow content swaps
- Easy to update NFT collections
- Documented design intent for future agents

---

**Last Updated**: 2025-11-15
**Status**: Planning phase - no code changes yet
**Next Steps**: Review briefs → Approve direction → Implement Room 8 → Iterate

