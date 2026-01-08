import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ═══════════════════════════════════════════════════════════════════════
// Room 9: "The Archive Spiral" - Meditative Memory Labyrinth
// ═══════════════════════════════════════════════════════════════════════
//
// IMPLEMENTATION NOTES:
// - Grid: 25×25 cells generating rectangular clockwise spiral path
// - Room: 48×48×8 world units cubic chamber centered at origin
// - Portal: Center at (0, 2.5, 3) leading to Room 5 (Eternal Eclipse)
// - NFTs: 18 monochromatic photographs from /assets/Room9/ on walls along spiral
// - Guidance: 6 cyan point lights pulling player inward + central beacon
// - Obelisks: 3 ancient tech markers in central 3×3 chamber (terminus reward)
//   - Triangular arrangement around portal (radius 3.5 units)
//   - Scaled to 0.45 to fit 8-unit ceiling
//   - Cyan glow bands match room's archive theme
// - Movement: Rectangular bounds, controls.getObject() pattern (Room 6-style)
//
// CONFIG KNOBS:
// - ROOM9_CONFIG.nftCount: Number of NFTs to place (default 18)
// - ROOM9_CONFIG.debugPrintGrid: Console ASCII maze output (default false)
// - ROOM9_CONFIG.enableCenterParticles: Atmospheric data motes (default true)
// - ROOM9_CONFIG.guidanceLightCount: Spiral ring lights (default 6)
//
// COLLISION SYSTEM:
// - Grid-based wall collision (9-point circular check, 0.4 unit radius)
// - Wall sliding (separate X/Z axis movement on collision)
// - Obelisk collision (circular push-out, 1.2 unit radius)
// - Player cannot clip through walls or obelisks
//
// PERFORMANCE:
// - Walls merged into single mesh (reduces ~300 draw calls to 1)
// - 18 NFT textures loaded async from /assets/Room9/ with aspect ratio preservation
// - 8 lights total (ambient + 2 directional + 5 guidance + 1 central)
// - ~100 particles max (if enabled)
// - Target: 60 FPS, <10 MB VRAM
// ═══════════════════════════════════════════════════════════════════════

// Room 9 NFT Files - 18 PNG images from Room9 folder
const room9NftFiles = [
  'ComfyUI_03157_',
  'ComfyUI_03158_',
  'ComfyUI_03160_',
  'ComfyUI_03161_',
  'ComfyUI_03162_',
  'ComfyUI_03163_',
  'ComfyUI_03164_',
  'ComfyUI_03165_',
  'ComfyUI_03166_',
  'ComfyUI_03167_',
  'ComfyUI_03171_',
  'ComfyUI_03173_',
  'lokigod69._Cinematic_monochromatic_photograph_with_gentle_depth_6bc3d1ca-bbef-44ae-9fc0-e69c79804d51',
  'lokigod69._Cinematic_monochromatic_photograph_with_gentle_depth_7e3556a5-641c-44c6-b6a6-6ec302a9ae24',
  'lokigod69._Cinematic_monochromatic_photograph_with_gentle_depth_caa0e3d0-1a4a-4f18-899b-af6fc4f6d701',
  'lokigod69._Cinematic_monochromatic_photograph_with_gentle_depth_da1a421f-2e6c-43d8-b738-18b3188408aa',
  'lokigod69._Cinematic_monochromatic_photograph_with_gentle_depth_e0aa6ceb-d808-4589-b659-09ade63ef468',
  'lokigod69._Cinematic_monochromatic_photograph_with_gentle_depth_f2c690f6-7093-467b-b177-42ee6ab79043'
];

// ═══════════════════════════════════════════════════════════════════════
// Ancient Tech Obelisk System (Archive Terminus Markers)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Procedural sandstone texture generator
 */
function createSandstoneTexture() {
  const size = 512; // Balanced resolution
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base sandstone color
  ctx.fillStyle = '#C2A278';
  ctx.fillRect(0, 0, size, size);

  // Large noise (cloud-like variations)
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 80 + 15;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? '#a88b68' : '#d4b488';
    ctx.globalAlpha = 0.1;
    ctx.fill();
  }

  // Fine grain noise
  for (let i = 0; i < 30000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = Math.random() > 0.5 ? '#5e4328' : '#ffffff';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x, y, 2, 2);
  }

  // Weathering scratches
  ctx.strokeStyle = '#4a332a';
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }

  // Edge darkening (subtle vignette)
  const grad = ctx.createRadialGradient(size/2, size/2, size/3, size/2, size/2, size/1.5);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(60,40,20,0.1)');
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Singleton shared assets
const obeliskSharedAssets = {
  stoneTexture: null,
  stoneMaterial: null,
  glowMaterial: null
};

