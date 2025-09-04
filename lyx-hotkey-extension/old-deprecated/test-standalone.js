// Standalone test script that works without extension API
console.log('🚀 Standalone test script loading...');

// Inline the content script logic for testing
class TestLyXHotkeyHandler {
  constructor() {
    console.log('🏗️ Test LyXHotkeyHandler: Initializing...');
    this.enabled = true;
    this.mappings = new Map();
    this.keySequence = [];
    this.sequenceTimeout = null;
    this.sequenceTimeoutDuration = 1000;
    this.lastModifierCombo = null; // Track last modifier combination
    this.modifierReleaseTimeout = null;
    this.macMMapping = 'ctrl'; // Default Mac M- mapping preference
    
    // Set up default mappings
    this.setupDefaultMappings();
    this.setupEventListeners();
    this.loadPreferences();
  }
  
  setupDefaultMappings() {
    // Detect platform
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Default mappings for testing - will be updated based on Mac preference
    const defaultMappings = {
      'ctrl+m': { type: 'wrap', before: '$', after: '$' },
      'ctrl+shift+m': { type: 'wrap', before: '$$\n', after: '\n$$' },
      'ctrl+b': { type: 'wrap', before: '**', after: '**' },
      'ctrl+e': { type: 'wrap', before: '*', after: '*' },
      'alt+m': { type: 'insert', text: '\\mu' },
      'alt+g': { type: 'insert', text: '\\alpha' },
      'alt+p': { type: 'insert', text: '\\pi' },
      'alt+l': { type: 'insert', text: '\\lambda' },
      'alt+s': { type: 'insert', text: '\\sigma' },
      
      // Multi-key sequences (press and release first combo, then second key)
      'ctrl+shift f': { type: 'insert', text: '\\frac{}{}' },
      'ctrl+shift r': { type: 'insert', text: '\\sqrt{}' },
      'ctrl+shift i': { type: 'insert', text: '\\int_{}^{}' },
      'ctrl+l \\': { type: 'insert', text: '\\' },
      'ctrl+l a': { type: 'insert', text: '\\alpha' },
      'ctrl+l b': { type: 'insert', text: '\\beta' },
      'ctrl+l g': { type: 'insert', text: '\\gamma' },
      'ctrl+l d': { type: 'insert', text: '\\delta' },
      'ctrl+l e': { type: 'insert', text: '\\epsilon' },
      'ctrl+l l': { type: 'insert', text: '\\lambda' },
      'ctrl+l m': { type: 'insert', text: '\\mu' },
      'ctrl+l p': { type: 'insert', text: '\\pi' },
      'ctrl+l s': { type: 'insert', text: '\\sigma' },
      'ctrl+l t': { type: 'insert', text: '\\theta' }
    };

    // Add Mac-specific mappings based on preference
    if (isMac) {
      if (this.macMMapping === 'meta') {
        // Add Command key mappings when preference is set to meta
        defaultMappings['meta+m'] = { type: 'wrap', before: '$', after: '$' };
        defaultMappings['meta+b'] = { type: 'wrap', before: '**', after: '**' };
        console.log('🍎 Added Mac Command key mappings');
      }
    }
    
    this.mappings = new Map(Object.entries(defaultMappings));
    console.log(`✅ Test handler initialized with ${this.mappings.size} default mappings`);
    console.log('🗂️ Available mappings:', Array.from(this.mappings.keys()));
  }
  
