import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { MOVEMENT_CONFIG } from './src/core/movement-config.js';

// ══════════════════════════════════════════════════════════════════════════
// Lava Monolith Artifacts - Ritual Shards Below Tiles
// ══════════════════════════════════════════════════════════════════════════

/**
 * Procedural rock texture
 */
function createRockTexture() {
  const size = 256; // Reduced from 512 for performance
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, size, size);

  // Noise
  for (let i = 0; i < 30000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#444';
    ctx.globalAlpha = 0.1;
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillRect(x, y, 2, 2);
  }

  // Scratches
  ctx.strokeStyle = '#000';
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 25; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Procedural glowing rune texture
 */
function createRuneTexture() {
  const size = 512; // Reduced from 1024
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // The zigzag sigil
  ctx.strokeStyle = '#ff3300';
  ctx.lineWidth = 20;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.shadowColor = '#ff5500';
  ctx.shadowBlur = 10;

  const cx = size / 2;
  const cy = size / 2;

  ctx.beginPath();
  // Zigzag pattern
  ctx.moveTo(cx - 50, cy - 100);
  ctx.lineTo(cx + 50, cy - 50);
  ctx.lineTo(cx - 50, cy);
  ctx.lineTo(cx + 40, cy + 50);
  ctx.lineTo(cx - 40, cy + 100);
  ctx.moveTo(cx, cy + 75);
  ctx.lineTo(cx, cy + 200);
  ctx.stroke();

  // Inner bright core
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 8;
  ctx.shadowBlur = 3;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Small magma floor patch for under monolith
 */
function createMagmaPatchTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark crust base
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, size, size);

  // Cut holes for glowing magma
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      x += (Math.random() - 0.5) * 80;
      y += (Math.random() - 0.5) * 80;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Singleton shared assets
const monolithAssets = {
  rockTexture: null,
  runeTexture: null,
  magmaTexture: null,
  rockMaterial: null,
  chainMaterial: null,
  magmaMaterial: null
};

/**
 * Initialize shared monolith materials
 */
function initMonolithMaterials() {
  if (monolithAssets.rockMaterial) return;

  monolithAssets.rockTexture = createRockTexture();
  monolithAssets.runeTexture = createRuneTexture();
  monolithAssets.magmaTexture = createMagmaPatchTexture();

  monolithAssets.rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    map: monolithAssets.rockTexture,
    roughnessMap: monolithAssets.rockTexture,
    roughness: 0.9,
    metalness: 0.2,
    bumpMap: monolithAssets.rockTexture,
    bumpScale: 0.1,
    emissiveMap: monolithAssets.runeTexture,
    emissive: 0xff4400,
    emissiveIntensity: 2.5 // Reduced from prototype's 3.0 (no bloom in Room 6)
  });

  monolithAssets.chainMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.8,
    roughness: 0.6
  });

  monolithAssets.magmaMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0.9,
    emissiveMap: monolithAssets.magmaTexture,
    emissive: 0xff3300,
    emissiveIntensity: 1.8 // Match Room 6's lava intensity
  });
}

/**
 * Create a single lava monolith artifact
 * Returns: { group, lights } for animation
 */
function createLavaMonolith() {
  const cfg = ROOM6_CONFIG;
  const monolithGroup = new THREE.Group();
  const scale = cfg.monolithScale;

  // 1. Monolith shard (stretched dodecahedron)
  const monoGeo = new THREE.DodecahedronGeometry(1.5 * scale, 0);
  const posAttr = monoGeo.attributes.position;

  // Distort vertices for chiseled look
  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    posAttr.setY(i, y * 2.5); // Stretch in Y
    posAttr.setX(i, posAttr.getX(i) + (Math.random() - 0.5) * 0.2);
    posAttr.setZ(i, posAttr.getZ(i) + (Math.random() - 0.5) * 0.2);
  }
  monoGeo.computeVertexNormals();

  const monolith = new THREE.Mesh(monoGeo, monolithAssets.rockMaterial);
  monolith.position.y = 1.5 * scale;
  monolithGroup.add(monolith);

  // 2. Chains (simplified - fewer links for performance)
  const chainCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2 * scale, 1.8 * scale, 0.8 * scale),
    new THREE.Vector3(0, 1.5 * scale, 1.3 * scale),
    new THREE.Vector3(1.2 * scale, 1.2 * scale, 0.5 * scale),
    new THREE.Vector3(0.5 * scale, 1.0 * scale, -1.2 * scale),
    new THREE.Vector3(-1.0 * scale, 0.8 * scale, -0.8 * scale),
    new THREE.Vector3(-1.0 * scale, 0.3 * scale, 0.5 * scale)
  ]);

  const linkGeo = new THREE.TorusGeometry(0.12 * scale, 0.04 * scale, 4, 8);
  const points = chainCurve.getPoints(30); // Reduced from 60

  for (let i = 0; i < points.length - 1; i++) {
    const link = new THREE.Mesh(linkGeo, monolithAssets.chainMaterial);
    const pos = points[i];
    const nextPos = points[i + 1];

    link.position.copy(pos);
    link.lookAt(nextPos);

    if (i % 2 === 0) {
      link.rotateZ(Math.PI / 2);
    }

    monolithGroup.add(link);
  }

  // 3. Small local lava patch (disc under monolith)
  const patchGeo = new THREE.CircleGeometry(1.5 * scale, 16);
  patchGeo.rotateX(-Math.PI / 2);
  const lavaPatch = new THREE.Mesh(patchGeo, monolithAssets.magmaMaterial);
  lavaPatch.position.y = 0.05; // Slightly above base to avoid z-fighting
  monolithGroup.add(lavaPatch);

  // 4. Local lights (subtle, not overpowering)
  const runeLight = new THREE.PointLight(0xff3300, 1.0, 4);
  runeLight.position.set(0, 1.5 * scale, 1 * scale);
  monolithGroup.add(runeLight);

  const lavaLight = new THREE.PointLight(0xff6600, 0.8, 5);
  lavaLight.position.set(0, -0.5, 0);
  monolithGroup.add(lavaLight);

  return { group: monolithGroup, lights: [runeLight, lavaLight] };
}

