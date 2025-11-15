/**
 * Portal Style Map - Central configuration for room-to-room portal visuals
 *
 * DESIGN PHILOSOPHY:
 * - Portal pairs (A↔B) must share the same visual style
 * - Consistent orientation (both vertical or both horizontal)
 * - Consistent color and effects
 * - Clear visual language: players learn which portals pair with which
 *
 * STYLE PROPERTIES:
 * - color: Hex color value
 * - orientation: 'vertical' or 'horizontal'
 * - size: Portal radius
 * - fxType: 'default', 'bonus', 'special', 'hub', 'secret'
 */

/**
 * Portal color constants (extended from portal-utils.js)
 */
export const PORTAL_COLORS = {
  // Main progression path
  OCEAN_BLUE: 0x0088ff,      // 0↔1 - Ocean hub to main gallery
  CYAN: 0x00ccff,            // 1↔2 - Main gallery progression
  EMERALD: 0x00ff88,         // 1↔3 - Main gallery to advanced
  PURPLE: 0x8844aa,          // 2↔4, 4↔5 - Deep progression

  // Bonus/Secret areas
  GOLD: 0xffaa00,            // 5↔7 - Bonus: Starry Gallery
  LIGHT_BLUE: 0x66ccff,      // 5↔6 - Bonus: Video Corridor
  SILVER: 0xaaaaaa,          // 5↔8 - Bonus: Abstract Art
  LAVENDER: 0xaa88ff,        // 5↔9 - Bonus: Tunnel

  // Special areas
  TEAL: 0x00ffff,            // Hub return (legacy, being phased out)
  DEEP_BLUE: 0x0055aa,       // A↔A1 - Observatory annex
  AMBER: 0xff8800,           // 0↔C - Concept chamber

  // Future use
  RED: 0xff0000,             // Warning/special
  GREEN: 0x00ff00            // Alternative
};

/**
 * Effect type configurations
 */
export const FX_TYPES = {
  default: {
    glowIntensity: 0.3,
    rotationSpeed: 0.01,
    particles: false
  },
  hub: {
    glowIntensity: 0.5,
    rotationSpeed: 0.015,
    particles: false,
    pulseEffect: true
  },
  bonus: {
    glowIntensity: 0.4,
    rotationSpeed: 0.012,
    particles: false
  },
  special: {
    glowIntensity: 0.6,
    rotationSpeed: 0.02,
    particles: true,
    particleCount: 40
  },
  secret: {
    glowIntensity: 0.25,
    rotationSpeed: 0.008,
    particles: false,
    subtle: true
  }
};

/**
 * Portal Style Map
 *
 * Key format: "fromRoom-toRoom" (bidirectional, order doesn't matter for lookup)
 * Each link defines ONE shared style for both directions
 */
