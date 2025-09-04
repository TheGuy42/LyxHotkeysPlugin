/**
 * State Manager for LyX Hotkeys Extension
 * Centralized state management with reactive updates
 */

// Import logger if available
let logger;
if (typeof window !== 'undefined' && window.LyXLogger) {
  logger = window.LyXLogger.getLogger('StateManager');
} else if (typeof importScripts === 'function') {
  // Service worker context - will be initialized after logger import
  logger = { info: console.log, warn: console.warn, error: console.error, debug: console.log };
}

/**
 * Extension State Manager
 * Handles all extension state with reactive updates
 */
class ExtensionStateManager {
  constructor() {
    this.state = {
      enabled: true,
      hotkeyMappings: new Map(),
      config: '',
      sequenceTimeout: 1000,
      macMMapping: 'ctrl',
      loggerConfig: {
        level: 2, // INFO level
        enableTimestamps: true,
        enableContext: true
      }
    };
    
    this.listeners = new Map();
    this.initialized = false;
    
    logger?.debug('StateManager initialized');
  }

  /**
   * Initialize state from storage
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      const result = await chrome.storage.local.get([
        'enabled',
        'hotkeyMappings', 
        'config',
        'sequenceTimeout',
        'macMMapping',
        'loggerConfig'
      ]);
      
      // Update state with stored values
      this.state.enabled = result.enabled ?? true;
      this.state.config = result.config ?? '';
      this.state.sequenceTimeout = result.sequenceTimeout ?? 1000;
      this.state.macMMapping = result.macMMapping ?? 'ctrl';
      this.state.loggerConfig = result.loggerConfig ?? this.state.loggerConfig;
      
      // Handle hotkeyMappings conversion
      if (result.hotkeyMappings) {
        if (result.hotkeyMappings instanceof Map) {
          this.state.hotkeyMappings = result.hotkeyMappings;
        } else {
          this.state.hotkeyMappings = new Map(Object.entries(result.hotkeyMappings));
        }
      }
      
      this.initialized = true;
      logger?.info('State initialized from storage', {
        enabled: this.state.enabled,
        mappingsCount: this.state.hotkeyMappings.size,
        sequenceTimeout: this.state.sequenceTimeout
      });
      
      this._notifyListeners('initialized', this.state);
      
    } catch (error) {
      logger?.error('Failed to initialize state from storage:', error);
      this.initialized = true; // Mark as initialized even on error
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      enabled: this.state.enabled,
      mappings: Object.fromEntries(this.state.hotkeyMappings),
      config: this.state.config,
      sequenceTimeout: this.state.sequenceTimeout,
      macMMapping: this.state.macMMapping,
      loggerConfig: this.state.loggerConfig
    };
  }

  /**
   * Check if extension is enabled
   */
  isEnabled() {
    return this.state.enabled;
  }

  /**
   * Toggle extension enabled state
   */
  async toggleEnabled() {
    const oldValue = this.state.enabled;
    this.state.enabled = !this.state.enabled;
    
    await this._persistState('enabled', this.state.enabled);
    logger?.info(`Extension ${this.state.enabled ? 'enabled' : 'disabled'}`);
    
    this._notifyListeners('enabledChanged', {
      enabled: this.state.enabled,
      previous: oldValue
    });
    
    return this.state.enabled;
  }

  /**
   * Set extension enabled state
   */
  async setEnabled(enabled) {
    if (this.state.enabled === enabled) return;
    
    const oldValue = this.state.enabled;
    this.state.enabled = enabled;
    
    await this._persistState('enabled', enabled);
    logger?.info(`Extension ${enabled ? 'enabled' : 'disabled'}`);
    
    this._notifyListeners('enabledChanged', {
      enabled,
      previous: oldValue
    });
  }

  /**
   * Get hotkey mappings
   */
  getMappings() {
    return new Map(this.state.hotkeyMappings);
  }

