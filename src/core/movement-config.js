/**
 * Global movement configuration for all gallery rooms
 * Provides consistent base speed across all rooms
 */
export const MOVEMENT_CONFIG = {
  /**
   * Base movement speed - tunable in one place
   * Previous values ranged from 20.0 (Rooms 1-2) to 100.0 (Rooms 3-4)
   * 60.0 chosen as middle ground for consistent feel
   */
  BASE_SPEED: 60.0,

  /**
   * User-adjustable multiplier (0.5x - 2.0x)
   * Currently set to 1.0 (no adjustment)
   * UI slider will modify this in future phase
   */
  speedMultiplier: 1.0,

  /**
   * Get the effective movement speed
   * @returns {number} BASE_SPEED * speedMultiplier
   */
  getEffectiveSpeed() {
    return this.BASE_SPEED * this.speedMultiplier;
  },

  /**
   * Update speed multiplier (for future UI slider)
   * @param {number} value - Multiplier value (0.5 - 2.0)
   */
  setSpeedMultiplier(value) {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, value));
    // Dispatch event for rooms to update (future phase)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('speedChanged', {
        detail: { speed: this.getEffectiveSpeed() }
      }));
    }
  }
};
