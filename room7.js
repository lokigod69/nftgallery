import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getRoom7ArtUrl } from './src/core/asset-utils.js';

// ═══════════════════════════════════════════════════════════════════════
// Room 7: "S-Curve Gallery" - NFT Platform Jumping Challenge
// ═══════════════════════════════════════════════════════════════════════
/**
 * CONCEPT: S-curve path of 35 NFT platforms
 * - Single flowing path that curves right, then left, forming an S-shape
 * - Player jumps from platform to platform along the S-curve
 * - Each platform displays a unique NFT artwork (no repeats)
 * - Rectangular platforms preserve the aspect ratio of horizontal images
 * - Fall to floor = respawn at start
 * - Navigate from spawn to portal
 */

// Room 7 Master Configuration
const ROOM7_CONFIG = {
  // Room dimensions - ORIGINAL large room
  roomSize: 100,             // Original large square room
  roomLength: 80,            // Path length (Z-axis)

  // Platform settings
  platformSize: 3.2,         // NFT platform size (reduced to prevent overlap on S-curve)
  platformHeight: 2.0,       // Height above floor
  platformThickness: 0.5,    // Platform depth
  spawnPlatformSize: 6.0,    // Larger spawn platform
  endPlatformSize: 10.0,     // Much larger end platform

  // Zigzag path parameters - jumpable alternating pattern
  zigzagAmplitude: 8,        // Max horizontal distance from center (reduced for jumpability)
  platformSpacingZ: 4.5,     // Z distance between platforms (closer together)

  // Player physics
  eyeHeight: 4.0,            // Raised eye height for better view of platform photos
  speed: 80.0,
  gravity: -30,
  jumpVelocity: 18,          // Increased for longer jumps between platforms

  // Spawn and portal positions
  spawnZ: -45,               // Start position (negative Z)
  portalZ: 48,               // End position - near room edge

  // Floor (danger zone)
  floorY: 0,
  respawnOnFloorTouch: true
};

const eyeHeight = ROOM7_CONFIG.eyeHeight;
const speed = ROOM7_CONFIG.speed;
const gravity = ROOM7_CONFIG.gravity;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let isFalling = false;
let jumpVelocity = 0;
let fallVelocity = 0;
let currentPlatform = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);  // Original black background

// Spawn position: on spawn platform
const spawnY = ROOM7_CONFIG.platformHeight + ROOM7_CONFIG.platformThickness / 2 + eyeHeight;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Set rotation order to YXZ to prevent gimbal lock with PointerLockControls
camera.rotation.order = 'YXZ';
camera.position.set(0, spawnY, ROOM7_CONFIG.spawnZ);
camera.rotation.y = Math.PI;  // Face forward (toward +Z where the platforms and portal are)

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Modern Three.js uses outputColorSpace instead of outputEncoding
// Removed deprecated: renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);

// Set pitch limits to prevent gimbal lock (polar angles)
controls.minPolarAngle = Math.PI * 0.05;  // Can look almost straight up (9°)
controls.maxPolarAngle = Math.PI * 0.95;  // Can look almost straight down (171°)

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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Original lighting setup
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, 7);
scene.add(dir);

// Subtle ambient fill lighting (reduced to prevent harsh reflections)
const floorSize = ROOM7_CONFIG.roomSize;

