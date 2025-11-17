import * as THREE from 'three';

/**
 * Unified NFT Viewer System
 *
 * Creates a full-screen overlay for viewing NFTs with navigation controls.
 * Handles raycasting, click detection, and viewer state management.
 *
 * @param {Object} config - Configuration object
 * @param {THREE.Scene} config.scene - Three.js scene
 * @param {THREE.Camera} config.camera - Three.js camera
 * @param {PointerLockControls} config.controls - Pointer lock controls
 * @param {THREE.WebGLRenderer} config.renderer - Three.js renderer
 * @param {Array<THREE.Mesh>} config.nftMeshes - Array of NFT meshes to raycast against
 * @param {Array<Object>} config.nftMetadata - Array of NFT metadata objects
 * @param {Object} config.checkPortalProximity - Optional portal proximity checker with pause/resume
 * @param {Function} config.onOpen - Optional callback when viewer opens
 * @param {Function} config.onClose - Optional callback when viewer closes
 * @returns {Object} API object with destroy() method
 */
export function initNFTViewer(config) {
  const {
    scene,
    camera,
    controls,
    renderer,
    nftMeshes,
    nftMetadata = [],
    checkPortalProximity = null,
    onOpen = () => {},
    onClose = () => {}
  } = config;

  // Internal state
  let currentNFTIndex = -1;
  let isViewerOpen = false;

  // Create raycaster for NFT detection
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // ----------------------------------------------------------------------
  // DOM Structure
  // ----------------------------------------------------------------------

  // Create full-screen overlay
  const viewerOverlay = document.createElement('div');
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
  viewerOverlay.style.zIndex = '1000';

  // Create container for image and navigation
  const viewerContainer = document.createElement('div');
  viewerContainer.style.position = 'relative';
  viewerContainer.style.width = '80%';
  viewerContainer.style.height = '80%';
  viewerContainer.style.display = 'flex';
  viewerContainer.style.alignItems = 'center';
  viewerContainer.style.justifyContent = 'center';
  viewerOverlay.appendChild(viewerContainer);

  // Left arrow
  const leftArrow = document.createElement('div');
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

  // Media element (image or video)
  const viewerImage = document.createElement('img');
  viewerImage.style.maxWidth = '90%';
  viewerImage.style.maxHeight = '90%';
  viewerImage.style.objectFit = 'contain';
  viewerContainer.appendChild(viewerImage);

  // Right arrow
  const rightArrow = document.createElement('div');
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

  // NFT info display
  const nftInfo = document.createElement('div');
  nftInfo.style.marginTop = '20px';
  nftInfo.style.color = 'white';
  nftInfo.style.fontSize = '18px';
  nftInfo.style.textAlign = 'center';
  viewerOverlay.appendChild(nftInfo);

  // Purchase link
  const purchaseLink = document.createElement('a');
  purchaseLink.href = 'https://opensea.io';
  purchaseLink.innerText = 'Buy NFT on OpenSea';
  purchaseLink.style.marginTop = '20px';
  purchaseLink.style.color = '#fff';
  purchaseLink.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  purchaseLink.style.padding = '10px 20px';
  purchaseLink.style.textDecoration = 'none';
  purchaseLink.style.borderRadius = '5px';
  viewerOverlay.appendChild(purchaseLink);

  // Instructions
  const viewerInstructions = document.createElement('div');
  viewerInstructions.style.position = 'absolute';
  viewerInstructions.style.bottom = '20px';
  viewerInstructions.style.color = 'white';
  viewerInstructions.style.fontSize = '14px';
  viewerInstructions.style.opacity = '0.7';
  viewerInstructions.textContent = 'Left/Right Click to Navigate • Press ESC to Close';
  viewerOverlay.appendChild(viewerInstructions);

  document.body.appendChild(viewerOverlay);

  // ----------------------------------------------------------------------
  // Navigation Functions
  // ----------------------------------------------------------------------

  function showPreviousNFT() {
    if (nftMetadata.length === 0) return;
    currentNFTIndex--;
    if (currentNFTIndex < 0) currentNFTIndex = nftMetadata.length - 1;
    updateViewer();
  }

  function showNextNFT() {
    if (nftMetadata.length === 0) return;
    currentNFTIndex++;
    if (currentNFTIndex >= nftMetadata.length) currentNFTIndex = 0;
    updateViewer();
  }

  function updateViewer() {
    if (currentNFTIndex < 0 || currentNFTIndex >= nftMetadata.length) return;

    const nft = nftMetadata[currentNFTIndex];
    viewerImage.src = nft.url;
    nftInfo.textContent = `NFT #${nft.id} (${currentNFTIndex + 1}/${nftMetadata.length})`;
    purchaseLink.href = `https://opensea.io/assets/${nft.id}`;
  }

  function openViewer(nftId) {
    // Find NFT in metadata
    currentNFTIndex = nftMetadata.findIndex(nft => nft.id === nftId);
    if (currentNFTIndex === -1 && nftMetadata.length > 0) {
      currentNFTIndex = 0;
    }

    updateViewer();
    viewerOverlay.style.display = 'flex';
    isViewerOpen = true;

    // Unlock controls for cursor interaction
    controls.unlock();

    // Pause portal proximity checks if provided
    if (checkPortalProximity && checkPortalProximity.pause) {
      checkPortalProximity.pause();
    }

    // Call user callback
    onOpen(nftMetadata[currentNFTIndex]);
  }

  function closeViewer() {
    viewerOverlay.style.display = 'none';
    isViewerOpen = false;

    // Re-lock controls
    controls.lock();

    // Resume portal proximity checks if provided
    if (checkPortalProximity && checkPortalProximity.resume) {
      checkPortalProximity.resume();
    }

    // Call user callback
    onClose();
  }

  // ----------------------------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------------------------

  // Arrow click handlers
  function handleLeftArrowClick(event) {
    event.stopPropagation();
    showPreviousNFT();
  }

  function handleRightArrowClick(event) {
    event.stopPropagation();
    showNextNFT();
  }

  leftArrow.addEventListener('click', handleLeftArrowClick);
  rightArrow.addEventListener('click', handleRightArrowClick);

  // Overlay click for navigation
  function handleOverlayClick(event) {
    if (event.button === 0) { // Left click
      showNextNFT();
    } else if (event.button === 2) { // Right click
      showPreviousNFT();
    }
    event.stopPropagation();
  }

  viewerOverlay.addEventListener('click', handleOverlayClick);

  // Prevent context menu on overlay
  function handleContextMenu(event) {
    event.preventDefault();
  }

  viewerOverlay.addEventListener('contextmenu', handleContextMenu);

  // Keyboard navigation
  function handleKeyDown(event) {
    if (!isViewerOpen) return;

    if (event.key === 'Escape') {
      closeViewer();
    } else if (event.key === 'ArrowLeft') {
      showPreviousNFT();
    } else if (event.key === 'ArrowRight') {
      showNextNFT();
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  // NFT click detection
  function handleNFTClick(event) {
    // Don't process if viewer is already open
    if (isViewerOpen) return;

    // Only process when controls are locked (player is in game mode)
    if (!controls.isLocked) return;

    // Raycast from mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(nftMeshes, false);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.userData && object.userData.isNFT && object.userData.index !== undefined) {
        openViewer(object.userData.index);
        event.stopPropagation();
        event.preventDefault();
      }
    }
  }

  window.addEventListener('click', handleNFTClick);

  // ----------------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------------

  return {
    destroy() {
      // Remove event listeners
      leftArrow.removeEventListener('click', handleLeftArrowClick);
      rightArrow.removeEventListener('click', handleRightArrowClick);
      viewerOverlay.removeEventListener('click', handleOverlayClick);
      viewerOverlay.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleNFTClick);

      // Remove DOM
      if (viewerOverlay.parentNode) {
        viewerOverlay.parentNode.removeChild(viewerOverlay);
      }
    }
  };
}