/**
 * Place monoliths on tunnel sides between NFTs
 * Returns: Array of { group, lights, baseY } for animation
 */
function placeMonolithsOnWalls() {
  const cfg = ROOM6_CONFIG;
  if (!cfg.enableMonoliths) return [];

  initMonolithMaterials();

  const monoliths = [];
  const nftSpacing = corridorLength / (14 + 1); // 14 NFTs displayed

  cfg.monolithWallIndices.forEach((nftIndex, i) => {
    // Calculate position between NFTs on walls
    const z = -nftSpacing * (nftIndex + 1); // Match NFT Z positions
    
    // Force strict alternation regardless of NFT pattern
    const side = i % 2 === 0 ? -1 : 1; // 0=left, 1=right, strict alternation
    
    // Position on tunnel sides, at the edges (corridorWidth/2 = 10)
    const x = side * (corridorWidth / 2 - 1.0); // Much closer to walls

    const { group, lights } = createLavaMonolith();

    // Position on tunnel side in lava pit
    group.position.set(
      x,
      cfg.monolithYOffset,
      z
    );

    // Rotate to face inward (toward tunnel center)
    if (side === -1) {
      // Left wall - face right (0 radians)
      group.rotation.y = 0;
    } else {
      // Right wall - face left (PI radians)
      group.rotation.y = Math.PI;
    }

    scene.add(group);

    monoliths.push({
      group,
      lights,
      baseY: cfg.monolithYOffset
    });
  });

  console.log(`✓ Placed ${monoliths.length} lava monolith artifacts on tunnel sides`);
  return monoliths;
}

// ----------------------------------------------------------------------
// Room 6: "Lava Corridor" - Platforming Challenge
// ----------------------------------------------------------------------

// ═══════════════════════════════════════════════════════════════════════
// INVESTIGATION SUMMARY (Lava Platforming Rework)
// ═══════════════════════════════════════════════════════════════════════
//
// ROOT CAUSE: Why lava death never triggers
// - Jump physics (lines 506-514) clamps player.position.y back to eyeHeight (2.5)
//   whenever Y drops below it, preventing any fall
// - Lava trigger check is y < 1.0, but player Y never goes below 2.5
// - Result: Lava death condition was unreachable dead code
//
// ORIGINAL LAYOUT:
// - Lava floor mesh: y = -0.5
// - Tiles base: y = 0.0
// - Player eyeHeight: y = 2.5
// - Lava trigger: y < 1.0 (never reached)
//
// NEW LAYOUT (Deep Pit Design):
// - Lava floor mesh: y = -8.0 (deep glowing pit)
// - Tiles base: y = 0.2 (raised platforms)
// - Player spawn: y = 2.7 (standing on first tile)
// - Fall death: y ≤ -7.5 (approaching lava surface)
// - Fall mechanic: Player falls when not on safe tile, creating "drop into pit" feeling
//
// NFT ASSETS:
// - Using /assets/Room6/1.webp through 31.webp (31 NFT images)
// - Replacing 13 video textures for better performance
// - Wall-mounted planes, alternating sides like original videos
//
// ═══════════════════════════════════════════════════════════════════════

// Basic parameters
const corridorLength = 100;
const corridorWidth = 20;
const wallHeight = 10;
const eyeHeight = 2.5;
const gravity = -30;