// Original reflective black floor
const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.8, roughness: 0.2 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Raised starry ceiling - higher and more spread out
const starGeo = new THREE.BufferGeometry();
const starVerts = [];
for (let i = 0; i < 1200; i++) {
  const x = Math.random() * 120 - 60;
  const y = Math.random() * 40 + 25;
  const z = Math.random() * 120 - 60;
  starVerts.push(x, y, z);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// ═══════════════════════════════════════════════════════════════════════
// Real Zodiac Constellations
// ═══════════════════════════════════════════════════════════════════════

// Constellation definitions (relative star positions, scaled for the room)
const constellations = {
  // Orion - The Hunter (iconic and recognizable)
  orion: {
    name: 'Orion',
    stars: [
      { x: 0, y: 0, z: 0, bright: true },      // Betelgeuse (shoulder)
      { x: 3, y: 0, z: 0.5, bright: false },   // Bellatrix (other shoulder)
      { x: 1.5, y: -1.5, z: 0.2, bright: true }, // Alnilam (belt center)
      { x: 0.8, y: -1.5, z: 0.3, bright: false }, // Alnitak (belt left)
      { x: 2.2, y: -1.5, z: 0.1, bright: false }, // Mintaka (belt right)
      { x: 0.5, y: -3, z: 0.4, bright: false },  // Saiph (knee)
      { x: 2.5, y: -3.2, z: 0.2, bright: true }, // Rigel (foot)
    ],
    lines: [[0,1], [0,3], [1,4], [3,4], [4,5], [3,6], [4,6]]
  },

  // Leo - The Lion
  leo: {
    name: 'Leo',
    stars: [
      { x: 0, y: 0, z: 0, bright: true },      // Regulus (heart)
      { x: -1.5, y: 1, z: 0.2, bright: false }, // Algieba
      { x: -2.5, y: 2, z: 0.1, bright: false }, // Zosma
      { x: -1, y: 2.5, z: 0.3, bright: false }, // Chertan
      { x: 0.5, y: 2, z: 0.2, bright: false },  // Denebola (tail)
      { x: -3, y: 0.5, z: 0.4, bright: false }, // Eta Leo
      { x: -2, y: -0.5, z: 0.2, bright: false }, // Subra
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [1,5], [5,6], [6,0]]
  },

  // Scorpius - The Scorpion
  scorpius: {
    name: 'Scorpius',
    stars: [
      { x: 0, y: 0, z: 0, bright: true },      // Antares (heart - red giant!)
      { x: -1, y: 1, z: 0.2, bright: false },  // Graffias
      { x: -0.5, y: 2, z: 0.1, bright: false }, // Dschubba
      { x: 0.8, y: -1, z: 0.3, bright: false }, // Tau Sco
      { x: 1.5, y: -2, z: 0.2, bright: false }, // Epsilon Sco
      { x: 2.5, y: -2.5, z: 0.4, bright: false }, // Shaula (stinger)
      { x: 2.8, y: -2.2, z: 0.3, bright: false }, // Lesath (stinger)
    ],
    lines: [[2,1], [1,0], [0,3], [3,4], [4,5], [5,6]]
  },

  // Cassiopeia - The Queen (W shape)
  cassiopeia: {
    name: 'Cassiopeia',
    stars: [
      { x: 0, y: 0, z: 0, bright: true },      // Schedar
      { x: 1.2, y: 0.8, z: 0.2, bright: false }, // Caph
      { x: 2.2, y: 0.2, z: 0.1, bright: false }, // Gamma Cas
      { x: 3.2, y: 1, z: 0.3, bright: false },  // Ruchbah
      { x: 4, y: 0.3, z: 0.2, bright: false },  // Segin
    ],
    lines: [[0,1], [1,2], [2,3], [3,4]]
  },

  // Virgo - The Maiden
  virgo: {
    name: 'Virgo',
    stars: [
      { x: 0, y: 0, z: 0, bright: true },      // Spica (brightest)
      { x: -2, y: 2, z: 0.2, bright: false },  // Porrima
      { x: -3, y: 3.5, z: 0.1, bright: false }, // Vindemiatrix
      { x: -1.5, y: 4, z: 0.3, bright: false }, // Epsilon Vir
      { x: 0.5, y: 3, z: 0.2, bright: false },  // Delta Vir
      { x: -2.5, y: 1, z: 0.4, bright: false }, // Eta Vir
      { x: 1, y: 1.5, z: 0.2, bright: false },  // Zeta Vir
    ],
    lines: [[0,1], [1,2], [2,3], [3,4], [4,6], [6,0], [1,5]]
  },

  // Sagittarius - The Archer (Teapot asterism)
  sagittarius: {
    name: 'Sagittarius',
    stars: [
      { x: 0, y: 0, z: 0, bright: false },     // Kaus Media
      { x: 1.5, y: 0.3, z: 0.2, bright: false }, // Kaus Australis
      { x: -1, y: 0.5, z: 0.1, bright: false }, // Kaus Borealis
      { x: 0, y: 1.5, z: 0.3, bright: true },  // Nunki (handle)
      { x: -1.5, y: 1.8, z: 0.2, bright: false }, // Phi Sgr
      { x: 1, y: 1.2, z: 0.4, bright: false },  // Tau Sgr
      { x: 0.5, y: 2.2, z: 0.2, bright: false }, // Ascella
    ],
    lines: [[0,1], [1,5], [5,3], [3,6], [6,4], [4,2], [2,0], [0,5]]
  }
};

// Place constellations spread across the ceiling - stretched out like real night sky
const constellationPlacements = [
  { name: 'orion', x: -35, y: 50, z: -35, scale: 14 },
  { name: 'leo', x: 35, y: 55, z: -35, scale: 12 },
  { name: 'scorpius', x: 30, y: 48, z: 30, scale: 14 },
  { name: 'cassiopeia', x: -30, y: 58, z: 30, scale: 12 },
  { name: 'virgo', x: 0, y: 52, z: -40, scale: 13 },
  { name: 'sagittarius', x: -35, y: 50, z: 0, scale: 12 }
];

// Create constellation stars and lines
constellationPlacements.forEach(placement => {
  const constellation = constellations[placement.name];
  if (!constellation) return;

  const constellationStars = [];

  // Create stars for this constellation
  constellation.stars.forEach((star, idx) => {
    const worldX = placement.x + star.x * placement.scale;
    const worldY = placement.y + star.y * placement.scale * 0.6;
    const worldZ = placement.z + star.z * placement.scale;

    // Bright stars are larger - no glow effect, just bigger and brighter
    const starSize = star.bright ? 0.7 : 0.45;

    const starGeo = new THREE.SphereGeometry(starSize, 12, 12);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.position.set(worldX, worldY, worldZ);
    scene.add(starMesh);

    constellationStars.push(starMesh.position.clone());
  });

  // Draw constellation lines (subtle)
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x6688bb,
    transparent: true,
    opacity: 0.2
  });

  constellation.lines.forEach(([startIdx, endIdx]) => {
    const points = [constellationStars[startIdx], constellationStars[endIdx]];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeo, lineMaterial);
    scene.add(line);
  });
});

