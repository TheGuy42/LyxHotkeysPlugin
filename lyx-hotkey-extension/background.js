/**
 * Refactored Background Script for LyX Hotkey Extension
 * Uses modular architecture for better maintainability
 */

class LyXBackgroundExtension {
  constructor() {
    console.log('🏗️ LyX Background: Initializing...');
    
    // Initialize core modules
    this.eventManager = new EventManager();
    this.configManager = new ConfigurationManager(this.eventManager);
    
    // State
    this.isInitialized = false;
    
    this.initialize();
  }

  /**
   * Initialize the background extension
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize configuration manager
      await this.configManager.initialize();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup Chrome extension event handlers
      this.setupExtensionEventHandlers();
      
      this.isInitialized = true;
      console.log('✅ LyX Background: Initialization completed successfully');
      
    } catch (error) {
      console.error('❌ LyX Background: Initialization failed:', error);
    }
  }

  /**
   * Setup internal event listeners
   */
  setupEventListeners() {
    // Listen for configuration events
    this.eventManager.on('mappingsUpdated', (mappings) => {
      this.notifyAllTabs('mappingsUpdated', {
        mappings: Object.fromEntries(mappings)
      });
    });

    this.eventManager.on('enabledToggled', (enabled) => {
      this.notifyAllTabs('extensionToggled', { enabled });
    });

    this.eventManager.on('sequenceTimeoutUpdated', (timeout) => {
      this.notifyAllTabs('sequenceTimeoutUpdated', { timeout });
    });

    this.eventManager.on('settingsUpdated', (settings) => {
      // Notify tabs of relevant setting changes
      this.notifyAllTabs('settingsUpdated', { settings });
    });
  }

  /**
   * Setup Chrome extension event handlers
   */
  setupExtensionEventHandlers() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener(() => {
      this.handleInstall();
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Handle messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      return this.eventManager.handleMessage(request, sender, sendResponse);
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Register additional message handlers
    this.registerMessageHandlers();
  }

  /**
   * Register message handlers
   */
  registerMessageHandlers() {
    // Toggle extension
    this.eventManager.onMessage('toggleExtension', async () => {
      return await this.configManager.toggleEnabled();
    });

    // Get current state
    this.eventManager.onMessage('getState', () => {
      return this.configManager.getState();
    });

    // Get initial state for content scripts
    this.eventManager.onMessage('getInitialState', () => {
      return this.configManager.getState();
    });
  }

  /**
   * Handle extension installation
   */
  async handleInstall() {
    console.log('🔧 LyX Background: Extension installed, loading defaults...');
    
    try {
      // Configuration manager will handle loading defaults
      await this.configManager.loadDefaultMappings();
      console.log('✅ LyX Background: Default configuration loaded');
    } catch (error) {
      console.error('❌ LyX Background: Error loading defaults:', error);
    }
  }

  /**
   * Handle extension startup
   */
  async handleStartup() {
    console.log('🔧 LyX Background: Extension starting up...');
    
    try {
      // Re-initialize configuration manager
      await this.configManager.initialize();
      console.log('✅ LyX Background: Startup completed');
    } catch (error) {
      console.error('❌ LyX Background: Error during startup:', error);
    }
  }

  /**
   * Handle tab updates
   */
  handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && 
        (tab.url.startsWith('http') || tab.url.startsWith('https'))) {
      
      // Send current state to the tab
      const state = this.configManager.getState();
      
      chrome.tabs.sendMessage(tabId, {
        action: 'extensionToggled',
        enabled: state.enabled
      }).catch(() => {}); // Ignore errors
      
      chrome.tabs.sendMessage(tabId, {
        action: 'mappingsUpdated',
        mappings: state.mappings
      }).catch(() => {});

      if (state.settings.sequenceTimeout) {
        chrome.tabs.sendMessage(tabId, {
          action: 'sequenceTimeoutUpdated',
          timeout: state.settings.sequenceTimeout
        }).catch(() => {});
      }
    }
  }

  /**
   * Notify all tabs of a change
   * @param {string} action - Action name
   * @param {Object} data - Data to send
   */
  async notifyAllTabs(action, data) {
    try {
      const tabs = await this.queryTabs({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action,
          ...data
        }).catch(() => {}); // Ignore errors for tabs that can't receive messages
      });
    } catch (error) {
      console.error('LyX Background: Error notifying tabs:', error);
    }
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
   * Get extension status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      enabled: this.configManager.getSettings().enabled,
      mappingCount: this.configManager.getMappings().size
    };
  }
}

// Import required modules
importScripts(
  'core/event-manager.js',
  'core/config-manager.js',
  'lyx-parser.js'
);

// Initialize the background extension
const lyxBackgroundExtension = new LyXBackgroundExtension();