// Lava & platform configuration
const ROOM6_CONFIG = {
  lavaFloorY: -8.0,                 // Deep pit - actual floor mesh height
  lavaTriggerY: -7.5,               // Death trigger when approaching lava surface
  tileBaseY: 0.2,                   // Raised platforms above the pit
  respawnPosition: new THREE.Vector3(0, eyeHeight, -8), // Fixed starting position - never changes

  // Hex tile settings
  tileCount: 20,                    // 20 tiles to reach portal
  tileRadius: 1.3,
  tileHeight: 0.4,
  tileStartZ: -8,                   // First tile just in front of spawn
  tileStepZ: -4.5,                  // Reduced spacing for easier jumping
  baseX: 0,                         // Straight line center (no zigzag)
  tileSafeRadius: 1.35,             // Full coverage - includes entire hexagon plus small buffer
  tileFloatAmplitude: 0.05,         // Subtle hover animation
  tileFloatSpeed: 1.0,

  // Horizontal floating tiles configuration
  horizontalFloatEnabled: true,     // Enable horizontal movement
  horizontalFloatAmplitude: 6.9,    // 69% of distance to wall (corridorWidth/2 = 10)
  horizontalFloatSpeed: 0.8,        // Speed of horizontal movement
  horizontalFloatPattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0], // 1=moving, 0=stationary (final tile stationary)
  
  // Lava Monolith Artifacts (side wall ritual shards)
  enableMonoliths: true,
  monolithCount: 5,                 // Sparse placement for atmosphere
  monolithWallIndices: [1, 3, 5, 7, 9], // Which NFT wall positions to place between
  monolithAlternatingSides: true,     // Force strict left/right alternation
  monolithYOffset: -5.5,            // Position in pit (between lava -8.0 and tiles 0.2)
  monolithScale: 0.6,               // Scaled to fit in side spaces
  monolithHoverAmplitude: 0.15,     // Subtle float animation
  monolithHoverSpeed: 0.4,          // Slow sinusoidal motion
  monolithSideOffset: 8.0           // Distance from center to tunnel sides
};

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;
let isFalling = false;            // Track if player is falling into lava
let fallVelocity = 0;             // Vertical velocity when falling

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0f); // Dark background, no blinding white

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, eyeHeight, -5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // Use proper color space
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

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

// Note: HemisphereLight removed to prevent color influence on NFTs
// NFTs use MeshBasicMaterial with toneMapped: false for original colors

// ----------------------------------------------------------------------
// Lava Floor - Cracked Lava Texture
// ----------------------------------------------------------------------

/**
 * Procedural cracked lava texture - dark crust with glowing magma veins
 */
function createLavaTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // 1. Magma Base (Bright Orange/Yellow underneath)
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(0, 0, size, size);

  // 2. Crust Layer (Dark Rock) - We will cut holes in this
  ctx.fillStyle = '#050505'; // Almost black
  ctx.fillRect(0, 0, size, size);

  // 3. Cut Cracks (Erase the crust to reveal magma)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Function to draw a jagged crack line
  const drawCrack = (x, y, length, width) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let cx = x;
    let cy = y;
    for (let i = 0; i < length; i++) {
      cx += (Math.random() - 0.5) * 20;
      cy += (Math.random() - 0.5) * 20;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  };

  // Draw many small cracks
  for (let i = 0; i < 150; i++) {
    drawCrack(
      Math.random() * size,
      Math.random() * size,
      30,
      3 + Math.random() * 5
    );
  }

  // Big primary veins
  for (let i = 0; i < 10; i++) {
    drawCrack(
      Math.random() * size,
      Math.random() * size,
      100,
      10 + Math.random() * 10
    );
  }

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4); // Tile the pattern
  return tex;
}

/**
 * Procedural rock texture for cave ceiling and stalactites
 */
function createCaveRockTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark grey base
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);

  // Add noise for rough texture
  for (let i = 0; i < 40000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#2a2a2a';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  // Add scratches and cracks
  ctx.strokeStyle = '#0a0a0a';
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 30; i++) {
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Create a single stalactite mesh with organic distortion
 */
function createStalactiteMesh(height, width, material) {
  const geo = new THREE.ConeGeometry(width, height, 12, 12, true);

  // Vertex distortion for organic, jagged look
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // More distortion at the base (top of cone), less at the tip
    const distortionAmount = Math.abs(y / height) * 0.6;

    pos.setX(i, x + (Math.random() - 0.5) * width * distortionAmount);
    pos.setZ(i, z + (Math.random() - 0.5) * width * distortionAmount);

    // Slight random vertical variation for roughness
    pos.setY(i, y + (Math.random() - 0.5) * 0.2);
  }

  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  // Flip stalactite upside down so tip points down
  mesh.rotation.x = Math.PI;

  return mesh;
}

function createLavaFloor() {
  const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength, 256, 256);

  // Generate cracked lava texture
  const lavaTex = createLavaTexture();

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x000000,          // The crust is black
    roughness: 0.8,
    emissiveMap: lavaTex,     // The cracks glow
    emissive: 0xff3300,       // Glow color tint (bright red-orange)
    emissiveIntensity: 2.5,   // Strong glow for dramatic effect
    bumpMap: lavaTex,         // Cracks appear lower
    bumpScale: 0.5,
    displacementMap: lavaTex, // Actual geometry deformation
    displacementScale: 1.0    // Height of displacement (reduced from 1.5 for subtlety)
  });

  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, ROOM6_CONFIG.lavaFloorY, -corridorLength / 2);
  scene.add(floor);

  return floor;
}

