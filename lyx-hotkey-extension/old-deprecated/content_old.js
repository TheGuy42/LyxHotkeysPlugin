/**
 * Refactored Content Script for LyX Hotkey Extension
 * Uses modular architecture for better maintainability
 */

class LyXHotkeyExtension {
  constructor() {
    console.log('🏗️ LyX Extension: Initializing LyXHotkeyExtension...');
    
    // Initialize core modules
    this.eventManager = new EventManager();
    this.elementDetector = new ElementDetector(this.eventManager);
    this.keySequenceHandler = new KeySequenceHandler(this.eventManager);
    this.actionExecutor = new ActionExecutor(this.eventManager);
    
    // State
    this.isInitialized = false;
    
    console.log('🔧 LyX Extension: Starting initialization...');
    this.initialize();
  }

  /**
   * Initialize the extension
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Setup core event listeners
      this.setupCoreEventListeners();
      
      // Initialize modules
      this.elementDetector.initialize();
      
      // Setup DOM event listeners
      this.setupDOMEventListeners();
      
      // Setup Chrome extension messaging
      this.setupExtensionMessaging();
      
      // Request initial state from background script
      await this.requestInitialState();
      
      this.isInitialized = true;
      console.log('✅ LyX Extension: Initialization completed successfully');
      
    } catch (error) {
      console.error('❌ LyX Extension: Initialization failed:', error);
    }
  }

  /**
   * Setup core event listeners between modules
   */
  setupCoreEventListeners() {
    // Listen for element activation
    this.eventManager.on('elementActivated', (element) => {
      console.log('🎯 LyX Extension: Element activated:', element.tagName, element.type);
    });

    // Listen for key sequence completion
    this.eventManager.on('actionExecute', (action, element) => {
      console.log('🚀 LyX Extension: Action execution requested:', action);
    });
  }

  /**
   * Setup DOM event listeners
   */
  setupDOMEventListeners() {
    console.log('🎯 LyX Extension: Setting up DOM event listeners...');
    
    // Key event listener with proper event handling
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    }, true);
    
    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    }, true);
    
    console.log('✅ LyX Extension: DOM event listeners set up successfully');
  }

  /**
   * Setup Chrome extension messaging
   */
  setupExtensionMessaging() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      return this.eventManager.handleMessage(request, sender, sendResponse);
    });

    // Register message handlers
    this.eventManager.onMessage('extensionToggled', (request) => {
      this.keySequenceHandler.setEnabled(request.enabled);
      console.log(`LyX Extension ${request.enabled ? 'enabled' : 'disabled'}`);
      return { success: true };
    });

    this.eventManager.onMessage('mappingsUpdated', (request) => {
      if (request.mappings && typeof request.mappings === 'object') {
        const mappings = new Map(Object.entries(request.mappings));
        this.keySequenceHandler.setMappings(mappings);
        console.log(`LyX Extension: Loaded ${mappings.size} hotkey mappings`);
        return { success: true };
      } else {
        console.warn('LyX Extension: Invalid mappings received:', request.mappings);
        return { success: false, error: 'Invalid mappings' };
      }
    });

    this.eventManager.onMessage('sequenceTimeoutUpdated', (request) => {
      if (request.timeout && typeof request.timeout === 'number') {
        this.keySequenceHandler.setSequenceTimeout(request.timeout);
        console.log(`LyX Extension: Sequence timeout updated to ${request.timeout}ms`);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid timeout' };
      }
    });

    this.eventManager.onMessage('getState', () => {
      return {
        initialized: this.isInitialized,
        hasActiveElement: this.elementDetector.hasActiveEditableElement()
      };
    });
  }

  /**
   * Request initial state from background script
   */
  async requestInitialState() {
    try {
      const response = await this.eventManager.sendMessage({ action: 'getState' });
      
      if (response) {
        // Set enabled state
        this.keySequenceHandler.setEnabled(response.enabled);
        
        // Set mappings
        if (response.mappings && typeof response.mappings === 'object') {
          const mappings = new Map(Object.entries(response.mappings));
          this.keySequenceHandler.setMappings(mappings);
          console.log(`LyX Extension initialized: ${response.enabled ? 'enabled' : 'disabled'}, ${mappings.size} mappings`);
        }
        
        // Set settings
        if (response.settings) {
          if (response.settings.sequenceTimeout) {
            this.keySequenceHandler.setSequenceTimeout(response.settings.sequenceTimeout);
          }
        }
      } else {
        console.warn('LyX Extension: No response from background script');
      }
    } catch (error) {
      console.warn('LyX Extension: Failed to get initial state:', error);
      // Retry after a short delay
      setTimeout(() => this.requestInitialState(), 1000);
    }
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    console.log('🔑 LyX Extension: Keydown detected:', event.key, event.code, 'ctrl:', event.ctrlKey, 'alt:', event.altKey);
    
    // Check if we have an active editable element
    const targetElement = this.elementDetector.getBestTargetElement();
    if (!targetElement) {
      console.log('LyX Extension: No active editable element, ignoring keydown');
      return;
    }

    // Process the key event
    const handled = this.keySequenceHandler.processKeyEvent(event, targetElement);
    
    if (handled) {
      // Prevent default behavior for handled keys
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  /**
   * Handle keyup events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyUp(event) {
    // Handle any key up events if needed in the future
  }

  /**
   * Get extension status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasActiveElement: this.elementDetector.hasActiveEditableElement(),
      lastActiveElement: this.elementDetector.getLastActiveElement()?.tagName || null
    };
  }

  /**
   * Cleanup method for testing/development
   */
  destroy() {
    this.isInitialized = false;
    // Clean up event listeners if needed
    console.log('🧹 LyX Extension: Extension destroyed');
  }
}

// Initialize the extension
console.log('🚀 LyX Extension: Content script loading...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.lyxHotkeyExtension = new LyXHotkeyExtension();
  });
} else {
  // DOM is already ready
  window.lyxHotkeyExtension = new LyXHotkeyExtension();
}

console.log('✅ LyX Extension: Content script loaded successfully');
