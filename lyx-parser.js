/**
 * LyX Hotkey Configuration Parser
 * Parses LyX .bind files and extracts hotkey mappings
 */

class LyXConfigParser {
  constructor() {
    this.bindings = new Map();
    this.keySequences = new Map();
  }

  /**
   * Parse a LyX .bind file content
   * @param {string} content - The content of the .bind file
   * @param {Object} options - Parsing options
   * @returns {Map} - Map of key sequences to commands
   */
  parse(content, options = {}) {
    const lines = content.split('\n');
    this.bindings.clear();
    this.keySequences.clear();
    this.options = options; // Store options for use in parseBind

    for (let line of lines) {
      line = line.trim();
      
      // Skip comments and empty lines
      if (line.startsWith('#') || line.startsWith('Format') || !line || 
          line.startsWith('\\bind_file')) {
        continue;
      }

      // Parse \bind statements
      if (line.startsWith('\\bind ')) {
        this.parseBind(line);
      }
    }

    return this.keySequences;
  }

  /**
   * Parse a single \bind statement
   * @param {string} line - The bind line to parse
   */
  parseBind(line) {
    // Extract key sequence and command from \bind "key" "command"
    const match = line.match(/\\bind\s+"([^"]+)"\s+"([^"]+)"/);
    if (!match) return;

    const [, keySequence, command] = match;
    const normalizedKey = this.normalizeKeySequence(keySequence, this.options || {});
    
    // Convert LyX command to appropriate action
    const action = this.convertCommand(command);
    if (action) {
      this.keySequences.set(normalizedKey, action);
    }
  }

  /**
   * Normalize key sequence from LyX format to browser format
   * @param {string} sequence - LyX key sequence
   * @param {Object} options - Options for key mapping
   * @returns {string} - Normalized key sequence
   */
  normalizeKeySequence(sequence, options = {}) {
    // Detect platform for proper key mapping
    const isMac = typeof navigator !== 'undefined' && 
                  navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Options for Mac key handling
    const macOptions = {
      overrideSystemShortcuts: options.overrideSystemShortcuts !== false, // Default true
      mapMetaToCtrl: options.mapMetaToCtrl !== false, // Default true for practicality
      ...options
    };
    
    // LyX uses: C- (Ctrl), M- (Alt/Meta), S- (Shift), A- (Alt)
    // Convert to standard format - handle M- and A- BEFORE toLowerCase()
    let normalized = sequence
      .replace(/C-/g, 'ctrl+')
      .replace(/S-/g, 'shift+')
      .replace(/~S-/g, ''); // ~S- means "not shift"

    // Handle M- and A- based on platform and options BEFORE toLowerCase
    if (isMac) {
      if (macOptions.mapMetaToCtrl) {
        // On Mac: Map M- to Ctrl instead of Meta for practicality
        // This avoids conflicts with system shortcuts like Cmd+M (minimize)
        console.log(`🔧 LyX Parser: Mac M- mapping to Ctrl (mapMetaToCtrl=true)`);
        normalized = normalized
          .replace(/M-/g, 'ctrl+')
          .replace(/A-/g, 'alt+');
      } else {
        // Use original Mac mapping (Meta = Cmd key)
        console.log(`🔧 LyX Parser: Mac M- mapping to Meta (mapMetaToCtrl=false)`);
        normalized = normalized
          .replace(/M-/g, 'meta+')
          .replace(/A-/g, 'alt+');
      }
    } else {
      // On other platforms: M- typically means Alt, A- also means Alt
      console.log(`🔧 LyX Parser: Non-Mac M- mapping to Alt`);
      normalized = normalized
        .replace(/M-/g, 'alt+')
        .replace(/A-/g, 'alt+');
    }

    // Now apply toLowerCase and other transformations
    normalized = normalized
      .toLowerCase()
      .replace(/\+([a-z])$/, '+$1') // Ensure lowercase for single chars
      .replace(/return/g, 'enter')
      .replace(/backspace/g, 'backspace')
      .replace(/delete/g, 'delete')
      .replace(/space/g, 'space')
      .replace(/tab/g, 'tab')
      .replace(/escape/g, 'escape')
      .replace(/prior/g, 'pageup')
      .replace(/next/g, 'pagedown')
      .replace(/home/g, 'home')
      .replace(/end/g, 'end')
      .replace(/left/g, 'arrowleft')
      .replace(/right/g, 'arrowright')
      .replace(/up/g, 'arrowup')
      .replace(/down/g, 'arrowdown');
    
    return normalized;
  }

