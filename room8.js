import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { initScene } from './src/core/scene-setup.js';

// ═══════════════════════════════════════════════════════════════════════
// Room 8: "Ancient Ascension Shaft" - Egyptian Elevator Trial
// ═══════════════════════════════════════════════════════════════════════
/**
 * IMPLEMENTATION NOTES:
 * - Shaft: 50 units tall, radius 12 (base) → 11 (top), tapered cylinder
 * - Platforms: 7 total
 *   - Platform 0: static spawn at Y=2.0, player spawns at Y=2.6
 *   - Platforms 1-6: sinusoidal motion (y = baseY + sin(t*speed+phase)*amp)
 * - NFTs: 32 wall placeholders (4 levels × 8 per ring), nft72-103
 * - Portal: to Room 5, at Y=43 (accessible from Platform 6)
 * - Physics: Jump=10, Gravity=-30, Respawn if Y<-1.0
 * - Lights: 11 total (1 ambient + 6 torches + 1 god ray + 3 lamp orbs)
 * - Ancient Lamps: 3 wall-mounted Egyptian sconces in spiral pattern
 *   - Placement: Double helix with platforms (between P0-P1, P2-P3, P4-P5)
 *   - Angles: 25.7°, 128.6°, 231.4° (offset from platform spiral)
 *   - Each has glowing amber orb with PointLight (intensity 3.0, distance 8.0)
 *   - Materials: Procedural sandstone texture, hieroglyph bump map, metal band
 *   - Subtle flicker animation for realistic fire-like behavior
 *
 * CONFIG KNOBS:
 * - ROOM8_CONFIG.nftStartIndex: First NFT number (default 72)
 * - ROOM8_CONFIG.enableDustParticles: Atmospheric dust (default true)
 * - ROOM8_CONFIG.dustParticleCount: Number of particles (default 60)
 * - ROOM8_CONFIG.platformLandingFeedback: Emissive pulse on land (default true)
 * - ROOM8_CONFIG.enableAncientLamps: Wall-mounted lamps (default true)
 * - ROOM8_CONFIG.lampPositions: Spiral lamp positions (angle, y)
 * - ROOM8_CONFIG.lampOrbIntensity: Light intensity per lamp orb
 *
 * PERFORMANCE:
 * - 7 animated platforms (sinusoidal, negligible CPU)
 * - 32 NFT textures loaded async with fallback
 * - 60 dust particles (reduced from 150 for performance)
 * - 3 ancient lamps in spiral pattern (shared geometries/materials, ~30 meshes)
 * - 11 lights total (reduced from 16 for better performance)
 * - Target: 60 FPS, <20 MB VRAM
 */
// ═══════════════════════════════════════════════════════════════════════

import { getNftUrl } from './src/core/asset-utils.js';

// Room 8 Master Configuration
const ROOM8_CONFIG = {
  // Shaft geometry
  baseRadius: 12,
  topRadius: 11,
  height: 50,
  
  // Platforms (Spiral Design)
  platformCount: 7,
  platformRadius: 1.8,          // Reduced from 3.5 for spiral layout
  platformHeight: 0.6,
  platformRadialPosition: 6.0,  // Distance from shaft center (0,0)
  platformAngularSpacing: 51.43, // Degrees between platforms (360°/7)
  
  // Player physics
  eyeHeight: 2.5,
  speed: 100.0,
  gravity: -30,
  jumpVelocity: 10,
  
  // Content
  nftCount: 32,
  nftStartIndex: 72,      // nft72-103 (32 total)
  nftSize: 2.0,
  
  // VFX
  enableDustParticles: true,
  dustParticleCount: 60,       // Reduced from 150 for performance
  platformLandingFeedback: true,
  
  // Ancient Lamps (Spiral Design - Double Helix with Platforms)
  enableAncientLamps: true,
  lampCount: 3,                  // Reduced from 8 for performance
  lampRadiusPosition: 10.5,      // Distance from shaft center (near wall)
  lampOrbIntensity: 3.0,         // Tuned for balance
  lampOrbDistance: 8.0,          // Focused lighting

  // Spiral lamp positions (angle, Y height)
  // Positioned between platforms for double helix effect
  lampPositions: [
    { angle: 25.7,   y: 4.5 },   // Between P0-P1
    { angle: 128.6,  y: 17.5 },  // Between P2-P3
    { angle: 231.4,  y: 31.5 }   // Between P4-P5
  ],

  // Performance
  torchCount: 6,                 // 3 levels × 2 per level
  totalLights: 11                // ambient + 6 torches + 1 god ray + 3 lamp orbs (spiral)
};

