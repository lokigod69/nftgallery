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
    textureLoader.load('/assets/waternormals.jpg', function(texture) {
      console.log("Successfully loaded waternormals.jpg");
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
      console.warn("Failed to load waternormals.jpg, trying waternormals1.jpg", err);
      
      // Try waternormals1.jpg (alternative 1)
      textureLoader.load('/assets/waternormals1.jpg', function(texture) {
        console.log("Successfully loaded waternormals1.jpg");
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
        console.warn("Failed to load waternormals1.jpg, trying waternormals2.jpg", err);
        
        // Try waternormals2.jpg (alternative 2)
        textureLoader.load('/assets/waternormals2.jpg', function(texture) {
          console.log("Successfully loaded waternormals2.jpg");
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
// Create Wooden Doors
// ----------------------------------------------------------------------
function createWoodenDoors() {
  const doors = [];
  
  // Updated positions - doors at the edge of the circle (radius 22), all face inward
  const locations = [
    // Main Gallery door - at north edge (z = 22)
    { x: 0, z: 22, y: 2.75, rotation: Math.PI, destination: 'room1.html', name: 'Main Gallery' },
    
    // Room A door - northeast edge
    { x: 15.56, z: 15.56, y: 2.75, rotation: Math.PI + Math.PI / 4, destination: 'roomA.html', name: 'Undersea Observatory' },
    
    // Room B door - southeast edge
    { x: 15.56, z: -15.56, y: 2.75, rotation: Math.PI + Math.PI / 1.25, destination: 'roomB.html', name: 'NFT Gallery Room' },
    
    // Room C door - southwest edge - Updated to point to roomC.html
    { x: -15.56, z: -15.56, y: 2.75, rotation: Math.PI - Math.PI / 1.25, destination: 'roomC.html', name: 'Frame Waterfall Gallery' },
    
    // Room D door - northwest edge
    { x: -15.56, z: 15.56, y: 2.75, rotation: Math.PI - Math.PI / 4, destination: 'future_roomD.html', name: 'Room D (Coming Soon)' }
  ];
  
  // We'll still use textures as normal maps for minimal detail
  let doorTexture = null;
  let doorFrameTexture = null;
  
  // Try to load real textures for subtle normal maps
  textureLoader.load('/assets/wooden_door.jpg', function(texture) {
    doorTexture = texture;
    doors.forEach(door => {
      if (door.door && door.door.material) {
        door.door.material.normalMap = texture;
        door.door.material.normalScale = new THREE.Vector2(0.05, 0.05); // Very subtle
        door.door.material.needsUpdate = true;
      }
    });
  }, undefined, function() {
    console.warn('Failed to load wooden_door.jpg for normal map');
  });
  
  textureLoader.load('/assets/wooden_frame.jpg', function(texture) {
    doorFrameTexture = texture;
    doors.forEach(door => {
      if (door.frame && door.frame.material) {
        door.frame.material.normalMap = texture;
        door.frame.material.normalScale = new THREE.Vector2(0.05, 0.05); // Very subtle
        door.frame.material.needsUpdate = true;
      }
    });
  }, undefined, function() {
    console.warn('Failed to load wooden_frame.jpg for normal map');
  });
  
  // Create each door
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    
    // --- Special Case: Room A Door (Index 1) - Replace with Mirror ---
    if (i === 1) {
      const mirrorGeometry = new THREE.PlaneGeometry(3.5, 5); // Larger shape
      const mirrorMaterial = new THREE.MeshStandardMaterial({
          color: 0xffff00,
          metalness: 0.2,
          roughness: 0.4,
          side: THREE.DoubleSide
      });

      const mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
      mirror.position.set(loc.x, loc.y, loc.z); // Position like other doors
      mirror.rotation.y = loc.rotation; // Rotate like other doors
      mirror.castShadow = false;
      mirror.receiveShadow = true; // Allow receiving shadows

      // Mark as door and store destination/name
      mirror.userData = {
        isDoor: true,
        destination: loc.destination,
        name: loc.name,
        index: i
      };
      scene.add(mirror);

      // Push only the mirror object to the doors array for this index
      doors.push({ door: mirror, frame: null, label: null, location: loc });

      continue; // Skip the default frame/door/label creation for the mirror
    }
    // --- End Special Case for Room A Mirror ---

    // --- Default Door Creation (for indices other than 1) ---
    // Door frame - enlarged
    const frameGeometry = new THREE.BoxGeometry(4, 5.5, 0.2);
    const frameMaterial = new THREE.MeshPhysicalMaterial({ 
      color: 0x66ccff,          // Light blue tint
      roughness: 0.05,          // Very smooth surface
      metalness: 0.1,           // Low metallic look
      transmission: 0.95,       // Extremely high transparency
      transparent: true,
      opacity: 0.15,            // Very low opacity
      reflectivity: 0.2,        // Low reflectivity
      clearcoat: 0.3,           // Subtle clearcoat
      clearcoatRoughness: 0.05,
      ior: 1.5,                 // Glass-like index of refraction
      side: THREE.DoubleSide    // Show both sides of the geometry
    });
    
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(loc.x, loc.y, loc.z);
    frame.rotation.y = loc.rotation;
    frame.castShadow = false;
    frame.receiveShadow = false;
    scene.add(frame);
    
    // Door panel
    const doorGeometry = new THREE.PlaneGeometry(3.5, 5);
    
    // Choose a bright color for each door
    let doorColor;
    switch(i) {
      case 0: doorColor = 0xff0000; break; // Main Gallery - red
      case 1: doorColor = 0x00ff00; break; // Undersea - green
      case 2: doorColor = 0x0000ff; break; // Room B - blue
      case 3: doorColor = 0xffff00; break; // Room C - yellow
      case 4: doorColor = 0xff00ff; break; // Room D - magenta
      default: doorColor = 0xffffff;
    }
    
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: doorColor,
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.DoubleSide,
      emissive: doorColor,
      emissiveIntensity: 0.2
    });
    
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    // Position slightly in front of the frame
    const offset = 0.12;
    door.position.set(
      loc.x + Math.sin(loc.rotation) * offset,
      loc.y,
      loc.z + Math.cos(loc.rotation) * offset
    );
    door.rotation.y = loc.rotation;
    door.castShadow = false;
    door.userData = { 
      isDoor: true,
      destination: loc.destination,
      name: loc.name,
      index: i
    };
    scene.add(door);
    
    // Add glowing text label above door
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Make background transparent
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle glow effect under text
    const gradient = context.createRadialGradient(
      canvas.width/2, canvas.height/2, 5,
      canvas.width/2, canvas.height/2, 50
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.fillStyle = '#ffffff';
    context.font = 'Bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(loc.name, canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const labelTexture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: labelTexture,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const labelGeometry = new THREE.PlaneGeometry(2, 0.5);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    // Position above the door
    label.position.set(
      loc.x,
      loc.y + 3.2,
      loc.z
    );
    label.rotation.y = loc.rotation;
    scene.add(label);
    
    // Push all parts for standard doors
    doors.push({ door, frame, label, location: loc });
    // --- End Default Door Creation ---
  }
  
  return doors;
}

// ----------------------------------------------------------------------
// Create Scene Objects
// ----------------------------------------------------------------------
const water = createOcean();
const { sky, sun } = createSky();
const platform = createPlatform();
const doors = createWoodenDoors();


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

// ----------------------------------------------------------------------
// Door Interaction and Teleportation
// ----------------------------------------------------------------------
function checkDoorProximity() {
  for (const doorObj of doors) {
    const door = doorObj.door;
    const destination = door.userData.destination;
    const name = door.userData.name;
    
    // Calculate distance between player and door
    const doorPosition = new THREE.Vector3(
      door.position.x,
      camera.position.y,
      door.position.z
    );
    
    const distance = camera.position.distanceTo(doorPosition);
    
    // Increased the approach distance from 3 to 4 to account for larger platform
    if (distance < 4) {
      // When close to the door, show instructions
      document.getElementById('controls-description').textContent = `Approach to enter ${name}`;
      document.getElementById('controls-description').style.display = 'block';
      
      // When very close, teleport (increased from 1.5 to 2)
      if (distance < 2) {
        // Show loading screen
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.style.display = 'flex';
        }
        
        console.log(`Teleporting to ${destination}`);
        
        // Allow teleportation to all rooms except Room D (since it doesn't exist yet)
        if (destination === 'room1.html' || destination === 'roomA.html' || 
            destination === 'roomB.html' || destination === 'roomC.html') {
          window.location.href = destination; // Go directly to the destination
        } else {
          // For future rooms, show a message for now
          alert(`${name} is under construction. Coming soon!`);
          // Hide loading overlay
          if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
          }
        }
      }
      
      return; // Exit once we've found a nearby door
    }
  }
  
  // Reset instructions when not near any door
  document.getElementById('controls-description').textContent = 'Controls: WASD - Move, Mouse - Look, ESC - Toggle camera';
}

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
  
  // Reflection updates removed for performance
  
  // Door animation removed
  
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
    
    // Check if near doors
    checkDoorProximity();
  }
  
  renderer.render(scene, camera);
}

animate();
