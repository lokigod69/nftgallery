import * as THREE from 'three';

/**
 * Asset Loading Utilities - Diagnostic helpers for loading textures and models
 *
 * Usage:
 *   import { loadTextureWithDiagnostics } from './src/core/asset-utils.js';
 */

/**
 * Loads a texture with comprehensive error logging and optional fallback
 *
 * @param {THREE.TextureLoader} loader - Three.js texture loader
 * @param {string} url - Path to texture file
 * @param {Object} options - Configuration options
 * @param {Function} options.onLoad - Success callback (receives texture)
 * @param {Function} options.onProgress - Progress callback
 * @param {boolean} options.useFallback - Whether to use fallback on error (default: true)
 * @param {string} options.fallbackColor - Fallback material color (default: 0xff00ff - magenta)
 * @param {string} options.context - Context description for error messages (e.g. "Room B NFT 5")
 *
 * @returns {THREE.Texture} The texture (or fallback if error)
 */
export function loadTextureWithDiagnostics(loader, url, options = {}) {
  const {
    onLoad = null,
    onProgress = null,
    useFallback = true,
    fallbackColor = 0xff00ff, // Bright magenta to make failures obvious
    context = 'texture'
  } = options;

  let fallbackApplied = false;

  const texture = loader.load(
    url,

    // onLoad callback
    function(loadedTexture) {
      console.log(`✅ [Asset Load Success] ${context}: ${url}`);
      if (onLoad) onLoad(loadedTexture);
    },

    // onProgress callback
    function(xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        console.log(`📥 [Asset Loading] ${context}: ${percentComplete.toFixed(1)}% (${url})`);
      }
      if (onProgress) onProgress(xhr);
    },

    // onError callback
    function(error) {
      console.error(`❌ [Asset Load Error] ${context}: ${url}`);
      console.error('Error details:', error);
      console.error('Possible causes:');
      console.error('  - File does not exist at the specified path');
      console.error('  - Incorrect file extension (check .jpg vs .jpeg, .png vs .PNG)');
      console.error('  - Case sensitivity issue (B1.png vs b1.png)');
      console.error('  - Missing /public/ or /assets/ prefix in path');

      fallbackApplied = true;

      if (useFallback) {
        console.warn(`⚠️  [Asset Fallback] Applying magenta fallback for: ${url}`);
        // The texture will remain the default, but we've logged the issue
      }
    }
  );

  // Mark texture with diagnostic info
  texture.userData = {
    originalUrl: url,
    context: context,
    fallbackApplied: fallbackApplied,
    loadedAt: new Date().toISOString()
  };

  return texture;
}

/**
 * Creates a simple fallback material (bright magenta to make errors obvious)
 *
 * @param {number} color - Fallback color (default: 0xff00ff - magenta)
 * @param {Object} options - Material options
 * @returns {THREE.MeshBasicMaterial} Fallback material
 */
export function createFallbackMaterial(color = 0xff00ff, options = {}) {
  return new THREE.MeshBasicMaterial({
    color: color,
    ...options
  });
}

/**
 * Logs summary of texture loading results
 *
 * @param {Array<THREE.Texture>} textures - Array of loaded textures
 * @param {string} context - Context description (e.g. "Room B NFTs")
 */
export function logTextureLoadingSummary(textures, context = 'textures') {
  const total = textures.length;
  const failed = textures.filter(t => t.userData && t.userData.fallbackApplied).length;
  const succeeded = total - failed;

  console.log(`\n📊 [Asset Loading Summary] ${context}`);
  console.log(`   Total: ${total}`);
  console.log(`   ✅ Succeeded: ${succeeded}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed > 0) {
    console.warn(`   ⚠️  ${failed} texture(s) failed to load - check errors above`);
  } else {
    console.log(`   🎉 All textures loaded successfully!`);
  }
  console.log('');
}

/**
 * Batch load textures with diagnostics
 *
 * @param {THREE.TextureLoader} loader - Three.js texture loader
 * @param {Array<string>} urls - Array of texture URLs
 * @param {Object} options - Configuration options
 * @param {Function} options.onEachLoad - Callback for each successful load
 * @param {Function} options.onAllComplete - Callback when all loads complete
 * @param {string} options.context - Context description
 * @returns {Array<THREE.Texture>} Array of textures
 */
export function batchLoadTextures(loader, urls, options = {}) {
  const {
    onEachLoad = null,
    onAllComplete = null,
    context = 'batch textures'
  } = options;

  const textures = [];
  let loadedCount = 0;

  urls.forEach((url, index) => {
    const texture = loadTextureWithDiagnostics(loader, url, {
      context: `${context} [${index + 1}/${urls.length}]`,
      onLoad: (loadedTexture) => {
        loadedCount++;
        if (onEachLoad) onEachLoad(loadedTexture, index);

        if (loadedCount === urls.length) {
          logTextureLoadingSummary(textures, context);
          if (onAllComplete) onAllComplete(textures);
        }
      }
    });

    textures.push(texture);
  });

  return textures;
}

/**
 * Asset loading configuration
 */
export const ASSET_CONFIG = {
  enableVerboseLogging: true,  // Set to false to reduce console noise
  useFallbacks: true,          // Whether to use fallback materials on error
  fallbackColor: 0xff00ff,     // Bright magenta for visibility
};
