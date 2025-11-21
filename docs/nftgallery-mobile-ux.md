# NFT Gallery Mobile UX Documentation

Internal developer reference for the mobile user experience implementation.

---

## 1. Overview

The NFT Gallery is a Three.js-based virtual gallery where users can explore rooms and interact with NFT artworks. The mobile experience provides touch-based navigation via dual joysticks and tap-to-view NFT interactions.

### Key Files

| File | Purpose |
|------|---------|
| `src/core/nft-viewer.js` | Unified NFT viewer system |
| `src/core/mobile-controls.js` | Joystick controls and touch handling |
| `main.js` | Room 1 setup and interaction |
| `room2.js`, `room4.js`, `room5.js` | Additional room implementations |

---

## 2. Unified NFT Viewer

The NFT viewer (`src/core/nft-viewer.js`) provides a consistent viewing experience across all rooms.

### Initialization

```javascript
import { createNFTViewer } from './src/core/nft-viewer.js';

const nftViewer = createNFTViewer({
  getNFTList: () => nftData,           // Returns array of { mesh, image, title, artist }
  camera: camera,
  enablePortraitSwipe: true,           // Enable swipe navigation in portrait mode
  onOpen: (nft, index) => {            // Called when viewer opens
    if (mobileControls?.resetInput) {
      mobileControls.resetInput();
    }
  },
  onClose: () => {                     // Called when viewer closes
    if (mobileControls?.resetInput) {
      mobileControls.resetInput();
    }
  }
});
```

### Core Methods

- `openByMesh(mesh)` - Open viewer for specific NFT mesh
- `openByIndex(index)` - Open viewer at specific index
- `close()` - Close the viewer
- `isOpen()` - Returns true if viewer is currently open
- `goPrev()` / `goNext()` - Navigate between NFTs

### Global State

The viewer sets global flags when open:
- `window.__NFT_VIEWER_OPEN = true`
- `document.body.classList.add('nft-viewer-open')`

---

## 3. Mobile Controls

The mobile controls system (`src/core/mobile-controls.js`) provides dual joystick navigation.

### Initialization

```javascript
import { initMobileControls } from './src/core/mobile-controls.js';

const mobileControls = initMobileControls({
  camera: camera,
  onInteract: (raycaster) => { /* handle tap */ },
  onJump: () => { /* handle jump */ }
});
```

### Joystick Layout

- **Left Joystick**: Movement (forward/back/strafe)
  - Tap triggers jump action
- **Right Joystick**: Camera look (yaw/pitch)

### resetInput() Method

Clears all movement and look state to prevent stuck controls:

```javascript
mobileControls.resetInput();
```

This should be called:
- When NFT viewer opens
- When NFT viewer closes
- On orientation changes

---

## 4. Portrait vs Landscape Behavior

### Portrait Mode (Default Mobile)

- Dual joysticks positioned at bottom of screen
- Swipe gestures enabled for NFT navigation (when `enablePortraitSwipe: true`)
- Touch anywhere in center zone to interact with NFTs

### Landscape Mode

- Joysticks repositioned for wider layout
- Swipe gestures disabled
- Arrow buttons appear for NFT navigation

### Swipe Detection

Portrait swipe thresholds:
- Minimum distance: 50px
- Maximum duration: 300ms
- Direction: Horizontal swipes only

---

## 5. Orientation Warning

The gallery displays a landscape orientation warning on mobile devices.

### Behavior

- Appears when device is in portrait mode
- Respects viewer state (hidden when NFT viewer is open)
- Automatically dismissed when user rotates to landscape

### Integration

The orientation warning checks `window.__NFT_VIEWER_OPEN` and body class before displaying.

---

## 6. Interaction Rules

### Raycasting Pipeline

All rooms use the same interaction flow:

```javascript
onInteract: (raycaster) => {
  // 1. Check if viewer is already open
  if (nftViewer?.isOpen?.()) return;

  // 2. Cast ray against NFT planes
  const intersects = raycaster.intersectObjects(picturePlanes, false);
  if (intersects.length === 0) return;

  const hit = intersects[0];
  const nft = hit.object;

  // 3. Front-facing filter (prevents back-of-canvas hits)
  if (hit.face && nft?.matrixWorld) {
    const worldNormal = hit.face.normal.clone()
      .transformDirection(nft.matrixWorld);
    const camToHit = hit.point.clone()
      .sub(camera.position).normalize();
    const alignment = worldNormal.dot(camToHit.clone().multiplyScalar(-1));
    if (alignment < 0.5) return;
  }

  // 4. NFT validation
  if (!nft.userData?.isNFT) return;

  // 5. Distance check
  if (hit.distance > MAX_NFT_INTERACTION_DISTANCE) return;

  // 6. Open viewer
  nftViewer.openByMesh(nft);
}
```

### Distance Gating

```javascript
const MAX_NFT_INTERACTION_DISTANCE = 35;
```

Prevents interaction with NFTs that are too far away.

### Front-Facing Filter

The alignment threshold of `0.5` ensures:
- Only front-facing NFTs can be selected
- Tapping between NFTs doesn't open random ones
- Back-of-canvas hits are ignored

---

## 7. Room Configuration Checklist

When adding a new room, ensure:

- [ ] Import `createNFTViewer` and `initMobileControls`
- [ ] Set `enablePortraitSwipe: true` for mobile swipe support
- [ ] Wire `resetInput()` to `onOpen` and `onClose` callbacks
- [ ] Implement full raycast pipeline with front-facing filter
- [ ] Set `MAX_NFT_INTERACTION_DISTANCE` constant
- [ ] Add `isNFT: true` to all NFT mesh userData

---

## 8. Debugging

### Common Issues

**Camera stuck after closing viewer**
- Ensure `resetInput()` is called in `onClose` callback

**Wrong NFT opens when tapping**
- Check front-facing filter is implemented
- Verify alignment threshold is 0.5

**Viewer won't open**
- Check `isOpen()` guard at start of `onInteract`
- Verify mesh has `userData.isNFT = true`

**Swipes not working in portrait**
- Confirm `enablePortraitSwipe: true` in viewer config
- Check device is in portrait orientation

---

*Last updated: Phase P2 cleanup*