console.log(`✓ Added ${constellationPlacements.length} zodiac constellations to the sky`);

// ═══════════════════════════════════════════════════════════════════════
// Scattered Color Tiles - Random mosaic on all walls
// ═══════════════════════════════════════════════════════════════════════

// Extended color palette from the artwork
const tileColors = [
  // Warm skin tones
  0xffccaa, 0xffddbb, 0xeebb99, 0xddaa88, 0xcc9977,
  // Coral/peach
  0xff9966, 0xff8855, 0xffaa77, 0xffbb88,
  // Pink accents
  0xff6699, 0xff7799, 0xee5588, 0xff88aa,
  // Teal/cyan
  0x66cccc, 0x55bbbb, 0x77dddd, 0x44aaaa,
  // Blue accents
  0x99ccff, 0x88bbee, 0x77aadd, 0x6699cc,
  // Purple/lavender
  0xcc99ff, 0xbb88ee, 0xaa77dd, 0x9966cc,
  // Orange/warm
  0xffaa55, 0xff9944, 0xee8833, 0xdd7722,
  // Cream/white
  0xffeecc, 0xffeedd, 0xffffee, 0xfff8e0
];

const wallTiles = [];
const wallOffset = 49;
let tileDepthCounter = 0;  // Unique depth for each tile to prevent Z-fighting

/**
 * Create a small color tile on a wall
 * Each tile gets a unique depth offset to prevent Z-fighting flicker
 */
function createWallTile(x, y, z, rotationY, color, opacity, size, hasGlow) {
  const tileGeo = new THREE.PlaneGeometry(size, size * 0.4);  // Horizontal rectangle
  const tileMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.FrontSide,  // Only render front face
    depthWrite: true,       // Write to depth buffer
    polygonOffset: true,    // Enable polygon offset to prevent Z-fighting
    polygonOffsetFactor: -1 - tileDepthCounter * 0.1,  // Unique offset per tile
    polygonOffsetUnits: -1
  });

  // Calculate depth offset - each tile slightly in front of previous
  const depthOffset = tileDepthCounter * 0.02;  // Small unique offset
  tileDepthCounter++;

  const tile = new THREE.Mesh(tileGeo, tileMat);

  // Apply position with depth offset perpendicular to wall
  let finalX = x, finalZ = z;
  if (rotationY === 0) {
    finalZ = z + depthOffset;  // Back wall - offset toward center
  } else if (rotationY === Math.PI) {
    finalZ = z - depthOffset;  // Front wall - offset toward center
  } else if (rotationY === Math.PI / 2) {
    finalX = x + depthOffset;  // Left wall - offset toward center
  } else {
    finalX = x - depthOffset;  // Right wall - offset toward center
  }

  tile.position.set(finalX, y, finalZ);
  tile.rotation.y = rotationY;
  tile.renderOrder = tileDepthCounter;  // Explicit render order
  scene.add(tile);
  wallTiles.push(tile);

  // Some tiles get a subtle glow light
  if (hasGlow) {
    const glowLight = new THREE.PointLight(color, 0.08, 15, 2);
    glowLight.position.set(
      finalX + (rotationY === 0 || rotationY === Math.PI ? 0 : (rotationY > 0 ? 1 : -1)),
      y,
      finalZ + (rotationY === 0 ? 1 : (rotationY === Math.PI ? -1 : 0))
    );
    scene.add(glowLight);
  }

  return tile;
}