const eyeHeight = ROOM8_CONFIG.eyeHeight;
const speed = ROOM8_CONFIG.speed;
const gravity = ROOM8_CONFIG.gravity;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let isJumping = false;
let jumpVelocity = 0;
let isFalling = false;
let fallVelocity = 0;
let currentPlatform = null;

// Spawn on Platform 0 (static base platform at angle 0°, radial position 6.0)
// Platform 0 is at (0, 2.0, 6.0) in spiral layout
const spawnY = 2.0 + ROOM8_CONFIG.platformHeight / 2 + eyeHeight;
const spawnZ = ROOM8_CONFIG.platformRadialPosition; // Platform 0 at angle 0° (south)
const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: spawnY, z: spawnZ },
  background: 0x1a140f,  // Dark warm brown
  fog: { color: 0x2a1f15, near: 15, far: 45 }  // Warm brown fog
});

// ----------------------------------------------------------------------
// Lighting - Egyptian Torch/Brazier System
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xaa8844, 0.15);
scene.add(ambientLight);

// Torch lights at 3 vertical levels (2 per level, opposite sides)
// Intensity reduced from 0.8 to 0.5 to balance with new lamps
const torchLights = [];
const torchLevels = [12, 24, 36];
const torchColor = 0xff8833;

torchLevels.forEach(y => {
  // Torch 1 (front)
  const torch1 = new THREE.PointLight(torchColor, 0.5, 15);
  torch1.position.set(0, y, ROOM8_CONFIG.baseRadius * 0.75);
  scene.add(torch1);
  torchLights.push(torch1);
  
  // Torch 2 (back)
  const torch2 = new THREE.PointLight(torchColor, 0.5, 15);
  torch2.position.set(0, y, -ROOM8_CONFIG.baseRadius * 0.75);
  scene.add(torch2);
  torchLights.push(torch2);
});

// Optional ceiling god ray
const godRay = new THREE.SpotLight(0xffffcc, 0.4, 60, Math.PI / 6, 0.5);
godRay.position.set(0, 52, 0);
godRay.target.position.set(0, 0, 0);
scene.add(godRay);
scene.add(godRay.target);

// ----------------------------------------------------------------------
// Ancient Egyptian Wall Lamp System
// ----------------------------------------------------------------------

/**
 * Procedural stone texture generator
 */
function createStoneTexture() {
  const size = 256; // Reduced from 512 for performance
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base sandstone color
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Noise
  for (let i = 0; i < 40000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    ctx.globalAlpha = 0.15;
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = Math.random() * 2;
    ctx.fillRect(x, y, s, s);
  }

  // Weathering cracks
  ctx.strokeStyle = '#000000';
  ctx.globalAlpha = 0.1;
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
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
 * Procedural hieroglyph bump map generator
 */
function createGlyphTexture() {
  const w = 128; // Reduced from 256
  const h = 512; // Reduced from 1024
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Background (grey = neutral)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);

  // Carving lines (dark = indented)
  ctx.strokeStyle = '#202020';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = w / 2;

  // Symbol 1: Eye
  let y = 100;
  ctx.beginPath();
  ctx.moveTo(cx - 30, y);
  ctx.quadraticCurveTo(cx, y - 30, cx + 30, y);
  ctx.quadraticCurveTo(cx, y + 30, cx - 30, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, y, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Symbol 2: Ankh
  y = 220;
  ctx.beginPath();
  ctx.arc(cx, y, 20, 0, Math.PI * 2);
  ctx.moveTo(cx, y + 20);
  ctx.lineTo(cx, y + 70);
  ctx.moveTo(cx - 20, y + 45);
  ctx.lineTo(cx + 20, y + 45);
  ctx.stroke();

  // Symbol 3: Waves
  y = 360;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    let ly = y + i * 30;
    ctx.moveTo(cx - 35, ly);
    ctx.bezierCurveTo(cx - 15, ly - 15, cx + 15, ly + 15, cx + 35, ly);
  }
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// Singleton textures/materials (shared across all lamp instances)
const lampSharedAssets = {
  stoneTexture: null,
  glyphTexture: null,
  stoneMaterial: null,
  metalMaterial: null,
  glowMaterial: null
};

/**
 * Initialize shared lamp materials (call once)
 */
function initLampMaterials() {
  if (lampSharedAssets.stoneMaterial) return; // Already initialized

  lampSharedAssets.stoneTexture = createStoneTexture();
  lampSharedAssets.glyphTexture = createGlyphTexture();

  lampSharedAssets.stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B5A2B, // Sandstone orange/brown
    map: lampSharedAssets.stoneTexture,
    bumpMap: lampSharedAssets.stoneTexture,
    bumpScale: 0.12,
    roughness: 0.9
  });

  lampSharedAssets.metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a4a4a,
    metalness: 0.8,
    roughness: 0.6,
    bumpMap: lampSharedAssets.stoneTexture,
    bumpScale: 0.04
  });

  lampSharedAssets.glowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff8800,
    emissiveIntensity: 1.5, // Reduced from 2 (no bloom in Room 8)
    roughness: 0.3,
    metalness: 0.1
  });
}

