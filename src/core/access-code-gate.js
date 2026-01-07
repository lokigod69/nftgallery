/**
 * Access Code Gate System
 *
 * Provides an 8-digit access code prompt for restricted room access.
 * Features:
 * - Server-side validation via Vercel API
 * - One attempt only (failed code blocks further access)
 * - localStorage caching (successful validation persists)
 * - Clean modal UI overlay
 */

const STORAGE_KEY = 'nft_gallery_room6_access_granted';
const API_ENDPOINT = '/api/validate-access';

/**
 * Check if user has already been granted access
 * @returns {boolean} True if access previously granted
 */
export function hasAccessGranted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (e) {
    console.warn('localStorage not available:', e);
    return false;
  }
}

/**
 * Grant access and store in localStorage
 */
function grantAccess() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch (e) {
    console.warn('Could not store access grant:', e);
  }
}

/**
 * Block access permanently (failed attempt)
 */
function blockAccess() {
  try {
    localStorage.setItem(STORAGE_KEY, 'failed');
  } catch (e) {
    console.warn('Could not store access block:', e);
  }
}

/**
 * Check if user has failed access attempt
 * @returns {boolean} True if user previously failed
 */
export function hasAccessFailed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'failed';
  } catch (e) {
    return false;
  }
}

/**
 * Validate access code with server
 * @param {string} code - 8-digit access code
 * @returns {Promise<boolean>} True if code is valid
 */
async function validateCode(code) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('Access code validation error:', error);
    return false;
  }
}

/**
 * Create and show access code modal
 * @returns {Promise<boolean>} Resolves to true if access granted, false if denied
 */