/**
 * Scatter tiles on a wall with random variation
 */
function scatterTilesOnWall(wallType, count) {
  for (let i = 0; i < count; i++) {
    // Random position along the wall
    const spread = 85;  // How far tiles spread along wall
    const pos = (Math.random() - 0.5) * spread;
    const y = Math.random() * 12 + 2;  // Height 2-14

    // Random color from palette
    const color = tileColors[Math.floor(Math.random() * tileColors.length)];

    // Random opacity - mostly muted, some vibrant
    const opacityRoll = Math.random();
    let opacity;
    if (opacityRoll < 0.5) {
      opacity = 0.03 + Math.random() * 0.05;  // Very muted (0.03-0.08)
    } else if (opacityRoll < 0.85) {
      opacity = 0.08 + Math.random() * 0.08;  // Medium (0.08-0.16)
    } else {
      opacity = 0.18 + Math.random() * 0.12;  // Vibrant (0.18-0.30)
    }

    // Random size
    const size = 1.5 + Math.random() * 4;  // 1.5 to 5.5 units wide

    // Some tiles glow (the more vibrant ones)
    const hasGlow = opacity > 0.15 && Math.random() > 0.5;

    let x, z, rotationY;

    switch (wallType) {
      case 'back':  // Z = -wallOffset
        x = pos;
        z = -wallOffset;
        rotationY = 0;
        break;
      case 'front':  // Z = +wallOffset
        x = pos;
        z = wallOffset;
        rotationY = Math.PI;
        break;
      case 'left':  // X = -wallOffset
        x = -wallOffset;
        z = pos;
        rotationY = Math.PI / 2;
        break;
      case 'right':  // X = +wallOffset
        x = wallOffset;
        z = pos;
        rotationY = -Math.PI / 2;
        break;
    }

    createWallTile(x, y, z, rotationY, color, opacity, size, hasGlow);
  }
}

// Scatter tiles on all four walls
scatterTilesOnWall('back', 40);
scatterTilesOnWall('front', 40);
scatterTilesOnWall('left', 35);
scatterTilesOnWall('right', 35);

console.log(`✓ Added ${wallTiles.length} scattered color tiles on walls`);

// ═══════════════════════════════════════════════════════════════════════
// S-Curve Path Generation - Smooth flowing path
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate S-curve path positions for exactly 35 platforms
 * Uses ARC-LENGTH spacing so platforms are evenly jumpable
 * Pattern: center → curve right → middle → curve left → center
 */
