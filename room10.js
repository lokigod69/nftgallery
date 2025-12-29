import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { createLinkedPortal, animateLinkedPortal, createMultiPortalChecker } from './src/core/portal-utils.js';
import { getRoomXNftUrl } from './src/core/asset-utils.js';

// Room X: "The Ascent" (Challenge Arena)
// Concept: Legendary challenge room - climb to escape
// Tone: Epic, vast, mysterious
// Challenge: Vertical jump puzzle through floating platforms

// ----------------------------------------------------------------------
// Tunable Jump Mechanics
// ----------------------------------------------------------------------
const PLAYER_HEIGHT = 2.5;           // Eye height / spawn height
const WALK_SPEED = 7.5;              // Ground movement speed (units/sec) - responsive but controlled
const AIR_CONTROL_FACTOR = 0.6;      // 0-1: how much control you have in midair (0.6 = noticeable)
const JUMP_VELOCITY = 18.0;          // Initial upward velocity (buffed for human playability)
const GRAVITY = -24.0;               // Downward acceleration
const JUMP_HEIGHT = 6.75;            // Max jump height: v²/(2|g|) = 18²/48 = 6.75 units
const MAX_HORIZONTAL_JUMP_DISTANCE = 8.0; // Max horizontal distance player can jump

// Global safety constraints - NO jump should use >60% of max capacity
const MAX_VERTICAL_STEP = JUMP_HEIGHT * 0.6;     // 4.05 units (60% of 6.75)
const MAX_HORIZONTAL_DIST = 8.0;                  // Safe horizontal distance for all jumps
const MAX_VERTICAL_STEP_EASY = JUMP_HEIGHT * 0.4; // 2.7 units (40% for first 5 platforms)

// ----------------------------------------------------------------------
// Arena Parameters
// ----------------------------------------------------------------------
const SPHERE_RADIUS = 70;            // Giant hollow sphere
const PLATFORM_COUNT = 28;           // Number of platforms in the ascent
const PLATFORM_SIZE = 2.5;           // Platform width/depth
const SPIRAL_ROTATIONS = 3.5;        // Number of full rotations around sphere
const VERTICAL_CLIMB_HEIGHT = SPHERE_RADIUS * 1.6; // Total vertical distance to climb
const STARTING_PLATFORM_RADIUS = 50; // Shared radius for ground hive platform
const HIVE_TILE_RADIUS = 1.35;

// ----------------------------------------------------------------------
// Sphere Chain Parameters
// ----------------------------------------------------------------------
const SPHERE_CHAIN_RADIUS = 1.2;     // Sphere radius (room-scale, platforms are 2.5)
const SPHERE_CHAIN_COUNT = Math.ceil(PLATFORM_COUNT / 2); // One sphere per two platforms = 14 spheres
const HDRI_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/shanghai_bund_1k.hdr';

// ----------------------------------------------------------------------
// Movement State - SIMPLIFIED
// ----------------------------------------------------------------------
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false; // Simple grounding flag
const velocity = new THREE.Vector3(); // Persistent velocity vector

// ----------------------------------------------------------------------
// Hive Tile Arrays (declared early for use in createHexagonalNFTGrid)
// ----------------------------------------------------------------------
const hiveTileMeshes = [];
const hiveTileData = [];

// ----------------------------------------------------------------------
// Last safe grounded position (for respawn)
// ----------------------------------------------------------------------
const lastSafePosition = new THREE.Vector3(0, 0, 0);
// ----------------------------------------------------------------------
// NFT Texture Constants (declared early for use in functions)
// ----------------------------------------------------------------------
const ROOMX_TEXTURE_COUNT = 50; // Maximum number of NFT images available

// ----------------------------------------------------------------------
// Scene Setup
// ----------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000510); // Deep space blue-black
scene.fog = new THREE.Fog(0x000510, 30, SPHERE_RADIUS * 0.9);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Important for HDR environment maps and realistic reflections
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

// CRITICAL: Camera must be at (0,0,0) local position within yaw object
// Otherwise rotating the camera causes it to orbit instead of rotate in place
camera.position.set(0, 0, 0);

// Spawn position will be set after starting platform is created
// (see after scene element creation)

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
// Lighting - Epic atmospheric lighting
// ----------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x3357d6, 0.65);
scene.add(ambientLight);

// Dramatic directional lights from above
const topLight = new THREE.DirectionalLight(0x8ab2ff, 0.85);
topLight.position.set(0, SPHERE_RADIUS, 0);
scene.add(topLight);

const sideLight1 = new THREE.DirectionalLight(0xff8844, 0.3);
sideLight1.position.set(SPHERE_RADIUS * 0.5, SPHERE_RADIUS * 0.3, 0);
scene.add(sideLight1);

const sideLight2 = new THREE.DirectionalLight(0x44ff88, 0.3);
sideLight2.position.set(-SPHERE_RADIUS * 0.5, SPHERE_RADIUS * 0.3, 0);
scene.add(sideLight2);

// Point light at spawn point
const spawnLight = new THREE.PointLight(0x66aaff, 1.0, 30);
spawnLight.position.set(0, -SPHERE_RADIUS + 10, 0);
scene.add(spawnLight);

// Point light at top (portal area)
const goalLight = new THREE.PointLight(0xffbb88, 1.9, 50);
goalLight.position.set(0, SPHERE_RADIUS - 15, 0);
scene.add(goalLight);

// ----------------------------------------------------------------------
// Create Hollow Sphere
// ----------------------------------------------------------------------
function createHollowSphere() {
  const sphereGeometry = new THREE.SphereGeometry(
    SPHERE_RADIUS,
    64,
    64,
    0,
    Math.PI * 2,
    0,
    Math.PI
  );

  // Starfield-like material with subtle gradient
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a20,
    metalness: 0.3,
    roughness: 0.7,
    side: THREE.BackSide,
    flatShading: false
  });

  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(sphere);

  // Add subtle star particles
  const starCount = 800;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = SPHERE_RADIUS * 0.98;

    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    transparent: true,
    opacity: 0.8
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  return { sphere, stars };
}

