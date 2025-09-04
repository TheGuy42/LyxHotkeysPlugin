/**
 * Message Handler for LyX Hotkeys Extension
 * Centralized message handling between background, content, and popup scripts
 */

// Import logger if available
let logger;
if (typeof window !== 'undefined' && window.LyXLogger) {
  logger = window.LyXLogger.getLogger('MessageHandler');
} else if (typeof importScripts === 'function') {
  // Service worker context - will be initialized after logger import
  logger = { info: console.log, warn: console.warn, error: console.error, debug: console.log };
}

/**
 * Message types for type safety and clarity
 */
const MESSAGE_TYPES = {
  // State queries
  GET_STATE: 'getState',
  
  // State updates
  TOGGLE_EXTENSION: 'toggleExtension',
  UPDATE_MAPPINGS: 'updateMappings',
  UPDATE_SEQUENCE_TIMEOUT: 'updateSequenceTimeout',
  UPDATE_MAC_MAPPING: 'updateMacMapping',
  
  // Configuration
  LOAD_CONFIG: 'loadConfig',
  SAVE_CONFIG: 'saveConfig',
  
  // Notifications to content scripts
  EXTENSION_TOGGLED: 'extensionToggled',
  MAPPINGS_UPDATED: 'mappingsUpdated',
  SEQUENCE_TIMEOUT_UPDATED: 'sequenceTimeoutUpdated',
  
  // Logging
  UPDATE_LOG_LEVEL: 'updateLogLevel',
  GET_LOGS: 'getLogs',
  CLEAR_LOGS: 'clearLogs',
  
  // Testing and debugging
  PING: 'ping',
  ECHO: 'echo'
};

/**
 * Message Handler class
 */
class MessageHandler {
  constructor(stateManager = null) {
    this.stateManager = stateManager;
    this.handlers = new Map();
    this.messageQueue = [];
    this.isBackground = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage;
    
    this._setupDefaultHandlers();
    this._setupMessageListener();
    
    logger?.debug('MessageHandler initialized', { isBackground: this.isBackground });
  }

  /**
   * Set the state manager
   */
  setStateManager(stateManager) {
    this.stateManager = stateManager;
    logger?.debug('State manager set');
  }

  /**
   * Register a message handler
   */
  registerHandler(messageType, handler) {
    this.handlers.set(messageType, handler);
    logger?.debug(`Handler registered for: ${messageType}`);
  }

  /**
   * Unregister a message handler
   */
  unregisterHandler(messageType) {
    this.handlers.delete(messageType);
    logger?.debug(`Handler unregistered for: ${messageType}`);
  }

