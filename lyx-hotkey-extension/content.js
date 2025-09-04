/**
 * Content Script for LyX Hotkey Extension
 * Refactored to use modular architecture with separate concerns
 */

// Import required modules (these will be available as globals after script loading)
let logger, keyDetector, actionExecutor, mappingManager;

// Initialize modules after DOM is ready
function initializeModules() {
  logger = LyXLogger.getLogger('Content');
  keyDetector = new LyXKeyDetector.KeyDetector(logger.child('KeyDetector'));
  actionExecutor = new LyXActionExecutor.ActionExecutor(logger.child('ActionExecutor'));
  mappingManager = new LyXMappingManager.MappingManager(logger.child('MappingManager'));
}

/**
 * Main LyX Hotkey Handler class - now orchestrates the modules
 */
class LyXHotkeyHandler {
  constructor() {
    logger.info('🏗️ Initializing LyXHotkeyHandler...');
    
    this.enabled = true;
    this.feedbackElements = new Set();
    
    logger.debug('🔧 Starting initialization...');
    this.init();
  }

  /**
   * Initialize the handler
   */
  init() {
    // Set up message listener
    this._setupMessageListener();
    
    // Request initial state
    this._requestInitialState();
    
    // Set up event listeners
    this._setupEventListeners();
    
    logger.info('✅ LyXHotkeyHandler initialized successfully');
  }

