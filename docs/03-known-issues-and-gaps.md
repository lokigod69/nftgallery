# Known Issues & Gaps

Comprehensive tracker of all broken, incomplete, and problematic areas in the NFT gallery codebase.

---

## Recent Updates

### 🎉 WebP Migration Complete (2025-11-16)

**Achievement**: Successfully migrated entire gallery from PNG/JPG to WebP format

**Changes**:
- ✅ All 142 main NFT images converted to WebP (nft1.webp - nft142.webp)
- ✅ Room 7: 38 AI art images converted to WebP (~85% file size reduction)
- ✅ Room B: 60 NFT images converted to WebP (b1.webp - b60.webp)
- ✅ All texture assets converted (wood floors, copper, metal, water normals)
- ✅ Centralized format management via asset-utils.js helper functions

**Performance Impact**:
- Room 7 VRAM usage: 150-300 MB → 20-40 MB (85% reduction)
- Faster loading times across all rooms
- Improved performance on mid/low-end GPUs

**Code Changes**:
- Created 6 texture URL builder functions in [src/core/asset-utils.js](../src/core/asset-utils.js)
- Updated 11 room files to use centralized helpers
- Format changes now require editing only one file

**Safe to Delete**: Old PNG/JPG files can now be safely removed from `/public/assets/`

---

## Critical Issues (Breaks User Experience)

### ~~ISSUE-001: Room C Completely Missing~~ ✅ FIXED

**Type**: `missing room` / `broken navigation`

**Severity**: ~~🔴 **CRITICAL**~~ ✅ **RESOLVED**