function generateSCurvePath() {
  const cfg = ROOM7_CONFIG;
  const positions = [];

  const numPlatforms = 35;  // Exactly 35 platforms
  const startZ = cfg.spawnZ + 3;  // First platform after spawn
  const endZ = cfg.portalZ - 3;   // Last platform before end
  const pathLength = endZ - startZ;

  // S-curve amplitude - balanced for jumpable distances without overlap
  // With double S-curve (2 cycles), path is longer so we can use moderate amplitude
  const amplitude = 25;

  // First, sample the DOUBLE S-curve densely to calculate arc length
  // Double S-curve = 2 full cycles = longer total path = better platform spacing
  const numSamples = 1000;
  const samplePoints = [];

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const z = startZ + t * pathLength;
    // Double S-curve: sin(4π * t) creates TWO full cycles
    // Path: 0 → +max → 0 → -max → 0 → +max → 0 → -max → 0
    // This doubles the total path length compared to single S-curve
    const x = amplitude * Math.sin(4 * Math.PI * t);
    samplePoints.push({ x, z, t });
  }

  // Calculate cumulative arc lengths
  const arcLengths = [0];
  for (let i = 1; i < samplePoints.length; i++) {
    const dx = samplePoints[i].x - samplePoints[i-1].x;
    const dz = samplePoints[i].z - samplePoints[i-1].z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    arcLengths.push(arcLengths[i-1] + dist);
  }
  const totalArcLength = arcLengths[arcLengths.length - 1];

  // Place platforms at equal arc-length intervals
  const arcSpacing = totalArcLength / (numPlatforms - 1);

  for (let i = 0; i < numPlatforms; i++) {
    const targetArcLength = i * arcSpacing;

    // Binary search to find the sample point closest to target arc length
    let low = 0, high = arcLengths.length - 1;
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (arcLengths[mid] < targetArcLength) {
        low = mid;
      } else {
        high = mid;
      }
    }

    // Interpolate between low and high sample points
    const lowArc = arcLengths[low];
    const highArc = arcLengths[high];
    const ratio = (highArc === lowArc) ? 0 : (targetArcLength - lowArc) / (highArc - lowArc);

    const x = samplePoints[low].x + ratio * (samplePoints[high].x - samplePoints[low].x);
    const z = samplePoints[low].z + ratio * (samplePoints[high].z - samplePoints[low].z);

    positions.push({ x: x, z: z, index: i });
  }

  // Log spacing info
  if (positions.length >= 2) {
    const dx = positions[1].x - positions[0].x;
    const dz = positions[1].z - positions[0].z;
    const actualSpacing = Math.sqrt(dx * dx + dz * dz);
    console.log(`Generated ${positions.length} platform positions in S-curve pattern`);
    console.log(`Arc-length spacing: ${arcSpacing.toFixed(2)} units between platforms`);
    console.log(`Amplitude: ±${amplitude} units (room walls at ±${cfg.roomSize/2})`);
  }

  return positions;
}

// ═══════════════════════════════════════════════════════════════════════
// Platform Creation System
// ═══════════════════════════════════════════════════════════════════════

const platforms = [];  // All platforms for collision detection
const loader = new THREE.TextureLoader();

/**
 * Create a single NFT platform with optional aspect ratio
 */
function createPlatform(x, y, z, size, textureUrl, isSpecial = false, aspectRatio = 1.0) {
  const cfg = ROOM7_CONFIG;
  const group = new THREE.Group();

  // Calculate platform dimensions based on aspect ratio
  // aspectRatio = width / height
  const platformWidth = size * aspectRatio;
  const platformDepth = size;

  // Platform base (box) - rectangular for aspect ratio
  const baseGeo = new THREE.BoxGeometry(platformWidth, cfg.platformThickness, platformDepth);

  // Platform edge material - chrome black for special, matte black for regular
  const edgeMaterial = new THREE.MeshStandardMaterial({
    color: isSpecial ? 0x222222 : 0x000000,
    emissive: isSpecial ? 0x111111 : 0x000000,
    emissiveIntensity: 0.2,
    metalness: isSpecial ? 0.95 : 0.7,   // High metalness for chrome look
    roughness: isSpecial ? 0.1 : 0.3     // Low roughness for reflective chrome
  });

  const base = new THREE.Mesh(baseGeo, edgeMaterial);
  base.position.y = -cfg.platformThickness / 2;
  group.add(base);

  // NFT texture on top
  if (textureUrl) {
    const texture = loader.load(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const topMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false
    });

    // Create rectangular plane matching aspect ratio
    const topGeo = new THREE.PlaneGeometry(platformWidth * 0.9, platformDepth * 0.9);
    const top = new THREE.Mesh(topGeo, topMaterial);
    top.rotation.x = -Math.PI / 2;
    top.rotation.z = Math.PI;  // Rotate 180 degrees to flip image
    top.position.y = 0.01;  // Slightly above base
    group.add(top);
  }

  // Point light under each platform for subtle glow effect
  const light = new THREE.PointLight(isSpecial ? 0xffffff : 0x222222, 0.4, 8);
  light.position.y = -1;
  group.add(light);

  // Position the platform
  group.position.set(x, y, z);

  // Store collision data with both width and depth for rectangular platforms
  group.userData = {
    isPlatform: true,
    size: size,
    width: platformWidth,
    depth: platformDepth,
    isSpecial: isSpecial
  };

  scene.add(group);
  platforms.push(group);

  return group;
}

