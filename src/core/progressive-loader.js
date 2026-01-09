import * as THREE from 'three';

/**
 * Progressive Texture Loader
 *
 * Implements 2-phase texture loading for large asset galleries:
 * Phase 1: Instant 128×128 gray canvas placeholder (visible immediately)
 * Phase 2: Progressive full-resolution texture upgrade (max 3 concurrent loads)
 *
 * This approach prevents camera freezing by:
 * - Creating geometry instantly with placeholders
 * - Loading full-res textures in the background (throttled to 3 concurrent)
 * - Upgrading materials as textures complete
 *
 * Inspired by Room10's pixelated preview system (room10.js lines 660-704)
 */
export class ProgressiveTextureLoader {
  constructor(onProgress) {
    this.textureLoader = new THREE.TextureLoader();
    this.onProgress = onProgress || (() => {}); // Progress callback function
    this.loadQueue = [];
    this.activeLoads = 0;
    this.maxConcurrent = 3; // Reduced from 4 to prevent browser throttling
    this.totalLoaded = 0;
    this.totalQueued = 0;
  }

  /**
   * Load texture with instant placeholder
   *
   * Returns immediately with placeholder material and a promise for upgrade
   * Usage:
   *   const { placeholderMaterial, upgradePromise } = loader.loadWithPlaceholder(url, config);
   *   plane.material = placeholderMaterial; // Instant
   *   upgradePromise.then(fullResMat => plane.material = fullResMat); // Later
   *
   * @param {string} url - Texture URL to load
   * @param {object} materialConfig - THREE.MeshBasicMaterial config (e.g., { side: THREE.DoubleSide })
   * @returns {object} { placeholderMaterial: Material, upgradePromise: Promise<Material> }
   */
  loadWithPlaceholder(url, materialConfig = {}) {
    // PHASE 1: Create instant gray placeholder (no network delay)
    const placeholderMaterial = this.createPlaceholder(materialConfig);

    // PHASE 2: Queue full-res texture load (staggered, max 3 concurrent)
    const upgradePromise = this.queueFullResLoad(url, materialConfig);

    return { placeholderMaterial, upgradePromise };
  }

  /**
   * Create 128×128 gray placeholder texture
   * Generates a canvas-based texture for instant display
   * Uses emissive glow to indicate "loading" state
   */
  createPlaceholder(config) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Dark gray with subtle pattern
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, 128, 128);

    // Add subtle grid pattern
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter; // Smooth scaling
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6,
      emissive: 0x1a1a1a,
      emissiveIntensity: 0.3,
      side: config.side || THREE.FrontSide,
      ...config
    });
  }

  /**
   * Queue a texture for loading
   * Textures load in FIFO order, max 3 concurrent
   */
  queueFullResLoad(url, config) {
    this.totalQueued++;
    const queuePosition = this.totalQueued;

    return new Promise((resolve, reject) => {
      this.loadQueue.push({ url, config, resolve, reject, queuePosition });
      this.processQueue();
    });
  }

  /**
   * Process load queue
   * Maintains max 3 concurrent network requests
   */
  processQueue() {
    while (this.activeLoads < this.maxConcurrent && this.loadQueue.length > 0) {
      const item = this.loadQueue.shift();
      this.activeLoads++;

      this.textureLoader.load(
        item.url,
        (texture) => {
          // PHASE 2A: Loaded - create blurred intermediate version
          const blurred = this.createBlurredVersion(texture);
          const blurredMat = new THREE.MeshBasicMaterial({
            map: blurred,
            side: item.config.side || THREE.FrontSide,
            ...item.config
          });

          // PHASE 2B: Upgrade to full-res after brief delay
          // This gives time for the browser to render frames between upgrades
          setTimeout(() => {
            const fullResMat = new THREE.MeshBasicMaterial({
              map: texture,
              side: item.config.side || THREE.FrontSide,
              ...item.config
            });
            item.resolve(fullResMat);
            this.totalLoaded++;
            this.onProgress?.(this.totalLoaded, this.totalQueued);
          }, 100); // 100ms delay prevents rendering stalls

          this.activeLoads--;
          this.processQueue();
        },
        undefined, // progress callback (unused)
        (error) => {
          console.error(`ProgressiveTextureLoader: Failed to load ${item.url}:`, error);
          this.totalLoaded++;
          this.onProgress?.(this.totalLoaded, this.totalQueued);
          item.reject(error);
          this.activeLoads--;
          this.processQueue();
        }
      );
    }
  }

  /**
   * Create a 128×128 blurred version of a texture
   * Used as intermediate step between placeholder and full-res
   */
  createBlurredVersion(texture) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; // Enables blur effect
    ctx.drawImage(texture.image, 0, 0, 128, 128);

    const blurredTexture = new THREE.CanvasTexture(canvas);
    blurredTexture.colorSpace = THREE.SRGBColorSpace;
    blurredTexture.minFilter = THREE.LinearFilter;
    blurredTexture.magFilter = THREE.LinearFilter;
    blurredTexture.wrapS = THREE.ClampToEdgeWrapping;
    blurredTexture.wrapT = THREE.ClampToEdgeWrapping;

    return blurredTexture;
  }

  /**
   * Get loading progress
   * @returns {object} { loaded: number, total: number, percent: number }
   */
  getProgress() {
    return {
      loaded: this.totalLoaded,
      total: this.totalQueued,
      percent: this.totalQueued > 0 ? Math.round((this.totalLoaded / this.totalQueued) * 100) : 0,
      queued: this.loadQueue.length,
      active: this.activeLoads
    };
  }

  /**
   * Check if all textures have loaded
   */
  isComplete() {
    return this.totalLoaded === this.totalQueued && this.activeLoads === 0 && this.loadQueue.length === 0;
  }

  /**
   * Wait for all textures to load
   * @returns {Promise<void>}
   */
  async waitForCompletion() {
    return new Promise((resolve) => {
      const checkComplete = () => {
        if (this.isComplete()) {
          resolve();
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });
  }
}
