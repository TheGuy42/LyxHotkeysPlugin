/**
 * Action Executor Module for LyX Hotkeys Extension
 * Handles execution of various action types
 */

/**
 * Action Executor class for executing hotkey actions
 */
class ActionExecutor {
  constructor(logger = null) {
    this.logger = logger || { debug: () => {}, trace: () => {}, info: () => {}, error: () => {} };
    
    this.logger.debug('ActionExecutor initialized');
  }

  /**
   * Execute an action on the target element
   */
  async executeAction(action, element) {
    if (!action || !element) {
      this.logger.error('Invalid action or element provided');
      return false;
    }

    this.logger.logAction(action, element);

    try {
      switch (action.type) {
        case 'insert':
          return this._handleInsert(action, element);
        
        case 'wrap':
          return this._handleWrap(action, element);
        
        case 'navigation':
          return this._handleNavigation(action, element);
        
        case 'deletion':
          return this._handleDeletion(action, element);
        
        case 'selection':
          return this._handleSelection(action, element);
        
        case 'clipboard':
          return this._handleClipboard(action, element);
        
        case 'edit':
          return this._handleEdit(action, element);
        
        default:
          this.logger.error(`Unknown action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      this.logger.error('Error executing action:', error);
      return false;
    }
  }

  /**
   * Handle text insertion
   */
  _handleInsert(action, element) {
    const text = action.text || '';
    
    if (this._isFormField(element)) {
      return this._insertInFormField(text, element);
    } else if (element.isContentEditable) {
      return this._insertInContentEditable(text, element);
    }
    
    this.logger.error('Element is not editable');
    return false;
  }

  /**
   * Handle text wrapping
   */
  _handleWrap(action, element) {
    const before = action.before || '';
    const after = action.after || '';
    
    if (this._isFormField(element)) {
      return this._wrapInFormField(before, after, element);
    } else if (element.isContentEditable) {
      return this._wrapInContentEditable(before, after, element);
    }
    
    this.logger.error('Element is not editable');
    return false;
  }

  /**
   * Handle navigation actions
   */
  _handleNavigation(action, element) {
    const navType = action.navigation;
    
    switch (navType) {
      case 'char-forward':
        return this._moveCursor(element, 1);
      case 'char-backward':
        return this._moveCursor(element, -1);
      case 'word-right':
        return this._moveWord(element, 'right');
      case 'word-left':
        return this._moveWord(element, 'left');
      case 'line-begin':
        return this._moveToLineStart(element);
      case 'line-end':
        return this._moveToLineEnd(element);
      case 'buffer-begin':
        return this._moveToDocumentStart(element);
      case 'buffer-end':
        return this._moveToDocumentEnd(element);
      default:
        this.logger.error(`Unknown navigation type: ${navType}`);
        return false;
    }
  }

  /**
   * Handle deletion actions
   */
  _handleDeletion(action, element) {
    const delType = action.deletion;
    
    switch (delType) {
      case 'char-delete-forward':
        return this._deleteChar(element, 'forward');
      case 'char-delete-backward':
        return this._deleteChar(element, 'backward');
      case 'word-delete-forward':
        return this._deleteWord(element, 'forward');
      case 'word-delete-backward':
        return this._deleteWord(element, 'backward');
      case 'line-delete-forward':
        return this._deleteToLineEnd(element);
      case 'selection-delete':
        return this._deleteSelection(element);
      default:
        this.logger.error(`Unknown deletion type: ${delType}`);
        return false;
    }
  }

  /**
   * Handle selection actions
   */
  _handleSelection(action, element) {
    // Selection actions would be implemented here
    this.logger.debug('Selection actions not yet implemented');
    return false;
  }

  /**
   * Handle clipboard actions
   */
  _handleClipboard(action, element) {
    const clipType = action.clipboard;
    
    switch (clipType) {
      case 'copy':
        return this._copyToClipboard(element);
      case 'cut':
        return this._cutToClipboard(element);
      case 'paste':
        return this._pasteFromClipboard(element);
      default:
        this.logger.error(`Unknown clipboard type: ${clipType}`);
        return false;
    }
  }

  /**
   * Handle edit actions
   */
  _handleEdit(action, element) {
    const editType = action.edit;
    
    switch (editType) {
      case 'undo':
        return this._undo(element);
      case 'redo':
        return this._redo(element);
      default:
        this.logger.error(`Unknown edit type: ${editType}`);
        return false;
    }
  }

  /**
   * Insert text in form field (input/textarea)
   */
  _insertInFormField(text, element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    
    const newValue = value.substring(0, start) + text + value.substring(end);
    element.value = newValue;
    
    // Position cursor after inserted text
    const newPosition = start + text.length;
    element.setSelectionRange(newPosition, newPosition);
    
    this.logger.debug(`Text "${text}" inserted in form field`);
    return true;
  }

  /**
   * Insert text in contentEditable element
   */
  _insertInContentEditable(text, element) {
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      
      // Position cursor after inserted text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      this.logger.debug(`Text "${text}" inserted in contentEditable`);
      return true;
    }
    
    return false;
  }

  /**
   * Wrap selected text in form field
   */
  _wrapInFormField(before, after, element) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    const selectedText = value.substring(start, end);
    
    const wrappedText = before + selectedText + after;
    const newValue = value.substring(0, start) + wrappedText + value.substring(end);
    element.value = newValue;
    
    // Position cursor after wrapped text
    const newPosition = start + wrappedText.length;
    element.setSelectionRange(newPosition, newPosition);
    
    this.logger.debug(`Text wrapped with "${before}" ... "${after}"`);
    return true;
  }

  /**
   * Wrap selected text in contentEditable element
   */
  _wrapInContentEditable(before, after, element) {
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      range.deleteContents();
      
      const wrappedText = before + selectedText + after;
      const textNode = document.createTextNode(wrappedText);
      range.insertNode(textNode);
      
      // Position cursor after wrapped text
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      this.logger.debug(`Text wrapped with "${before}" ... "${after}"`);
      return true;
    }
    
    return false;
  }

  /**
   * Move cursor by character offset
   */
  _moveCursor(element, offset) {
    if (this._isFormField(element)) {
      const newPos = Math.max(0, Math.min(element.value.length, element.selectionStart + offset));
      element.setSelectionRange(newPos, newPos);
      return true;
    }
    // ContentEditable cursor movement would be more complex
    return false;
  }

  /**
   * Move cursor by word
   */
  _moveWord(element, direction) {
    // Word movement would be implemented here
    this.logger.debug(`Word movement (${direction}) not yet implemented`);
    return false;
  }

  /**
   * Move cursor to line start
   */
  _moveToLineStart(element) {
    if (this._isFormField(element)) {
      const text = element.value;
      const currentPos = element.selectionStart;
      const lineStart = text.lastIndexOf('\n', currentPos - 1) + 1;
      element.setSelectionRange(lineStart, lineStart);
      return true;
    }
    return false;
  }

  /**
   * Move cursor to line end
   */
  _moveToLineEnd(element) {
    if (this._isFormField(element)) {
      const text = element.value;
      const currentPos = element.selectionStart;
      let lineEnd = text.indexOf('\n', currentPos);
      if (lineEnd === -1) lineEnd = text.length;
      element.setSelectionRange(lineEnd, lineEnd);
      return true;
    }
    return false;
  }

  /**
   * Move cursor to document start
   */
  _moveToDocumentStart(element) {
    if (this._isFormField(element)) {
      element.setSelectionRange(0, 0);
      return true;
    }
    return false;
  }

  /**
   * Move cursor to document end
   */
  _moveToDocumentEnd(element) {
    if (this._isFormField(element)) {
      const end = element.value.length;
      element.setSelectionRange(end, end);
      return true;
    }
    return false;
  }

  /**
   * Delete character
   */
  _deleteChar(element, direction) {
    if (this._isFormField(element)) {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      
      if (start === end) {
        // No selection, delete one character
        if (direction === 'forward' && start < element.value.length) {
          element.value = element.value.substring(0, start) + element.value.substring(start + 1);
          element.setSelectionRange(start, start);
        } else if (direction === 'backward' && start > 0) {
          element.value = element.value.substring(0, start - 1) + element.value.substring(start);
          element.setSelectionRange(start - 1, start - 1);
        }
      } else {
        // Delete selection
        element.value = element.value.substring(0, start) + element.value.substring(end);
        element.setSelectionRange(start, start);
      }
      return true;
    }
    return false;
  }

  /**
   * Delete word
   */
  _deleteWord(element, direction) {
    // Word deletion would be implemented here
    this.logger.debug(`Word deletion (${direction}) not yet implemented`);
    return false;
  }

  /**
   * Delete to line end
   */
  _deleteToLineEnd(element) {
    if (this._isFormField(element)) {
      const text = element.value;
      const currentPos = element.selectionStart;
      let lineEnd = text.indexOf('\n', currentPos);
      if (lineEnd === -1) lineEnd = text.length;
      
      element.value = text.substring(0, currentPos) + text.substring(lineEnd);
      element.setSelectionRange(currentPos, currentPos);
      return true;
    }
    return false;
  }

  /**
   * Delete selection
   */
  _deleteSelection(element) {
    if (this._isFormField(element)) {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      
      if (start !== end) {
        element.value = element.value.substring(0, start) + element.value.substring(end);
        element.setSelectionRange(start, start);
        return true;
      }
    }
    return false;
  }

  /**
   * Copy to clipboard
   */
  _copyToClipboard(element) {
    try {
      document.execCommand('copy');
      this.logger.debug('Copy command executed');
      return true;
    } catch (error) {
      this.logger.error('Copy failed:', error);
      return false;
    }
  }

  /**
   * Cut to clipboard
   */
  _cutToClipboard(element) {
    try {
      document.execCommand('cut');
      this.logger.debug('Cut command executed');
      return true;
    } catch (error) {
      this.logger.error('Cut failed:', error);
      return false;
    }
  }

  /**
   * Paste from clipboard
   */
  _pasteFromClipboard(element) {
    try {
      document.execCommand('paste');
      this.logger.debug('Paste command executed');
      return true;
    } catch (error) {
      this.logger.error('Paste failed:', error);
      return false;
    }
  }

  /**
   * Undo last action
   */
  _undo(element) {
    try {
      document.execCommand('undo');
      this.logger.debug('Undo command executed');
      return true;
    } catch (error) {
      this.logger.error('Undo failed:', error);
      return false;
    }
  }

  /**
   * Redo last undone action
   */
  _redo(element) {
    try {
      document.execCommand('redo');
      this.logger.debug('Redo command executed');
      return true;
    } catch (error) {
      this.logger.error('Redo failed:', error);
      return false;
    }
  }

  /**
   * Check if element is a form field (input/textarea)
   */
  _isFormField(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const inputTypes = ['text', 'search', 'url', 'tel', 'email', 'password'];
    
    return tagName === 'textarea' || 
           (tagName === 'input' && inputTypes.includes(element.type));
  }

  /**
   * Check if element is editable
   */
  _isEditableElement(element) {
    if (!element) return false;
    
    return this._isFormField(element) || element.isContentEditable;
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = { ActionExecutor };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.LyXActionExecutor = { ActionExecutor };
}