const floor = createLavaFloor();

// Generate shared textures ONCE for reuse (performance optimization)
const sharedRockTexture = createCaveRockTexture();

// Three-section wall system: Lower (lava flow) + Gap (NFTs) + Upper (ceiling)
const nftAreaBottom = 1.0;  // NFTs start at y=1.0
const nftAreaTop = 5.0;     // NFTs end at y=5.0

// Lower walls (floor to NFT area) - Black with flowing lava effect
const lowerWallHeight = nftAreaBottom - ROOM6_CONFIG.lavaFloorY; // From y=-8 to y=1.0 (9 units)

// Create flowing lava texture for lower walls
function createFlowingLavaTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Dark base
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, size, size);

  // Vertical flowing lava streaks
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * size;
    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, 'rgba(255, 100, 0, 0.3)');
    gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(100, 0, 0, 0.1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, 3 + Math.random() * 5, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const flowingLavaTex = createFlowingLavaTexture();

const lowerWallMat = new THREE.MeshStandardMaterial({
  color: 0x0a0a0a,
  map: sharedRockTexture,
  roughness: 0.8,
  metalness: 0.1,
  bumpMap: sharedRockTexture,
  bumpScale: 0.3,
  emissiveMap: flowingLavaTex,
  emissive: 0xff3300,
  emissiveIntensity: 0.8
});

const leftWallLower = new THREE.Mesh(new THREE.PlaneGeometry(corridorLength, lowerWallHeight), lowerWallMat);
leftWallLower.position.set(-corridorWidth / 2, ROOM6_CONFIG.lavaFloorY + lowerWallHeight / 2, -corridorLength / 2);
leftWallLower.rotation.y = Math.PI / 2;
scene.add(leftWallLower);

const rightWallLower = leftWallLower.clone();
rightWallLower.position.set(corridorWidth / 2, ROOM6_CONFIG.lavaFloorY + lowerWallHeight / 2, -corridorLength / 2);
rightWallLower.rotation.y = -Math.PI / 2;
scene.add(rightWallLower);

// Upper walls (above NFT area to ceiling) - Dark rock
const upperWallHeight = wallHeight - nftAreaTop; // From y=5.0 to y=10 (5 units)
const upperWallMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  map: sharedRockTexture,
  roughness: 0.9,
  metalness: 0.1,
  bumpMap: sharedRockTexture,
  bumpScale: 0.3
});

const leftWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(corridorLength, upperWallHeight), upperWallMat);
leftWallUpper.position.set(-corridorWidth / 2, nftAreaTop + upperWallHeight / 2, -corridorLength / 2);
leftWallUpper.rotation.y = Math.PI / 2;
scene.add(leftWallUpper);

const rightWallUpper = leftWallUpper.clone();
rightWallUpper.position.set(corridorWidth / 2, nftAreaTop + upperWallHeight / 2, -corridorLength / 2);
rightWallUpper.rotation.y = -Math.PI / 2;
scene.add(rightWallUpper);

// Front and back walls (lower section)
const frontWallLower = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth, lowerWallHeight), lowerWallMat);
frontWallLower.position.set(0, ROOM6_CONFIG.lavaFloorY + lowerWallHeight / 2, 0);
frontWallLower.rotation.y = Math.PI;
scene.add(frontWallLower);

const backWallLower = frontWallLower.clone();
backWallLower.position.set(0, ROOM6_CONFIG.lavaFloorY + lowerWallHeight / 2, -corridorLength);
backWallLower.rotation.y = 0;
scene.add(backWallLower);

// Front and back walls (upper section)
const frontWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(corridorWidth, upperWallHeight), upperWallMat);
frontWallUpper.position.set(0, nftAreaTop + upperWallHeight / 2, 0);
frontWallUpper.rotation.y = Math.PI;
scene.add(frontWallUpper);

const backWallUpper = frontWallUpper.clone();
backWallUpper.position.set(0, nftAreaTop + upperWallHeight / 2, -corridorLength);
backWallUpper.rotation.y = 0;
scene.add(backWallUpper);

// ----------------------------------------------------------------------
// Ceiling - Cave Rock with Stalactites
// ----------------------------------------------------------------------

/**
 * Add stalactites hanging from ceiling with glow
 * Positioned to avoid blocking player view and maintain clearance
 */