  loadPreferences() {
    // Try to load preferences from extension storage if available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['macMMapping', 'sequenceTimeout'], (result) => {
        if (result.macMMapping) {
          this.macMMapping = result.macMMapping;
          console.log(`📱 Mac M- mapping preference: ${this.macMMapping}`);
          // Rebuild mappings with new preference
          this.setupDefaultMappings();
        }
        
        if (result.sequenceTimeout) {
          this.sequenceTimeoutDuration = result.sequenceTimeout;
          console.log(`⏱️ Sequence timeout: ${this.sequenceTimeoutDuration}ms`);
        }
      });
    }
  }
  
  setupEventListeners() {
    console.log('🎯 Test handler: Setting up event listeners...');
    document.addEventListener('keydown', (e) => {
      console.log('🔑 Test handler: Keydown detected:', {
        key: e.key,
        code: e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        target: e.target.tagName + (e.target.type ? `[${e.target.type}]` : '')
      });
      this.handleKeyDown(e);
    }, true);
    
    document.addEventListener('keyup', (e) => {
      this.handleKeyUp(e);
    }, true);
    
    console.log('✅ Test handler: Event listeners set up');
  }
  
  handleKeyDown(e) {
    if (!this.enabled) {
      console.log('❌ Test handler: Disabled, ignoring keydown');
      return;
    }

    if (!this.isEditableElement(e.target)) {
      console.log('❌ Test handler: Not in editable element, ignoring keydown');
      return;
    }

    // Check if this is a modifier-only press that could start a sequence
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      this.trackModifierCombo(e);
      return;
    }

    const keyCombo = this.getKeyCombo(e);
    if (!keyCombo) {
      console.log('❌ Test handler: No key combo generated');
      return;
    }

    console.log(`🔍 Test handler: Processing key combo: "${keyCombo}"`);
    
    // If we have a pending modifier combo, combine it with this key
    if (this.lastModifierCombo) {
      const sequenceCombo = `${this.lastModifierCombo} ${keyCombo}`;
      console.log(`🔗 Test handler: Combining with previous modifier: "${sequenceCombo}"`);
      
      this.keySequence = [sequenceCombo]; // Replace sequence with combined combo
      this.lastModifierCombo = null;
      
      if (this.modifierReleaseTimeout) {
        clearTimeout(this.modifierReleaseTimeout);
        this.modifierReleaseTimeout = null;
      }
    } else {
      this.keySequence.push(keyCombo);
    }
    
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }

    const fullSequence = this.keySequence.join(' ');
    console.log(`🎯 Test handler: Full sequence: "${fullSequence}"`);
    
    const action = this.mappings.get(fullSequence);
    console.log(`🎬 Test handler: Action found:`, action);

    if (action) {
      console.log(`✅ Test handler: Executing action for "${fullSequence}":`, action);
      
      // IMPORTANT: Prevent system shortcuts BEFORE they happen
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      this.executeAction(action, e.target);
      this.clearSequence();
      
      // Update UI to show action executed
      this.showActionFeedback(fullSequence, action);
    } else if (this.hasPartialMatch(fullSequence)) {
      console.log(`🔄 Test handler: Partial match for "${fullSequence}", waiting for more keys...`);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Set timeout to clear sequence if no more keys come
      this.sequenceTimeout = setTimeout(() => {
        console.log(`⏰ Test handler: Sequence timeout for "${fullSequence}"`);
        this.clearSequence();
      }, this.sequenceTimeoutDuration);
      
      // Show visual feedback that we're waiting for more keys
      this.showSequenceFeedback(fullSequence);
    } else {
      console.log(`❌ Test handler: No match for "${fullSequence}"`);
      this.clearSequence();
    }
  }
  
  handleKeyUp(e) {
    // When all modifiers are released, check if we should start waiting for sequence
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      // Small delay to see if we should treat this as a sequence starter
      setTimeout(() => {
        if (this.lastModifierCombo && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
          console.log(`🔄 Test handler: Modifier combo "${this.lastModifierCombo}" released, waiting for next key...`);
          this.showSequenceFeedback(this.lastModifierCombo);
          
          // Set timeout to clear if no key follows
          this.modifierReleaseTimeout = setTimeout(() => {
            console.log(`⏰ Test handler: Modifier sequence timeout for "${this.lastModifierCombo}"`);
            this.lastModifierCombo = null;
            this.clearSequence();
          }, this.sequenceTimeoutDuration);
        }
      }, 10);
    }
  }
  
  trackModifierCombo(e) {
    // Build modifier combination
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');
    
    if (parts.length > 1) {
      const combo = parts.join('+');
      console.log(`🔑 Test handler: Tracking modifier combo: "${combo}"`);
      this.lastModifierCombo = combo;
    }
  }
  
  getKeyCombo(e) {
    const parts = [];
    
    // Mac Option key handling
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');

    let key = e.key.toLowerCase();
    
    // Mac Option key fix for special characters
    if (isMac && e.altKey && !e.ctrlKey && !e.metaKey) {
      const codeToKey = {
        'KeyM': 'm', 'KeyG': 'g', 'KeyP': 'p', 'KeyL': 'l', 'KeyS': 's'
      };
      
      if (codeToKey[e.code]) {
        key = codeToKey[e.code];
        console.log(`🍎 Mac Option key fix: Using "${key}" instead of "${e.key}"`);
      }
    }
    
    // Skip modifier-only presses (handled separately now)
    if (['control', 'alt', 'shift', 'meta'].includes(key)) {
      return null;
    }

    parts.push(key);
    const combo = parts.join('+');
    console.log(`🔑 Test handler: Generated combo: "${combo}"`);
    return combo;
  }
  
  executeAction(action, element) {
    console.log(`🚀 Test handler: Executing action:`, action, 'on element:', element.tagName);
    
    try {
      switch (action.type) {
        case 'insert':
          console.log(`📝 Test handler: Inserting text: "${action.text}"`);
          this.insertText(action.text, element);
          break;
        case 'wrap':
          console.log(`🎁 Test handler: Wrapping with: "${action.before}" ... "${action.after}"`);
          this.wrapSelection(action.before, action.after, element);
          break;
        default:
          console.warn('❓ Test handler: Unknown action type:', action.type);
      }
      console.log(`✅ Test handler: Action completed successfully`);
    } catch (error) {
      console.error('❌ Test handler: Error executing action:', error);
    }
  }
  
  insertText(text, element) {
    if (!this.isEditableElement(element)) {
      console.warn('❌ Test handler: Element not editable');
      return;
    }

    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const value = element.value || '';

      const newValue = value.slice(0, start) + text + value.slice(end);
      element.value = newValue;

      const newCursorPos = start + text.length;
      element.setSelectionRange(newCursorPos, newCursorPos);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log(`✅ Test handler: Text "${text}" inserted successfully`);
    } else if (element.isContentEditable) {
      // Handle content editable elements
      document.execCommand('insertText', false, text);
      console.log(`✅ Test handler: Text "${text}" inserted in contentEditable`);
    }
  }
  
  wrapSelection(before, after, element) {
    if (!this.isEditableElement(element)) {
      console.warn('❌ Test handler: Element not editable');
      return;
    }

    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const value = element.value || '';
      const selectedText = value.slice(start, end);

      const wrappedText = before + selectedText + after;
      const newValue = value.slice(0, start) + wrappedText + value.slice(end);
      element.value = newValue;

      // Select the content between the wrappers
      const newStart = start + before.length;
      const newEnd = newStart + selectedText.length;
      element.setSelectionRange(newStart, newEnd);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      console.log(`✅ Test handler: Text wrapped with "${before}" ... "${after}"`);
    } else if (element.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        const wrappedText = before + selectedText + after;
        
        range.deleteContents();
        range.insertNode(document.createTextNode(wrappedText));
        
        console.log(`✅ Test handler: ContentEditable wrapped with "${before}" ... "${after}"`);
      }
    }
  }
  
  showActionFeedback(sequence, action) {
    // Create a temporary feedback element
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4ade80;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    `;
    
    const actionDesc = action.type === 'insert' ? 
      `Inserted: ${action.text}` : 
      `Wrapped with: ${action.before}...${action.after}`;
    
    feedback.textContent = `${sequence} → ${actionDesc}`;
    document.body.appendChild(feedback);
    
    // Animate and remove
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translateY(-10px)';
      setTimeout(() => feedback.remove(), 300);
    }, 2000);
  }
  
  showSequenceFeedback(partialSequence) {
    // Remove any existing sequence feedback
    const existing = document.getElementById('sequence-feedback');
    if (existing) existing.remove();
    
    // Create sequence feedback element
    const feedback = document.createElement('div');
    feedback.id = 'sequence-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background: #f59e0b;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      animation: pulse 1s infinite;
    `;
    
    // Add CSS animation
    if (!document.getElementById('sequence-css')) {
      const style = document.createElement('style');
      style.id = 'sequence-css';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `;
      document.head.appendChild(style);
    }
    
    feedback.textContent = `${partialSequence}... (waiting for next key)`;
    document.body.appendChild(feedback);
  }
  
  hasPartialMatch(sequence) {
    // Check if any mapping starts with this sequence followed by a space
    for (const key of this.mappings.keys()) {
      if (key.startsWith(sequence + ' ')) {
        console.log(`🔍 Partial match found: "${sequence}" matches start of "${key}"`);
        return true;
      }
    }
    return false;
  }
  
  clearSequence() {
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
    
    // Clear sequence feedback
    const feedback = document.getElementById('sequence-feedback');
    if (feedback) feedback.remove();
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

// Initialize the test handler
console.log('🎬 Starting standalone test LyX handler...');

// Wait for DOM to be ready
function initStandaloneTest() {
  window.standaloneTestHandler = new TestLyXHotkeyHandler();
  
  // Add a status indicator to the page
  const statusDiv = document.createElement('div');
  statusDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: #3b82f6;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  `;
  statusDiv.textContent = '🧪 Standalone LyX Test Mode Active';
  document.body.appendChild(statusDiv);
  
  console.log('✅ Standalone test mode initialized successfully');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStandaloneTest);
} else {
  initStandaloneTest();
}
