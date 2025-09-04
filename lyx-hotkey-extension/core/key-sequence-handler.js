/**
 * Key Sequence Handler
 * Handles key detection, sequence building, and matching
 * Version: 2.0 (Fixed Map/Object compatibility)
 */

class KeySequenceHandler {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.keySequence = [];
    this.sequenceTimeout = null;
    this.sequenceTimeoutDuration = 1000;
    this.mappings = new Map();
    this.enabled = true;
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.eventManager.on('mappingsUpdated', (mappings) => {
      this.setMappings(mappings);
    });
    
    this.eventManager.on('sequenceTimeoutUpdated', (timeout) => {
      this.sequenceTimeoutDuration = timeout;
    });
    
    this.eventManager.on('enabledToggled', (enabled) => {
      this.enabled = enabled;
    });
  }

  /**
   * Process a key event
   * @param {KeyboardEvent} event - The keyboard event
   * @param {Element} target - The target element
   * @returns {boolean} - Whether the event was handled
   */
  processKeyEvent(event, target) {
    if (!this.enabled) {
      return false;
    }

    const keyCombo = this.getKeyCombo(event);
    if (!keyCombo) {
      return false;
    }

    console.log(`LyX Extension: Processing key combo: ${keyCombo}`);
    
    // Add to current sequence
    this.keySequence.push(keyCombo);
    
    // Clear any existing timeout
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }

    // Check for matches
    const fullSequence = this.keySequence.join(' ');
    const action = this.findMatchingAction(fullSequence);

    if (action) {
      // Found a complete match
      console.log(`LyX Extension: ✅ Executing action for "${fullSequence}":`, action);
      this.eventManager.emit('actionExecute', action, target);
      this.clearSequence();
      return true;
    } else if (this.hasPartialMatch(fullSequence)) {
      // Partial match, wait for more keys
      console.log(`LyX Extension: 🔄 Partial match for "${fullSequence}", waiting for more keys`);
      this.sequenceTimeout = setTimeout(() => {
        console.log(`LyX Extension: ⏰ Sequence timeout for "${fullSequence}"`);
        this.clearSequence();
      }, this.sequenceTimeoutDuration);
      return true;
    } else {
      // No match, clear sequence
      console.log(`LyX Extension: ❌ No match for "${fullSequence}"`);
      this.clearSequence();
      return false;
    }
  }

  /**
   * Get key combination string from event
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {string|null} - Key combination string or null
   */
  getKeyCombo(event) {
    const parts = [];
    
    // Detect platform for proper key mapping
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Add modifiers in consistent order
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');

    // Get the main key
    let key = event.key.toLowerCase();
    
    // For Mac, handle Option key combinations that produce special characters
    if (isMac && event.altKey && !event.ctrlKey && !event.metaKey) {
      const codeToKey = {
        'KeyA': 'a', 'KeyB': 'b', 'KeyC': 'c', 'KeyD': 'd', 'KeyE': 'e',
        'KeyF': 'f', 'KeyG': 'g', 'KeyH': 'h', 'KeyI': 'i', 'KeyJ': 'j',
        'KeyK': 'k', 'KeyL': 'l', 'KeyM': 'm', 'KeyN': 'n', 'KeyO': 'o',
        'KeyP': 'p', 'KeyQ': 'q', 'KeyR': 'r', 'KeyS': 's', 'KeyT': 't',
        'KeyU': 'u', 'KeyV': 'v', 'KeyW': 'w', 'KeyX': 'x', 'KeyY': 'y',
        'KeyZ': 'z',
        'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
        'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9',
        'Space': 'space'
      };
      
      if (codeToKey[event.code]) {
        key = codeToKey[event.code];
      }
    }
    
    // Normalize special keys
    const keyNormalizations = {
      ' ': 'space',
      'arrowleft': 'left',
      'arrowright': 'right',
      'arrowup': 'up',
      'arrowdown': 'down',
      'pageup': 'prior',
      'pagedown': 'next'
    };
    
    key = keyNormalizations[key] || key;
    
    // Skip modifier-only presses
    if (['control', 'alt', 'shift', 'meta'].includes(key)) {
      return null;
    }

    parts.push(key);
    return parts.join('+');
  }

  /**
   * Find matching action for sequence
   * @param {string} sequence - Key sequence
   * @returns {Object|null} - Action object or null
   */
  findMatchingAction(sequence) {
    if (!this.mappings) return null;
    
    // Ensure mappings is a Map
    if (this.mappings instanceof Map) {
      return this.mappings.get(sequence);
    } else if (typeof this.mappings === 'object') {
      return this.mappings[sequence];
    }
    return null;
  }

  /**
   * Check if sequence has partial match
   * @param {string} sequence - Key sequence
   * @returns {boolean} - Whether there's a partial match
   */
  hasPartialMatch(sequence) {
    if (!this.mappings) return false;
    
    // Ensure mappings is a Map
    const mappingsToCheck = this.mappings instanceof Map ? this.mappings : new Map(Object.entries(this.mappings));
    
    for (const key of mappingsToCheck.keys()) {
      if (key.startsWith(sequence + ' ')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Clear current sequence
   */
  clearSequence() {
    this.keySequence = [];
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
  }

  /**
   * Set mappings
   * @param {Map|Object} mappings - New mappings (Map or plain object)
   */
  setMappings(mappings) {
    console.log('🔧 KeySequenceHandler: setMappings called with:', typeof mappings, mappings);
    
    if (mappings instanceof Map) {
      this.mappings = mappings;
      console.log('🔧 KeySequenceHandler: Using Map directly');
    } else if (mappings && typeof mappings === 'object') {
      // Convert plain object to Map
      this.mappings = new Map(Object.entries(mappings));
      console.log('🔧 KeySequenceHandler: Converted object to Map, size:', this.mappings.size);
    } else {
      this.mappings = new Map();
      console.log('🔧 KeySequenceHandler: Created empty Map');
    }
  }

  /**
   * Set enabled state
   * @param {boolean} enabled - Enabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Set sequence timeout duration
   * @param {number} duration - Timeout duration in milliseconds
   */
  setSequenceTimeout(duration) {
    this.sequenceTimeoutDuration = duration;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeySequenceHandler;
} else if (typeof window !== 'undefined') {
  window.KeySequenceHandler = KeySequenceHandler;
}
