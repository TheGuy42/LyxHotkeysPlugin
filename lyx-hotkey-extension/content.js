/**
 * Content Script for LyX Hotkey Extension - Refactored Modular Architecture
 * Orchestrates all core modules to provide LyX-style hotkey functionality
 */

// Debug: Add immediate console log to verify script loading
console.log('🚀 LyX Extension: Content script file loaded!');

// Add instance tracker to detect multiple loads
window.lyxExtensionLoadCount = (window.lyxExtensionLoadCount || 0) + 1;
console.log(`🔢 Extension load count: ${window.lyxExtensionLoadCount}`);

// Debug toggle - set to false to disable debug output
const DEBUG_ENABLED = true;

function debugLog(...args) {
  if (DEBUG_ENABLED) {
    console.log('� LyX Debug:', ...args);
  }
}

function debugError(...args) {
  if (DEBUG_ENABLED) {
    console.error('❌ LyX Debug:', ...args);
  }
}

function debugWarn(...args) {
  if (DEBUG_ENABLED) {
    console.warn('⚠️ LyX Debug:', ...args);
  }
}

class LyXHotkeyExtension {
  constructor() {
    this.instanceId = Math.random().toString(36).substr(2, 9);
    debugLog(`Initializing LyXHotkeyExtension instance: ${this.instanceId}...`);
    
    this.initialized = false;
    this.enabled = true;
    
    // Initialize core modules in correct order
    this.eventManager = new EventManager();
    this.configManager = new ConfigurationManager(this.eventManager);
    this.elementDetector = new ElementDetector(this.eventManager);
    this.keySequenceHandler = new KeySequenceHandler(this.eventManager);
    this.actionExecutor = new ActionExecutor(this.eventManager);
    
    debugLog('Core modules initialized');
    this.init();
  }

  async init() {
    try {
      debugLog('Starting initialization process...');
      
      // Setup event listeners first
      this.setupEventListeners();
      
      // Load configuration
      await this.loadConfiguration();
      
      // Setup keyboard event handling
      this.setupKeyboardEvents();
      
      // Mark as initialized
      this.initialized = true;
      
      // Expose instance globally for debugging/testing
      window.lyxHotkeyExtension = this;
      
      debugLog('Initialization complete - Extension available globally as window.lyxHotkeyExtension');
      
      // Notify background script of successful initialization
      this.eventManager.emit('extension-initialized', {
        timestamp: Date.now(),
        url: window.location.href
      });
      
    } catch (error) {
      debugError('Initialization failed:', error);
    }
  }

  setupEventListeners() {
    // Listen for messages from background script
    this.eventManager.onMessage('extensionToggled', (data) => {
      this.enabled = data.enabled;
      debugLog(`Extension ${this.enabled ? 'enabled' : 'disabled'}`);
    });

    this.eventManager.onMessage('mappingsUpdated', async (data) => {
      if (data.mappings) {
        await this.configManager.updateMappings(data.mappings);
        this.keySequenceHandler.setMappings(data.mappings);
        debugLog(`Updated ${Object.keys(data.mappings).length} hotkey mappings`);
      }
    });

    this.eventManager.onMessage('sequenceTimeoutUpdated', (data) => {
      if (data.timeout && typeof data.timeout === 'number') {
        this.keySequenceHandler.setSequenceTimeout(data.timeout);
        debugLog(`Sequence timeout updated to ${data.timeout}ms`);
      }
    });

    // Setup inter-module communication
    this.eventManager.on('actionExecute', (action, element) => {
      debugLog(`🎯 ActionExecute event received [${this.instanceId}]:`, action, element?.tagName);
      this.actionExecutor.executeAction(action, element);
    });

    this.eventManager.on('element-focus-changed', (data) => {
      this.handleElementFocus(data);
    });
  }

  async loadConfiguration() {
    try {
      // Request initial state from background script
      const response = await this.eventManager.sendMessage('getInitialState');
      
      if (response) {
        if (response.enabled !== undefined) {
          this.enabled = response.enabled;
        }
        
        if (response.mappings) {
          await this.configManager.updateMappings(response.mappings);
          this.keySequenceHandler.setMappings(response.mappings);
        }
        
        if (response.settings) {
          if (response.settings.sequenceTimeout) {
            this.keySequenceHandler.setSequenceTimeout(response.settings.sequenceTimeout);
          }
        }
        
        debugLog('Configuration loaded successfully');
      }
    } catch (error) {
      debugWarn('Could not load initial configuration:', error);
      // Continue with defaults
    }
  }