/**
 * Create a single ancient Egyptian wall lamp instance
 * Returns: { group, orbLight }
 */
function createAncientLamp() {
  const cfg = ROOM8_CONFIG;
  const lampGroup = new THREE.Group();

  // Scale factor (prototype was large for showcase, scale down for shaft)
  const scale = 0.6;

  // 1. Main pillar backing
  const pillarGeo = new THREE.BoxGeometry(3.5 * scale, 9 * scale, 1 * scale);
  const pillar = new THREE.Mesh(pillarGeo, lampSharedAssets.stoneMaterial);
  pillar.position.z = -0.5 * scale;
  lampGroup.add(pillar);

  // 2. Top cap
  const capGeo = new THREE.BoxGeometry(4 * scale, 0.8 * scale, 1.4 * scale);
  const cap = new THREE.Mesh(capGeo, lampSharedAssets.stoneMaterial);
  cap.position.y = 4.9 * scale;
  cap.position.z = -0.5 * scale;
  lampGroup.add(cap);

  // Bottom cap
  const botCap = cap.clone();
  botCap.position.y = -4.9 * scale;
  lampGroup.add(botCap);

  // 3. Circular niche frame (simplified torus)
  const ringGeo = new THREE.TorusGeometry(1.4 * scale, 0.3 * scale, 8, 32);
  const ring = new THREE.Mesh(ringGeo, lampSharedAssets.stoneMaterial);
  ring.position.y = 2 * scale;
  ring.position.z = 0;
  ring.scale.set(1, 1, 0.5);
  lampGroup.add(ring);

  // Dark backing for niche
  const holeGeo = new THREE.CircleGeometry(1.3 * scale, 24);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 1 });
  const hole = new THREE.Mesh(holeGeo, holeMat);
  hole.position.set(0, 2 * scale, -0.1 * scale);
  lampGroup.add(hole);

  // 4. Glowing orb (sphere)
  const orbGeo = new THREE.SphereGeometry(1 * scale, 32, 32);
  const orb = new THREE.Mesh(orbGeo, lampSharedAssets.glowMaterial);
  orb.position.set(0, 2 * scale, 0.2 * scale);
  lampGroup.add(orb);

  // 5. Metal holder band
  const bandGeo = new THREE.CylinderGeometry(1.1 * scale, 1.1 * scale, 0.6 * scale, 24);
  const band = new THREE.Mesh(bandGeo, lampSharedAssets.metalMaterial);
  band.rotation.x = Math.PI / 2;
  band.position.set(0, 0.9 * scale, 0.5 * scale);
  lampGroup.add(band);

  // Rivets on band (simplified, fewer)
  for (let i = 0; i < 3; i++) {
    const rivet = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 * scale, 8, 8),
      lampSharedAssets.metalMaterial
    );
    rivet.position.set(i * 0.4 * scale - 0.4 * scale, 0.9 * scale, 1.0 * scale);
    lampGroup.add(rivet);
  }

  // 6. Front hieroglyph panel (simplified box, not extruded shape)
  const panelGeo = new THREE.BoxGeometry(1.8 * scale, 4.5 * scale, 0.25 * scale);
  const glyphMaterial = lampSharedAssets.stoneMaterial.clone();
  glyphMaterial.bumpMap = lampSharedAssets.glyphTexture;
  glyphMaterial.bumpScale = 0.4;

  const panel = new THREE.Mesh(panelGeo, glyphMaterial);
  panel.position.set(0, -1.8 * scale, 0.3 * scale);
  lampGroup.add(panel);

  // 7. Orb point light (integrated into lamp)
  const orbLight = new THREE.PointLight(
    0xffaa00,
    cfg.lampOrbIntensity,
    cfg.lampOrbDistance
  );
  orbLight.position.copy(orb.position);
  lampGroup.add(orbLight);

  return { group: lampGroup, orbLight };
}