/**
 * Initialize shared obelisk materials (call once)
 */
function initObeliskMaterials() {
  if (obeliskSharedAssets.stoneMaterial) return;

  obeliskSharedAssets.stoneTexture = createSandstoneTexture();

  obeliskSharedAssets.stoneMaterial = new THREE.MeshStandardMaterial({
    map: obeliskSharedAssets.stoneTexture,
    roughness: 0.9,
    metalness: 0.0,
    bumpMap: obeliskSharedAssets.stoneTexture,
    bumpScale: 0.04
  });

  obeliskSharedAssets.glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff // Cyan to match room's guidance lights
  });
}

/**
 * Create a single ancient tech obelisk
 * Returns: THREE.Group with obelisk geometry + local cyan PointLight
 */
function createAncientObelisk() {
  const cfg = ROOM9_CONFIG;
  const obeliskGroup = new THREE.Group();
  const scale = cfg.obeliskScale;

  // 1. Base slabs
  const base1 = new THREE.Mesh(
    new THREE.BoxGeometry(4 * scale, 1 * scale, 4 * scale),
    obeliskSharedAssets.stoneMaterial
  );
  base1.position.y = 0.5 * scale;
  obeliskGroup.add(base1);

  const base2 = new THREE.Mesh(
    new THREE.BoxGeometry(3.2 * scale, 0.8 * scale, 3.2 * scale),
    obeliskSharedAssets.stoneMaterial
  );
  base2.position.y = 1.4 * scale;
  obeliskGroup.add(base2);

  // 2. Glowing core shaft (tapered 4-sided pyramid)
  const shaftHeight = 8 * scale;
  const coreTopW = 1.8 * scale;
  const coreBotW = 2.4 * scale;
  
  const coreGeo = new THREE.CylinderGeometry(
    coreTopW * 0.5, coreBotW * 0.5, shaftHeight, 4
  );
  coreGeo.rotateY(Math.PI / 4);
  
  const core = new THREE.Mesh(coreGeo, obeliskSharedAssets.glowMaterial);
  core.position.y = 1.8 * scale + shaftHeight / 2;
  obeliskGroup.add(core);

  // 3. Stone cladding (corner posts and face plates with glow slits)
  const claddingGroup = new THREE.Group();
  claddingGroup.position.y = 1.8 * scale + shaftHeight / 2;
  obeliskGroup.add(claddingGroup);

  // Corner posts (simplified for performance)
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + (Math.PI / 4);
    const postGeo = new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, shaftHeight, 4);
    postGeo.rotateY(Math.PI / 4);
    
    const post = new THREE.Mesh(postGeo, obeliskSharedAssets.stoneMaterial);
    
    const dist = (coreBotW/2 + coreTopW/2)/2 + 0.1 * scale;
    post.position.set(
      Math.sin(angle) * dist,
      0,
      Math.cos(angle) * dist
    );
    
    claddingGroup.add(post);
  }

  // Face plates (3 segments per face with gaps for cyan glow slits)
  const gapSize = 0.3 * scale;
  const segmentH = (shaftHeight - (gapSize * 2)) / 3;
  
  const getWidthAtY = (yLocal) => {
    const t = 0.5 - (yLocal / shaftHeight);
    return THREE.MathUtils.lerp(coreTopW, coreBotW, t);
  };

  const plates = [
    { y: segmentH + gapSize, h: segmentH },
    { y: 0, h: segmentH },
    { y: -(segmentH + gapSize), h: segmentH }
  ];

  for (let i = 0; i < 4; i++) {
    const faceAngle = (Math.PI / 2) * i;
    
    plates.forEach(p => {
      const wTop = getWidthAtY(p.y + p.h/2);
      const wBot = getWidthAtY(p.y - p.h/2);
      
      const pGeo = new THREE.CylinderGeometry(wTop * 0.6, wBot * 0.6, p.h, 4);
      pGeo.rotateY(Math.PI / 4);
      pGeo.scale(1, 1, 0.2);

      const mesh = new THREE.Mesh(pGeo, obeliskSharedAssets.stoneMaterial);
      const dist = (wTop + wBot) / 4 + 0.15 * scale;
      mesh.position.set(0, p.y, dist);

      const pivot = new THREE.Group();
      pivot.rotation.y = faceAngle;
      pivot.add(mesh);
      claddingGroup.add(pivot);
    });
  }

  // 4. Capstone
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(2.4 * scale, 0.6 * scale, 2.4 * scale),
    obeliskSharedAssets.stoneMaterial
  );
  cap.position.y = 1.8 * scale + shaftHeight + 0.3 * scale;
  obeliskGroup.add(cap);

  const capDetail = new THREE.Mesh(
    new THREE.BoxGeometry(2.0 * scale, 0.2 * scale, 2.0 * scale),
    obeliskSharedAssets.stoneMaterial
  );
  capDetail.position.y = 1.8 * scale + shaftHeight - 0.1 * scale;
  obeliskGroup.add(capDetail);

  // 5. Local cyan PointLight (matches room's guidance theme)
  const glowLight = new THREE.PointLight(
    0x00ffff,
    cfg.obeliskLightIntensity,
    cfg.obeliskLightDistance
  );
  glowLight.position.set(0, 3 * scale, 0);
  obeliskGroup.add(glowLight);

  return obeliskGroup;
}

