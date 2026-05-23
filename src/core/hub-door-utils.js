/**
 * Hub Door Utilities - Premium door/gateway system for Room 0 (Ocean Hub)
 *
 * Creates grounded, three-dimensional door structures that look like real gateways,
 * not floating meshes. Integrates with the portal style map for consistent colors.
 */

import * as THREE from 'three';
import { getPortalStyle } from './portal-styles.js';

/**
 * Creates a premium hub door with proper grounding and 3D structure
 *
 * Design concept:
 * - Base platform (plinth) sits flush on the ground
 * - Two vertical pillars frame the doorway
 * - Inner portal plane uses portal color from style map
 * - Optional header/arch connects the pillars
 * - Texture-ready panel for future customization
 *
 * @param {Object} options - Door configuration
 * @param {THREE.Scene} options.scene - Scene to add door to
 * @param {Object} options.position - Position {x, y, z} or Vector3
 * @param {number} options.rotation - Y-axis rotation in radians
 * @param {string} options.fromRoom - Starting room ID (e.g. '0')
 * @param {string} options.toRoom - Destination room ID (e.g. '1', 'A', 'B')
 * @param {string} options.name - Display name for the door
 * @param {string} options.destination - URL to navigate to
 * @param {number} [options.groundLevel=-1.0] - Ground plane Y position
 * @param {boolean} [options.createLabel=true] - Whether to create label above door
 *
 * @returns {Object} { group, portal, pillars, base, label, style }
 */
export function createHubDoor(options) {
  const {
    scene,
    position,
    rotation,
    fromRoom,
    toRoom,
    name,
    destination,
    groundLevel = -1.0,
    createLabel = true
  } = options;

  // Get style from portal map
  const style = getPortalStyle(fromRoom, toRoom);
  const portalColor = style ? style.color : 0xff00ff; // Fallback to magenta if no style

  // Create a group to hold all door components
  const doorGroup = new THREE.Group();

  // Convert position to Vector3 if needed
  const pos = position instanceof THREE.Vector3
    ? position
    : new THREE.Vector3(position.x, position.y, position.z);

  doorGroup.position.copy(pos);
  doorGroup.rotation.y = rotation;

  // ============================================================================
  // 1. BASE PLATFORM (PLINTH)
  // ============================================================================

  // The platform the door sits on, flush with ground
  const baseGeometry = new THREE.BoxGeometry(5, 0.3, 2.5);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,  // Dark blue-grey
    roughness: 0.7,
    metalness: 0.3,
    emissive: portalColor,
    emissiveIntensity: 0.05  // Subtle glow matching portal color
  });

  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  // Position base so its top surface is at groundLevel
  base.position.y = groundLevel - pos.y + 0.15; // 0.15 = half of base height (0.3)
  base.castShadow = true;
  base.receiveShadow = true;
  base.layers.set(1);  // Layer 1 = excluded from water reflections
  doorGroup.add(base);

  // ============================================================================
  // 2. VERTICAL PILLARS
  // ============================================================================

  const pillarWidth = 0.6;
  const pillarHeight = 6;
  const pillarDepth = 0.6;
  const pillarSpacing = 3.5; // Distance between pillar centers

  const pillarGeometry = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarDepth);
  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a3e,  // Slightly lighter than base
    roughness: 0.6,
    metalness: 0.4,
    emissive: portalColor,
    emissiveIntensity: 0.1  // Subtle portal color accent
  });

  // Left pillar
  const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
  leftPillar.position.set(
    -pillarSpacing / 2,
    groundLevel - pos.y + 0.3 + pillarHeight / 2,  // Sit on top of base
    0
  );
  leftPillar.castShadow = true;
  leftPillar.receiveShadow = true;
  leftPillar.layers.set(1);  // Layer 1 = excluded from water reflections
  doorGroup.add(leftPillar);

  // Right pillar
  const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial.clone());
  rightPillar.position.set(
    pillarSpacing / 2,
    groundLevel - pos.y + 0.3 + pillarHeight / 2,
    0
  );
  rightPillar.castShadow = true;
  rightPillar.receiveShadow = true;
  rightPillar.layers.set(1);  // Layer 1 = excluded from water reflections
  doorGroup.add(rightPillar);

  // ============================================================================
  // 3. HEADER/ARCH (connects pillars)
  // ============================================================================

  const headerGeometry = new THREE.BoxGeometry(pillarSpacing + pillarWidth, 0.5, pillarDepth);
  const headerMaterial = pillarMaterial.clone();

  const header = new THREE.Mesh(headerGeometry, headerMaterial);
  header.position.set(
    0,
    groundLevel - pos.y + 0.3 + pillarHeight,  // Top of pillars
    0
  );
  header.castShadow = true;
  header.receiveShadow = true;
  header.layers.set(1);  // Layer 1 = excluded from water reflections
  doorGroup.add(header);

  // ============================================================================
  // 4. INNER PORTAL (the actual gateway)
  // ============================================================================

  const portalGeometry = new THREE.PlaneGeometry(2.65, 4.65);
  const portalMaterial = new THREE.MeshBasicMaterial({
    color: portalColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    toneMapped: false
  });

  const portal = new THREE.Mesh(portalGeometry, portalMaterial);
  portal.position.set(
    0,
    groundLevel - pos.y + 0.3 + pillarHeight / 2,  // Centered vertically in frame
    -0.03
  );
  portal.layers.set(1);  // Layer 1 = excluded from water reflections

  // Store metadata for navigation
  portal.userData = {
    isDoor: true,
    destination,
    name,
    fromRoom,
    toRoom
  };

  doorGroup.add(portal);

  // Portal glow effect removed - was causing reflection issues in water
  // The portal itself provides enough visual presence
  const glow = null;

  // ============================================================================
  // 5. DOOR PANEL (texture-ready surface)
  // ============================================================================

  // This is where custom door textures can be applied in the future
  // For now, it's a semi-transparent overlay that can receive a texture map

  const panelGeometry = new THREE.PlaneGeometry(2.5, 4.5);
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.06,  // Very subtle - will become opaque when texture is added
    // map: null,  // Future: doorTexture goes here
    // normalMap: null  // Future: normal map for surface detail
  });

  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.set(
    0,
    groundLevel - pos.y + 0.3 + pillarHeight / 2,
    -0.02
  );
  panel.userData.isTexturePanel = true;  // Mark for future texture application
  panel.layers.set(1);  // Layer 1 = excluded from water reflections
  doorGroup.add(panel);

  // ============================================================================
  // 6. ACCENT LIGHTS (point lights for ambiance)
  // ============================================================================

  const accentLight = new THREE.PointLight(portalColor, 0.8, 8);
  accentLight.position.set(
    0,
    groundLevel - pos.y + 0.3 + pillarHeight / 2,
    0.5  // Slightly forward
  );
  doorGroup.add(accentLight);

  // ============================================================================
  // 7. LABEL (optional)
  // ============================================================================

  let label = null;
  if (createLabel) {
    label = createDoorLabel({
      text: name,
      color: portalColor,
      x: 0,
      y: groundLevel - pos.y + 0.3 + pillarHeight + 0.8,  // Above header
      z: 0
    });
    doorGroup.add(label);
  }

  // Add complete door group to scene
  scene.add(doorGroup);

  // Return all components for external access
  return {
    group: doorGroup,
    portal,
    glow,
    pillars: { left: leftPillar, right: rightPillar },
    header,
    base,
    panel,
    light: accentLight,
    label,
    style,

    // Helper method to apply texture to panel
    applyTexture: function(texture) {
      if (texture) {
        panel.material.map = texture;
        panel.material.opacity = 1.0;  // Make opaque when texture is applied
        panel.material.needsUpdate = true;
      }
    },

    // Helper method to apply normal map
    applyNormalMap: function(normalTexture) {
      if (normalTexture) {
        panel.material.normalMap = normalTexture;
        panel.material.normalScale = new THREE.Vector2(1.0, 1.0);
        panel.material.needsUpdate = true;
      }
    }
  };
}

