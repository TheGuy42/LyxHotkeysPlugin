/**
 * Action Executor
 * Handles execution of various action types
 */

class ActionExecutor {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.eventManager.on('actionExecute', (action, element) => {
      this.executeAction(action, element);
    });
  }

  /**
   * Execute an action
   * @param {Object} action - Action to execute
   * @param {Element} element - Target element
   */
  executeAction(action, element) {
    console.log(`LyX Extension: 🚀 Starting action execution:`, action);
    console.log(`LyX Extension: Target element:`, element.tagName, element.type, element.className);
    
    try {
      const executor = this.getActionExecutor(action.type);
      if (executor) {
        executor.call(this, action, element);
        console.log(`LyX Extension: ✅ Action execution completed successfully`);
      } else {
        console.warn('LyX Extension: Unknown action type:', action.type);
      }
    } catch (error) {
      console.error('LyX Extension: ❌ Error executing action:', error, action);
    }
  }

  /**
   * Get action executor function
   * @param {string} type - Action type
   * @returns {Function|null} - Executor function or null
   */
  getActionExecutor(type) {
    const executors = {
      'insert': this.executeInsert,
      'wrap': this.executeWrap,
      'navigation': this.executeNavigation,
      'selection': this.executeSelection,
      'delete': this.executeDelete,
      'clipboard': this.executeClipboard,
      'edit': this.executeEdit
    };
    
    return executors[type];
  }

  /**
   * Execute insert action
   * @param {Object} action - Insert action
   * @param {Element} element - Target element
   */
  executeInsert(action, element) {
    console.log(`LyX Extension: 📝 insertText called with text: "${action.text}"`);
    
    if (!this.isEditableElement(element)) {
      console.warn(`LyX Extension: ❌ Element not editable, cannot insert text`);
      return;
    }

    if (element.isContentEditable) {
      this.insertInContentEditable(action.text, element);
    } else {
      this.insertInFormField(action.text, element);
    }
  }

  /**
   * Execute wrap action
   * @param {Object} action - Wrap action
   * @param {Element} element - Target element
   */
  executeWrap(action, element) {
    console.log(`LyX Extension: Wrapping with: "${action.before}" ... "${action.after}"`);
    
    if (!this.isEditableElement(element)) return;

    if (element.isContentEditable) {
      this.wrapSelectionInContentEditable(action.before, action.after, element);
    } else {
      this.wrapSelectionInFormField(action.before, action.after, element);
    }
  }

  /**
   * Execute navigation action
   * @param {Object} action - Navigation action
   * @param {Element} element - Target element
   */
  executeNavigation(action, element) {
    console.log(`LyX Extension: Navigation action: ${action.action}`);
    
    const navigationActions = {
      moveRight: () => this.moveCursor(element, 1),
      moveLeft: () => this.moveCursor(element, -1),
      moveWordRight: () => this.moveWord(element, 1),
      moveWordLeft: () => this.moveWord(element, -1),
      moveLineStart: () => this.moveToLineStart(element),
      moveLineEnd: () => this.moveToLineEnd(element),
      moveDocumentStart: () => this.moveToDocumentStart(element),
      moveDocumentEnd: () => this.moveToDocumentEnd(element)
    };

    const executor = navigationActions[action.action];
    if (executor) {
      executor();
    }
  }

  /**
   * Execute selection action
   * @param {Object} action - Selection action
   * @param {Element} element - Target element
   */
  executeSelection(action, element) {
    console.log(`LyX Extension: Selection action: ${action.action}`);
    // Implementation similar to navigation but extends selection
    // For now, delegating to navigation (would need specific implementation)
    this.executeNavigation(action, element);
  }

  /**
   * Execute delete action
   * @param {Object} action - Delete action
   * @param {Element} element - Target element
   */
  executeDelete(action, element) {
    console.log(`LyX Extension: Delete action: ${action.action}`);
    
    const deleteActions = {
      deleteRight: () => this.deleteChar(element, 1),
      deleteLeft: () => this.deleteChar(element, -1),
      deleteWordRight: () => this.deleteWord(element, 1),
      deleteWordLeft: () => this.deleteWord(element, -1),
      deleteLineForward: () => this.deleteToLineEnd(element)
    };

    const executor = deleteActions[action.action];
    if (executor) {
      executor();
    }
  }

  /**
   * Execute clipboard action
   * @param {Object} action - Clipboard action
   * @param {Element} element - Target element
   */
  executeClipboard(action, element) {
    console.log(`LyX Extension: Clipboard action: ${action.action}`);
    
    switch (action.action) {
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

  /**
   * Execute edit action
   * @param {Object} action - Edit action
   * @param {Element} element - Target element
   */
  executeEdit(action, element) {
    console.log(`LyX Extension: Edit action: ${action.action}`);
    
    switch (action.action) {
      case 'undo':
        document.execCommand('undo');
        break;
      case 'redo':
        document.execCommand('redo');
        break;
    }
  }

  // Helper methods for text manipulation

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

  // Navigation helpers

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

  // Delete helpers

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

  /**
   * Check if element is editable
   * @param {Element} element - Element to check
   * @returns {boolean} - Whether element is editable
   */
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActionExecutor;
} else if (typeof window !== 'undefined') {
  window.ActionExecutor = ActionExecutor;
}