/**
 * Place ancient lamps in spiral pattern (double helix with platforms)
 * Returns: Array of { group, orbLight } for animation
 */
function placeAncientLamps() {
  const cfg = ROOM8_CONFIG;
  if (!cfg.enableAncientLamps) return [];

  initLampMaterials(); // Initialize shared materials once

  const lamps = [];

  cfg.lampPositions.forEach((lampData, i) => {
    const { angle, y } = lampData;

    // Calculate spiral position from angle and radial distance
    // Same formula as platforms: 0° = South (positive Z), 90° = East (positive X)
    const angleRad = angle * Math.PI / 180;
    const x = Math.sin(angleRad) * cfg.lampRadiusPosition;
    const z = Math.cos(angleRad) * cfg.lampRadiusPosition;

    const { group, orbLight } = createAncientLamp();

    // Position lamp in spiral
    group.position.set(x, y, z);

    // Face inward toward shaft center
    group.lookAt(0, y, 0);

    scene.add(group);
    lamps.push({ group, orbLight });

    console.log(`Lamp ${i}: angle=${angle.toFixed(1)}°, pos=(${x.toFixed(2)}, ${y}, ${z.toFixed(2)})`);
  });

  console.log(`✓ Placed ${lamps.length} ancient wall lamps in spiral pattern (double helix)`);
  return lamps;
}

// ----------------------------------------------------------------------
// Vertical Shaft Structure
// ----------------------------------------------------------------------
function createShaft() {
  const cfg = ROOM8_CONFIG;
  
  // Main vertical cylindrical shaft (tapered)
  const shaftGeometry = new THREE.CylinderGeometry(
    cfg.topRadius,    // Top radius (narrower)
    cfg.baseRadius,   // Bottom radius
    cfg.height,       // Height
    32,               // Radial segments
    1,                // Height segments
    true              // Open ended
  );

  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: 0xc4a052,     // Sandstone yellow-beige
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.BackSide
  });

  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.position.y = cfg.height / 2;  // Center vertically
  scene.add(shaft);

  // Floor (bottom of shaft)
  const floorGeometry = new THREE.CircleGeometry(cfg.baseRadius, 32);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xa89050,     // Dusty darker sandstone
    roughness: 0.95,
    metalness: 0.02
  });

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);

  // Ceiling (top of shaft, mostly shadowed)
  const ceilingGeometry = new THREE.CircleGeometry(cfg.topRadius, 32);
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3825,
    roughness: 0.9,
    metalness: 0.05
  });

  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = cfg.height;
  scene.add(ceiling);

  console.log('✓ Created vertical shaft:', {
    baseRadius: cfg.baseRadius,
    topRadius: cfg.topRadius,
    height: cfg.height
  });

  return { shaft, floor, ceiling };
}

// ----------------------------------------------------------------------
// Platform System
// ----------------------------------------------------------------------

