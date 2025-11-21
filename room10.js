import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three/examples/jsm/utils/PMREMGenerator.js';
import { createLinkedPortal, animateLinkedPortal } from './src/core/portal-utils.js';
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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

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
const ambientLight = new THREE.AmbientLight(0x2244aa, 0.4);
scene.add(ambientLight);

// Dramatic directional lights from above
const topLight = new THREE.DirectionalLight(0x6699ff, 0.6);
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
const goalLight = new THREE.PointLight(0xffaa66, 1.5, 40);
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
// Canvas Wrap UV Mapping for Platform Tiles
// ----------------------------------------------------------------------
/**
 * Modify CylinderGeometry UVs to create "wrapped canvas" effect
 * - Top face: unchanged (shows full NFT artwork)
 * - Side faces: sample from outer edge of texture (like canvas edge wrap)
 *
 * CylinderGeometry UV layout (radialSegments=6):
 * - Vertices are organized as groups for top cap, sides, bottom cap
 * - Side faces use rectangular UVs (U wraps around, V is height)
 *
 * @param {THREE.CylinderGeometry} geometry - Platform cylinder geometry
 */
function applyCanvasWrapUVs(geometry) {
  const uvAttribute = geometry.attributes.uv;
  const uvArray = uvAttribute.array;
  const radialSegments = 6; // Hexagon

  // CylinderGeometry vertex layout:
  // - Top cap center: 1 vertex
  // - Top cap perimeter: radialSegments vertices
  // - Side vertices: (radialSegments + 1) * 2 vertices (top ring + bottom ring)
  // - Bottom cap perimeter: radialSegments vertices
  // - Bottom cap center: 1 vertex

  const topCapVertices = 1 + radialSegments; // center + perimeter
  const sideVertices = (radialSegments + 1) * 2; // top ring + bottom ring

  // Side face UVs start after top cap vertices
  const sideUVStart = topCapVertices * 2; // Each vertex has 2 UV components (U, V)
  const sideUVEnd = sideUVStart + (sideVertices * 2);

  // Modify side face UVs to sample from edge strip (U: 0.85 - 1.0)
  const edgeStart = 0.85;
  const edgeEnd = 1.0;
  const edgeWidth = edgeEnd - edgeStart;

  for (let i = sideUVStart; i < sideUVEnd; i += 2) {
    const originalU = uvArray[i];
    // Remap U from [0, 1] to [0.85, 1.0] for edge strip sampling
    uvArray[i] = edgeStart + (originalU * edgeWidth);
    // V coordinate (uvArray[i + 1]) stays unchanged
  }

  uvAttribute.needsUpdate = true;
  // Canvas wrap UVs applied (no log to avoid spam - 28 platforms)
}

