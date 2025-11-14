# Navigation Flow & User Experience

This document describes the intended user journey through the NFT gallery and how navigation works.

---

## Entry Point

### Initial Load Sequence

1. User navigates to the site
2. [index.html](../index.html) loads
3. **Immediate redirect** to [room0.html](../room0.html)
4. Loading overlay displays with animated progress bar
5. Room 0 (Ocean Entry Hub) initializes
6. Loading overlay fades out after assets load
7. User sees the ocean environment with floating platform

**Initial Camera Position**: Floating above ocean at height 11.5 units

---

## Navigation Mechanisms

### 1. Portal Proximity Detection

**How it works**:
- User walks near a glowing circular portal
- Distance calculated continuously in animation loop
- When distance < threshold (typically 1.5-3.0 units):
  - Instruction text appears on screen
  - Portal glow intensifies
  - After brief delay (prevents accidental teleport)
  - Loading overlay shows
  - `window.location.href` navigates to target room

**Portal Visual Indicators**:
- Blue portals (0x4444ff): Standard forward progression
- Green portals (0x44ff44): Alternative paths
- Purple portals (0x8844ff): Special connections
- Teal portals (0x00ffff / 0x44ffff): Return to hub/previous room

**User Feedback**:
- On-screen text: "Approach portal to enter Room X"
- Visual glow animation
- Smooth fade to loading overlay

### 2. Door Teleportation (Room 0 only)

**How it works**:
- User walks close to wooden door (distance < 2.5 units)
- Immediate teleportation (no timer)
- Room 0 has 5 doors positioned around octagonal platform

**Door Positions** (Room 0):
```
                  North
              [Main Gallery]
                   |
    NW            |            NE
  [Room D]        |        [Observatory]
  (disabled)      |        (Room A)
                  |
West ----------- HUB ----------- East
                  |
                  |
    SW            |            SE
[Room C]          |         [Room B]
 (broken)         |        (Gallery)
                  |
                 South
```

### 3. Global Navigation Menu

**Access**: Hamburger icon (top-right corner of screen)

**How it works**:
- Available from ANY room at ANY time
- Click hamburger → dropdown menu appears
- Direct links to all room HTML files
- Bypasses normal portal flow
- Useful for:
  - Accessing orphaned rooms (6, 7, 8, 9)
  - Quick navigation during development
  - Returning from dead-ends

**Menu Structure** (typical):
```
☰ Navigation
├─ Room 0 (Home)
├─ Room 1 (Main Gallery)
├─ Room 2
├─ Room 3
├─ Room 4 (Floating Island)
├─ Room 5 (Eternal Eclipse)
├─ Room 6 (Video Corridor)
├─ Room 7 (Starry Gallery)
├─ Room 8 (Frame Room)
├─ Room 9 (Tunnel)
├─ Room A (Observatory)
└─ Room B (Gallery)
```

### 4. URL Parameters (Advanced)

**Usage**: Some rooms accept spawn point parameters

**Example**:
```
room3.html?spawn=safe
```

**Purpose**:
- When entering Room 3 from Room 4, spawn at "safe" position
- Prevents spawning inside walls or geometry
- Only implemented in Room 3 currently

---

## Primary User Journey (Happy Path)

### Path 1: Main Gallery Progression

This is the intended "main story" path through the gallery.

```
START
  ↓
Room 0: Ocean Entry Hub
  │ User sees 5 wooden doors on platform
  │ Instructed to explore
  ↓ [Walk to North door]
Room 1: Main Gallery
  │ Traditional gallery with 28 NFTs
  │ Teal portal (back to Room 0)
  │ Blue portal (forward to Room 2)
  ↓ [Walk through blue portal]
Room 2: Gallery Continuation
  │ 44 NFTs on walls
  │ Green portal (forward to Room 3)
  ↓ [Walk through green portal]
Room 3: Large Cubic Gallery
  │ 35 NFTs in massive cubic structure
  │ Blue portal (back to Room 2)
  │ Purple portal (forward to Room 4)
  ↓ [Walk through purple portal]
Room 4: Floating Island
  │ 20 NFTs in natural landscape
  │ Purple portal (back to Room 3, uses spawn param)
  │ Purple portal (forward to Room 5)
  ↓ [Walk through portal to Room 5]
Room 5: Eternal Eclipse
  │ 12 double-sided NFTs (131-142)
  │ Dark atmospheric finale
  │ Purple portal (back to Room 4)
  ↓ [Either return to Room 4 or use nav menu]
END OF MAIN PATH
```