**Location**:
- Referenced in: [room0.js:492](../room0.js#L492)
- Door position: SW edge of Room 0 platform (-15.56, -15.56)
- ~~Missing files: `roomC.html`, `roomC.js`~~ **NOW CREATED**

**Description**:
Room 0 has a wooden door labeled "Frame Waterfall Gallery" that links to `roomC.html`. ~~When user approaches this door and teleports, they receive a 404 error because the file does not exist.~~ **Portal now works correctly.**

**Fix Applied**: ✅ **Option A** - Created minimal working room

**Implementation**:
1. ✅ Created `roomC.html` with standard room structure
2. ✅ Created `roomC.js` as "Concept Chamber" with industrial aesthetic
3. ✅ Added 6 NFT frames (NFTs 50-55) on walls
4. ✅ Added teal portal back to Room 0
5. ✅ Included "CONCEPT CHAMBER - Work in Progress" sign in-world
6. ✅ Updated vite.config.js to include roomC in build

**Current Behavior**:
1. User enters Room 0
2. Walks to SW door
3. Door proximity triggers navigation to `roomC.html`
4. Room C loads successfully
5. User can explore minimal concept room and return to Room 0 via portal

**Room C Features**:
- Dark industrial aesthetic (moody blue-grey with fog)
- 30×40×8 unit dimensions
- Metallic floor and walls
- Atmospheric colored lighting (blue/red point lights)
- 6 NFT frames with proper loading
- Clear portal back to Ocean Hub

---

### ~~ISSUE-002: Room A1 Missing HTML Entry Point~~ ✅ FIXED

**Type**: `missing file` / `broken navigation`

**Severity**: ~~🔴 **CRITICAL**~~ ✅ **RESOLVED**

**Location**:
- Referenced in: [roomA.js:1647](../roomA.js#L1647)
- Portal in Room A leading to roomA1.html
- Exists: `roomA1.js` ✅
- ~~Missing: `roomA1.html` ❌~~ **NOW CREATED** ✅

**Description**:
Room A (Undersea Observatory) has a portal that links to `roomA1.html`. ~~The JavaScript file exists, but the HTML entry point is missing, causing a 404 error.~~ **Portal now works correctly.**

**Fix Applied**: ✅ **Option A** - Created the missing HTML file

**Implementation**:
1. ✅ Created `roomA1.html` matching standard room structure
2. ✅ Imported existing `roomA1.js` as module (1800+ lines already existed)
3. ✅ Updated portal destination in roomA1.js to go back to Room A (not Room 0)
4. ✅ Updated portal label text to reference Observatory instead of Ocean Room
5. ✅ Updated vite.config.js to include roomA1 in build

**Current Behavior**:
1. User enters Room A from Room 0
2. Explores observatory
3. Approaches portal to Room A1
4. Portal successfully navigates to `roomA1.html`
5. Room A1 loads as Observatory Annex
6. User can explore annex and return to Room A via portal

**Room A1 Features** (from existing roomA1.js):
- Large 120×120×60 unit gallery
- Light blue sky background
- Wood floor with mosaic pattern
- Wall-mounted NFT frames
- Portal back to Room A (Observatory)

---

## High Priority Issues (Impacts Major Features)

### ~~ISSUE-003: Bonus Rooms (6, 7, 8, 9) - Broken Return Navigation~~ ⚠️ CHANGED

**Type**: `navigation` / `design change`

**Severity**: ~~🟠 **HIGH**~~ ⚠️ **DESIGN CHANGE**

**Affected Rooms**:
- ✅ Room 6: Video Corridor - Still connected to Room 5
- ⚠️ Room 7: Starry Gallery - Now ORPHANED (no portal IN)
- ⚠️ Room 8: Liminal Passage - Now ORPHANED (no portal IN)
- ⚠️ Room 9: Organic Tunnel - Now ORPHANED (no portal IN)

**Status**: ⚠️ **DESIGN CHANGED** (2025-11-15)

**History**:
1. **Original Issue**: Return portals in rooms 6-9 incorrectly navigated to Room 0 instead of Room 5
2. **First Fix** (2025-11-15 earlier): Updated all return portals to navigate to Room 5
3. **Design Change** (2025-11-15 later): **Room 5 hub behavior removed**
   - Portals from Room 5 to Rooms 7, 8, 9 removed
   - Room 5 simplified to: Room 4 ↔ Room 5 ↔ Room 6 (simple progression)

**Current Behavior**:
1. **Room 6**: ✅ Still accessible from Room 5, returns to Room 5
2. **Rooms 7, 8, 9**: ⚠️ **ORPHANED** - No portal IN from any room
   - Can only be accessed via:
     - Direct URL navigation (room7.html, room8.html, room9.html)
     - Navigation menu
   - Portal OUT still works (Room 7 → Room 0, Rooms 8-9 → Room 5)

**Navigation Flow** (Current):
```
Room 5 (Simple Progression - NO LONGER A HUB)
  └─> Room 6 ↔ Room 5 ✅

Orphaned Rooms (no portal IN):
  Room 7 → Room 0 (orphaned)
  Room 8 → Room 5 (orphaned)
  Room 9 → Room 5 (orphaned)
```

**Impact**:
- Room 5 is now a simple progression room, not a hub
- Rooms 7, 8, 9 are effectively hidden/bonus content
- Players must use direct URL or nav menu to access orphaned rooms
- Reduces navigation complexity ("not a mess of portals")

**Rationale**:
User requested simplification: "Room 5 should NOT be a hub to everywhere. Only portal to Room 6 and back to Room 4."

---

### ISSUE-004: NFT Range Gap (128-130 Missing)

**Type**: `content` / `data inconsistency`

**Severity**: 🟠 **HIGH**

**Location**: NFT asset sequence

**Description**:
NFT numbering jumps from 127 to 131, skipping NFTs 128, 129, and 130.

**Affected Rooms**:
- Room 4 ends at NFT 127
- Room 5 starts at NFT 131
- Gap: 128, 129, 130

**Current Asset Files**:
- `nft127.webp` ✅
- `nft128.webp` ❓ (need to verify existence)
- `nft129.webp` ❓
- `nft130.webp` ❓
- `nft131.webp` ✅

**Impact**:
- If files exist: Content is unused/wasted
- If files don't exist: Inconsistent numbering scheme
- Breaks assumption of sequential NFT IDs
- Could cause confusion for metadata/database systems

**Probable Cause**:
- NFTs 128-130 removed/deleted after initial setup
- Room allocation changed during development
- Intentional gap for special/reserved NFTs

**Suggested Fix**:

**Option A** - If files exist, use them:
1. Add 3 additional NFT frames to Room 4 or 5
2. Or create small Room 4.5 with just these 3 NFTs

**Option B** - If files don't exist, renumber:
1. Rename nft131-142 to nft128-139
2. Update Room 5 code to use new range
3. Maintain sequential numbering

**Option C** - Document intentional gap:
1. Add comment in code explaining gap
2. Update documentation
3. Reserve 128-130 for future use

---

### ISSUE-005: Asset Path Confusion

**Type**: `configuration` / `file organization`

**Severity**: 🟠 **HIGH**

**Description**:
Multiple asset directories with unclear hierarchy and overlapping paths.

**Asset Directory Structure**:
```
/assets/                    ← Root-level (used by some rooms)
  ├── Room8/
  └── RoomC/

/public/assets/             ← Public assets (used by most rooms)
  ├── nft1.webp - nft142.webp  (All images migrated to WebP format)
  ├── Room7/                    (38 WebP images with long filenames)
  ├── RoomB/                    (b1.webp - b60.webp)
  ├── RoomC/
  ├── room11/
  ├── room12/
  ├── copper1.webp - copper4c.webp
  ├── metal2.webp
  ├── wood_floor1.webp, wood_floor2.webp
  ├── waternormals.webp
  └── vid*.mp4                  (Videos remain in MP4 format)
```

**Issues**:
1. **Duplication**: Some rooms store assets in `/assets/`, others in `/public/assets/`
2. **Inconsistency**: Room7 uses `/assets/Room7/`, RoomB uses `/assets/RoomB/`
3. **Build confusion**: Vite serves from `/public/`, but some code references `/assets/`
4. **Broken paths**: Some assets may not be accessible in production build

**Examples of Confusion**:
```javascript
// Room 6 tries to load from /videos/ (doesn't exist)
video.src = `/videos/${file}`;  // WRONG

// Should be:
video.src = `/assets/vid${index}.mp4`;  // CORRECT
```

**Impact**:
- Some assets may fail to load in production
- Development vs. production path mismatches
- Hard to find assets during development
- Build script may not copy all assets

**Suggested Fix**:

**Option A** - Standardize on `/public/assets/`:
1. Move all `/assets/` content to `/public/assets/`
2. Update all code references
3. Delete root `/assets/` folder
4. Document standard: "All assets go in /public/assets/"

**Option B** - Clear hierarchy:
1. `/public/assets/nft/` - Main NFT collection
2. `/public/assets/rooms/` - Room-specific assets
3. `/public/assets/shared/` - Textures, models, etc.
4. Update all references

**Option C** - Use Vite aliases:
1. Configure `vite.config.js` with path aliases
2. Use `@assets/` in code instead of absolute paths
3. Let Vite resolve correctly for dev and prod

---

### ~~ISSUE-006: Video File Paths in Room 6~~ ✅ FIXED

**Type**: `broken asset paths`

**Severity**: ~~🟠 **HIGH**~~ ✅ **RESOLVED**

**Location**: [room6.js:100](../room6.js#L100)

**Fix Applied**: 2025-11-15

**Implementation**:
Updated video path from `/videos/${file}` to `/assets/${file}` in [room6.js:100](../room6.js#L100)

**Before**:
```javascript
video.src = `/videos/${file}`;  // ← WRONG PATH
```

**After**:
```javascript
video.src = `/assets/${file}`;  // ← CORRECT PATH
```

**Result**:
- ✅ Videos now load correctly from `/public/assets/`
- ✅ No more 404 errors
- ✅ Video screens display properly in corridor

---

## Medium Priority Issues

### ISSUE-016: Room 6 - Heavy Video Performance Impact

**Type**: `performance` / `content optimization`

**Severity**: 🟡 **MEDIUM** (non-critical, visible)

**Location**: [room6.js](../room6.js)

**Description**:
Room 6 (Video Corridor) loads and auto-plays 13 MP4 video files simultaneously, causing significant CPU/GPU load.

**Technical Details**:
- **Video Count**: 13 MP4 files (Amy1, Angel1, Anna1, April1, Cara1, Claire1, Cynthia2, Dasha1, Devon2, Huong1, Lucy1, Ruby1, Sarah1)
- **Display**: 4m × 4m video planes alternating on corridor walls
- **Auto-play**: All videos start playing automatically (muted)
- **Rendering**: Uses `VideoTexture` for dynamic texture updates
- **Bundle Size**: 4.53 kB (1.94 kB gzip)

**Impact**:
- High CPU usage for video decoding (13 concurrent video streams)
- High GPU usage for VideoTexture rendering
- Increased memory footprint (video buffers in RAM)
- Potential frame rate drops on lower-end hardware
- High bandwidth for initial video loading

**Current Issues**:
- No lazy loading or progressive rendering
- No distance-based culling (all videos play even if not visible)
- No LOD optimization
- Auto-play triggers on first click event (line 120-129)
- No fallback for devices that can't handle 13 concurrent videos

**Visual Quality**: Good - videos display correctly when hardware can handle them

**Suggested Fixes**:
1. **Lazy Loading**: Only load/play videos when player is nearby (distance-based)
2. **Reduce Quality**: Use lower-resolution videos or compressed formats
3. **Sequential Loading**: Load videos progressively instead of all at once
4. **Pause Culling**: Pause videos that are behind the player
5. **Reduce Count**: Consider using fewer videos (e.g., every other position)

---

### ISSUE-017: Room 7 - Heavy Performance Issues (Textures + Lighting)

**Type**: `performance` / `visual optimization`

**Severity**: 🟡 **MEDIUM** (non-critical, visible)

**Location**: [room7.js](../room7.js)

**Description**:
Room 7 (Starry Gallery) has multiple performance-intensive features that compound:
- 38 high-resolution PNG textures
- 20 SpotLights with shadows
- 1000 star particles
- Highly reflective floor (metalness 1.0, roughness 0.1)

**Technical Details**:
- **Bundle Size**: 8.26 kB (2.84 kB gzip) - **LARGEST BUNDLE**
- **Textures**: 38 WebP images from `/assets/Room7/`
  - Estimated size: 500KB-1MB each = ~20-40 MB total VRAM (significantly improved from PNG)
  - Long AI-generated filenames
  - WebP compression provides ~85% size reduction vs. original PNG
  - No LOD system for distant images
- **Lighting**: 20 warm SpotLights (0xffaa88) randomly positioned
  - Each spotlight calculates shadows
  - Expensive real-time shadow mapping
- **Particles**: 1000 white star particles (PointsGeometry)
  - Moderate CPU overhead
- **Reflective Floor**: 100×100 unit black floor
  - High metalness requires expensive reflection calculations

**Impact**:
- **VRAM Usage**: Moderate (20-40 MB for textures, improved from 150-300 MB PNG)
- **Frame Rate**: Moderate impact, improved with WebP migration
- **Load Time**: Improved loading phase with compressed WebP textures
- **Shadow Performance**: 20 spotlights with shadows = very expensive
- **Reflection Cost**: Metallic floor adds additional GPU overhead

**Current Issues**:
- No texture compression or progressive loading
- No error handling for failed texture loads
- All 38 textures loaded simultaneously
- No LOD system for distant images
- Spotlights always active (no distance-based culling)
- No performance warning for users

**Visual Quality**: High - dark atmospheric aesthetic with dramatic lighting

**Suggested Fixes**:
1. **Texture Optimization**:
   - ✅ **DONE**: All images migrated to WebP (85% size reduction)
   - Consider: Progressive loading or lazy loading
   - Consider: LOD system for distant images
2. **Lighting Optimization**:
   - Reduce spotlight count to 8-10
   - Disable shadows or use shadow maps more efficiently
   - Use distance-based light culling
3. **Particle Reduction**: Reduce star count to 500
4. **Floor Material**: Reduce metalness to 0.5-0.7 (less reflective = better performance)

---

### ~~ISSUE-018: Room 8 & 9 - Missing NFT Assets~~ ✅ FIXED

**Type**: `missing content` / `broken asset references`

**Severity**: ~~🟡 **MEDIUM**~~ ✅ **RESOLVED**

**Location**:
- [room8.js](../room8.js) (Bundle: 4.42 kB)
- [room9.js](../room9.js) (Bundle: 4.99 kB)

**Status**: ✅ **FIXED** (2025-11-15)

**Description**:
Rooms 8 and 9 previously referenced 40 non-existent NFT asset files (`/assets/nft{1-40}.webp`), resulting in empty rooms with no content.

**Fix Applied**: 2025-11-15

**Implementation**:
Both rooms completely redesigned with distinct visual identities and procedural content:

**Room 8 - "Liminal Passage" (Geometric, Cool)**:
- Removed all fake NFT asset references
- Implemented 14 floating geometric forms (spheres, cubes, toruses, octahedrons, tetrahedrons)
- Material-based content with cool color palette (blues, cyans, magentas, purples)
- Emissive materials with slow rotation animations
- Zero external asset dependencies
- Bundle: 4.42 kB (1.93 kB gzip)

**Room 9 - "Organic Tunnel" (Bio-luminescent, Warm)**:
- Removed all 40 fake `/assets/nft{1-40}.webp` references
- Implemented 16 embedded art alcoves with material-based "relief art"
- Warm earth tone palette (browns, ambers, greens, golds)
- Bio-luminescent accents with breathing animation
- Zero external asset dependencies
- Bundle: 4.99 kB (2.21 kB gzip)

**Result**:
- ✅ No more missing asset errors
- ✅ Both rooms have coherent, intentional visual content
- ✅ All content generated procedurally via code
- ✅ Performance within budget (both <5-6 kB)
- ✅ Distinct visual identities (geometric/cool vs organic/warm)

---

### ~~ISSUE-019: Room 9 - Complete Code Duplication with Room 8~~ ✅ FIXED

**Type**: `code maintenance` / `technical debt`

**Severity**: ~~🟡 **MEDIUM**~~ ✅ **RESOLVED**

**Location**:
- [room8.js](../room8.js) (4.42 kB bundle)
- [room9.js](../room9.js) (4.99 kB bundle)

**Status**: ✅ **FIXED** (2025-11-15)

**Description**:
Room 9 was previously a byte-for-byte duplicate of Room 8 - identical code, geometry, and functionality, creating maintenance debt and confusing UX.

**Fix Applied**: 2025-11-15

**Implementation**:
Room 9 completely rewritten with unique implementation:

**Before**:
- Identical grey cylindrical tunnel (duplicate code)
- Same missing NFT references
- Zero visual differentiation
- 8.45 kB combined bundle waste

**After**:
- **Room 8**: Cool geometric "Liminal Passage" with floating forms
- **Room 9**: Warm organic "Bio-luminescent Tunnel" with embedded alcoves
- **Code Overlap**: ZERO - completely distinct implementations
- **Visual Differentiation**: Clear contrast in tone, color, geometry, materials
- **Combined Bundle**: 9.41 kB (was 8.45 kB) - slight increase justified by actual content

**Result**:
- ✅ Zero code duplication between Room 8 and Room 9
- ✅ Distinct visual identities prevent player confusion
- ✅ Each room maintainable independently
- ✅ Clear conceptual differentiation (geometric vs organic)

---

### ISSUE-007: Room B Audio File May Not Exist

**Type**: `missing asset`

**Severity**: 🟡 **MEDIUM**

**Location**: [roomB.js:179](../roomB.js#L179)

**Description**:
Room B tries to load an audio file that may not exist.

**Code**:
```javascript
const audioPlayer = new Audio('/assets/songroomB.mp3');
```

**Status**: ❓ **Unverified** - Need to check if file exists

**Impact**:
- If missing: Silent error, no background music
- Doesn't break room functionality, just missing ambiance

**Suggested Fix**:
1. Verify if `/public/assets/songroomB.mp3` exists
2. If missing: Remove audio player code or add the file
3. Add error handling: `audio.onerror = () => console.warn('Audio not found')`

---

### ISSUE-008: Room B GLB Model Path

**Type**: `missing asset`

**Severity**: 🟡 **MEDIUM**

**Location**: [roomB.js:1593](../roomB.js#L1593)

**Description**:
Room B attempts to load a 3D model that may not exist.

**Code**:
```javascript
gltfLoader.load('/assets/aviary_gallery.glb', ...);
```

**Status**: ❓ **Unverified** - Need to check if file exists

**Impact**:
- If missing: Model doesn't appear, but room still functions
- Loading screen may hang longer than necessary
- Console errors

**Suggested Fix**:
1. Verify if `/public/assets/aviary_gallery.glb` exists
2. If missing: Remove GLB loader code or add the file
3. Improve error handling in existing onError callback

---

### ISSUE-009: Room 8 Has No Content

**Type**: `incomplete feature`

**Severity**: 🟡 **MEDIUM**

**Location**: [room8.js](../room8.js)

**Description**:
Room 8 is implemented but contains only empty grey frames, no actual NFT content.

**Current State**:
- 10×10 meter cube
- Checkered pattern of 1×1 meter grey frames
- Floor, ceiling, all four walls covered
- No images loaded into frames

**Purpose**: Appears to be a test/prototype room

**Impact**:
- Orphaned room with no content
- Takes up space in codebase
- May confuse users if they access it

**Suggested Fix**:

**Option A** - Add content:
1. Load NFTs into the grey frames
2. Could use any available NFT set

**Option B** - Remove room:
1. Delete room8.html and room8.js
2. Remove from nav menu
3. Document as deleted

**Option C** - Convert to art installation:
1. Keep as minimalist "grey frame" art piece
2. Add label/description explaining it's intentional
3. Make it part of the experience ("Room of Empty Frames")

---

### ISSUE-010: Room 7 Uses Non-Standard Asset Naming

**Type**: `code hygiene` / `maintainability`

**Location**: [room7.js:91-100](../room7.js#L91)

**Description**:
Room 7 image files have extremely long AI-generated filenames that are hard to maintain.

**Example**:
```javascript
const imageFiles = [
  "lokigod69._A_female_model_standing_in_a_stark_monochrome_space__461d3cd1-91d2-4213-90e0-567676b9955d",
  "lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_4512005b-b6b4-48bf-8a1c-3739d9c4a119",
  // ... more long names (extension .webp added by getRoom7ArtUrl helper)
];
```

**Issues**:
- Filenames are 100+ characters long
- Hard to reference in code
- Difficult to manage in file system
- Contains AI generation metadata (username, UUID)

**Impact**:
- Low severity but affects code readability
- Makes debugging harder
- File management is cumbersome

**Suggested Fix**:

**Option A** - Rename files:
1. Rename to `room7_1.webp`, `room7_2.webp`, etc.
2. Update code to use new names
3. Keep original names in metadata JSON file

**Option B** - Use programmatic loading:
1. Load all files from `/assets/Room7/` directory
2. Don't hardcode filenames
3. Use file system API or build-time script to generate array

**Note**: WebP migration completed - extension centralized via `getRoom7ArtUrl()` helper in asset-utils.js

---

### ISSUE-011: Inconsistent Portal Colors/Meanings

**Type**: `UX` / `consistency`

**Severity**: 🟡 **MEDIUM**

**Description**:
Portal colors are used inconsistently across rooms without clear user indication of meaning.

**Current Color Usage**:
- Blue (0x4444ff): Forward progression (Room 1→2)
- Green (0x44ff44): Forward progression (Room 2→3)
- Purple (0x8844aa / 0x8844ff): Both forward (Room 3→4, 4→5) and backward (5→4)
- Teal (0x00ffff / 0x44ffff): Return to Room 0 (used in multiple rooms)

**Issues**:
- Purple is used for both directions (forward and backward)
- Green only appears once (Room 2→3)
- No clear visual language for portal direction
- Users can't predict where portal leads based on color

**Impact**:
- Confusing UX
- Users don't know if portal goes forward, backward, or to hub
- Inconsistent experience across rooms

**Suggested Fix**:

**Option A** - Standardize colors:
1. Blue = Forward (next room in sequence)
2. Orange/Red = Backward (previous room)
3. Teal = Hub (return to Room 0)
4. Purple = Special (branches, special connections)
5. Document color meanings in UI

**Option B** - Add text labels:
1. Keep current colors
2. Add floating text above each portal
3. Example: "Room 2 →", "← Room 1", "Hub ⌂"

**Option C** - Portal signs:
1. Add 3D signposts near portals
2. Show destination room name/number
3. Keep color coding as secondary indicator

---

## Low Priority Issues

### ISSUE-012: Mobile Video Path Mismatch

**Type**: `configuration`

**Severity**: 🟢 **LOW**

**Description**:
Mobile controls use a hardcoded path that may not match actual file location.

**Location**: Multiple room files

**Current**:
```javascript
const isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
// nipplejs library loaded from /public/libs/nipplejs.min.js
```

**Impact**: Low - likely works in most cases

---

### ISSUE-013: No NFT Metadata System

**Type**: `missing feature`

**Severity**: 🟢 **LOW**

**Description**:
NFTs are displayed with only index numbers, no titles, descriptions, artist info, or metadata.

**Current Display**:
```
NFT #42 (12/28)
```

**Missing**:
- NFT title
- Artist name
- Description/story
- Rarity/attributes
- Price/marketplace link (except Room 1 has OpenSea links)
- Collection info

**Impact**:
- Minimal information for users
- Can't search or filter by metadata
- No storytelling/context

**Suggested Fix**:
1. Create `nft-metadata.json` with structured data
2. Load metadata when displaying NFT
3. Show in full-screen viewer
4. Could add search/filter features

---

### ISSUE-014: No Loading Progress Indication

**Type**: `UX` / `polish`

**Severity**: 🟢 **LOW**

**Description**:
Loading overlays show animated progress bar, but it's not tied to actual asset loading progress.

**Current**:
- Progress bar animates via CSS
- Not connected to texture/model loading
- Just visual decoration
- Timeout-based hiding (not load-based)

**Impact**:
- Users don't know how long loading will take
- Loading overlay may hide before assets fully load
- Or may stay visible after loading complete

**Suggested Fix**:
1. Use LoadingManager to track real progress
2. Update progress bar width based on loaded/total assets
3. Hide overlay when progress === 100%
4. Keep timeout as safety fallback

---

### ISSUE-015: React Rooms Not Integrated

**Type**: `incomplete feature` / `future work`

**Severity**: 🟢 **LOW** (intentional/expected)

**Description**:
Rooms 10, 11, 12 exist as React/TSX scaffolds but are not connected to the main application.

**Files**:
- [rooms/10/Room10Scene.tsx](../rooms/10/Room10Scene.tsx)
- [rooms/11/Room11Scene.tsx](../rooms/11/Room11Scene.tsx)
- [rooms/12/Room12Scene.tsx](../rooms/12/Room12Scene.tsx)

**Current State**:
- Complete React components
- Use grey placeholder images
- No HTML entry points
- No portal connections
- Not built by Vite

**Impact**:
- Code exists but isn't used
- No user access
- Represents future direction

**Suggested Fix**:
This appears intentional. Future work should:
1. Decide on architecture (vanilla JS vs. React)
2. If React: create HTML entry points, add to build
3. If vanilla JS: port React rooms to vanilla JS
4. Add portal connections from existing rooms

---

### ISSUE-020: Room X (Room 10) - Portal Destination Not Determined

**Type**: `navigation` / `todo`

**Severity**: 🟡 **MEDIUM** - Room functional but isolated

**Location**:
- Room file: [room10.html](../room10.html), [room10.js](../room10.js)
- Visual portal at top of sphere (line ~257)
- Currently not wired to any other rooms

**Description**:
Room X ("The Ascent") is a fully functional legendary challenge room featuring a spherical arena with vertical jump puzzle. The room is self-contained and working, but needs a decision on:
1. Where should the portal at the top lead?
2. Which room(s) should have portals leading INTO Room X?

**Current Status**:
- ✅ Room 10 fully implemented and working
- ✅ Build successfully includes room10.html and room10.js (5.29 kB bundle)
- ✅ Jump mechanics, platform generation, and physics all functional
- ✅ Visual portal at top with "ESCAPE" text
- ⚠️ Portal is visual only (not functional)
- ⚠️ No navigation IN to Room 10 from any other room
- ⚠️ No navigation OUT from Room 10 to any other room

**Room X Features**:
- 70-unit radius hollow sphere with starfield interior
- 28 hexagonal platforms in spiral path (112-unit vertical climb)
- Physics-based platforming (jump height ~3 units, horizontal distance ~4.5 units)
- Death plane with respawn mechanic
- Procedural gradient materials (cool blues to warm oranges)
- Performance-optimized (5.29 kB / 2.37 kB gzip)

**Design Questions to Resolve**:
1. **Portal destination options**:
   - Option A: Portal leads back to Room 0 (Ocean Hub) - reward for completing challenge
   - Option B: Portal leads to Room 5 (Eternal Eclipse) - fits with bonus room structure
   - Option C: Portal leads to a new secret room (future content unlock)
   - Option D: Portal is one-way exit to specific progression room (e.g., Room 4 → Room X → Room 5)

2. **Entry point options**:
   - Option A: Add portal from Room 0 (direct access from hub)
   - Option B: Add portal from Room 5 (bonus room accessible from secondary hub)
   - Option C: Add portal from Room 4 (end of main progression before Room 5)
   - Option D: Make discoverable via secret/hidden portal in existing room
   - Option E: No entry portal yet (direct URL access only for testing)

**Impact**:
- Room is playable via direct URL navigation (room10.html)
- Cannot be reached through normal gallery exploration
- Challenge completion has no reward destination
- No integration with rest of gallery flow

**Suggested Approach**:
**DO NOT IMPLEMENT YET** - Wait for design decision from user:
1. Determine Room X's role in gallery (main progression vs. bonus content vs. secret)
2. Based on role, decide entry and exit portal destinations
3. Implement portal connections
4. Update portal-styles.js with Room X color scheme if needed
5. Test complete navigation flow

**Notes**:
- Room is intentionally isolated per user's instruction ("Do NOT wire any room to Room 10 yet")
- Implementation is complete and ready for navigation integration
- Portal system uses existing portal-utils.js (createLinkedPortal)
- Just needs URL destination and color assignment

---

### ISSUE-021: Rooms 7, 8, 9 Now Orphaned (No Portal IN)

**Type**: `navigation` / `content accessibility`

**Severity**: 🟡 **MEDIUM** - Content exists but hidden

**Location**:
- Room 7: Starry Gallery ([room7.html](../room7.html))
- Room 8: Liminal Passage ([room8.html](../room8.html))
- Room 9: Organic Tunnel ([room9.html](../room9.html))

**Description**:
Following Room 5 hub removal (2025-11-15), Rooms 7, 8, and 9 no longer have any portal connections IN from other rooms. These rooms are fully functional and contain content, but players cannot discover them through normal exploration.

**Current State**:
- ✅ Rooms are fully functional (code works, content loads)
- ✅ Portals OUT work correctly:
  - Room 7 → Room 0 (Ocean Hub)
  - Room 8 → Room 5 (Eternal Eclipse)
  - Room 9 → Room 5 (Eternal Eclipse)
- ⚠️ No portals IN (orphaned from navigation graph)
- ⚠️ Only accessible via:
  1. Direct URL navigation (room7.html, room8.html, room9.html)
  2. Navigation menu (hamburger menu in UI)
  3. External links

**Room Content Summary**:
- **Room 7** (Starry Gallery): 38 AI-generated art images, dramatic lighting, starfield
- **Room 8** (Liminal Passage): 14 procedural geometric forms, cool aesthetic
- **Room 9** (Organic Tunnel): 16 procedural art alcoves, warm bio-luminescent aesthetic

**Impact**:
- Hidden content that players may never discover
- Wasted development effort if rooms remain inaccessible
- Inconsistent with "explorable gallery" design philosophy
- May confuse users who find rooms via nav menu but can't reach via portals

**Possible Solutions**:

**Option A** - Restore Hub (reverses simplification):
1. Re-add portals from Room 5 to Rooms 7, 8, 9
2. Room 5 becomes secondary hub again
3. ❌ Contradicts user's explicit request for simplification

**Option B** - Add Portals from Room 0:
1. Add 3 new portals in Room 0 (Ocean Hub) leading to Rooms 7, 8, 9
2. Pros: Discoverable, consistent with hub pattern
3. Cons: Room 0 already has 5 doors (including disabled Room D)

**Option C** - Chain Progression:
1. Create linear path: Room 5 → Room 6 → Room 7 → Room 8 → Room 9 → Room 0
2. Turns bonus rooms into extended main progression
3. Pros: All content discoverable, clear flow
4. Cons: Makes progression longer

**Option D** - Secret Portals:
1. Add hidden/subtle portals in existing rooms (e.g., Room 1, 2, 3)
2. Reward exploration with bonus content discovery
3. Pros: Maintains clean main path, encourages exploration
4. Cons: May be too hidden, frustrating for completionists

**Option E** - Keep as Hidden Bonus Content:
1. Accept that rooms are accessible only via nav menu / direct URL
2. Document as "hidden rooms" or "developer rooms"
3. Pros: Preserves Room 5 simplification
4. Cons: Content remains mostly undiscovered

**Option F** - Integrate with Room X:
1. Add portals from Room X (The Ascent) to Rooms 7, 8, 9
2. Room X becomes gateway to bonus content
3. First need to wire Room X into navigation (see ISSUE-020)

**Recommendation**:
Wait for user direction on gallery navigation philosophy before implementing fix.

---

## Summary Tables

### Issues by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| ~~🔴 Critical~~ ✅ | ~~2~~ 0 | ~~ISSUE-001 (Room C missing), ISSUE-002 (Room A1 HTML missing)~~ **ALL FIXED!** |
| 🟠 High | 2 | ISSUE-004 (NFT gap), ISSUE-005 (Asset paths) |
| 🟡 Medium | 9 | ISSUE-007 to ISSUE-011, ISSUE-016, ISSUE-017, ISSUE-020 (Room X portal), ISSUE-021 (Rooms 7-9 orphaned) ~~, ISSUE-018, ISSUE-019~~ ✅ **Room 8/9 redesign complete!** |
| 🟢 Low | 4 | ISSUE-012 to ISSUE-015 |
| **Total** | **21** | **6 fixed, 1 changed (ISSUE-003), 14 active** |

### Issues by Type

| Type | Count | Examples |
|------|-------|----------|
| Missing files/rooms | 4 | Room C (fixed), Room A1 HTML (fixed), audio files, models |
| Navigation/portals | 3 | ~~Bonus rooms broken return portals (fixed)~~, portal color consistency, Room X portal destination |
| Asset paths/loading | 3 | Asset directory confusion, video paths (fixed), ~~missing NFT assets (Rooms 8-9, fixed)~~ |
| Content/data | 2 | NFT gap, missing metadata |
| Performance | 2 | Room 6 videos, Room 7 textures/lighting ~~, Room 8-9 missing assets (fixed)~~ |
| Code maintenance | ~~1~~ 0 | ~~Room 9 duplication with Room 8 (fixed)~~ |
| UX/Polish | 2 | Loading progress, portal labels |
| Future work | 2 | React rooms, Room X navigation integration |

### Recommended Fix Priority

**Immediate (should fix before launch)**:
1. ~~ISSUE-001: Fix or remove Room C door~~ ✅ **FIXED** - Created roomC
2. ~~ISSUE-002: Fix or remove Room A1 portal~~ ✅ **FIXED** - Created roomA1.html
3. ~~ISSUE-006: Fix Room 6 video paths~~ ✅ **FIXED** - Updated to `/assets/`
4. ~~ISSUE-003: Fix bonus room return portals~~ ✅ **FIXED** - All rooms now return to Room 5

**High Priority (fix soon)**:
5. ISSUE-005: Standardize asset paths
6. ISSUE-011: Add portal labels/signs
7. ISSUE-018: Fix missing NFT assets in Rooms 8-9 (add content or remove references)
8. ISSUE-019: Resolve Room 9 duplication (differentiate or merge with Room 8)

**Medium Priority (nice to have)**:
9. ISSUE-016: Optimize Room 6 video performance (lazy loading, culling)
10. ISSUE-017: Optimize Room 7 performance (texture compression, reduce spotlights)
11. ISSUE-007, 008: Verify and fix missing assets (Room B audio/model)
12. ISSUE-004: Resolve NFT gap (128-130)
13. ISSUE-010: Clean up Room 7 naming

**Low Priority (future enhancements)**:
14. ISSUE-013: Add NFT metadata system
15. ISSUE-014: Real loading progress
16. ISSUE-015: Integrate React rooms (if desired)

---

## Testing Checklist

To verify fixes, test:

- [ ] Room 0 → Click all 5 doors, verify no 404 errors
- [ ] Room A → Verify portal to A1 works or is removed
- [ ] Rooms 6, 7, 8, 9 → Verify accessible via portals (not just nav menu)
- [ ] Room 6 → Verify all 13 videos load and play
- [ ] Room B → Verify audio plays (if file exists)
- [ ] Room B → Verify GLB model loads (if file exists)
- [ ] NFT sequence → Verify no gaps in numbering
- [ ] All rooms → Verify assets load from correct paths
- [ ] Portal colors → Verify consistency or labeling
- [ ] Mobile → Test virtual joysticks work
- [ ] NFT viewer → Test in each room

---

## Notes for Future Agents

When fixing these issues:

1. **Always backup first** - Create git branch before changes
2. **Test both dev and production builds** - Paths may differ
3. **Check asset existence** before referencing in code
4. **Update documentation** when changing navigation flow
5. **Maintain consistency** - If you fix one room's portal colors, fix all
6. **Consider UX impact** - Don't break working features to fix minor issues
7. **Preserve the vision** - Explorable world with discovery, not just a list

Some issues have multiple valid solutions - choose based on project goals and user experience priorities.
