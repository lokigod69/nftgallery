# NFT Gallery

## Architecture Overview

This NFT Gallery is structured as a branching system of interconnected 3D rooms. Each room features different NFTs and unique environments.

### Room Structure

- **Room 0 (Ocean)**: The entry point to the gallery. Features an infinite ocean with five wooden doors leading to different branches of rooms.
  - One door leads to Room 1 (Main Gallery)
  - Four doors are reserved for future room branches (A, B, C, D)

- **Room 1 (Main Gallery)**: The original main room, now accessible from Room 0.
  - Connects to Room 2
  - Connects back to Room 0

- **Room 2**: Connected to Room 1 and Room 3

- **Room 3**: Connected to Room 2 and Room 4

- **Room 4 (Floating Island)**: Features a floating island with NFTs
  - Connected to Room 3 and Room 5

- **Room 5 (Eternal Eclipse)**: Dark-themed room with eclipse effect
  - Connected to Room 4

### Navigation Flow

```
Room 0 (Entry Point)
├── Room 1 (Main Gallery)
│   └── Room 2
│       └── Room 3
│           └── Room 4 (Floating Island)
│               └── Room 5 (Eternal Eclipse)
├── Room A (Future)
│   └── ...
├── Room B (Future)
│   └── ...
├── Room C (Future)
│   └── ...
└── Room D (Future)
    └── ...
```

## Development

### Adding New Rooms

To add new room branches from Room 0:
1. Create a new room HTML file (e.g., `roomA.html`)
2. Create a new room JavaScript file (e.g., `roomA.js`)
3. Update the destination in Room 0's wooden door in `room0.js`

### Required Assets

The application uses the following asset files:
- `/assets/waternormals.jpg` - Normal map for water
- `/assets/wooden_door.jpg` - Texture for doors
- `/assets/wooden_frame.jpg` - Texture for door frames
- `/assets/wood_texture.jpg` - Texture for platforms

Fallback procedural textures are included if these files are not available.

## Running the Application

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

The application will start at Room 0, the ocean with wooden doors. 