function addCeilingStalactites() {
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    map: sharedRockTexture,
    roughness: 0.8,
    bumpMap: sharedRockTexture,
    bumpScale: 0.3,
    emissive: 0x331100,        // Warm glow from lava reflection
    emissiveIntensity: 0.4     // Subtle glow
  });

  const stalactiteCount = 15; // Reduced density for cleaner look
  const minClearanceY = 5.0; // Increased buffer for better visibility

  for (let i = 0; i < stalactiteCount; i++) {
    // Larger, more dramatic stalactites
    const maxHeight = wallHeight - minClearanceY; // Max 5 units (10 - 5)
    const height = 2.5 + Math.random() * (maxHeight - 2.5); // 2.5 to 5 units tall
    const width = 0.6 + Math.random() * 0.8; // 0.6 to 1.4 units wide

    const spike = createStalactiteMesh(height, width, rockMat);

    // Position along tunnel edges only
    const spreadX = corridorWidth * 0.4; // Push more toward edges
    const x = (Math.random() - 0.5) * spreadX;

    // Distribute along corridor length
    const z = -Math.random() * corridorLength;

    spike.position.set(x, wallHeight, z);

    // Random slight rotation for organic feel (ADD to existing flip, don't overwrite)
    spike.rotation.x += (Math.random() - 0.5) * 0.15;
    spike.rotation.z += (Math.random() - 0.5) * 0.15;

    scene.add(spike);
  }

  console.log(`✓ Added ${stalactiteCount} glowing ceiling stalactites (clearance maintained at y=${minClearanceY})`);
}

function createCeiling() {
  // Main ceiling surface - textured cave rock with warm glow
  const ceilingGeo = new THREE.CylinderGeometry(
    corridorWidth / 2,
    corridorWidth / 2,
    corridorLength,
    32, 1, true, 0, Math.PI
  );
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a0a,        // Warm dark brown (lava-lit cave)
    map: sharedRockTexture,
    roughness: 0.8,
    bumpMap: sharedRockTexture,
    bumpScale: 0.4,
    emissive: 0x442200,     // Warm orange-red glow
    emissiveIntensity: 0.3, // Subtle ambient glow
    side: THREE.BackSide
  });

  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.position.set(0, wallHeight, -corridorLength / 2);
  ceiling.rotation.z = Math.PI / 2;
  scene.add(ceiling);

  // Add stalactites hanging from ceiling
  addCeilingStalactites();

  return ceiling;
}

const ceiling = createCeiling();

// ----------------------------------------------------------------------
// Wall & Floor Cave Formations - Decorative stalactites and stalagmites
// ----------------------------------------------------------------------

/**
 * Add stalactites on side walls (below NFT height to avoid blocking them)
 */
function addWallStalactites() {
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    map: sharedRockTexture,
    roughness: 0.9,
    bumpMap: sharedRockTexture,
    bumpScale: 0.3
  });

  const count = 25; // Moderate density
  const nftSpacing = corridorLength / 15; // Approximate NFT spacing

  for (let i = 0; i < count; i++) {
    const height = 1.2 + Math.random() * 2.5; // 1.2 to 3.7 units tall
    const width = 0.3 + Math.random() * 0.7; // 0.3 to 1.0 units wide

    const spike = createStalactiteMesh(height, width, rockMat);

    // Position on tunnel sides
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (corridorWidth / 2 - 0.8); // Near walls (±9.2)

    // Distribute along corridor, avoiding NFT zones
    const z = -Math.random() * corridorLength;

    // Position low on walls to avoid blocking NFTs (NFTs at y=3.0)
    const y = 0.5 + Math.random() * 1.5; // y = 0.5 to 2.0 (well below NFTs)

    spike.position.set(x, y, z);

    // Angle stalactites toward wall for natural attachment
    spike.rotation.z = side * ((Math.random() - 0.5) * 0.4 + 0.3);
    spike.rotation.x = (Math.random() - 0.5) * 0.3;

    scene.add(spike);
  }

  console.log(`✓ Added ${count} wall stalactites (positioned below NFT height)`);
}

/**
 * Add stalagmites growing from floor edges (inverted stalactites)
 */
function addFloorStalagmites() {
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, // Slightly darker for floor formations
    map: sharedRockTexture,
    roughness: 0.9,
    bumpMap: sharedRockTexture,
    bumpScale: 0.3,
    emissive: 0x330000, // Slight red glow from lava reflection
    emissiveIntensity: 0.2
  });

  const count = 20;

  for (let i = 0; i < count; i++) {
    const height = 1.0 + Math.random() * 3.0; // 1.0 to 4.0 units tall
    const width = 0.4 + Math.random() * 0.9; // 0.4 to 1.3 units wide

    // Create inverted cone (grows upward)
    const geo = new THREE.ConeGeometry(width, height, 12, 12, true);
    geo.translate(0, height / 2, 0); // Pivot at bottom so it grows up

    // Apply same distortion as stalactites
    const pos = geo.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      const y = pos.getY(j);
      const x = pos.getX(j);
      const z = pos.getZ(j);

      const distortionAmount = Math.abs(y / height) * 0.6;

      pos.setX(j, x + (Math.random() - 0.5) * width * distortionAmount);
      pos.setZ(j, z + (Math.random() - 0.5) * width * distortionAmount);
      pos.setY(j, y + (Math.random() - 0.5) * 0.2);
    }
    geo.computeVertexNormals();

    const stalagmite = new THREE.Mesh(geo, rockMat);

    // Position at floor edges (keep center path clear)
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (6 + Math.random() * 3); // x = ±6 to ±9 (edges only)

    const z = -Math.random() * corridorLength;

    // Position on lava floor level
    stalagmite.position.set(x, ROOM6_CONFIG.lavaFloorY, z);

    // Random slight rotation
    stalagmite.rotation.x = (Math.random() - 0.5) * 0.2;
    stalagmite.rotation.z = (Math.random() - 0.5) * 0.2;

    scene.add(stalagmite);
  }

  console.log(`✓ Added ${count} floor stalagmites at tunnel edges`);
}