/**
 * Place obelisks in the central chamber around the portal
 * Strategy: Triangular arrangement at terminus of spiral path
 */
function placeObelisksInCenter() {
  const cfg = ROOM9_CONFIG;
  if (!cfg.enableObelisks) return [];

  initObeliskMaterials();

  const obelisks = [];
  const portalPos = { x: 0, y: 0, z: 3 }; // Portal offset from true center
  const radius = cfg.obeliskRadiusFromCenter;

  // Triangular arrangement (3 obelisks facing inward)
  for (let i = 0; i < cfg.obeliskCount; i++) {
    const angle = (i / cfg.obeliskCount) * Math.PI * 2 + Math.PI / 6; // Offset for aesthetics
    const x = portalPos.x + Math.cos(angle) * radius;
    const z = portalPos.z + Math.sin(angle) * radius;

    const obelisk = createAncientObelisk();
    obelisk.position.set(x, 0, z);
    
    // Rotate to face portal
    obelisk.lookAt(portalPos.x, 0, portalPos.z);

    scene.add(obelisk);
    obelisks.push(obelisk);
  }

  console.log(`✓ Placed ${obelisks.length} ancient obelisks in central chamber (Archive Terminus)`);
  return obelisks;
}

// Room 9 Master Configuration
const ROOM9_CONFIG = {
  // Maze grid
  gridWidth: 25,
  gridHeight: 25,
  cellSize: 1.8,
  
  // Room dimensions
  roomSize: 48,
  roomHeight: 8,
  wallHeight: 6,
  
  // Corridor sizing
  corridorWidth: 2.4,
  wallThickness: 1.2,
  
  // Player
  eyeHeight: 2.5,
  speed: 90.0,
  gravity: -30,
  
  // Content
  nftCount: 18,
  nftBaseSize: 1.6,  // Base size, will be adjusted for aspect ratio
  guidanceLightCount: 6,
  
  // VFX
  enableCenterParticles: true,
  particleCount: 80,
  
  // Ancient Obelisks (Archive Terminus Markers)
  enableObelisks: true,
  obeliskCount: 3,              // Triangular arrangement around portal
  obeliskScale: 0.45,           // Scaled to fit 8-unit ceiling
  obeliskRadiusFromCenter: 3.5, // Distance from portal
  obeliskLightIntensity: 1.2,   // Cyan glow
  obeliskLightDistance: 6,      // Focused light pool
  
  // Debug
  debugPrintGrid: false,
  
  // Performance
  mergeWallGeometry: true   // Combine walls into single mesh
};

const eyeHeight = ROOM9_CONFIG.eyeHeight;
const speed = ROOM9_CONFIG.speed;
const gravity = ROOM9_CONFIG.gravity;

// Grid cell types
const WALL = 0;
const PASSAGE = 1;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1a); // Deep midnight blue
scene.fog = new THREE.Fog(0x0a0f1a, 18, 40);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Entrance position (left edge, middle of room)
const entranceX = -ROOM9_CONFIG.roomSize / 2 + 3;
const entranceZ = 0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// CRITICAL: Set camera local position to (0,0,0) so it doesn't orbit when rotating
// Then set the yaw object (controls.getObject()) to the actual spawn position
camera.position.set(0, 0, 0);
controls.getObject().position.set(entranceX, eyeHeight, entranceZ);

document.addEventListener('click', () => {
  if (!controls.isLocked) controls.lock();
});

