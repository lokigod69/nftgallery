/**
 * Mobile Controls Module
 *
 * Centralized mobile control system for the NFT Gallery.
 * Provides virtual joysticks (via nipplejs) and touch interaction for mobile devices.
 *
 * Phase A Implementation (Foundation)
 */

import * as THREE from 'three';

// ============================================================================
// Device Detection
// ============================================================================

/**
 * Detect if the current device is mobile using feature detection + UA fallback
 * @returns {Object} Device info
 */
export function detectMobileDevice() {
  // Feature detection (preferred)
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isSmallScreen = window.innerWidth < 1024;
  const isMobile = hasTouch && isSmallScreen;

  // UA sniffing for platform-specific flags (fallback)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return {
    isMobile,
    hasTouch,
    isSmallScreen,
    deviceType: isMobile ? 'mobile' : 'desktop',
    isIOS,
    isAndroid
  };
}

// ============================================================================
// Mobile Controls Initialization
// ============================================================================

/**
 * Initialize mobile controls for a room
 *
 * @param {Object} config - Configuration object
 * @param {THREE.Camera} config.camera - Three.js camera
 * @param {Object} config.controls - PointerLockControls or mock controls
 * @param {Object} [config.sensitivity] - Look/move sensitivity
 * @param {number} [config.sensitivity.look=0.04] - Look sensitivity multiplier
 * @param {number} [config.sensitivity.move=1.0] - Movement speed multiplier
 * @param {Object} [config.pitchLimits] - Vertical look constraints (radians)
 * @param {number} [config.pitchLimits.min=-Math.PI/3] - Min pitch (-60°)
 * @param {number} [config.pitchLimits.max=Math.PI/4] - Max pitch (+45°)
 * @param {Object} [config.autoLevel] - Auto-leveling configuration
 * @param {boolean} [config.autoLevel.enabled=true] - Enable gentle pitch auto-leveling
 * @param {number} [config.autoLevel.speed=0.3] - Lerp factor for auto-level (0-1)
 * @param {number} [config.autoLevel.threshold=0.1] - Stick deflection threshold for auto-level
 * @param {Function} [config.onInteract] - Callback when user taps center screen
 * @param {Function} [config.onMobileDetected] - Callback when mobile is detected
 * @param {Object} [config.joystickOptions] - Joystick customization
 * @param {string} [config.joystickOptions.color='white'] - Joystick color
 * @param {number} [config.joystickOptions.size=120] - Joystick size in pixels
 * @param {number} [config.joystickOptions.moveDeadZone=0.3] - Movement stick dead zone
 * @param {number} [config.joystickOptions.lookDeadZone=0.05] - Look stick dead zone
 *
 * @returns {Object} Mobile controls instance with { enabled, device, updateAutoLevel(), destroy() }
 */
