/**
 * Configuration Manager
 * Handles all configuration loading, parsing, and storage
 */

class ConfigurationManager {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.currentConfig = '';
    this.mappings = new Map();
    this.settings = {
      enabled: true,
      sequenceTimeout: 1000,
      macMMapping: 'ctrl' // 'ctrl' or 'meta'
    };
  }

  /**
   * Initialize the configuration manager
   */
  async initialize() {
    await this.loadSettings();
    await this.loadMappings();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.eventManager.onMessage('getState', () => this.getState());
    this.eventManager.onMessage('updateMappings', (request) => this.updateMappings(request.mappings));
    this.eventManager.onMessage('loadConfig', (request) => this.loadConfig(request.configText));
    this.eventManager.onMessage('updateSequenceTimeout', (request) => this.updateSequenceTimeout(request.timeout));
    this.eventManager.onMessage('updateSettings', (request) => this.updateSettings(request.settings));
  }

  /**
   * Get current state
   */
  getState() {
    return {
      enabled: this.settings.enabled,
      mappings: Object.fromEntries(this.mappings),
      settings: this.settings
    };
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const result = await this.getFromStorage(['enabled', 'sequenceTimeout', 'macMMapping']);
      this.settings.enabled = result.enabled ?? true;
      this.settings.sequenceTimeout = result.sequenceTimeout ?? 1000;
      this.settings.macMMapping = result.macMMapping ?? 'ctrl';
    } catch (error) {
      console.error('LyX Extension: Error loading settings:', error);
    }
  }

  /**
   * Load mappings from storage
   */
  async loadMappings() {
    try {
      const result = await this.getFromStorage(['config', 'hotkeyMappings']);
      
      if (result.config) {
        this.currentConfig = result.config;
        await this.parseConfig(result.config);
      } else if (result.hotkeyMappings) {
        this.mappings = new Map(Object.entries(result.hotkeyMappings));
      } else {
        // Load default mappings
        await this.loadDefaultMappings();
      }
      
      this.eventManager.emit('mappingsLoaded', this.mappings);
    } catch (error) {
      console.error('LyX Extension: Error loading mappings:', error);
      await this.loadDefaultMappings();
    }
  }

  /**
   * Parse configuration text
   */
  async parseConfig(configText, options = {}) {
    try {
      const parser = new LyXConfigParser();
      const parseOptions = {
        mapMetaToCtrl: this.settings.macMMapping === 'ctrl',
        ...options
      };
      
      this.mappings = parser.parse(configText, parseOptions);
      this.currentConfig = configText;
      
      // Save to storage
      await this.saveToStorage({
        config: configText,
        hotkeyMappings: Object.fromEntries(this.mappings)
      });
      
      this.eventManager.emit('mappingsUpdated', this.mappings);
      return this.mappings;
    } catch (error) {
      console.error('LyX Extension: Error parsing config:', error);
      throw error;
    }
  }

  /**
   * Load default mappings
   */
  async loadDefaultMappings() {
    try {
      // Try to load from the mac.bind file using the parser
      const response = await fetch(chrome.runtime.getURL('mac.bind'));
      const configText = await response.text();
      
      if (configText) {
        console.log('LyX Extension: Loading default mappings from mac.bind');
        await this.parseConfig(configText);
        return this.mappings;
      }
    } catch (error) {
      console.warn('LyX Extension: Could not load mac.bind file, using hardcoded defaults:', error);
    }
    
    // Fallback to hardcoded mappings
    const defaultMappings = {
      // Math mode
      'ctrl+m': { type: 'wrap', before: '$', after: '$' },
      'ctrl+shift+m': { type: 'wrap', before: '$$\n', after: '\n$$' },
      
      // Text formatting
      'ctrl+b': { type: 'wrap', before: '**', after: '**' },
      'ctrl+e': { type: 'wrap', before: '*', after: '*' },
      'ctrl+u': { type: 'wrap', before: '_', after: '_' },
      'ctrl+shift+p': { type: 'wrap', before: '`', after: '`' },
      
      // LaTeX commands - sequences
      'ctrl+l a': { type: 'insert', text: '\\alpha' },
      'ctrl+l b': { type: 'insert', text: '\\beta' },
      'ctrl+l d': { type: 'insert', text: '\\delta' },
      'ctrl+l g': { type: 'insert', text: '\\gamma' },
      'ctrl+l l': { type: 'insert', text: '\\lambda' },
      'ctrl+l m': { type: 'insert', text: '\\mu' },
      'ctrl+l p': { type: 'insert', text: '\\pi' },
      'ctrl+l s': { type: 'insert', text: '\\sigma' },
      'ctrl+l t': { type: 'insert', text: '\\theta' },
      
      // Direct Greek letters
      'alt+g': { type: 'insert', text: '\\alpha' },
      'alt+b': { type: 'insert', text: '\\beta' },
      'alt+d': { type: 'insert', text: '\\delta' },
      'alt+l': { type: 'insert', text: '\\lambda' },
      'alt+m': { type: 'insert', text: '\\mu' },
      'alt+p': { type: 'insert', text: '\\pi' },
      'alt+s': { type: 'insert', text: '\\sigma' },
      'alt+t': { type: 'insert', text: '\\theta' },
      
      // Special characters
      'alt+space': { type: 'insert', text: '\u00A0' },
      'ctrl+period': { type: 'insert', text: '. ' },
      'meta+period': { type: 'insert', text: '…' }
    };

    this.mappings = new Map(Object.entries(defaultMappings));
    
    await this.saveToStorage({
      hotkeyMappings: defaultMappings,
      config: ''
    });

    this.eventManager.emit('mappingsUpdated', this.mappings);
    return this.mappings;
  }

  /**
   * Update mappings
   */
  async updateMappings(mappings) {
    if (mappings && typeof mappings === 'object') {
      this.mappings = new Map(Object.entries(mappings));
      
      await this.saveToStorage({ hotkeyMappings: mappings });
      
      this.eventManager.emit('mappingsUpdated', this.mappings);
      return { success: true };
    } else {
      throw new Error('Invalid mappings provided');
    }
  }

  /**
   * Load config from text
   */
  async loadConfig(configText) {
    if (configText) {
      await this.parseConfig(configText);
    } else {
      await this.loadDefaultMappings();
    }
    return { success: true };
  }

  /**
   * Update sequence timeout
   */
  async updateSequenceTimeout(timeout) {
    if (typeof timeout === 'number' && timeout > 0) {
      this.settings.sequenceTimeout = timeout;
      await this.saveToStorage({ sequenceTimeout: timeout });
      this.eventManager.emit('sequenceTimeoutUpdated', timeout);
      return { success: true };
    } else {
      throw new Error('Invalid timeout value');
    }
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveToStorage(this.settings);
    this.eventManager.emit('settingsUpdated', this.settings);
    
    // If Mac mapping changed, reparse current config
    if (newSettings.macMMapping && this.currentConfig) {
      await this.parseConfig(this.currentConfig);
    }
    
    return { success: true };
  }

  /**
   * Toggle extension enabled state
   */
  async toggleEnabled() {
    this.settings.enabled = !this.settings.enabled;
    await this.saveToStorage({ enabled: this.settings.enabled });
    this.eventManager.emit('enabledToggled', this.settings.enabled);
    return { enabled: this.settings.enabled };
  }

  /**
   * Get mappings
   */
  getMappings() {
    return this.mappings;
  }

  /**
   * Get settings
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Helper method to get from storage
   */
  async getFromStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  /**
   * Helper method to save to storage
   */
  async saveToStorage(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigurationManager;
} else if (typeof window !== 'undefined') {
  window.ConfigurationManager = ConfigurationManager;
}