controls.addEventListener('lock', () => {
  const overlay = document.getElementById('controls-description');
  if (overlay) overlay.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  const overlay = document.getElementById('controls-description');
  if (overlay) overlay.style.display = 'block';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------------------
// Lighting - Architectural / Guidance System
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x2244aa, 0.15);
scene.add(ambientLight);

// Directional fill lights
const light1 = new THREE.DirectionalLight(0x445566, 0.2);
light1.position.set(8, 12, 8);
scene.add(light1);

const light2 = new THREE.DirectionalLight(0x334455, 0.15);
light2.position.set(-8, 10, -8);
scene.add(light2);

// Guidance point lights (will be positioned at spiral rings after maze generation)
const guidanceLights = [];

// ----------------------------------------------------------------------
// Maze Grid Generation - Rectangular Spiral Algorithm
// ----------------------------------------------------------------------

/**
 * Creates a 2D grid initialized with walls
 */
function createMazeGrid() {
  const grid = [];
  for (let i = 0; i < ROOM9_CONFIG.gridWidth; i++) {
    grid[i] = [];
    for (let j = 0; j < ROOM9_CONFIG.gridHeight; j++) {
      grid[i][j] = WALL;
    }
  }
  return grid;
}

/**
 * Generates a rectangular spiral path from entrance to center
 * Algorithm: Walk perimeter clockwise, then shrink bounds and repeat
 */
function generateSpiralPath(grid) {
  let left = 0;
  let right = ROOM9_CONFIG.gridWidth - 1;
  let top = 0;
  let bottom = ROOM9_CONFIG.gridHeight - 1;
  
  const path = [];
  
  while (left <= right && top <= bottom) {
    // Walk RIGHT along top edge
    for (let i = left; i <= right; i++) {
      grid[i][top] = PASSAGE;
      path.push({ x: i, z: top });
    }
    top++;
    
    // Walk DOWN along right edge
    for (let j = top; j <= bottom; j++) {
      grid[right][j] = PASSAGE;
      path.push({ x: right, z: j });
    }
    right--;
    
    // Walk LEFT along bottom edge (if still valid)
    if (top <= bottom) {
      for (let i = right; i >= left; i--) {
        grid[i][bottom] = PASSAGE;
        path.push({ x: i, z: bottom });
      }
      bottom--;
    }
    
    // Walk UP along left edge (if still valid)
    if (left <= right) {
      for (let j = bottom; j >= top; j--) {
        grid[left][j] = PASSAGE;
        path.push({ x: left, z: j });
      }
      left++;
    }
  }
  
  // Ensure center is passage (3x3 central chamber)
  const centerX = Math.floor(ROOM9_CONFIG.gridWidth / 2);
  const centerZ = Math.floor(ROOM9_CONFIG.gridHeight / 2);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const x = centerX + dx;
      const z = centerZ + dz;
      if (x >= 0 && x < ROOM9_CONFIG.gridWidth && z >= 0 && z < ROOM9_CONFIG.gridHeight) {
        grid[x][z] = PASSAGE;
      }
    }
  }
  
  return { grid, path };
}

/**
 * Convert grid coordinates to world coordinates
 */
function gridToWorld(gridX, gridZ) {
  const cfg = ROOM9_CONFIG;
  return {
    x: (gridX - cfg.gridWidth / 2) * cfg.cellSize,
    z: (gridZ - cfg.gridHeight / 2) * cfg.cellSize
  };
}

/**
 * Debug: Print grid to console
 */
function debugPrintGrid(grid) {
  if (!ROOM9_CONFIG.debugPrintGrid) return;
  
  console.log('\n=== MAZE GRID ===');
  let output = '';
  for (let j = 0; j < ROOM9_CONFIG.gridHeight; j++) {
    for (let i = 0; i < ROOM9_CONFIG.gridWidth; i++) {
      output += grid[i][j] === WALL ? '█' : ' ';
    }
    output += '\n';
  }
  console.log(output);
  console.log(`Grid: ${ROOM9_CONFIG.gridWidth}×${ROOM9_CONFIG.gridHeight}`);
  console.log(`Entrance: Left edge, middle`);
  console.log(`Center: (${Math.floor(ROOM9_CONFIG.gridWidth/2)}, ${Math.floor(ROOM9_CONFIG.gridHeight/2)})`);
}

// ----------------------------------------------------------------------
// Maze Geometry Construction
// ----------------------------------------------------------------------

/**
 * Build physical 3D walls from grid (with optional geometry merging)
 */
