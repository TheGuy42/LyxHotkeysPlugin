/**
 * Popup Script for LyX Hotkey Extension
 * Refactored to use modular architecture with proper error handling and logging
 */

// Initialize modules when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for logger to be available
  while (typeof LyXLogger === 'undefined') {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const logger = LyXLogger.getLogger('Popup');
  const uiUtils = LyXUIUtils.getUIUtils(logger);
  
  logger.info('Popup initializing...');
  
  // Initialize popup controller
  const popupController = new PopupController(logger, uiUtils);
  await popupController.initialize();
  
  logger.info('Popup initialized successfully');
});

/**
 * Popup Controller class to manage popup interface
 */
class PopupController {
  constructor(logger, uiUtils) {
    this.logger = logger;
    this.uiUtils = uiUtils;
    this.messageHandler = null;
    this.currentState = {
      enabled: false,
      mappings: {},
      pageCompatible: false
    };
  }

  /**
   * Initialize the popup controller
   */
  async initialize() {
    try {
      // Get DOM elements
      this.elements = this.getElements();
      
      // Set up message handler
      this.setupMessageHandler();
      
      // Load initial state
      await this.loadInitialState();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Check current page compatibility
      await this.checkPageCompatibility();
      
      // Update UI
      this.updateUI();
      
      this.logger.debug('Popup controller initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize popup:', error);
      this.uiUtils.showStatus('Failed to initialize popup', 'error');
    }
  }

  /**
   * Get required DOM elements
   */
  getElements() {
    return {
      toggleSwitch: this.uiUtils.getElementById('toggleSwitch'),
      status: this.uiUtils.getElementById('status'),
      hotkeyCount: this.uiUtils.getElementById('hotkeyCount'),
      pageStatus: this.uiUtils.getElementById('pageStatus'),
      openOptionsBtn: this.uiUtils.getElementById('openOptions'),
      testModeBtn: this.uiUtils.getElementById('testMode')
    };
  }