export async function showAccessCodePrompt() {
  // Check if already granted
  if (hasAccessGranted()) {
    return true;
  }

  // Check if previously failed
  if (hasAccessFailed()) {
    showFailedMessage('Access Denied', 'You have previously entered an incorrect code. Access to Room 6 is blocked.');
    return false;
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'access-code-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: 'Courier New', monospace;
  `;

  // Create modal container
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(135deg, #1a0000 0%, #000000 100%);
    border: 3px solid #ff0000;
    border-radius: 10px;
    padding: 40px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 0 30px rgba(255, 0, 0, 0.5), 0 0 60px rgba(0, 0, 0, 0.8);
    text-align: center;
  `;

  // Create title
  const title = document.createElement('h2');
  title.textContent = 'RESTRICTED ACCESS';
  title.style.cssText = `
    color: #ff0000;
    font-size: 28px;
    margin: 0 0 20px 0;
    text-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
    letter-spacing: 3px;
  `;

  // Create description
  const description = document.createElement('p');
  description.textContent = 'Enter 8-digit access code to proceed to Room 6';
  description.style.cssText = `
    color: #cccccc;
    font-size: 16px;
    margin: 0 0 30px 0;
    line-height: 1.6;
  `;

  // Create warning
  const warning = document.createElement('p');
  warning.textContent = '⚠️ WARNING: One attempt only';
  warning.style.cssText = `
    color: #ff6600;
    font-size: 14px;
    margin: 0 0 25px 0;
    font-weight: bold;
  `;

  // Create input
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 8;
  input.placeholder = '••••••••';
  input.style.cssText = `
    width: 100%;
    padding: 15px;
    font-size: 24px;
    font-family: 'Courier New', monospace;
    text-align: center;
    background: #000000;
    color: #00ff00;
    border: 2px solid #ff0000;
    border-radius: 5px;
    margin-bottom: 25px;
    letter-spacing: 8px;
    box-sizing: border-box;
    outline: none;
  `;

  // Only allow digits
  input.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 15px;
    justify-content: center;
  `;

  // Create submit button
  const submitButton = document.createElement('button');
  submitButton.textContent = 'SUBMIT';
  submitButton.style.cssText = `
    padding: 12px 40px;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    background: linear-gradient(135deg, #ff0000 0%, #aa0000 100%);
    color: #ffffff;
    border: 2px solid #ff0000;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s;
    letter-spacing: 2px;
  `;

  submitButton.addEventListener('mouseenter', () => {
    submitButton.style.background = 'linear-gradient(135deg, #ff3333 0%, #cc0000 100%)';
    submitButton.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.6)';
  });

  submitButton.addEventListener('mouseleave', () => {
    submitButton.style.background = 'linear-gradient(135deg, #ff0000 0%, #aa0000 100%)';
    submitButton.style.boxShadow = 'none';
  });

  // Create cancel button
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'CANCEL';
  cancelButton.style.cssText = `
    padding: 12px 40px;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    background: transparent;
    color: #888888;
    border: 2px solid #444444;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s;
    letter-spacing: 2px;
  `;

  cancelButton.addEventListener('mouseenter', () => {
    cancelButton.style.borderColor = '#888888';
    cancelButton.style.color = '#cccccc';
  });

  cancelButton.addEventListener('mouseleave', () => {
    cancelButton.style.borderColor = '#444444';
    cancelButton.style.color = '#888888';
  });

  // Assemble modal
  buttonContainer.appendChild(submitButton);
  buttonContainer.appendChild(cancelButton);
  modal.appendChild(title);
  modal.appendChild(description);
  modal.appendChild(warning);
  modal.appendChild(input);
  modal.appendChild(buttonContainer);
  overlay.appendChild(modal);

  // Add to DOM
  document.body.appendChild(overlay);
  input.focus();

  // Return promise that resolves when user submits or cancels
  return new Promise((resolve) => {
    // Handle submit
    const handleSubmit = async () => {
      const code = input.value.trim();

      // Validate length
      if (code.length !== 8) {
        showError('Code must be exactly 8 digits');
        return;
      }

      // Disable input and show loading
      input.disabled = true;
      submitButton.disabled = true;
      submitButton.textContent = 'VALIDATING...';
      submitButton.style.opacity = '0.6';

      // Validate with server
      const isValid = await validateCode(code);

      if (isValid) {
        // Grant access
        grantAccess();

        // Show success message
        showSuccessMessage();

        // Clean up and resolve
        setTimeout(() => {
          overlay.remove();
          resolve(true);
        }, 2000);
      } else {
        // Block future access
        blockAccess();

        // Show failure message
        showFailureMessage();

        // Clean up and resolve
        setTimeout(() => {
          overlay.remove();
          resolve(false);
        }, 3000);
      }
    };

    // Handle cancel
    const handleCancel = () => {
      overlay.remove();
      resolve(false);
    };

    // Event listeners
    submitButton.addEventListener('click', handleSubmit);
    cancelButton.addEventListener('click', handleCancel);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    });

    // Helper: Show error message
    function showError(message) {
      const existingError = modal.querySelector('.error-message');
      if (existingError) {
        existingError.remove();
      }

      const errorMsg = document.createElement('div');
      errorMsg.className = 'error-message';
      errorMsg.textContent = message;
      errorMsg.style.cssText = `
        color: #ff3333;
        font-size: 14px;
        margin-top: -15px;
        margin-bottom: 15px;
      `;

      modal.insertBefore(errorMsg, buttonContainer);
    }

    // Helper: Show success message
    function showSuccessMessage() {
      modal.innerHTML = '';
      modal.style.background = 'linear-gradient(135deg, #001a00 0%, #000000 100%)';
      modal.style.borderColor = '#00ff00';

      const successTitle = document.createElement('h2');
      successTitle.textContent = '✓ ACCESS GRANTED';
      successTitle.style.cssText = `
        color: #00ff00;
        font-size: 32px;
        margin: 20px 0;
        text-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
        letter-spacing: 3px;
      `;

      const successMsg = document.createElement('p');
      successMsg.textContent = 'Welcome to Room 6';
      successMsg.style.cssText = `
        color: #cccccc;
        font-size: 18px;
        margin: 20px 0;
      `;

      modal.appendChild(successTitle);
      modal.appendChild(successMsg);
    }

    // Helper: Show failure message
    function showFailureMessage() {
      modal.innerHTML = '';

      const failTitle = document.createElement('h2');
      failTitle.textContent = '✗ ACCESS DENIED';
      failTitle.style.cssText = `
        color: #ff0000;
        font-size: 32px;
        margin: 20px 0;
        text-shadow: 0 0 15px rgba(255, 0, 0, 0.8);
        letter-spacing: 3px;
      `;

      const failMsg = document.createElement('p');
      failMsg.textContent = 'Incorrect code. Access to Room 6 is now permanently blocked.';
      failMsg.style.cssText = `
        color: #ff6666;
        font-size: 16px;
        margin: 20px 0;
        line-height: 1.6;
      `;

      modal.appendChild(failTitle);
      modal.appendChild(failMsg);
    }
  });
}

/**
 * Show a message to user who has previously failed
 */
function showFailedMessage(title, message) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: 'Courier New', monospace;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: linear-gradient(135deg, #1a0000 0%, #000000 100%);
    border: 3px solid #ff0000;
    border-radius: 10px;
    padding: 40px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 0 30px rgba(255, 0, 0, 0.5);
    text-align: center;
  `;

  const titleEl = document.createElement('h2');
  titleEl.textContent = title;
  titleEl.style.cssText = `
    color: #ff0000;
    font-size: 28px;
    margin: 0 0 20px 0;
    text-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
    letter-spacing: 3px;
  `;

  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.cssText = `
    color: #ff6666;
    font-size: 16px;
    margin: 0 0 30px 0;
    line-height: 1.6;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = 'CLOSE';
  closeButton.style.cssText = `
    padding: 12px 40px;
    font-size: 16px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    background: transparent;
    color: #888888;
    border: 2px solid #444444;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s;
    letter-spacing: 2px;
  `;

  closeButton.addEventListener('click', () => {
    overlay.remove();
  });

  modal.appendChild(titleEl);
  modal.appendChild(messageEl);
  modal.appendChild(closeButton);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
