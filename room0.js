// Changes made:
// - Created new Room 0 as the entry point to the NFT gallery
// - Implemented an infinite ocean environment with water shader and animation
// - Added five wooden doors for navigating to different room branches
// - Set up the architecture for branching navigation (Room 0 → Room 1 → Rooms 2-5, Room 0 → Future rooms)
// - Added teleportation triggers for the wooden doors
// - Added simplified fallback implementations for water and sky effects
// - Fixed import issues and loading screen handling
// - Fixed "Cannot set properties of undefined (setting 'value')" error in water animation
// - Implemented flower of life pattern using multiple wood textures for the platform
// - Fixed asset paths to correctly load from the root path instead of public/ prefix
// - Added debug test objects at eye level to verify texture loading
// - Fixed specific error with waterNormals uniform value setting
// - Added loading overlay functionality
// - Increased central platform size
// - Updated door positions to match larger platform
// - Made platform and flower-of-life patterns highly transparent/glass-like
// - Changed Room C door destination to roomC.html
// - Increased initial camera height slightly
// - Replaced Room A portal (door index 1) with a double-sided mirror
// - Reduced base reflectivity of platform and tiles slightly
// - Simplified platform geometry and removed dynamic reflections for performance

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
// Import Water and Sky directly - we'll handle fallbacks in the code
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { getTextureUrl } from './src/core/asset-utils.js';
import { getPortalStyle, PORTAL_COLORS } from './src/core/portal-styles.js';
import { createMultiPortalChecker } from './src/core/portal-utils.js';
import { createHubDoor, animateHubDoor } from './src/core/hub-door-utils.js';

// Hide loading overlay when the page loads
window.addEventListener('load', () => {
  // Use a short timeout to ensure all resources have a chance to initialize
  setTimeout(() => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }, 1000);
});
function checkOrientation() {
  const msg = document.getElementById("rotate-message");
  if (!msg) return;
  if (window.innerWidth < window.innerHeight) {
    msg.style.display = "flex";
  } else {
    msg.style.display = "none";
  }
}
window.addEventListener("load", checkOrientation);
window.addEventListener("resize", checkOrientation);
window.addEventListener("orientationchange", checkOrientation);
if (screen.orientation && screen.orientation.addEventListener) {
  screen.orientation.addEventListener("change", checkOrientation);
}
setTimeout(checkOrientation, 100);


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

// ----------------------------------------------------------------------
// Global Variables
// ----------------------------------------------------------------------
const groundLevel = 0;
const eyeHeight = 2.0;
let isJumping = false;
let jumpVelocity = 0;
const gravity = -30;
const speed = 100.0;
const textureLoader = new THREE.TextureLoader();

// Water level slightly below eye level so player appears to be standing on a platform
const waterLevel = -1.0;