**Total NFTs in main path**: 139 images (NFTs 1-127 + 131-142, with gap at 128-130)

**Estimated Time**: 10-15 minutes for complete walkthrough

---

### Path 2: Branch A - Undersea Observatory

```
Room 0: Ocean Entry Hub
  ↓ [Walk to NE door]
Room A: Undersea Observatory
  │ Underwater dome environment
  │ 17 video screens
  │ Animated fish models
  │ Teal portal (back to Room 0)
  │ Portal (to Room A1) - BROKEN
  ↓ [Attempt to go to Room A1]
ERROR: roomA1.html does not exist
```

**Status**: ⚠️ Partially broken

**Estimated Time**: 3-5 minutes

**Issues**:
- Portal to Room A1 will cause 404 error
- Dead-end unless user returns to Room 0

---

### Path 3: Branch B - Gallery Room

```
Room 0: Ocean Entry Hub
  ↓ [Walk to SE door]
Room B: NFT Gallery Room
  │ Large metallic gallery
  │ 60 NFTs (B1.png - B60.png)
  │ Mirror ceiling
  │ Copper tile decorations
  │ Audio playing (songroomB.mp3)
  │ Special floating/hovering mechanic
  │ Teal portal (back to Room 0)
  ↓ [Return to Room 0 via portal]
Room 0: Ocean Entry Hub
```

**Status**: ✅ Working

**Estimated Time**: 5-7 minutes

**Notes**:
- Branch B is a complete loop back to Room 0
- Features unique mechanics (floating, audio)
- 60 unique NFTs not seen elsewhere

---

### Path 4: Branch C - Frame Waterfall Gallery

```
Room 0: Ocean Entry Hub
  ↓ [Walk to SW door]
ERROR: roomC.html does not exist
(404 Page Not Found)
```

**Status**: ❌ Completely broken

**Issues**:
- Room C referenced in Room 0 code
- Label says "Frame Waterfall Gallery"
- Neither roomC.html nor roomC.js exist
- Will cause browser 404 error

---

### Path 5: Branch D - Coming Soon

```
Room 0: Ocean Entry Hub
  ↓ [Walk to NW door]
BLOCKED: Alert message "Room D coming soon!"
(Does not navigate)
```

**Status**: ⚠️ Intentionally disabled

**Notes**:
- Working as intended
- Placeholder for future content

---

## Orphaned Rooms (No Direct Path)

These rooms exist but have no portal connections. Only accessible via:
- Direct URL entry
- Global navigation menu

### Room 6: Video Corridor

**Access**: Direct URL `room6.html` or nav menu

**Content**:
- 100-unit long corridor
- 13 video screens
- Videos: Amy1.mp4, Angel1.mp4, etc.

**Exit**: ❌ No portal out - Must use nav menu or browser back

---

### Room 7: Starry Gallery

**Access**: Direct URL `room7.html` or nav menu

**Content**:
- Dark space with starry ceiling
- 1000 star particles
- Room7 folder images (AI-generated art)
- 20 warm spotlights

**Exit**: ❌ No portal out - Must use nav menu or browser back

---

### Room 8: Checkered Frame Room

**Access**: Direct URL `room8.html` or nav menu

**Content**:
- Small 10×10 meter cube
- Checkerboard grey frames on all surfaces
- No actual NFT content

**Purpose**: Likely a test/prototype room

