/**
 * Key Detector Module for LyX Hotkeys Extension
 * Handles key sequence detection and timing
 */

/**
 * Key Detector class for handling key combinations and sequences
 */
class KeyDetector {
  constructor(logger = null) {
    this.logger = logger || { debug: () => {}, trace: () => {}, info: () => {} };
    
    this.keySequence = [];
    this.sequenceTimeout = null;
    this.sequenceTimeoutDuration = 1000; // 1 second default
    this.lastModifierCombo = null;
    this.modifierReleaseTimeout = null;
    this.lastActiveElement = null;
    
    this.logger.debug('KeyDetector initialized');
  }

  /**
   * Set sequence timeout duration
   */
  setSequenceTimeout(duration) {
    this.sequenceTimeoutDuration = duration;
    this.logger.debug(`Sequence timeout set to ${duration}ms`);
  }

  /**
   * Process keydown event and return key combination
   */
  processKeyDown(event) {
    const keyInfo = this._extractKeyInfo(event);
    const combo = this._buildKeyCombo(keyInfo);
    
    this.logger.logKeyEvent('KeyDown', keyInfo);
    this.logger.trace(`Generated combo: "${combo}"`);
    
    // Track the current active element
    this.lastActiveElement = event.target;
    
    return {
      combo,
      keyInfo,
      element: event.target
    };
  }

  /**
   * Process keyup event for modifier tracking
   */
  processKeyUp(event) {
    const keyInfo = this._extractKeyInfo(event);
    this.logger.logKeyEvent('KeyUp', keyInfo);
    
    // Handle modifier release timing
    if (this._isModifierKey(keyInfo.key)) {
      this._handleModifierRelease(keyInfo);
    }
  }

  /**
   * Add key combination to sequence
   */
  addToSequence(combo) {
    this.keySequence.push(combo);
    this.logger.debug(`Key sequence: [${this.keySequence.join(', ')}]`);
    
    // Reset sequence timeout
    this._resetSequenceTimeout();
    
    return this.getSequenceString();
  }

  /**
   * Get current sequence as string
   */
  getSequenceString() {
    return this.keySequence.join(' ');
  }

  /**
   * Clear current sequence
   */
  clearSequence() {
    this.logger.debug('Clearing key sequence');
    this.keySequence = [];
    this.lastModifierCombo = null;
    
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
    
    if (this.modifierReleaseTimeout) {
      clearTimeout(this.modifierReleaseTimeout);
      this.modifierReleaseTimeout = null;
    }
  }

  /**
   * Check if sequence is empty
   */
  hasSequence() {
    return this.keySequence.length > 0;
  }

  /**
   * Get last active element
   */
  getLastActiveElement() {
    return this.lastActiveElement;
  }

  /**
   * Track modifier combinations for complex sequences
   */
  trackModifierCombo(event) {
    const keyInfo = this._extractKeyInfo(event);
    
    if (this._hasModifiers(keyInfo)) {
      const modifierCombo = this._buildModifierCombo(keyInfo);
      
      if (modifierCombo !== this.lastModifierCombo) {
        this.lastModifierCombo = modifierCombo;
        this.logger.trace(`Modifier combo tracked: ${modifierCombo}`);
        
        // Set timeout for modifier release
        this._setModifierReleaseTimeout();
      }
    }
    
    return this.lastModifierCombo;
  }

  /**
   * Extract key information from event
   */
  _extractKeyInfo(event) {
    return {
      key: event.key,
      code: event.code,
      keyCode: event.keyCode,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      which: event.which,
      target: event.target
    };
  }

  /**
   * Build key combination string from key info
   */
  _buildKeyCombo(keyInfo) {
    const parts = [];
    
    // Add modifiers in consistent order
    if (keyInfo.ctrlKey) parts.push('ctrl');
    if (keyInfo.altKey) parts.push('alt');
    if (keyInfo.shiftKey) parts.push('shift');
    if (keyInfo.metaKey) parts.push('meta');
    
    // Add the main key
    let key = keyInfo.key.toLowerCase();
    
    // Handle special cases
    key = this._normalizeKey(key, keyInfo);
    
    // Don't add modifier keys themselves to the combo
    if (!this._isModifierKey(keyInfo.key)) {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  /**
   * Build modifier-only combination
   */
  _buildModifierCombo(keyInfo) {
    const parts = [];
    
    if (keyInfo.ctrlKey) parts.push('ctrl');
    if (keyInfo.altKey) parts.push('alt');
    if (keyInfo.shiftKey) parts.push('shift');
    if (keyInfo.metaKey) parts.push('meta');
    
    return parts.join('+');
  }

  /**
   * Normalize key names for consistency
   */
  _normalizeKey(key, keyInfo) {
    // Handle space
    if (key === ' ') return 'space';
    
    // Handle arrows
    if (key.startsWith('Arrow')) {
      return key.replace('Arrow', '').toLowerCase();
    }
    
    // Handle special keys
    const specialKeys = {
      'Enter': 'enter',
      'Escape': 'escape',
      'Tab': 'tab',
      'Backspace': 'backspace',
      'Delete': 'delete',
      'Insert': 'insert',
      'Home': 'home',
      'End': 'end',
      'PageUp': 'pageup',
      'PageDown': 'pagedown'
    };
    
    if (specialKeys[key]) {
      return specialKeys[key];
    }
    
    // Handle Mac Option key special characters
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0 && keyInfo.altKey) {
      const macOptionFixes = {
        '≤': 'comma',
        '≥': 'period',
        '÷': 'slash',
        '≠': 'equal',
        '…': 'semicolon',
        'æ': 'quote',
        '«': 'backslash',
        'µ': 'm'
      };
      
      if (macOptionFixes[key]) {
        this.logger.trace(`Mac Option key fix: ${key} → ${macOptionFixes[key]}`);
        return macOptionFixes[key];
      }
    }
    
    return key;
  }

  /**
   * Check if key is a modifier key
   */
  _isModifierKey(key) {
    const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'cmd', 'ctrl', 'alt', 'shift', 'meta'];
    return modifierKeys.includes(key);
  }

  /**
   * Check if key info has modifiers
   */
  _hasModifiers(keyInfo) {
    return keyInfo.ctrlKey || keyInfo.altKey || keyInfo.shiftKey || keyInfo.metaKey;
  }

  /**
   * Reset sequence timeout
   */
  _resetSequenceTimeout() {
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }
    
    this.sequenceTimeout = setTimeout(() => {
      this.logger.debug('Sequence timeout expired, clearing sequence');
      this.clearSequence();
    }, this.sequenceTimeoutDuration);
  }

  /**
   * Handle modifier key release
   */
  _handleModifierRelease(keyInfo) {
    // Clear any existing modifier release timeout
    if (this.modifierReleaseTimeout) {
      clearTimeout(this.modifierReleaseTimeout);
    }
    
    // Don't clear immediately - wait a bit to see if another key is pressed
    this.modifierReleaseTimeout = setTimeout(() => {
      this.lastModifierCombo = null;
      this.logger.trace('Modifier combo cleared after release');
    }, 100); // Short delay
  }

  /**
   * Set modifier release timeout
   */
  _setModifierReleaseTimeout() {
    if (this.modifierReleaseTimeout) {
      clearTimeout(this.modifierReleaseTimeout);
    }
    
    this.modifierReleaseTimeout = setTimeout(() => {
      if (this.lastModifierCombo) {
        this.logger.trace('Modifier release timeout - clearing combo');
        this.lastModifierCombo = null;
      }
    }, 2000); // 2 second timeout for modifier combos
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = { KeyDetector };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.LyXKeyDetector = { KeyDetector };
}