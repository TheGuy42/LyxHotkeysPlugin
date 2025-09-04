/**
 * Refactored Popup Script for LyX Hotkey Extension
 * Uses modular architecture for better maintainability
 */

class LyXPopup {
  constructor() {
    this.eventManager = new EventManager();
    this.state = {
      enabled: false,
      mappings: {},
      pageCompatible: false
    };
    
    // UI Elements
    this.elements = {};
    
    this.initialize();
  }

  /**
   * Initialize the popup
   */
  async initialize() {
    console.log('🔧 LyX Popup: Initializing...');
    
    try {
      // Get UI elements
      this.getUIElements();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI with default state
      this.updateUI(false, {});
      
      // Load current state
      await this.loadCurrentState();
      
      // Check page compatibility
      await this.checkPageCompatibility();
      
      console.log('✅ LyX Popup: Initialization completed');
      
    } catch (error) {
      console.error('❌ LyX Popup: Initialization failed:', error);
    }
  }

  /**
   * Get UI elements
   */
  getUIElements() {
    this.elements = {
      toggleSwitch: document.getElementById('toggleSwitch'),
      status: document.getElementById('status'),
      hotkeyCount: document.getElementById('hotkeyCount'),
      pageStatus: document.getElementById('pageStatus'),
      openOptionsBtn: document.getElementById('openOptions'),
      testModeBtn: document.getElementById('testMode')
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle switch
    if (this.elements.toggleSwitch) {
      this.elements.toggleSwitch.addEventListener('click', () => {
        this.toggleExtension();
      });
    }

    // Options button
    if (this.elements.openOptionsBtn) {
      this.elements.openOptionsBtn.addEventListener('click', () => {
        this.openOptionsPage();
      });
    }

    // Test mode button
    if (this.elements.testModeBtn) {
      this.elements.testModeBtn.addEventListener('click', () => {
        this.openTestMode();
      });
    }

    // Add debug button
    this.addDebugButton();
  }

  /**
   * Add debug button for development
   */
  addDebugButton() {
    if (!this.elements.testModeBtn) return;
    
    const debugBtn = document.createElement('button');
    debugBtn.className = 'btn btn-secondary';
    debugBtn.textContent = 'Debug Keys';
    debugBtn.style.marginTop = '5px';
    debugBtn.addEventListener('click', () => {
      this.openDebugMode();
    });
    
    this.elements.testModeBtn.parentNode?.appendChild(debugBtn);
  }

  /**
   * Load current state from background script
   */
  async loadCurrentState() {
    try {
      console.log('LyX Popup: Requesting state from background...');
      const response = await this.eventManager.sendMessage({ action: 'getState' });
      
      console.log('LyX Popup: Background response:', response);
      
      if (response && !response.error) {
        this.state.enabled = response.enabled ?? false;
        this.state.mappings = response.mappings || {};
        this.updateUI(this.state.enabled, this.state.mappings);
        
        console.log('✅ LyX Popup: State loaded successfully');
      } else {
        console.warn('LyX Popup: Background response has error or is empty:', response);
        await this.loadStateFromStorage();
      }
      
    } catch (error) {
      console.error('LyX Popup: Failed to get extension state:', error);
      await this.loadStateFromStorage();
    }
  }

  /**
   * Load state from storage as fallback
   */
  async loadStateFromStorage() {
    try {
      const result = await this.getFromStorage(['enabled', 'hotkeyMappings']);
      this.state.enabled = result.enabled ?? false;
      this.state.mappings = result.hotkeyMappings || {};
      this.updateUI(this.state.enabled, this.state.mappings);
      
      console.log('✅ LyX Popup: State loaded from storage');
      
    } catch (error) {
      console.error('LyX Popup: Failed to get from storage:', error);
    }
  }

  /**
   * Toggle extension enabled state
   */
  async toggleExtension() {
    try {
      const response = await this.eventManager.sendMessage({ action: 'toggleExtension' });
      
      if (response) {
        this.state.enabled = response.enabled;
        this.updateUI(this.state.enabled, this.state.mappings);
        console.log(`LyX Extension ${response.enabled ? 'enabled' : 'disabled'}`);
      }
      
    } catch (error) {
      console.error('LyX Popup: Error toggling extension:', error);
    }
  }

  /**
   * Update UI based on current state
   */
  updateUI(enabled, mappings) {
    // Update toggle switch
    if (this.elements.toggleSwitch) {
      this.elements.toggleSwitch.classList.toggle('active', enabled);
    }
    
    // Update status
    if (this.elements.status) {
      this.elements.status.className = enabled ? 'status enabled' : 'status disabled';
      this.elements.status.textContent = enabled 
        ? 'Extension is active and monitoring hotkeys'
        : 'Extension is disabled';
    }
    
    // Update hotkey count
    if (this.elements.hotkeyCount) {
      const count = mappings ? Object.keys(mappings).length : 0;
      this.elements.hotkeyCount.textContent = count.toString();
    }
  }

  /**
   * Check current page compatibility
   */
  async checkPageCompatibility() {
    try {
      const [tab] = await this.queryTabs({ active: true, currentWindow: true });
      
      if (!tab || !this.elements.pageStatus) return;
      
      const status = this.getPageCompatibilityStatus(tab.url);
      this.elements.pageStatus.textContent = status.text;
      this.elements.pageStatus.style.color = status.color;
      
      this.state.pageCompatible = status.compatible;
      
    } catch (error) {
      console.error('LyX Popup: Error checking page compatibility:', error);
      if (this.elements.pageStatus) {
        this.elements.pageStatus.textContent = 'Unknown';
        this.elements.pageStatus.style.color = '#92400e';
      }
    }
  }

  /**
   * Get page compatibility status
   * @param {string} url - Page URL
   * @returns {Object} - Status object with text, color, and compatible flag
   */
  getPageCompatibilityStatus(url) {
    if (!url) {
      return { text: 'Unknown', color: '#92400e', compatible: false };
    }
    
    // Browser internal pages
    if (url.startsWith('chrome://') || 
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('moz-extension://')) {
      return { text: 'Not Compatible', color: '#991b1b', compatible: false };
    }
    
    // Extension test pages
    if (url.includes('test.html') || url.includes('debug.html')) {
      return { text: 'Test Page', color: '#2563eb', compatible: true };
    }
    
    // Web pages
    if (url.startsWith('http://') || 
        url.startsWith('https://') ||
        url.startsWith('chrome-extension://')) {
      return { text: 'Compatible', color: '#2d662d', compatible: true };
    }
    
    return { text: 'Unknown', color: '#92400e', compatible: false };
  }

  /**
   * Open options page
   */
  openOptionsPage() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  /**
   * Open test mode
   */
  openTestMode() {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('test.html')
    });
    window.close();
  }

  /**
   * Open debug mode
   */
  openDebugMode() {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('debug.html')
    });
    window.close();
  }

  /**
   * Query tabs (promisified)
   * @param {Object} queryInfo - Query information
   * @returns {Promise<Array>} - Array of tabs
   */
  async queryTabs(queryInfo) {
    return new Promise((resolve) => {
      chrome.tabs.query(queryInfo, resolve);
    });
  }

  /**
   * Get from storage (promisified)
   * @param {Array} keys - Keys to get
   * @returns {Promise<Object>} - Storage result
   */
  async getFromStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  /**
   * Get current extension state
   * @returns {Object} - Current state
   */
  getState() {
    return {
      ...this.state,
      initialized: true
    };
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.lyxPopup = new LyXPopup();
});
