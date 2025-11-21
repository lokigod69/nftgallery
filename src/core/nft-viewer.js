import * as THREE from 'three';

// Maximum distance from camera to NFT for interaction (prevents opening distant NFTs)
export const MAX_NFT_INTERACTION_DISTANCE = 35;

/**
 * Unified NFT Viewer System
 *
 * Single source of truth for NFT viewing across all rooms.
 * Based on Room 3's working implementation.
 * Supports desktop (keyboard + mouse), mobile landscape (arrows + tap),
 * and mobile portrait (swipe navigation).
 *
 * @param {Object} config - Configuration object
 * @param {Function} config.getNFTList - Function that returns array of { mesh, url, title, description, index }
 * @param {PointerLockControls} config.controls - Pointer lock controls
 * @param {Function} config.onOpen - Optional callback when viewer opens
 * @param {Function} config.onClose - Optional callback when viewer closes
 * @param {boolean} config.enablePortraitSwipe - Enable portrait mode with swipe navigation (default: false)
 * @returns {Object} API object with openByIndex, openByMesh, close methods
 */
export function initUnifiedNFTViewer(config) {
  const {
    getNFTList,
    controls,
    onOpen = () => {},
    onClose = () => {},
    enablePortraitSwipe = false
  } = config;

  // Internal state
  let currentIndex = 0;
  let nftList = [];
  let isViewerOpen = false;
  let isPortrait = false;
  let isMobile = false;

  // Touch state for swipe detection
  let touchStartX = null;
  let touchStartY = null;

  // ----------------------------------------------------------------------
  // DOM Structure
  // ----------------------------------------------------------------------

  // Create full-screen overlay
  const viewerOverlay = document.createElement('div');
  viewerOverlay.className = 'nft-viewer-overlay';
  viewerOverlay.style.position = 'fixed';
  viewerOverlay.style.top = '0';
  viewerOverlay.style.left = '0';
  viewerOverlay.style.width = '100%';
  viewerOverlay.style.height = '100%';
  viewerOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  viewerOverlay.style.display = 'none';
  viewerOverlay.style.alignItems = 'center';
  viewerOverlay.style.justifyContent = 'center';
  viewerOverlay.style.flexDirection = 'column';
  viewerOverlay.style.zIndex = '9999';  // Must be above rotate warning (4000)

  // Container for image and navigation arrows
  const viewerContainer = document.createElement('div');
  viewerContainer.className = 'viewer-image-container';
  viewerContainer.style.position = 'relative';
  viewerContainer.style.width = '80%';
  viewerContainer.style.height = '80%';
  viewerContainer.style.display = 'flex';
  viewerContainer.style.alignItems = 'center';
  viewerContainer.style.justifyContent = 'center';
  viewerOverlay.appendChild(viewerContainer);

  // Left arrow
  const leftArrow = document.createElement('div');
  leftArrow.className = 'viewer-arrows viewer-arrow-left';
  leftArrow.style.position = 'absolute';
  leftArrow.style.left = '20px';
  leftArrow.style.fontSize = '48px';
  leftArrow.style.color = 'white';
  leftArrow.style.cursor = 'pointer';
  leftArrow.style.userSelect = 'none';
  leftArrow.innerHTML = '&#9664;';
  leftArrow.style.opacity = '0.7';
  leftArrow.style.transition = 'opacity 0.2s';
  leftArrow.addEventListener('mouseover', () => leftArrow.style.opacity = '1');
  leftArrow.addEventListener('mouseout', () => leftArrow.style.opacity = '0.7');
  viewerContainer.appendChild(leftArrow);

  // Image element
  const viewerImage = document.createElement('img');
  viewerImage.style.maxWidth = '90%';
  viewerImage.style.maxHeight = '90%';
  viewerImage.style.objectFit = 'contain';
  viewerContainer.appendChild(viewerImage);

  // Right arrow
  const rightArrow = document.createElement('div');
  rightArrow.className = 'viewer-arrows viewer-arrow-right';
  rightArrow.style.position = 'absolute';
  rightArrow.style.right = '20px';
  rightArrow.style.fontSize = '48px';
  rightArrow.style.color = 'white';
  rightArrow.style.cursor = 'pointer';
  rightArrow.style.userSelect = 'none';
  rightArrow.innerHTML = '&#9654;';
  rightArrow.style.opacity = '0.7';
  rightArrow.style.transition = 'opacity 0.2s';
  rightArrow.addEventListener('mouseover', () => rightArrow.style.opacity = '1');
  rightArrow.addEventListener('mouseout', () => rightArrow.style.opacity = '0.7');
  viewerContainer.appendChild(rightArrow);

  // NFT info display (hidden per user request)
  const nftInfo = document.createElement('div');
  nftInfo.style.display = 'none';  // Hidden - user wants clean viewer
  viewerOverlay.appendChild(nftInfo);

  // Instructions (orientation-aware)
  const viewerInstructions = document.createElement('div');
  viewerInstructions.className = 'viewer-instructions';
  viewerInstructions.style.position = 'absolute';
  viewerInstructions.style.bottom = '20px';
  viewerInstructions.style.color = 'white';
  viewerInstructions.style.fontSize = '14px';
  viewerInstructions.style.opacity = '0.7';
  viewerInstructions.style.textAlign = 'center';
  viewerInstructions.style.padding = '0 20px';
  viewerOverlay.appendChild(viewerInstructions);

  // Close button (X)
  const closeButton = document.createElement('button');
  closeButton.style.position = 'absolute';
  closeButton.style.top = '20px';
  closeButton.style.right = '20px';
  closeButton.style.fontSize = '36px';
  closeButton.style.color = 'white';
  closeButton.style.background = 'rgba(0, 0, 0, 0.5)';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '50%';
  closeButton.style.width = '50px';
  closeButton.style.height = '50px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'flex';
  closeButton.style.alignItems = 'center';
  closeButton.style.justifyContent = 'center';
  closeButton.style.zIndex = '1001';
  closeButton.innerHTML = '×';
  viewerOverlay.appendChild(closeButton);

  document.body.appendChild(viewerOverlay);

  // ----------------------------------------------------------------------
  // Orientation & Device Detection
  // ----------------------------------------------------------------------

  function detectMobile() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function updateOrientation() {
    isMobile = detectMobile();
    isPortrait = window.innerHeight > window.innerWidth;

    // Only enable portrait mode if flag is set AND device is mobile AND in portrait
    const usePortraitMode = enablePortraitSwipe && isMobile && isPortrait;

    if (usePortraitMode) {
      viewerOverlay.classList.add('portrait-mode');
      viewerOverlay.classList.remove('landscape-mode');
      // Hide arrows in portrait
      leftArrow.style.display = 'none';
      rightArrow.style.display = 'none';
    } else {
      viewerOverlay.classList.remove('portrait-mode');
      viewerOverlay.classList.add('landscape-mode');
      // Show arrows in landscape
      leftArrow.style.display = 'block';
      rightArrow.style.display = 'block';
    }

    updateInstructions();
  }

  function updateInstructions() {
    const usePortraitMode = enablePortraitSwipe && isMobile && isPortrait;

    if (!isMobile) {
      viewerInstructions.textContent = 'Click arrows or use ← / → to navigate • ESC / × to close';
    } else if (usePortraitMode) {
      viewerInstructions.textContent = 'Swipe left/right to navigate • Tap × to close';
    } else {
      viewerInstructions.textContent = 'Tap arrows to navigate • Tap × to close';
    }
  }

  window.addEventListener('resize', updateOrientation);
  window.addEventListener('orientationchange', updateOrientation);
  updateOrientation();

  // ----------------------------------------------------------------------
  // Orientation Warning Hard-Hide
  // ----------------------------------------------------------------------

  function hideOrientationWarningHard() {
    const elems = document.querySelectorAll('#rotate-warning, .rotate-warning, [data-rotate-message]');
    elems.forEach(el => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    });
  }

  // ----------------------------------------------------------------------
  // Navigation Functions (Room 3 pattern)
  // ----------------------------------------------------------------------

  function goPrev() {
    if (nftList.length === 0) return;
    currentIndex--;
    if (currentIndex < 0) currentIndex = nftList.length - 1;
    showAtCurrentIndex();
  }

  function goNext() {
    if (nftList.length === 0) return;
    currentIndex++;
    if (currentIndex >= nftList.length) currentIndex = 0;
    showAtCurrentIndex();
  }

  function showAtCurrentIndex() {
    if (currentIndex < 0 || currentIndex >= nftList.length) return;

    const nft = nftList[currentIndex];
    viewerImage.src = nft.url;
    nftInfo.textContent = `${nft.title} (${currentIndex + 1}/${nftList.length})`;
  }

  function openByIndex(idx) {
    nftList = getNFTList();
    if (nftList.length === 0) return;

    currentIndex = idx;
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= nftList.length) currentIndex = nftList.length - 1;

    showAtCurrentIndex();
    viewerOverlay.style.display = 'flex';
    isViewerOpen = true;
    controls.unlock();
    updateOrientation();

    // Set global viewer-open flag (disables orientation warning)
    document.body.classList.add('nft-viewer-open');
    window.__NFT_VIEWER_OPEN = true;

    // Hard-hide orientation warning and trigger check
    hideOrientationWarningHard();
    window.dispatchEvent(new Event('resize'));

    onOpen(nftList[currentIndex]);
  }

  function openByMesh(mesh) {
    nftList = getNFTList();
    const idx = nftList.findIndex(nft => nft.mesh === mesh);
    if (idx !== -1) {
      openByIndex(idx);
    } else {
      // Fallback: try to match by userData.index
      const userDataIndex = mesh.userData?.index;
      if (userDataIndex !== undefined) {
        const fallbackIdx = nftList.findIndex(nft => nft.mesh.userData?.index === userDataIndex);
        if (fallbackIdx !== -1) {
          openByIndex(fallbackIdx);
        } else {
          console.error('[Viewer] openByMesh failed - mesh not found in NFT list');
        }
      }
    }
  }

  function close() {
    viewerOverlay.style.display = 'none';
    isViewerOpen = false;
    controls.lock();

    // Clear global viewer-open flag (re-enables orientation warning)
    document.body.classList.remove('nft-viewer-open');
    window.__NFT_VIEWER_OPEN = false;

    // Trigger orientation check to show warning if needed
    window.dispatchEvent(new Event('resize'));

    onClose();
  }

  // ----------------------------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------------------------

  // Arrow clicks (using click only to avoid double-firing with touch events)
  leftArrow.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    goPrev();
  });

  rightArrow.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    goNext();
  });

  // Close button (using click only to avoid double-firing with touch events)
  closeButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });

  // Overlay background clicks (strict - only overlay itself, not children)
  viewerOverlay.addEventListener('click', (event) => {
    // STRICT: Only allow clicks on the overlay background itself
    if (event.target !== viewerOverlay) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    // Close viewer when clicking on background
    close();
  });

  // Prevent context menu
  viewerOverlay.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  // Keyboard navigation
  function handleKeyDown(event) {
    if (!isViewerOpen) return;

    if (event.key === 'Escape') {
      close();
    } else if (event.key === 'ArrowLeft') {
      goPrev();
    } else if (event.key === 'ArrowRight') {
      goNext();
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  // Touch/swipe handlers for portrait mode
  let touchStartTime = null;
  const SWIPE_MAX_DURATION = 300; // ms
  const SWIPE_MIN_DISTANCE = 40;  // px

  viewerOverlay.addEventListener('touchstart', (e) => {
    // Only enable swipe when flag is set AND mobile AND portrait
    if (!enablePortraitSwipe || !isMobile || !isPortrait) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = performance.now();
  });

  viewerOverlay.addEventListener('touchend', (e) => {
    // Only process swipe when flag is set AND mobile AND portrait
    if (!enablePortraitSwipe || !isMobile || !isPortrait || touchStartX === null) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const duration = performance.now() - touchStartTime;

    // Only treat as swipe if within duration, mostly horizontal, and significant distance
    if (duration < SWIPE_MAX_DURATION && Math.abs(dx) > SWIPE_MIN_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        goNext();  // Swipe left → next
      } else {
        goPrev();  // Swipe right → prev
      }
    }

    touchStartX = null;
    touchStartY = null;
    touchStartTime = null;
  });

  // ----------------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------------

  return {
    openByIndex,
    openByMesh,
    close,
    isOpen() {
      return isViewerOpen;
    },
    getCurrentIndex() {
      return currentIndex;
    }
  };
}