  setupKeyboardEvents() {
    // Add keyboard event listener with proper cleanup
    this.keyEventHandler = (event) => {
      debugLog(`🔑 Key event: ${event.key} (ctrl:${event.ctrlKey}, alt:${event.altKey}, meta:${event.metaKey})`);
      
      if (!this.enabled) {
        debugLog('Extension disabled, ignoring key event');
        return;
      }
      
      const activeElement = this.elementDetector.getActiveElement();
      if (!activeElement || !this.elementDetector.isEditable(activeElement)) {
        debugLog('No active editable element, ignoring key event');
        return;
      }
      
      debugLog('Processing key event for:', activeElement.tagName);
      this.keySequenceHandler.processKeyEvent(event, activeElement);
    };

    document.addEventListener('keydown', this.keyEventHandler, true);
    
    // Initialize element detector
    this.elementDetector.initialize();
  }

  handleKeySequence(data) {
    const { sequence, element, mappings } = data;
    
    // Find matching actions for the key sequence
    const action = this.keySequenceHandler.findMatchingAction(sequence);
    
    if (action) {
      debugLog(`Found action for sequence:`, sequence);
      
      // Execute the action
      this.actionExecutor.executeAction(action, element);
      
      // Clear the sequence after successful execution
      this.keySequenceHandler.clearSequence();
      
      return true;
    }
    
    return false;
  }

  executeAction(data) {
    const { action, element } = data;
    this.actionExecutor.executeAction(action, element);
  }

  handleElementFocus(data) {
    const { element, isEditable } = data;
    
    if (isEditable) {
      debugLog('Editable element focused:', element.tagName);
    }
  }

  // Public API for testing and debugging
  getStatus() {
    return {
      initialized: this.initialized,
      enabled: this.enabled,
      hasActiveElement: !!this.elementDetector.getActiveElement(),
      lastActiveElement: this.elementDetector.getActiveElement()?.tagName || null,
      keySequence: this.keySequenceHandler.keySequence || [],
      mappingsCount: this.configManager.getMappings() ? Object.keys(this.configManager.getMappings()).length : 0
    };
  }

  // Cleanup method
  destroy() {
    if (this.keyEventHandler) {
      document.removeEventListener('keydown', this.keyEventHandler, true);
    }
    
    this.keySequenceHandler.clearSequence();
    
    delete window.lyxHotkeyExtension;
    
    debugLog('Cleanup completed');
  }
}

// Initialization function - called after class is defined
function initializeExtension() {
  debugLog('DOM ready, starting initialization...');
  
  // Check module availability first
  const modules = {
    EventManager: typeof EventManager,
    ConfigurationManager: typeof ConfigurationManager,
    ElementDetector: typeof ElementDetector,
    KeySequenceHandler: typeof KeySequenceHandler,
    ActionExecutor: typeof ActionExecutor,
    LyXConfigParser: typeof LyXConfigParser
  };
  
  debugLog('Module availability:', modules);
  
  const missingModules = Object.entries(modules)
    .filter(([name, type]) => type === 'undefined')
    .map(([name]) => name);
  
  if (missingModules.length > 0) {
    debugError('Missing modules:', missingModules);
    return;
  }
  
  try {
    debugLog('All modules available, creating extension...');
    const lyxExtension = new LyXHotkeyExtension();
    
    // Add visual indicator that extension loaded
    const indicator = document.createElement('div');
    indicator.innerHTML = 'LyX Extension Active!';
    indicator.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      left: 10px !important;
      background: #007bff !important;
      color: white !important;
      padding: 8px 12px !important;
      z-index: 999999 !important;
      border-radius: 4px !important;
      font-family: Arial, sans-serif !important;
      font-size: 12px !important;
      font-weight: bold !important;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
    `;
    indicator.id = 'lyx-extension-active-indicator';
    document.documentElement.appendChild(indicator);
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 3000);
    
    debugLog('Content script initialized successfully');
  } catch (error) {
    debugError('Failed to create extension:', error);
  }
}

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}
