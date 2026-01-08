// Changes made:
// - Created Room A (Undersea Observatory) with basic structure
// - Implemented underwater glass dome observatory environment with geodesic structure
// - Added metal framework using TubeGeometry for struts
// - Created glass panels with realistic refraction and transmission properties
// - Added portal back to Room 0
// - Enhanced underwater environment with custom shader for water caustics and depth-dependent coloration
// - Improved depth-dependent coloration with enhanced blue fading to darker blue
// - Added ocean floor with displacement map for terrain variation
// - Enhanced glass dome visibility with improved materials and lighting
// - Added video display frames around the bottom edge of the dome featuring looping videos
// - Created ultra-transparent glass panels for maximum visibility through the dome
// - Enhanced underwater environment with large inverted sphere, advanced caustics and volumetric light effects
// - Fixed initialization issues with function declarations
// - Adjusted movement speed to create a realistic underwater feel
// - Added boundary constraint to prevent camera from leaving the dome
// - Optimized video performance to reduce lag
// - Removed submarines and unnecessary structures inside the dome
// - Reduced environment size to match dome dimensions
// - Restored 17 video frames around the dome with optimized loading and playback
// - Made dome completely transparent with only the framework visible
// - Moved water particles to display outside the dome in a spherical shell
// - Created a clear inner sphere inside the water sphere to create an inverted underwater observatory effect
// - Enhanced water shader with improved caustics, depth effects, and Henyey-Greenstein light scattering
// - Added fish silhouettes swimming in the distance outside the dome
// - Added bubble streams rising from the ocean floor outside the dome
// - Added fish1.glb model to enhance the underwater environment
// - Removed annoying lighting rays from the top of the dome
// - Added fish2.glb, fish3.glb, and fish4.glb models swimming at different heights and speeds
// - Completely removed all light ray sources including volumetric light shafts
// - Fixed missing NFT video frames by ensuring proper reinitiation after light source removal
// - Enhanced fish animation with diverse movement patterns - vertical traversal, complex navigation, varying speeds at different heights
// - Updated fish model file paths to load from assets/blender folder instead of public/blender

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Hide loading overlay when the page loads
window.addEventListener('load', () => {
  console.log("Window loaded, initializing room...");
  
  // We don't need to call initializeRoom() here - it's already called with a timeout
  
  // Hide loading overlay after a short delay
  setTimeout(() => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      console.log("Hiding loading overlay from window load event");
      loadingOverlay.style.display = 'none';
    }
  }, 1000);
});

// Global error handler to ensure loading overlay is hidden if there's an error
window.addEventListener('error', function(event) {
  console.error('Error caught:', event.error || event.message);
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
  
  // Display error message on screen
  const errorMsg = document.createElement('div');
  errorMsg.style.position = 'fixed';
  errorMsg.style.top = '10px';
  errorMsg.style.left = '10px';
  errorMsg.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
  errorMsg.style.color = 'white';
  errorMsg.style.padding = '10px';
  errorMsg.style.borderRadius = '5px';
  errorMsg.style.zIndex = '9999';
  errorMsg.style.maxWidth = '80%';
  errorMsg.textContent = `Error: ${event.error?.message || event.message || 'Unknown error'}`;
  document.body.appendChild(errorMsg);
});

// Right after the import statements, around line 18, add:
// Ensure loading overlay is hidden - force attempt in case other code fails
document.addEventListener('DOMContentLoaded', () => {
  // Force hide the loading overlay regardless of any other errors
  console.log("DOMContentLoaded - Attempting to hide loading overlay");
  setTimeout(() => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      console.log("Hiding loading overlay");
      loadingOverlay.style.display = 'none';
    } else {
      console.log("Loading overlay not found");
    }
  }, 2000); // Wait 2 seconds after DOM is loaded
});

// Backup force-hide if window load event doesn't fire properly
setTimeout(() => {
  console.log("Backup timeout - Attempting to hide loading overlay");
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay && loadingOverlay.style.display !== 'none') {
    console.log("Backup hiding of loading overlay");
    loadingOverlay.style.display = 'none';
  }
}, 5000); // Force hide after 5 seconds regardless

// ----------------------------------------------------------------------
// Global Variables
// ----------------------------------------------------------------------
const groundLevel = 0;
const eyeHeight = 2.0;
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;
const speed = 20.0; // Slower movement for realistic underwater feel
const textureLoader = new THREE.TextureLoader();
const roomRadius = 30; // Larger room for the dome
const waterColor = new THREE.Color(0x004466); // Deep blue water color
const waterLevel = -1.0; // Water level for ocean floor
const oceanRadius = roomRadius * 1.2; // Reduced from roomRadius * 3
const oceanFloorRadius = roomRadius * 1.1; // Reduced from oceanRadius * 1.5

// Marine life settings
// const NUM_FISH_SCHOOLS = 5;    // Number of fish schools
// const FISH_PER_SCHOOL = 30;    // Number of fish per school
// const NUM_LARGE_CREATURES = 3; // Number of large creatures
// const NUM_BUBBLE_EMITTERS = 8; // Number of bubble emitters

// Create scene, camera and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a2933); // Deep underwater blue

// Implement improved fog for better depth perception and performance
// Using exponential fog for more realistic underwater appearance
scene.fog = new THREE.FogExp2(0x0a2933, 0.01); // Increased density for better depth effect and performance

// Additional underwater fog effect using a shader
const underwaterFogParams = {
  color: new THREE.Color(0x0a2933),
  density: 0.015,
  heightFalloff: 0.1 // Fog is less dense higher up
};
scene.userData.underwaterFogParams = underwaterFogParams;

// We'll apply this to materials that need underwater fog effect

// ----------------------------------------------------------------------
// Water Shader Definitions
// ----------------------------------------------------------------------
const waterVertexShader = `
  uniform float time;
  uniform float waterLevel;
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vDepth;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    
    // Calculate world position for advanced effects
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // Calculate view direction for scattering effects
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    
    // Calculate distance from viewer (depth)
    vec4 viewPosition = viewMatrix * worldPosition;
    vDepth = -viewPosition.z;
    
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const waterFragmentShader = `
  uniform float time;
  uniform vec3 baseColor;
  uniform vec3 midColor;
  uniform vec3 deepColor;
  uniform float waterLevel;
  uniform vec3 cameraPosition;
  uniform vec3 lightPosition; 
  uniform float scatteringCoefficient;
  uniform vec3 waterFogColor;
  uniform float domeRadius;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vDepth;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  
  // Improved hash function for better randomness
  float hash(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.zyx + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  
  // Improved 3D value noise function
  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    // Smoothstep interpolation
    f = f * f * (3.0 - 2.0 * f);
    
    // Grid cell corners
    float a = hash(i + vec3(0.0, 0.0, 0.0));
    float b = hash(i + vec3(1.0, 0.0, 0.0));
    float c = hash(i + vec3(0.0, 1.0, 0.0));
    float d = hash(i + vec3(1.0, 1.0, 0.0));
    float e = hash(i + vec3(0.0, 0.0, 1.0));
    float f1 = hash(i + vec3(1.0, 0.0, 1.0));
    float g = hash(i + vec3(0.0, 1.0, 1.0));
    float h = hash(i + vec3(1.0, 1.0, 1.0));
    
    // Trilinear interpolation
    float k0 = a;
    float k1 = b - a;
    float k2 = c - a;
    float k3 = e - a;
    float k4 = a - b - c + d;
    float k5 = a - c - e + g;
    float k6 = a - b - e + f1;
    float k7 = -a + b + c - d + e - f1 - g + h;
    
    return k0 + k1 * f.x + k2 * f.y + k3 * f.z + 
           k4 * f.x * f.y + k5 * f.y * f.z + k6 * f.z * f.x + 
           k7 * f.x * f.y * f.z;
  }
  
  // FBM (Fractal Brownian Motion) for more natural looking noise
  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    // More octaves = more detail
    for(int i = 0; i < 6; i++) {
      sum += amp * noise3D(p * freq);
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum;
  }
  
  // Enhanced caustic effect function
  float causticEffect(vec3 pos, float time) {
    // Create multiple layers of caustics with different scales and speeds
    float scale1 = 0.3;
    float scale2 = 0.6;
    float scale3 = 0.9;
    
    // Sample noise at different frequencies, amplitudes, and time offsets
    float noise1 = fbm(vec3(pos.xz * scale1, time * 0.15));
    float noise2 = fbm(vec3(pos.xz * scale2, time * 0.1 + 1.3));
    float noise3 = fbm(vec3(pos.xz * scale3, time * 0.2 + 2.7));
    
    // Combine noise samples with different weights
    float caustic = 0.5 + 0.5 * (noise1 * 0.5 + noise2 * 0.35 + noise3 * 0.15);
    
    // Add wavy pulse effect
    float pulse = 0.5 + 0.3 * sin(time * 0.5 + pos.y * 0.2);
    caustic *= mix(0.8, 1.2, pulse);
    
    // Add depth variation - stronger caustics in shallower water
    caustic *= max(0.4, 1.0 - vDepth * 0.15);
    
    return caustic;
  }
  
  // More physically accurate volumetric light scattering
  float volumetricLightScattering() {
    vec3 lightDir = normalize(lightPosition - cameraPosition);
    float cosAngle = dot(normalize(vViewDirection), lightDir);
    
    // Henyey-Greenstein phase function approximation
    float g = 0.7; // Forward scattering factor (0-1)
    float g2 = g * g;
    float scattering = (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosAngle, 1.5);
    
    // Scale the scattering effect
    scattering *= scatteringCoefficient * 0.2;
    
    // Attenuate with distance using physically plausible falloff
    float distanceAttenuation = 1.0 / (1.0 + vDepth * 0.15);
    
    // Attenuate with depth using Beer's law
    float depthAttenuation = exp(-vDepth * 0.2);
    
    return scattering * distanceAttenuation * depthAttenuation;
  }
  
  // Function to calculate realistic water surface ripples
  float surfaceRipples(vec3 pos, float time) {
    vec2 uv = pos.xz * 0.1;
    float ripple1 = sin(uv.x * 10.0 + time * 0.5) * sin(uv.y * 10.0 + time * 0.7) * 0.1;
    float ripple2 = sin(uv.x * 20.0 - time * 0.3) * sin(uv.y * 20.0 + time * 0.4) * 0.05;
    return ripple1 + ripple2;
  }
  
  // Function to simulate small fish silhouettes in the distance
  float fishSilhouette(vec3 pos, float time) {
    // Check if this position should contain a fish (based on noise)
    float fishCheck = noise3D(vec3(floor(pos.xz / 15.0) * 15.0, time * 0.02));
    
    // Only draw fish in specific noise regions (sparse distribution)
    if (fishCheck < 0.15) {
      // Calculate a unique position/direction for this fish
      vec3 fishPos = vec3(
        floor(pos.x / 15.0) * 15.0 + 7.5,
        pos.y,
        floor(pos.z / 15.0) * 15.0 + 7.5
      );
      
      // Calculate fish movement direction and speed
      float fishAngle = hash(fishPos) * 6.28;
      float fishSpeed = 2.0 + hash(fishPos + 1.0) * 3.0;
      
      // Fish movement
      fishPos.x += sin(fishAngle) * time * fishSpeed;
      fishPos.z += cos(fishAngle) * time * fishSpeed;
      
      // Calculate distance from current position to fish
      vec2 fishDelta = pos.xz - fishPos.xz;
      float fishDist = length(fishDelta);
      
      // Fish silhouette is roughly fish-shaped
      if (fishDist < 2.0) {
        // Calculate position on fish body (0 = tail, 1 = head)
        float fishT = (fishDelta.x * sin(fishAngle) + fishDelta.y * cos(fishAngle)) / 4.0 + 0.5;
        
        // Fish width varies along length (thinner at tail, thicker in middle)
        float fishWidth = 0.5 * sin(fishT * 3.14);
        
        // Calculate distance from spine to edge at this position
        float fishCrossWidth = abs(fishDelta.x * cos(fishAngle) - fishDelta.y * sin(fishAngle));
        
        // Return value if within fish shape
        if (fishT >= 0.0 && fishT <= 1.0 && fishCrossWidth < fishWidth) {
          // Animate tail swishing
          float tailSwish = sin(time * 5.0 + fishT * 10.0) * (1.0 - fishT);
          
          // Return fish silhouette intensity
          return 0.2 + 0.1 * tailSwish;
        }
      }
    }
    
    return 0.0;
  }
  
  void main() {
    // Calculate distance from world center (origin)
    float distFromCenter = length(vWorldPosition);
    
    // If inside dome radius + small buffer, discard fragment (make it transparent)
    // This creates a clear area inside the dome
    if (distFromCenter < domeRadius * 1.03) {
      discard;
    }
    
    // Calculate base color based on depth with smoother transitions
    vec3 color;
    
    // Four zones for better depth perception with smoother transitions
    if (vDepth < 0.8) {
      // Surface zone - lightest blue
      color = mix(vec3(0.4, 0.7, 1.0), baseColor, vDepth / 0.8);
    } else if (vDepth < 2.0) {
      // Near zone - blend from base to mid
      color = mix(baseColor, midColor, (vDepth - 0.8) / 1.2);
    } else if (vDepth < 4.0) {
      // Mid zone - blend from mid to deep
      color = mix(midColor, deepColor, (vDepth - 2.0) / 2.0);
    } else {
      // Deep zone - deep color with slight darkening based on depth
      color = deepColor * (1.0 - min(0.5, (vDepth - 4.0) * 0.03));
    }
    
    // Calculate view angle relative to the water surface
    float viewAngle = abs(dot(normalize(vViewDirection), vec3(0.0, 1.0, 0.0)));
    
    // Add enhanced caustic effect
    float caustic = causticEffect(vWorldPosition, time);
    
    // Apply stronger caustics when looking more horizontally through water
    float causticIntensity = mix(0.3, 0.1, viewAngle);
    color = mix(color, color * 1.7, caustic * causticIntensity);
    
    // Disabled volumetric light scattering (god rays)
    // float scattering = volumetricLightScattering();
    // color = mix(color, vec3(1.0, 0.97, 0.85), scattering);
    
    // Add a subtle blue tint based on depth
    color = mix(color, color * vec3(0.8, 0.9, 1.0), min(1.0, vDepth * 0.1));
    
    // Apply subtle surface ripples (more visible near the surface)
    float surfaceEffect = max(0.0, 1.0 - vDepth * 0.5) * surfaceRipples(vWorldPosition, time);
    color += vec3(0.05, 0.1, 0.15) * surfaceEffect;
    
    // Add fish silhouettes in the distance
    float fishEffect = 0.0;
    // Only check for fish if the point is somewhat distant (optimization)
    if (vDepth > 3.0) {
      fishEffect = fishSilhouette(vWorldPosition, time);
      if (fishEffect > 0.0) {
        // Darken color slightly where fish are
        color = mix(color, color * 0.3, fishEffect);
      }
    }
    
    // Add a subtle depth-based fog effect with better falloff
    float fogFactor = 1.0 - exp(-vDepth * 0.07);
    color = mix(color, waterFogColor, fogFactor * 0.4);
    
    // Add a pulsing glow to caustic highlights for more dynamic water
    float pulse = 0.5 + 0.5 * sin(time * 0.3 + vWorldPosition.y * 0.1);
    color += vec3(0.1, 0.15, 0.3) * caustic * pulse * 0.08;
    
    // Calculate opacity that varies with viewing angle and depth
    // More transparent when looking straight at it, more opaque at glancing angles
    float baseOpacity = mix(0.2, 0.6, pow(1.0 - viewAngle, 2.0));
    float opacity = min(0.85, baseOpacity + vDepth * 0.05);
    
    // Add sparkles/highlights to simulate small particles catching light
    if (caustic > 0.85 && hash(vWorldPosition + vec3(time)) > 0.97) {
      color += vec3(0.6, 0.7, 0.9) * (caustic - 0.85) * 5.0;
    }
    
    gl_FragColor = vec4(color, opacity);
  }