/**
 * Creates a text label for a hub door
 *
 * @param {Object} options - Label options
 * @param {string} options.text - Label text
 * @param {number} options.color - Portal color (hex)
 * @param {number} options.x - X position (relative to door group)
 * @param {number} options.y - Y position (relative to door group)
 * @param {number} options.z - Z position (relative to door group)
 * @returns {THREE.Mesh} Label mesh
 */
function createDoorLabel(options) {
  const {
    text,
    color,
    x, y, z
  } = options;

  // Create canvas for text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 128;

  // Draw semi-transparent background
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw glowing text with color-matched glow
  const colorStr = `#${color.toString(16).padStart(6, '0')}`;
  context.shadowColor = colorStr;
  context.shadowBlur = 15;
  context.fillStyle = '#ffffff';
  context.font = 'Bold 36px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  // Create texture and material
  const labelTexture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({
    map: labelTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95
  });

  // Create label mesh
  const labelGeometry = new THREE.PlaneGeometry(3.5, 0.875);
  const label = new THREE.Mesh(labelGeometry, labelMaterial);
  label.position.set(x, y, z);
  label.userData.isBillboard = false;  // Hub doors face fixed directions
  label.layers.set(1);  // Layer 1 = excluded from water reflections

  return label;
}

/**
 * Animates a hub door (portal pulsing, light effects)
 * Call in your animate() loop
 *
 * @param {Object} doorObj - Door object returned by createHubDoor()
 * @param {number} time - Current time in seconds
 */
export function animateHubDoor(doorObj, time) {
  if (!doorObj) return;

  // Pulse portal opacity
  if (doorObj.portal) {
    const basePulse = 0.85;
    const pulseMagnitude = 0.1;
    doorObj.portal.material.opacity = basePulse + Math.sin(time * 1.5) * pulseMagnitude;
  }

  // Glow no longer rotates - removed to prevent spinning frame effect

  // Pulse accent light
  if (doorObj.light) {
    const baseIntensity = 0.8;
    const lightPulse = 0.3;
    doorObj.light.intensity = baseIntensity + Math.sin(time * 2) * lightPulse;
  }
}