// Add decorative cave formations
addWallStalactites();
addFloorStalagmites();

// ----------------------------------------------------------------------
// Wall Torches - Simple emissive lights for ambient lighting
// ----------------------------------------------------------------------
function addWallTorch(x, y, z, facing) {
  const torchGeom = new THREE.PlaneGeometry(0.5, 1.5);
  const torchMat = new THREE.MeshBasicMaterial({
    color: 0xff5533,
    transparent: true,
    opacity: 0.8
  });

  const torch = new THREE.Mesh(torchGeom, torchMat);
  torch.position.set(x, y, z);

  if (facing === 'left') torch.rotation.y = Math.PI / 2;
  if (facing === 'right') torch.rotation.y = -Math.PI / 2;

  scene.add(torch);

  const light = new THREE.PointLight(0xff5533, 1.2, 12);
  light.position.set(x, y, z);
  scene.add(light);
}

// Place torches along corridor walls
const torchY = 3.5;
for (let z = -15; z >= -90; z -= 15) {
  addWallTorch(-9.5, torchY, z, 'right'); // Left wall
  addWallTorch(9.5, torchY, z, 'left');   // Right wall
}

// ----------------------------------------------------------------------
// NFT Wall Art - Room 6 Collection
// ----------------------------------------------------------------------
// Using static NFT images from /assets/Room6/ instead of videos
// 14 NFTs displayed (matching tile count), alternating walls like original videos

const nftPlanes = [];
const textureLoader = new THREE.TextureLoader();
const nftCount = 14; // Display 14 of the 31 available NFTs
const nftSpacing = corridorLength / (nftCount + 1);

for (let i = 0; i < nftCount; i++) {
  const nftIndex = i + 1; // Use NFTs 1-14
  const texture = textureLoader.load(
    `/assets/Room6/${nftIndex}.webp`,
    // onLoad callback to ensure proper color space
    (loadedTexture) => {
      loadedTexture.colorSpace = THREE.SRGBColorSpace; // Ensure correct color space
    }
  );
  const material = new THREE.MeshBasicMaterial({ 
    map: texture, 
    side: THREE.DoubleSide,
    // Ensure NFTs are completely unlit and display original colors
    transparent: false,
    alphaTest: 0,
    toneMapped: false // Disable tone mapping to preserve original colors
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), material);
  
  const z = -nftSpacing * (i + 1);
  const side = i % 2 === 0 ? -1 : 1; // Alternate left/right
  
  plane.position.set(side * (corridorWidth / 2 - 0.1), eyeHeight + 0.5, z);
  plane.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  
  scene.add(plane);
  nftPlanes.push(plane);
}

// ----------------------------------------------------------------------
// Hex Tile Platforms - Safe spots above lava
// ----------------------------------------------------------------------
const hexTiles = [];
const tileCenters = [];

function createHexTiles() {
  const cfg = ROOM6_CONFIG;

  // Side material - BRIGHT red for clear visibility
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x550808,
    emissive: 0x330000,
    emissiveIntensity: 0.4, // Much brighter for visibility
    metalness: 0.2,
    roughness: 0.4
  });

  // Top material - pure black placeholder (NFT textures later)
  const topMat = new THREE.MeshBasicMaterial({
    color: 0x000000
  });

  for (let i = 0; i < cfg.tileCount; i++) {
    // Hexagonal prism geometry
    const geom = new THREE.CylinderGeometry(
      cfg.tileRadius,
      cfg.tileRadius,
      cfg.tileHeight,
      6  // 6 segments = hexagon
    );

    // Apply materials: [sides, top, bottom]
    const tile = new THREE.Mesh(geom, [sideMat, topMat.clone(), sideMat]);

    // Position along corridor in straight line
    const z = cfg.tileStartZ + i * cfg.tileStepZ;

    // Straight line positioning (no zigzag)
    const x = cfg.baseX; // Always center X = 0
    const baseY = cfg.tileBaseY;

    tile.position.set(x, baseY, z);
    
    // Store horizontal movement data
    const isHorizontalFloating = cfg.horizontalFloatPattern[i] === 1;
    tile.userData = {
      baseX: x,
      isHorizontalFloating: isHorizontalFloating,
      horizontalPhase: i * 0.5 // Unique phase for each floating tile
    };
    
    tile.rotation.y = Math.random() * Math.PI * 2; // Random rotation for organic feel

    scene.add(tile);
    hexTiles.push(tile);
    
    // Store tile data for monolith placement
    tileData.push({ position: new THREE.Vector3(x, baseY, z), index: i });

    // Store center for collision detection (x, z in 2D)
    tileCenters.push(new THREE.Vector2(x, z));
  }

  const firstZ = cfg.tileStartZ;
  const lastZ = cfg.tileStartZ + (cfg.tileCount - 1) * cfg.tileStepZ;
  console.log(`✓ Created ${cfg.tileCount} hex tiles. Player should stand on first tile at ${cfg.tileStartZ}`);
  console.log(`  Last tile:  z = ${lastZ}`);
  console.log(`  Spawn: z = -5, Portal: z = -98`);
  console.log(`  Direction: ${cfg.tileStepZ > 0 ? 'POSITIVE (WRONG!)' : 'NEGATIVE (toward portal) ✓'}`);

  return hexTiles;
}