function buildMazeGeometry(grid) {
  const cfg = ROOM9_CONFIG;
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1f2a,      // Dark slate gray
    roughness: 0.85,
    metalness: 0.15
  });
  
  const mazeGroup = new THREE.Group();
  const wallGeometries = [];
  
  // Create wall boxes for each WALL cell
  for (let i = 0; i < cfg.gridWidth; i++) {
    for (let j = 0; j < cfg.gridHeight; j++) {
      if (grid[i][j] === WALL) {
        const world = gridToWorld(i, j);
        const wallBox = new THREE.BoxGeometry(cfg.cellSize, cfg.wallHeight, cfg.cellSize);
        wallBox.translate(world.x, cfg.wallHeight / 2, world.z);
        wallGeometries.push(wallBox);
      }
    }
  }
  
  // Merge geometries for performance (single draw call)
  if (cfg.mergeWallGeometry && wallGeometries.length > 0) {
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(wallGeometries);
    const mergedWalls = new THREE.Mesh(mergedGeometry, wallMaterial);
    scene.add(mergedWalls);
    console.log(`✓ Built maze with ${wallGeometries.length} walls (merged into 1 mesh)`);
  } else {
    // Fallback: individual meshes
    wallGeometries.forEach(geom => {
      const wallMesh = new THREE.Mesh(geom, wallMaterial);
      mazeGroup.add(wallMesh);
    });
    scene.add(mazeGroup);
    console.log(`✓ Built maze with ${mazeGroup.children.length} wall segments`);
  }
  
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(cfg.roomSize, cfg.roomSize);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d0f14,      // Very dark blue-black
    roughness: 0.6,
    metalness: 0.2
  });
  
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);
  
  // Outer boundary walls (enclose room)
  const boundaryMaterial = wallMaterial.clone();
  const halfSize = cfg.roomSize / 2;
  const wallThick = 0.5;
  
  // North wall
  const northWall = new THREE.Mesh(
    new THREE.BoxGeometry(cfg.roomSize, cfg.roomHeight, wallThick),
    boundaryMaterial
  );
  northWall.position.set(0, cfg.roomHeight / 2, -halfSize);
  scene.add(northWall);
  
  // South wall
  const southWall = northWall.clone();
  southWall.position.set(0, cfg.roomHeight / 2, halfSize);
  scene.add(southWall);
  
  // East wall
  const eastWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, cfg.roomHeight, cfg.roomSize),
    boundaryMaterial
  );
  eastWall.position.set(halfSize, cfg.roomHeight / 2, 0);
  scene.add(eastWall);
  
  // West wall (with entrance gap)
  const westWall = eastWall.clone();
  westWall.position.set(-halfSize, cfg.roomHeight / 2, 0);
  scene.add(westWall);
  
  return mazeGroup;
}

// ----------------------------------------------------------------------
// NFT Placeholder Placement
// ----------------------------------------------------------------------

/**
 * Detect positions along spiral path for NFT placement
 */
function detectNFTPositions(path) {
  const positions = [];
  const cfg = ROOM9_CONFIG;
  const sampleInterval = Math.floor(path.length / cfg.nftCount); // ~18 NFTs evenly distributed

  for (let i = 0; i < path.length && positions.length < cfg.nftCount; i += sampleInterval) {
    if (i < path.length) {
      positions.push(path[i]);
    }
  }

  return positions;
}

/**
 * Place NFT planes with real texture loading from Room9 folder
 * Preserves original aspect ratios of images
 */
function placeNFTs(path) {
  const nftPositions = detectNFTPositions(path);
  const cfg = ROOM9_CONFIG;
  const baseSize = cfg.nftBaseSize;
  const textureLoader = new THREE.TextureLoader();

  const nftPlanes = [];
  let loadedCount = 0;

  // Use all 18 images, cycling if needed
  const totalImages = room9NftFiles.length;

  nftPositions.forEach((pos, index) => {
    const world = gridToWorld(pos.x, pos.z);

    // Determine wall facing based on path direction
    const nextIdx = Math.min(index + 1, path.length - 1);
    const next = path[nextIdx];
    const dx = next.x - pos.x;
    const dz = next.z - pos.z;

    // Place NFT on adjacent wall (perpendicular to path direction)
    let nftX = world.x;
    let nftZ = world.z;
    let rotationY = 0;

    if (Math.abs(dx) > Math.abs(dz)) {
      // Moving in X, place on Z wall
      nftZ += (Math.random() > 0.5 ? 1 : -1) * cfg.cellSize * 0.6;
      rotationY = 0;
    } else {
      // Moving in Z, place on X wall
      nftX += (Math.random() > 0.5 ? 1 : -1) * cfg.cellSize * 0.6;
      rotationY = Math.PI / 2;
    }

    // Get the image filename for this position
    const imageIndex = index % totalImages;
    const filename = room9NftFiles[imageIndex];
    const nftUrl = `/assets/Room9/${filename}.png`;

    // Start with black placeholder
    const placeholderMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      side: THREE.DoubleSide
    });

    const nftPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(baseSize, baseSize),
      placeholderMaterial
    );

    nftPlane.position.set(nftX, eyeHeight, nftZ);
    nftPlane.rotation.y = rotationY;

    scene.add(nftPlane);
    nftPlanes.push(nftPlane);

    // Load actual image to get dimensions, then create textured plane with correct aspect ratio
    const img = new Image();
    img.onload = function() {
      const imgWidth = img.width;
      const imgHeight = img.height;
      const aspectRatio = imgWidth / imgHeight;

      // Calculate plane dimensions based on aspect ratio
      let planeWidth, planeHeight;
      if (aspectRatio >= 1) {
        // Landscape or square
        planeWidth = baseSize;
        planeHeight = baseSize / aspectRatio;
      } else {
        // Portrait
        planeWidth = baseSize * aspectRatio;
        planeHeight = baseSize;
      }

      // Update geometry with correct aspect ratio
      nftPlane.geometry.dispose();
      nftPlane.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

      // Load texture
      textureLoader.load(
        nftUrl,
        (texture) => {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.colorSpace = THREE.SRGBColorSpace;

          nftPlane.material.dispose();
          nftPlane.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
          });

          loadedCount++;
          if (loadedCount === nftPositions.length) {
            console.log(`✓ All ${loadedCount} Room9 NFT textures loaded with original aspect ratios`);
          }
        },
        undefined,
        (error) => {
          console.warn(`⚠ Room9 NFT ${filename} failed to load`);
        }
      );
    };
    img.onerror = function() {
      console.warn(`⚠ Could not load image dimensions for ${filename}`);
    };
    img.src = nftUrl;
  });

  console.log(`✓ Placed ${nftPlanes.length} NFT planes, loading Room9 textures...`);
  return nftPlanes;
}

