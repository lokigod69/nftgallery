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
  platformCount: 8,   // 8 platforms: spawn + 6 moving + exit platform at top
  platformRadius: 1.8,          // Standard platform size (spiral platforms)
  platformSpawnRadius: 5.0,     // Larger spawn platform (Platform 0)
  platformExitRadius: 3.6,      // Exit platform (Platform 7) - double normal size
  platformHeight: 0.6,
  platformRadialPosition: 6.0,  // Distance from shaft center (0,0)
  platformAngularSpacing: 51.43, // Degrees between platforms (360°/7)
  
  // Player physics
  eyeHeight: 5.25,  // Elevated 50% for easier platform jumping (was 3.5)
  speed: 100.0,
  gravity: -30,
  jumpVelocity: 10,
  
  // Content
  nftCount: 48,           // 48 NFT images in Room8 folder (6 rings × 8)
  nftStartIndex: 1,       // Not used - loading by filename
  nftSize: 2.8,           // Increased 40% from 2.0 for better visibility
  
  // VFX
  enableDustParticles: true,
  dustParticleCount: 60,       // Reduced from 150 for performance
  platformLandingFeedback: true,
  
  // Ancient Lamps (Spiral Design - Between NFT rings)
  enableAncientLamps: true,
  lampCount: 10,                 // 2 per level × 5 levels
  lampRadiusPosition: 10.5,      // Distance from shaft center (near wall)
  lampOrbIntensity: 2.5,         // Tuned for balance
  lampOrbDistance: 8.0,          // Focused lighting

  // Spiral lamp positions (angle, Y height)
  // Placed BETWEEN NFT rings (Y: 6,14,22,30,38,46) and BETWEEN NFT angles
  // NFTs at 0°,45°,90°... so lamps at 22.5°,67.5°... (between them)
  // 2 lamps per level (180° apart), spiraling up with 45° shift per level
  lampPositions: [
    // Level 1: Y=10 (between NFT Y=6 and Y=14)
    { angle: 22.5,   y: 10 },
    { angle: 202.5,  y: 10 },
    // Level 2: Y=18 (between NFT Y=14 and Y=22) - shifted 45°
    { angle: 67.5,   y: 18 },
    { angle: 247.5,  y: 18 },
    // Level 3: Y=26 (between NFT Y=22 and Y=30) - shifted another 45°
    { angle: 112.5,  y: 26 },
    { angle: 292.5,  y: 26 },
    // Level 4: Y=34 (between NFT Y=30 and Y=38) - shifted another 45°
    { angle: 157.5,  y: 34 },
    { angle: 337.5,  y: 34 },
    // Level 5: Y=42 (between NFT Y=38 and Y=46) - shifted another 45°
    { angle: 202.5,  y: 42 },
    { angle: 22.5,   y: 42 }
  ],

  // Performance
  torchCount: 6,                 // 3 levels × 2 per level
  totalLights: 18                // ambient + 6 torches + 1 god ray + 10 lamp orbs
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

// Smooth landing system - prevents camera glitches when landing on moving platforms
let isLandingTransition = false;
let landingLerpFactor = 0;
const LANDING_LERP_SPEED = 12.0;  // How fast to blend to platform position

// Spawn on Platform 0 (static base platform at angle 0°, radial position 6.0)
// Platform 0 is at (0, 2.0, 6.0) in spiral layout
const spawnY = 2.0 + ROOM8_CONFIG.platformHeight / 2 + eyeHeight;
const spawnZ = ROOM8_CONFIG.platformRadialPosition; // Platform 0 at angle 0° (south)
const { scene, camera, renderer, controls } = initScene({
  spawnPosition: { x: 0, y: spawnY, z: spawnZ },
  background: 0x1a140f,  // Dark warm brown
  fog: { color: 0x2a1f15, near: 20, far: 65 }  // Extended fog for better NFT visibility
});