**Exit**: ❌ No portal out - Must use nav menu or browser back

---

### Room 9: Cylindrical Tunnel Gallery

**Access**: Direct URL `room9.html` or nav menu

**Content**:
- Futuristic cylindrical tunnel
- NFTs 1-40 on alternating wall panels
- Glass floor strips
- Sphere decorations

**Exit**: ❌ No portal out - Must use nav menu or browser back

---

## Movement Controls

### Desktop

**Mouse + Keyboard**:
- Click to lock pointer (PointerLock controls)
- **WASD** or **Arrow Keys**: Move forward/back/left/right
- **Mouse**: Look around (camera rotation)
- **Space**: Jump (in most rooms)
- **Escape**: Unlock pointer / show menu overlay

**Speed**: Varies by room (20-100 units/second)

### Mobile

**Touch Controls**:
- Virtual joysticks (using nipplejs library)
- **Left joystick**: Movement
- **Right joystick**: Camera look
- Landscape orientation enforced

**Detection**: `/Mobi|Android|iPhone|iPad/.test(navigator.userAgent)`

---

## NFT Interaction

### Click to View

**How it works**:
1. User clicks on NFT frame in scene
2. Raycasting detects intersection with picture plane
3. Full-screen overlay opens
4. NFT displays at maximum resolution
5. Left/Right arrows navigate between NFTs
6. Escape to close and return to 3D view

**Viewer Controls**:
- **Left Arrow** / **Left Click**: Previous NFT
- **Right Arrow** / **Right Click**: Next NFT
- **Escape**: Close viewer and return to scene
- **Mouse Wheel**: (Not implemented) Could add zoom

**Additional Info Displayed**:
- NFT index number
- Current position in collection (e.g., "3/28")
- OpenSea purchase link (Room 1 only)

---

## Room Transition Sequence

### Standard Portal Transition

```
1. User approaches portal
   │
2. Distance < 3.0 units
   │ → Display instruction text
   │
3. Distance < 1.5 units for 1 second
   │ → Trigger transition
   │
4. Show loading overlay (opacity: 0 → 1)
   │ → Animated progress bar
   │
5. setTimeout(500ms)
   │
6. window.location.href = 'roomX.html'
   │ → Browser navigates to new page
   │
7. New room HTML loads
   │ → Run roomX.js module
   │
8. Three.js scene initializes
   │ → Load textures, create geometry
   │
9. Loading overlay fades (opacity: 1 → 0)
   │ → setTimeout(500-3000ms)
   │
10. Display 'none' on overlay
   │
11. Controls activate
   │ → User can move
```

**Total Transition Time**: ~2-5 seconds (depends on assets)

---

## Known UX Issues

### 1. Accidental Teleportation

**Problem**: User walks too close to portal, gets teleported unintentionally

**Current Mitigation**:
- Timer-based activation (must be near portal for ~1 second)
- Large proximity threshold warnings

**Improvement Ideas**:
- Require keypress (E to enter) in addition to proximity
- More prominent visual warning zone
- Audio cue when entering portal zone

### 2. Broken Links Cause Confusion

**Problem**: Room C and Room A1 doors lead to 404 errors

**Impact**: Breaks immersion, confuses users

**Current Status**: Documented but not fixed

**Fix Required**:
- Create missing roomC.html/js files
- Create missing roomA1.html file
- OR remove broken doors from Room 0 and Room A

### 3. Orphaned Rooms Undiscoverable

**Problem**: Rooms 6, 7, 8, 9 have no in-world access

**Impact**: Content hidden from normal users

**Options**:
- Add portals to connect these rooms
- Add signage/NPCs in Room 0 pointing to nav menu
- Create a "bonus gallery" section in Room 0

### 4. No Clear "You Are Here" Indicator

**Problem**: Users get lost, don't know current room

**Impact**: Disorientation, especially after using nav menu

**Improvement Ideas**:
- Room name display in corner of screen
- Minimap showing room connections
- Breadcrumb trail in UI