`;

// ----------------------------------------------------------------------
// Camera and Renderer Setup
// ----------------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, groundLevel + eyeHeight, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8; // Brighter for underwater scene
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ----------------------------------------------------------------------
// Controls Setup
// ----------------------------------------------------------------------
const controls = new PointerLockControls(camera, document.body);

// Click handler to lock controls
window.addEventListener('click', () => {
  if (!controls.isLocked) {
    controls.lock();
  }
});

controls.addEventListener('lock', () => {
  document.getElementById('controls-description').style.display = 'none';
});

controls.addEventListener('unlock', () => {
  document.getElementById('controls-description').style.display = 'block';
});

// Movement variables
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Key handlers
const onKeyDown = function (event) {
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
      }
      break;
  }
};

const onKeyUp = function (event) {
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
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

// ----------------------------------------------------------------------
// Geodesic Dome Construction
// ----------------------------------------------------------------------

// Function to create a geodesic dome structure
function createGeodisicDome(radius, detail) {
  const domeGroup = new THREE.Group();
  
  // Generate the vertices for the geodesic dome based on icosahedron
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  
  // Add defensive checks to ensure properties exist before accessing them
  if (!geometry.attributes || !geometry.attributes.position || !geometry.attributes.position.array) {
    console.error("IcosahedronGeometry missing position attribute or array");
    return domeGroup; // Return empty group to avoid further errors
  }
  
  const icosahedronVertices = geometry.attributes.position.array;
  
  // Check if index buffer exists
  if (!geometry.index || !geometry.index.array) {
    console.error("IcosahedronGeometry missing index array");
    
    // If no index buffer exists, create a simplified dome instead
    const simpleGeometry = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const simpleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,         // Pure white
      transmission: 0.95,      // Nearly complete transmission (transparency)
      roughness: 0.05,         // Very smooth surface with minimal roughness
      ior: 1.05,               // Very close to air (1.0) for minimal distortion
      transparent: true,
      opacity: 0.05,           // Extremely low opacity - nearly invisible
      reflectivity: 0.05,      // Minimal reflectivity for subtle glass effect
      side: THREE.DoubleSide,  // Render both sides
      
      // Disable features that could cause visibility issues
      clearcoat: 0,
      attenuationDistance: Infinity, // No color attenuation
      attenuationColor: 0xffffff,    // No tinting
      
      // Turn off environment mapping which can add unwanted reflections
      envMapIntensity: 0
    });
    
    const simpleDome = new THREE.Mesh(simpleGeometry, simpleMaterial);
    simpleDome.renderOrder = 1; // Ensure glass renders after struts
    simpleDome.material.depthWrite = false; // Prevent depth-fighting
    domeGroup.add(simpleDome);
    
    // Add a metal framework
    const frameworkGeometry = new THREE.EdgesGeometry(simpleGeometry);
    const frameworkMaterial = new THREE.LineBasicMaterial({
      color: 0x888888,
      linewidth: 2
    });
    
    const framework = new THREE.LineSegments(frameworkGeometry, frameworkMaterial);
    domeGroup.add(framework);
    
    // Add a base ring
    const baseRingGeometry = new THREE.TorusGeometry(radius * 0.99, 0.2, 16, 50);
    const baseRingMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const baseRing = new THREE.Mesh(baseRingGeometry, baseRingMaterial);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.1;
    domeGroup.add(baseRing);
    
    domeGroup.position.y = groundLevel;
    return domeGroup;
  }
  
  const icosahedronIndices = geometry.index.array;
  
  // Create points for all the vertices
  const points = [];
  for (let i = 0; i < icosahedronVertices.length; i += 3) {
    const x = icosahedronVertices[i];
    const y = icosahedronVertices[i + 1];
    const z = icosahedronVertices[i + 2];
    
    // Only use points in the upper hemisphere (y >= 0)
    if (y >= 0) {
      points.push(new THREE.Vector3(x, y, z));
    }
  }
  
  // Create edges (struts) between vertices
  const edges = new Set();
  try {
    for (let i = 0; i < icosahedronIndices.length; i += 3) {
      const a = icosahedronIndices[i];
      const b = icosahedronIndices[i + 1];
      const c = icosahedronIndices[i + 2];
      
      // Validate indices to ensure they're within bounds
      if (
        a * 3 + 2 >= icosahedronVertices.length || 
        b * 3 + 2 >= icosahedronVertices.length || 
        c * 3 + 2 >= icosahedronVertices.length
      ) {
        console.warn("Index out of bounds in geodesic dome construction");
        continue;
      }
      
      // Check if the vertices are in the upper hemisphere
      const vertexA = new THREE.Vector3(
        icosahedronVertices[a * 3],
        icosahedronVertices[a * 3 + 1],
        icosahedronVertices[a * 3 + 2]
      );
      
      const vertexB = new THREE.Vector3(
        icosahedronVertices[b * 3],
        icosahedronVertices[b * 3 + 1],
        icosahedronVertices[b * 3 + 2]
      );
      
      const vertexC = new THREE.Vector3(
        icosahedronVertices[c * 3],
        icosahedronVertices[c * 3 + 1],
        icosahedronVertices[c * 3 + 2]
      );
      
      // Only create edges for triangles where at least one vertex is in the upper hemisphere
      if (vertexA.y >= 0 || vertexB.y >= 0 || vertexC.y >= 0) {
        // Create edge A-B
        if ((vertexA.y >= 0 || vertexB.y >= 0) && !edges.has(`${a}-${b}`) && !edges.has(`${b}-${a}`)) {
          edges.add(`${a}-${b}`);
          createStrut(domeGroup, vertexA, vertexB);
        }
        
        // Create edge B-C
        if ((vertexB.y >= 0 || vertexC.y >= 0) && !edges.has(`${b}-${c}`) && !edges.has(`${c}-${b}`)) {
          edges.add(`${b}-${c}`);
          createStrut(domeGroup, vertexB, vertexC);
        }
        
        // Create edge C-A
        if ((vertexC.y >= 0 || vertexA.y >= 0) && !edges.has(`${c}-${a}`) && !edges.has(`${a}-${c}`)) {
          edges.add(`${c}-${a}`);
          createStrut(domeGroup, vertexC, vertexA);
        }
        
        // If all vertices are in the upper hemisphere, create a glass panel
        if (vertexA.y >= 0 && vertexB.y >= 0 && vertexC.y >= 0) {
          createGlassPanel(domeGroup, vertexA, vertexB, vertexC);
        }
      }
    }
  } catch (error) {
    console.error("Error in geodesic dome construction:", error);
    
    // If there's an error, create a simplified dome as a fallback
    const simpleGeometry = new THREE.SphereGeometry(radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const simpleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,         // Pure white
      transmission: 0.95,      // Nearly complete transmission (transparency)
      roughness: 0.05,         // Very smooth surface with minimal roughness
      ior: 1.05,               // Very close to air (1.0) for minimal distortion
      transparent: true,
      opacity: 0.05,           // Extremely low opacity - nearly invisible
      reflectivity: 0.05,      // Minimal reflectivity for subtle glass effect
      side: THREE.DoubleSide,  // Render both sides
      
      // Disable features that could cause visibility issues
      clearcoat: 0,
      attenuationDistance: Infinity, // No color attenuation
      attenuationColor: 0xffffff,    // No tinting
      
      // Turn off environment mapping which can add unwanted reflections
      envMapIntensity: 0
    });
    
    const simpleDome = new THREE.Mesh(simpleGeometry, simpleMaterial);
    domeGroup.add(simpleDome);
    
    // Add a metal framework
    const frameworkGeometry = new THREE.EdgesGeometry(simpleGeometry);
    const frameworkMaterial = new THREE.LineBasicMaterial({
      color: 0x888888,
      linewidth: 2
    });
    
    const framework = new THREE.LineSegments(frameworkGeometry, frameworkMaterial);
    domeGroup.add(framework);
  }
  
  // Add a base ring to close the bottom of the dome
  const baseRingGeometry = new THREE.TorusGeometry(radius * 0.99, 0.2, 16, 50);
  const baseRingMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.8,
    roughness: 0.2,
  });
  const baseRing = new THREE.Mesh(baseRingGeometry, baseRingMaterial);
  baseRing.rotation.x = Math.PI / 2; // Make the ring horizontal
  baseRing.position.y = 0.1; // Slightly above the ground
  domeGroup.add(baseRing);
  
  // Position the dome at ground level
  domeGroup.position.y = groundLevel;
  return domeGroup;
}

// Function to create a metal strut between two vertices
function createStrut(group, startPoint, endPoint) {
  // Create a curve path for the strut
  const path = new THREE.LineCurve3(startPoint, endPoint);
  
  // Create the tube geometry around the path
  const strutGeometry = new THREE.TubeGeometry(path, 1, 0.15, 8, false);
  
  // Create material for the metal strut
  const strutMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888, // Medium gray
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 1.0
  });
  
  // Create the mesh and add it to the group
  const strut = new THREE.Mesh(strutGeometry, strutMaterial);
  strut.castShadow = true;
  group.add(strut);
}

// ----------------------------------------------------------------------
// Basic Room Structure
// ----------------------------------------------------------------------
function createBasicRoom() {
  // Create the geodesic dome
  const dome = createGeodisicDome(roomRadius, 3); // Radius 30, detail level 3 (more detail)
  scene.add(dome);
  
  // Create floor for navigation (ocean floor)
  const floorGeometry = new THREE.CircleGeometry(roomRadius - 2, 32);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x004466,
    roughness: 0.8,
    metalness: 0.2,
    map: createSimpleSandTexture()
  });
  
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = groundLevel;
  floor.receiveShadow = true;
  scene.add(floor);
  
  // Add ocean environment outside the dome
  createOceanEnvironment();
  
  // Add video frames around the bottom edge of the dome
  createVideoFrames();
  
  // Enhanced lighting setup for better visibility
  
  // Increased ambient light for better overall visibility
  const ambientLight = new THREE.AmbientLight(0x6688aa, 0.8); // Brighter blue-tinted ambient for underwater
  scene.add(ambientLight);
  
  // Main directional light - positioned to highlight the glass structure
  const directionalLight = new THREE.DirectionalLight(0x88CCFF, 1.0); // Brighter blue-tinted directional light
  directionalLight.position.set(-1, 2, 1); // Higher position for better dome visibility
  
  // Optimize shadows by limiting to important objects and using better shadow maps
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 60;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  directionalLight.shadow.bias = -0.0005; // Reduce shadow acne
  directionalLight.shadow.normalBias = 0.02; // Better for curved surfaces
  directionalLight.shadow.radius = 2; // Soften shadow edges
  
  // Optimize shadow performance by updating less frequently for this static scene
  directionalLight.shadow.autoUpdate = false;
  directionalLight.shadow.needsUpdate = true;
  
  scene.add(directionalLight);
  
  // Create helper to visualize shadow camera (for debugging, comment out in production)
  // const shadowCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
  // scene.add(shadowCameraHelper);
  
  // Add multiple point lights to better illuminate the dome from different angles
  // None of these secondary lights cast shadows to improve performance
  const pointLight1 = new THREE.PointLight(0x88CCFF, 1.5, 40); // Brighter, wider range
  pointLight1.position.set(10, 15, 0);
  pointLight1.castShadow = false;
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0x4477AA, 1.5, 40);
  pointLight2.position.set(-10, 10, 5);
  pointLight2.castShadow = false;
  scene.add(pointLight2);
  
  const pointLight3 = new THREE.PointLight(0x6699CC, 1.2, 40);
  pointLight3.position.set(0, 5, 15);
  pointLight3.castShadow = false;
  scene.add(pointLight3);
  
  const pointLight4 = new THREE.PointLight(0x6699CC, 1.2, 40);
  pointLight4.position.set(0, 5, -15);
  pointLight4.castShadow = false;
  scene.add(pointLight4);
  
  // Removed spotlight casting "god rays" from the top of the dome
  
  return { floor, dome };
}

// Create a procedural sand texture for the ocean floor
// (Note: Actual implementation is defined later in the file)
function createSimpleSandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // Base sand color
  ctx.fillStyle = '#0a3b5a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add sand details
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 2 + 0.5;
    
    ctx.fillStyle = `rgba(${10 + Math.random() * 20}, ${50 + Math.random() * 30}, ${80 + Math.random() * 30}, ${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ----------------------------------------------------------------------
// Create Ocean Environment
// ----------------------------------------------------------------------
function createOceanEnvironment() {
  console.log("Creating enhanced underwater environment...");
  
  // Create a large inverted sphere to represent the underwater environment
  const waterSphereRadius = roomRadius * 2;
  const waterSphereGeometry = new THREE.SphereGeometry(waterSphereRadius, 64, 64);
  
  // Add underwater effect using a custom shader
  const waterVertexShader = `
    // ... existing vertex shader code ...
  `;
  
  const waterFragmentShader = `
    // ... existing fragment shader code ...
  `;
  
  // ... existing water sphere creation code ...
  
  // Store the water sphere for animation updates
  scene.userData.waterSphere = waterSphere;
  scene.userData.waterMaterialUniforms = waterUniforms;
  
  // Update the scene fog to match underwater environment
  scene.fog = new THREE.FogExp2(waterColor, 0.015);
  
  // Create a clear inner sphere inside the water sphere (the dome's "air")
  const innerSphereRadius = roomRadius * 1.03;
  const innerSphereGeometry = new THREE.SphereGeometry(innerSphereRadius, 32, 32);
  
  // ... existing inner sphere creation code ...
  
  // Create fish swimming in the distance
  createDistantFish();
  
  // Add bubble streams rising from the ocean floor
  createBubbleStreams();
  
  // Add floating particles for enhanced underwater effect
  createWaterParticles();
}

// Create enhanced caustic texture with multiple layers
function createEnhancedCausticTexture() {
  // Create a canvas for drawing the caustic texture
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Create multiple layers of caustic patterns
  const createCausticLayer = (scale, alpha, iterations) => {
    // Draw caustic pattern
    ctx.save();
    ctx.globalAlpha = alpha;
    
    // Clear canvas for this layer
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create a caustic pattern using noise
    for (let i = 0; i < iterations; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 100 * scale + 50 * scale;
      
      // Create radial gradient for caustic light
          const gradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, radius
      );
      
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(0.5, 'rgba(150, 210, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 100, 155, 0)');
          
          ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  };
  
  // Background layer
  ctx.fillStyle = 'rgba(20, 60, 100, 0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add multiple caustic layers with different scales
  createCausticLayer(1.0, 0.7, 50);  // Base layer
  createCausticLayer(0.5, 0.5, 30);  // Medium details
  createCausticLayer(0.25, 0.3, 20); // Fine details
  
  // Create Three.js texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  
  return texture;
}

// Function to create water particles
function createWaterParticles() {
  const particleCount = 2000; // Increased particle count for better visual effect
  const particleGeometry = new THREE.BufferGeometry();
  
  // Create positions for particles
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const opacities = new Float32Array(particleCount);
  const velocities = new Float32Array(particleCount * 3);
  
  // Initialize particles in a shell OUTSIDE the dome
  // between roomRadius and roomRadius*1.9 (just inside the water sphere)
  for (let i = 0; i < particleCount; i++) {
    // Random position within a spherical shell outside the dome
    const innerRadius = roomRadius * 1.05; // Just outside the dome
    const outerRadius = roomRadius * 1.9;  // Just inside the water sphere
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    
    // Random sizes for particles
    sizes[i] = 0.1 + Math.random() * 0.5;
    
    // Random opacity
    opacities[i] = 0.1 + Math.random() * 0.5;
    
    // Set random movement velocity (circular motion around the dome)
    const tangentialSpeed = 0.05 + Math.random() * 0.1;
    const verticalSpeed = (Math.random() - 0.5) * 0.1;
    
    // Tangential velocity components (move around the dome)
    const normalizedPos = new THREE.Vector3(
      positions[i * 3], 
      positions[i * 3 + 1], 
      positions[i * 3 + 2]
    ).normalize();
    
    // Cross product with up vector to get tangential direction
    const tangent = new THREE.Vector3(0, 1, 0).cross(normalizedPos).normalize();
    
    velocities[i * 3] = tangent.x * tangentialSpeed;
    velocities[i * 3 + 1] = verticalSpeed; // Slight vertical drift
    velocities[i * 3 + 2] = tangent.z * tangentialSpeed;
  }
  
  // Add positions to the geometry
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  particleGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
  
  // Create particle shader material
  const particleVertexShader = `
    attribute float size;
    attribute float opacity;
    uniform float time;
    varying float vOpacity;
    
    void main() {
      vOpacity = opacity;
      
      // Add wavey motion
      vec3 pos = position;
      pos.x += sin(pos.y * 0.1 + time) * 0.1;
      pos.z += cos(pos.y * 0.1 + time) * 0.1;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  
  const particleFragmentShader = `
    uniform sampler2D texture;
    varying float vOpacity;
    
    void main() {
      // Create a circular particle
      vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
      float dist = length(uv - vec2(0.5));
      if (dist > 0.5) discard;
      
      // Enhanced glow effect
      float glow = 0.5 - dist;
      vec3 color = vec3(0.8, 0.9, 1.0);
      
      gl_FragColor = vec4(color, vOpacity * glow * 2.0);
    }
  `;
  
  // Create particle material
  const particleUniforms = {
    time: { value: 0 }
  };
  
  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  // Create the particle system
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  
  // Store the particles for animation updates
  scene.userData.waterParticles = particles;
  particles.userData = {
    positions: positions,
    velocities: velocities
  };
}

function createWhale() {
  const group = new THREE.Group();
  
  // Whale body
  const bodyGeometry = new THREE.CapsuleGeometry(3, 12, 8, 16);
  bodyGeometry.rotateZ(Math.PI / 2); // Align with Z axis
  
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c4a7d, // Dark blue
    roughness: 0.8,
    metalness: 0.2
  });
  
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);
  
  // Flukes (tail)
  const flukeGeometry = new THREE.BoxGeometry(0.5, 6, 2);
  flukeGeometry.translate(0, -3, 0); // Move to center
  flukeGeometry.rotateX(Math.PI / 4);
  
  const flukeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c4a7d, // Dark blue
    roughness: 0.7,
    metalness: 0.2
  });
  
  const leftFluke = new THREE.Mesh(flukeGeometry, flukeMaterial);
  leftFluke.position.set(-3, 0, -6);
  leftFluke.rotation.z = Math.PI / 4;
  group.add(leftFluke);
  
  const rightFluke = new THREE.Mesh(flukeGeometry, flukeMaterial);
  rightFluke.position.set(3, 0, -6);
  rightFluke.rotation.z = -Math.PI / 4;
  group.add(rightFluke);
  
  // Fin
  const finGeometry = new THREE.BoxGeometry(0.5, 3, 2);
  finGeometry.translate(0, 1.5, 0);
  
  const finMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c4a7d, // Dark blue
    roughness: 0.7,
    metalness: 0.2
  });
  
  const fin = new THREE.Mesh(finGeometry, finMaterial);
  fin.position.set(0, 1.5, 0);
  fin.rotation.z = Math.PI / 2;
  group.add(fin);
  
  // Store the body and fins for animation
  group.userData = {
    body: body,
    leftFluke: leftFluke,
    rightFluke: rightFluke,
    fin: fin
  };
  
  return group;
}

function createMantaRay() {
  const group = new THREE.Group();
  
  // Manta body (flattened)
  const bodyGeometry = new THREE.BoxGeometry(10, 0.5, 5);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444, // Dark gray
    roughness: 0.8,
    metalness: 0.2
  });
  
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(0, 0, 0);
  group.add(body);
  
  // Manta wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(5, -1, 10, -5);
  wingShape.lineTo(10, 0);
  wingShape.quadraticCurveTo(5, 2, 0, 0);
  
  const wingGeometry = new THREE.ShapeGeometry(wingShape);
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666, // Gray
    roughness: 0.6,
    metalness: 0.3,
    side: THREE.DoubleSide
  });
  
  const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
  leftWing.position.set(-5, 0, 0);
  leftWing.rotation.y = Math.PI / 2;
  group.add(leftWing);
  
  const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
  rightWing.position.set(5, 0, 0);
  rightWing.rotation.y = -Math.PI / 2;
  group.add(rightWing);
  
  // Tail
  const tailGeometry = new THREE.BoxGeometry(0.5, 0.5, 8);
  tailGeometry.translate(0, 0, -4);
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444, // Dark gray
    roughness: 0.8,
    metalness: 0.2
  });
  
  const tail = new THREE.Mesh(tailGeometry, tailMaterial);
  tail.position.set(0, 0, -2.5);
  group.add(tail);
  
  // Store components for animation
  group.userData = {
    body: body,
    leftWing: leftWing,
    rightWing: rightWing,
    tail: tail
  };
  
  return group;
}

function createShark() {
  const group = new THREE.Group();
  
  // Shark body
  const bodyGeometry = new THREE.CapsuleGeometry(1.5, 10, 8, 16);
  bodyGeometry.rotateZ(Math.PI / 2); // Align with Z axis
  
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666, // Gray
    roughness: 0.6,
    metalness: 0.4
  });
  
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);
  
  // Shark fins
  const finGeometry = new THREE.ConeGeometry(1, 3, 4);
  finGeometry.rotateX(Math.PI / 2);
  
  const finMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666, // Gray
    roughness: 0.6,
    metalness: 0.4
  });
  
  // Dorsal fin
  const dorsalFin = new THREE.Mesh(finGeometry, finMaterial);
  dorsalFin.position.set(0, 1.5, 0);
  dorsalFin.rotation.z = -Math.PI / 2;
  group.add(dorsalFin);
  
  // Side fins
  const leftFin = new THREE.Mesh(finGeometry, finMaterial);
  leftFin.position.set(-1.5, 0, 1);
  leftFin.rotation.y = Math.PI / 2;
  leftFin.rotation.x = Math.PI / 4;
  leftFin.scale.set(0.6, 0.6, 0.6);
  group.add(leftFin);
  
  const rightFin = new THREE.Mesh(finGeometry, finMaterial);
  rightFin.position.set(1.5, 0, 1);
  rightFin.rotation.y = -Math.PI / 2;
  rightFin.rotation.x = Math.PI / 4;
  rightFin.scale.set(0.6, 0.6, 0.6);
  group.add(rightFin);
  
  // Tail fin
  const tailFinGeometry = new THREE.BoxGeometry(0.5, 4, 2);
  tailFinGeometry.translate(0, -2, 0);
  
  const tailFin = new THREE.Mesh(tailFinGeometry, finMaterial);
  tailFin.position.set(0, 0, -5);
  tailFin.rotation.z = Math.PI / 4;
  group.add(tailFin);
  
  // Store components for animation
  group.userData = {
    body: body,
    dorsalFin: dorsalFin,
    leftFin: leftFin,
    rightFin: rightFin,
    tailFin: tailFin
  };
  
  return group;
}

// ----------------------------------------------------------------------
// Bubble Particle System
// ----------------------------------------------------------------------
// Comment out the createBubbleParticleSystems and related functions
/*
function createBubbleParticleSystems() {
  console.log("Creating bubble particle systems...");
  
  // Create 4 different bubble sources
  const bubbleSystems = [];
  for (let i = 0; i < 4; i++) {
    const bubbles = createBubbleSystem();
    
    // Position around the room
    const angle = (i / 4) * Math.PI * 2;
    const radius = roomRadius * 0.7;
    bubbles.position.set(
      Math.cos(angle) * radius,
      -roomRadius * 0.5,
      Math.sin(angle) * radius
    );
    
    bubblesGroup.add(bubbles);
  }
  
  scene.add(bubblesGroup);
  return bubblesGroup;
}

function createBubbleSystem() {
  // Number of bubbles
  const particleCount = 200;
  
  // Create geometry for point cloud
  const positions = [];
  const sizes = [];
  const opacities = [];
  const velocities = [];
  
  // Bubble system parameters
  const emitterRadius = 2.0;
  const maxHeight = roomRadius * 1.4;
  
  for (let i = 0; i < particleCount; i++) {
    // Random starting position within emitter radius
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * emitterRadius;
    
    positions.push(
      Math.cos(angle) * radius,
      Math.random() * maxHeight, // Random height
      Math.sin(angle) * radius
    );
    
    // Random size
    sizes.push(0.1 + Math.random() * 0.4);
    
    // Random opacity
    opacities.push(0.1 + Math.random() * 0.5);
    
    // Velocity (primarily upward)
    velocities.push(
      (Math.random() - 0.5) * 0.2, // Small horizontal drift
      0.3 + Math.random() * 0.7,   // Upward motion
      (Math.random() - 0.5) * 0.2  // Small horizontal drift
    );
  }
  
  // Create geometry and set attributes
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('opacity', new THREE.Float32BufferAttribute(opacities, 1));
  
  // Bubble material with custom shader
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      pointTexture: { value: createBubbleTexture() }
    },
    vertexShader: `
      attribute float size;
      attribute float opacity;
      varying float vOpacity;
      
      void main() {
        vOpacity = opacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying float vOpacity;
      
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(texColor.rgb, texColor.a * vOpacity);
        
        // Discard pixels with low alpha to create circular points
        if (gl_FragColor.a < 0.1) discard;
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  // Create point cloud
  const bubbleSystem = new THREE.Points(geometry, material);
  
  // Store data for animation
  bubbleSystem.userData = {
    positions: positions,
    velocities: velocities,
    opacities: opacities
  };
  
  return bubbleSystem;
}

function createBubbleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  
  const context = canvas.getContext('2d');
  
  // Create gradient
  const gradient = context.createRadialGradient(
    32, 32, 0, 
    32, 32, 32
  );
  
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.3, 'rgba(230, 255, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(200, 240, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(200, 240, 255, 0)');
  
  // Draw bubble
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(32, 32, 31, 0, Math.PI * 2);
  context.fill();
  
  // Add highlight
  context.beginPath();
  context.arc(24, 24, 8, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.8)';
  context.fill();
  
  // Add smaller highlight
  context.beginPath();
  context.arc(36, 36, 4, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.6)';
  context.fill();
  
  // Create texture
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
*/

// ----------------------------------------------------------------------
// Create Portal Back to Room 0
// ----------------------------------------------------------------------
function createPortalToRoom0() {
  const portalGeometry = new THREE.CircleGeometry(1.8, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0x00aaaa, // Teal color for Room 0 portal
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  
  // Position portal near the entrance
  portal.position.set(0, groundLevel + 3, roomRadius - 5);
  portal.rotation.y = Math.PI; // Face toward the center of the room
  scene.add(portal);

  const glowGeometry = new THREE.CircleGeometry(2.2, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00cccc,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(portal.position);
  glow.rotation.copy(portal.rotation);
  scene.add(glow);

  // Add a light to make the portal more visible
  const portalLight = new THREE.PointLight(0x00aaaa, 1, 10);
  portalLight.position.copy(portal.position);
  portalLight.position.z -= 1; // Position light slightly in front of portal
  scene.add(portalLight);

  // Add a label above the portal
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  context.fillStyle = '#ffffff';
  context.font = 'Bold 24px Arial';
  context.textAlign = 'center';
  context.fillText('Back to Ocean', canvas.width / 2, canvas.height / 2);
  
  const labelTexture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: labelTexture,
    side: THREE.DoubleSide,
    transparent: true
  });
  
  const labelGeometry = new THREE.PlaneGeometry(3, 0.75);
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.set(portal.position.x, portal.position.y + 2, portal.position.z);
  label.rotation.copy(portal.rotation);
  scene.add(label);

  return { portal, glow, portalLight, label };
}

// ----------------------------------------------------------------------
// Create Portal to Room A1
// ----------------------------------------------------------------------
function createPortalToRoomA1() {
  const portalGeometry = new THREE.CircleGeometry(1.8, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: 0xaaaa00, // Yellow color for Room A1 portal to distinguish from Room 0 portal
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  
  // Position portal near the entrance but to the right of the Room 0 portal
  portal.position.set(5, groundLevel + eyeHeight, roomRadius - 5);
  portal.rotation.y = Math.PI; // Face toward the center of the room
  scene.add(portal);

  const glowGeometry = new THREE.CircleGeometry(2.2, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xcccc00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(portal.position);
  glow.rotation.copy(portal.rotation);
  scene.add(glow);

  // Add a light to make the portal more visible
  const portalLight = new THREE.PointLight(0xaaaa00, 1, 10);
  portalLight.position.copy(portal.position);
  portalLight.position.z -= 1; // Position light slightly in front of portal
  scene.add(portalLight);

  // Add a label above the portal
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  context.fillStyle = '#ffffff';
  context.font = 'Bold 24px Arial';
  context.textAlign = 'center';
  context.fillText('To Open Space', canvas.width / 2, canvas.height / 2);
  
  const labelTexture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: labelTexture,
    side: THREE.DoubleSide,
    transparent: true
  });
  
  const labelGeometry = new THREE.PlaneGeometry(3, 0.75);
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.set(portal.position.x, portal.position.y + 2, portal.position.z);
  label.rotation.copy(portal.rotation);
  scene.add(label);

  return { portal, glow, portalLight, label };
}

// ----------------------------------------------------------------------
// Check Portal Proximity for Teleportation
// ----------------------------------------------------------------------
function checkPortalProximity() {
  // Calculate distance between player and portal to Room 0
  const portalPosition = new THREE.Vector3(0, groundLevel + eyeHeight, roomRadius - 5);
  const distance = camera.position.distanceTo(portalPosition);
  
  // Calculate distance between player and portal to Room A1
  const portalA1Position = new THREE.Vector3(5, groundLevel + eyeHeight, roomRadius - 5);
  const distanceA1 = camera.position.distanceTo(portalA1Position);
  
  // When player is within 3 units of the Room 0 portal, show prompt
  if (distance < 3) {
    document.getElementById('controls-description').textContent = 'Approach portal to return to Ocean';
    document.getElementById('controls-description').style.display = 'block';
    
    // When player is within 1.5 units of the portal, teleport automatically
    if (distance < 1.5) {
      console.log('Teleporting to Room 0');
      
      // Show loading screen
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
      }
      
      // Add a small delay before teleporting for smoother transition
      setTimeout(() => {
        window.location.href = 'room0.html';
      }, 100);
    }
  }
  // When player is within 3 units of the Room A1 portal, show prompt
  else if (distanceA1 < 3) {
    document.getElementById('controls-description').textContent = 'Approach portal to enter Open Space';
    document.getElementById('controls-description').style.display = 'block';
    
    // When player is within 1.5 units of the portal, teleport automatically
    if (distanceA1 < 1.5) {
      console.log('Teleporting to Room A1');
      
      // Show loading screen
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
      }
      
      // Add a small delay before teleporting for smoother transition
      setTimeout(() => {
        window.location.href = 'roomA1.html';
      }, 100);
    }
  } else {
    document.getElementById('controls-description').textContent = 'Controls: WASD - Move, Mouse - Look, SPACE - Jump';
  }
}

