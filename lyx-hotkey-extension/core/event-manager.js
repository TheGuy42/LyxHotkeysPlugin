/**
 * Event Manager
 * Centralized event handling and message passing
 */

class EventManager {
  constructor() {
    this.listeners = new Map();
    this.messageHandlers = new Map();
  }

  /**
   * Add an event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {...any} args - Arguments to pass to handlers
   */
  emit(event, ...args) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`LyX Extension: Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Register a message handler
   * @param {string} action - Message action
   * @param {Function} handler - Message handler function
   */
  onMessage(action, handler) {
    this.messageHandlers.set(action, handler);
  }

  /**
   * Handle incoming messages
   * @param {Object} request - Message request
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Response function
   */
  handleMessage(request, sender, sendResponse) {
    // Handle both legacy format (action as property) and new format (action as string)
    const action = request.action || request;
    
    const handler = this.messageHandlers.get(action);
    if (handler) {
      try {
        const result = handler(request, sender);
        if (result instanceof Promise) {
          result.then(sendResponse).catch(error => {
            console.error(`LyX Extension: Error in message handler for ${action}:`, error);
            sendResponse({ success: false, error: error.message });
          });
          return true; // Keep message channel open for async response
        } else {
          sendResponse(result);
        }
      } catch (error) {
        console.error(`LyX Extension: Error in message handler for ${action}:`, error);
        sendResponse({ success: false, error: error.message });
      }
    } else {
      console.warn(`LyX Extension: Unknown message action: ${action}`);
      sendResponse({ success: false, error: 'Unknown action' });
    }
    return true;
  }

  /**
   * Send a message and handle response
   * @param {Object} message - Message to send
   * @param {Function} callback - Response callback (optional)
   */
  async sendMessage(message, callback) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        return new Promise((resolve, reject) => {
          console.log('LyX Extension: Sending message:', message);
          
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.error('LyX Extension: Chrome runtime error:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log('LyX Extension: Received response:', response);
              resolve(response);
              if (callback) callback(response);
            }
          });
        });
      } else {
        throw new Error('Chrome runtime not available');
      }
    } catch (error) {
      console.error('LyX Extension: Error sending message:', error);
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventManager;
} else if (typeof window !== 'undefined') {
  window.EventManager = EventManager;
}
