# NFT Gallery

A 3D interactive gallery showcasing NFT artwork in immersive Three.js environments.

## Architecture Overview

This NFT Gallery is structured as a branching system of interconnected 3D rooms. Each room features different NFTs and unique environments, all optimized with WebP image format for superior performance.

### Room Structure

**Main Progression Path:**
- **Room 0 (Ocean Hub)**: Entry point featuring an infinite ocean with five wooden doors
- **Room 1 (Main Gallery)**: Traditional gallery (NFTs 1-28)
- **Room 2 (Gallery Continuation)**: Extended gallery space (NFTs 29-72)
- **Room 3 (Large Cubic Gallery)**: Massive cubic structure (NFTs 73-107)
- **Room 4 (Floating Island)**: Sky island environment (NFTs 108-127)
- **Room 5 (Eternal Eclipse)**: Dark atmospheric room (NFTs 131-142)
- **Room 6 (Video Corridor)**: Linear corridor with 13 video displays

**Branch Paths from Room 0:**
- **Room A (Undersea Observatory)**: Underwater dome with 17 video frames
  - **Room A1 (Observatory Annex)**: Large gallery extension with NFTs
- **Room B (Musical Journey)**: Audiovisual world with 60 NFTs and mirror ceiling
- **Room C (Concept Chamber)**: Industrial aesthetic with NFTs 50-55 (WIP)

**Bonus/Orphaned Rooms (accessible via direct URL or nav menu):**
- **Room 7 (Starry Gallery)**: 38 AI-generated art images with dramatic lighting
- **Room 8 (Liminal Passage)**: Geometric tunnel with procedural forms
- **Room 9 (Organic Tunnel)**: Bio-luminescent passage with art alcoves
- **Room 10 (The Ascent)**: Legendary vertical jump puzzle with 28 platforms

### Navigation Flow

```
Room 0 (Ocean Hub)
├── Main Path: Room 1 → 2 → 3 → 4 → 5 → 6
├── Branch A: Room A ↔ Room A1
├── Branch B: Room B
└── Branch C: Room C
```

**Total Stats:**
- 16 implemented rooms (12 connected, 4 orphaned)
- 245+ NFT artworks
- 30+ video displays
- All images in WebP format for optimal performance

## Development

### Adding New Rooms

To add new room branches from Room 0:
1. Create a new room HTML file (e.g., `roomA.html`)
2. Create a new room JavaScript file (e.g., `roomA.js`)
3. Update the destination in Room 0's wooden door in `room0.js`

### Asset Format & Management

**Image Format:** All gallery images use **WebP format** for superior compression and performance.

**Asset Organization:**
- `/public/assets/` - All production assets
  - `nft1.webp` - `nft142.webp` - Main NFT collection
  - `Room7/` - 38 AI-generated art images
  - `RoomB/` - `b1.webp` - `b60.webp` (Room B NFTs)
  - `RoomX/` - `1.webp` - `50.webp` (Room X platform tiles)
  - Texture files: `wood_floor*.webp`, `copper*.webp`, `metal*.webp`, `waternormals.webp`
  - Video files: `*.mp4` (videos remain in MP4 format)

**Centralized Asset Loading:**
All texture URLs are managed through helper functions in [src/core/asset-utils.js](src/core/asset-utils.js):
- `getTextureUrl(path)` - Base WebP texture loader
- `getNftUrl(number)` - Main NFT collection
- `getRoomBNftUrl(index)` - Room B NFTs
- `getRoom7ArtUrl(filename)` - Room 7 art
- `getRoomXNftUrl(number)` - Room X platform tiles

**Performance Benefits:**
- ~85% file size reduction vs. PNG/JPG
- Faster loading times across all rooms
- Reduced VRAM usage (e.g., Room 7: 150-300 MB → 20-40 MB)

**Format Changes:** To change image format in the future, edit only `getTextureUrl()` in `asset-utils.js`.

## Running the Application

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

The application will start at Room 0, the ocean with wooden doors. 