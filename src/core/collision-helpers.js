/**
 * Collision Helper Functions
 *
 * Centralized collision patterns extracted from Rooms 1 & 2.
 * These helpers apply collision constraints without hardcoding room-specific bounds.
 */

/**
 * Apply outer wall collision - keeps player inside a rectangular boundary
 *
 * @param {THREE.Vector3} position - Player position to constrain (modified in-place)
 * @param {Object} bounds - Wall boundaries
 * @param {number} bounds.minX - Left wall X position
 * @param {number} bounds.maxX - Right wall X position
 * @param {number} bounds.minZ - Back wall Z position
 * @param {number} bounds.maxZ - Front wall Z position
 * @param {number} [bounds.radius=0.5] - Player collision radius
 */
export function applyOuterWallCollision(position, bounds) {
  const {
    minX,
    maxX,
    minZ,
    maxZ,
    radius = 0.5
  } = bounds;

  // Clamp X position (left/right walls)
  if (position.x < minX + radius) {
    position.x = minX + radius;
  }
  if (position.x > maxX - radius) {
    position.x = maxX - radius;
  }

  // Clamp Z position (back/front walls)
  if (position.z < minZ + radius) {
    position.z = minZ + radius;
  }
  if (position.z > maxZ - radius) {
    position.z = maxZ - radius;
  }
}

/**
 * Apply divider wall collision - prevents crossing a center divider
 *
 * Canonical pattern from Rooms 1 & 2:
 * - When player is within the divider's X range, prevent crossing the divider line in Z
 * - Player is constrained to stay on whichever side they're currently on
 *
 * @param {THREE.Vector3} position - Player position to constrain (modified in-place)
 * @param {Object} config - Divider configuration
 * @param {Object} config.dividerX - X-axis range of divider { min, max }
 * @param {number} config.frontLimit - Z limit on positive side (front)
 * @param {number} config.backLimit - Z limit on negative side (back)
 */
export function applyDividerCollision(position, config) {
  const {
    dividerX,    // { min, max }
    frontLimit,  // z limit on positive side
    backLimit    // z limit on negative side
  } = config;

  // Check if player is within divider X-band
  const withinDividerX = (position.x > dividerX.min && position.x < dividerX.max);

  if (withinDividerX) {
    // Determine which side player is on and apply appropriate limit
    if (position.z > 0) {
      // Player on positive z side (front)
      if (position.z < frontLimit) {
        position.z = frontLimit;
      }
    } else {
      // Player on negative z side (back)
      if (position.z > backLimit) {
        position.z = backLimit;
      }
    }
  }
}