/**
 * Add guidance point lights at spiral ring transitions (Phase 6 - improved gradient)
 */
function addGuidanceLights(path) {
  const cfg = ROOM9_CONFIG;
  const ringCount = cfg.guidanceLightCount - 1; // -1 for central light
  const lightInterval = Math.floor(path.length / ringCount);
  
  // Color gradient: outer (dim blue) → inner (bright cyan)
  // Intensities also increase inward to pull player toward center
  const colors = [0x004488, 0x005599, 0x0066aa, 0x0088cc, 0x00aaee, 0x00ccff];
  const intensities = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85];
  const distances = [7, 7.5, 8, 8.5, 9, 9.5];
  
  for (let i = 0; i < ringCount; i++) {
    const idx = i * lightInterval;
    if (idx < path.length) {
      const pos = path[idx];
      const world = gridToWorld(pos.x, pos.z);
      
      const light = new THREE.PointLight(
        colors[Math.min(i, colors.length - 1)],
        intensities[Math.min(i, intensities.length - 1)],
        distances[Math.min(i, distances.length - 1)]
      );
      light.position.set(world.x, 3.0, world.z);
      scene.add(light);
      guidanceLights.push(light);
    }
  }
  
  // Central beacon (brighter, warmer cyan)
  const centerLight = new THREE.PointLight(0x00ffff, 1.3, 14);
  centerLight.position.set(0, 4.5, 0);
  scene.add(centerLight);
  guidanceLights.push(centerLight);
  
  console.log(`✓ Added ${guidanceLights.length} guidance lights (gradient: dim blue → bright cyan)`);
}

/**
 * Create subtle atmospheric particles at center (Phase 8 - optional VFX)
 */
function createCenterParticles() {
  if (!ROOM9_CONFIG.enableCenterParticles) return null;
  
  const particleCount = ROOM9_CONFIG.particleCount;
  const positions = [];
  const velocities = [];
  
  // Create particles in a small volume around center
  for (let i = 0; i < particleCount; i++) {
    // Random position in 4x4x4 cube around center
    positions.push(
      (Math.random() - 0.5) * 4,    // x
      Math.random() * 4 + 1,         // y (1-5)
      (Math.random() - 0.5) * 4      // z
    );
    
    // Slow upward drift with slight horizontal wobble
    velocities.push(
      (Math.random() - 0.5) * 0.02,  // x velocity
      Math.random() * 0.03 + 0.01,   // y velocity (upward)
      (Math.random() - 0.5) * 0.02   // z velocity
    );
  }
  
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: 0x00ccff,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);
  
  console.log(`✓ Created ${particleCount} center particles (data motes)`);
  
  return { particles: particleSystem, velocities };
}

// ----------------------------------------------------------------------
// Generate & Build Maze
// ----------------------------------------------------------------------
// Collision detection state (declared before assignment)
let collisionGrid = null;
let collisionObelisks = [];

const mazeGrid = createMazeGrid();
const { grid, path } = generateSpiralPath(mazeGrid);

// Debug: Print grid to console
debugPrintGrid(grid);