// Platform motion parameters - SPIRAL DESIGN
// Platforms arranged in helix pattern with synchronized phase alternation
// When odd platforms peak, even platforms are at low point (and vice versa)
const platformMotionParams = [
  // Platform 0: Static spawn (South, 0°)
  {
    angle: 0,           // Degrees
    baseY: 2.0,         // Static height
    amplitude: 0,       // No motion
    speed: 0,
    phase: 0
  },
  // Platform 1: First moving platform (Southeast, 51.43°)
  {
    angle: 51.43,
    baseY: 7.0,         // Range: 4.5 to 9.5
    amplitude: 2.5,
    speed: 1.0,
    phase: 0            // In-phase (peaks at sin=1)
  },
  // Platform 2: Anti-phase to P1 (East, 102.86°)
  {
    angle: 102.86,
    baseY: 14.0,        // Range: 11.5 to 16.5
    amplitude: 2.5,     // When P1 peaks (9.5), P2 is low (11.5) → 2.0 gap
    speed: 1.0,
    phase: Math.PI      // Anti-phase (peaks at sin=-1)
  },
  // Platform 3: In-phase with P1 (Northeast, 154.29°)
  {
    angle: 154.29,
    baseY: 21.0,        // Range: 18.5 to 23.5
    amplitude: 2.5,     // When P2 peaks (16.5), P3 is low (18.5) → 2.0 gap
    speed: 1.0,
    phase: 0
  },
  // Platform 4: Anti-phase (Northwest, 205.71°)
  {
    angle: 205.71,
    baseY: 28.0,        // Range: 25.5 to 30.5
    amplitude: 2.5,     // When P3 peaks (23.5), P4 is low (25.5) → 2.0 gap
    speed: 1.0,
    phase: Math.PI
  },
  // Platform 5: In-phase with P1 (West, 257.14°)
  {
    angle: 257.14,
    baseY: 35.0,        // Range: 32.5 to 37.5
    amplitude: 2.5,     // When P4 peaks (30.5), P5 is low (32.5) → 2.0 gap
    speed: 1.0,
    phase: 0
  },
  // Platform 6: Exit platform, anti-phase (Southwest, 308.57°)
  {
    angle: 308.57,
    baseY: 42.0,        // Range: 39.5 to 44.5
    amplitude: 2.5,     // When P5 peaks (37.5), P6 is low (39.5) → 2.0 gap
    speed: 1.0,
    phase: Math.PI      // Portal at Y=43 accessible when high
  }
];

function createPlatforms() {
  const cfg = ROOM8_CONFIG;
  const platforms = [];

  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a2815,       // Dark stone with bronze tone
    roughness: 0.8,
    metalness: 0.3,
    emissive: 0x2a1a0a,    // Subtle warm glow
    emissiveIntensity: 0.1
  });

  platformMotionParams.forEach((params, i) => {
    const platformGeometry = new THREE.CylinderGeometry(
      cfg.platformRadius,
      cfg.platformRadius,
      cfg.platformHeight,
      32
    );

    const platform = new THREE.Mesh(platformGeometry, platformMaterial.clone());

    // Calculate spiral position from angle and radial distance
    // 0° = South (positive Z), 90° = East (positive X), etc.
    const angleRad = params.angle * Math.PI / 180;
    const x = Math.sin(angleRad) * cfg.platformRadialPosition;
    const z = Math.cos(angleRad) * cfg.platformRadialPosition;

    platform.position.set(x, params.baseY, z);

    // Store motion parameters and position data
    platform.userData.motionParams = params;
    platform.userData.platformIndex = i;
    platform.userData.angleRad = angleRad;
    platform.userData.baseX = x;
    platform.userData.baseZ = z;

    scene.add(platform);
    platforms.push(platform);

    // Debug log for verification
    if (i === 0) {
      console.log(`Platform ${i}: angle=${params.angle.toFixed(1)}°, pos=(${x.toFixed(2)}, ${params.baseY}, ${z.toFixed(2)}), static`);
    } else {
      console.log(`Platform ${i}: angle=${params.angle.toFixed(1)}°, pos=(${x.toFixed(2)}, ${params.baseY}±${params.amplitude}, ${z.toFixed(2)}), phase=${params.phase.toFixed(2)}`);
    }
  });

  console.log(`✓ Created ${platforms.length} platforms in spiral pattern`);
  return platforms;
}

/**
 * Detect if player is standing on a platform (3D collision for spiral layout)
 */