  /**
   * Send message to background script
   */
  async sendToBackground(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            logger?.error('Message to background failed:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            logger?.trace('Message to background sent:', message.action);
            resolve(response);
          }
        });
      } catch (error) {
        logger?.error('Failed to send message to background:', error);
        reject(error);
      }
    });
  }

  /**
   * Send message to all content scripts
   */
  async sendToAllTabs(message) {
    if (!this.isBackground) {
      logger?.warn('sendToAllTabs called from non-background context');
      return [];
    }

    try {
      const tabs = await chrome.tabs.query({});
      const promises = tabs.map(tab => this.sendToTab(tab.id, message));
      return await Promise.allSettled(promises);
    } catch (error) {
      logger?.error('Failed to send message to all tabs:', error);
      return [];
    }
  }

  /**
   * Send message to specific tab
   */
  async sendToTab(tabId, message) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            // Don't log errors for tabs that can't receive messages
            logger?.trace(`Tab ${tabId} couldn't receive message:`, chrome.runtime.lastError.message);
            resolve(null);
          } else {
            logger?.trace(`Message sent to tab ${tabId}:`, message.action);
            resolve(response);
          }
        });
      } catch (error) {
        logger?.trace(`Failed to send message to tab ${tabId}:`, error);
        resolve(null);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(request, sender, sendResponse) {
    const { action } = request;
    
    logger?.trace('Message received:', action, request);

    try {
      // Check for registered handler first
      if (this.handlers.has(action)) {
        const handler = this.handlers.get(action);
        const result = await handler(request, sender);
        sendResponse(result);
        return;
      }

      // Fall back to default handlers
      const result = await this._handleDefaultMessage(request, sender);
      sendResponse(result);
      
    } catch (error) {
      logger?.error(`Error handling message ${action}:`, error);
      sendResponse({ 
        success: false, 
        error: error.message || 'Unknown error' 
      });
    }
  }

  /**
   * Set up default message handlers
   */
  _setupDefaultHandlers() {
    // These handlers require state manager
    this.registerHandler(MESSAGE_TYPES.GET_STATE, async () => {
      if (!this.stateManager) {
        throw new Error('State manager not available');
      }
      return this.stateManager.getState();
    });

    this.registerHandler(MESSAGE_TYPES.TOGGLE_EXTENSION, async () => {
      if (!this.stateManager) {
        throw new Error('State manager not available');
      }
      const enabled = await this.stateManager.toggleEnabled();
      
      // Notify all tabs if in background context
      if (this.isBackground) {
        await this.sendToAllTabs({
          action: MESSAGE_TYPES.EXTENSION_TOGGLED,
          enabled
        });
      }
      
      return { success: true, enabled };
    });

    this.registerHandler(MESSAGE_TYPES.UPDATE_MAPPINGS, async (request) => {
      if (!this.stateManager) {
        throw new Error('State manager not available');
      }
      
      if (!request.mappings || typeof request.mappings !== 'object') {
        throw new Error('Invalid mappings provided');
      }
      
      await this.stateManager.setMappings(request.mappings);
      
      // Notify all tabs if in background context
      if (this.isBackground) {
        await this.sendToAllTabs({
          action: MESSAGE_TYPES.MAPPINGS_UPDATED,
          mappings: request.mappings
        });
      }
      
      return { success: true };
    });

    this.registerHandler(MESSAGE_TYPES.UPDATE_SEQUENCE_TIMEOUT, async (request) => {
      if (!this.stateManager) {
        throw new Error('State manager not available');
      }
      
      if (typeof request.timeout !== 'number') {
        throw new Error('Invalid timeout value');
      }
      
      await this.stateManager.setSequenceTimeout(request.timeout);
      
      // Notify all tabs if in background context
      if (this.isBackground) {
        await this.sendToAllTabs({
          action: MESSAGE_TYPES.SEQUENCE_TIMEOUT_UPDATED,
          timeout: request.timeout
        });
      }
      
      return { success: true };
    });

    // Utility handlers
    this.registerHandler(MESSAGE_TYPES.PING, async () => {
      return { success: true, timestamp: Date.now() };
    });

    this.registerHandler(MESSAGE_TYPES.ECHO, async (request) => {
      return { success: true, echo: request.data };
    });
  }

  /**
   * Set up message listener
   */
  _setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Handle async responses
        this.handleMessage(request, sender, sendResponse);
        return true; // Indicate async response
      });
    }
  }

  /**
   * Handle default messages (fallback)
   */
  async _handleDefaultMessage(request, sender) {
    const { action } = request;
    
    switch (action) {
      case MESSAGE_TYPES.LOAD_CONFIG:
        if (this.stateManager && request.configText) {
          await this.stateManager.setConfig(request.configText);
          return { success: true };
        }
        throw new Error('Invalid config or state manager not available');
        
      default:
        logger?.warn(`Unhandled message type: ${action}`);
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Broadcast state change to all tabs
   */
  async broadcastStateChange(changeType, data) {
    if (!this.isBackground) return;
    
    let action;
    switch (changeType) {
      case 'enabledChanged':
        action = MESSAGE_TYPES.EXTENSION_TOGGLED;
        break;
      case 'mappingsChanged':
        action = MESSAGE_TYPES.MAPPINGS_UPDATED;
        break;
      case 'sequenceTimeoutChanged':
        action = MESSAGE_TYPES.SEQUENCE_TIMEOUT_UPDATED;
        break;
      default:
        logger?.debug(`No broadcast action for change type: ${changeType}`);
        return;
    }
    
    await this.sendToAllTabs({ action, ...data });
  }
}

// Global message handler instance
let globalMessageHandler = null;

/**
 * Get or create the global message handler
 */
function getMessageHandler() {
  if (!globalMessageHandler) {
    globalMessageHandler = new MessageHandler();
  }
  return globalMessageHandler;
}

/**
 * Initialize message handler with state manager
 */
function initializeMessageHandler(stateManager) {
  const messageHandler = getMessageHandler();
  messageHandler.setStateManager(stateManager);
  
  // Set up state change broadcasts
  if (stateManager) {
    stateManager.addListener('enabledChanged', (data) => {
      messageHandler.broadcastStateChange('enabledChanged', data);
    });
    
    stateManager.addListener('mappingsChanged', (data) => {
      messageHandler.broadcastStateChange('mappingsChanged', data);
    });
    
    stateManager.addListener('sequenceTimeoutChanged', (data) => {
      messageHandler.broadcastStateChange('sequenceTimeoutChanged', data);
    });
  }
  
  return messageHandler;
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    MessageHandler,
    MESSAGE_TYPES,
    getMessageHandler,
    initializeMessageHandler
  };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.LyXMessageHandler = {
    MessageHandler,
    MESSAGE_TYPES,
    getMessageHandler,
    initializeMessageHandler
  };
}