// Create scene, camera and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
// Increase camera height slightly
camera.position.set(0, groundLevel + eyeHeight + 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
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
const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let controls;
let yaw=0,pitch=0;
if(isMobile){
  camera.rotation.order="YXZ";
  controls={isLocked:true,moveRight:(d)=>camera.translateX(d),moveForward:(d)=>camera.translateZ(d)};
  document.getElementById("controls-description").innerHTML="Use joysticks to move and look";
}else{
  controls = new PointerLockControls(camera, document.body);
}


if (!isMobile) {
  window.addEventListener("click", () => {
    if (!controls.isLocked) {
      controls.lock();
    }
  });
  controls.addEventListener("lock", () => {
    document.getElementById("controls-description").style.display = "none";
  });
  controls.addEventListener("unlock", () => {
    document.getElementById("controls-description").style.display = "block";
  });
}

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

if (isMobile) {
  const moveJoystick = nipplejs.create({ zone: document.getElementById("move-joystick"), mode: "static", position: { left: "60px", bottom: "80px" }, color: "white" });
  const lookJoystick = nipplejs.create({ zone: document.getElementById("look-joystick"), mode: "static", position: { right: "60px", bottom: "80px" }, color: "white" });
  moveJoystick.on("move", (evt, data) => {
    moveForward = data.vector.y < -0.3;
    moveBackward = data.vector.y > 0.3;
    moveLeft = data.vector.x < -0.3;
    moveRight = data.vector.x > 0.3;
  });
  moveJoystick.on("end", () => { moveForward = moveBackward = moveLeft = moveRight = false; });
  lookJoystick.on("move", (evt, data) => {
    yaw -= data.vector.x * 0.05;
    pitch -= data.vector.y * 0.05;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  });
}

// ----------------------------------------------------------------------
// Create Infinite Ocean (with fallback)
// ----------------------------------------------------------------------
function createOcean() {
  // Water geometry
  const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

  // Create procedural water normal map as fallback
  const createWaterNormalTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Fill with blue
    ctx.fillStyle = '#0066aa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some noise for normal effect
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 1;
      const color = Math.floor(Math.random() * 40) + 150;
      ctx.fillStyle = `rgb(${color}, ${color + 30}, 255)`;
      ctx.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  };

  // Generate the water texture
  const waterNormals = createWaterNormalTexture();
  
  // Create water - handle potential errors with Water class
  let water;
  try {
    console.log("Creating Water with waterNormals:", waterNormals);
  
    // Try to use Three.js Water with our fallback waterNormals at first
    water = new Water(
      waterGeometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormals,
        sunDirection: new THREE.Vector3(0, 1, 0),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined
      }
    );
    
    // Log water object details for debugging
    console.log("Water created successfully:", water);
    console.log("Water material:", water.material);
    if (water.material) {
      console.log("Water material uniforms:", water.material.uniforms);
    }
    
    water.rotation.x = -Math.PI / 2;
    water.position.y = waterLevel;
    scene.add(water);
    
    // Try to load the real textures in sequence, with fallbacks
    // First try waternormals.jpg (original)
    textureLoader.load(getTextureUrl('waternormals'), function(texture) {
      console.log("Successfully loaded waternormals.webp");
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      
      // FIX: Add additional safety checks before setting the waterNormals uniform value
      try {
        if (water && water.material && water.material.uniforms) {
          console.log("Setting water normal texture to real texture");
          
          // Check if waterNormals uniform exists
          if (water.material.uniforms['waterNormals']) {
            water.material.uniforms['waterNormals'].value = texture;
            water.material.needsUpdate = true;
          } else {
            console.warn("waterNormals uniform doesn't exist, creating it");
            // Create the uniform if it doesn't exist
            water.material.uniforms['waterNormals'] = { value: texture };
            water.material.needsUpdate = true;
          }
        } else {
          console.warn("Could not set water normal texture - missing water material or uniforms");
          console.log("water:", water);
          if (water) console.log("water.material:", water.material);
          if (water && water.material) console.log("water.material.uniforms:", water.material.uniforms);
        }
      } catch (e) {
        console.error("Error setting water normal texture:", e);
      }
    }, undefined, function(err) {
      console.warn("Failed to load waternormals.webp, trying waternormals1.webp", err);
      
      // Try waternormals1.jpg (alternative 1)
      textureLoader.load(getTextureUrl('waternormals1'), function(texture) {
        console.log("Successfully loaded waternormals1.webp");
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        
        // FIX: Add additional safety checks before setting the waterNormals uniform value
        try {
          if (water && water.material && water.material.uniforms) {
            // Check if waterNormals uniform exists
            if (water.material.uniforms['waterNormals']) {
              water.material.uniforms['waterNormals'].value = texture;
              water.material.needsUpdate = true;
            } else {
              console.warn("waterNormals uniform doesn't exist, creating it");
              // Create the uniform if it doesn't exist
              water.material.uniforms['waterNormals'] = { value: texture };
              water.material.needsUpdate = true;
            }
          }
        } catch (e) {
          console.error("Error setting water normal texture:", e);
        }
      }, undefined, function(err) {
        console.warn("Failed to load waternormals1.webp, trying waternormals2.webp", err);
        
        // Try waternormals2.jpg (alternative 2)
        textureLoader.load(getTextureUrl('waternormals2'), function(texture) {
          console.log("Successfully loaded waternormals2.webp");
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(4, 4);
          
          // FIX: Add additional safety checks before setting the waterNormals uniform value
          try {
            if (water && water.material && water.material.uniforms) {
              // Check if waterNormals uniform exists
              if (water.material.uniforms['waterNormals']) {
                water.material.uniforms['waterNormals'].value = texture;
                water.material.needsUpdate = true;
              } else {
                console.warn("waterNormals uniform doesn't exist, creating it");
                // Create the uniform if it doesn't exist
                water.material.uniforms['waterNormals'] = { value: texture };
                water.material.needsUpdate = true;
              }
            }
          } catch (e) {
            console.error("Error setting water normal texture:", e);
          }
        }, undefined, function(err) {
          console.warn("All waternormals texture loading failed, using procedural texture", err);
          // Already using procedural texture as fallback
        });
      });
    });
  } catch (error) {
    console.warn("Using fallback water implementation due to error:", error);
    
    // Fallback implementation - simple blue plane
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x001e0f,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.5
    });
    
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = waterLevel;
    scene.add(water);
    
    // Create a custom uniform for the fallback implementation
    water.customUniforms = { time: { value: 0 } };
    
    // Log water object details for debugging
    console.log("Created fallback water:", water);
    console.log("Fallback water material:", water.material);
    console.log("Fallback water customUniforms:", water.customUniforms);
  }

  return water;
}