  /**
   * Set up message listener for communication with background script
   */
  _setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        switch (request.action) {
          case 'extensionToggled':
            this._handleExtensionToggled(request.enabled);
            break;
            
          case 'mappingsUpdated':
            this._handleMappingsUpdated(request.mappings);
            break;
            
          case 'sequenceTimeoutUpdated':
            this._handleSequenceTimeoutUpdated(request.timeout);
            break;
            
          default:
            logger.debug(`Unhandled message: ${request.action}`);
        }
      } catch (error) {
        logger.error('Error handling message:', error, request);
      }
    });
  }

  /**
   * Request initial state from background script
   */
  _requestInitialState() {
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        logger.warn('Failed to get state from background:', chrome.runtime.lastError);
        // Retry after a short delay
        setTimeout(() => this._requestInitialState(), 1000);
        return;
      }
      
      if (response) {
        this.enabled = response.enabled;
        if (response.mappings && typeof response.mappings === 'object') {
          mappingManager.setMappings(response.mappings);
          logger.info(`Extension initialized: ${this.enabled ? 'enabled' : 'disabled'}, ${Object.keys(response.mappings).length} mappings`);
        } else {
          logger.warn('No valid mappings in response:', response);
        }
      } else {
        logger.warn('No response from background script');
      }
    });
  }

  /**
   * Set up event listeners for key events
   */
  _setupEventListeners() {
    // Key event listeners
    document.addEventListener('keydown', (e) => this._handleKeyDown(e), true);
    document.addEventListener('keyup', (e) => this._handleKeyUp(e), true);
    
    // Focus tracking
    document.addEventListener('focusin', (e) => this._handleFocus(e), true);
    
    logger.debug('Event listeners set up');
  }

  /**
   * Handle extension enabled/disabled state change
   */
  _handleExtensionToggled(enabled) {
    this.enabled = enabled;
    logger.info(`Extension ${enabled ? 'enabled' : 'disabled'}`);
    
    if (!enabled) {
      // Clear any active sequences when disabled
      keyDetector.clearSequence();
      this._clearAllFeedback();
    }
  }

  /**
   * Handle mappings update from background script
   */
  _handleMappingsUpdated(mappings) {
    if (mappings && typeof mappings === 'object') {
      mappingManager.setMappings(mappings);
      logger.info(`Mappings updated: ${Object.keys(mappings).length} entries`);
    } else {
      logger.warn('Invalid mappings received:', mappings);
    }
  }

  /**
   * Handle sequence timeout update
   */
  _handleSequenceTimeoutUpdated(timeout) {
    if (timeout && typeof timeout === 'number') {
      keyDetector.setSequenceTimeout(timeout);
      logger.debug(`Sequence timeout updated to ${timeout}ms`);
    }
  }

  /**
   * Handle focus events to track active elements
   */
  _handleFocus(event) {
    if (this._isEditableElement(event.target)) {
      logger.trace('Focus on editable element:', event.target.tagName);
    }
  }

  /**
   * Handle keydown events
   */
  _handleKeyDown(event) {
    if (!this.enabled) return;
    
    // Only process keys in editable elements
    if (!this._isEditableElement(event.target)) {
      return;
    }

    const keyResult = keyDetector.processKeyDown(event);
    if (!keyResult.combo) return;

    logger.debug(`Processing key combo: "${keyResult.combo}"`);

    // Add to sequence
    const sequence = keyDetector.addToSequence(keyResult.combo);
    logger.debug(`Current sequence: "${sequence}"`);

    // Check for matches
    const matchResult = mappingManager.hasMatch(sequence);
    
    if (matchResult) {
      if (matchResult.type === 'exact') {
        // Execute the action
        event.preventDefault();
        event.stopPropagation();
        
        logger.info(`🎯 Executing action for sequence: "${sequence}"`);
        this._executeActionWithFeedback(matchResult.action, keyResult.element, sequence);
        keyDetector.clearSequence();
        
      } else if (matchResult.type === 'partial') {
        // Show sequence feedback for partial match
        event.preventDefault();
        event.stopPropagation();
        
        this._showSequenceFeedback(sequence, matchResult.matches);
        logger.debug(`Partial match for "${sequence}", waiting for more keys...`);
      }
    } else {
      // No match found
      if (keyDetector.hasSequence()) {
        logger.debug(`No match for sequence "${sequence}", clearing`);
        keyDetector.clearSequence();
        this._clearAllFeedback();
      }
    }
  }

  /**
   * Handle keyup events
   */
  _handleKeyUp(event) {
    if (!this.enabled) return;
    
    keyDetector.processKeyUp(event);
  }

  /**
   * Execute action with visual feedback
   */
  async _executeActionWithFeedback(action, element, sequence) {
    try {
      const success = await actionExecutor.executeAction(action, element);
      
      if (success) {
        this._showActionFeedback(sequence, action, 'success');
        logger.info(`✅ Action executed successfully: ${action.type}`);
      } else {
        this._showActionFeedback(sequence, action, 'error');
        logger.warn(`❌ Action execution failed: ${action.type}`);
      }
    } catch (error) {
      logger.error('Error executing action:', error);
      this._showActionFeedback(sequence, action, 'error');
    }
  }

  /**
   * Show visual feedback for action execution
   */
  _showActionFeedback(sequence, action, status = 'success') {
    const feedback = document.createElement('div');
    feedback.id = 'lyx-action-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${status === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      opacity: 0;
      transition: opacity 0.2s;
    `;
    
    const icon = status === 'success' ? '✅' : '❌';
    const actionText = this._formatActionForDisplay(action);
    feedback.textContent = `${icon} ${sequence} → ${actionText}`;
    
    document.body.appendChild(feedback);
    this.feedbackElements.add(feedback);
    
    // Animate in
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
    });
    
    // Remove after delay
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.style.opacity = '0';
        setTimeout(() => {
          if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
          }
          this.feedbackElements.delete(feedback);
        }, 200);
      }
    }, 2000);
  }

  /**
   * Show visual feedback for partial sequences
   */
  _showSequenceFeedback(sequence, matches) {
    // Remove existing sequence feedback
    const existing = document.getElementById('lyx-sequence-feedback');
    if (existing) {
      existing.remove();
    }
    
    const feedback = document.createElement('div');
    feedback.id = 'lyx-sequence-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: #3b82f6;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      opacity: 0;
      transition: opacity 0.2s;
    `;
    
    const completions = matches.slice(0, 5).map(m => {
      const remaining = m.key.substring(sequence.length + 1);
      return remaining.split(' ')[0];
    });
    
    feedback.textContent = `🔄 ${sequence} → [${completions.join(', ')}...]`;
    
    document.body.appendChild(feedback);
    this.feedbackElements.add(feedback);
    
    // Animate in
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
    });
  }

  /**
   * Clear all visual feedback
   */
  _clearAllFeedback() {
    this.feedbackElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.feedbackElements.clear();
  }

  /**
   * Format action for display in feedback
   */
  _formatActionForDisplay(action) {
    switch (action.type) {
      case 'insert':
        return `Insert "${action.text}"`;
      case 'wrap':
        return `Wrap with "${action.before}...${action.after}"`;
      case 'navigation':
        return `Navigate: ${action.navigation}`;
      case 'deletion':
        return `Delete: ${action.deletion}`;
      case 'clipboard':
        return `Clipboard: ${action.clipboard}`;
      case 'edit':
        return `Edit: ${action.edit}`;
      default:
        return action.type;
    }
  }

  /**
   * Check if element is editable
   */
  _isEditableElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const editable = element.isContentEditable;
    const inputTypes = ['text', 'search', 'url', 'tel', 'email', 'password'];
    
    return editable || 
           tagName === 'textarea' || 
           (tagName === 'input' && inputTypes.includes(element.type));
  }
}

// Initialize when DOM is ready or modules are loaded
function initializeExtension() {
  // Wait for modules to be available
  if (typeof LyXLogger === 'undefined' || 
      typeof LyXKeyDetector === 'undefined' || 
      typeof LyXActionExecutor === 'undefined' || 
      typeof LyXMappingManager === 'undefined') {
    
    // Modules not yet loaded, try again
    setTimeout(initializeExtension, 100);
    return;
  }
  
  // Initialize modules
  initializeModules();
  
  // Initialize the main handler
  console.log('🚀 LyX Extension: Content script loading...');
  const lyxHandler = new LyXHotkeyHandler();
  console.log('✅ LyX Extension: Content script initialized successfully');
}

// Start initialization
initializeExtension();