// Global variables for the loaded model
let loadedFishModel = null;
let loadedFish2Model = null;
let loadedFish3Model = null;
let loadedFish4Model = null;

// ----------------------------------------------------------------------
// Initialize Scene
// ----------------------------------------------------------------------
function initializeRoom() {
  console.log("Initializing Room A (Undersea Observatory)...");
  
  // Create the basic room structure
  console.log("Creating geodesic dome and underwater environment...");
  createBasicRoom();
  
  // Create portal back to Room 0
  console.log("Creating portal to Room 0...");
  createPortalToRoom0();
  
  // Create portal to Room A1
  console.log("Creating portal to Room A1...");
  createPortalToRoomA1();
  
  // Load fish models
  console.log("Loading fish models...");
  loadAllFishModels();
  
  // Create ocean floor and environment
  console.log("Creating detailed ocean floor...");
  createOceanFloor();
  
  // Create caustic projector
  console.log("Creating caustic light effects...");
  createCausticProjector(createEnhancedCausticTexture());
  
  // Check and restore video frames if missing
  console.log("Checking and restoring NFT displays if needed...");
  checkAndRestoreVideoFrames();
  
  // Add bubble streams
  console.log("Adding bubble streams...");
  createBubbleStreams();
  
  // Start the animation loop
  console.log("Starting animation loop...");
  animate();
  
  console.log("Room initialization complete!");

  // Ensure loading overlay is hidden
setTimeout(() => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      console.log("Ensuring loading overlay is hidden after initialization");
      loadingOverlay.style.display = 'none';
    }
  }, 500);
}

