/**
 * UI Utilities for LyX Hotkeys Extension
 * Common UI functions and helpers for popup and options pages
 */

/**
 * UI Utilities class for common UI operations
 */
class UIUtils {
  constructor(logger = null) {
    this.logger = logger || { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };
  }

  /**
   * Show status message with styling
   */
  showStatus(message, type = 'info', duration = 3000) {
    const statusElement = document.getElementById('status-message') || this.createStatusElement();
    
    // Clear existing classes
    statusElement.className = 'status-message';
    statusElement.classList.add(`status-${type}`);
    statusElement.textContent = message;
    statusElement.style.display = 'block';
    
    this.logger.debug(`Status shown: ${type} - ${message}`);
    
    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, duration);
    }
    
    return statusElement;
  }

  /**
   * Create status element if it doesn't exist
   */
  createStatusElement() {
    const statusElement = document.createElement('div');
    statusElement.id = 'status-message';
    statusElement.className = 'status-message';
    statusElement.style.cssText = `
      display: none;
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 400px;
      word-wrap: break-word;
    `;
    
    // Add styles for different types
    const styles = document.createElement('style');
    styles.textContent = `
      .status-message.status-success {
        background-color: #10b981;
        color: white;
      }
      .status-message.status-error {
        background-color: #ef4444;
        color: white;
      }
      .status-message.status-warning {
        background-color: #f59e0b;
        color: white;
      }
      .status-message.status-info {
        background-color: #3b82f6;
        color: white;
      }
    `;
    document.head.appendChild(styles);
    
    document.body.appendChild(statusElement);
    return statusElement;
  }

  /**
   * Create loading spinner
   */
  createLoadingSpinner(container, text = 'Loading...') {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
      <div class="spinner-animation"></div>
      <span class="spinner-text">${text}</span>
    `;
    
    // Add spinner styles
    const styles = document.createElement('style');
    styles.textContent = `
      .loading-spinner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px;
        color: #6b7280;
      }
      .spinner-animation {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .spinner-text {
        font-size: 14px;
      }
    `;
    
    if (!document.querySelector('style[data-component="spinner"]')) {
      styles.setAttribute('data-component', 'spinner');
      document.head.appendChild(styles);
    }
    
    if (container) {
      container.appendChild(spinner);
    }
    
    return spinner;
  }

  /**
   * Remove loading spinner
   */
  removeLoadingSpinner(container) {
    const spinner = container?.querySelector('.loading-spinner');
    if (spinner) {
      spinner.remove();
    }
  }

  /**
   * Create confirmation dialog
   */
  async showConfirmDialog(message, title = 'Confirm', options = {}) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirmation-dialog-overlay';
      dialog.innerHTML = `
        <div class="confirmation-dialog">
          <div class="dialog-header">
            <h3>${title}</h3>
          </div>
          <div class="dialog-body">
            <p>${message}</p>
          </div>
          <div class="dialog-actions">
            <button class="btn btn-secondary cancel-btn">${options.cancelText || 'Cancel'}</button>
            <button class="btn btn-primary confirm-btn">${options.confirmText || 'Confirm'}</button>
          </div>
        </div>
      `;
      
      // Add dialog styles
      this.addDialogStyles();
      
      const confirmBtn = dialog.querySelector('.confirm-btn');
      const cancelBtn = dialog.querySelector('.cancel-btn');
      
      confirmBtn.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(true);
      });
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog);
        resolve(false);
      });
      
      // Close on overlay click
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
          resolve(false);
        }
      });
      
      document.body.appendChild(dialog);
    });
  }

  /**
   * Add dialog styles to page
   */
  addDialogStyles() {
    if (document.querySelector('style[data-component="dialog"]')) return;
    
    const styles = document.createElement('style');
    styles.setAttribute('data-component', 'dialog');
    styles.textContent = `
      .confirmation-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .confirmation-dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow: auto;
      }
      .dialog-header {
        padding: 20px 20px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .dialog-header h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      .dialog-body {
        padding: 20px;
      }
      .dialog-body p {
        margin: 0;
        color: #6b7280;
        line-height: 1.5;
      }
      .dialog-actions {
        padding: 0 20px 20px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format number with thousand separators
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Get element by ID with error handling
   */
  getElementById(id, required = true) {
    const element = document.getElementById(id);
    if (!element && required) {
      this.logger.error(`Required element not found: ${id}`);
      throw new Error(`Required element not found: ${id}`);
    }
    return element;
  }

  /**
   * Set element text safely
   */
  setTextContent(elementOrId, text) {
    const element = typeof elementOrId === 'string' ? 
      document.getElementById(elementOrId) : elementOrId;
    
    if (element) {
      element.textContent = text;
    } else {
      this.logger.warn(`Element not found for text update: ${elementOrId}`);
    }
  }

  /**
   * Set element HTML safely
   */
  setInnerHTML(elementOrId, html) {
    const element = typeof elementOrId === 'string' ? 
      document.getElementById(elementOrId) : elementOrId;
    
    if (element) {
      element.innerHTML = html;
    } else {
      this.logger.warn(`Element not found for HTML update: ${elementOrId}`);
    }
  }

  /**
   * Add event listener with error handling
   */
  addEventListener(elementOrId, event, handler, options = {}) {
    const element = typeof elementOrId === 'string' ? 
      document.getElementById(elementOrId) : elementOrId;
    
    if (element) {
      element.addEventListener(event, (e) => {
        try {
          handler(e);
        } catch (error) {
          this.logger.error(`Error in event handler for ${event}:`, error);
        }
      }, options);
    } else {
      this.logger.warn(`Element not found for event listener: ${elementOrId}`);
    }
  }

  /**
   * Handle file upload with progress
   */
  async handleFileUpload(inputElement, options = {}) {
    return new Promise((resolve, reject) => {
      const file = inputElement.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      // Validate file size
      const maxSize = options.maxSize || 1024 * 1024; // 1MB default
      if (file.size > maxSize) {
        reject(new Error(`File too large. Maximum size: ${this.formatFileSize(maxSize)}`));
        return;
      }
      
      // Validate file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        reject(new Error(`Invalid file type. Allowed: ${options.allowedTypes.join(', ')}`));
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          content: e.target.result,
          lastModified: file.lastModified
        });
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // Read as text by default, can be overridden
      const readMethod = options.readAs || 'text';
      switch (readMethod) {
        case 'text':
          reader.readAsText(file);
          break;
        case 'dataurl':
          reader.readAsDataURL(file);
          break;
        case 'arraybuffer':
          reader.readAsArrayBuffer(file);
          break;
        default:
          reader.readAsText(file);
      }
    });
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.logger.debug('Text copied to clipboard using modern API');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.logger.debug('Text copied to clipboard using fallback method');
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Download text as file
   */
  downloadTextAsFile(text, filename, type = 'text/plain') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    this.logger.debug(`File downloaded: ${filename}`);
  }
}

// Global instance
let globalUIUtils = null;

/**
 * Get or create global UI utils instance
 */
function getUIUtils(logger = null) {
  if (!globalUIUtils) {
    globalUIUtils = new UIUtils(logger);
  }
  return globalUIUtils;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = { UIUtils, getUIUtils };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.LyXUIUtils = { UIUtils, getUIUtils };
}