/**
 * Create spawn platform (larger, at start)
 */
function createSpawnPlatform() {
  const cfg = ROOM7_CONFIG;
  const y = cfg.platformHeight;
  return createPlatform(0, y, cfg.spawnZ, cfg.spawnPlatformSize, null, true);
}

/**
 * Create end platform (larger, near portal)
 */
function createEndPlatform() {
  const cfg = ROOM7_CONFIG;
  const y = cfg.platformHeight;
  return createPlatform(0, y, cfg.portalZ, cfg.endPlatformSize, null, true);
}

/**
 * Create all NFT platforms along S-curve path
 * Each platform uses a unique image (no repeats) with aspect ratio preserved
 */
function createSCurvePlatforms(positions, imageFiles) {
  const cfg = ROOM7_CONFIG;
  const y = cfg.platformHeight;

  // Aspect ratio for horizontal images (width:height)
  // Most horizontal photos are 3:2 or 4:3 ratio
  const aspectRatio = 1.5;  // 3:2 ratio (width is 1.5x height)

  positions.forEach((pos, i) => {
    // Use each image exactly once (no cycling/repeating)
    if (i >= imageFiles.length) {
      console.warn(`Not enough images for platform ${i}`);
      return;
    }

    const textureUrl = getRoom7ArtUrl(imageFiles[i]);
    createPlatform(pos.x, y, pos.z, cfg.platformSize, textureUrl, false, aspectRatio);
  });

  console.log(`Created ${positions.length} NFT platforms in S-curve pattern with aspect ratio ${aspectRatio}`);
}

/**
 * Create wall placements on left and right sides
 * Evenly distributes images: 17 on left wall, 18 on right wall
 * Positioned in front of colored wall tiles
 */
function createWallPlacements(images) {
  const cfg = ROOM7_CONFIG;
  const wallX = cfg.roomSize / 2 - 1.5; // Position closer to walls
  const startZ = cfg.spawnZ + 10;
  const endZ = cfg.portalZ - 10;
  const wallHeight = cfg.platformHeight + 3; // Slightly above platform height

  // Left wall gets 17 images, right wall gets 18
  const leftCount = 17;
  const rightCount = 18;

  const zSpacing = (endZ - startZ) / Math.max(leftCount, rightCount);

  let imageIndex = 0;
  const baseRenderOrder = 1000; // High render order to ensure NFTs render on top

  // Left wall (17 images)
  for (let i = 0; i < leftCount; i++) {
    const z = startZ + i * zSpacing * (leftCount / rightCount); // Adjust spacing
    const textureUrl = getRoom7ArtUrl(images[imageIndex % images.length]);

    // Create a plane on the left wall
    const geometry = new THREE.PlaneGeometry(4, 4);
    const texture = new THREE.TextureLoader().load(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.FrontSide
    });
    const plane = new THREE.Mesh(geometry, material);

    // Position slightly in front of wall
    plane.position.set(-wallX + 0.5, wallHeight, z);
    plane.rotation.y = Math.PI / 2; // Face inward
    plane.renderOrder = baseRenderOrder + i; // Ensure renders on top of colored tiles
    scene.add(plane);

    imageIndex++;
  }

  // Right wall (18 images)
  for (let i = 0; i < rightCount; i++) {
    const z = startZ + i * zSpacing;
    const textureUrl = getRoom7ArtUrl(images[imageIndex % images.length]);

    // Create a plane on the right wall
    const geometry = new THREE.PlaneGeometry(4, 4);
    const texture = new THREE.TextureLoader().load(textureUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.FrontSide
    });
    const plane = new THREE.Mesh(geometry, material);

    // Position slightly in front of wall
    plane.position.set(wallX - 0.5, wallHeight, z);
    plane.rotation.y = -Math.PI / 2; // Face inward
    plane.renderOrder = baseRenderOrder + leftCount + i; // Ensure renders on top of colored tiles
    scene.add(plane);

    imageIndex++;
  }

  console.log(`Created wall placements: ${leftCount} on left wall, ${rightCount} on right wall`);
}