function detectPlatformCollision(playerPos) {
  const cfg = ROOM8_CONFIG;
  const feetY = playerPos.y - cfg.eyeHeight;

  for (let platform of platforms) {
    // Calculate 3D horizontal distance (works for spiral positions)
    const horizontalDist = Math.sqrt(
      (playerPos.x - platform.position.x) ** 2 +
      (playerPos.z - platform.position.z) ** 2
    );

    const platformTop = platform.position.y + cfg.platformHeight / 2;

    // Increased tolerance for more reliable collision
    // Horizontal: radius 1.7 (was 1.5), Vertical: ±1.2 (was ±0.6)
    if (
      horizontalDist <= cfg.platformRadius - 0.1 &&
      Math.abs(feetY - platformTop) < 1.2
    ) {
      return platform;
    }
  }

  return null;
}

/**
 * Check if player is on the floor (solid ground at Y=0)
 */
function isOnFloor(playerPos) {
  const cfg = ROOM8_CONFIG;
  const feetY = playerPos.y - cfg.eyeHeight;

  // Check if feet are near floor level (Y=0)
  if (Math.abs(feetY) < 0.8) {
    // Check if within shaft radius (with buffer for safety)
    const distFromCenter = Math.sqrt(playerPos.x ** 2 + playerPos.z ** 2);
    if (distFromCenter < cfg.baseRadius - 1.0) {
      return true;
    }
  }

  return false;
}

/**
 * Update platform positions based on sinusoidal motion
 */
function updatePlatforms(time) {
  platforms.forEach(platform => {
    const params = platform.userData.motionParams;
    if (params.amplitude === 0) return; // Static platform
    
    const newY = params.baseY + Math.sin(time * params.speed + params.phase) * params.amplitude;
    platform.position.y = newY;
  });
}

// ----------------------------------------------------------------------
// Wall NFT System (Phase 5 - Real Texture Integration)
// ----------------------------------------------------------------------
function createWallNFTs() {
  const cfg = ROOM8_CONFIG;
  const nftPlanes = [];
  const textureLoader = new THREE.TextureLoader();
  
  // 4 vertical levels × 8 per level = 32 NFTs
  const levels = [10, 20, 30, 40];
  const nftsPerLevel = 8;
  let loadedCount = 0;
  let nftIndex = 0;
  
  levels.forEach(levelY => {
    for (let i = 0; i < nftsPerLevel; i++) {
      const angle = (i / nftsPerLevel) * Math.PI * 2;
      const radius = cfg.baseRadius - 0.5; // Inset from wall
      
      const nftX = Math.cos(angle) * radius;
      const nftZ = Math.sin(angle) * radius;
      
      // Start with black placeholder
      const placeholderMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
      });
      
      const nftPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(cfg.nftSize, cfg.nftSize),
        placeholderMaterial
      );
      
      nftPlane.position.set(nftX, levelY, nftZ);
      nftPlane.lookAt(0, levelY, 0); // Face inward
      
      scene.add(nftPlane);
      nftPlanes.push(nftPlane);
      
      // Load real NFT texture asynchronously
      const currentNftIndex = cfg.nftStartIndex + nftIndex;
      const nftUrl = getNftUrl(currentNftIndex);
      
      textureLoader.load(
        nftUrl,
        (texture) => {
          // Success: replace material with textured version
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.encoding = THREE.sRGBEncoding;
          
          nftPlane.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
          });
          
          loadedCount++;
          if (loadedCount === cfg.nftCount) {
            console.log(`✓ All ${loadedCount} NFT textures loaded (nft${cfg.nftStartIndex}-${currentNftIndex})`);
          }
        },
        undefined,
        (error) => {
          // Fallback: keep black placeholder
          console.warn(`⚠ NFT ${currentNftIndex} failed to load, using placeholder`);
        }
      );
      
      nftIndex++;
    }
  });
  
  console.log(`✓ Placed ${nftPlanes.length} NFT planes, loading textures...`);
  return nftPlanes;
}

/**
 * Respawn player at Platform 0 (spiral spawn position)
 */
