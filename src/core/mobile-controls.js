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
 * @param {Function} [config.onJump] - Callback when user taps left joystick (jump action)
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

  // Parse configuration with defaults - OPTIMIZED for smooth controls
  const sensitivity = {
    look: config.sensitivity?.look ?? 0.05,    // Increased for more responsive camera
    move: config.sensitivity?.move ?? 1.0
  };

  const pitchLimits = {
    min: config.pitchLimits?.min ?? -Math.PI / 2.5,  // -72° (more range to look down)
    max: config.pitchLimits?.max ?? Math.PI / 3       // +60° (more range to look up)
  };

  const autoLevelConfig = {
    enabled: config.autoLevel?.enabled ?? true,
    speed: config.autoLevel?.speed ?? 0.2,     // Slower auto-level for smoother feel
    threshold: config.autoLevel?.threshold ?? 0.08
  };

  const joystickOptions = {
    color: config.joystickOptions?.color ?? 'white',
    size: config.joystickOptions?.size ?? 120,
    moveDeadZone: config.joystickOptions?.moveDeadZone ?? 0.15,  // Lower for smoother movement start
    lookDeadZone: config.joystickOptions?.lookDeadZone ?? 0.08   // Slightly higher to prevent drift
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
    // Callbacks
    onJump: config.onJump,
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
        <p>Tap left joystick - Jump</p>
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

  // Reset all input state (call on viewer open/close to prevent stuck controls)
  function resetInput() {
    // Zero out movement flags
    window.moveForward = false;
    window.moveBackward = false;
    window.moveLeft = false;
    window.moveRight = false;

    // Zero out internal look state
    yaw = config.camera ? config.camera.rotation.y : 0;
    pitch = config.camera ? config.camera.rotation.x : 0;
    isAutoLeveling = false;
    lookStickDeflection = 0;
  }

  // Return mobile controls instance
  return {
    enabled: true,
    device,
    controls: mobileControls,  // Mock controls object for compatibility
    updateAutoLevel,
    updateCameraRotation,  // Expose for manual updates if needed
    resetInput,  // Reset all input state
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
  rotateMessage.id = 'rotate-warning';
  rotateMessage.className = 'rotate-warning rotate-message';
  rotateMessage.setAttribute('data-rotate-message', 'true');
  rotateMessage.textContent = 'Please rotate your device to landscape';
  rotateMessage.style.zIndex = '4000';  // Below viewer overlay (9999)
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
 * Supports both portrait and landscape orientations
 */
function getMobileControlsCSS(joystickOptions) {
  const size = joystickOptions.size || 120;
  const smallSize = Math.round(size * 0.85);  // Slightly smaller for portrait

  return `
    /* Mobile joystick containers */
    .mobile-joystick {
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      z-index: 1500;
      pointer-events: auto;
      touch-action: none;
      transition: width 0.2s, height 0.2s, bottom 0.2s, left 0.2s, right 0.2s;
    }

    .mobile-joystick-left {
      left: 20px;
      bottom: 20px;
    }

    .mobile-joystick-right {
      right: 20px;
      bottom: 20px;
    }

    /* Portrait mode adjustments - stack joysticks vertically on sides */
    @media (orientation: portrait) {
      .mobile-joystick {
        width: ${smallSize}px;
        height: ${smallSize}px;
      }

      .mobile-joystick-left {
        left: 15px;
        bottom: 120px;
      }

      .mobile-joystick-right {
        right: 15px;
        bottom: 120px;
      }
    }

    /* Orientation warning overlay - hidden by default */
    .rotate-message {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
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

      @media (orientation: portrait) {
        .mobile-joystick-left {
          left: calc(env(safe-area-inset-left) + 15px);
          bottom: calc(env(safe-area-inset-bottom) + 120px);
        }

        .mobile-joystick-right {
          right: calc(env(safe-area-inset-right) + 15px);
          bottom: calc(env(safe-area-inset-bottom) + 120px);
        }
      }
    }

    /* Prevent text selection and callouts on mobile */
    .mobile-joystick * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
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
    onJump,
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
  // Tap detection for jump action
  let tapStartTime = 0;
  let maxDistance = 0;
  const TAP_MAX_DURATION = 200;   // ms
  const TAP_MAX_DISTANCE = 10;    // nipplejs distance units

  // Smooth movement state - store analog values for smoother movement
  window.mobileMovementX = 0;  // -1 to 1 for left/right
  window.mobileMovementY = 0;  // -1 to 1 for backward/forward
  let targetMovementX = 0;
  let targetMovementY = 0;
  const MOVEMENT_SMOOTHING = 0.15;  // Lower = smoother but slower response

  // Smoothing update function (called from animation loop via updateMovementSmoothing)
  function updateMovementSmoothing() {
    // Lerp toward target values for smooth acceleration/deceleration
    window.mobileMovementX += (targetMovementX - window.mobileMovementX) * MOVEMENT_SMOOTHING;
    window.mobileMovementY += (targetMovementY - window.mobileMovementY) * MOVEMENT_SMOOTHING;

    // Snap to zero when very close (prevents drift)
    if (Math.abs(window.mobileMovementX) < 0.01) window.mobileMovementX = 0;
    if (Math.abs(window.mobileMovementY) < 0.01) window.mobileMovementY = 0;

    // Update boolean flags for compatibility with existing room code
    const threshold = 0.1;
    window.moveForward = window.mobileMovementY > threshold;
    window.moveBackward = window.mobileMovementY < -threshold;
    window.moveLeft = window.mobileMovementX < -threshold;
    window.moveRight = window.mobileMovementX > threshold;
  }

  // Expose smoothing update function
  if (options.exposeSmoothing) {
    options.exposeSmoothing(updateMovementSmoothing);
  }

  moveJoystick.on('start', (evt, data) => {
    tapStartTime = performance.now();
    maxDistance = 0;
  });

  moveJoystick.on('move', (evt, data) => {
    const deadZone = joystickOptions.moveDeadZone;
    const dist = data.distance || 0;

    // Track maximum distance for tap detection
    if (dist > maxDistance) {
      maxDistance = dist;
    }

    // Get analog values with dead zone applied
    // nipplejs Y-axis: positive = up (forward), negative = down (backward)
    let moveX = data.vector.x;
    let moveY = data.vector.y;

    // Apply dead zone with smooth ramp
    if (Math.abs(moveX) < deadZone) moveX = 0;
    else moveX = (moveX - Math.sign(moveX) * deadZone) / (1 - deadZone);

    if (Math.abs(moveY) < deadZone) moveY = 0;
    else moveY = (moveY - Math.sign(moveY) * deadZone) / (1 - deadZone);

    // Set target values (smoothing happens in updateMovementSmoothing)
    targetMovementX = moveX;
    targetMovementY = moveY;

    // Also set boolean flags immediately for responsiveness
    window.moveForward = moveY > 0.1;
    window.moveBackward = moveY < -0.1;
    window.moveLeft = moveX < -0.1;
    window.moveRight = moveX > 0.1;
  });

  moveJoystick.on('end', () => {
    const duration = performance.now() - tapStartTime;

    // Set target to zero - smoothing will gradually stop movement
    targetMovementX = 0;
    targetMovementY = 0;

    // Reset all movement flags when stick released
    window.moveForward = false;
    window.moveBackward = false;
    window.moveLeft = false;
    window.moveRight = false;

    // Detect tap gesture for jump
    const isTap = duration < TAP_MAX_DURATION && maxDistance < TAP_MAX_DISTANCE;

    if (isTap && onJump) {
      onJump();
    }
  });

  // Look joystick event handlers with momentum
  let currentYaw = 0;
  let currentPitch = 0;
  let yawVelocity = 0;
  let pitchVelocity = 0;
  const LOOK_SMOOTHING = 0.2;  // Smoothing factor for camera
  const LOOK_MOMENTUM = 0.85;  // Momentum decay when stick released

  lookJoystick.on('move', (evt, data) => {
    const deadZone = joystickOptions.lookDeadZone;

    // Track deflection for auto-level system
    const deflection = Math.sqrt(data.vector.x * data.vector.x + data.vector.y * data.vector.y);
    setLookDeflection(deflection);

    // Get analog values with smooth dead zone
    let lookX = data.vector.x;
    let lookY = data.vector.y;

    if (Math.abs(lookX) < deadZone) lookX = 0;
    else lookX = (lookX - Math.sign(lookX) * deadZone) / (1 - deadZone);

    if (Math.abs(lookY) < deadZone) lookY = 0;
    else lookY = (lookY - Math.sign(lookY) * deadZone) / (1 - deadZone);

    // Apply with smoothing for fluid camera movement
    yawVelocity = -lookX * sensitivity.look * 2;  // Increased sensitivity
    pitchVelocity = lookY * sensitivity.look * 2;

    currentYaw += yawVelocity;
    currentPitch += pitchVelocity;

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
    // Reset velocities
    yawVelocity = 0;
    pitchVelocity = 0;
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
      return;
    }

    const touch = event.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    // Ignore touches in joystick zones (bottom corners)
    const isLeftZone = (touchX < window.innerWidth * 0.25 && touchY > window.innerHeight * 0.65);
    const isRightZone = (touchX > window.innerWidth * 0.75 && touchY > window.innerHeight * 0.65);

    if (isLeftZone || isRightZone) {
      return;
    }

    // Tap in center area - perform interaction
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
 * Setup orientation warning (disabled by default - portrait mode now supported)
 * @param {HTMLElement} rotateMessageElement - The warning element
 * @param {boolean} showWarning - Whether to show the warning (default: false)
 */
function setupOrientationWarning(rotateMessageElement, showWarning = false) {
  // Always hide the warning element - portrait mode is now supported
  function hideWarning() {
    const el = document.getElementById('rotate-warning')
      || document.querySelector('.rotate-warning')
      || rotateMessageElement;

    if (!el) return;

    el.style.display = 'none';
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  }

  // If warnings are disabled (default), always hide
  if (!showWarning) {
    hideWarning();
    window.addEventListener('load', hideWarning);
    window.addEventListener('resize', hideWarning);
    return;
  }

  // Legacy behavior for rooms that still want orientation warning
  function checkOrientation() {
    const el = document.getElementById('rotate-warning')
      || document.querySelector('.rotate-warning')
      || rotateMessageElement;

    if (!el) return;

    const isViewerOpen = !!window.__NFT_VIEWER_OPEN || document.body.classList.contains('nft-viewer-open');
    if (isViewerOpen) {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }

    if (window.innerWidth < window.innerHeight) {
      el.style.display = 'flex';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    } else {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }
  }

  window.addEventListener('load', checkOrientation);
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);

  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', checkOrientation);
  }

  setTimeout(checkOrientation, 100);
}