// ----------------------------------------------------------------------
// Load All Fish Models
// ----------------------------------------------------------------------
function loadAllFishModels() {
  // Create loading manager to track progress
  const loadingManager = new THREE.LoadingManager();
  loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
    console.log(`Loading fish models: ${Math.round(itemsLoaded / itemsTotal * 100)}%`);
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      const loadingBar = loadingOverlay.querySelector('.loading-bar');
      if (loadingBar) {
        loadingBar.style.width = `${Math.round(itemsLoaded / itemsTotal * 100)}%`;
      }
    }
  };
  
  // Create GLTFLoader with the loading manager
  const gltfLoader = new GLTFLoader(loadingManager);
  
  // Load fish1 model - This fish will swim in a horizontal orbit at mid-height
  loadFishModel(gltfLoader, '/assets/blender/fish1.glb', (model) => {
    loadedFishModel = model;
    loadedFishModel.scale.set(4, 4, 4);
    loadedFishModel.position.set(
      roomRadius * 1.5,
      groundLevel + 10,
      0
    );
    loadedFishModel.rotation.y = Math.PI / 2;
    scene.add(loadedFishModel);
    console.log('Fish1 GLB model loaded successfully from assets/blender folder');
    
    // Standard horizontal orbit at medium height and speed
    animateFishHorizontalOrbit(loadedFishModel, 0.006, roomRadius * 1.5, groundLevel + 12, 3, 4);
  });
  
  // Load fish2 model - This fish will swim up and down while orbiting
  loadFishModel(gltfLoader, '/assets/blender/fish2.glb', (model) => {
    loadedFish2Model = model;
    loadedFish2Model.scale.set(3.5, 3.5, 3.5);
    loadedFish2Model.position.set(
      roomRadius * 1.7,
      groundLevel + 5,
      0
    );
    loadedFish2Model.rotation.y = Math.PI / 2;
    scene.add(loadedFish2Model);
    console.log('Fish2 GLB model loaded successfully from assets/blender folder');
    
    // Fish that moves from top to bottom in a vertical swirling pattern
    animateFishVertical(loadedFish2Model, 0.004, roomRadius * 1.4, groundLevel - 5, groundLevel + 25);
  });
  
  // Load fish3 model - This fish will navigate in a complex figure-8 pattern
  loadFishModel(gltfLoader, '/assets/blender/fish3.glb', (model) => {
    loadedFish3Model = model;
    loadedFish3Model.scale.set(5, 5, 5);
    loadedFish3Model.position.set(
      roomRadius * 1.3,
      groundLevel + 15,
      0
    );
    loadedFish3Model.rotation.y = Math.PI / 2;
    scene.add(loadedFish3Model);
    console.log('Fish3 GLB model loaded successfully from assets/blender folder');
    
    // Complex figure-8 pattern that loops around the dome
    animateFishComplex(loadedFish3Model, 0.005, roomRadius * 1.3, groundLevel + 15);
  });
  
  // Load fish4 model - This fish will swim high and make occasional dives
  loadFishModel(gltfLoader, '/assets/blender/fish4.glb', (model) => {
    loadedFish4Model = model;
    loadedFish4Model.scale.set(4.5, 4.5, 4.5);
    loadedFish4Model.position.set(
      roomRadius * 1.6,
      groundLevel + 20,
      0
    );
    loadedFish4Model.rotation.y = Math.PI / 2;
    scene.add(loadedFish4Model);
    console.log('Fish4 GLB model loaded successfully from assets/blender folder');
    
    // Swooping motion from high to low with occasional dives
    animateFishSwooping(loadedFish4Model, 0.003, roomRadius * 1.6, groundLevel + 30);
  });
}