// ----------------------------------------------------------------------
// Canvas Wrap UV Mapping for Platform Sides (no caps)
// ----------------------------------------------------------------------
/**
 * Adjust CylinderGeometry UVs for a subtle \"canvas wrap\" effect on the
 * side faces only. This function assumes the geometry is openEnded=true,
 * so it only contains side vertices (no top/bottom caps).
 *
 * We remap the U coordinate so the texture samples mainly from the left
 * and right edges of the image, similar to how a printed canvas wraps
 * around its sides. V (vertical) coordinates remain unchanged.
 *
 * @param {THREE.CylinderGeometry} geometry - Platform cylinder geometry
 */
function applyCanvasWrapUVs(geometry) {
  const uvAttribute = geometry.attributes.uv;
  if (!uvAttribute) return;

  const uvArray = uvAttribute.array;

  // Edge strip widths for sampling from texture edges
  const edgeWidth = 0.12;          // 12% of texture width on each side
  const leftEdgeEnd = edgeWidth;   // 0.0 → 0.12
  const rightEdgeStart = 1.0 - edgeWidth; // 0.88 → 1.0

  for (let i = 0; i < uvArray.length; i += 2) {
    let originalU = uvArray[i];

    // Normalize U to [0, 1]
    originalU = Math.max(0, Math.min(1, originalU));

    let mappedU;
    if (originalU < 0.5) {
      // First half of circumference → left edge strip
      const t = originalU / 0.5; // [0, 1]
      mappedU = t * leftEdgeEnd;
    } else {
      // Second half → right edge strip
      const t = (originalU - 0.5) / 0.5; // [0, 1]
      mappedU = rightEdgeStart + (t * edgeWidth);
    }

    uvArray[i] = Math.max(0, Math.min(1, mappedU));
    // V coordinate (uvArray[i + 1]) is left untouched
  }

  uvAttribute.needsUpdate = true;
}

// ----------------------------------------------------------------------
// Generate Spiral Platform Path
// ----------------------------------------------------------------------
function generatePlatforms() {
  const platforms = [];
  const platformMeshes = [];

  // Shared planar hex geometry for NFT top/bottom surfaces
  // Slightly smaller than cylinder so NFT print sits just inside the hex frame
  const hexRadius = PLATFORM_SIZE * 0.985;
  const hexTopGeometry = new THREE.CircleGeometry(hexRadius, 6);
  // Nudge orientation so hex edges line up nicely with cylinder sides
  hexTopGeometry.rotateZ(Math.PI / 6);

  // Starting platform is at (-SPHERE_RADIUS + 8), top surface at +0.5 = -61.5
  // First floating platform should be ABOVE that, not below!
  const startingPlatformTop = -SPHERE_RADIUS + 8 + 0.5;
  const startY = startingPlatformTop + 2.5; // First platform 2.5 units above spawn floor
  const endY = startY + VERTICAL_CLIMB_HEIGHT;

  for (let i = 0; i < PLATFORM_COUNT; i++) {
    const progress = i / (PLATFORM_COUNT - 1);

    // Vertical position - gradual climb with EASIER EARLY SECTION
    let y = startY + progress * VERTICAL_CLIMB_HEIGHT;

    // Make first 5 platforms much easier (flatter curve)
    if (i < 5) {
      // Early platforms: reduce vertical spacing by ~40%
      const earlyProgress = i / 4; // 0 to 1 over first 5 platforms
      const easierVerticalGain = VERTICAL_CLIMB_HEIGHT * 0.15; // Only climb 15% of total height in first 5
      y = startY + earlyProgress * easierVerticalGain;
    }

    // Spiral angle around sphere
    const angle = progress * SPIRAL_ROTATIONS * Math.PI * 2;

    // Horizontal distance from center - REDUCE for early platforms
    let radiusOffset = 15 - progress * 8; // Start far, end closer to center
    if (i < 5) {
      // Early platforms: keep them closer (easier horizontal jumps)
      radiusOffset = 12 - i * 0.8; // Gentler horizontal spacing
    }

    let x = Math.cos(angle) * radiusOffset;
    let z = Math.sin(angle) * radiusOffset;

    // ENFORCE GLOBAL SAFETY CONSTRAINTS
    // No jump should require >60% of max jump capacity (40% for first 5)
    if (i > 0) {
      const prevPlatform = platforms[i - 1];
      const verticalDelta = y - prevPlatform.position.y;
      const dx = x - prevPlatform.position.x;
      const dz = z - prevPlatform.position.z;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      // Apply vertical constraint (stricter for first 5 platforms)
      const maxVertical = (i < 5) ? MAX_VERTICAL_STEP_EASY : MAX_VERTICAL_STEP;
      if (verticalDelta > maxVertical) {
        y = prevPlatform.position.y + maxVertical * 0.8; // 80% for safety margin
      }

      // Apply horizontal constraint
      if (horizontalDist > MAX_HORIZONTAL_DIST) {
        const scale = (MAX_HORIZONTAL_DIST * 0.8) / horizontalDist; // 80% for safety margin
        x = prevPlatform.position.x + (dx * scale);
        z = prevPlatform.position.z + (dz * scale);
      }
    }

    // Platform geometry - hexagonal for visual interest
    const platformGeometry = new THREE.CylinderGeometry(
      PLATFORM_SIZE,
      PLATFORM_SIZE,
      0.4,
      6,
      1,
      true // openEnded: sides only, no caps
    );

    // Apply canvas wrap UV mapping for side faces only
    applyCanvasWrapUVs(platformGeometry);

    // Color gradient - cooler colors at bottom, warmer at top
    const hue = 210 - progress * 60; // Blue to orange
    const saturation = 70 + progress * 20;
    const lightness = 40 + progress * 20;

    // Side material with subtle glow; NFT will be placed on separate top/bottom meshes
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100),
      metalness: 0.6,
      roughness: 0.3,
      emissive: new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 200),
      emissiveIntensity: 0.3
    });

    // Base platform mesh: sides only
    const platform = new THREE.Mesh(platformGeometry, sideMaterial);
    platform.position.set(x, y, z);

    // Slight random rotation for organic feel
    platform.rotation.y = Math.random() * Math.PI * 2;

    // Separate hex mesh for clean, planar NFT display (double-sided)
    const topMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,   // visible from above and below
      toneMapped: false,
      transparent: false
    });
    const nftMesh = new THREE.Mesh(hexTopGeometry, topMaterial);
    // Slightly above cylinder top to avoid z-fighting
    nftMesh.position.set(0, 0.2 + 0.01, 0);
    // Rotate so plane faces up (+Y); double-sided covers bottom view as well
    nftMesh.rotation.x = Math.PI / 2;
    platform.add(nftMesh);

    // Store reference so textures can be applied later
    platform.userData.nftMesh = nftMesh;

    scene.add(platform);
    platformMeshes.push(platform);

    // Store platform data for collision detection
    platforms.push({
      position: new THREE.Vector3(x, y, z),
      radius: PLATFORM_SIZE,
      mesh: platform,
      index: i
    });

    // Add a subtle glow point light to each platform
    if (i % 3 === 0) {
      const platformLight = new THREE.PointLight(
        new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100),
        0.5,
        10
      );
      platformLight.position.set(x, y + 1, z);
      scene.add(platformLight);
    }
  }

  return { platforms, platformMeshes };
}

