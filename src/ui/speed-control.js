import { MOVEMENT_CONFIG } from '../core/movement-config.js';

/**
 * Initialize movement speed control UI
 * Adds a slider to adjust movement speed multiplier (0.5x - 2.0x)
 * Persists setting to localStorage
 */
export function initSpeedControl() {
  // Create speed control UI
  const controlDiv = document.createElement('div');
  controlDiv.id = 'speed-control';
  controlDiv.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 999;
    background: rgba(0, 0, 0, 0.7);
    padding: 8px 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    color: #fff;
    user-select: none;
  `;

  // Load saved multiplier from localStorage
  const savedMultiplier = localStorage.getItem('movementSpeedMultiplier');
  if (savedMultiplier) {
    const multiplier = parseFloat(savedMultiplier);
    if (!isNaN(multiplier) && multiplier >= 0.5 && multiplier <= 2.0) {
      MOVEMENT_CONFIG.setSpeedMultiplier(multiplier);
    }
  }

  controlDiv.innerHTML = `
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
      <span>Speed:</span>
      <input type="range" id="speed-slider"
             min="0.5" max="2.0" step="0.1"
             value="${MOVEMENT_CONFIG.speedMultiplier}"
             style="width: 120px; vertical-align: middle; cursor: pointer;">
      <span id="speed-value" style="min-width: 35px;">${MOVEMENT_CONFIG.speedMultiplier.toFixed(1)}x</span>
    </label>
  `;

  document.body.appendChild(controlDiv);

  // Set up event listener
  const slider = document.getElementById('speed-slider');
  const valueDisplay = document.getElementById('speed-value');

  if (slider && valueDisplay) {
    slider.addEventListener('input', (e) => {
      const multiplier = parseFloat(e.target.value);
      MOVEMENT_CONFIG.setSpeedMultiplier(multiplier);
      valueDisplay.textContent = `${multiplier.toFixed(1)}x`;

      // Persist to localStorage
      localStorage.setItem('movementSpeedMultiplier', multiplier.toString());
    });
  }
}
