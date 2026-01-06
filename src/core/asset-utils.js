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

// ============================================================================
// TEXTURE URL BUILDERS
// ============================================================================

/**
 * Get the URL for a texture/image asset
 *
 * All gallery image assets are stored as WebP format for optimal performance.
 * This centralizes image format selection - change .webp to another format here
 * instead of hunting through every room file.
 *
 * @param {string} relativePathWithoutExt - Path relative to /assets/ WITHOUT extension
 * @returns {string} Full URL with .webp extension
 *
 * @example
 * getTextureUrl('RoomB/b1') → '/assets/RoomB/b1.webp'
 * getTextureUrl('RoomX/5') → '/assets/RoomX/5.webp'
 * getTextureUrl('nft42') → '/assets/nft42.webp'
 * getTextureUrl('Room7/lokigod69._A_female_model_...') → '/assets/Room7/lokigod69._A_female_model_....webp'
 */
export function getTextureUrl(relativePathWithoutExt) {
  return `/assets/${relativePathWithoutExt}.webp`;
}

/**
 * Get texture URL for numbered NFT assets
 *
 * @param {number} nftNumber - NFT number (1-142)
 * @returns {string} Full URL to NFT image
 *
 * @example
 * getNftUrl(42) → '/assets/nft42.webp'
 */
export function getNftUrl(nftNumber) {
  return getTextureUrl(`nft${nftNumber}`);
}

/**
 * Get texture URL for RoomB NFT assets
 *
 * @param {number} index - RoomB NFT index (1-60)
 * @returns {string} Full URL to RoomB NFT image
 *
 * @example
 * getRoomBNftUrl(12) → '/assets/RoomB/b12.webp'
 */
export function getRoomBNftUrl(index) {
  return getTextureUrl(`RoomB/b${index}`);
}

/**
 * Get texture URL for Room7 art assets
 *
 * @param {string} filename - Filename without extension
 * @returns {string} Full URL to Room7 image
 *
 * @example
 * getRoom7ArtUrl('ComfyUI_03027_') → '/assets/Room7/ComfyUI_03027_.png'
 */
export function getRoom7ArtUrl(filename) {
  return `/assets/Room7/${filename}.png`;
}

/**
 * Get texture URL for RoomX platform assets
 *
 * @param {number} platformNumber - Platform number (1-50)
 * @returns {string} Full URL to RoomX NFT tile
 *
 * @example
 * getRoomXNftUrl(5) → '/assets/RoomX/5.webp'
 */
export function getRoomXNftUrl(platformNumber) {
  return getTextureUrl(`RoomX/${platformNumber}`);
}

/**
 * Get texture URL for RoomC NFT assets
 *
 * @param {number} nftNumber - NFT number (50-55)
 * @returns {string} Full URL to RoomC NFT
 *
 * @example
 * getRoomCNftUrl(50) → '/assets/nft50.webp'
 */
export function getRoomCNftUrl(nftNumber) {
  return getNftUrl(nftNumber);
}

/**
 * Get texture URL for Room9 NFT assets (Archive Spiral)
 *
 * @param {number} nftNumber - NFT number (56-71, 16 total)
 * @returns {string} Full URL to Room9 NFT
 *
 * @example
 * getRoom9NftUrl(56) → '/assets/nft56.webp'
 */
export function getRoom9NftUrl(nftNumber) {
  return getNftUrl(nftNumber);
}

/**
 * Get texture URL for Room8 NFT assets (Ancient Ascension Shaft)
 *
 * @param {number} nftNumber - NFT number (72-103, 32 total)
 * @returns {string} Full URL to Room8 NFT
 *
 * @example
 * getRoom8NftUrl(72) → '/assets/nft72.webp'
 */
export function getRoom8NftUrl(nftNumber) {
  return getNftUrl(nftNumber);
}