// ----------------------------------------------------------------------
// Create Exit Platform (Final platform at the top of the spiral)
// ----------------------------------------------------------------------
const EXIT_PLATFORM_SIZE = 6.0;  // Larger than regular platforms (2.5)

function createExitPlatform(platforms) {
  // Calculate position continuing the spiral from the last platform
  const lastPlatform = platforms[platforms.length - 1];

  // Continue the spiral one more step
  const progress = 1.0 + (1 / (PLATFORM_COUNT - 1));  // One step beyond the end
  const angle = progress * SPIRAL_ROTATIONS * Math.PI * 2;
  const radiusOffset = 15 - progress * 8;  // Continue the same spiral pattern

  // Position slightly above and continuing the spiral
  const x = Math.cos(angle) * radiusOffset;
  const z = Math.sin(angle) * radiusOffset;
  const y = lastPlatform.position.y + MAX_VERTICAL_STEP * 0.7;  // Reasonable jump from last platform

  // Create larger hexagonal exit platform
  const geometry = new THREE.CylinderGeometry(EXIT_PLATFORM_SIZE, EXIT_PLATFORM_SIZE, 0.6, 6);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffaa00,  // Gold color matching Levels path theme
    metalness: 0.6,
    roughness: 0.3,
    emissive: 0xff8800,
    emissiveIntensity: 0.4
  });

  const platform = new THREE.Mesh(geometry, material);
  platform.position.set(x, y, z);
  scene.add(platform);

  // Add a glowing rim
  const rimGeometry = new THREE.TorusGeometry(EXIT_PLATFORM_SIZE, 0.3, 8, 6);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.8
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.position.set(x, y + 0.3, z);
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);

  // Add bright point light
  const light = new THREE.PointLight(0xffaa00, 2, 20);
  light.position.set(x, y + 3, z);
  scene.add(light);

  // Add to platforms array for collision detection
  platforms.push({
    position: new THREE.Vector3(x, y, z),
    radius: EXIT_PLATFORM_SIZE,
    mesh: platform,
    index: PLATFORM_COUNT  // Exit platform index
  });

  console.log(`Exit platform created at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);

  return { x, y, z };
}

// ----------------------------------------------------------------------
// Create Portal at Top - Returns to Ocean Hub (Room 0)
// ----------------------------------------------------------------------
function createTopPortal(exitPlatformPos) {
  // Portal positioned on the exit platform
  const portalY = exitPlatformPos.y + PLAYER_HEIGHT;  // Eye level above platform

  const portalObj = createLinkedPortal({
    scene,
    fromRoom: '10',
    toRoom: '0',
    x: exitPlatformPos.x,
    y: portalY,
    z: exitPlatformPos.z,
    rotationY: 0,
    createLabel: true
  });

  // Add a floating "COMPLETE!" text above portal
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 512;
  textCanvas.height = 128;
  const textCtx = textCanvas.getContext('2d');
  textCtx.fillStyle = '#ffaa00';  // Gold color to match Levels path theme
  textCtx.font = 'bold 80px Arial';
  textCtx.textAlign = 'center';
  textCtx.fillText('COMPLETE!', 256, 90);

  const textTexture = new THREE.CanvasTexture(textCanvas);
  const textMaterial = new THREE.SpriteMaterial({
    map: textTexture,
    transparent: true,
    opacity: 0.9
  });

  const textSprite = new THREE.Sprite(textMaterial);
  textSprite.scale.set(10, 2.5, 1);
  textSprite.position.set(exitPlatformPos.x, portalY + 4, exitPlatformPos.z);
  scene.add(textSprite);

  return { portal: portalObj.portal, glow: portalObj.glow, textSprite, portalY, position: exitPlatformPos };
}

// ----------------------------------------------------------------------
// Create Starting Platform (Hexagonal Floor with NFT Grid)
// ----------------------------------------------------------------------
function createStartingPlatform() {
  const platformRadius = STARTING_PLATFORM_RADIUS; // Large hexagonal platform
  const platformY = -SPHERE_RADIUS + 8; // 8 units from bottom of sphere

  // Create hexagonal platform (6 segments = hexagon)
  const geometry = new THREE.CylinderGeometry(platformRadius, platformRadius, 1, 6);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1a2a,
    metalness: 0.3,
    roughness: 0.8,
    emissive: 0x0a0a15,
    emissiveIntensity: 0.2
  });

  const platform = new THREE.Mesh(geometry, material);
  platform.position.set(0, platformY, 0);
  scene.add(platform);

  // Add a glowing rim for visibility (hexagonal torus)
  const rimGeometry = new THREE.TorusGeometry(platformRadius, 0.5, 8, 6);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x4466ff,
    emissive: 0x4466ff,
    emissiveIntensity: 0.6
  });

  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.position.set(0, platformY + 0.5, 0);
  rim.rotation.x = Math.PI / 2;
  scene.add(rim);

  return {
    platform,
    rim,
    y: platformY + 0.5, // Top surface Y position
    radius: platformRadius
  };
}

/**
 * Create hexagonal grid of NFT tiles on starting platform
 * Arranges NFTs in a hexagonal pattern, blurred and semi-transparent
 */
function createHexagonalNFTGrid() {
  const platformY = -SPHERE_RADIUS + 8 + 0.5; // Top surface of platform
  const tileRadius = HIVE_TILE_RADIUS;
  const tileHeight = 0.12;
  const gridRings = 4; // Compact honeycomb
  const nftTiles = [];

  const hexToWorld = (q, r) => {
    // Flat-top aligned hex coordinate conversion
    const x = tileRadius * 1.5 * q;
    const z = tileRadius * Math.sqrt(3) * (r + q / 2);
    return { x, z };
  };

  const positions = [];
  for (let q = -gridRings; q <= gridRings; q++) {
    const r1 = Math.max(-gridRings, -q - gridRings);
    const r2 = Math.min(gridRings, -q + gridRings);
    for (let r = r1; r <= r2; r++) {
      const { x, z } = hexToWorld(q, r);
      const dist = Math.sqrt(x * x + z * z);
      if (dist > STARTING_PLATFORM_RADIUS - tileRadius * 1.6) continue;
      if (Math.abs(x) < 0.1 && Math.abs(z) < 0.1) continue; // keep spawn area clear
      positions.push({ x, z });
    }
  }

  // Create distribution pattern using NFTs 1-28 only
  // Pattern: Start with 7 uses, decrease gradually
  // Calculate how many tiles we have
  const totalTiles = positions.length;
  
  // Create distribution: NFT 1 gets most uses, decreasing pattern
  // Start with 7 uses for NFT 1, then decrease
  const maxUses = 7;
  const availableNFTs = 28; // Only use NFTs 1-28
  const distribution = [];
  
  // Calculate distribution pattern
  let remainingTiles = totalTiles;
  for (let nftId = 1; nftId <= availableNFTs && remainingTiles > 0; nftId++) {
    const uses = Math.min(maxUses - (nftId - 1), remainingTiles);
    if (uses > 0) {
      for (let u = 0; u < uses; u++) {
        distribution.push(nftId);
      }
      remainingTiles -= uses;
    }
  }
  
  // Fill remaining with last NFT if needed
  while (remainingTiles > 0) {
    distribution.push(availableNFTs);
    remainingTiles--;
  }
  
  // Shuffle distribution to space out duplicates
  // Fisher-Yates shuffle
  for (let i = distribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
  }

  const loader = new THREE.TextureLoader();

  positions.forEach(({ x, z }, index) => {
    const nftId = distribution[index] || 1; // Fallback to 1 if somehow out of range
    const url = getRoomXNftUrl(nftId);
    const currentIndex = nftId;

    const tileGeometry = new THREE.CylinderGeometry(
      tileRadius,
      tileRadius,
      tileHeight,
      6
    );
    tileGeometry.rotateY(Math.PI / 6); // Align flat sides

    const placeholderMaterial = new THREE.MeshStandardMaterial({
      color: 0x232630,
      transparent: true,
      opacity: 0.25,
      metalness: 0.05,
      roughness: 0.95,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const tile = new THREE.Mesh(tileGeometry, placeholderMaterial);
    tile.position.set(x, platformY + tileHeight * 0.5, z);
    tile.userData.nftIndex = currentIndex;
    scene.add(tile);
    nftTiles.push(tile);
    hiveTileMeshes.push(tile);
    hiveTileData.push({
      position: new THREE.Vector3(x, platformY),
      radius: tileRadius,
      topY: platformY + tileHeight,
      mesh: tile
    });

    loader.load(
      url,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;

        // Downscale to ultra-low resolution for pixelated preview
        const pixelSize = 24;
        const buffer = document.createElement('canvas');
        buffer.width = pixelSize;
        buffer.height = pixelSize;
        const ctx = buffer.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(loadedTexture.image, 0, 0, pixelSize, pixelSize);

        const pixelTexture = new THREE.CanvasTexture(buffer);
        pixelTexture.colorSpace = THREE.SRGBColorSpace;
        pixelTexture.wrapS = THREE.ClampToEdgeWrapping;
        pixelTexture.wrapT = THREE.ClampToEdgeWrapping;
        pixelTexture.minFilter = THREE.NearestFilter;
        pixelTexture.magFilter = THREE.NearestFilter;
        pixelTexture.anisotropy = 1;

        const blurredMaterial = new THREE.MeshStandardMaterial({
          map: pixelTexture,
          color: 0xffffff,
          metalness: 0.02,
          roughness: 0.98,
          transparent: true,
          opacity: 0.52,
          emissive: 0x141c28,
          emissiveIntensity: 0.45,
          depthWrite: false,
          side: THREE.DoubleSide
        });

        const targetTile = nftTiles.find((t) => t.userData.nftIndex === currentIndex);
        if (targetTile) {
          targetTile.material = blurredMaterial;
          targetTile.material.needsUpdate = true;
        }
      },
      undefined,
      (err) => {
        console.warn(`Room X: Failed to load NFT texture ${url} for grid tile`, err);
      }
    );
  });

  console.log(`Room X: Created ${nftTiles.length} blurred NFT tiles in hexagonal grid`);
  return nftTiles;
}

// ----------------------------------------------------------------------
// Sphere Chain System
// ----------------------------------------------------------------------
let sphereChain = [];
let sphereChainData = []; // Store sphere data for collision detection
let hdriEnvironment = null;

/**
 * Create chain of reflective spheres along center axis
 * One sphere for every two platforms, positioned between platform pairs
 * @param {number} startY - Starting Y position of platforms
 * @param {number} endY - Ending Y position of platforms
 */
function createSphereChain(startY, endY) {
  const platformHeightRange = endY - startY;
  const sphereSpacing = platformHeightRange / PLATFORM_COUNT;

  // Create default material for spheres (will be updated by GUI)
  // Perfect mirror settings: metalness 1.0, roughness 0.0
  const defaultMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1.0,        // Fully metallic = mirror
    roughness: 0.0,        // 0 = perfect mirror, 1 = matte
    ior: 1.5,
    transmission: 0,
    thickness: 0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    envMapIntensity: 1.0,
    envMap: null           // Will be set when HDRI loads
  });

  // Create sphere geometry (reuse for performance)
  const sphereGeometry = new THREE.SphereGeometry(SPHERE_CHAIN_RADIUS, 64, 64);

  for (let i = 0; i < SPHERE_CHAIN_COUNT; i++) {
    // Position between platform pairs: after platform (i*2) and before (i*2+1)
    const platformIndex = i * 2;
    const yPosition = startY + (platformIndex + 1) * sphereSpacing;

    // Create sphere mesh
    const material = defaultMaterial.clone(); // Clone for individual control
    const sphere = new THREE.Mesh(sphereGeometry, material);
    sphere.position.set(0, yPosition, 0); // Center axis (x=0, z=0)
    sphere.castShadow = true;
    sphere.receiveShadow = true;

    scene.add(sphere);
    sphereChain.push(sphere);

    // Store sphere data for collision detection
    sphereChainData.push({
      position: new THREE.Vector3(0, yPosition, 0),
      radius: SPHERE_CHAIN_RADIUS,
      mesh: sphere,
      index: i
    });
  }

  return { spheres: sphereChain, data: sphereChainData };
}

/**
 * Load HDRI environment map for sphere reflections
 * This creates a mirror-like reflection environment
 * Uses HDRI texture directly (compatible with all Three.js versions)
 */
function loadHDRIEnvironment() {
  const loader = new RGBELoader();
  loader.load(
    HDRI_URL,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      
      // Set as scene environment - this is crucial for reflections
      // The HDRI texture works directly as an environment map
      scene.environment = texture;
      hdriEnvironment = texture;

      // Update all sphere materials with environment map
      // Ensure they have proper mirror-like settings
      sphereChain.forEach(sphere => {
        if (sphere.material) {
          sphere.material.envMap = texture;
          sphere.material.metalness = 1.0; // Fully metallic for mirror
          sphere.material.roughness = 0.0; // Perfect mirror (0 = mirror, 1 = matte)
          sphere.material.envMapIntensity = 1.0;
          sphere.material.needsUpdate = true;
        }
      });

      console.log('Room X: HDRI environment map loaded - spheres now have mirror reflections');
    },
    undefined,
    (err) => {
      console.warn('Room X: Failed to load HDRI environment map', err);
      // Fallback: try to use scene environment if available
      if (scene.environment) {
        sphereChain.forEach(sphere => {
          if (sphere.material) {
            sphere.material.envMap = scene.environment;
            sphere.material.needsUpdate = true;
          }
        });
      }
    }
  );
}

// ----------------------------------------------------------------------
// Create Scene Elements
// ----------------------------------------------------------------------
const { sphere, stars } = createHollowSphere();
const startingPlatform = createStartingPlatform();
const nftGridTiles = createHexagonalNFTGrid(); // Create hexagonal NFT grid on starting platform
const hiveLight = new THREE.PointLight(0x5674ff, 1.15, 85, 2);
hiveLight.position.set(0, startingPlatform.y + 12, 0);
scene.add(hiveLight);
const { platforms, platformMeshes } = generatePlatforms();
const exitPlatformPos = createExitPlatform(platforms);  // Add final exit platform
const topPortal = createTopPortal(exitPlatformPos);      // Portal on exit platform

// Portal to Room 9 (Archive Spiral) - Back portal at spawn
const spawnPortalY = startingPlatform.y + PLAYER_HEIGHT;
const portal9Obj = createLinkedPortal({
  scene,
  fromRoom: '10',
  toRoom: '9',
  x: 0,
  y: spawnPortalY,
  z: -4,  // Behind spawn position
  rotationY: 0,  // Face +Z (toward player when they turn around)
  createLabel: true
});
const portalToRoom9 = portal9Obj.portal;
const portal9Glow = portal9Obj.glow;

// Portal proximity checker for Room 10
const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: [
    {
      position: new THREE.Vector3(exitPlatformPos.x, topPortal.portalY, exitPlatformPos.z),
      name: 'Ocean Hub (Complete!)',
      url: 'room0.html',
      showDistance: 5.0,
      triggerDistance: 2.5
    },
    {
      position: new THREE.Vector3(0, spawnPortalY, -4),
      name: 'Archive Spiral',
      url: 'room9.html',
      showDistance: 4.0,
      triggerDistance: 2.0
    }
  ],
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});

// Calculate platform Y range for sphere positioning
const startingPlatformTop = -SPHERE_RADIUS + 8 + 0.5;
const platformStartY = startingPlatformTop + 2.5;
const platformEndY = platformStartY + VERTICAL_CLIMB_HEIGHT;

// Create sphere chain
const sphereChainResult = createSphereChain(platformStartY, platformEndY);
sphereChain = sphereChainResult.spheres;
sphereChainData = sphereChainResult.data;

// Load HDRI environment for sphere reflections (mirror-like reflections)
// This must be called AFTER spheres are created so materials can be updated
loadHDRIEnvironment();

// ----------------------------------------------------------------------
// Sphere Controls GUI
// ----------------------------------------------------------------------
let sphereGUI = null;
let guiVisible = false;
let sphereParams = {
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.0,
  envMapIntensity: 1.0,
  levitationSpeed: 1.5,
  levitationAmplitude: 0.2,
  rotationSpeed: 0.2,
  applyToAll: true
};

/**
 * Initialize GUI controls for sphere material properties
 */
function initSphereControlsGUI() {
  const guiContainer = document.getElementById('sphere-controls-ui');
  if (!guiContainer) {
    console.warn('Room X: GUI container not found');
    return;
  }

  // Check if GUI library is loaded (lil-gui exposes as global GUI)
  if (typeof GUI === 'undefined' && typeof window.GUI === 'undefined') {
    console.warn('Room X: lil-gui library not loaded. GUI controls unavailable.');
    return;
  }

  const GUI_Class = typeof GUI !== 'undefined' ? GUI : window.GUI;
  sphereGUI = new GUI_Class({ container: guiContainer, title: 'Sphere Controls' });

  const matFolder = sphereGUI.addFolder('Material Properties');
  matFolder.addColor(sphereParams, 'color').name('Color').onChange(val => {
    updateSphereMaterials({ color: val });
  });
  matFolder.add(sphereParams, 'metalness', 0, 1).name('Metalness').onChange(val => {
    updateSphereMaterials({ metalness: val });
  });
  matFolder.add(sphereParams, 'roughness', 0, 1).name('Roughness').onChange(val => {
    updateSphereMaterials({ roughness: val });
  });
  matFolder.add(sphereParams, 'clearcoat', 0, 1).name('Clearcoat').onChange(val => {
    updateSphereMaterials({ clearcoat: val });
  });
  matFolder.add(sphereParams, 'clearcoatRoughness', 0, 1).name('Coat Roughness').onChange(val => {
    updateSphereMaterials({ clearcoatRoughness: val });
  });
  matFolder.add(sphereParams, 'envMapIntensity', 0, 3).name('Reflection Intensity').onChange(val => {
    updateSphereMaterials({ envMapIntensity: val });
  });
  matFolder.open();

  const animFolder = sphereGUI.addFolder('Animation');
  animFolder.add(sphereParams, 'levitationSpeed', 0, 3).name('Levitation Speed');
  animFolder.add(sphereParams, 'levitationAmplitude', 0, 1).name('Levitation Amplitude');
  animFolder.add(sphereParams, 'rotationSpeed', 0, 2).name('Rotation Speed');
  animFolder.open();

  const globalFolder = sphereGUI.addFolder('Global');
  globalFolder.add(sphereParams, 'applyToAll').name('Apply to All Spheres');
  globalFolder.add({ reset: () => {
    sphereParams.color = 0xffffff;
    sphereParams.metalness = 1.0;
    sphereParams.roughness = 0.0;
    sphereParams.clearcoat = 1.0;
    sphereParams.clearcoatRoughness = 0.0;
    sphereParams.envMapIntensity = 1.0;
    sphereParams.levitationSpeed = 1.5;
    sphereParams.levitationAmplitude = 0.2;
    sphereParams.rotationSpeed = 0.2;
    sphereGUI.updateDisplay();
    updateSphereMaterials({
      color: sphereParams.color,
      metalness: sphereParams.metalness,
      roughness: sphereParams.roughness,
      clearcoat: sphereParams.clearcoat,
      clearcoatRoughness: sphereParams.clearcoatRoughness,
      envMapIntensity: sphereParams.envMapIntensity
    });
  }}, 'reset').name('Reset to Defaults');

  // Show GUI by default for easy access
  guiContainer.style.display = 'block';
  guiVisible = true;
}

/**
 * Update sphere materials based on GUI parameters
 * Ensures environment map is always preserved for reflections
 */
function updateSphereMaterials(updates) {
  const targetSpheres = sphereParams.applyToAll ? sphereChain : (sphereChain.length > 0 ? [sphereChain[0]] : []);
  
  targetSpheres.forEach(sphere => {
    if (sphere.material) {
      // Always ensure envMap is set (from scene.environment or hdriEnvironment)
      if (!sphere.material.envMap && (scene.environment || hdriEnvironment)) {
        sphere.material.envMap = scene.environment || hdriEnvironment;
      }
      
      if (updates.color !== undefined) {
        sphere.material.color.setHex(updates.color);
      }
      if (updates.metalness !== undefined) {
        sphere.material.metalness = updates.metalness;
      }
      if (updates.roughness !== undefined) {
        sphere.material.roughness = updates.roughness;
      }
      if (updates.clearcoat !== undefined) {
        sphere.material.clearcoat = updates.clearcoat;
      }
      if (updates.clearcoatRoughness !== undefined) {
        sphere.material.clearcoatRoughness = updates.clearcoatRoughness;
      }
      if (updates.envMapIntensity !== undefined) {
        sphere.material.envMapIntensity = updates.envMapIntensity;
      }
      sphere.material.needsUpdate = true;
    }
  });
}

/**
 * Toggle GUI visibility
 */
function toggleSphereGUI() {
  const guiContainer = document.getElementById('sphere-controls-ui');
  if (!guiContainer) {
    console.warn('Room X: GUI container not found');
    return;
  }

  guiVisible = !guiVisible;
  guiContainer.style.display = guiVisible ? 'block' : 'none';
  console.log(`Room X: Sphere controls GUI ${guiVisible ? 'shown' : 'hidden'}`);
}

// Initialize GUI after DOM and library are ready
function waitForGUI() {
  if (typeof GUI !== 'undefined' || typeof window.GUI !== 'undefined') {
    initSphereControlsGUI();
  } else {
    // Retry after a short delay if library not yet loaded
    setTimeout(waitForGUI, 100);
  }
}

// Start checking for GUI library availability
setTimeout(waitForGUI, 100);

// Keyboard shortcut: Ctrl+Shift+Q to toggle GUI (Q instead of A to avoid movement conflict)
// Use capture phase to ensure it fires before other handlers
document.addEventListener('keydown', (event) => {
  // Check for Ctrl+Shift+Q combination
  if (event.ctrlKey && event.shiftKey && (event.key === 'Q' || event.key === 'q' || event.code === 'KeyQ')) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // Ensure GUI is initialized before toggling
    if (!sphereGUI) {
      console.log('Room X: GUI not yet initialized, attempting to initialize...');
      const guiContainer = document.getElementById('sphere-controls-ui');
      if (guiContainer && (typeof GUI !== 'undefined' || typeof window.GUI !== 'undefined')) {
        initSphereControlsGUI();
      } else {
        console.warn('Room X: Cannot initialize GUI - container or library missing');
        return;
      }
    }
    
    toggleSphereGUI();
    console.log('Room X: Sphere controls GUI toggled');
  }
}, true); // Use capture phase

// Set spawn position on safe tile (Ring 1) instead of hole
// Move forward to the first tile in front of center
camera.position.set(0, 0, 0); // CRITICAL: Camera local position must be (0,0,0)
controls.getObject().position.set(0, startingPlatform.y + PLAYER_HEIGHT, 0); // Centered spawn
velocity.set(0, 0, 0); // Start with zero velocity
canJump = true; // Start grounded
lastSafePosition.copy(controls.getObject().position);

// ----------------------------------------------------------------------
// NFT Texture Loading for Room X Platforms
// ----------------------------------------------------------------------
const roomXTextures = [];

function loadRoomXTextures() {
  const loader = new THREE.TextureLoader();
  const max = Math.min(ROOMX_TEXTURE_COUNT, platformMeshes.length);

  for (let i = 1; i <= max; i++) {
    const index = i - 1;
    const url = getRoomXNftUrl(i);

    const texture = loader.load(
      url,
      (loadedTexture) => {
        // On successful load, configure texture
        loadedTexture.colorSpace = THREE.SRGBColorSpace; // Correct color encoding
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.anisotropy = 8; // Better quality at angles

        // Apply texture to corresponding platform
        if (platformMeshes[index]) {
          applyTextureToPlatform(platformMeshes[index], loadedTexture, index);
        }
      },
      undefined,
      (err) => {
        console.warn(`Room X: Failed to load NFT texture ${url}. Platform ${i} will use fallback material.`, err);
        // Platform keeps its original procedural material as fallback
      }
    );

    roomXTextures[index] = texture;
  }
}

function applyTextureToPlatform(platformMesh, texture, index) {
  // Prepare texture settings
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  // Side texture uses wrapped repeat for subtle edge coloration
  const sideTexture = texture;
  sideTexture.wrapS = THREE.RepeatWrapping;
  sideTexture.wrapT = THREE.RepeatWrapping;

  // Texture for planar hex mesh (top/bottom via DoubleSide)
  const topTexture = texture.clone();
  topTexture.colorSpace = THREE.SRGBColorSpace;
  topTexture.wrapS = THREE.ClampToEdgeWrapping;
  topTexture.wrapT = THREE.ClampToEdgeWrapping;
  topTexture.anisotropy = 8;
  topTexture.needsUpdate = true;

  // Materials
  const nftSideMaterial = new THREE.MeshStandardMaterial({
    map: sideTexture,
    color: 0x1d1f2c,
    metalness: 0.35,
    roughness: 0.75,
    emissive: 0x000000,
    transparent: false,
  });

  const nftTopMaterial = new THREE.MeshBasicMaterial({
    map: topTexture,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: false
  });

  // Apply side material to cylinder (frame)
  platformMesh.material = nftSideMaterial;
  platformMesh.material.needsUpdate = true;

  // Apply NFT material to dedicated hex mesh (visible from both sides)
  const nftMesh = platformMesh.userData.nftMesh;

  if (nftMesh) {
    nftMesh.material = nftTopMaterial;
    nftMesh.material.needsUpdate = true;
  } else {
    console.warn('Room X: Missing nftMesh for platform index', index);
  }
}

// Load textures after platforms are created
loadRoomXTextures();

// ----------------------------------------------------------------------
// Platform Collision Detection
// ----------------------------------------------------------------------
function checkPlatformCollision(position) {
  // Check starting platform first
  const dx = position.x;
  const dz = position.z;
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);

  if (horizontalDist < startingPlatform.radius) {
    const verticalDist = position.y - startingPlatform.y;
    if (verticalDist > -0.3 && verticalDist < 0.5) {
      return {
        position: new THREE.Vector3(0, startingPlatform.y, 0),
        radius: startingPlatform.radius,
        mesh: startingPlatform.platform,
        index: -1 // Special index for starting platform
      };
    }
  }

  // Check hive tiles on starting platform
  for (const hiveTile of hiveTileData) {
    const hx = position.x - hiveTile.position.x;
    const hz = position.z - hiveTile.position.z;
    const hDist = Math.sqrt(hx * hx + hz * hz);
    if (hDist < hiveTile.radius) {
      const vDist = position.y - hiveTile.topY;
      if (vDist >= -0.3 && vDist <= 0.5) {
        return {
          position: new THREE.Vector3(hiveTile.position.x, hiveTile.topY, hiveTile.position.z),
          radius: hiveTile.radius,
          mesh: hiveTile.mesh,
          index: -2 // identifier for ground hive
        };
      }
    }
  }

  // Check floating platforms
  for (const platform of platforms) {
    const dx = position.x - platform.position.x;
    const dz = position.z - platform.position.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);

    // Check if player is within platform radius horizontally
    if (horizontalDist < platform.radius) {
      const verticalDist = position.y - platform.position.y;

      // Check if player is just above the platform (landing on it)
      if (verticalDist > -0.3 && verticalDist < 0.5) {
        return platform;
      }
    }
  }
  return null;
}

// ----------------------------------------------------------------------
// Sphere Collision Detection (Solid Spheres)
// ----------------------------------------------------------------------
function checkSphereCollision(position, radius = 0.5) {
  for (const sphereData of sphereChainData) {
    const dx = position.x - sphereData.position.x;
    const dy = position.y - sphereData.position.y;
    const dz = position.z - sphereData.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const combinedRadius = sphereData.radius + radius;

    if (distance < combinedRadius) {
      // Collision detected - push player away from sphere
      const pushDirection = new THREE.Vector3(dx, dy, dz).normalize();
      const pushDistance = combinedRadius - distance + 0.1; // Small buffer
      return {
        collision: true,
        pushDirection: pushDirection,
        pushDistance: pushDistance,
        sphere: sphereData
      };
    }
  }
  return { collision: false };
}

// ----------------------------------------------------------------------
// Movement Controls
// ----------------------------------------------------------------------
function onKeyDown(event) {
  // Skip movement if GUI shortcut is pressed
  if (event.ctrlKey && event.shiftKey && (event.key === 'Q' || event.key === 'q' || event.code === 'KeyQ')) {
    return;
  }
  
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
      // Simple jump: only if grounded
      if (canJump) {
        velocity.y = JUMP_VELOCITY;
        canJump = false;
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
// Animation Loop - SIMPLIFIED PHYSICS
// ----------------------------------------------------------------------
const direction = new THREE.Vector3();
const clock = new THREE.Clock();
const GROUND_TOLERANCE = 0.4; // Vertical snap distance for landing
const DEATH_PLANE_Y = -120; // Far below valid play area

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (controls.isLocked) {
    const playerPos = controls.getObject().position;

    // 1. Apply gravity
    velocity.y += GRAVITY * delta;

    // 2. Apply WASD horizontal movement with different speeds for ground vs air
    // Ground: full WALK_SPEED; Air: reduced by AIR_CONTROL_FACTOR
    const controlFactor = canJump ? 1.0 : AIR_CONTROL_FACTOR;
    const moveSpeed = WALK_SPEED * controlFactor * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();

    // Save Y before horizontal movement - PointerLockControls can affect Y when looking up/down
    const savedY = playerPos.y;

    if (moveForward || moveBackward) {
      controls.moveForward(direction.z * moveSpeed);
    }
    if (moveLeft || moveRight) {
      controls.moveRight(direction.x * moveSpeed);
    }

    // Restore Y after horizontal movement - only gravity/grounding should affect Y
    playerPos.y = savedY;

    // 3. Integrate vertical velocity
    playerPos.y += velocity.y * delta;

    // 3.5. Check sphere collisions (solid spheres push player away)
    const sphereCollision = checkSphereCollision(playerPos, 0.5);
    if (sphereCollision.collision) {
      // Push player away from sphere
      const pushVector = sphereCollision.pushDirection.clone().multiplyScalar(sphereCollision.pushDistance);
      playerPos.add(pushVector);
      
      // If moving toward sphere, reverse velocity component
      const velocityTowardSphere = velocity.dot(sphereCollision.pushDirection);
      if (velocityTowardSphere < 0) {
        const bounceVector = sphereCollision.pushDirection.clone().multiplyScalar(-velocityTowardSphere * 1.5);
        velocity.add(bounceVector);
      }
    }

    // 4. Unified Grounding System (Prioritized)
    // Checks ALL potential surfaces and snaps to the closest valid one
    let grounded = false;
    const potentialGrounds = [];

    // A. Collect Main Platform candidate
    const dx = playerPos.x;
    const dz = playerPos.z;
    const horizDist = Math.sqrt(dx * dx + dz * dz);
    if (horizDist < startingPlatform.radius + 0.5) {
      potentialGrounds.push({
        targetY: startingPlatform.y + PLAYER_HEIGHT,
        type: 'main'
      });
    }

    // B. Collect Hive Tile candidates
    for (const hiveTile of hiveTileData) {
      const hdx = playerPos.x - hiveTile.position.x;
      const hdz = playerPos.z - hiveTile.position.z;
      const hDist = Math.sqrt(hdx * hdx + hdz * hdz);
      
      if (hDist < hiveTile.radius + 0.1) {
        potentialGrounds.push({
          targetY: hiveTile.topY + PLAYER_HEIGHT,
          type: 'hive'
        });
      }
    }

    // C. Collect Floating Platform candidates
    for (const platform of platforms) {
      const pdx = playerPos.x - platform.position.x;
      const pdz = playerPos.z - platform.position.z;
      const pHorizDist = Math.sqrt(pdx * pdx + pdz * pdz);

      if (pHorizDist < platform.radius) {
        potentialGrounds.push({
          targetY: platform.position.y + PLAYER_HEIGHT,
          type: 'platform',
          mesh: platform.mesh
        });
      }
    }

    // D. Evaluate Candidates
    if (potentialGrounds.length > 0 && velocity.y <= 0) {
      // Find surface with smallest vertical difference
      let bestCandidate = null;
      let minDiff = Infinity;

      for (const candidate of potentialGrounds) {
        const diff = playerPos.y - candidate.targetY;
        // Only consider surfaces we are close to (within tolerance)
        // Note: Increased tolerance slightly for smoother transitions
        if (Math.abs(diff) <= GROUND_TOLERANCE + 0.1) {
          if (Math.abs(diff) < minDiff) {
            minDiff = Math.abs(diff);
            bestCandidate = candidate;
          }
        }
      }

      // Apply grounding if we found a valid surface
      if (bestCandidate) {
        playerPos.y = bestCandidate.targetY;
        velocity.y = 0;
        canJump = true;
        grounded = true;
        lastSafePosition.copy(playerPos);

        // Visual feedback for floating platforms
        if (bestCandidate.type === 'platform' && bestCandidate.mesh && bestCandidate.mesh.material.emissiveIntensity !== undefined) {
           bestCandidate.mesh.material.emissiveIntensity = 0.6;
        }
      }
    }

    // 5. Death plane - ONE simple check, far below
    if (playerPos.y < DEATH_PLANE_Y) {
      if (lastSafePosition.y !== 0 || lastSafePosition.x !== 0 || lastSafePosition.z !== 0) {
        playerPos.copy(lastSafePosition);
      } else {
        playerPos.set(0, startingPlatform.y + PLAYER_HEIGHT, 0);
      }
      velocity.set(0, 0, 0);
      canJump = true;
    }
  }

  // Animate platforms - subtle floating motion
  platformMeshes.forEach((platform, index) => {
    const floatOffset = Math.sin(time * 0.5 + index * 0.2) * 0.15;
    platform.position.y = platforms[index].position.y + floatOffset;

    // Fade emissive intensity back to normal
    if (platform.material.emissiveIntensity > 0.3) {
      platform.material.emissiveIntensity -= delta * 0.5;
    }
  });

  // Animate spheres - levitation effect
  sphereChain.forEach((sphere, index) => {
    // Get original base Y position (stored in sphere userData)
    if (sphere.userData.baseY === undefined) {
      sphere.userData.baseY = sphereChainData[index].position.y;
    }
    const baseY = sphere.userData.baseY;
    
    const levitationOffset = Math.sin(time * sphereParams.levitationSpeed + index * 0.3) * sphereParams.levitationAmplitude;
    sphere.position.y = baseY + levitationOffset;
    // Update collision data position
    sphereChainData[index].position.y = sphere.position.y;
    
    // Rotation based on GUI parameter
    sphere.rotation.y += delta * sphereParams.rotationSpeed;
  });

  // Animate portals
  animateLinkedPortal(topPortal.portal, topPortal.glow);
  animateLinkedPortal(portalToRoom9, portal9Glow);
  checkPortalProximity();

  // Pulse the "COMPLETE!" text
  topPortal.textSprite.material.opacity = 0.7 + Math.sin(time * 2) * 0.2;

  // Subtle star twinkle
  stars.rotation.y += 0.0001;

  // Pulsing goal light
  goalLight.intensity = 1.5 + Math.sin(time * 1.5) * 0.5;

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