  /**
   * Set hotkey mappings
   */
  async setMappings(mappings) {
    const oldSize = this.state.hotkeyMappings.size;
    
    if (mappings instanceof Map) {
      this.state.hotkeyMappings = new Map(mappings);
    } else {
      this.state.hotkeyMappings = new Map(Object.entries(mappings));
    }
    
    // Persist as plain object
    const mappingsObject = Object.fromEntries(this.state.hotkeyMappings);
    await this._persistState('hotkeyMappings', mappingsObject);
    
    logger?.info(`Mappings updated: ${oldSize} → ${this.state.hotkeyMappings.size} entries`);
    
    this._notifyListeners('mappingsChanged', {
      mappings: Object.fromEntries(this.state.hotkeyMappings),
      count: this.state.hotkeyMappings.size,
      previousCount: oldSize
    });
  }

  /**
   * Get configuration text
   */
  getConfig() {
    return this.state.config;
  }

  /**
   * Set configuration text
   */
  async setConfig(config) {
    const oldConfig = this.state.config;
    this.state.config = config;
    
    await this._persistState('config', config);
    logger?.debug('Configuration updated');
    
    this._notifyListeners('configChanged', {
      config,
      previous: oldConfig
    });
  }

  /**
   * Get sequence timeout
   */
  getSequenceTimeout() {
    return this.state.sequenceTimeout;
  }

  /**
   * Set sequence timeout
   */
  async setSequenceTimeout(timeout) {
    const oldTimeout = this.state.sequenceTimeout;
    this.state.sequenceTimeout = timeout;
    
    await this._persistState('sequenceTimeout', timeout);
    logger?.debug(`Sequence timeout updated: ${timeout}ms`);
    
    this._notifyListeners('sequenceTimeoutChanged', {
      timeout,
      previous: oldTimeout
    });
  }

  /**
   * Get Mac M mapping preference
   */
  getMacMMapping() {
    return this.state.macMMapping;
  }

  /**
   * Set Mac M mapping preference
   */
  async setMacMMapping(mapping) {
    const oldMapping = this.state.macMMapping;
    this.state.macMMapping = mapping;
    
    await this._persistState('macMMapping', mapping);
    logger?.debug(`Mac M mapping updated: ${mapping}`);
    
    this._notifyListeners('macMappingChanged', {
      mapping,
      previous: oldMapping
    });
  }

  /**
   * Get logger configuration
   */
  getLoggerConfig() {
    return { ...this.state.loggerConfig };
  }

  /**
   * Set logger configuration
   */
  async setLoggerConfig(config) {
    const oldConfig = { ...this.state.loggerConfig };
    this.state.loggerConfig = { ...this.state.loggerConfig, ...config };
    
    await this._persistState('loggerConfig', this.state.loggerConfig);
    logger?.debug('Logger configuration updated', config);
    
    this._notifyListeners('loggerConfigChanged', {
      config: this.state.loggerConfig,
      previous: oldConfig
    });
  }

  /**
   * Add state change listener
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    logger?.debug(`Listener added for event: ${event}`);
  }

  /**
   * Remove state change listener
   */
  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Persist state to storage
   */
  async _persistState(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      logger?.error(`Failed to persist state for ${key}:`, error);
    }
  }

  /**
   * Notify listeners of state changes
   */
  _notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger?.error(`Error in state listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Reset to default state
   */
  async reset() {
    logger?.info('Resetting state to defaults');
    
    this.state = {
      enabled: true,
      hotkeyMappings: new Map(),
      config: '',
      sequenceTimeout: 1000,
      macMMapping: 'ctrl',
      loggerConfig: {
        level: 2,
        enableTimestamps: true,
        enableContext: true
      }
    };

    // Clear storage
    await chrome.storage.local.clear();
    
    // Notify all listeners
    this._notifyListeners('reset', this.state);
  }
}

// Global state manager instance
let globalStateManager = null;

/**
 * Get or create the global state manager
 */
function getStateManager() {
  if (!globalStateManager) {
    globalStateManager = new ExtensionStateManager();
  }
  return globalStateManager;
}

/**
 * Initialize the global state manager
 */
async function initializeStateManager() {
  const stateManager = getStateManager();
  await stateManager.initialize();
  return stateManager;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    ExtensionStateManager,
    getStateManager,
    initializeStateManager
  };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.LyXStateManager = {
    ExtensionStateManager,
    getStateManager,
    initializeStateManager
  };
}