// ----------------------------------------------------------------------
// Lighting - Egyptian Torch/Brazier System
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xaa8844, 0.25);  // Slightly brighter
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

  // Scale factor - sized to fit in gaps between NFTs without overlapping
  const scale = 0.35;

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
// Procedural Hieroglyphic Texture Generation
// ----------------------------------------------------------------------

/**
 * Generate ancient Egyptian hieroglyphic texture procedurally
 * Creates authentic-looking tomb wall with glyphs, weathering, and depth
 */
function createHieroglyphicTexture() {
  const canvas = document.createElement('canvas');
  const size = 1024;  // High-res for quality
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base sandstone color with subtle variation
  const baseColor = '#c4a052';
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Add stone texture noise
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = 180 + Math.random() * 75;
    ctx.fillStyle = `rgba(${brightness}, ${brightness * 0.85}, ${brightness * 0.6}, ${0.15 + Math.random() * 0.2})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // Weathering cracks and aging
  ctx.strokeStyle = 'rgba(80, 60, 40, 0.3)';
  ctx.lineWidth = 0.5 + Math.random();
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    const startY = Math.random() * size;
    ctx.moveTo(0, startY);
    for (let x = 0; x < size; x += 20) {
      ctx.lineTo(x, startY + (Math.random() - 0.5) * 30);
    }
    ctx.stroke();
  }

  // Hieroglyphic symbol drawing functions
  const glyphColor = 'rgba(60, 45, 30, 0.7)';  // Dark carved color

  // Eye of Horus
  function drawEye(x, y, size) {
    ctx.strokeStyle = glyphColor;
    ctx.fillStyle = glyphColor;
    ctx.lineWidth = 2;

    // Almond eye shape
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Pupil
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye line extensions
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x + size * 1.3, y - size * 0.2);
    ctx.moveTo(x - size, y);
    ctx.lineTo(x - size * 1.2, y);
    ctx.stroke();
  }

  // Ankh (life symbol)
  function drawAnkh(x, y, size) {
    ctx.strokeStyle = glyphColor;
    ctx.lineWidth = 2.5;

    // Loop at top
    ctx.beginPath();
    ctx.arc(x, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    // Horizontal bar
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y + size * 0.3);
    ctx.lineTo(x + size * 0.5, y + size * 0.3);
    ctx.stroke();
  }

  // Scarab beetle
  function drawScarab(x, y, size) {
    ctx.fillStyle = glyphColor;

    // Body (oval)
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.4, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head (small circle)
    ctx.beginPath();
    ctx.arc(x, y - size * 0.5, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Legs (simplified lines)
    ctx.strokeStyle = glyphColor;
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.3, y + i * size * 0.2);
      ctx.lineTo(x - size * 0.6, y + i * size * 0.3);
      ctx.moveTo(x + size * 0.3, y + i * size * 0.2);
      ctx.lineTo(x + size * 0.6, y + i * size * 0.3);
      ctx.stroke();
    }
  }

  // Bird (falcon/ibis)
  function drawBird(x, y, size) {
    ctx.strokeStyle = glyphColor;
    ctx.fillStyle = glyphColor;
    ctx.lineWidth = 2;

    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.3, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.4, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.beginPath();
    ctx.moveTo(x - size * 0.35, y - size * 0.4);
    ctx.lineTo(x - size * 0.6, y - size * 0.3);
    ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y);
    ctx.lineTo(x + size * 0.7, y + size * 0.3);
    ctx.stroke();
  }

  // Wavy water lines
  function drawWater(x, y, size) {
    ctx.strokeStyle = glyphColor;
    ctx.lineWidth = 2;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - size * 0.5, y + i * size * 0.2);
      for (let dx = 0; dx < size; dx += size * 0.15) {
        const wave = Math.sin((dx / size) * Math.PI * 4) * size * 0.1;
        ctx.lineTo(x - size * 0.5 + dx, y + i * size * 0.2 + wave);
      }
      ctx.stroke();
    }
  }

  // Pyramid
  function drawPyramid(x, y, size) {
    ctx.strokeStyle = glyphColor;
    ctx.fillStyle = glyphColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);  // Top
    ctx.lineTo(x - size * 0.5, y + size * 0.3);  // Bottom left
    ctx.lineTo(x + size * 0.5, y + size * 0.3);  // Bottom right
    ctx.closePath();
    ctx.fill();

    // Center line
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x, y + size * 0.3);
    ctx.stroke();
  }

  // Sun disk
  function drawSun(x, y, size) {
    ctx.strokeStyle = glyphColor;
    ctx.fillStyle = glyphColor;
    ctx.lineWidth = 2;

    // Disk
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Rays
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      ctx.beginPath();
      const x1 = x + Math.cos(angle) * size * 0.5;
      const y1 = y + Math.sin(angle) * size * 0.5;
      const x2 = x + Math.cos(angle) * size * 0.8;
      const y2 = y + Math.sin(angle) * size * 0.8;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Staff/Was scepter
  function drawStaff(x, y, size) {
    ctx.strokeStyle = glyphColor;
    ctx.lineWidth = 2.5;

    // Main staff
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x, y + size * 0.6);
    ctx.stroke();

    // Fork at top
    ctx.beginPath();
    ctx.arc(x, y - size * 0.5, size * 0.2, 0, Math.PI, true);
    ctx.stroke();

    // Base
    ctx.beginPath();
    ctx.moveTo(x - size * 0.2, y + size * 0.6);
    ctx.lineTo(x + size * 0.2, y + size * 0.6);
    ctx.stroke();
  }

  const glyphFunctions = [drawEye, drawAnkh, drawScarab, drawBird, drawWater, drawPyramid, drawSun, drawStaff];

  // Draw hieroglyphs in horizontal bands (like tomb walls)
  // Reduced density for cleaner, less cluttered appearance
  const rows = 4;
  const glyphsPerRow = 5;
  const glyphSize = 45;  // Larger individual symbols
  const rowSpacing = size / rows;

  for (let row = 0; row < rows; row++) {
    const y = (row + 0.5) * rowSpacing;
    const colSpacing = size / glyphsPerRow;

    // Alternating row offset for authenticity
    const offset = (row % 2) * (colSpacing * 0.5);

    for (let col = 0; col < glyphsPerRow; col++) {
      const x = offset + (col + 0.5) * colSpacing;

      // Randomly select glyph
      const glyphFunc = glyphFunctions[Math.floor(Math.random() * glyphFunctions.length)];

      // Slightly randomize position and size for organic feel
      const jitterX = (Math.random() - 0.5) * 15;
      const jitterY = (Math.random() - 0.5) * 15;
      const sizeVar = glyphSize * (0.8 + Math.random() * 0.4);

      glyphFunc(x + jitterX, y + jitterY, sizeVar);
    }
  }

  // Add vertical cartouche-like dividers
  ctx.strokeStyle = 'rgba(80, 60, 40, 0.4)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const x = (size / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // Final aging overlay (reduced)
  ctx.fillStyle = 'rgba(100, 80, 60, 0.12)';
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Balanced repeat for proper aspect ratio on cylinder
  // Shaft: circumference ~75 units, height 50 units
  // 3 tiles around (25 units each) × 2 tiles up (25 units each) = square tiles
  texture.repeat.set(3, 2);

  console.log('✓ Generated procedural hieroglyphic texture (1024x1024, 3×2 tiling)');
  return texture;
}

// ----------------------------------------------------------------------
// Vertical Shaft Structure
// ----------------------------------------------------------------------
function createShaft() {
  const cfg = ROOM8_CONFIG;

  // Generate procedural hieroglyphic texture
  const hieroglyphicTexture = createHieroglyphicTexture();

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
    map: hieroglyphicTexture,  // Hieroglyphic wall art
    bumpMap: hieroglyphicTexture,  // Add depth to carvings
    bumpScale: 0.3,  // Subtle depth effect
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
  // Platform 6: Moving platform, anti-phase (Southwest, 308.57°)
  {
    angle: 308.57,
    baseY: 42.0,        // Range: 39.5 to 44.5
    amplitude: 2.5,     // When P5 peaks (37.5), P6 is low (39.5) → 2.0 gap
    speed: 1.0,
    phase: Math.PI
  },
  // Platform 7: Exit platform - STATIC, larger (South, 360°=0°, above P0)
  // Player stands here to access portal
  // P6 peaks at 44.5, P7 at 42.0 means player jumps DOWN to it (easy!)
  {
    angle: 0,           // Full circle back to start (directly above P0)
    baseY: 42.0,        // Same height as P6's base - jump down from P6's peak
    amplitude: 0,       // No motion - stable exit platform
    speed: 0,
    phase: 0
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
    // Platform sizes: P0 (spawn) = 5.0, P7 (exit) = 3.6, others = 1.8
    let radius = cfg.platformRadius;
    if (i === 0) radius = cfg.platformSpawnRadius;
    if (i === 7) radius = cfg.platformExitRadius;

    const platformGeometry = new THREE.CylinderGeometry(
      radius,
      radius,
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
    platform.userData.radius = radius;  // Store actual platform radius for collision detection

    scene.add(platform);
    platforms.push(platform);

    // Debug log for verification
    const isStatic = params.amplitude === 0;
    if (isStatic) {
      console.log(`Platform ${i}: angle=${params.angle.toFixed(1)}°, pos=(${x.toFixed(2)}, ${params.baseY}, ${z.toFixed(2)}), radius=${radius}, STATIC`);
    } else {
      console.log(`Platform ${i}: angle=${params.angle.toFixed(1)}°, pos=(${x.toFixed(2)}, ${params.baseY}±${params.amplitude}, ${z.toFixed(2)}), radius=${radius}, phase=${params.phase.toFixed(2)}`);
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

    // Use stored platform radius (Platform 0 is larger than others)
    const platformRadius = platform.userData.radius || cfg.platformRadius;

    const vertDist = Math.abs(feetY - platformTop);
    const hCheck = horizontalDist <= platformRadius + 0.2;  // More forgiving horizontal (was radius - 0.1)
    const vCheck = vertDist < 1.5;  // More forgiving vertical (was 1.0)

    // Debug Platform 0 and Platform 7 collisions
    if ((platform.userData.platformIndex === 0 || platform.userData.platformIndex === 7) && (hCheck || vCheck)) {
      console.log(`P${platform.userData.platformIndex} collision: hDist=${horizontalDist.toFixed(2)}, radius=${platformRadius}, vDist=${vertDist.toFixed(2)}, hCheck=${hCheck}, vCheck=${vCheck}`);
    }

    // Balanced tolerance - reliable collision without glitching
    // Horizontal: radius - 0.1, Vertical: ±1.0 (tight enough to prevent glitching, loose enough to catch fast falls)
    if (hCheck && vCheck) {
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
// Wall NFT System - Group-based approach for reliable orientation
// Each NFT is a child of a Group that rotates around the Y axis
// IMPORTANT: Must account for tapered cylinder (wall narrows at top)
// ----------------------------------------------------------------------

// Room 8 NFT files - 48 cinematic photographs
const room8NftFiles = [
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_00a5c654-5d7f-4c5a-9c7d-4bd5e276d027',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_0b33bfb9-53b5-48ac-8a5b-c730653099c6',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_0fa4ceb6-cf59-4b6b-a3ee-bdf52c11c615',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_100487d5-5647-4f1c-ad70-d8d043f9f76d',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_105b0630-c217-416d-a61f-8bc3c81cc8ec',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_31fb93bb-5ebe-4524-9cb4-0c9be9b7e9cd',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_3600b200-2f91-4f71-a7e0-fe0d7dc78a49',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_3a2d99a5-9a7a-4ed6-aa77-962d0b78a64a',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_3ce70c9a-91d7-412e-bcfe-248f79547b0c',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_4073fbe7-cee4-40e4-bb88-70a344e9c322',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_4091511a-3aba-4f10-bbbb-cc754e3a7e19',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_4cf13a40-933e-4e5b-a407-c9de02a677b7',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_531cd012-cac1-4617-961d-2e08585aeeeb',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_5b69ffa5-09e5-4dc7-a2f4-f3f7ee50333d',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_5b81084a-3977-478e-8b59-b93a50ecc5a4',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_5e171c24-3a90-4f6c-83c7-09c50233a24d',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_6031042c-e531-4472-9dba-1abda1d8c428',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_685ec5c5-242c-47db-9314-7bf878992d7a',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_7205f7cc-174a-468d-91c6-60c0a662c43d',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_75dea23e-48e5-4537-8bb6-b52fd3416440',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_7f67fb46-d396-4a5b-827c-57557e396c3d',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_8661906c-4fd5-4616-babd-bcc08764e292',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_87b1ca7d-450c-4067-b445-f20027211edc',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_8885cf72-67d2-49dc-9964-d9b5532485ef',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_8acb88b5-4926-4db6-a560-7abbc4c88da7',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_94877618-fc48-4c38-b809-686a76a4664d',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_9fdaf54f-ca10-4d93-af21-4d920906768e',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_a0dd37ed-9898-4981-8c58-dd9855901d8a',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_b0b72765-4ba6-4263-8348-1bb5cdb27245',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_b6093728-c0bc-4ae6-bc5c-d82b796a953b',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_b7415f6b-4fe8-4d00-b1bc-8d914d7252bd',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_b8e2ca39-0497-4c4a-80b7-8dff53788c83',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_b94cc53f-2686-4278-a11a-d467c5fd9429',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_bb9a4efc-3ee6-4e62-ac64-47ed27c150b4',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_c32252cf-a116-4677-845b-c5ec468d17bc',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_c4d7ae2e-4870-4be0-a5e1-f4a898342506',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_c8101667-2e22-4d80-a3b9-43fa4cbd8999',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_d479bc35-18ab-404b-86f7-aaea5add79b9',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_dc2942df-c691-4334-82d4-ceeff59453a2',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_e52099f7-49e5-48ae-a999-3303df0ec3d2',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_e92e9db1-e5cb-449c-9edc-cb1f4e53c0c8',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_ea48a5fc-7258-41f7-9f64-a8e75da2f032',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_ea4bcda4-c69b-4303-9e74-bf2ff8c5755e',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_fb12a165-83f2-40aa-b061-90c14bb12fae',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_fbdc547d-1e7f-43be-a1c6-bbbaec9a91cd',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_fbe633a3-b841-4b5c-ba7c-0d0eab4cfaad',
  'lokigod69._Cinematic_analog-style_photograph_with_warm_golden-h_fc5d1d0b-faed-41db-8e53-75f6ff622d7f',
  'lokigod69._Mixed-media_artwork_in_the_style_of_SN._The_base_is__916d2919-b572-42f8-b2e2-9b9fc6a8698b'
];

function createWallNFTs() {
  const cfg = ROOM8_CONFIG;
  const textureLoader = new THREE.TextureLoader();
  const nftGroups = [];

  // 6 rings × 8 NFTs = 48 total
  const ringHeights = [6, 14, 22, 30, 38, 46];
  const perRing = 8;
  const baseSize = cfg.nftSize; // Base dimension for scaling
  const shaftHeight = cfg.height;  // 50 units

  let count = 0;
  let loadedCount = 0;

  for (let r = 0; r < ringHeights.length; r++) {
    const h = ringHeights[r];

    // Calculate wall radius at this height (tapered cylinder!)
    // Linear interpolation: radius = baseRadius - (baseRadius - topRadius) * (h / shaftHeight)
    const wallRadius = cfg.baseRadius - (cfg.baseRadius - cfg.topRadius) * (h / shaftHeight);
    // Place NFTs 0.3 units inside the wall at this height
    const wallDist = wallRadius - 0.3;

    for (let s = 0; s < perRing; s++) {
      const angle = (s / perRing) * Math.PI * 2;  // Angle around circle
      const filename = room8NftFiles[count];
      const nftUrl = `/assets/Room8/${filename}.png`;

      // Create a pivot group at the center
      const pivot = new THREE.Group();
      pivot.position.set(0, h, 0);  // Position at ring height
      pivot.rotation.y = angle;     // Rotate to slot position

      // Create placeholder plane (will be updated with correct aspect ratio)
      const placeholderMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
      });

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(baseSize, baseSize),
        placeholderMat
      );

      // Position plane at wall distance for THIS height, facing center
      plane.position.set(0, 0, -wallDist);

      pivot.add(plane);
      scene.add(pivot);
      nftGroups.push(pivot);

      // Load actual image to get dimensions, then update geometry with correct aspect ratio
      const img = new Image();
      img.onload = function() {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const aspectRatio = imgWidth / imgHeight;

        // Calculate plane dimensions preserving aspect ratio
        let planeWidth, planeHeight;
        if (aspectRatio >= 1) {
          // Landscape or square
          planeWidth = baseSize;
          planeHeight = baseSize / aspectRatio;
        } else {
          // Portrait (vertical) - these images
          planeWidth = baseSize * aspectRatio;
          planeHeight = baseSize;
        }

        // Update geometry with correct aspect ratio
        plane.geometry.dispose();
        plane.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

        // Load texture
        textureLoader.load(
          nftUrl,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;

            plane.material.dispose();
            plane.material = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide,
              toneMapped: false
            });

            loadedCount++;
            if (loadedCount === 48) {
              console.log(`✓ All 48 Room8 NFT textures loaded with original aspect ratios`);
            }
          },
          undefined,
          (error) => {
            console.warn(`⚠ Room8 NFT ${filename} failed to load texture`);
          }
        );
      };
      img.onerror = function() {
        console.warn(`⚠ Could not load image dimensions for ${filename}`);
      };
      img.src = nftUrl;

      count++;
    }

    console.log(`Ring ${r + 1}/6 at Y=${h}: ${perRing} NFTs (wallRadius=${wallRadius.toFixed(2)}, dist=${wallDist.toFixed(2)})`);
  }

  console.log(`✓ Total: ${count} NFT placeholders created, loading textures with aspect ratio preservation...`);
  return nftGroups;
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
// Portal to Room 9 (Archive Spiral) - Forward portal at top
// ----------------------------------------------------------------------
// Portal positioned ON Platform 7 (the exit platform)
// Platform 7 center is at (0, 42.0, 6), radius 3.6
// Player on P7: feet at ~42.5, eyes at ~45 - portal at standing height
const portalY = 44.5;  // Comfortable walk-through height on P7 (standing eye level)
const portalZ = 6.0;   // Center of Platform 7
const portal9Obj = createLinkedPortal({
  scene,
  fromRoom: '8',
  toRoom: '9',
  x: 0,
  y: portalY,
  z: portalZ,
  rotationY: 0,  // Face toward approaching player (from center toward platform)
  createLabel: true
});

const portalToRoom9 = portal9Obj.portal;
const portal9Glow = portal9Obj.glow;

// ----------------------------------------------------------------------
// Portal to Room 7 (Helix Crossing) - Back portal at spawn
// ----------------------------------------------------------------------
// Portal positioned BEHIND spawn platform (Platform 0 at angle 0° = south)
// Spawn is at (0, spawnY, 6.0), portal behind at z = 10
const portal7Obj = createLinkedPortal({
  scene,
  fromRoom: '8',
  toRoom: '7',
  x: 0,
  y: spawnY,
  z: spawnZ + 4,  // Behind spawn platform
  rotationY: Math.PI,  // Face -Z (toward player at spawn)
  createLabel: true
});

const portalToRoom7 = portal7Obj.portal;
const portal7Glow = portal7Obj.glow;

const checkPortalProximity = createMultiPortalChecker({
  camera: controls.getObject(),  // Use player position like Room 6
  portals: [
    {
      position: new THREE.Vector3(0, portalY, portalZ),
      name: 'Archive Spiral (Room 9)',
      url: 'room9.html',
      showDistance: 4.0,
      triggerDistance: 2.5
    },
    {
      position: new THREE.Vector3(0, spawnY, spawnZ + 4),
      name: 'Helix Crossing (Room 7)',
      url: 'room7.html',
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
      if (!isJumping) {
        jumpVelocity = 10;
        isJumping = true;
        isLandingTransition = false;  // Reset landing state when jumping
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

    // CRITICAL: Hard floor constraint for ALL platforms
    // Check this FIRST, before any physics - prevents any clipping through platforms
    if (onPlatform) {
      const platformTop = onPlatform.position.y + ROOM8_CONFIG.platformHeight / 2;
      const minPlayerY = platformTop + eyeHeight;

      // If player is below platform surface they're standing on, snap them up
      if (player.position.y < minPlayerY) {
        player.position.y = minPlayerY;
        // Also reset vertical velocity if falling through
        if (isFalling) {
          isFalling = false;
          fallVelocity = 0;
        }
        if (isJumping && jumpVelocity < 0) {
          isJumping = false;
          jumpVelocity = 0;
        }
      }
    }

    // Vertical physics - platform and floor collision
    if (isJumping) {
      player.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;

      // Land on platform if we're on one
      if (onPlatform && jumpVelocity <= 0) {
        const platformTop = onPlatform.position.y + ROOM8_CONFIG.platformHeight / 2;
        if (player.position.y - eyeHeight <= platformTop + 0.5) {
          // Start smooth landing transition instead of hard snap
          isJumping = false;
          jumpVelocity = 0;
          isFalling = false;
          currentPlatform = onPlatform;
          isLandingTransition = true;
          landingLerpFactor = 0;
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
        // Start smooth landing transition instead of hard snap
        isFalling = false;
        fallVelocity = 0;
        currentPlatform = onPlatform;
        isLandingTransition = true;
        landingLerpFactor = 0;
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
        const targetY = platformTop + eyeHeight;

        // CRITICAL: Hard floor constraint - NEVER allow player below platform surface
        // This prevents falling through platforms regardless of physics state
        if (player.position.y < targetY) {
          player.position.y = targetY;
        }

        // Smooth landing transition - lerp to platform position
        if (isLandingTransition) {
          landingLerpFactor += LANDING_LERP_SPEED * delta;
          if (landingLerpFactor >= 1.0) {
            landingLerpFactor = 1.0;
            isLandingTransition = false;
          }
          // Smooth blend from current position to target
          player.position.y = player.position.y + (targetY - player.position.y) * Math.min(landingLerpFactor, 1.0);
        } else {
          // Already settled - lock to platform position (no lerp drift)
          // Hard lock prevents any drift below platform
          player.position.y = targetY;
        }
        currentPlatform = onPlatform;
      } else if (onFloor) {
        // Standing on floor - maintain height
        if (player.position.y < eyeHeight) {
          player.position.y = eyeHeight;
        }
        currentPlatform = null;
        isLandingTransition = false;
      } else {
        // Not on solid ground and not jumping - start falling
        if (player.position.y > 0.5) {
          isFalling = true;
          fallVelocity = 0;
          isLandingTransition = false;
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

  // Animate portals
  animateLinkedPortal(portalToRoom9, portal9Glow);
  animateLinkedPortal(portalToRoom7, portal7Glow);

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