// Build 3D geometry
const mazeWalls = buildMazeGeometry(grid);

// Store grid for collision detection
collisionGrid = grid;

// Place content
const nftPlanes = placeNFTs(path);
addGuidanceLights(path);
const centerParticles = createCenterParticles();
const obelisks = placeObelisksInCenter(); // Ancient tech archive terminus markers
collisionObelisks = obelisks; // Store for collision checking

// ----------------------------------------------------------------------
// Portal to Room 10 (The Ascent) - Forward portal at center
// ----------------------------------------------------------------------
const portal10Obj = createLinkedPortal({
  scene,
  fromRoom: '9',
  toRoom: '10',
  x: 0,
  y: eyeHeight,
  z: 3,  // Just beyond center chamber
  rotationY: 0,
  createLabel: true
});

const portalToRoom10 = portal10Obj.portal;
const portal10Glow = portal10Obj.glow;

// ----------------------------------------------------------------------
// Portal to Room 8 (Ancient Ascension) - Back portal at entrance
// ----------------------------------------------------------------------
// Entrance is at left edge (x = -roomSize/2 + 3)
const portal8Obj = createLinkedPortal({
  scene,
  fromRoom: '9',
  toRoom: '8',
  x: entranceX - 2,  // Behind entrance position
  y: eyeHeight,
  z: entranceZ,
  rotationY: Math.PI / 2,  // Face +X (toward player at entrance)
  createLabel: true
});