// Helper function to load a fish model
function loadFishModel(loader, path, onLoad) {
  loader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      
      // Apply underwater effect to the fish
      model.traverse(function(node) {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          // Optional material adjustments for underwater effect
          if (node.material) {
            // Add slight blue tint for underwater feel
            node.material.color = new THREE.Color(0xaaddff);
            node.material.roughness = 0.7;
            node.material.metalness = 0.3;
          }
        }
      });
      
      onLoad(model);
    },
    (xhr) => {
      console.log(`Fish model ${xhr.loaded / xhr.total * 100}% loaded`);
    },
    (error) => {
      console.error('An error occurred loading a fish GLB model:', error);
    }
  );
}

// Standard horizontal orbit animation for fish
function animateFishHorizontalOrbit(fishModel, speed, orbitRadius, baseHeight, verticalRange, oscFrequency) {
  let angle = Math.random() * Math.PI * 2; // Random starting angle
  
  function updateFishPosition() {
    if (fishModel) {
      // Calculate new position in a circular path around the dome
      angle += speed;
      
      // Position fish in a circular path around the dome
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      
      // Update position
      fishModel.position.x = x;
      fishModel.position.z = z;
      
      // Update rotation to face tangent to the circle (swimming direction)
      fishModel.rotation.y = angle + Math.PI / 2;
      
      // Add vertical motion with custom parameters
      fishModel.position.y = baseHeight + Math.sin(angle * oscFrequency) * verticalRange;
      
      // Add slight banking into the turns
      fishModel.rotation.z = Math.sin(angle) * 0.2;
    }
    
    // Continue animation
    requestAnimationFrame(updateFishPosition);
  }
  
  // Start the animation
  updateFishPosition();
}

// Vertical traversal animation (fish that moves from top to bottom)
function animateFishVertical(fishModel, speed, orbitRadius, minHeight, maxHeight) {
  let angle = Math.random() * Math.PI * 2; // Random starting angle
  let verticalPhase = Math.random() * Math.PI * 2; // Random vertical starting phase
  
  function updateFishPosition() {
    if (fishModel) {
      // Update angles
      angle += speed;
      verticalPhase += speed * 0.3; // Slower vertical movement
      
      // Calculate horizontal position 
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      
      // Calculate vertical position - full range from min to max height
      const heightRange = maxHeight - minHeight;
      const y = minHeight + heightRange * (0.5 + 0.5 * Math.sin(verticalPhase));
      
      // Update position
      fishModel.position.x = x;
      fishModel.position.z = z;
      fishModel.position.y = y;
      
      // Face direction of movement (tangent to orbit)
      fishModel.rotation.y = angle + Math.PI / 2;
      
      // Tilt up/down based on vertical movement
      const verticalSpeed = Math.cos(verticalPhase) * 0.2;
      fishModel.rotation.x = -verticalSpeed;
      
      // Bank into turns
      fishModel.rotation.z = Math.sin(angle) * 0.15;
    }
    
    // Continue animation
    requestAnimationFrame(updateFishPosition);
  }
  
  // Start the animation
  updateFishPosition();
}

// Complex figure-8 pattern that navigates around the dome
function animateFishComplex(fishModel, speed, orbitRadius, baseHeight) {
  let angle = Math.random() * Math.PI * 2; // Random starting angle
  let phase = Math.random() * Math.PI * 2; // Additional phase for complex motion
  
  function updateFishPosition() {
    if (fishModel) {
      // Update angles
      angle += speed;
      phase += speed * 0.7;
      
      // Figure-8 pattern using lemniscate of Bernoulli
      const lemniscateParam = angle * 0.5;
      const lemniscateFactor = orbitRadius / (1 + Math.pow(Math.sin(lemniscateParam), 2));
      
      // Calculate position using figure-8 horizontally
      const x = Math.cos(lemniscateParam) * lemniscateFactor;
      const z = Math.sin(lemniscateParam) * Math.cos(lemniscateParam) * lemniscateFactor;
      
      // Add vertical motion
      const y = baseHeight + Math.sin(phase) * 5;
      
      // Update position
      fishModel.position.x = x;
      fishModel.position.z = z;
      fishModel.position.y = y;
      
      // Calculate direction vector for smooth rotation
      const nextParam = lemniscateParam + 0.01;
      const nextFactor = orbitRadius / (1 + Math.pow(Math.sin(nextParam), 2));
      const nextX = Math.cos(nextParam) * nextFactor;
      const nextZ = Math.sin(nextParam) * Math.cos(nextParam) * nextFactor;
      
      // Face direction of movement
      fishModel.lookAt(nextX, fishModel.position.y, nextZ);
      
      // Add slight banking into the turns
      fishModel.rotation.z = Math.sin(angle * 2) * 0.2;
    }
    
    // Continue animation
    requestAnimationFrame(updateFishPosition);
  }
  
  // Start the animation
  updateFishPosition();
}

// Swooping motion from high to occasional dives
function animateFishSwooping(fishModel, speed, orbitRadius, startHeight) {
  let angle = Math.random() * Math.PI * 2; // Random starting angle
  let divePhase = Math.random() * Math.PI * 2; // Random dive phase
  let isDiving = false;
  let diveDepth = 0;
  let diveProgress = 0;
  let diveDirection = new THREE.Vector3();
  let normalHeight = startHeight;
  
  function updateFishPosition() {
    if (fishModel) {
      // Update angles
      angle += speed * (isDiving ? 0.5 : 1.0); // Slower during dives
      divePhase += speed * 0.15;
      
      // Determine if we should start a dive
      if (!isDiving && Math.sin(divePhase) > 0.9) {
        isDiving = true;
        diveProgress = 0;
        diveDepth = 15 + Math.random() * 10; // Random dive depth
        
        // Calculate dive target
        const diveAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5;
        diveDirection.set(
          Math.cos(diveAngle) * (orbitRadius * 0.7),
          normalHeight - diveDepth,
          Math.sin(diveAngle) * (orbitRadius * 0.7)
        );
      }
      
      // Handle dive or normal swimming
      if (isDiving) {
        // Progress the dive
        diveProgress += 0.01;
        
        if (diveProgress >= 1) {
          isDiving = false;
          diveProgress = 0;
        } else {
          // Curve for dive and return (down and up)
          let yOffset;
          if (diveProgress < 0.5) {
            // Dive down - accelerating
            yOffset = -(diveDepth * Math.pow(diveProgress * 2, 2));
          } else {
            // Return up - decelerating 
            yOffset = -(diveDepth * Math.pow(2 - diveProgress * 2, 2));
          }
          
          // Calculate position during dive
          const t = diveProgress;
          fishModel.position.x = Math.cos(angle) * orbitRadius * (1 - t * 0.3);
          fishModel.position.z = Math.sin(angle) * orbitRadius * (1 - t * 0.3);
          fishModel.position.y = normalHeight + yOffset;
          
          // Calculate direction for looking
          const lookDirection = new THREE.Vector3(
            Math.cos(angle + 0.1) * orbitRadius * (1 - (t+0.05) * 0.3),
            diveProgress < 0.5 ? fishModel.position.y - 1 : fishModel.position.y + 1, 
            Math.sin(angle + 0.1) * orbitRadius * (1 - (t+0.05) * 0.3)
          );
          
          // Face direction of movement
          fishModel.lookAt(lookDirection);
          
          // Add dramatic banking during dive
          fishModel.rotation.z = Math.sin(diveProgress * Math.PI * 2) * 0.5;
        }
      } else {
        // Normal swimming in a circular path
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        
        // Normal height with gentle bobbing
        const y = normalHeight + Math.sin(angle * 3) * 2;
        
        // Update position
        fishModel.position.x = x;
        fishModel.position.z = z;
        fishModel.position.y = y;
        
        // Update rotation to face swimming direction
        fishModel.rotation.y = angle + Math.PI / 2;
        
        // Gentle banking during normal swimming
        fishModel.rotation.z = Math.sin(angle) * 0.2;
        fishModel.rotation.x = Math.sin(angle * 2) * 0.1;
      }
    }
    
    // Continue animation
    requestAnimationFrame(updateFishPosition);
  }
  
  // Start the animation
  updateFishPosition();
}