function respawnPlayer() {
  const player = controls.getObject();
  player.position.set(0, spawnY, spawnZ); // Match Platform 0 position
  isJumping = false;
  isFalling = false;
  jumpVelocity = 0;
  fallVelocity = 0;
  console.log('Respawned at Platform 0 (spiral position)');
}

/**
 * Create subtle dust particles in god ray (Phase 6 - Atmospheric VFX)
 */
function createDustParticles() {
  if (!ROOM8_CONFIG.enableDustParticles) return null;
  
  const particleCount = ROOM8_CONFIG.dustParticleCount;
  const positions = [];
  const velocities = [];
  
  // Create particles in cone shape of god ray (top to bottom)
  for (let i = 0; i < particleCount; i++) {
    // Random position in vertical cone
    const y = Math.random() * ROOM8_CONFIG.height;
    const spreadRadius = (ROOM8_CONFIG.height - y) * 0.15; // Wider at bottom
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spreadRadius;
    
    positions.push(
      Math.cos(angle) * dist,  // x
      y,                       // y
      Math.sin(angle) * dist   // z
    );
    
    // Slow downward drift
    velocities.push(
      (Math.random() - 0.5) * 0.01,  // x velocity (slight wobble)
      -Math.random() * 0.04 - 0.02,  // y velocity (falling)
      (Math.random() - 0.5) * 0.01   // z velocity (slight wobble)
    );
  }
  
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffeeaa,  // Warm dust color
    size: 0.05,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particleSystem);
  
  console.log(`✓ Created ${particleCount} dust particles in god ray`);
  
  return { particles: particleSystem, velocities };
}

/**
 * Platform landing feedback (Phase 6 - UX polish)
 */
function triggerPlatformLandingFeedback(platform) {
  if (!ROOM8_CONFIG.platformLandingFeedback) return;
  if (!platform || platform.userData.platformIndex === 0) return; // Skip spawn platform
  
  // Brief emissive pulse
  const originalIntensity = platform.material.emissiveIntensity;
  platform.material.emissiveIntensity = 0.5; // Bright pulse
  
  setTimeout(() => {
    platform.material.emissiveIntensity = originalIntensity;
  }, 150);
}

// ----------------------------------------------------------------------
// Create Scene Elements
// ----------------------------------------------------------------------
const { shaft, floor, ceiling } = createShaft();
const platforms = createPlatforms();
const wallNFTs = createWallNFTs();
const dustParticles = createDustParticles();
const ancientLamps = placeAncientLamps(); // Ancient Egyptian wall lamps

// ----------------------------------------------------------------------
// Portal to Room 5
// ----------------------------------------------------------------------
const portalY = 43; // Accessible from Platform 6
const portalObj = createLinkedPortal({
  scene,
  fromRoom: '8',
  toRoom: '5',
  x: 0,
  y: portalY,
  z: 0,
  rotationY: 0,
  createLabel: true
});