// ----------------------------------------------------------------------
// Generate Spiral Platform Path
// ----------------------------------------------------------------------
function generatePlatforms() {
  const platforms = [];
  const platformMeshes = [];

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
      6
    );

    // Apply canvas wrap UV mapping for side faces
    applyCanvasWrapUVs(platformGeometry);

    // Color gradient - cooler colors at bottom, warmer at top
    const hue = 210 - progress * 60; // Blue to orange
    const saturation = 70 + progress * 20;
    const lightness = 40 + progress * 20;

    // Multi-material setup: sides with glow, top/bottom clean for NFT display
    // CylinderGeometry groups: [0] = sides, [1] = top cap, [2] = bottom cap
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 100),
      metalness: 0.6,
      roughness: 0.3,
      emissive: new THREE.Color().setHSL(hue / 360, saturation / 100, lightness / 200),
      emissiveIntensity: 0.3
    });

    // Initial top material (will be replaced with NFT texture)
    // IMPORTANT: Pure white color, no emissive, no transparency for vivid NFT display
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,        // Pure white - no tinting
      metalness: 0.2,
      roughness: 0.7,
      emissive: 0x000000,     // No emissive glow on top
      transparent: false
    });

    const bottomMaterial = sideMaterial; // Bottom can use same as sides

    const platform = new THREE.Mesh(platformGeometry, [sideMaterial, topMaterial, bottomMaterial]);
    platform.position.set(x, y, z);

    // Slight random rotation for organic feel
    platform.rotation.y = Math.random() * Math.PI * 2;

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
// Create Visual Portal at Top (Non-functional)
// ----------------------------------------------------------------------
function createTopPortal() {
  const portalY = -SPHERE_RADIUS + PLAYER_HEIGHT + VERTICAL_CLIMB_HEIGHT + 8;

  const portalObj = createLinkedPortal({
    scene,
    fromRoom: '10',
    toRoom: '???',
    x: 0,
    y: portalY,
    z: 0,
    rotationY: 0,
    createLabel: false
  });

  // Add a floating "ESCAPE" text above portal
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 512;
  textCanvas.height = 128;
  const textCtx = textCanvas.getContext('2d');
  textCtx.fillStyle = '#ffffff';
  textCtx.font = 'bold 80px Arial';
  textCtx.textAlign = 'center';
  textCtx.fillText('ESCAPE', 256, 90);

  const textTexture = new THREE.CanvasTexture(textCanvas);
  const textMaterial = new THREE.SpriteMaterial({
    map: textTexture,
    transparent: true,
    opacity: 0.9
  });

  const textSprite = new THREE.Sprite(textMaterial);
  textSprite.scale.set(10, 2.5, 1);
  textSprite.position.set(0, portalY + 4, 0);
  scene.add(textSprite);

  return { portal: portalObj.portal, glow: portalObj.glow, textSprite };
}

// ----------------------------------------------------------------------
// Create Starting Platform (Floor)
// ----------------------------------------------------------------------
function createStartingPlatform() {
  const platformRadius = 45; // Large stable floor
  const platformY = -SPHERE_RADIUS + 8; // 8 units from bottom of sphere

  const geometry = new THREE.CylinderGeometry(platformRadius, platformRadius, 1, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2a2a3a,
    metalness: 0.5,
    roughness: 0.7,
    emissive: 0x111122,
    emissiveIntensity: 0.3
  });

  const platform = new THREE.Mesh(geometry, material);
  platform.position.set(0, platformY, 0);
  scene.add(platform);

  // Add a glowing rim for visibility
  const rimGeometry = new THREE.TorusGeometry(platformRadius, 0.5, 16, 64);
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
 * Uses PMREMGenerator for optimal PBR reflection quality
 */
function loadHDRIEnvironment() {
  const loader = new RGBELoader();
  loader.load(
    HDRI_URL,
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      
      // Use PMREMGenerator to convert HDRI to optimized environment map for PBR
      // This provides much better reflection quality than using the HDRI directly
      const pmremGenerator = new PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      
      // Set as scene environment - this is crucial for reflections
      scene.environment = envMap;
      hdriEnvironment = envMap;

      // Update all sphere materials with environment map
      // Ensure they have proper mirror-like settings
      sphereChain.forEach(sphere => {
        if (sphere.material) {
          sphere.material.envMap = envMap;
          sphere.material.metalness = 1.0; // Fully metallic for mirror
          sphere.material.roughness = 0.0; // Perfect mirror (0 = mirror, 1 = matte)
          sphere.material.envMapIntensity = 1.0;
          sphere.material.needsUpdate = true;
        }
      });

      // Clean up
      pmremGenerator.dispose();
      texture.dispose(); // Original HDRI no longer needed

      console.log('Room X: HDRI environment map loaded and processed - spheres now have mirror reflections');
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
const { platforms, platformMeshes } = generatePlatforms();
const topPortal = createTopPortal();

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

  // Hide GUI initially
  guiContainer.style.display = 'none';
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
  if (!guiContainer) return;

  guiVisible = !guiVisible;
  guiContainer.style.display = guiVisible ? 'block' : 'none';
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
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.key === 'Q') {
    event.preventDefault();
    toggleSphereGUI();
  }
});