export function initMobileControls(config) {
  const device = detectMobileDevice();

  // Desktop mode - return no-op
  if (!device.isMobile) {
    return {
      enabled: false,
      device,
      updateAutoLevel: () => {},
      destroy: () => {}
    };
  }

  // Mobile detected - notify caller
  config.onMobileDetected?.();

  // Parse configuration with defaults
  const sensitivity = {
    look: config.sensitivity?.look ?? 0.04,
    move: config.sensitivity?.move ?? 1.0
  };

  const pitchLimits = {
    min: config.pitchLimits?.min ?? -Math.PI / 3,  // -60°
    max: config.pitchLimits?.max ?? Math.PI / 4     // +45°
  };

  const autoLevelConfig = {
    enabled: config.autoLevel?.enabled ?? true,
    speed: config.autoLevel?.speed ?? 0.3,
    threshold: config.autoLevel?.threshold ?? 0.1
  };

  const joystickOptions = {
    color: config.joystickOptions?.color ?? 'white',
    size: config.joystickOptions?.size ?? 120,
    moveDeadZone: config.joystickOptions?.moveDeadZone ?? 0.3,
    lookDeadZone: config.joystickOptions?.lookDeadZone ?? 0.05
  };

  // State
  let yaw = 0;
  let pitch = 0;
  let isAutoLeveling = false;
  let lookStickDeflection = 0;

  // Movement flags (set by move joystick, read by room's movement loop)
  window.moveForward = window.moveForward || false;
  window.moveBackward = window.moveBackward || false;
  window.moveLeft = window.moveLeft || false;
  window.moveRight = window.moveRight || false;

  // Setup camera for mobile (YXZ rotation order prevents gimbal lock)
  if (config.camera) {
    config.camera.rotation.order = 'YXZ';
  }

  // Create mock controls if desktop-style controls not suitable for mobile
  // (Mobile uses direct camera manipulation, not PointerLock)
  const mobileControls = {
    isLocked: true,  // Always "locked" on mobile
    moveRight: (d) => config.camera?.translateX(d),
    moveForward: (d) => config.camera?.translateZ(d),
    getObject: () => config.camera  // For compatibility with portal checks
  };

  // Inject mobile UI
  const mobileUI = injectMobileUI(joystickOptions);

  // Initialize joysticks
  const joysticks = createJoysticks({
    moveZone: mobileUI.moveZone,
    lookZone: mobileUI.lookZone,
    joystickOptions,
    sensitivity,
    pitchLimits,
    autoLevelConfig,
    // State setters
    setYaw: (value) => { yaw = value; },
    setPitch: (value) => { pitch = value; },
    setAutoLeveling: (value) => { isAutoLeveling = value; },
    setLookDeflection: (value) => { lookStickDeflection = value; }
  });

  // Initialize interaction handler (center-tap)
  const interaction = createInteractionHandler({
    camera: config.camera,
    onInteract: config.onInteract,
    joystickZones: {
      move: mobileUI.moveZone,
      look: mobileUI.lookZone
    }
  });

  // Initialize orientation warning
  setupOrientationWarning(mobileUI.rotateMessage);

  // Update controls description for mobile
  updateControlsDescription();

  // Update camera rotation from yaw/pitch
  function updateCameraRotation() {
    if (config.camera) {
      config.camera.rotation.y = yaw;
      config.camera.rotation.x = pitch;
    }
  }

  // Update controls description text for mobile
  function updateControlsDescription() {
    const controlsDesc = document.getElementById('controls-description');
    if (controlsDesc) {
      controlsDesc.innerHTML = `
        <p>Controls:</p>
        <p>Left joystick - Move</p>
        <p>Right joystick - Look</p>
        <p>Tap center - Interact</p>
      `;
    }
  }

  // Auto-level system (called from room's animation loop)
  function updateAutoLevel(delta) {
    if (!autoLevelConfig.enabled || !isAutoLeveling) return;

    const targetPitch = 0;  // Horizon

    // Only auto-level when stick is nearly at rest
    if (Math.abs(lookStickDeflection) < autoLevelConfig.threshold) {
      pitch = THREE.MathUtils.lerp(pitch, targetPitch, autoLevelConfig.speed * delta * 60);

      // Stop when close enough to horizon
      if (Math.abs(pitch) < 0.01) {
        pitch = 0;
        isAutoLeveling = false;
      }
    }

    updateCameraRotation();
  }

  // Cleanup
  function destroy() {
    joysticks.destroy();
    interaction.destroy();
    mobileUI.destroy();
  }

  // Return mobile controls instance
  return {
    enabled: true,
    device,
    controls: mobileControls,  // Mock controls object for compatibility
    updateAutoLevel,
    updateCameraRotation,  // Expose for manual updates if needed
    destroy
  };
}

// ============================================================================
// UI Injection
// ============================================================================

/**
 * Inject mobile UI elements (joystick zones, orientation warning, crosshair)
 */
