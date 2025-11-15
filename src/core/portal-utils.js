import * as THREE from 'three';

/**
 * Portal Utilities - Reusable portal creation and management functions
 *
 * Usage:
 *   import { createPortal, createPortalProximityChecker } from './src/core/portal-utils.js';
 */

/**
 * Creates a basic circular portal with glow effect
 *
 * @param {Object} options - Portal configuration
 * @param {THREE.Scene} options.scene - Three.js scene to add portal to
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {number} options.z - Z position
 * @param {number} options.color - Portal color (hex, e.g. 0x00ffff)
 * @param {number} [options.size=1.5] - Portal radius
 * @param {number} [options.glowSize=1.8] - Glow radius
 * @param {number} [options.opacity=0.8] - Portal opacity
 * @param {number} [options.glowOpacity=0.3] - Glow opacity
 * @param {number} [options.rotationX=0] - X axis rotation in radians
 * @param {number} [options.rotationY=0] - Y axis rotation in radians
 * @param {number} [options.rotationZ=0] - Z axis rotation in radians
 *
 * @returns {Object} { portal, glow } - Portal and glow meshes
 */
export function createPortal(options) {
  const {
    scene,
    x, y, z,
    color,
    size = 1.5,
    glowSize = 1.8,
    opacity = 0.8,
    glowOpacity = 0.3,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0
  } = options;

  // Create main portal
  const portalGeometry = new THREE.CircleGeometry(size, 32);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: opacity,
    side: THREE.DoubleSide
  });

  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  portal.position.set(x, y, z);
  portal.rotation.set(rotationX, rotationY, rotationZ);
  scene.add(portal);

  // Create glow effect
  const glowGeometry = new THREE.CircleGeometry(glowSize, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: glowOpacity,
    side: THREE.DoubleSide
  });

  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.copy(portal.position);
  glow.rotation.copy(portal.rotation);
  scene.add(glow);

  return { portal, glow };
}

/**
 * Common portal color constants
 */
export const PORTAL_COLORS = {
  TEAL: 0x00ffff,      // Return to hub/Room 0
  PURPLE: 0x8844aa,    // Main progression
  CYAN: 0x00ccff,      // Room 6 (Video Corridor)
  GOLD: 0xffaa00,      // Room 7 (Starry Gallery)
  SILVER: 0xaaaaaa,    // Room 8 (Checkered Frame)
  LIGHT_PURPLE: 0xaa88ff, // Room 9 (Tunnel)
  GREEN: 0x00ff00,     // Alternative
  RED: 0xff0000,       // Warning/exit
  BLUE: 0x0000ff       // Alternative
};

/**
 * Animate portal with rotation effect
 * Call this in your animate() loop
 *
 * @param {Object} portal - Portal mesh
 * @param {Object} glow - Glow mesh
 * @param {number} [speed=0.01] - Rotation speed
 */
export function animatePortal(portal, glow, speed = 0.01) {
  if (portal) portal.rotation.z += speed;
  if (glow) glow.rotation.z -= speed;
}

/**
 * Creates a proximity checker function for portal navigation
 *
 * @param {Object} options - Configuration
 * @param {THREE.Camera} options.camera - Three.js camera
 * @param {THREE.Vector3} options.portalPosition - Portal position
 * @param {string} options.destinationUrl - URL to navigate to (e.g. 'room0.html')
 * @param {string} [options.portalName='Portal'] - Portal display name
 * @param {number} [options.showDistance=3.0] - Distance to show portal message
 * @param {number} [options.triggerDistance=1.8] - Distance to trigger navigation
 * @param {string} [options.controlsId='controls-description'] - Controls element ID
 * @param {string} [options.overlayId='loading-overlay'] - Loading overlay element ID
 * @param {number} [options.loadingDelay=500] - Delay before navigation (ms)
 *
 * @returns {Function} Checker function to call in animate() loop
 */
export function createPortalProximityChecker(options) {
  const {
    camera,
    portalPosition,
    destinationUrl,
    portalName = 'Portal',
    showDistance = 3.0,
    triggerDistance = 1.8,
    controlsId = 'controls-description',
    overlayId = 'loading-overlay',
    loadingDelay = 500
  } = options;

  let hasTriggered = false;

  return function checkProximity() {
    if (hasTriggered) return;

    const distance = camera.position.distanceTo(portalPosition);
    const desc = document.getElementById(controlsId);

    if (distance < showDistance && distance >= triggerDistance) {
      // Show approach message
      if (desc) {
        desc.textContent = `Approach portal to enter ${portalName}`;
      }
    } else if (distance < triggerDistance) {
      // Trigger navigation
      hasTriggered = true;

      const overlay = document.getElementById(overlayId);
      if (overlay) overlay.style.display = 'flex';

      console.log(`Portal triggered! Teleporting to ${portalName}...`);

      setTimeout(() => {
        window.location.href = destinationUrl;
      }, loadingDelay);
    } else {
      // Reset to default message
      if (desc && !hasTriggered) {
        desc.textContent = 'Controls: WASD - Move, Mouse - Look, SPACE - Jump';
      }
    }
  };
}

/**
 * Creates a multi-portal proximity checker that handles multiple portals
 *
 * @param {Object} options - Configuration
 * @param {THREE.Camera} options.camera - Three.js camera
 * @param {Array<Object>} options.portals - Array of portal configurations
 *   Each portal should have: { position, name, url, showDistance?, triggerDistance? }
 * @param {string} [options.controlsId='controls-description'] - Controls element ID
 * @param {string} [options.overlayId='loading-overlay'] - Loading overlay element ID
 * @param {number} [options.loadingDelay=500] - Delay before navigation (ms)
 *
 * @returns {Function} Checker function to call in animate() loop
 */