// Store tile data for monolith placement
const tileData = [];

createHexTiles();

// Place lava monoliths on tunnel sides between NFTs
const lavaMonoliths = placeMonolithsOnWalls();

// Initialize player on first tile (stationary platform)
camera.position.set(0, eyeHeight, ROOM6_CONFIG.tileStartZ);
controls.getObject().position.set(0, eyeHeight, ROOM6_CONFIG.tileStartZ);

console.log(`✓ Spawn set to first tile at (0, ${eyeHeight}, ${ROOM6_CONFIG.tileStartZ})`);
console.log(`✓ First tile is stationary - player spawns directly on it`);

// ----------------------------------------------------------------------
// Safe Tile Detection - Check if player is above a tile (supports moving tiles)
// ----------------------------------------------------------------------
function isOnSafeTile(position) {
  const px = position.x;
  const pz = position.z;
  const safeRadiusSq = ROOM6_CONFIG.tileSafeRadius * ROOM6_CONFIG.tileSafeRadius;

  // Check against actual tile positions (including moving tiles)
  for (let i = 0; i < hexTiles.length; i++) {
    const tile = hexTiles[i];
    const tileX = tile.position.x; // Current X position (includes horizontal movement)
    const tileZ = tile.position.z; // Current Z position
    
    const dx = px - tileX;
    const dz = pz - tileZ;
    if (dx * dx + dz * dz < safeRadiusSq) {
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------
// Respawn Player - Reset to corridor start on lava death
// ----------------------------------------------------------------------
function respawnPlayer() {
  const player = controls.getObject();
  // Respawn on first tile (not at old spawn position)
  player.position.set(0, eyeHeight, ROOM6_CONFIG.tileStartZ);
  velocity.set(0, 0, 0);
  jumpVelocity = 0;
  isJumping = false;
  isFalling = false;
  fallVelocity = 0;
  console.log('💀 Lava death! Respawning on first tile...');
}

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
      // Only jump if on solid ground (not jumping, not falling, on a tile)
      const player = controls.getObject();
      const onTile = isOnSafeTile(player.position);
      if (!isJumping && !isFalling && onTile) { 
        jumpVelocity = 10; 
        isJumping = true; 
      }
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

// ============================================
// Portal to Room 5
// ============================================
const portalObj = createLinkedPortal({
  scene,
  fromRoom: '6',
  toRoom: '5',
  x: 0,
  y: eyeHeight,
  z: -corridorLength + 2,
  rotationY: 0,
  createLabel: true
});

const portalToRoom5 = portalObj.portal;
const portalGlow = portalObj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(), // Use player position, not camera
  portals: [
    {
      position: new THREE.Vector3(0, eyeHeight, -corridorLength + 2),
      name: 'Eternal Eclipse (Room 5)',
      url: 'room5.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    }
  ],
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = performance.now() * 0.001;

  // Animate tiles FIRST - this updates positions before player physics
  hexTiles.forEach((tile, index) => {
    const cfg = ROOM6_CONFIG;
    
    // Store current position before updating for platform movement calculation
    if (!tile.userData.lastPosition) {
      tile.userData.lastPosition = new THREE.Vector3(tile.position.x, tile.position.y, tile.position.z);
    } else {
      // Update lastPosition for next frame's movement calculation
      tile.userData.lastPosition.copy(tile.position);
    }
    
    // Vertical hover animation (all tiles)
    const verticalPhase = index * 0.3;
    const hoverY = cfg.tileBaseY + Math.sin(time * cfg.tileFloatSpeed + verticalPhase) * cfg.tileFloatAmplitude;
    tile.position.y = hoverY;
    
    // Horizontal floating animation (selected tiles only)
    if (tile.userData.isHorizontalFloating && cfg.horizontalFloatEnabled) {
      const horizontalOffset = Math.sin(time * cfg.horizontalFloatSpeed + tile.userData.horizontalPhase) * cfg.horizontalFloatAmplitude;
      tile.position.x = tile.userData.baseX + horizontalOffset;
    }
  });

  if (controls.isLocked) {
    const player = controls.getObject();
    const onTile = isOnSafeTile(player.position);

    // Vertical physics - platform vs falling
    if (isJumping) {
      // Jump arc
      player.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;
      
      // Land on tile if we're on one - require clean landing
      if (onTile && player.position.y <= eyeHeight && jumpVelocity < 0) {
        player.position.y = eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
        isFalling = false;
        fallVelocity = 0;
      }
      // Start falling if we've descended and not on a tile
      else if (!onTile && player.position.y <= eyeHeight) {
        isJumping = false;
        isFalling = true;
        fallVelocity = jumpVelocity; // Maintain downward velocity
      }
    } else if (isFalling) {
      // Free fall into lava pit
      player.position.y += fallVelocity * delta;
      fallVelocity += gravity * delta * 0.8; // Slightly reduced gravity for fall feeling
      
      // Check if we've fallen onto a tile (mid-fall) - require direct landing
      // Only allow landing if falling straight down onto tile center
      if (onTile && player.position.y <= eyeHeight && fallVelocity < 0) {
        player.position.y = eyeHeight;
        isFalling = false;
        fallVelocity = 0;
      }
    } else {
      // Ground state - are we standing on a tile?
      if (onTile) {
        // Standing on platform - maintain height
        if (player.position.y < eyeHeight) {
          player.position.y = eyeHeight;
        }
        
        // Move with platform if standing on a moving tile
        for (let i = 0; i < hexTiles.length; i++) {
          const tile = hexTiles[i];
          const tileX = tile.position.x;
          const tileZ = tile.position.z;
          
          const dx = player.position.x - tileX;
          const dz = player.position.z - tileZ;
          const distSq = dx * dx + dz * dz;
          
          // If player is on this tile, move with it
          if (distSq < ROOM6_CONFIG.tileSafeRadius * ROOM6_CONFIG.tileSafeRadius) {
            // Store last tile position for movement calculation
            if (!tile.userData.lastPosition) {
              tile.userData.lastPosition = new THREE.Vector3(tileX, tile.position.y, tileZ);
            }
            
            // Calculate platform movement delta
            const deltaX = tileX - tile.userData.lastPosition.x;
            const deltaZ = tileZ - tile.userData.lastPosition.z;
            
            // Move player with platform
            player.position.x += deltaX;
            player.position.z += deltaZ;
            
            // Update last position
            tile.userData.lastPosition.set(tileX, tile.position.y, tileZ);
            break;
          }
        }
      } else {
        // Not on a tile and not jumping - IMMEDIATELY start falling!
        // No grace period - if you're not on a tile, you fall
        isFalling = true;
        fallVelocity = 0;
      }
    }

    // Movement with shared config
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    const moveSpeed = MOVEMENT_CONFIG.getEffectiveSpeed('room6') || 60.0;

    if (moveForward || moveBackward) velocity.z -= direction.z * moveSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * moveSpeed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Keep player inside corridor bounds
    const buffer = 0.5;
    const halfWidth = corridorWidth / 2 - buffer;
    const minZ = -corridorLength + buffer;
    const maxZ = -buffer;
    player.position.x = Math.max(-halfWidth, Math.min(halfWidth, player.position.x));
    player.position.z = Math.max(minZ, Math.min(maxZ, player.position.z));

    // Lava death detection - player has fallen into the lava pit
    // This triggers when Y reaches near the lava floor surface
    if (player.position.y <= ROOM6_CONFIG.lavaTriggerY) {
      respawnPlayer();
    }

    // Check portal proximity
    checkPortalProximity();
  }

  // Tile animation already handled above (moved before player physics)

  // Animate lava monoliths (hover + light flicker)
  if (lavaMonoliths.length > 0) {
    lavaMonoliths.forEach((monolith, index) => {
      const cfg = ROOM6_CONFIG;
      
      // Subtle hover animation
      const phase = index * 0.7; // Unique phase per monolith
      const hoverY = cfg.monolithYOffset + Math.sin(time * cfg.monolithHoverSpeed + phase) * cfg.monolithHoverAmplitude;
      monolith.group.position.y = hoverY;
      
      // Slow rotation
      monolith.group.rotation.y += delta * 0.05;
      monolith.group.rotation.z = Math.cos(time * 0.15 + phase) * 0.02; // Tiny wobble
      
      // Light flicker
      monolith.lights[0].intensity = 1.0 + Math.sin(time * 15 + index) * 0.2; // Rune light
      monolith.lights[1].intensity = 0.8 + Math.cos(time * 10 + index * 0.5) * 0.15; // Lava light
    });
  }

  // Animate portals
  animateLinkedPortal(portalToRoom5, portalGlow);

  renderer.render(scene, camera);
}

animate();

// Loading overlay management
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

// Allow escape key to dismiss stuck loading overlay
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