// Set spawn position on starting platform
controls.getObject().position.set(0, startingPlatform.y + PLAYER_HEIGHT, 0);
velocity.set(0, 0, 0); // Start with zero velocity
canJump = true; // Start grounded

// ----------------------------------------------------------------------
// NFT Texture Loading for Room X Platforms
// ----------------------------------------------------------------------
const ROOMX_TEXTURE_COUNT = 50; // Maximum number of NFT images available
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
  // Prepare texture settings for consistent quality across all faces
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;

  // Create NFT material for sides - artwork wraps over edges like gallery canvas
  // NO tint, NO emissive, NO transparency - artwork extends naturally
  const nftSideMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,         // Pure white - no color tinting
    metalness: 0.1,
    roughness: 0.6,
    emissive: 0x000000,      // No glow on sides
    emissiveIntensity: 0,
    transparent: false,
  });

  // Create NFT material for top - same texture, same clean appearance
  const nftTopMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,         // Pure white - no color tinting
    metalness: 0.1,
    roughness: 0.6,
    emissive: 0x000000,      // No emissive bleed
    emissiveIntensity: 0,
    transparent: false,
  });

  // Apply NFT texture to both sides AND top
  // CylinderGeometry UVs will wrap texture around sides naturally
  // Result: artwork extends over edges like a wrapped canvas
  if (Array.isArray(platformMesh.material)) {
    platformMesh.material[0] = nftSideMaterial;  // Sides now show artwork
    platformMesh.material[1] = nftTopMaterial;   // Top shows artwork
    platformMesh.material[0].needsUpdate = true;
    platformMesh.material[1].needsUpdate = true;
    // Bottom (index 2) keeps original material - not visible to player
  } else {
    // Fallback: replace entire material (should not happen with new setup)
    console.warn('Platform material is not an array, replacing entire material');
    platformMesh.material = nftTopMaterial;
    platformMesh.material.needsUpdate = true;
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

    if (moveForward || moveBackward) {
      controls.moveForward(direction.z * moveSpeed);
    }
    if (moveLeft || moveRight) {
      controls.moveRight(direction.x * moveSpeed);
    }

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

    // 4. Check grounding against all platforms (simple snap-to-surface)
    let grounded = false;

    // Check starting platform
    const dx = playerPos.x;
    const dz = playerPos.z;
    const horizDist = Math.sqrt(dx * dx + dz * dz);

    if (horizDist < startingPlatform.radius) {
      const vertDiff = playerPos.y - (startingPlatform.y + PLAYER_HEIGHT);
      if (vertDiff >= -GROUND_TOLERANCE && vertDiff <= GROUND_TOLERANCE && velocity.y <= 0) {
        playerPos.y = startingPlatform.y + PLAYER_HEIGHT;
        velocity.y = 0;
        canJump = true;
        grounded = true;
      }
    }

    // Check floating platforms (only if not already grounded)
    if (!grounded) {
      for (const platform of platforms) {
        const pdx = playerPos.x - platform.position.x;
        const pdz = playerPos.z - platform.position.z;
        const pHorizDist = Math.sqrt(pdx * pdx + pdz * pdz);

        if (pHorizDist < platform.radius) {
          const pVertDiff = playerPos.y - (platform.position.y + PLAYER_HEIGHT);
          if (pVertDiff >= -GROUND_TOLERANCE && pVertDiff <= GROUND_TOLERANCE && velocity.y <= 0) {
            playerPos.y = platform.position.y + PLAYER_HEIGHT;
            velocity.y = 0;
            canJump = true;
            grounded = true;

            // Visual feedback - pulse platform
            if (platform.mesh.material.emissiveIntensity !== undefined) {
              platform.mesh.material.emissiveIntensity = 0.6;
            }
            break;
          }
        }
      }
    }

    // 5. Death plane - ONE simple check, far below
    if (playerPos.y < DEATH_PLANE_Y) {
      playerPos.set(0, startingPlatform.y + PLAYER_HEIGHT, 0);
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

  // Animate portal
  animateLinkedPortal(topPortal.portal, topPortal.glow);

  // Pulse the "ESCAPE" text
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