export function createMultiPortalChecker(options) {
  const {
    camera,
    portals,
    controlsId = 'controls-description',
    overlayId = 'loading-overlay',
    loadingDelay = 500
  } = options;

  let hasTriggered = false;

  return function checkProximity() {
    if (hasTriggered) return;

    for (let i = 0; i < portals.length; i++) {
      const portal = portals[i];
      const showDist = portal.showDistance || 3.0;
      const triggerDist = portal.triggerDistance || 1.8;
      const distance = camera.position.distanceTo(portal.position);

      if (distance < showDist && distance >= triggerDist) {
        const desc = document.getElementById(controlsId);
        if (desc) {
          desc.textContent = `Approach portal to enter ${portal.name}`;
        }
        return; // Show message for closest portal
      } else if (distance < triggerDist) {
        hasTriggered = true;

        const overlay = document.getElementById(overlayId);
        if (overlay) overlay.style.display = 'flex';

        console.log(`Portal triggered! Teleporting to ${portal.name}...`);

        setTimeout(() => {
          window.location.href = portal.url;
        }, loadingDelay);
        return;
      }
    }

    // No portal nearby - show default message
    const desc = document.getElementById(controlsId);
    if (desc && !hasTriggered) {
      desc.textContent = 'Controls: WASD - Move, Mouse - Look, SPACE - Jump';
    }
  };
}

// ============================================================================
// LINKED PORTAL SYSTEM - Integrates with portal-styles.js
// ============================================================================

import { getPortalStyle, FX_TYPES } from './portal-styles.js';

/**
 * Creates a portal using the centralized style map
 *
 * Automatically applies consistent visual style based on room-to-room connection
 *
 * @param {Object} options - Portal configuration
 * @param {THREE.Scene} options.scene - Three.js scene
 * @param {string} options.fromRoom - Starting room ID (e.g. '0', '5', 'A')
 * @param {string} options.toRoom - Destination room ID
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {number} options.z - Z position
 * @param {number} [options.rotationY=0] - Y axis rotation in radians
 * @param {number} [options.rotationX=0] - X axis rotation in radians
 * @param {boolean} [options.createLabel=false] - Whether to create a text label
 *
 * @returns {Object} { portal, glow, style, label? } - Portal components and applied style
 */
export function createLinkedPortal(options) {
  const {
    scene,
    fromRoom,
    toRoom,
    x, y, z,
    rotationY = 0,
    rotationX = 0,
    createLabel = false
  } = options;

  // Get style from centralized map
  const style = getPortalStyle(fromRoom, toRoom);

  if (!style) {
    console.error(`❌ No portal style defined for ${fromRoom} → ${toRoom}`);
    console.error(`   Using fallback style. Please add this connection to portal-styles.js`);

    // Fallback to basic portal
    return createPortal({
      scene,
      x, y, z,
      color: 0xff00ff, // Magenta to make missing styles obvious
      rotationY,
      rotationX
    });
  }

  // Apply style from map
  const fxConfig = FX_TYPES[style.fxType] || FX_TYPES.default;

  const { portal, glow } = createPortal({
    scene,
    x, y, z,
    color: style.color,
    size: style.size,
    glowOpacity: fxConfig.glowIntensity,
    rotationY,
    rotationX
  });

  // Store metadata on portal for debugging and animation
  portal.userData = {
    fromRoom,
    toRoom,
    style: style.fxType,
    label: style.currentLabel,
    rotationSpeed: fxConfig.rotationSpeed
  };

  glow.userData = {
    fromRoom,
    toRoom,
    rotationSpeed: -fxConfig.rotationSpeed  // Counter-rotate
  };

  const result = { portal, glow, style };

  // Optional label creation
  if (createLabel) {
    const label = createPortalLabel(scene, {
      text: style.currentLabel,
      x, y: y + 2, z,
      color: style.color
    });
    result.label = label;
  }

  return result;
}

/**
 * Creates a text label for a portal (canvas-based)
 *
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} options - Label options
 * @param {string} options.text - Label text
 * @param {number} options.x - X position
 * @param {number} options.y - Y position
 * @param {number} options.z - Z position
 * @param {number} [options.color=0x00ffff] - Glow color
 * @returns {THREE.Mesh} Label mesh
 */
export function createPortalLabel(scene, options) {
  const {
    text,
    x, y, z,
    color = 0x00ffff
  } = options;

  // Create canvas for text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 128;

  // Draw semi-transparent background
  context.fillStyle = 'rgba(0, 0, 0, 0.6)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw glowing text
  context.fillStyle = '#ffffff';
  context.font = 'Bold 32px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Add glow effect using color
  const colorStr = `#${color.toString(16).padStart(6, '0')}`;
  context.shadowColor = colorStr;
  context.shadowBlur = 10;
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  // Create texture and material
  const labelTexture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: labelTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  });

  // Create label mesh
  const labelGeometry = new THREE.PlaneGeometry(3, 0.75);
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.set(x, y, z);
  label.userData.isBillboard = true;

  scene.add(label);
  return label;
}

/**
 * Animates portals created with createLinkedPortal
 * Uses rotation speeds from their userData
 *
 * @param {THREE.Mesh} portal - Portal mesh
 * @param {THREE.Mesh} glow - Glow mesh
 */
export function animateLinkedPortal(portal, glow) {
  if (portal && portal.userData.rotationSpeed) {
    portal.rotation.z += portal.userData.rotationSpeed;
  }
  if (glow && glow.userData.rotationSpeed) {
    glow.rotation.z += glow.userData.rotationSpeed;
  }
}
