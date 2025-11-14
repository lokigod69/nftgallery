# Known Issues & Gaps

Comprehensive tracker of all broken, incomplete, and problematic areas in the NFT gallery codebase.

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

### ISSUE-003: Orphaned Rooms (6, 7, 8, 9) - No Navigation

**Type**: `navigation` / `incomplete feature`

**Severity**: 🟠 **HIGH**

**Affected Rooms**:
- Room 6: Video Corridor ([room6.js](../room6.js))
- Room 7: Starry Gallery ([room7.js](../room7.js))
- Room 8: Checkered Frame Room ([room8.js](../room8.js))
- Room 9: Cylindrical Tunnel ([room9.js](../room9.js))

**Description**:
Four complete, functional rooms exist but have no portal connections. They can only be accessed via:
- Direct URL entry (e.g., `room6.html`)
- Global navigation menu
- Typing the URL manually

**Current Behavior**:
- No portals leading TO these rooms from any other room
- No portals leading FROM these rooms back to navigation flow
- Content is hidden from normal user exploration
- Creates inconsistent UX (some rooms connected, others not)

**Impact**:
- Users following normal portal flow never discover these rooms
- Content effectively wasted
- Breaks the "explorable world" vision

**Evidence**:
```bash
# Grep search shows no portal destinations to rooms 6-9
$ grep "room6.html\|room7.html\|room8.html\|room9.html" *.js
# (no results)
```

**Probable Cause**:
- Rooms created as experiments/tests
- Never integrated into main navigation flow
- Possibly intended for different navigation scheme
- Development incomplete

**Suggested Fix**:

**Option A** - Connect to Room 0 hub:
1. Add 4 additional doors to Room 0 platform (expand to 9 doors)
2. Or create a "secondary gallery wing" portal in Room 0
3. Chain rooms: Room 0 → 6 → 7 → 8 → 9 → back to Room 0

**Option B** - Create "bonus gallery" area:
1. Add a special portal in Room 5 (end of main path)
2. Label it "Bonus Galleries" or "Experimental Wing"
3. Lead to Room 6, with portals continuing 6→7→8→9→Room 0

**Option C** - Connect to branch paths:
1. Room A → Room 6
2. Room B → Room 7
3. Room 1 → Room 8 (side path)
4. Room 2 → Room 9 (side path)

**Option D** - Remove from main build:
1. Move to `/experimental/` folder
2. Document as prototypes, not main experience
3. Clean up from nav menu

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
- `nft127.png` ✅
- `nft128.png` ❓ (need to verify existence)
- `nft129.png` ❓
- `nft130.png` ❓
- `nft131.png` ✅

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
  ├── nft1.png - nft142.png
  ├── Room7/
  ├── RoomB/
  ├── RoomC/
  ├── room11/
  ├── room12/
  ├── copper1-4.jpeg
  ├── metal.jpg
  ├── wood_floor.jpeg
  └── vid*.mp4
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

### ISSUE-006: Video File Paths in Room 6

**Type**: `broken asset paths`

**Severity**: 🟠 **HIGH**

**Location**: [room6.js:93-94](../room6.js#L93)

**Description**:
Room 6 (Video Corridor) tries to load videos from `/videos/` directory which doesn't exist.

**Code**:
```javascript
const videoFiles = [
  'Amy1.mp4', 'Angel1.mp4', 'Anna1.mp4', 'April1.mp4',
  'Cara1.mp4', 'Claire1.mp4', 'Cynthia2.mp4', 'Dasha1.mp4',
  'Devon2.mp4', 'Huong1.mp4', 'Lucy1.mp4', 'Ruby1.mp4', 'Sarah1.mp4'
];

videoFiles.forEach((file, index) => {
  const video = document.createElement('video');
  video.src = `/videos/${file}`;  // ← WRONG PATH
```

**Actual Location**:
Videos are in `/public/assets/` as:
- `vid1.mp4`, `vid2.mp4`, ..., `vid17.mp4`

**Impact**:
- Room 6 videos fail to load (404 errors)
- Black/broken screens in the corridor
- Console errors

**Suggested Fix**:
1. Update video paths to `/assets/vid${index+1}.mp4`
2. Or rename video files to match Room 6's expectations
3. Or create symlink `/videos/` → `/public/assets/`

---

## Medium Priority Issues

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
  "lokigod69._A_female_model_standing_in_a_stark_monochrome_space__461d3cd1-91d2-4213-90e0-567676b9955d.png",
  "lokigod69._A_female_model_whose_body_dissolves_into_thick_impre_4512005b-b6b4-48bf-8a1c-3739d9c4a119.png",
  // ... more long names
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
1. Rename to `room7_1.png`, `room7_2.png`, etc.
2. Update code to use new names
3. Keep original names in metadata JSON file

**Option B** - Use programmatic loading:
1. Load all files from `/assets/Room7/` directory
2. Don't hardcode filenames
3. Use file system API or build-time script to generate array

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

## Summary Tables

### Issues by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| ~~🔴 Critical~~ ✅ | ~~2~~ 0 | ~~ISSUE-001 (Room C missing), ISSUE-002 (Room A1 HTML missing)~~ **ALL FIXED!** |
| 🟠 High | 4 | ISSUE-003 (Orphaned rooms), ISSUE-004 (NFT gap), ISSUE-005 (Asset paths), ISSUE-006 (Video paths) |
| 🟡 Medium | 5 | ISSUE-007 to ISSUE-011 |
| 🟢 Low | 4 | ISSUE-012 to ISSUE-015 |
| **Total** | **15** | **2 fixed, 13 remaining** |

### Issues by Type

| Type | Count | Examples |
|------|-------|----------|
| Missing files/rooms | 4 | Room C, Room A1 HTML, audio files, models |
| Navigation/portals | 2 | Orphaned rooms, portal color consistency |
| Asset paths/loading | 3 | Asset directory confusion, video paths, audio paths |
| Content/data | 2 | NFT gap, missing metadata |
| UX/Polish | 2 | Loading progress, portal labels |
| Future work | 2 | React rooms, Room 8 content |

### Recommended Fix Priority

**Immediate (should fix before launch)**:
1. ~~ISSUE-001: Fix or remove Room C door~~ ✅ **FIXED** - Created roomC
2. ~~ISSUE-002: Fix or remove Room A1 portal~~ ✅ **FIXED** - Created roomA1.html
3. ISSUE-006: Fix Room 6 video paths

**High Priority (fix soon)**:
4. ISSUE-003: Connect orphaned rooms OR remove from nav
5. ISSUE-005: Standardize asset paths
6. ISSUE-011: Add portal labels/signs

**Medium Priority (nice to have)**:
7. ISSUE-007, 008: Verify and fix missing assets
8. ISSUE-004: Resolve NFT gap
9. ISSUE-009: Decide on Room 8 purpose
10. ISSUE-010: Clean up Room 7 naming

**Low Priority (future enhancements)**:
11. ISSUE-013: Add NFT metadata system
12. ISSUE-014: Real loading progress
13. ISSUE-015: Integrate React rooms (if desired)

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