const portalToRoom5 = portalObj.portal;
const portalGlow = portalObj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(),  // Use player position like Room 6
  portals: [
    {
      position: new THREE.Vector3(0, portalY, 0),
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

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Update platform positions (Phase 4 - motion enabled)
  updatePlatforms(time);

  if (controls.isLocked) {
    const player = controls.getObject();
    const onPlatform = detectPlatformCollision(player.position);
    const onFloor = isOnFloor(player.position);
    const onSolidGround = onPlatform || onFloor;

    // Vertical physics - platform and floor collision
    if (isJumping) {
      player.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;

      // Land on platform if we're on one
      if (onPlatform && jumpVelocity <= 0) {
        const platformTop = onPlatform.position.y + ROOM8_CONFIG.platformHeight / 2;
        if (player.position.y - eyeHeight <= platformTop + 0.5) {
          player.position.y = platformTop + eyeHeight;
          isJumping = false;
          jumpVelocity = 0;
          isFalling = false;
          currentPlatform = onPlatform;
          triggerPlatformLandingFeedback(onPlatform); // UX feedback
        }
      }
      // Land on floor if descending
      else if (onFloor && jumpVelocity <= 0) {
        const floorTop = 0;
        if (player.position.y - eyeHeight <= floorTop + 0.5) {
          player.position.y = floorTop + eyeHeight;
          isJumping = false;
          jumpVelocity = 0;
          isFalling = false;
          currentPlatform = null;
        }
      }
      // Start falling if descended past ground level
      else if (player.position.y - eyeHeight <= 0 && !onSolidGround) {
        isJumping = false;
        isFalling = true;
        fallVelocity = jumpVelocity;
      }
    } else if (isFalling) {
      player.position.y += fallVelocity * delta;
      fallVelocity += gravity * delta * 0.8;

      // Check if landed on platform mid-fall
      if (onPlatform) {
        const platformTop = onPlatform.position.y + ROOM8_CONFIG.platformHeight / 2;
        player.position.y = platformTop + eyeHeight;
        isFalling = false;
        fallVelocity = 0;
        currentPlatform = onPlatform;
        triggerPlatformLandingFeedback(onPlatform); // UX feedback
      }
      // Check if landed on floor mid-fall
      else if (onFloor) {
        player.position.y = eyeHeight;
        isFalling = false;
        fallVelocity = 0;
        currentPlatform = null;
      }
      // Respawn if fallen too far
      else if (player.position.y < -1.0) {
        respawnPlayer();
      }
    } else {
      // Ground state - standing on platform, floor, or falling
      if (onPlatform) {
        const platformTop = onPlatform.position.y + ROOM8_CONFIG.platformHeight / 2;
        player.position.y = platformTop + eyeHeight;
        currentPlatform = onPlatform;
      } else if (onFloor) {
        // Standing on floor - maintain height
        if (player.position.y < eyeHeight) {
          player.position.y = eyeHeight;
        }
        currentPlatform = null;
      } else {
        // Not on solid ground and not jumping - start falling
        if (player.position.y > 0.5) {
          isFalling = true;
          fallVelocity = 0;
        }
      }
    }

    // Horizontal movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Keep player inside shaft bounds (radial clamp)
    const maxRadius = ROOM8_CONFIG.baseRadius - 1.0;
    const distFromCenter = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
    if (distFromCenter > maxRadius) {
      const angle = Math.atan2(player.position.z, player.position.x);
      player.position.x = Math.cos(angle) * maxRadius;
      player.position.z = Math.sin(angle) * maxRadius;
    }

    // Ceiling clamp
    if (player.position.y > ROOM8_CONFIG.height - eyeHeight) {
      player.position.y = ROOM8_CONFIG.height - eyeHeight;
    }

    // Check portal proximity
    checkPortalProximity();
  }

  // Animate dust particles (Phase 6 - Atmospheric VFX)
  if (dustParticles) {
    const positions = dustParticles.particles.geometry.attributes.position.array;
    const velocities = dustParticles.velocities;
    
    for (let i = 0; i < velocities.length / 3; i++) {
      const idx = i * 3;
      
      // Apply velocity
      positions[idx] += velocities[idx];       // x
      positions[idx + 1] += velocities[idx + 1]; // y
      positions[idx + 2] += velocities[idx + 2]; // z
      
      // Reset particles that fall below floor
      if (positions[idx + 1] < 0) {
        // Respawn at random height near top
        positions[idx + 1] = ROOM8_CONFIG.height - 5 + Math.random() * 5;
        const y = positions[idx + 1];
        const spreadRadius = (ROOM8_CONFIG.height - y) * 0.15;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * spreadRadius;
        positions[idx] = Math.cos(angle) * dist;
        positions[idx + 2] = Math.sin(angle) * dist;
      }
    }
    
    dustParticles.particles.geometry.attributes.position.needsUpdate = true;
  }

  // Animate lamp orb flicker (subtle, architectural)
  if (ancientLamps.length > 0) {
    ancientLamps.forEach((lamp, index) => {
      const baseIntensity = ROOM8_CONFIG.lampOrbIntensity;
      // Unique flicker per lamp using index for phase offset
      const flicker = Math.sin(time * 8 + index * 2.1) * 0.08 + Math.cos(time * 17 + index * 3.7) * 0.08;
      lamp.orbLight.intensity = baseIntensity + flicker;
    });
  }

  // Animate portal
  animateLinkedPortal(portalToRoom5, portalGlow);

  renderer.render(scene, camera);
}

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
