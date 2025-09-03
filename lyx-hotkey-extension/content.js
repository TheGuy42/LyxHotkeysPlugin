/**
 * Content Script for LyX Hotkey Extension
 * Handles hotkey detection and text insertion in web pages
 */

class LyXHotkeyHandler {
  constructor() {
    console.log('🏗️ LyX Extension: Initializing LyXHotkeyHandler...');
    this.enabled = true;
    this.mappings = new Map();
    this.keySequence = [];
    this.sequenceTimeout = null;
    this.sequenceTimeoutDuration = 1000; // 1 second timeout for sequences
    this.lastActiveElement = null;
    
    console.log('🔧 LyX Extension: Starting initialization...');
    this.init();
  }

  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        switch (request.action) {
          case 'extensionToggled':
            this.enabled = request.enabled;
            console.log(`LyX Extension ${this.enabled ? 'enabled' : 'disabled'}`);
            break;
          case 'mappingsUpdated':
            if (request.mappings && typeof request.mappings === 'object') {
              this.mappings = new Map(Object.entries(request.mappings));
              console.log(`LyX Extension: Loaded ${this.mappings.size} hotkey mappings`);
            } else {
              console.warn('LyX Extension: Invalid mappings received:', request.mappings);
            }
            break;
          case 'sequenceTimeoutUpdated':
            if (request.timeout && typeof request.timeout === 'number') {
              this.sequenceTimeoutDuration = request.timeout;
              console.log(`LyX Extension: Sequence timeout updated to ${request.timeout}ms`);
            }
            break;
        }
      } catch (error) {
        console.error('LyX Extension: Error handling message:', error, request);
      }
    });

    // Request initial state with retry logic
    this.requestInitialState();

    // Set up event listeners
    this.setupEventListeners();
  }

  requestInitialState() {
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('LyX Extension: Failed to get state from background:', chrome.runtime.lastError);
        // Retry after a short delay
        setTimeout(() => this.requestInitialState(), 1000);
        return;
      }
      
      if (response) {
        this.enabled = response.enabled;
        if (response.mappings && typeof response.mappings === 'object') {
          this.mappings = new Map(Object.entries(response.mappings));
          console.log(`LyX Extension initialized: ${this.enabled ? 'enabled' : 'disabled'}, ${this.mappings.size} mappings`);
        } else {
          console.warn('LyX Extension: No valid mappings in response:', response);
        }
      } else {
        console.warn('LyX Extension: No response from background script');
      }
    });
  }

  setupEventListeners() {
    console.log('🎯 LyX Extension: Setting up event listeners...');
    document.addEventListener('keydown', (e) => {
      console.log('🔑 LyX Extension: Keydown detected:', e.key, e.code, 'ctrl:', e.ctrlKey, 'alt:', e.altKey);
      this.handleKeyDown(e);
    }, true);
    document.addEventListener('keyup', (e) => this.handleKeyUp(e), true);
    document.addEventListener('focus', (e) => this.handleFocus(e), true);
    console.log('✅ LyX Extension: Event listeners set up successfully');
  }

  handleFocus(e) {
    // Track the currently focused element
    if (this.isEditableElement(e.target)) {
      this.lastActiveElement = e.target;
    }
  }

  handleKeyDown(e) {
    if (!this.enabled) {
      console.log('LyX Extension: Disabled, ignoring keydown');
      return;
    }

    // Only handle keys when in editable elements
    if (!this.isEditableElement(e.target)) {
      console.log('LyX Extension: Not in editable element, ignoring keydown');
      return;
    }

    const keyCombo = this.getKeyCombo(e);
    if (!keyCombo) {
      console.log('LyX Extension: No key combo generated, ignoring keydown');
      return;
    }

    console.log(`LyX Extension: Processing key combo: ${keyCombo}`);
    console.log(`LyX Extension: Current mappings count: ${this.mappings.size}`);
    
    // Add to current sequence
    this.keySequence.push(keyCombo);
    
    // Clear any existing timeout
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }

    // Check for matches
    const fullSequence = this.keySequence.join(' ');
    console.log(`LyX Extension: Full sequence: "${fullSequence}"`);
    
    const action = this.findMatchingAction(fullSequence);
    console.log(`LyX Extension: Action found:`, action);

    if (action) {
      // Found a complete match - prevent default behavior
      console.log(`LyX Extension: ✅ Executing action for "${fullSequence}":`, action);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.executeAction(action, e.target);
      this.clearSequence();
    } else if (this.hasPartialMatch(fullSequence)) {
      // Partial match, wait for more keys - prevent default behavior
      console.log(`LyX Extension: 🔄 Partial match for "${fullSequence}", waiting for more keys`);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.sequenceTimeout = setTimeout(() => {
        console.log(`LyX Extension: ⏰ Sequence timeout for "${fullSequence}"`);
        this.clearSequence();
      }, this.sequenceTimeoutDuration);
    } else {
      // No match, clear sequence
      console.log(`LyX Extension: ❌ No match for "${fullSequence}"`);
      console.log(`LyX Extension: Available mappings:`, Array.from(this.mappings.keys()).slice(0, 10));
      this.clearSequence();
    }
  }

  handleKeyUp(e) {
    // Handle any key up events if needed
  }

  getKeyCombo(e) {
    const parts = [];
    
    // Detect platform for proper key mapping
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Add modifiers in consistent order
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');

    // Get the main key - use code for more reliable detection
    let key = e.key.toLowerCase();
    
    // For Mac, handle Option key combinations that produce special characters
    if (isMac && e.altKey && !e.ctrlKey && !e.metaKey) {
      // Use the code property to get the physical key instead of the produced character
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
      
      if (codeToKey[e.code]) {
        key = codeToKey[e.code];
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

  findMatchingAction(sequence) {
    return this.mappings.get(sequence);
  }

  hasPartialMatch(sequence) {
    for (const key of this.mappings.keys()) {
      if (key.startsWith(sequence + ' ')) {
        console.log(`🔍 LyX Extension: Partial match found: "${sequence}" matches start of "${key}"`);
        return true;
      }
    }
    return false;
  }

  clearSequence() {
    this.keySequence = [];
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
  }

  executeAction(action, element) {
    console.log(`LyX Extension: 🚀 Starting action execution:`, action);
    console.log(`LyX Extension: Target element:`, element.tagName, element.type, element.className);
    
    try {
      switch (action.type) {
        case 'insert':
          console.log(`LyX Extension: Inserting text: "${action.text}"`);
          this.insertText(action.text, element);
          break;
        case 'wrap':
          console.log(`LyX Extension: Wrapping with: "${action.before}" ... "${action.after}"`);
          this.wrapSelection(action.before, action.after, element);
          break;
        case 'navigation':
          console.log(`LyX Extension: Navigation action: ${action.action}`);
          this.handleNavigation(action.action, element);
          break;
        case 'selection':
          console.log(`LyX Extension: Selection action: ${action.action}`);
          this.handleSelection(action.action, element);
          break;
        case 'delete':
          console.log(`LyX Extension: Delete action: ${action.action}`);
          this.handleDeletion(action.action, element);
          break;
        case 'clipboard':
          console.log(`LyX Extension: Clipboard action: ${action.action}`);
          this.handleClipboard(action.action, element);
          break;
        case 'edit':
          console.log(`LyX Extension: Edit action: ${action.action}`);
          this.handleEdit(action.action, element);
          break;
        default:
          console.warn('LyX Extension: Unknown action type:', action.type);
      }
      console.log(`LyX Extension: ✅ Action execution completed successfully`);
    } catch (error) {
      console.error('LyX Extension: ❌ Error executing action:', error, action);
      // Don't let errors break the extension state
    }
  }

  insertText(text, element) {
    console.log(`LyX Extension: 📝 insertText called with text: "${text}"`);
    console.log(`LyX Extension: Element check - isEditable: ${this.isEditableElement(element)}`);
    
    if (!this.isEditableElement(element)) {
      console.warn(`LyX Extension: ❌ Element not editable, cannot insert text`);
      return;
    }

    console.log(`LyX Extension: Element type: ${element.tagName}, contentEditable: ${element.isContentEditable}`);
    
    if (element.isContentEditable) {
      console.log(`LyX Extension: Using contentEditable insertion`);
      this.insertInContentEditable(text, element);
    } else {
      console.log(`LyX Extension: Using form field insertion`);
      this.insertInFormField(text, element);
    }
    
    console.log(`LyX Extension: ✅ Text insertion completed`);
  }

  insertInFormField(text, element) {
    console.log(`LyX Extension: 🔤 insertInFormField - text: "${text}"`);
    
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;

    console.log(`LyX Extension: Cursor position: ${start}-${end}, current value length: ${value.length}`);

    // Insert text at cursor position
    const newValue = value.slice(0, start) + text + value.slice(end);
    element.value = newValue;

    console.log(`LyX Extension: New value set, length: ${newValue.length}`);

    // Position cursor after inserted text
    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);

    console.log(`LyX Extension: Cursor positioned at: ${newCursorPos}`);

    // Trigger input event
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log(`LyX Extension: ✅ Form field insertion completed`);
  }

  insertInContentEditable(text, element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  wrapSelection(before, after, element) {
    if (!this.isEditableElement(element)) return;

    if (element.isContentEditable) {
      this.wrapSelectionInContentEditable(before, after, element);
    } else {
      this.wrapSelectionInFormField(before, after, element);
    }
  }

  wrapSelectionInFormField(before, after, element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    const selectedText = value.slice(start, end);

    const wrappedText = before + selectedText + after;
    const newValue = value.slice(0, start) + wrappedText + value.slice(end);
    element.value = newValue;

    // Select the wrapped content (without the wrapper)
    const newStart = start + before.length;
    const newEnd = newStart + selectedText.length;
    element.setSelectionRange(newStart, newEnd);

    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  wrapSelectionInContentEditable(before, after, element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    range.deleteContents();

    const beforeNode = document.createTextNode(before);
    const afterNode = document.createTextNode(after);
    const contentNode = document.createTextNode(selectedText);

    range.insertNode(beforeNode);
    range.setStartAfter(beforeNode);
    range.insertNode(contentNode);
    range.setStartAfter(contentNode);
    range.insertNode(afterNode);

    // Select the content between the wrappers
    range.setStartAfter(beforeNode);
    range.setEndBefore(afterNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  handleNavigation(action, element) {
    // Implement navigation actions
    const actions = {
      moveRight: () => this.moveCursor(element, 1),
      moveLeft: () => this.moveCursor(element, -1),
      moveWordRight: () => this.moveWord(element, 1),
      moveWordLeft: () => this.moveWord(element, -1),
      moveLineStart: () => this.moveToLineStart(element),
      moveLineEnd: () => this.moveToLineEnd(element),
      moveDocumentStart: () => this.moveToDocumentStart(element),
      moveDocumentEnd: () => this.moveToDocumentEnd(element)
    };

    if (actions[action]) {
      actions[action]();
    }
  }

  moveCursor(element, offset) {
    if (element.setSelectionRange) {
      const pos = element.selectionStart + offset;
      element.setSelectionRange(pos, pos);
    }
  }

  moveWord(element, direction) {
    // Simplified word movement - in a real implementation,
    // you'd want more sophisticated word boundary detection
    const value = element.value;
    let pos = element.selectionStart;
    
    if (direction > 0) {
      // Move to next word
      while (pos < value.length && /\S/.test(value[pos])) pos++;
      while (pos < value.length && /\s/.test(value[pos])) pos++;
    } else {
      // Move to previous word
      while (pos > 0 && /\s/.test(value[pos - 1])) pos--;
      while (pos > 0 && /\S/.test(value[pos - 1])) pos--;
    }
    
    element.setSelectionRange(pos, pos);
  }

  moveToLineStart(element) {
    const value = element.value;
    let pos = element.selectionStart;
    
    while (pos > 0 && value[pos - 1] !== '\n') {
      pos--;
    }
    
    element.setSelectionRange(pos, pos);
  }

  moveToLineEnd(element) {
    const value = element.value;
    let pos = element.selectionStart;
    
    while (pos < value.length && value[pos] !== '\n') {
      pos++;
    }
    
    element.setSelectionRange(pos, pos);
  }

  moveToDocumentStart(element) {
    element.setSelectionRange(0, 0);
  }

  moveToDocumentEnd(element) {
    const end = element.value.length;
    element.setSelectionRange(end, end);
  }

  handleSelection(action, element) {
    // Similar to navigation but extends selection
    // Implementation would be similar to navigation but using different end position
  }

  handleDeletion(action, element) {
    // Implement deletion actions
    const actions = {
      deleteRight: () => this.deleteChar(element, 1),
      deleteLeft: () => this.deleteChar(element, -1),
      deleteWordRight: () => this.deleteWord(element, 1),
      deleteWordLeft: () => this.deleteWord(element, -1),
      deleteLineForward: () => this.deleteToLineEnd(element)
    };

    if (actions[action]) {
      actions[action]();
    }
  }

  deleteChar(element, direction) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    
    if (start !== end) {
      // Delete selection
      this.deleteSelection(element);
    } else {
      // Delete single character
      const value = element.value;
      let newStart, newEnd;
      
      if (direction > 0) {
        newStart = start;
        newEnd = Math.min(start + 1, value.length);
      } else {
        newStart = Math.max(start - 1, 0);
        newEnd = start;
      }
      
      const newValue = value.slice(0, newStart) + value.slice(newEnd);
      element.value = newValue;
      element.setSelectionRange(newStart, newStart);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  deleteWord(element, direction) {
    // Simplified word deletion
    const start = element.selectionStart;
    const value = element.value;
    let pos = start;
    
    if (direction > 0) {
      while (pos < value.length && /\S/.test(value[pos])) pos++;
      while (pos < value.length && /\s/.test(value[pos])) pos++;
    } else {
      while (pos > 0 && /\s/.test(value[pos - 1])) pos--;
      while (pos > 0 && /\S/.test(value[pos - 1])) pos--;
    }
    
    const newValue = value.slice(0, Math.min(start, pos)) + value.slice(Math.max(start, pos));
    element.value = newValue;
    element.setSelectionRange(Math.min(start, pos), Math.min(start, pos));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  deleteToLineEnd(element) {
    const start = element.selectionStart;
    const value = element.value;
    let pos = start;
    
    while (pos < value.length && value[pos] !== '\n') {
      pos++;
    }
    
    const newValue = value.slice(0, start) + value.slice(pos);
    element.value = newValue;
    element.setSelectionRange(start, start);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  deleteSelection(element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    
    const newValue = value.slice(0, start) + value.slice(end);
    element.value = newValue;
    element.setSelectionRange(start, start);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  handleClipboard(action, element) {
    // Note: Clipboard operations have limitations in content scripts
    // These would need to be implemented using the clipboard API or execCommand
    switch (action) {
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
        // Paste is more complex and might need special handling
        break;
      case 'cut':
        document.execCommand('cut');
        break;
    }
  }

  handleEdit(action, element) {
    switch (action) {
      case 'undo':
        document.execCommand('undo');
        break;
      case 'redo':
        document.execCommand('redo');
        break;
    }
  }

  isEditableElement(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const editable = element.isContentEditable;
    const inputTypes = ['text', 'search', 'url', 'tel', 'email', 'password'];
    
    return editable || 
           tagName === 'textarea' || 
           (tagName === 'input' && inputTypes.includes(element.type));
  }
}

// Initialize the hotkey handler
console.log('🚀 LyX Extension: Content script loading...');
const lyxHandler = new LyXHotkeyHandler();
console.log('✅ LyX Extension: Content script initialized successfully');
