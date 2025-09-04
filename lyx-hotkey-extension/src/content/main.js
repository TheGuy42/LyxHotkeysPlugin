const logger = new Logger('content-script');

class LyXHotkeyHandler {
  constructor() {
    logger.info('Initializing LyXHotkeyHandler...');
    this.enabled = true;
    this.mappings = new Map();
    this.keySequence = [];
    this.sequenceTimeout = null;
    this.sequenceTimeoutDuration = 1000; // 1 second timeout for sequences
    this.lastActiveElement = null;
    
    this.init();
  }

  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      logger.debug('Message received:', request);
      try {
        switch (request.action) {
          case MESSAGE_ACTIONS.EXTENSION_TOGGLED:
            this.enabled = request.enabled;
            logger.info(`Extension ${this.enabled ? 'enabled' : 'disabled'}`);
            break;
          case MESSAGE_ACTIONS.MAPPINGS_UPDATED:
            if (request.mappings && typeof request.mappings === 'object') {
              this.mappings = new Map(Object.entries(request.mappings));
              logger.info(`Loaded ${this.mappings.size} hotkey mappings`);
            } else {
              logger.warn('Invalid mappings received:', request.mappings);
            }
            break;
          case MESSAGE_ACTIONS.SEQUENCE_TIMEOUT_UPDATED:
            if (request.timeout && typeof request.timeout === 'number') {
              this.sequenceTimeoutDuration = request.timeout;
              logger.info(`Sequence timeout updated to ${request.timeout}ms`);
            }
            break;
        }
      } catch (error) {
        logger.error('Error handling message:', error, request);
      }
    });

    // Request initial state with retry logic
    this.requestInitialState();

    // Set up event listeners
    this.setupEventListeners();
  }

  requestInitialState() {
    chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_STATE }, (response) => {
      if (chrome.runtime.lastError) {
        logger.warn('Failed to get state from background:', chrome.runtime.lastError.message);
        // Retry after a short delay
        setTimeout(() => this.requestInitialState(), 1000);
        return;
      }
      
      if (response) {
        this.enabled = response.enabled;
        if (response.mappings && typeof response.mappings === 'object') {
          this.mappings = new Map(Object.entries(response.mappings));
          logger.info(`Initialized: ${this.enabled ? 'enabled' : 'disabled'}, ${this.mappings.size} mappings`);
        } else {
          logger.warn('No valid mappings in response:', response);
        }
      } else {
        logger.warn('No response from background script for initial state.');
      }
    });
  }

  setupEventListeners() {
    logger.debug('Setting up event listeners...');
    document.addEventListener('keydown', (e) => this.handleKeyDown(e), true);
    document.addEventListener('focus', (e) => this.handleFocus(e), true);
    logger.debug('Event listeners set up.');
  }

  handleFocus(e) {
    if (this.isEditableElement(e.target)) {
      this.lastActiveElement = e.target;
      logger.debug('Focused on editable element:', e.target.tagName);
    }
  }

  handleKeyDown(e) {
    if (!this.enabled) return;

    if (!this.isEditableElement(e.target)) {
      return;
    }

    const keyCombo = this.getKeyCombo(e);
    if (!keyCombo) {
      return;
    }

    logger.debug(`Processing key combo: ${keyCombo}`);
    
    this.keySequence.push(keyCombo);
    
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }

    const fullSequence = this.keySequence.join(' ');
    logger.debug(`Full sequence: "${fullSequence}"`);
    
    const action = this.findMatchingAction(fullSequence);

    if (action) {
      logger.info(`Executing action for "${fullSequence}":`, action);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.executeAction(action, e.target);
      this.clearSequence();
    } else if (this.hasPartialMatch(fullSequence)) {
      logger.debug(`Partial match for "${fullSequence}", waiting...`);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.sequenceTimeout = setTimeout(() => {
        logger.debug(`Sequence timeout for "${fullSequence}"`);
        this.clearSequence();
      }, this.sequenceTimeoutDuration);
    } else {
      logger.debug(`No match for "${fullSequence}"`);
      this.clearSequence();
    }
  }

  getKeyCombo(e) {
    const parts = [];
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');

    let key = e.key.toLowerCase();
    
    if (isMac && e.altKey && !e.ctrlKey && !e.metaKey) {
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
    logger.debug(`Executing action:`, action, `on element:`, element);
    try {
      switch (action.type) {
        case 'insert':
          this.insertText(action.text, element);
          break;
        case 'wrap':
          this.wrapSelection(action.before, action.after, element);
          break;
        case 'navigation':
          this.handleNavigation(action.action, element);
          break;
        case 'selection':
          this.handleSelection(action.action, element);
          break;
        case 'delete':
          this.handleDeletion(action.action, element);
          break;
        case 'clipboard':
          this.handleClipboard(action.action, element);
          break;
        case 'edit':
          this.handleEdit(action.action, element);
          break;
        default:
          logger.warn('Unknown action type:', action.type);
      }
    } catch (error) {
      logger.error('Error executing action:', error, action);
    }
  }

  insertText(text, element) {
    if (!this.isEditableElement(element)) {
      logger.warn(`Element not editable, cannot insert text.`);
      return;
    }

    if (element.isContentEditable) {
      this.insertInContentEditable(text, element);
    } else {
      this.insertInFormField(text, element);
    }
  }

  insertInFormField(text, element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;

    const newValue = value.slice(0, start) + text + value.slice(end);
    element.value = newValue;

    const newCursorPos = start + text.length;
    element.setSelectionRange(newCursorPos, newCursorPos);

    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  insertInContentEditable(text, element) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

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

    range.setStartAfter(beforeNode);
    range.setEndBefore(afterNode);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  handleNavigation(action, element) {
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
    const value = element.value;
    let pos = element.selectionStart;
    
    if (direction > 0) {
      while (pos < value.length && /\S/.test(value[pos])) pos++;
      while (pos < value.length && /\s/.test(value[pos])) pos++;
    } else {
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
    // Implementation would be similar to navigation but using different end position
  }

  handleDeletion(action, element) {
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
      this.deleteSelection(element);
    } else {
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
    switch (action) {
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
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
    const inputTypes = ['text', 'search', 'url', 'tel', 'email', 'password', 'number'];
    
    return editable || 
           tagName === 'textarea' || 
           (tagName === 'input' && inputTypes.includes(element.type));
  }
}

// Initialize the hotkey handler
logger.info('Content script loading...');
const lyxHandler = new LyXHotkeyHandler();
logger.info('Content script initialized.');