function injectMobileUI(joystickOptions) {
  // Inject CSS if not already present
  if (!document.getElementById('mobile-controls-styles')) {
    const style = document.createElement('style');
    style.id = 'mobile-controls-styles';
    style.textContent = getMobileControlsCSS(joystickOptions);
    document.head.appendChild(style);
  }

  // Create joystick containers
  const moveZone = document.createElement('div');
  moveZone.id = 'move-joystick';
  moveZone.className = 'mobile-joystick mobile-joystick-left';
  document.body.appendChild(moveZone);

  const lookZone = document.createElement('div');
  lookZone.id = 'look-joystick';
  lookZone.className = 'mobile-joystick mobile-joystick-right';
  document.body.appendChild(lookZone);

  // Create orientation warning overlay
  const rotateMessage = document.createElement('div');
  rotateMessage.id = 'rotate-message';
  rotateMessage.className = 'rotate-message';
  rotateMessage.textContent = 'Please rotate your device to landscape';
  document.body.appendChild(rotateMessage);

  // Create center crosshair (subtle)
  const crosshair = document.createElement('div');
  crosshair.id = 'mobile-crosshair';
  crosshair.className = 'mobile-crosshair';
  document.body.appendChild(crosshair);

  // Cleanup function
  function destroy() {
    moveZone.remove();
    lookZone.remove();
    rotateMessage.remove();
    crosshair.remove();
  }

  return {
    moveZone,
    lookZone,
    rotateMessage,
    crosshair,
    destroy
  };
}

/**
 * Get CSS for mobile controls (injected into <head>)
 */
function getMobileControlsCSS(joystickOptions) {
  return `
    /* Mobile joystick containers */
    .mobile-joystick {
      position: fixed;
      width: ${joystickOptions.size}px;
      height: ${joystickOptions.size}px;
      z-index: 1500;
      pointer-events: auto;
    }

    .mobile-joystick-left {
      left: 20px;
      bottom: 20px;
    }

    .mobile-joystick-right {
      right: 20px;
      bottom: 20px;
    }

    /* Orientation warning overlay */
    .rotate-message {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      color: white;
      font-size: 24px;
      font-family: Arial, sans-serif;
      text-align: center;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 20px;
      box-sizing: border-box;
    }

    /* Mobile crosshair (subtle center indicator) */
    .mobile-crosshair {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 8px;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 999;
      display: block;
    }

    /* Safe area support (iPhone notch, home indicator) */
    @supports (padding: env(safe-area-inset-left)) {
      .mobile-joystick-left {
        left: calc(env(safe-area-inset-left) + 20px);
        bottom: calc(env(safe-area-inset-bottom) + 20px);
      }

      .mobile-joystick-right {
        right: calc(env(safe-area-inset-right) + 20px);
        bottom: calc(env(safe-area-inset-bottom) + 20px);
      }
    }
  `;
}

// ============================================================================
// Joystick Creation
// ============================================================================

/**
 * Create and configure nipplejs joysticks
 */
