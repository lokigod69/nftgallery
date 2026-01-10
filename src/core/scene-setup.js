import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * Centralized scene initialization helper
 * Creates and configures scene, camera, renderer, and pointer lock controls
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.spawnPosition - Initial camera position {x, y, z}
 * @param {number} options.background - Background color (hex)
 * @param {string} options.outputEncoding - Renderer encoding ('sRGB', 'Linear', etc.)
 * @param {Object} options.fog - Fog configuration {color, near, far}
 * @returns {Object} { scene, camera, renderer, controls }
 */
export function initScene(options = {}) {
  const {
    spawnPosition = { x: 0, y: 2.5, z: 0 },
    background = 0x000000,
    outputEncoding = 'sRGB',
    fog = null
  } = options;

  // Create scene with background
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  if (fog) scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);

  // Create camera at spawn position
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);

  // Set rotation order to YXZ to prevent gimbal lock with PointerLockControls
  camera.rotation.order = 'YXZ';

  // Create renderer with sRGB encoding
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE[outputEncoding + 'Encoding'];
  document.body.appendChild(renderer.domElement);

  // Create PointerLockControls
  const controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());
  controls.getObject().position.copy(camera.position);

  // Set pitch limits to prevent gimbal lock (polar angles)
  // minPolarAngle: 0 = look straight up, Math.PI = look straight down
  controls.minPolarAngle = Math.PI * 0.05;  // Can look almost straight up (9°)
  controls.maxPolarAngle = Math.PI * 0.95;  // Can look almost straight down (171°)

  // Reduce camera sensitivity for smoother look controls (default is 1.0)
  controls.pointerSpeed = 0.5;

  // Auto-lock on click
  document.addEventListener('click', () => {
    if (!controls.isLocked) controls.lock();
  });

  // Overlay management
  controls.addEventListener('lock', () => {
    const overlay = document.getElementById('controls-description');
    if (overlay) overlay.style.display = 'none';
  });

  controls.addEventListener('unlock', () => {
    const overlay = document.getElementById('controls-description');
    if (overlay) overlay.style.display = 'block';
  });

  // Auto-resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls };
}