### 5. NFT Viewer Doesn't Show Metadata

**Problem**: No NFT title, description, artist, price info

**Current**: Just shows index number

**Improvement Ideas**:
- Load metadata from JSON file
- Display title, description, artist
- Show rarity, attributes
- Link to OpenSea/marketplace

---

## Optimal User Flow Recommendations

### For First-Time Visitors

**Recommended Path**:
```
1. Start at Room 0 (automatic)
2. Explore the ocean, look at doors
3. Enter Main Gallery door (north)
4. Progress through Rooms 1 → 2 → 3 → 4 → 5
5. Return to Room 0 via portal chain
6. Explore Branch A (Observatory)
7. Explore Branch B (Gallery Room)
8. Use nav menu to visit Rooms 6, 7, 9 (bonus content)
```

**Total Time**: ~30-45 minutes for complete tour

### For Repeat Visitors

**Quick Navigation**:
```
1. Use nav menu to jump directly to desired room
2. View specific NFT collections
3. Bypass hub room entirely
```

---

## Future UX Improvements

### Portal Enhancements

- **Named Portals**: Floating text labels above portals
- **Preview Windows**: Show thumbnail of destination room
- **Portal Activation**: Require keypress + proximity (not just proximity)
- **Return Portals**: Always show path back to Room 0

### Navigation Aids

- **Minimap**: 2D overlay showing room connections
- **Room Labels**: Persistent UI showing current room name
- **Progress Tracker**: "You've seen X/239 NFTs"
- **Bookmark System**: Save favorite NFTs

### Accessibility

- **Keyboard-Only Navigation**: Current PointerLock limits accessibility
- **Speed Controls**: Let users adjust movement speed
- **Teleport Mode**: Jump directly to NFT instead of walking
- **2D Fallback**: Gallery list view for users who can't navigate 3D

### Content Discovery

- **Guided Tours**: Automated camera path through gallery
- **Featured NFTs**: Highlighted frames with special effects
- **Search Function**: Find NFT by number or metadata
- **Collections**: Group NFTs by artist/theme

---

## Summary Flow Diagram

```
                         ┌──────────────┐
                         │  START HERE  │
                         │   (Room 0)   │
                         │  Ocean Hub   │
                         └───────┬──────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        │                        │                        │
    ┌───▼───┐                ┌──▼───┐                ┌──▼───┐
    │ Main  │                │ Room │                │ Room │
    │Gallery│                │  A   │                │  B   │
    │(1→5)  │                │ ❌ A1│                │ ✅   │
    └───┬───┘                └──┬───┘                └──┬───┘
        │                        │                        │
        │                        └────────┬───────────────┘
        │                                 │
    ┌───▼───────────────────┐             │
    │ Room 1 (Main Gallery) │             │
    │ NFTs 1-28            │◄────────────┘
    └────┬──────────────────┘         Back to
         │                            Room 0
    ┌────▼────┐
    │ Room 2  │
    │ NFTs    │
    │ 29-72   │
    └────┬────┘
         │
    ┌────▼────┐
    │ Room 3  │
    │ NFTs    │
    │ 73-107  │
    └────┬────┘
         │
    ┌────▼────┐
    │ Room 4  │
    │ Floating│
    │ NFTs    │
    │ 108-127 │
    └────┬────┘
         │
    ┌────▼────┐
    │ Room 5  │
    │ Eclipse │
    │ NFTs    │
    │ 131-142 │
    └─────────┘
         │
         └───► Back to Room 4



ORPHANED (Nav Menu Only):
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Room 6 │ │ Room 7 │ │ Room 8 │ │ Room 9 │
│ Video  │ │ Starry │ │ Frames │ │ Tunnel │
└────────┘ └────────┘ └────────┘ └────────┘

BROKEN:
❌ Room C (404)
❌ Room A1 (404)

DISABLED:
⚠️ Room D (intentional)
```
