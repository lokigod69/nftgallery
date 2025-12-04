import { MOVEMENT_CONFIG } from '../core/movement-config.js';

/**
 * Initialize movement speed control UI
 * Adds a slider to adjust movement speed multiplier (0.5x - 2.0x)
 * Also adds mouse wheel control for speed adjustment
 * Persists setting to localStorage
 */
export function initSpeedControl() {
  const MIN = 0.5;
  const MAX = 2.0;
  const STEP = 0.1;

  // Create speed control UI
  // Positioned left of the nav hamburger menu (which is at right: 10px, ~45px wide)
  const controlDiv = document.createElement('div');
  controlDiv.id = 'speed-control';
  controlDiv.style.cssText = `
    position: fixed;
    top: 16px;
    right: 65px;
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
    if (!isNaN(multiplier) && multiplier >= MIN && multiplier <= MAX) {
      MOVEMENT_CONFIG.setSpeedMultiplier(multiplier);
    }
  }

  controlDiv.innerHTML = `
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
      <span>Speed:</span>
      <input type="range" id="speed-slider"
             min="${MIN}" max="${MAX}" step="${STEP}"
             value="${MOVEMENT_CONFIG.speedMultiplier}"
             style="width: 120px; vertical-align: middle; cursor: pointer;">
      <span id="speed-value" style="min-width: 35px;">${MOVEMENT_CONFIG.speedMultiplier.toFixed(1)}x</span>
    </label>
  `;

  document.body.appendChild(controlDiv);

  // Set up event listeners
  const slider = document.getElementById('speed-slider');
  const valueDisplay = document.getElementById('speed-value');

  // Helper function to apply multiplier and sync UI
  function applyMultiplier(multiplier) {
    const clamped = Math.max(MIN, Math.min(MAX, multiplier));
    MOVEMENT_CONFIG.setSpeedMultiplier(clamped);
    if (slider) slider.value = clamped.toString();
    if (valueDisplay) valueDisplay.textContent = `${clamped.toFixed(1)}x`;
    localStorage.setItem('movementSpeedMultiplier', clamped.toString());
  }

  // Slider input handler
  if (slider && valueDisplay) {
    slider.addEventListener('input', (e) => {
      const multiplier = parseFloat(e.target.value);
      applyMultiplier(multiplier);
    });
  }

  // Mouse wheel handler for speed control
  window.addEventListener('wheel', (e) => {
    const current = parseFloat(slider.value);
    const delta = e.deltaY;

    // Scroll down (deltaY > 0) → slower, scroll up → faster
    const next = delta > 0 ? current - STEP : current + STEP;
    applyMultiplier(next);

    // Prevent page scroll when adjusting speed
    e.preventDefault();
  }, { passive: false });
}