const portalToRoom8 = portal8Obj.portal;
const portal8Glow = portal8Obj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(),  // FIX: Use getObject() for player position like Room 6
  portals: [
    {
      position: new THREE.Vector3(0, eyeHeight, 3),
      name: 'The Ascent (Room 10)',
      url: 'room10.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    },
    {
      position: new THREE.Vector3(entranceX - 2, eyeHeight, entranceZ),
      name: 'Ancient Ascension (Room 8)',
      url: 'room8.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    }
  ],
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// ----------------------------------------------------------------------
// Movement Controls
// ----------------------------------------------------------------------
function onKeyDown(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = true;
      break;
    case 'Space':
      if (!isJumping) { jumpVelocity = 10; isJumping = true; }
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      moveForward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      moveLeft = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      moveBackward = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      moveRight = false;
      break;
  }
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

/**
 * Convert world position to grid coordinates
 */
function worldToGrid(worldX, worldZ) {
  const cfg = ROOM9_CONFIG;
  const gridX = Math.floor((worldX / cfg.cellSize) + cfg.gridWidth / 2);
  const gridZ = Math.floor((worldZ / cfg.cellSize) + cfg.gridHeight / 2);
  return { gridX, gridZ };
}

/**
 * Check if world position collides with maze walls
 * Returns true if collision (wall), false if safe (passage)
 */
function checkWallCollision(worldX, worldZ) {
  if (!collisionGrid) return false;
  
  const cfg = ROOM9_CONFIG;
  const playerRadius = 0.4; // Player collision radius
  
  // Check multiple points around player (circle approximation)
  const checkPoints = [
    { x: worldX, z: worldZ },                          // Center
    { x: worldX + playerRadius, z: worldZ },           // Right
    { x: worldX - playerRadius, z: worldZ },           // Left
    { x: worldX, z: worldZ + playerRadius },           // Front
    { x: worldX, z: worldZ - playerRadius },           // Back
    { x: worldX + playerRadius * 0.7, z: worldZ + playerRadius * 0.7 }, // Diagonal corners
    { x: worldX - playerRadius * 0.7, z: worldZ + playerRadius * 0.7 },
    { x: worldX + playerRadius * 0.7, z: worldZ - playerRadius * 0.7 },
    { x: worldX - playerRadius * 0.7, z: worldZ - playerRadius * 0.7 }
  ];
  
  for (const point of checkPoints) {
    const { gridX, gridZ } = worldToGrid(point.x, point.z);
    
    // Out of bounds = wall
    if (gridX < 0 || gridX >= cfg.gridWidth || gridZ < 0 || gridZ >= cfg.gridHeight) {
      return true;
    }
    
    // Check if grid cell is wall
    if (collisionGrid[gridX][gridZ] === WALL) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if position collides with any obelisk
 */
function checkObeliskCollision(worldX, worldZ) {
  if (collisionObelisks.length === 0) return false;
  
  const minDist = 1.2; // Obelisk collision radius (scaled base ~0.9 + safety margin)
  
  for (const obelisk of collisionObelisks) {
    const dx = worldX - obelisk.position.x;
    const dz = worldZ - obelisk.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < minDist) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get nearest obelisk to position (for push-out)
 */
function getNearestObelisk(worldX, worldZ) {
  if (collisionObelisks.length === 0) return null;
  
  let nearest = null;
  let minDist = Infinity;
  
  for (const obelisk of collisionObelisks) {
    const dx = worldX - obelisk.position.x;
    const dz = worldZ - obelisk.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist < minDist) {
      minDist = dist;
      nearest = { x: obelisk.position.x, z: obelisk.position.z };
    }
  }
  
  return nearest;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (controls.isLocked) {
    // Get player object reference
    const player = controls.getObject();

    // Handle jumping with gravity
    if (isJumping) {
      player.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;
      if (player.position.y <= eyeHeight) {
        player.position.y = eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
      }
    } else {
      // Not jumping - ensure Y is locked to floor level
      player.position.y = eyeHeight;
    }

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    // Store position before movement for collision detection
    const prevX = player.position.x;
    const prevZ = player.position.z;

    // Apply movement
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Collision detection and correction
    const newX = player.position.x;
    const newZ = player.position.z;
    
    // Check maze wall collision
    if (checkWallCollision(newX, newZ)) {
      // Collision detected - try sliding along walls
      player.position.x = prevX;
      player.position.z = prevZ;
      
      // Try X-only movement (slide along Z walls)
      player.position.x = newX;
      if (checkWallCollision(player.position.x, player.position.z)) {
        player.position.x = prevX; // X blocked
      }
      
      // Try Z-only movement (slide along X walls)
      player.position.z = newZ;
      if (checkWallCollision(player.position.x, player.position.z)) {
        player.position.z = prevZ; // Z blocked
      }
    }
    
    // Check obelisk collision and push away if needed
    if (checkObeliskCollision(player.position.x, player.position.z)) {
      const nearest = getNearestObelisk(player.position.x, player.position.z);
      if (nearest) {
        const dx = player.position.x - nearest.x;
        const dz = player.position.z - nearest.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = 1.2; // Safe distance from obelisk center
        
        if (dist < minDist && dist > 0.01) {
          // Normalize and push player out
          const pushX = (dx / dist) * minDist;
          const pushZ = (dz / dist) * minDist;
          player.position.x = nearest.x + pushX;
          player.position.z = nearest.z + pushZ;
        }
      }
    }

    // Final room bounds clamp (safety net)
    const halfSize = ROOM9_CONFIG.roomSize / 2 - 1;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -halfSize, halfSize);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -halfSize, halfSize);

    // CRITICAL: Lock Y position to eyeHeight when not jumping
    // PointerLockControls moveForward/moveRight can affect Y when looking up/down
    if (!isJumping) {
      player.position.y = eyeHeight;
    }

    // Check portal proximity
    checkPortalProximity();
  }

  // Animate center particles (Phase 8 - optional VFX)
  if (centerParticles) {
    const positions = centerParticles.particles.geometry.attributes.position.array;
    const velocities = centerParticles.velocities;
    
    for (let i = 0; i < velocities.length / 3; i++) {
      const idx = i * 3;
      
      // Apply velocity
      positions[idx] += velocities[idx];       // x
      positions[idx + 1] += velocities[idx + 1]; // y
      positions[idx + 2] += velocities[idx + 2]; // z
      
      // Reset particles that float too high
      if (positions[idx + 1] > 6) {
        positions[idx + 1] = 1;
        positions[idx] = (Math.random() - 0.5) * 4;
        positions[idx + 2] = (Math.random() - 0.5) * 4;
      }
    }
    
    centerParticles.particles.geometry.attributes.position.needsUpdate = true;
  }

  // Animate portals
  animateLinkedPortal(portalToRoom10, portal10Glow);
  animateLinkedPortal(portalToRoom8, portal8Glow);

  renderer.render(scene, camera);
}

// ----------------------------------------------------------------------
// Future Audio System Hook (Phase 8 - stub)
// ----------------------------------------------------------------------
// TODO: When project has unified audio system, wire in:
// - Ambient "archive hum" loop (low volume, subtle data/electric texture)
// - Footstep echo system (reverb based on corridor position)
// - Portal activation sound (when approaching center)
//
// Example integration point:
// if (window.AudioSystem) {
//   AudioSystem.playAmbient('room9_archive_hum', { volume: 0.3, loop: true });
// }

animate();

// ----------------------------------------------------------------------
// Loading Overlay Management
// ----------------------------------------------------------------------
window.addEventListener('load', () => {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    setTimeout(() => {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }, 500);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay && loadingOverlay.style.display === 'flex') {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        loadingOverlay.style.display = 'none';
      }, 500);
    }
  }
});