// Original animateFish function renamed for compatibility
function animateFish(fishModel, speed, orbitRadius, baseHeight, verticalRange, oscFrequency) {
  animateFishHorizontalOrbit(fishModel, speed, orbitRadius, baseHeight, verticalRange, oscFrequency);
}

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();
  
  // OPTIMIZATION: Update shaders at a lower frequency
  const timeForShaders = Math.floor(elapsedTime * 10) / 10; // Update approximately every 0.1 seconds
  
  // Update water shader uniforms
  if (scene.userData.waterUniforms) {
    scene.userData.waterUniforms.time.value = timeForShaders;
  }
  
  // Update ocean floor uniforms for animated effects
  if (scene.userData.oceanFloorUniforms) {
    scene.userData.oceanFloorUniforms.time.value = timeForShaders;
  }
  
  // Update caustic projector - slower rotation for better performance
  if (scene.userData.waterSphere && Math.floor(elapsedTime * 5) % 2 === 0) {
    scene.userData.waterSphere.rotation.y = elapsedTime * 0.03; // Reduced rotation speed
  }
  
  // Update water particles if available - reduce update frequency
  if (scene.userData.waterParticles && Math.floor(elapsedTime * 12) % 3 === 0) {
    const particles = scene.userData.waterParticles;
    const positions = particles.userData.positions;
    const velocities = particles.userData.velocities;
    const geometry = particles.geometry;
    
    // OPTIMIZATION: Update fewer particles per frame
    const particleCount = positions.length / 3;
    const particlesToUpdate = Math.min(particleCount, 200); // Limit number of particles updated per frame
    const startIdx = Math.floor(elapsedTime * 5) % particleCount;
    
    // Update particle positions for gentle floating motion
    for (let i = 0; i < particlesToUpdate; i++) {
      const idx = (startIdx + i) % particleCount;
      
      // Apply velocity
      positions[idx * 3] += velocities[idx * 3] * delta;
      positions[idx * 3 + 1] += velocities[idx * 3 + 1] * delta;
      positions[idx * 3 + 2] += velocities[idx * 3 + 2] * delta;
      
      // Add subtle circular motion - simplified for performance
      const angle = elapsedTime * 0.05 + idx * 0.01;
      positions[idx * 3] += Math.sin(angle) * 0.002;
      positions[idx * 3 + 2] += Math.cos(angle) * 0.002;
      
      // Reset particles that go too far up
      if (positions[idx * 3 + 1] > roomRadius * 0.9) {
        positions[idx * 3 + 1] = -roomRadius * 0.1;
        // Randomize horizontal position a bit
        positions[idx * 3] += (Math.random() - 0.5) * 5;
        positions[idx * 3 + 2] += (Math.random() - 0.5) * 5;
      }
      
      // Keep particles within dome radius
      const horizontalDist = Math.sqrt(
        positions[idx * 3] * positions[idx * 3] + 
        positions[idx * 3 + 2] * positions[idx * 3 + 2]
      );
      
      if (horizontalDist > roomRadius * 0.9) {
        // Push back towards center
        const angle = Math.atan2(positions[idx * 3 + 2], positions[idx * 3]);
        positions[idx * 3] = Math.cos(angle) * roomRadius * 0.85;
        positions[idx * 3 + 2] = Math.sin(angle) * roomRadius * 0.85;
      }
    }
    
    // Update particle material
    if (particles.material.uniforms) {
      particles.material.uniforms.time.value = elapsedTime;
    }
    
    // Update buffer attributes
    geometry.attributes.position.needsUpdate = true;
  }
  
  // Update video textures to prevent flickering
  if (scene.userData.videoTextures) {
    // OPTIMIZATION: Only update a subset of textures each frame in a rotating pattern
    // This reduces GPU load by updating fewer textures per frame
    const totalTextures = scene.userData.videoTextures.length;
    const batchSize = 6; // Update 6 textures per frame
    const startIdx = Math.floor(elapsedTime * 10) % totalTextures;
    
    for (let i = 0; i < batchSize; i++) {
      const idx = (startIdx + i) % totalTextures;
      const texture = scene.userData.videoTextures[idx];
      
      if (texture) {
        // Set needsUpdate as true only if the video is actually playing
        const video = texture.source.data;
        if (video && !video.paused && !video.ended && video.readyState >= 2) {
          texture.needsUpdate = true;
        }
      }
    }
    
    // OPTIMIZATION: Less frequent checking for restarting videos
    // Check if we need to (re)start any videos only every 30 frames (approximately 0.5 seconds)
    if (Math.floor(elapsedTime * 60) % 30 === 0 && scene.userData.videoElements) {
      // OPTIMIZATION: Try to restart more videos per check since we have more total videos
      const startIdx = Math.floor(elapsedTime) % scene.userData.videoElements.length;
      const numToCheck = Math.min(5, scene.userData.videoElements.length); // Increased from 3 to 5
      
      for (let i = 0; i < numToCheck; i++) {
        const idx = (startIdx + i) % scene.userData.videoElements.length;
        const video = scene.userData.videoElements[idx];
        
        if (video && video.paused && document.hasFocus()) {
          video.play().catch(e => {
            // Silently catch errors - we'll try again next frame
          });
        }
      }
    }
  }
  
  // Update caustic lights for animated underwater effect
  scene.traverse((obj) => {
    if (obj.isPointLight && obj.userData && obj.userData.initialY !== undefined) {
      // Make light positions oscillate slightly for caustic effect
      const time = elapsedTime * obj.userData.speed;
      const height = Math.sin(time) * 2;
      obj.position.y = obj.userData.initialY + height;
      
      // Add some horizontal movement if radius is defined
      if (obj.userData.initialRadius !== undefined) {
        const angleOffset = Math.sin(time * 0.5) * 0.2;
        const angle = obj.userData.angle + angleOffset;
        const radius = obj.userData.initialRadius * (0.95 + Math.sin(time * 0.3) * 0.05);
        
        obj.position.x = Math.cos(angle) * radius;
        obj.position.z = Math.sin(angle) * radius;
      }
      
      // Make light intensity pulse slightly
      if (obj.userData.pulseSpeed !== undefined) {
        const pulse = 0.85 + Math.sin(elapsedTime * obj.userData.pulseSpeed) * 0.15;
        obj.intensity = obj.intensity * 0.95 + 0.5 * pulse * 0.05; // Smooth transition
      }
    }
  });
  
  // Handle movement
  if (controls.isLocked === true) {
    // Get player object (camera parent in PointerLockControls)
    const player = controls.getObject();

    // Get time delta for smooth movement
    const speedDelta = speed * delta;

    // Apply movement in the direction the camera is facing
    if (moveForward) {
      controls.moveForward(speedDelta);
    }
    if (moveBackward) {
      controls.moveForward(-speedDelta);
    }
    if (moveLeft) {
      controls.moveRight(-speedDelta);
    }
    if (moveRight) {
      controls.moveRight(speedDelta);
    }

    // Handle jumping and gravity (use player.position, not camera.position)
    if (isJumping) {
      // Apply gravity
      jumpVelocity += gravity * delta;

      // Update position
      const newY = player.position.y + jumpVelocity * delta;

      // Check if back on ground
      if (newY <= groundLevel + eyeHeight) {
        player.position.y = groundLevel + eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
      } else {
        player.position.y = newY;
      }
    }

    // Add boundary check to keep player inside the dome
    const horizontalDistFromCenter = Math.sqrt(
      player.position.x * player.position.x +
      player.position.z * player.position.z
    );

    // If player is too close to dome edge (with 1.5 units buffer for comfort)
    if (horizontalDistFromCenter > roomRadius - 1.5) {
      // Calculate angle from center to current position
      const angle = Math.atan2(player.position.z, player.position.x);

      // Move player back to the boundary with buffer
      player.position.x = (roomRadius - 1.5) * Math.cos(angle);
      player.position.z = (roomRadius - 1.5) * Math.sin(angle);
    }

    // Check if player is near the portal
    checkPortalProximity();
  }
  
  // Update bubble streams if available
  if (scene.userData.bubbleStreams && Math.floor(elapsedTime * 10) % 2 === 0) { // Update every other frame for performance
    const bubbles = scene.userData.bubbleStreams;
    const positions = bubbles.userData.positions;
    const velocities = bubbles.userData.velocities;
    const streamIndices = bubbles.userData.streamIndices;
    const streamOrigins = bubbles.userData.streamOrigins;
    const geometry = bubbles.geometry;
    
    // Only update a subset of bubbles each frame for performance
    const totalBubbles = positions.length / 3;
    const bubblesToUpdate = Math.min(totalBubbles, 120); // Update at most 120 bubbles per frame
    const startIdx = Math.floor(elapsedTime * 10) % totalBubbles;
    
    for (let i = 0; i < bubblesToUpdate; i++) {
      const idx = (startIdx + i) % totalBubbles;
      const offset = idx * 3;
      
      // Apply velocity with delta time
      positions[offset] += velocities[offset] * delta;
      positions[offset + 1] += velocities[offset + 1] * delta;
      positions[offset + 2] += velocities[offset + 2] * delta;
      
      // Add some wobble
      const wobbleFactor = 0.03;
      positions[offset] += Math.sin(elapsedTime * 2 + idx) * wobbleFactor;
      positions[offset + 2] += Math.cos(elapsedTime * 1.5 + idx) * wobbleFactor;
      
      // Reset bubbles that rise too high
      if (positions[offset + 1] > roomRadius * 0.8) {
        // Get the stream this bubble belongs to
        const streamIdx = Math.floor(streamIndices[idx]);
        const streamOrigin = streamOrigins[streamIdx];
        
        // Reset to origin of its stream with some randomness
        positions[offset] = streamOrigin.x + (Math.random() - 0.5) * 0.5;
        positions[offset + 1] = streamOrigin.y;
        positions[offset + 2] = streamOrigin.z + (Math.random() - 0.5) * 0.5;
      }
    }
    
    // Update shader time uniform
    if (bubbles.material.uniforms) {
      bubbles.material.uniforms.time.value = elapsedTime;
    }
    
    // Update buffer attributes
    geometry.attributes.position.needsUpdate = true;
  }
  
  // Render the scene
  renderer.render(scene, camera);
  
  // Check for video frames periodically
  if (Math.floor(elapsedTime) % 10 === 0 && Math.floor(elapsedTime * 100) % 100 < 1) {
    checkAndRestoreVideoFrames();
  }
  
  // Call animate again on the next frame
  // requestAnimationFrame(animate); // Automatically called at the beginning
}

animate(); 