// Create sky with fallback
function createSky() {
  let sky, sun;
  
  try {
    // Try to use Three.js Sky
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    sun = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 10); // Sun elevation
    const theta = THREE.MathUtils.degToRad(180); // Sun azimuth

    sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sun);
  } catch (error) {
    console.warn("Using fallback sky implementation", error);
    
    // Fallback implementation - simple sky dome
    const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB, // Sky blue
      side: THREE.BackSide
    });
    
    sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
    
    // Create a simple directional light to simulate the sun
    sun = new THREE.Vector3(0, 1, 0);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(0, 500, 200);
    scene.add(sunLight);
  }
  
  return { sky, sun };
}

// Create central floating platform with flower of life pattern
function createPlatform() {
  const platformGeometry = new THREE.CylinderGeometry(22, 22, 1, 64);
  const platformMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    roughness: 0.1,
    metalness: 0.2,
    transmission: 0.85,
    transparent: true,
    opacity: 0.4
  });

  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.y = waterLevel;
  scene.add(platform);

  return platform;
}

// ----------------------------------------------------------------------
// Create Premium Hub Doors
// ----------------------------------------------------------------------
function createHubDoors() {
  const doors = [];

  // Door configurations - positioned at platform edge (radius 22), facing inward
  const doorConfigs = [
    // Main Gallery - north edge (0→1)
    {
      x: 0, z: 22,
      rotation: Math.PI,
      fromRoom: '0',
      toRoom: '1',
      destination: 'room1.html',
      name: 'Main Gallery'
    },
    // Undersea Observatory - northeast (0→A)
    {
      x: 15.56, z: 15.56,
      rotation: Math.PI + Math.PI / 4,
      fromRoom: '0',
      toRoom: 'A',
      destination: 'roomA.html',
      name: 'Undersea Observatory'
    },
    // NFT Gallery Room - southeast (0→B)
    {
      x: 15.56, z: -15.56,
      rotation: Math.PI + Math.PI / 1.25,
      fromRoom: '0',
      toRoom: 'B',
      destination: 'roomB.html',
      name: 'NFT Gallery Room'
    },
    // Frame Waterfall Gallery - southwest (0→C)
    {
      x: -15.56, z: -15.56,
      rotation: Math.PI - Math.PI / 1.25,
      fromRoom: '0',
      toRoom: 'C',
      destination: 'roomC.html',
      name: 'Frame Waterfall Gallery'
    }
    // Room D excluded (not functional yet)
  ];

  // Create each door using the premium hub door system
  doorConfigs.forEach(config => {
    const hubDoor = createHubDoor({
      scene,
      position: { x: config.x, y: 0, z: config.z },  // Y=0 is camera level, door will ground itself
      rotation: config.rotation,
      fromRoom: config.fromRoom,
      toRoom: config.toRoom,
      name: config.name,
      destination: config.destination,
      groundLevel: waterLevel,  // Doors sit on platform at waterLevel
      createLabel: true
    });

    // Store door object with location info for proximity checking
    doors.push({
      ...hubDoor,
      location: {
        x: config.x,
        y: 2.5,  // Portal activation height (center of door)
        z: config.z,
        destination: config.destination,
        name: config.name
      }
    });
  });

  return doors;
}