  /**
   * Convert LyX command to extension action
   * @param {string} command - LyX command
   * @returns {Object|null} - Action object or null if not supported
   */
  convertCommand(command) {
    // Handle math-insert commands specially
    if (command.startsWith('math-insert ')) {
      const mathContent = command.substring('math-insert '.length);
      return { type: 'insert', text: mathContent };
    }
    
    const commandMappings = {
      // Text formatting
      'font-bold': { type: 'wrap', before: '**', after: '**' },
      'font-emph': { type: 'wrap', before: '*', after: '*' },
      'font-underline': { type: 'wrap', before: '_', after: '_' },
      'font-typewriter': { type: 'wrap', before: '`', after: '`' },
      'font-strikeout': { type: 'wrap', before: '~~', after: '~~' },
      
      // Math mode
      'math-mode': { type: 'wrap', before: '$', after: '$' },
      'math-display': { type: 'wrap', before: '$$\n', after: '\n$$' },
      
      // Text insertion
      'quote-insert inner': { type: 'insert', text: '"' },
      'quote-insert outer auto plain': { type: 'insert', text: '\'' },
      'specialchar-insert hyphenation': { type: 'insert', text: '\u00AD' },
      'specialchar-insert nobreakdash': { type: 'insert', text: '\u2011' },
      'specialchar-insert ligature-break': { type: 'insert', text: '\u200C' },
      'specialchar-insert slash': { type: 'insert', text: '/' },
      'specialchar-insert end-of-sentence': { type: 'insert', text: '. ' },
      'specialchar-insert dots': { type: 'insert', text: '…' },
      'space-insert protected': { type: 'insert', text: '\u00A0' },
      'space-insert normal': { type: 'insert', text: ' ' },
      'space-insert thin': { type: 'insert', text: '\u2009' },
      
      // LaTeX specific
      'ert-insert': { type: 'wrap', before: '\\', after: '' },
      'paragraph-break': { type: 'insert', text: '\n\n' },
      'paragraph-break inverse': { type: 'insert', text: '\n' },
      'newline-insert newline': { type: 'insert', text: '\n' },
      'newline-insert linebreak': { type: 'insert', text: '\\\\\n' },
      
      // Navigation and selection (these would need special handling)
      'char-forward': { type: 'navigation', action: 'moveRight' },
      'char-backward': { type: 'navigation', action: 'moveLeft' },
      'word-right': { type: 'navigation', action: 'moveWordRight' },
      'word-left': { type: 'navigation', action: 'moveWordLeft' },
      'line-begin': { type: 'navigation', action: 'moveLineStart' },
      'line-end': { type: 'navigation', action: 'moveLineEnd' },
      'buffer-begin': { type: 'navigation', action: 'moveDocumentStart' },
      'buffer-end': { type: 'navigation', action: 'moveDocumentEnd' },
      
      // Selection variants
      'char-right-select': { type: 'selection', action: 'selectRight' },
      'char-left-select': { type: 'selection', action: 'selectLeft' },
      'word-right-select': { type: 'selection', action: 'selectWordRight' },
      'word-left-select': { type: 'selection', action: 'selectWordLeft' },
      'line-begin-select': { type: 'selection', action: 'selectLineStart' },
      'line-end-select': { type: 'selection', action: 'selectLineEnd' },
      'buffer-begin-select': { type: 'selection', action: 'selectDocumentStart' },
      'buffer-end-select': { type: 'selection', action: 'selectDocumentEnd' },
      
      // Deletion
      'char-delete-forward': { type: 'delete', action: 'deleteRight' },
      'char-delete-backward': { type: 'delete', action: 'deleteLeft' },
      'word-delete-forward': { type: 'delete', action: 'deleteWordRight' },
      'word-delete-backward': { type: 'delete', action: 'deleteWordLeft' },
      'line-delete-forward': { type: 'delete', action: 'deleteLineForward' },
      
      // Clipboard
      'copy': { type: 'clipboard', action: 'copy' },
      'paste': { type: 'clipboard', action: 'paste' },
      'cut': { type: 'clipboard', action: 'cut' },
      
      // Undo/Redo
      'undo': { type: 'edit', action: 'undo' },
      'redo': { type: 'edit', action: 'redo' }
    };

    return commandMappings[command] || null;
  }

  /**
   * Get sample LaTeX insertions for common math commands
   */
  getLatexInsertions() {
    return new Map([
      ['ctrl+shift+f', { type: 'insert', text: '\\frac{}{}' }],
      ['ctrl+shift+s', { type: 'insert', text: '\\sqrt{}' }],
      ['ctrl+shift+i', { type: 'insert', text: '\\int_{}^{}' }],
      ['ctrl+shift+sum', { type: 'insert', text: '\\sum_{}^{}' }],
      ['alt+g', { type: 'insert', text: '\\alpha' }],
      ['alt+b', { type: 'insert', text: '\\beta' }],
      ['alt+d', { type: 'insert', text: '\\delta' }],
      ['alt+l', { type: 'insert', text: '\\lambda' }],
      ['alt+m', { type: 'insert', text: '\\mu' }],
      ['alt+p', { type: 'insert', text: '\\pi' }],
      ['alt+s', { type: 'insert', text: '\\sigma' }],
      ['alt+t', { type: 'insert', text: '\\theta' }]
    ]);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LyXConfigParser;
} else if (typeof window !== 'undefined') {
  window.LyXConfigParser = LyXConfigParser;
}