function createJoysticks(options) {
  const {
    moveZone,
    lookZone,
    joystickOptions,
    sensitivity,
    pitchLimits,
    autoLevelConfig,
    setYaw,
    setPitch,
    setAutoLeveling,
    setLookDeflection
  } = options;

  // Check if nipplejs is available
  if (typeof nipplejs === 'undefined') {
    console.error('nipplejs library not loaded! Mobile controls will not work.');
    return {
      destroy: () => {}
    };
  }

  // Create movement joystick (left)
  const moveJoystick = nipplejs.create({
    zone: moveZone,
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: joystickOptions.color,
    size: joystickOptions.size
  });

  // Create look joystick (right)
  const lookJoystick = nipplejs.create({
    zone: lookZone,
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: joystickOptions.color,
    size: joystickOptions.size
  });

  // Movement joystick event handlers
  moveJoystick.on('move', (evt, data) => {
    const deadZone = joystickOptions.moveDeadZone;

    // Apply dead zone and set movement flags
    // Note: nipplejs Y-axis: positive = up, negative = down
    window.moveForward = data.vector.y > deadZone;    // Positive Y = forward (up)
    window.moveBackward = data.vector.y < -deadZone;  // Negative Y = backward (down)
    window.moveLeft = data.vector.x < -deadZone;      // Negative X = left
    window.moveRight = data.vector.x > deadZone;      // Positive X = right
  });

  moveJoystick.on('end', () => {
    // Reset all movement flags when stick released
    window.moveForward = false;
    window.moveBackward = false;
    window.moveLeft = false;
    window.moveRight = false;
  });

  // Look joystick event handlers
  let currentYaw = 0;
  let currentPitch = 0;

  lookJoystick.on('move', (evt, data) => {
    const deadZone = joystickOptions.lookDeadZone;

    // Track deflection for auto-level system
    const deflection = Math.sqrt(data.vector.x * data.vector.x + data.vector.y * data.vector.y);
    setLookDeflection(deflection);

    // Apply dead zone
    if (Math.abs(data.vector.x) > deadZone) {
      currentYaw -= data.vector.x * sensitivity.look;
    }

    if (Math.abs(data.vector.y) > deadZone) {
      currentPitch += data.vector.y * sensitivity.look;  // Changed from -= to += to fix inverted Y
    }

    // Clamp pitch to limits
    currentPitch = Math.max(pitchLimits.min, Math.min(pitchLimits.max, currentPitch));

    // Update state
    setYaw(currentYaw);
    setPitch(currentPitch);
    setAutoLeveling(false);  // User is actively looking, disable auto-level
  });

  lookJoystick.on('end', () => {
    // Stick released - enable auto-leveling if configured
    if (autoLevelConfig.enabled) {
      setAutoLeveling(true);
    }
    setLookDeflection(0);
  });

  // Cleanup
  function destroy() {
    moveJoystick.destroy();
    lookJoystick.destroy();
  }

  return {
    move: moveJoystick,
    look: lookJoystick,
    destroy
  };
}

// ============================================================================
// Interaction Handler (Center-Screen Tap)
// ============================================================================

/**
 * Create touch interaction handler for center-screen taps
 */
function createInteractionHandler(options) {
  const { camera, onInteract, joystickZones } = options;

  if (!onInteract) {
    // No interaction callback provided - return no-op
    return { destroy: () => {} };
  }

  const raycaster = new THREE.Raycaster();

  function handleTouchStart(event) {
    // Only handle single touch
    if (event.touches.length !== 1) {
      console.log('[Mobile Interaction] Multi-touch detected, ignoring');
      return;
    }

    const touch = event.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    // Ignore touches in joystick zones (bottom corners)
    const isLeftZone = (touchX < window.innerWidth * 0.25 && touchY > window.innerHeight * 0.65);
    const isRightZone = (touchX > window.innerWidth * 0.75 && touchY > window.innerHeight * 0.65);

    console.log(`[Mobile Interaction] Touch at (${touchX}, ${touchY}) - Left zone: ${isLeftZone}, Right zone: ${isRightZone}`);

    if (isLeftZone || isRightZone) {
      console.log('[Mobile Interaction] Touch in joystick zone, ignoring');
      return;
    }

    // Tap in center area - perform interaction
    console.log('[Mobile Interaction] Center tap detected, performing raycast');
    performCenterRaycast();
  }

  function performCenterRaycast() {
    if (!camera) return;

    // Raycast from center of screen (same as desktop click)
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Call interaction callback with raycaster
    // Room will handle finding NFTs or other interactables
    onInteract(raycaster);
  }

  // Register touch listener
  document.addEventListener('touchstart', handleTouchStart, { passive: false });

  // Cleanup
  function destroy() {
    document.removeEventListener('touchstart', handleTouchStart);
  }

  return {
    performRaycast: performCenterRaycast,
    destroy
  };
}

// ============================================================================
// Orientation Warning
// ============================================================================

/**
 * Setup orientation warning (shows in portrait mode)
 */
function setupOrientationWarning(rotateMessageElement) {
  function checkOrientation() {
    if (!rotateMessageElement) return;

    // Show warning if in portrait mode
    if (window.innerWidth < window.innerHeight) {
      rotateMessageElement.style.display = 'flex';
    } else {
      rotateMessageElement.style.display = 'none';
    }
  }

  // Check on load and various resize events
  window.addEventListener('load', checkOrientation);
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);

  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', checkOrientation);
  }

  // Initial check
  setTimeout(checkOrientation, 100);
}