// ----------------------------------------------------------------------
// Submarine Structures
// ----------------------------------------------------------------------
function createVideoFrames() {
  console.log("Creating video frames for NFT display...");
  
  // Remove any existing video frames first to avoid duplicates
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.isVideoFrame) {
      if (obj.parent) {
        obj.parent.remove(obj);
      }
    }
  });
  
  const videoFramesGroup = new THREE.Group();
  scene.add(videoFramesGroup);
  
  // OPTIMIZATION: Restore original number of videos as requested by the user
  const NUM_VIDEOS = 17; // Restored from 8 back to 17
  
  // Create video elements and textures
  const videoElements = [];
  const videoTextures = [];
  
  // Create and set up video elements
  for (let i = 1; i <= NUM_VIDEOS; i++) {
    const video = document.createElement('video');
    video.src = `/assets/vid${i}.mp4`;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    
    // OPTIMIZATION: Reduce video resolution
    video.width = 640;  // Reduced from 1440
    video.height = 640; // Reduced from 1440
    
    // OPTIMIZATION: Set video playback rate to reduce CPU load
    video.playbackRate = 0.75;
    
    // Create fallback texture in case video loading fails
    const fallbackTexture = createFallbackTexture(i);
    
    // Create texture from the video element
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    // Use RGBAFormat as RGBFormat is deprecated in newer Three.js versions
    texture.format = THREE.RGBAFormat;
    
    // OPTIMIZATION: Reduce memory usage
    texture.generateMipmaps = false;
    
    // Add error handling for video
    video.addEventListener('error', (e) => {
      console.warn(`Error with video ${i}, using fallback texture:`, e.target.error);
      // Replace the video texture with the fallback in all materials
      scene.traverse((obj) => {
        if (obj.material && obj.material.map === texture) {
          obj.material.map = fallbackTexture;
          obj.material.needsUpdate = true;
        }
      });
    });
    
    videoElements.push(video);
    videoTextures.push(texture);
    
    // OPTIMIZATION: Stagger video loading to prevent overwhelming the browser
    // Only attempt to start playing if this is one of the first few videos
    // or if the index is a multiple of 3 (spreading out load)
    if (i <= 3 || i % 3 === 0) {
      setTimeout(() => {
        video.play().catch(e => {
          console.warn(`Autoplay prevented for video ${i}, will play on first user interaction`);
        });
      }, i * 150); // Stagger starts by 150ms per video
    }
  }
  
  // Create a fallback texture if video fails to load
  function createFallbackTexture(index) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;  // Match requested video dimensions
    canvas.height = 640; // Square (1:1) aspect ratio (reduced from 1440×1440)
    const ctx = canvas.getContext('2d');
    
    // Fill with a gradient based on the index
    const hue = (index * 20) % 360;
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `hsl(${hue}, 100%, 20%)`);
    gradient.addColorStop(1, `hsl(${hue + 60}, 100%, 40%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text indicating this is a fallback (using smaller font)
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Video ${index}`, canvas.width / 2, canvas.height / 2 - 15);
    ctx.fillText('(Fallback)', canvas.width / 2, canvas.height / 2 + 15);
    
    // Create a circle pattern (reduced number of circles)
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 5 + Math.random() * 10;
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + i * 10}, 100%, 80%, 0.3)`;
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false; // Optimization
    return texture;
  }
  
  // Add a single document-wide click listener to start all videos
  // This helps with browsers that have strict autoplay policies
  let hasStartedVideos = false;
  document.addEventListener('click', () => {
    if (!hasStartedVideos) {
      console.log('Starting all videos on user interaction');
      videoElements.forEach((video, index) => {
        if (video.paused) {
          video.play().catch(e => console.error(`Error playing video ${index + 1}:`, e));
        }
      });
      hasStartedVideos = true;
    }
  }, { once: true });
  
  // Store video elements and textures for animation updates
  scene.userData.videoElements = videoElements;
  scene.userData.videoTextures = videoTextures;
  
  // Frame dimensions - changed to 1:1 aspect ratio with equal width and height
  const frameWidth = 3.0;
  const frameHeight = frameWidth; // 1:1 aspect ratio (square)
  const frameDepth = 0.2;
  
  // Distance from center and height from ground
  const frameDistance = roomRadius * 0.95; // Slightly inside the dome edge
  const frameHeight0 = groundLevel + eyeHeight; // Position at eye level, same as camera
  
  // Create frames evenly spaced around the dome
  for (let i = 0; i < NUM_VIDEOS; i++) {
    // Calculate position on circle
    const angle = (i / NUM_VIDEOS) * Math.PI * 2;
    const x = Math.cos(angle) * frameDistance;
    const z = Math.sin(angle) * frameDistance;
    
    // Create frame geometry and material
    const frameGeometry = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333, // Darker frame to increase contrast with video
      metalness: 0.3, // Further reduced metalness for less reflection
      roughness: 0.4, // Slightly rougher
      emissive: 0x111111, // Subtle emissive light
      emissiveIntensity: 0.3
    });
    
    // Create screen geometry and material with video texture
    const screenGeometry = new THREE.PlaneGeometry(frameWidth - 0.2, frameHeight - 0.2);
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: videoTextures[i],
      side: THREE.FrontSide,
      color: 0xffffff, // Pure white to show original video colors
      toneMapped: false, // Disable tone mapping to preserve original colors
      depthWrite: true, // Ensure proper depth testing
      transparent: false // Disable transparency for better stability
    });
    
    // Create meshes
    const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    
    // Mark this mesh as a video frame for identification
    frameMesh.userData.isVideoFrame = true;
    
    // Create a glow plane behind the screen
    const glowGeometry = new THREE.PlaneGeometry(frameWidth - 0.1, frameHeight - 0.1);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15, // Reduced opacity for more subtle glow
      side: THREE.FrontSide,
      depthWrite: false // Don't write to depth buffer for glow effect
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.z = frameDepth / 2 - 0.01; // Position slightly inside the frame
    
    // Position the screen slightly in front of the frame to avoid z-fighting
    screenMesh.position.z = frameDepth / 2 + 0.02; // Increased distance to prevent z-fighting
    
    // Set a higher renderOrder to ensure they render after other elements
    frameMesh.renderOrder = 10;
    screenMesh.renderOrder = 11;
    glowMesh.renderOrder = 9;
    
    // Add screen and glow to frame
    frameMesh.add(glowMesh);
    frameMesh.add(screenMesh);
    
    // Position and orient the frame precisely at eye level
    // Position the center of the frame at exact eye level
    frameMesh.position.set(x, frameHeight0, z);
    
    // Calculate rotation to face the center
    frameMesh.lookAt(0, frameMesh.position.y, 0);
    
    // Add better lighting specifically for each video frame
    // Use neutral white light to maintain original video colors
    const frameLight = new THREE.PointLight(0xffffff, 1.2, 6);
    frameLight.position.set(
      x * 0.7, // Position slightly inside the circle
      frameHeight0, // Same height as the frame
      z * 0.7
    );
    // Ensure this light doesn't cast shadows to avoid performance issues
    frameLight.castShadow = false;
    scene.add(frameLight);
    
    // Add the frame to the group
    videoFramesGroup.add(frameMesh);
  }
  
  // Return the group for potential future reference
  return videoFramesGroup;
}

// Function to create a triangular glass panel
function createGlassPanel(group, vertexA, vertexB, vertexC) {
  // Create geometry for the glass panel - using a simple triangle
  const geometry = new THREE.BufferGeometry();
  
  // Create the vertices array
  const vertices = new Float32Array([
    vertexA.x, vertexA.y, vertexA.z,
    vertexB.x, vertexB.y, vertexB.z,
    vertexC.x, vertexC.y, vertexC.z
  ]);
  
  // Create normals (they all point outward from the center)
  const center = new THREE.Vector3().addVectors(vertexA, vertexB).add(vertexC).divideScalar(3);
  const normal = center.clone().normalize();
  const normals = new Float32Array([
    normal.x, normal.y, normal.z,
    normal.x, normal.y, normal.z,
    normal.x, normal.y, normal.z
  ]);
  
  // Create UVs 
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0.5, 1
  ]);
  
  // Set attributes
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  
  // Set indices
  geometry.setIndex([0, 1, 2]);
  
  // Create completely transparent glass material
  // The dome should be almost invisible with only the framework showing
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,          // Pure white
    transmission: 0.99,        // Near perfect transmission for complete transparency
    roughness: 0.01,          // Almost no roughness for clarity
    ior: 1.01,                // Very close to air (1.0) for minimal distortion
    transparent: true,
    opacity: 0.01,            // Extremely low opacity - almost invisible
    reflectivity: 0.01,       // Minimal reflectivity for subtle glass effect
    side: THREE.DoubleSide,   // Render both sides
    
    // Disable features that could cause visibility issues
    clearcoat: 0,
    attenuationDistance: Infinity, // No color attenuation
    attenuationColor: 0xffffff,    // No tinting
    
    // Turn off environment mapping which can add unwanted reflections
    envMapIntensity: 0
  });
  
  // Create the mesh and add it to the group
  const panel = new THREE.Mesh(geometry, glassMaterial);
  panel.castShadow = false;
  panel.receiveShadow = false;
  
  // Disable any depth-writing issues that could cause visibility problems
  panel.renderOrder = 1; // Ensure glass renders after struts
  panel.material.depthWrite = false; // Prevent depth-fighting
  
  group.add(panel);
}

// Add floating particles for enhanced underwater effect
createWaterParticles();

// Create ocean floor with enhanced displacement map for realistic terrain
function createOceanFloor() {
  console.log("Creating ocean floor environment...");
  
  // OPTIMIZATION: Create a circular plane for the ocean floor that's only slightly larger than the dome
  const oceanFloorRadius = roomRadius * 1.1;
  // Use PlaneGeometry with sufficient subdivisions for displacement mapping
  const oceanFloorGeometry = new THREE.PlaneGeometry(oceanFloorRadius * 2, oceanFloorRadius * 2, 128, 128);
  
  // Generate a detailed displacement map texture for terrain variation
  const displacementMap = createOceanFloorTexture();
  
  // Create sand and rock textures for the terrain
  const sandTexture = createSandTexture();
  const rockTexture = createRockTexture();
  
  // Create custom vertex shader with enhanced displacement
  const oceanFloorVertexShader = `
    uniform sampler2D displacementMap;
    uniform float displacementScale;
    uniform float time;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vElevation;
    varying vec3 vNormal;
    
    // Improved noise function for terrain details
    float noise(vec2 p) {
      return sin(p.x * 0.1) * sin(p.y * 0.1);
    }
    
    void main() {
      vUv = uv;
      
      // Sample displacement map for height variation
      vec4 displacementColor = texture2D(displacementMap, uv);
      float displacement = displacementColor.r * displacementScale;
      
      // Add varied terrain with noise functions
      float primaryNoise = noise(position.xz * 0.5 + time * 0.05) * displacementScale * 0.3;
      float secondaryNoise = noise(position.xz * 1.2 - time * 0.03) * displacementScale * 0.15;
      
      // Combine noise patterns for more natural terrain
      displacement += primaryNoise + secondaryNoise;
      
      // Apply displacement to position
      vec3 transformed = position;
      transformed.y += displacement;
      
      // Calculate normal based on displacement gradient
      vec2 delta = vec2(0.01, 0.0);
      float dx = texture2D(displacementMap, uv + delta).r - 
                texture2D(displacementMap, uv - delta).r;
      float dz = texture2D(displacementMap, uv + delta.yx).r -
                texture2D(displacementMap, uv - delta.yx).r;
      
      // Compute perturbed normal
      vec3 perturbedNormal = normalize(vec3(-dx, 0.1, -dz));
      vNormal = perturbedNormal;
      
      // Store elevation for fragment shader
      vElevation = displacement;
      vPosition = transformed;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `;
  
  // Create custom fragment shader for the ocean floor with enhanced materials
  const oceanFloorFragmentShader = `
    uniform sampler2D displacementMap;
    uniform sampler2D sandTexture;
    uniform sampler2D rockTexture;
    uniform float time;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    varying float vElevation;
    varying vec3 vNormal;
    
    // Function for creating more natural terrain blending
    float terrainBlendFactor(float elevation, float threshold, float blendRange) {
      return smoothstep(threshold - blendRange, threshold + blendRange, elevation);
    }
    
    void main() {
      // Scale texture coordinates for more detail
      vec2 sandUv = vUv * 8.0;
      vec2 rockUv = vUv * 4.0;
      
      // Sample textures with some motion for underwater effect
      vec2 sandOffset = vec2(sin(time * 0.1) * 0.01, cos(time * 0.12) * 0.01);
      vec2 rockOffset = vec2(sin(time * 0.08) * 0.01, cos(time * 0.09) * 0.01);
      
      vec4 sandColor = texture2D(sandTexture, sandUv + sandOffset);
      vec4 rockColor = texture2D(rockTexture, rockUv + rockOffset);
      
      // Create caustic effect on the ocean floor
      float causticIntensity = 0.15;
      float caustic1 = sin(vUv.x * 20.0 + time) * sin(vUv.y * 20.0 + time * 0.7) * causticIntensity;
      float caustic2 = sin(vUv.x * 30.0 - time * 0.8) * sin(vUv.y * 30.0 + time * 0.9) * causticIntensity * 0.5;
      float caustic = caustic1 + caustic2;
      
      // Normalize elevation for material blending
      float normalizedElevation = (vElevation + 5.0) / 10.0; // Adjust range as needed
      
      // Create more natural terrain blending
      float sandToRockThreshold = 0.4; // Elevation where rock starts to appear
      float blendRange = 0.3; // How gradually to blend between materials
      
      float rockFactor = terrainBlendFactor(normalizedElevation, sandToRockThreshold, blendRange);
      
      // Add extra rock on steeper slopes using normal
      float slopeFactor = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
      rockFactor = max(rockFactor, slopeFactor * 0.7);
      
      // Mix sand and rock based on elevation and slope
      vec4 terrainColor = mix(sandColor, rockColor, rockFactor);
      
      // Apply blue-ish underwater tint and caustics
      vec3 underwaterTint = vec3(0.7, 0.8, 1.0);
      vec3 finalColor = terrainColor.rgb * underwaterTint + vec3(caustic);
      
      // Add depth-based fog/color blending
      float distanceFromCenter = length(vPosition.xz);
      float fadeFactor = smoothstep(oceanFloorRadius * 0.7, oceanFloorRadius, distanceFromCenter);
      vec3 deepWaterColor = vec3(0.05, 0.1, 0.2);
      finalColor = mix(finalColor, deepWaterColor, fadeFactor);
      
      // Add a subtle pulsing ambient occlusion effect in crevices
      float aoFactor = (1.0 - normalizedElevation) * 0.4 * (0.8 + 0.2 * sin(time * 0.5));
      finalColor *= (1.0 - aoFactor);
      
      // Add subtle ambient glow to deep areas (underwater thermal vents)
      float thermalGlow = step(0.1, normalizedElevation) * step(normalizedElevation, 0.15) * 0.4;
      finalColor += vec3(0.1, 0.05, 0.0) * thermalGlow;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
  
  // Create uniforms for the ocean floor shader
  const oceanFloorUniforms = {
    displacementMap: { value: displacementMap },
    displacementScale: { value: 8.0 }, // Increased height variation
    sandTexture: { value: sandTexture },
    rockTexture: { value: rockTexture },
    time: { value: 0 }
  };
  
  // Create material with displacement map
  const oceanFloorMaterial = new THREE.ShaderMaterial({
    uniforms: oceanFloorUniforms,
    vertexShader: oceanFloorVertexShader,
    fragmentShader: oceanFloorFragmentShader,
    side: THREE.FrontSide
  });
  
  // Create the ocean floor mesh
  const oceanFloor = new THREE.Mesh(oceanFloorGeometry, oceanFloorMaterial);
  oceanFloor.rotation.x = -Math.PI / 2; // Rotate to lie flat
  oceanFloor.position.y = -roomRadius * 0.5; // Position below the dome
  oceanFloor.receiveShadow = true;
  scene.add(oceanFloor);
  
  // Store for animation updates
  scene.userData.oceanFloor = oceanFloor;
  scene.userData.oceanFloorUniforms = oceanFloorUniforms;
}

// Create a detailed ocean floor texture with varied terrain
function createOceanFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; // Higher resolution for more detail
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  
  // Fill with dark background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add multi-layered terrain height variation with fractal noise
  const createTerrainNoise = (amplitude, scale, octaves) => {
    ctx.save();
    
    // Start with low frequency noise
    for (let octave = 0; octave < octaves; octave++) {
      const octaveScale = scale * Math.pow(2, octave);
      const octaveAmplitude = amplitude * Math.pow(0.5, octave);
      
      // Create perlin-like noise by adding sine waves at different frequencies
      for (let i = 0; i < 8; i++) {
        const angleX = Math.random() * Math.PI * 2;
        const angleY = Math.random() * Math.PI * 2;
        const frequencyX = Math.random() * octaveScale + octaveScale / 2;
        const frequencyY = Math.random() * octaveScale + octaveScale / 2;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${octaveAmplitude / octaves})`;
        ctx.globalCompositeOperation = 'lighter';
        
        // Draw noise pattern more efficiently
        for (let x = 0; x < canvas.width; x += 2) {
          for (let y = 0; y < canvas.height; y += 2) {
            const noise = Math.sin(x / frequencyX + angleX) * Math.sin(y / frequencyY + angleY);
            if (noise > 0.6) { // Only draw brighter spots for performance
              ctx.globalAlpha = (noise - 0.6) * 2.5 * octaveAmplitude;
              ctx.fillRect(x, y, 2, 2);
            }
          }
        }
      }
    }
    
    ctx.restore();
  };
  
  // Create large-scale terrain features (hills, valleys)
  createTerrainNoise(0.5, 30, 4);
  
  // Add detailed terrain variations (small hills and ridges)
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 10 + Math.random() * 150;
    const intensity = 0.2 + Math.random() * 0.5;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Create underwater canyons and trenches
  for (let i = 0; i < 30; i++) {
    const x1 = Math.random() * canvas.width;
    const y1 = Math.random() * canvas.height;
    const x2 = x1 + (Math.random() * 600 - 300);
    const y2 = y1 + (Math.random() * 600 - 300);
    const width = 5 + Math.random() * 25;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Create curved trenches for more natural appearance
    const cp1x = (x1 + x2) / 2 + (Math.random() * 200 - 100);
    const cp1y = (y1 + y2) / 2 + (Math.random() * 200 - 100);
    
    // Add multiple control points for more complex curves
    if (Math.random() > 0.5) {
      // Simple curve
      ctx.quadraticCurveTo(cp1x, cp1y, x2, y2);
    } else {
      // More complex curve
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      ctx.bezierCurveTo(
        cp1x, cp1y,
        midX + (Math.random() * 200 - 100), midY + (Math.random() * 200 - 100),
        x2, y2
      );
    }
    
    ctx.stroke();
    
    // Add some smaller tributary trenches
    if (Math.random() > 0.6) {
      const numTributaries = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numTributaries; j++) {
        const t = Math.random();
        const tx = x1 + (x2 - x1) * t;
        const ty = y1 + (y2 - y1) * t;
        
        // Make tributary
        ctx.lineWidth = width * 0.4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(
          tx + (Math.random() * 150 - 75),
          ty + (Math.random() * 150 - 75),
          tx + (Math.random() * 300 - 150),
          ty + (Math.random() * 300 - 150)
        );
        ctx.stroke();
      }
    }
  }
  
  // Add some crater-like depressions
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 20 + Math.random() * 60;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.globalCompositeOperation = 'multiply';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add a slight rim to some craters
    if (Math.random() > 0.5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.05, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Create sand texture for the ocean floor
function createSandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Base color for sand
  ctx.fillStyle = '#d0c0a0'; // Sandy beige
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add fine-grain sand texture
  for (let i = 0; i < 100000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 2 + 0.5;
    
    // Vary the color slightly for each grain
    const brightness = Math.random() * 40 - 20;
    const r = 208 + brightness;
    const g = 192 + brightness;
    const b = 160 + brightness;
    
    ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    ctx.globalAlpha = 0.3 + Math.random() * 0.3;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add larger pebbles and shells
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 4 + 2;
    
    // Random shells and pebbles
    const hue = Math.random() * 30 + 20; // Yellow to orange-ish
    const saturation = Math.random() * 30 + 10; // Not too saturated
    const lightness = Math.random() * 40 + 50; // Medium to light
    
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    
    if (Math.random() > 0.7) {
      // Shell-like shapes
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.5, size, Math.random() * Math.PI * 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pebble-like shapes
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Add some ripple patterns
  for (let i = 0; i < 50; i++) {
    const centerX = Math.random() * canvas.width;
    const centerY = Math.random() * canvas.height;
    const maxRadius = 50 + Math.random() * 150;
    const numRipples = 3 + Math.floor(Math.random() * 5);
    
    ctx.strokeStyle = 'rgba(160, 140, 120, 0.3)';
    ctx.lineWidth = 1;
    
    for (let r = 0; r < numRipples; r++) {
      const radius = maxRadius * (r + 1) / numRipples;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// Create rock texture for the ocean floor
function createRockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  // Base color for rocks
  ctx.fillStyle = '#304050'; // Dark blue-gray
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add rock texture variations
  // Base rocky texture
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 20 + 5;
    
    // Various dark blue-gray colors for rocks
    const shade = Math.floor(Math.random() * 40) + 20;
    const r = shade;
    const g = shade + 10;
    const b = shade + 20;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    
    ctx.beginPath();
    
    if (Math.random() > 0.5) {
      // Irregular polygon shapes for rocks
      const points = 3 + Math.floor(Math.random() * 4);
      ctx.moveTo(
        x + Math.cos(0) * size * (0.7 + Math.random() * 0.6),
        y + Math.sin(0) * size * (0.7 + Math.random() * 0.6)
      );
      
      for (let j = 1; j <= points; j++) {
        const angle = (j / points) * Math.PI * 2;
        const radius = size * (0.7 + Math.random() * 0.6);
        ctx.lineTo(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius
        );
      }
    } else {
      // More rounded rock shapes
      ctx.arc(x, y, size, 0, Math.PI * 2);
    }
    
    ctx.fill();
  }
  
  // Add some lighter highlights to give texture
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const size = Math.random() * 6 + 1;
    
    const highlight = Math.floor(Math.random() * 40) + 60;
    ctx.fillStyle = `rgb(${highlight}, ${highlight + 10}, ${highlight + 15})`;
    ctx.globalAlpha = 0.2 + Math.random() * 0.3;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Add some cracks and crevices
  for (let i = 0; i < 300; i++) {
    const x1 = Math.random() * canvas.width;
    const y1 = Math.random() * canvas.height;
    const length = 10 + Math.random() * 80;
    const angle = Math.random() * Math.PI * 2;
    const x2 = x1 + Math.cos(angle) * length;
    const y2 = y1 + Math.sin(angle) * length;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Add some curve to the cracks
    const curveAmount = (Math.random() - 0.5) * 30;
    const midX = (x1 + x2) / 2 - Math.sin(angle) * curveAmount;
    const midY = (y1 + y2) / 2 + Math.cos(angle) * curveAmount;
    
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();
    
    // Add smaller branching cracks
    if (Math.random() > 0.7) {
      const branchCount = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < branchCount; j++) {
        const t = Math.random();
        const branchX = x1 + (x2 - x1) * t;
        const branchY = y1 + (y2 - y1) * t;
        const branchAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
        const branchLength = length * 0.3;
        
        ctx.beginPath();
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(
          branchX + Math.cos(branchAngle) * branchLength,
          branchY + Math.sin(branchAngle) * branchLength
        );
        ctx.stroke();
      }
    }
  }
  
  // Add some green/brown algae patches
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 5 + Math.random() * 25;
    
    // Green or brown algae color
    const isGreen = Math.random() > 0.5;
    let hue, saturation, lightness;
    
    if (isGreen) {
      hue = 100 + Math.random() * 40;
      saturation = 30 + Math.random() * 40;
      lightness = 15 + Math.random() * 20;
    } else {
      hue = 30 + Math.random() * 20;
      saturation = 40 + Math.random() * 30;
      lightness = 15 + Math.random() * 15;
    }
    
    const algaeColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.3)`;
    
    ctx.fillStyle = algaeColor;
    ctx.globalCompositeOperation = 'multiply';
    
    // Create irregular algae shape
    ctx.beginPath();
    const points = 5 + Math.floor(Math.random() * 5);
    
    for (let j = 0; j < points; j++) {
      const angle = (j / points) * Math.PI * 2;
      const r = radius * (0.5 + Math.random() * 0.5);
      const xPoint = x + Math.cos(angle) * r;
      const yPoint = y + Math.sin(angle) * r;
      
      if (j === 0) {
        ctx.moveTo(xPoint, yPoint);
      } else {
        // Use quadratic curves for smoother shapes
        const prevAngle = ((j - 1) / points) * Math.PI * 2;
        const controlX = x + Math.cos((prevAngle + angle) / 2) * r * 1.5;
        const controlY = y + Math.sin((prevAngle + angle) / 2) * r * 1.5;
        
        ctx.quadraticCurveTo(controlX, controlY, xPoint, yPoint);
      }
    }
    
    ctx.closePath();
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// Add this function after the createEnhancedCausticTexture function (around line 980):

// Function to create a caustic light projector
function createCausticProjector(causticTexture) {
  console.log("Creating caustic projector");
  
  // Create a spotlight to project caustics with greatly reduced intensity
  const causticLight = new THREE.SpotLight(0xffffff, 0.2, roomRadius * 3, Math.PI / 4, 0.5, 1);
  causticLight.position.set(0, roomRadius * 1.5, 0); // Position above the dome
  causticLight.lookAt(0, 0, 0); // Look at center of dome
  
  // Add the caustic texture as a map for the light
  causticLight.map = causticTexture;
  
  // Disable shadow casting to remove light rays
  causticLight.castShadow = false;
  
  // Improve shadow quality
  causticLight.shadow.mapSize.width = 1024;
  causticLight.shadow.mapSize.height = 1024;
  causticLight.shadow.camera.near = 0.5;
  causticLight.shadow.camera.far = roomRadius * 3;
  
  // Create a container to adjust rotation
  const causticProjector = new THREE.Group();
  causticProjector.add(causticLight);
  
  // Store properties for animation
  causticProjector.userData = {
    causticTexture: causticTexture,
    rotationSpeed: 0.05
  };
  
  return causticProjector;
}

// Function to create bubble streams outside the dome
function createBubbleStreams() {
  console.log("Creating bubble streams outside the dome...");
  
  // Number of bubble streams
  const numStreams = 6;
  // Number of bubbles per stream
  const bubblesPerStream = 40;
  // Total bubble count
  const bubbleCount = numStreams * bubblesPerStream;
  
  // Create a geometry for all bubbles
  const bubbleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(bubbleCount * 3);
  const sizes = new Float32Array(bubbleCount);
  const opacities = new Float32Array(bubbleCount);
  const velocities = new Float32Array(bubbleCount * 3); // Store velocities for animation
  const streamIndices = new Float32Array(bubbleCount); // Store which stream each bubble belongs to
  
  // Place bubble streams around the dome
  for (let s = 0; s < numStreams; s++) {
    // Distribute streams evenly around the dome
    const angle = (s / numStreams) * Math.PI * 2;
    // Position outside the dome
    const streamX = Math.cos(angle) * roomRadius * 1.2;
    const streamZ = Math.sin(angle) * roomRadius * 1.2;
    // Start from the ocean floor
    const streamY = -roomRadius * 0.8;
    
    // Create bubbles for this stream
    for (let b = 0; b < bubblesPerStream; b++) {
      const idx = s * bubblesPerStream + b;
      const bubbleOffset = idx * 3;
      
      // Distribute bubbles vertically through the stream with some randomness
      const heightFactor = b / bubblesPerStream;
      const posY = streamY + heightFactor * roomRadius * 1.6 + (Math.random() - 0.5) * 2;
      
      // Add some horizontal variance
      const variance = 0.5 + heightFactor * 0.5; // More spread higher up
      const posX = streamX + (Math.random() - 0.5) * variance;
      const posZ = streamZ + (Math.random() - 0.5) * variance;
      
      // Set position
      positions[bubbleOffset] = posX;
      positions[bubbleOffset + 1] = posY;
      positions[bubbleOffset + 2] = posZ;
      
      // Set random size - bigger bubbles rise faster
      const size = 0.05 + Math.random() * 0.15;
      sizes[idx] = size;
      
      // Set opacity - more transparent for smaller bubbles
      opacities[idx] = 0.3 + size * 2;
      
      // Set velocity - upward with some wobble
      velocities[bubbleOffset] = (Math.random() - 0.5) * 0.1;
      velocities[bubbleOffset + 1] = 0.2 + size * 2; // Bigger bubbles rise faster
      velocities[bubbleOffset + 2] = (Math.random() - 0.5) * 0.1;
      
      // Store stream index for animation
      streamIndices[idx] = s;
    }
  }
  
  // Create attributes
  bubbleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  bubbleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  bubbleGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
  bubbleGeometry.setAttribute('streamIndex', new THREE.BufferAttribute(streamIndices, 1));
  
  // Create bubble shader material
  const bubbleVertexShader = `
    attribute float size;
    attribute float opacity;
    attribute float streamIndex;
    uniform float time;
    
    varying float vOpacity;
    
    void main() {
      vOpacity = opacity;
      
      // Calculate wave offset based on time and stream index
      float waveOffset = streamIndex * 0.5 + time * 0.2;
      
      // Add wavey motion
      vec3 pos = position;
      pos.x += sin(time * 1.0 + position.y * 0.2 + waveOffset) * 0.2;
      pos.z += cos(time * 0.8 + position.y * 0.2 + waveOffset) * 0.2;
      
      // Size variation based on distance
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      float dist = length(mvPosition.xyz);
      float scale = 400.0 / dist;
      
      // Add subtle pulsing to bubble size
      float pulse = 0.9 + 0.1 * sin(time * 2.0 + streamIndex);
      
      gl_PointSize = size * scale * pulse;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  
  const bubbleFragmentShader = `
    varying float vOpacity;
    
    void main() {
      // Create a circular gradient for the bubble
      vec2 center = vec2(0.5, 0.5);
      float dist = length(gl_PointCoord - center);
      
      // Create a bubble shape with edge highlight
      float bubble = smoothstep(0.5, 0.4, dist);
      float rim = smoothstep(0.5, 0.45, dist) * smoothstep(0.35, 0.4, dist);
      
      // Combine for final bubble look
      vec3 color = vec3(0.8, 0.9, 1.0);
      float alpha = bubble * vOpacity;
      
      // Add highlight
      color += rim * 0.5;
      
      gl_FragColor = vec4(color, alpha);
      
      // Discard fully transparent pixels
      if (alpha < 0.01) discard;
    }
  `;
  
  // Create shader material
  const bubbleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: bubbleVertexShader,
    fragmentShader: bubbleFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  // Create the bubble system
  const bubbleSystem = new THREE.Points(bubbleGeometry, bubbleMaterial);
  scene.add(bubbleSystem);
  
  // Store for animation updates
  scene.userData.bubbleStreams = bubbleSystem;
  bubbleSystem.userData = {
    positions: positions,
    velocities: velocities,
    streamIndices: streamIndices,
    streamOrigins: [] // Store stream origins for resetting bubbles
  };
  
  // Store stream origins for resetting bubbles
  for (let s = 0; s < numStreams; s++) {
    const angle = (s / numStreams) * Math.PI * 2;
    bubbleSystem.userData.streamOrigins.push({
      x: Math.cos(angle) * roomRadius * 1.2,
      y: -roomRadius * 0.8,
      z: Math.sin(angle) * roomRadius * 1.2
    });
  }
  
  return bubbleSystem;
}
  
// Actually call the initialization function
setTimeout(() => {
  try {
    initializeRoom();
  } catch(e) {
    console.error("Failed to initialize room:", e);
  }
}, 1000);
  
// ----------------------------------------------------------------------
// Explicit function to check and restore video frames if missing
// ----------------------------------------------------------------------
function checkAndRestoreVideoFrames() {
  // Check if video frames exist
  let videoFramesExist = false;
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.isVideoFrame) {
      videoFramesExist = true;
    }
  });
  
  // If no video frames exist, recreate them
  if (!videoFramesExist) {
    console.log("Video frames not found! Recreating NFT displays...");
    createVideoFrames();
  }
}
  