// Room 7 NFT Files - 35 PNG images used for all platforms and walls
const room7Images = [
"ComfyUI_03027_",
"ComfyUI_03028_",
"ComfyUI_03029_",
"ComfyUI_03030_",
"ComfyUI_03031_",
"ComfyUI_03032_",
"ComfyUI_03033_",
"ComfyUI_03034_",
"ComfyUI_03035_",
"ComfyUI_03036_",
"ComfyUI_03037_",
"ComfyUI_03038_",
"ComfyUI_03039_",
"ComfyUI_03040_",
"ComfyUI_03041_",
"ComfyUI_03042_",
"ComfyUI_03043_",
"ComfyUI_03044_",
"ComfyUI_03045_",
"ComfyUI_03046_",
"ComfyUI_03047_",
"ComfyUI_03048_",
"ComfyUI_03049_",
"ComfyUI_03050_",
"ComfyUI_03051_",
"ComfyUI_03052_",
"ComfyUI_03053_",
"ComfyUI_03054_",
"ComfyUI_03055_",
"ComfyUI_03056_",
"ComfyUI_03057_",
"ComfyUI_03058_",
"ComfyUI_03059_",
"ComfyUI_03060_",
"ComfyUI_03061_"
];

// ═══════════════════════════════════════════════════════════════════════
// Create Platforms
// ═══════════════════════════════════════════════════════════════════════

// Create spawn and end platforms
const spawnPlatform = createSpawnPlatform();
const endPlatform = createEndPlatform();

// Generate S-curve path and create main NFT platforms
const sCurvePositions = generateSCurvePath();
createSCurvePlatforms(sCurvePositions, room7Images);

// Add wall placements on left and right sides (17 + 18 = 35 images)
createWallPlacements(room7Images);

console.log(`✓ Room 7 initialized: ${platforms.length} total platforms (S-curve + walls)`);

// ═══════════════════════════════════════════════════════════════════════
// Platform Collision Detection
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if player is standing on any platform
 * Updated to handle rectangular platforms with width and depth
 */
function detectPlatformCollision(playerPos) {
  const cfg = ROOM7_CONFIG;
  const feetY = playerPos.y - cfg.eyeHeight;

  for (const platform of platforms) {
    const platformTop = platform.position.y + cfg.platformThickness / 2;

    // Get platform dimensions (use width/depth for rectangular, size for square)
    const platformWidth = platform.userData.width || platform.userData.size;
    const platformDepth = platform.userData.depth || platform.userData.size;
    const halfWidth = platformWidth / 2;
    const halfDepth = platformDepth / 2;

    // Horizontal bounds check (rectangular platform)
    const dx = Math.abs(playerPos.x - platform.position.x);
    const dz = Math.abs(playerPos.z - platform.position.z);
    const onPlatformXZ = dx <= halfWidth + 0.3 && dz <= halfDepth + 0.3;

    // Vertical check - feet near platform top
    const vertDist = Math.abs(feetY - platformTop);
    const nearPlatformY = vertDist < 1.5;

    if (onPlatformXZ && nearPlatformY) {
      return platform;
    }
  }

  return null;
}

/**
 * Check if player has fallen to floor (danger zone)
 */
function hasFallenToFloor(playerPos) {
  const cfg = ROOM7_CONFIG;
  const feetY = playerPos.y - cfg.eyeHeight;
  return feetY <= cfg.floorY + 0.5;
}

/**
 * Respawn player at spawn platform
 */
