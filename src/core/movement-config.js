/**
 * Per-room base speed configuration
 * Room 1 & 2: slower (smaller spaces)
 * Room 3: faster (larger cubic gallery)
 * Room 4 & 5: balanced
 */
const ROOM_BASE_SPEED = {
  room1: 25.0,   // Room 1 (main.js) - traditional gallery (small, slow viewing)
  room2: 25.0,   // Room 2 - gallery continuation (small, slow viewing)
  room3: 70.0,   // Room 3 - large cubic gallery (bigger space)
  room4: 65.0,   // Room 4 - floating island
  room5: 60.0    // Room 5 - eternal eclipse
};

/**
 * Global movement configuration for all gallery rooms
 * Provides per-room base speeds with user-adjustable multiplier
 */
export const MOVEMENT_CONFIG = {
  /**
   * Generic base movement speed - fallback for rooms without specific config
   * Per-room speeds defined in ROOM_BASE_SPEED map
   */
  BASE_SPEED: 60.0,

  /**
   * User-adjustable multiplier (0.5x - 2.0x)
   * Currently set to 1.0 (no adjustment)
   * UI slider will modify this value
   */
  speedMultiplier: 1.0,

  /**
   * Get the effective movement speed for a specific room
   * @param {string} roomKey - Optional room identifier (e.g. 'room1', 'room2')
   * @returns {number} Room-specific base speed * speedMultiplier
   */
  getEffectiveSpeed(roomKey) {
    const base = roomKey && ROOM_BASE_SPEED[roomKey]
      ? ROOM_BASE_SPEED[roomKey]
      : this.BASE_SPEED;

    return base * this.speedMultiplier;
  },

  /**
   * Update speed multiplier (for UI slider)
   * @param {number} value - Multiplier value (0.5 - 2.0)
   */
  setSpeedMultiplier(value) {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, value));
  }
};