  /**
   * Set up message handler for communication
   */
  setupMessageHandler() {
    // For popup, we'll use direct chrome.runtime.sendMessage calls
    // since we don't need the full message handler infrastructure
    this.messageHandler = {
      sendToBackground: async (message) => {
        return new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              this.logger.error('Message to background failed:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              this.logger.trace('Message sent:', message.action);
              resolve(response);
            }
          });
        });
      }
    };
  }

  /**
   * Load initial state from background script
   */
  async loadInitialState() {
    try {
      // First try to get state from background script
      const response = await this.messageHandler.sendToBackground({ action: 'getState' });
      
      if (response) {
        this.currentState.enabled = response.enabled;
        this.currentState.mappings = response.mappings || {};
        this.logger.debug('State loaded from background script');
      } else {
        throw new Error('No response from background script');
      }
      
    } catch (error) {
      this.logger.warn('Failed to get state from background, trying storage:', error);
      
      // Fallback: try to get from storage directly
      try {
        const result = await chrome.storage.local.get(['enabled', 'hotkeyMappings']);
        this.currentState.enabled = result.enabled ?? false;
        this.currentState.mappings = result.hotkeyMappings || {};
        this.logger.debug('State loaded from storage');
      } catch (storageError) {
        this.logger.error('Failed to get from storage:', storageError);
        this.uiUtils.showStatus('Failed to load extension state', 'error');
      }
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Toggle switch
    this.uiUtils.addEventListener(this.elements.toggleSwitch, 'click', async () => {
      await this.handleToggleExtension();
    });

    // Open options page
    this.uiUtils.addEventListener(this.elements.openOptionsBtn, 'click', () => {
      this.handleOpenOptions();
    });

    // Test mode
    this.uiUtils.addEventListener(this.elements.testModeBtn, 'click', () => {
      this.handleTestMode();
    });

    // Add debug button
    this.addDebugButton();
  }

  /**
   * Handle extension toggle
   */
  async handleToggleExtension() {
    try {
      const response = await this.messageHandler.sendToBackground({ 
        action: 'toggleExtension' 
      });
      
      if (response && typeof response.enabled === 'boolean') {
        this.currentState.enabled = response.enabled;
        this.updateUI();
        this.logger.info(`Extension ${response.enabled ? 'enabled' : 'disabled'}`);
      } else {
        throw new Error('Invalid response from background script');
      }
      
    } catch (error) {
      this.logger.error('Failed to toggle extension:', error);
      this.uiUtils.showStatus('Failed to toggle extension', 'error');
    }
  }

  /**
   * Handle opening options page
   */
  handleOpenOptions() {
    try {
      chrome.runtime.openOptionsPage();
      window.close();
    } catch (error) {
      this.logger.error('Failed to open options page:', error);
      this.uiUtils.showStatus('Failed to open options page', 'error');
    }
  }

  /**
   * Handle test mode
   */
  handleTestMode() {
    try {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL('test.html')
      });
      window.close();
    } catch (error) {
      this.logger.error('Failed to open test page:', error);
      this.uiUtils.showStatus('Failed to open test page', 'error');
    }
  }

  /**
   * Add debug button
   */
  addDebugButton() {
    const debugBtn = document.createElement('button');
    debugBtn.className = 'btn btn-secondary';
    debugBtn.textContent = 'Debug Keys';
    debugBtn.style.marginTop = '5px';
    
    this.uiUtils.addEventListener(debugBtn, 'click', () => {
      this.handleDebugMode();
    });
    
    // Append to test mode button's parent
    if (this.elements.testModeBtn.parentNode) {
      this.elements.testModeBtn.parentNode.appendChild(debugBtn);
    }
  }

  /**
   * Handle debug mode
   */
  handleDebugMode() {
    try {
      chrome.tabs.create({ 
        url: chrome.runtime.getURL('debug.html')
      });
      window.close();
    } catch (error) {
      this.logger.error('Failed to open debug page:', error);
      this.uiUtils.showStatus('Failed to open debug page', 'error');
    }
  }

  /**
   * Check if current page is compatible with the extension
   */
  async checkPageCompatibility() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        this.currentState.pageCompatible = false;
        return;
      }
      
      const url = tab.url;
      
      // Check for incompatible pages
      if (url.startsWith('chrome://') || 
          url.startsWith('edge://') ||
          url.startsWith('about:') ||
          url.startsWith('moz-extension://')) {
        this.currentState.pageCompatible = false;
        this.currentState.pageType = 'incompatible';
      } 
      // Check for extension pages
      else if (url.includes('test.html') || url.includes('debug.html')) {
        this.currentState.pageCompatible = true;
        this.currentState.pageType = 'test';
      }
      // Check for regular web pages
      else if (url.startsWith('http://') || 
               url.startsWith('https://') ||
               url.startsWith('chrome-extension://')) {
        this.currentState.pageCompatible = true;
        this.currentState.pageType = 'web';
      } 
      else {
        this.currentState.pageCompatible = false;
        this.currentState.pageType = 'unknown';
      }
      
      this.logger.debug(`Page compatibility: ${this.currentState.pageCompatible}, type: ${this.currentState.pageType}`);
      
    } catch (error) {
      this.logger.error('Failed to check page compatibility:', error);
      this.currentState.pageCompatible = false;
      this.currentState.pageType = 'error';
    }
  }

  /**
   * Update the UI with current state
   */
  updateUI() {
    // Update toggle switch
    this.elements.toggleSwitch.classList.toggle('active', this.currentState.enabled);
    
    // Update status
    this.elements.status.className = this.currentState.enabled ? 'status enabled' : 'status disabled';
    this.uiUtils.setTextContent(this.elements.status, 
      this.currentState.enabled 
        ? 'Extension is active and monitoring hotkeys'
        : 'Extension is disabled'
    );
    
    // Update hotkey count
    const count = this.currentState.mappings ? Object.keys(this.currentState.mappings).length : 0;
    this.uiUtils.setTextContent(this.elements.hotkeyCount, this.uiUtils.formatNumber(count));
    
    // Update page status
    this.updatePageStatus();
    
    this.logger.debug('UI updated', {
      enabled: this.currentState.enabled,
      mappingCount: count,
      pageCompatible: this.currentState.pageCompatible
    });
  }

  /**
   * Update page compatibility status
   */
  updatePageStatus() {
    let statusText, statusColor;
    
    switch (this.currentState.pageType) {
      case 'incompatible':
        statusText = 'Not Compatible';
        statusColor = '#991b1b';
        break;
      case 'test':
        statusText = 'Test Page';
        statusColor = '#2563eb';
        break;
      case 'web':
        statusText = 'Compatible';
        statusColor = '#2d662d';
        break;
      case 'error':
        statusText = 'Error';
        statusColor = '#991b1b';
        break;
      default:
        statusText = 'Unknown';
        statusColor = '#6b7280';
    }
    
    this.uiUtils.setTextContent(this.elements.pageStatus, statusText);
    this.elements.pageStatus.style.color = statusColor;
  }

  /**
   * Get current mappings from storage
   */
  async getCurrentMappings() {
    try {
      const result = await chrome.storage.local.get(['hotkeyMappings']);
      return result.hotkeyMappings || {};
    } catch (error) {
      this.logger.error('Failed to get current mappings:', error);
      return {};
    }
  }
}