function respawnPlayer() {
  camera.position.set(0, spawnY, ROOM7_CONFIG.spawnZ);
  isJumping = false;
  isFalling = false;
  jumpVelocity = 0;
  fallVelocity = 0;
  currentPlatform = spawnPlatform;
  console.log('Respawned at spawn platform');
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
      if (!isJumping && !isFalling) {
        jumpVelocity = ROOM7_CONFIG.jumpVelocity;
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

// Portal to Room 8 - positioned on end platform (forward direction)
const portalY = ROOM7_CONFIG.platformHeight + ROOM7_CONFIG.platformThickness / 2 + eyeHeight;
const portal8Obj = createLinkedPortal({
  scene,
  fromRoom: '7',
  toRoom: '8',
  x: 0,
  y: portalY,
  z: ROOM7_CONFIG.portalZ,
  rotationY: 0,
  createLabel: false
});

const portalToRoom8 = portal8Obj.portal;
const portal8Glow = portal8Obj.glow;

// Portal to Room 6 - positioned BEHIND spawn (back to Lava Corridor)
const portal6Obj = createLinkedPortal({
  scene,
  fromRoom: '7',
  toRoom: '6',
  x: 0,
  y: portalY,
  z: ROOM7_CONFIG.spawnZ - 5,  // Behind spawn position (player must turn around to see it)
  rotationY: 0,  // Face +Z direction (toward player when they turn around)
  createLabel: false
});

const portalToRoom6 = portal6Obj.portal;
const portal6Glow = portal6Obj.glow;

// Portal to Room 0 (Ocean Hub) - NEW: positioned near spawn for easy return
const portal0Obj = createLinkedPortal({
  scene,
  fromRoom: '7',
  toRoom: '0',
  x: -ROOM7_CONFIG.roomSize / 2 + 10,  // Left side of room
  y: portalY,
  z: ROOM7_CONFIG.spawnZ + 5,  // Near spawn, slightly forward
  rotationY: Math.PI / 2,  // Face toward center
  createLabel: false
});

const portalToRoom0 = portal0Obj.portal;
const portal0Glow = portal0Obj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: [
    {
      position: new THREE.Vector3(0, portalY, ROOM7_CONFIG.portalZ),
      name: 'Ancient Ascension (Room 8)',
      url: 'room8.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    },
    {
      position: new THREE.Vector3(0, portalY, ROOM7_CONFIG.spawnZ - 5),
      name: 'Lava Corridor (Room 6)',
      url: 'room6.html',
      showDistance: 3.0,
      triggerDistance: 1.8
    },
    {
      position: new THREE.Vector3(-ROOM7_CONFIG.roomSize / 2 + 10, portalY, ROOM7_CONFIG.spawnZ + 5),
      name: 'Ocean Hub (Room 0)',
      url: 'room0.html',
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
  const cfg = ROOM7_CONFIG;

  if (controls.isLocked) {
    // Get player object (camera parent in PointerLockControls)
    const player = controls.getObject();

    const onPlatform = detectPlatformCollision(player.position);

    // ─────────────────────────────────────────────────────────────────
    // Vertical Physics (Jumping, Falling, Platform Landing)
    // ─────────────────────────────────────────────────────────────────

    if (isJumping) {
      // Apply jump velocity (use player.position, not camera.position)
      player.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;

      // Check if landed on platform
      if (onPlatform && jumpVelocity <= 0) {
        const platformTop = onPlatform.position.y + cfg.platformThickness / 2;
        const feetY = player.position.y - cfg.eyeHeight;
        if (feetY <= platformTop + 0.5) {
          player.position.y = platformTop + cfg.eyeHeight;
          isJumping = false;
          jumpVelocity = 0;
          currentPlatform = onPlatform;
        }
      }

      // Check if fallen to floor (respawn)
      if (hasFallenToFloor(player.position)) {
        respawnPlayer();
      }

    } else if (isFalling) {
      // Apply fall velocity
      player.position.y += fallVelocity * delta;
      fallVelocity += gravity * delta * 0.8;

      // Check if landed on platform
      if (onPlatform) {
        const platformTop = onPlatform.position.y + cfg.platformThickness / 2;
        player.position.y = platformTop + cfg.eyeHeight;
        isFalling = false;
        fallVelocity = 0;
        currentPlatform = onPlatform;
      }

      // Check if fallen to floor (respawn)
      if (hasFallenToFloor(player.position)) {
        respawnPlayer();
      }

    } else {
      // Not jumping or falling - standing state
      if (onPlatform) {
        // Standing on platform - keep aligned
        const platformTop = onPlatform.position.y + cfg.platformThickness / 2;
        player.position.y = platformTop + cfg.eyeHeight;
        currentPlatform = onPlatform;
      } else {
        // Not on any platform - start falling
        isFalling = true;
        fallVelocity = 0;
        currentPlatform = null;
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // Horizontal Movement
    // ─────────────────────────────────────────────────────────────────

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Room boundary clamping
    const limit = cfg.roomSize / 2 - 1;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);
  }

  // ─────────────────────────────────────────────────────────────────
  // Portal & Rendering
  // ─────────────────────────────────────────────────────────────────

  checkPortalProximity();
  animateLinkedPortal(portalToRoom8, portal8Glow);
  animateLinkedPortal(portalToRoom6, portal6Glow);
  animateLinkedPortal(portalToRoom0, portal0Glow);

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