// ----------------------------------------------------------------------
// Create Scene Objects
// ----------------------------------------------------------------------
const water = createOcean();
const { sky, sun } = createSky();
const platform = createPlatform();
const doors = createHubDoors();

// Set up multi-portal proximity checker using standardized system
const portalConfigs = [
  {
    position: new THREE.Vector3(doors[0].location.x, doors[0].location.y, doors[0].location.z),
    name: doors[0].location.name,
    url: doors[0].location.destination,
    showDistance: 4.0,
    triggerDistance: 2.0
  },
  {
    position: new THREE.Vector3(doors[1].location.x, doors[1].location.y, doors[1].location.z),
    name: doors[1].location.name,
    url: doors[1].location.destination,
    showDistance: 4.0,
    triggerDistance: 2.0
  },
  {
    position: new THREE.Vector3(doors[2].location.x, doors[2].location.y, doors[2].location.z),
    name: doors[2].location.name,
    url: doors[2].location.destination,
    showDistance: 4.0,
    triggerDistance: 2.0
  },
  {
    position: new THREE.Vector3(doors[3].location.x, doors[3].location.y, doors[3].location.z),
    name: doors[3].location.name,
    url: doors[3].location.destination,
    showDistance: 4.0,
    triggerDistance: 2.0
  }
  // Note: Excluding door 4 (Room D) as it's not functional yet
];

const checkPortalProximity = createMultiPortalChecker({
  camera,
  portals: portalConfigs,
  controlsId: 'controls-description',
  overlayId: 'loading-overlay',
  loadingDelay: 500
});


// Add ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

// Add directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(-1, 1, 1);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

// Door interaction now handled by createMultiPortalChecker() above

// ----------------------------------------------------------------------
// Animation Loop
// ----------------------------------------------------------------------
const clock = new THREE.Clock();

// Add camera position history tracker for delayed reflections 

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const time = Date.now() * 0.001; // Time in seconds
  
  // Update water animation
  if (water) {
    water.material.uniforms['time'].value += delta * 0.5;
  }

  // Animate hub doors (portal pulsing, glow rotation, lights)
  doors.forEach(door => {
    animateHubDoor(door, time);
  });
  
  if (controls.isLocked === true) {
    // Handle jumping and gravity
    if (isMobile) {
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    }
    if (isJumping) {
      camera.position.y += jumpVelocity * delta;
      jumpVelocity += gravity * delta;
      
      if (camera.position.y <= groundLevel + eyeHeight) {
        camera.position.y = groundLevel + eyeHeight;
        isJumping = false;
        jumpVelocity = 0;
      }
    }
    
    // Movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    
    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Check if player is too far from the platform
    const distanceFromCenter = Math.sqrt(
      camera.position.x * camera.position.x + 
      camera.position.z * camera.position.z
    );
    
    // Updated: If too far from platform (beyond 21 units from center), move back
    // Using 21 instead of 22 to give a small buffer from the edge
    if (distanceFromCenter > 21) {
      // Calculate normalized direction from center
      const angle = Math.atan2(camera.position.z, camera.position.x);
      // Move back inside
      camera.position.x = 21 * Math.cos(angle);
      camera.position.z = 21 * Math.sin(angle);
    }
    
    // Check if near doors using standardized portal system
    checkPortalProximity();
  }
  
  renderer.render(scene, camera);
}

animate();