export const PORTAL_STYLES = {
  // Main progression path: 0 → 1 → 2/3 → 4 → 5
  '0-1': {
    color: PORTAL_COLORS.OCEAN_BLUE,
    orientation: 'vertical',
    size: 1.8,
    fxType: 'hub',
    label: {
      from0: 'Main Gallery',
      from1: '← Ocean Hub'
    },
    description: 'Ocean hub to main gallery - primary entry point'
  },

  '1-2': {
    color: PORTAL_COLORS.CYAN,
    orientation: 'vertical',
    size: 1.5,
    fxType: 'default',
    label: {
      from1: 'Room 2 →',
      from2: '← Room 1'
    },
    description: 'Main progression path'
  },

  '1-3': {
    color: PORTAL_COLORS.EMERALD,
    orientation: 'vertical',
    size: 1.5,
    fxType: 'default',
    label: {
      from1: 'Room 3 →',
      from3: '← Room 1'
    },
    description: 'Alternative main path branch'
  },

  '2-3': {
    color: 0x44ff44,  // Lime green - lateral connection between parallel paths
    orientation: 'horizontal',  // Room 2 portal is flat on ground
    size: 1.2,
    fxType: 'default',
    label: {
      from2: 'Room 3 (Ground Portal) →',
      from3: '← Room 2'
    },
    description: 'Cross-connection between Rooms 2 and 3'
  },

  '3-4': {
    color: PORTAL_COLORS.PURPLE,
    orientation: 'horizontal',  // Ground portal in Room 3
    size: 1.2,
    fxType: 'default',
    label: {
      from3: 'Room 4 (Floating Island) →',
      from4: '← Room 3'
    },
    description: 'Path to floating island'
  },

  '4-5': {
    color: PORTAL_COLORS.PURPLE,
    orientation: 'vertical',
    size: 1.8,
    fxType: 'special',
    label: {
      from4: 'Room 5 (Eternal Eclipse) →',
      from5: '← Room 4 (Floating Island)'
    },
    description: 'Deep progression to bonus hub'
  },

  // Bonus hub connections: Room 5 ↔ Rooms 6, 7, 8, 9
  '5-6': {
    color: PORTAL_COLORS.LIGHT_BLUE,
    orientation: 'vertical',
    size: 1.5,
    fxType: 'bonus',
    label: {
      from5: 'Room 6 (Video Corridor) ⬆',
      from6: '← Eternal Eclipse (Room 5)'
    },
    description: 'Bonus: Video corridor'
  },

  '5-7': {
    color: PORTAL_COLORS.GOLD,
    orientation: 'vertical',
    size: 1.5,
    fxType: 'bonus',
    label: {
      from5: 'Room 7 (Starry Gallery) ➡',
      from7: '← Eternal Eclipse (Room 5)'
    },
    description: 'Bonus: Starry gallery'
  },

  '5-8': {
    color: PORTAL_COLORS.SILVER,
    orientation: 'vertical',
    size: 1.5,
    fxType: 'bonus',
    label: {
      from5: 'Room 8 (Abstract Art) ⬅',
      from8: '← Eternal Eclipse (Room 5)'
    },
    description: 'Bonus: Abstract art space'
  },

  '5-9': {
    color: PORTAL_COLORS.LAVENDER,
    orientation: 'vertical',
    size: 1.5,
    fxType: 'bonus',
    label: {
      from5: 'Room 9 (Tunnel) ↗',
      from9: '← Eternal Eclipse (Room 5)'
    },
    description: 'Bonus: Cylindrical tunnel'
  },

  // Special connections
  'A-A1': {
    color: PORTAL_COLORS.DEEP_BLUE,
    orientation: 'vertical',
    size: 1.6,
    fxType: 'special',
    label: {
      fromA: 'Observatory Annex →',
      fromA1: '← Observatory'
    },
    description: 'Observatory to annex'
  },

  '0-C': {
    color: PORTAL_COLORS.AMBER,
    orientation: 'vertical',
    size: 1.5,
    fxType: 'secret',
    label: {
      from0: 'Concept Chamber',
      fromC: '← Ocean Hub'
    },
    description: 'Hub to concept chamber (WIP space)'
  },

  '0-A': {
    color: PORTAL_COLORS.DEEP_BLUE,
    orientation: 'vertical',
    size: 1.8,
    fxType: 'hub',
    label: {
      from0: 'Undersea Observatory',
      fromA: '← Ocean Hub'
    },
    description: 'Hub to observatory'
  },

  '0-B': {
    color: PORTAL_COLORS.EMERALD,
    orientation: 'vertical',
    size: 1.8,
    fxType: 'hub',
    label: {
      from0: 'NFT Gallery Room',
      fromB: '← Ocean Hub'
    },
    description: 'Hub to gallery B'
  }
};

/**
 * Get portal style for a room-to-room connection
 *
 * @param {string} fromRoom - Starting room ID (e.g. '0', '1', 'A')
 * @param {string} toRoom - Destination room ID
 * @returns {Object|null} Portal style configuration or null if not defined
 */
export function getPortalStyle(fromRoom, toRoom) {
  // Try both key orders since links are bidirectional
  const key1 = `${fromRoom}-${toRoom}`;
  const key2 = `${toRoom}-${fromRoom}`;

  const style = PORTAL_STYLES[key1] || PORTAL_STYLES[key2];

  if (!style) {
    console.warn(`⚠️  No portal style defined for ${fromRoom} ↔ ${toRoom}`);
    return null;
  }

  // Return a copy with the appropriate label
  const labelKey = `from${fromRoom}`;
  return {
    ...style,
    currentLabel: style.label[labelKey] || `To Room ${toRoom}`
  };
}

/**
 * Get all portal styles for a given room
 *
 * @param {string} roomId - Room ID (e.g. '0', '5', 'A')
 * @returns {Array<Object>} Array of portal style configs from this room
 */
export function getPortalStylesForRoom(roomId) {
  const styles = [];

  for (const [key, style] of Object.entries(PORTAL_STYLES)) {
    const [room1, room2] = key.split('-');

    if (room1 === roomId || room2 === roomId) {
      const targetRoom = room1 === roomId ? room2 : room1;
      const labelKey = `from${roomId}`;

      styles.push({
        targetRoom,
        ...style,
        currentLabel: style.label[labelKey] || `To Room ${targetRoom}`
      });
    }
  }

  return styles;
}

/**
 * Validate portal style map - checks for consistency issues
 *
 * @returns {Object} Validation report
 */
export function validatePortalStyles() {
  const issues = [];
  const warnings = [];

  // Check for duplicate link definitions
  const seen = new Set();
  for (const key of Object.keys(PORTAL_STYLES)) {
    const [room1, room2] = key.split('-').sort();
    const normalizedKey = `${room1}-${room2}`;

    if (seen.has(normalizedKey)) {
      issues.push(`Duplicate link definition: ${key}`);
    }
    seen.add(normalizedKey);
  }

  // Check for missing labels
  for (const [key, style] of Object.entries(PORTAL_STYLES)) {
    const [room1, room2] = key.split('-');

    if (!style.label[`from${room1}`]) {
      warnings.push(`Missing label from${room1} in ${key}`);
    }
    if (!style.label[`from${room2}`]) {
      warnings.push(`Missing label from${room2} in ${key}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    totalLinks: Object.keys(PORTAL_STYLES).length
  };
}
