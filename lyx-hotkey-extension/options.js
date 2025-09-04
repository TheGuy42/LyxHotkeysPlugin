/**
 * Refactored Options Page Script for LyX Hotkey Extension
 * Uses modular architecture for better maintainability
 */

class LyXOptionsPage {
  constructor() {
    this.eventManager = new EventManager();
    this.currentMappings = new Map();
    this.settings = {
      macMMapping: 'ctrl',
      sequenceTimeout: 1000
    };
    
    // UI Elements
    this.elements = {};
    
    this.initialize();
  }

  /**
   * Initialize the options page
   */
  async initialize() {
    console.log('🔧 LyX Options: Initializing...');
    
    try {
      // Get UI elements
      this.getUIElements();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load current configuration
      await this.loadCurrentConfiguration();
      
      // Setup platform-specific features
      this.setupPlatformFeatures();
      
      console.log('✅ LyX Options: Initialization completed');
      
    } catch (error) {
      console.error('❌ LyX Options: Initialization failed:', error);
      this.showStatus('Initialization failed', 'error');
    }
  }

  /**
   * Get UI elements
   */
  getUIElements() {
    this.elements = {
      uploadArea: document.getElementById('uploadArea'),
      fileInput: document.getElementById('fileInput'),
      configTextarea: document.getElementById('configTextarea'),
      statusMessage: document.getElementById('statusMessage'),
      hotkeyList: document.getElementById('hotkeyList'),
      macKeyNote: document.getElementById('macKeyNote'),
      
      // Buttons
      browseButton: document.getElementById('browseButton'),
      loadSampleButton: document.getElementById('loadSampleButton'),
      exportButton: document.getElementById('exportButton'),
      saveButton: document.getElementById('saveButton'),
      resetButton: document.getElementById('resetButton'),
      clearButton: document.getElementById('clearButton'),
      
      // Settings
      sequenceTimeoutSlider: document.getElementById('sequenceTimeout'),
      timeoutValueDisplay: document.getElementById('timeoutValue')
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // File upload listeners
    this.setupFileUploadListeners();
    
    // Button listeners
    this.setupButtonListeners();
    
    // Settings listeners
    this.setupSettingsListeners();
  }

  /**
   * Setup file upload listeners
   */
  setupFileUploadListeners() {
    const { uploadArea, fileInput } = this.elements;
    
    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', () => fileInput.click());
      uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
      uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
      
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }

  /**
   * Setup button listeners
   */
  setupButtonListeners() {
    const buttonActions = {
      browseButton: () => this.elements.fileInput?.click(),
      loadSampleButton: () => this.loadSampleConfig(),
      exportButton: () => this.exportCurrentConfig(),
      saveButton: () => this.saveConfiguration(),
      resetButton: () => this.resetToDefaults(),
      clearButton: () => this.clearAllConfig()
    };

    Object.entries(buttonActions).forEach(([elementId, action]) => {
      const element = this.elements[elementId];
      if (element) {
        element.addEventListener('click', action);
      }
    });
  }

  /**
   * Setup settings listeners
   */
  setupSettingsListeners() {
    // Mac key mapping preference
    const macMappingRadios = document.querySelectorAll('input[name="macMMapping"]');
    macMappingRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.updateMacKeyPreference(radio.value);
        }
      });
    });

    // Sequence timeout slider
    const { sequenceTimeoutSlider, timeoutValueDisplay } = this.elements;
    if (sequenceTimeoutSlider && timeoutValueDisplay) {
      sequenceTimeoutSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        timeoutValueDisplay.textContent = `${value}ms`;
        this.updateSequenceTimeout(value);
      });
    }
  }

  /**
   * Setup platform-specific features
   */
  setupPlatformFeatures() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Show/hide Mac note
    if (this.elements.macKeyNote && !isMac) {
      this.elements.macKeyNote.style.display = 'none';
    }
  }

  /**
   * Load current configuration
   */
  async loadCurrentConfiguration() {
    try {
      const response = await this.eventManager.sendMessage({ action: 'getState' });
      
      if (response) {
        // Load settings
        if (response.settings) {
          this.settings = { ...this.settings, ...response.settings };
          this.updateUIFromSettings();
        }
        
        // Load mappings
        if (response.mappings) {
          this.currentMappings = new Map(Object.entries(response.mappings));
          await this.displayHotkeyList();
        }
        
        // Try to get config text from storage
        const result = await this.getFromStorage(['config']);
        if (result.config && this.elements.configTextarea) {
          this.elements.configTextarea.value = result.config;
        }
      }
      
      console.log('✅ LyX Options: Configuration loaded successfully');
      
    } catch (error) {
      console.error('❌ LyX Options: Error loading configuration:', error);
      this.showStatus('Error loading current configuration', 'error');
    }
  }

  /**
   * Update UI from current settings
   */
  updateUIFromSettings() {
    // Update Mac key preference radio
    const macRadio = document.querySelector(`input[name="macMMapping"][value="${this.settings.macMMapping}"]`);
    if (macRadio) {
      macRadio.checked = true;
    }
    
    // Update sequence timeout slider
    const { sequenceTimeoutSlider, timeoutValueDisplay } = this.elements;
    if (sequenceTimeoutSlider && timeoutValueDisplay) {
      sequenceTimeoutSlider.value = this.settings.sequenceTimeout;
      timeoutValueDisplay.textContent = `${this.settings.sequenceTimeout}ms`;
    }
  }

  // File handling methods

  handleDragOver(event) {
    event.preventDefault();
    this.elements.uploadArea?.classList.add('dragover');
  }

  handleDragLeave(event) {
    event.preventDefault();
    this.elements.uploadArea?.classList.remove('dragover');
  }

  handleDrop(event) {
    event.preventDefault();
    this.elements.uploadArea?.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  handleFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  async processFile(file) {
    if (!file.name.endsWith('.bind') && !file.name.endsWith('.txt')) {
      this.showStatus('Please select a .bind or .txt file', 'error');
      return;
    }

    try {
      const content = await this.readFile(file);
      if (this.elements.configTextarea) {
        this.elements.configTextarea.value = content;
      }
      this.showStatus(`Loaded file: ${file.name}`, 'success');
      await this.parseAndDisplayConfig(content);
    } catch (error) {
      this.showStatus('Error reading file', 'error');
    }
  }

  /**
   * Read file content as text
   * @param {File} file - File to read
   * @returns {Promise<string>} - File content
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Configuration methods

  async parseAndDisplayConfig(configText) {
    try {
      const parser = new LyXConfigParser();
      
      const options = {
        mapMetaToCtrl: this.settings.macMMapping === 'ctrl'
      };
      
      console.log(`🔧 Parsing config with options:`, options);
      const mappings = parser.parse(configText, options);
      
      this.currentMappings = mappings;
      await this.displayHotkeyList();
      this.showStatus(`Parsed ${mappings.size} hotkey mappings`, 'success');
      
    } catch (error) {
      console.error('Error parsing configuration:', error);
      this.showStatus('Error parsing configuration: ' + error.message, 'error');
    }
  }

  async displayHotkeyList() {
    const { hotkeyList } = this.elements;
    if (!hotkeyList) return;
    
    if (this.currentMappings.size === 0) {
      hotkeyList.innerHTML = '<p style="text-align: center; color: #718096; margin: 20px 0;">No hotkeys configured</p>';
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    let html = '';
    for (const [key, action] of this.currentMappings) {
      const displayKey = this.formatKeyForDisplay(key, isMac);
      const isSequence = key.includes(' ');
      const sequenceClass = isSequence ? ' sequence' : '';
      
      html += `
        <div class="hotkey-item${sequenceClass}">
          <span class="hotkey-key">${displayKey}</span>
          <span class="hotkey-action">${this.getActionDescription(action)}</span>
        </div>
      `;
    }
    
    hotkeyList.innerHTML = html;
  }

  formatKeyForDisplay(key, isMac) {
    if (!isMac) return key;
    
    const isSequence = key.includes(' ');
    
    if (isSequence) {
      const parts = key.split(' ');
      const formattedParts = parts.map(part => this.formatSingleKey(part, isMac));
      return formattedParts.join(' → ');
    } else {
      return this.formatSingleKey(key, isMac);
    }
  }

  formatSingleKey(key, isMac) {
    let formatted;
    
    if (this.settings.macMMapping === 'meta') {
      formatted = key
        .replace(/ctrl\+/gi, '⌃')
        .replace(/meta\+/gi, '⌘')
        .replace(/alt\+/gi, '⌥')
        .replace(/shift\+/gi, '⇧');
    } else {
      formatted = key
        .replace(/ctrl\+/gi, '⌃')
        .replace(/meta\+/gi, '⌃')
        .replace(/alt\+/gi, '⌥')
        .replace(/shift\+/gi, '⇧');
    }
    
    // Format special keys
    formatted = formatted
      .replace(/arrowright/gi, '→')
      .replace(/arrowleft/gi, '←')
      .replace(/arrowup/gi, '↑')
      .replace(/arrowdown/gi, '↓')
      .replace(/enter/gi, '⏎')
      .replace(/backspace/gi, '⌫')
      .replace(/space/gi, '␣')
      .replace(/delete/gi, '⌦')
      .replace(/period/gi, '.');
    
    // Clean up and uppercase final key
    formatted = formatted
      .replace(/\s+$/, '')
      .replace(/\+$/, '')
      .trim();
    
    formatted = formatted.replace(/([a-z])$/i, (match) => match.toUpperCase());
    
    return formatted;
  }

  getActionDescription(action) {
    switch (action.type) {
      case 'insert':
        return `Insert: "${action.text}"`;
      case 'wrap':
        return `Wrap with: "${action.before}" ... "${action.after}"`;
      case 'navigation':
        return `Navigate: ${action.action}`;
      case 'selection':
        return `Select: ${action.action}`;
      case 'delete':
        return `Delete: ${action.action}`;
      case 'clipboard':
        return `Clipboard: ${action.action}`;
      case 'edit':
        return `Edit: ${action.action}`;
      default:
        return 'Unknown action';
    }
  }

  // Sample configuration

  async loadSampleConfig() {
    const sampleConfig = `# Sample LyX Hotkey Configuration
# Text formatting
\\bind "C-b" "font-bold"
\\bind "C-e" "font-emph"
\\bind "C-u" "font-underline"
\\bind "C-S-P" "font-typewriter"

# Math mode
\\bind "C-m" "math-mode"
\\bind "C-S-M" "math-display"

# LaTeX commands
\\bind "C-l" "ert-insert"
\\bind "C-S-F" "math-insert \\\\frac"
\\bind "C-S-R" "math-insert \\\\sqrt"

# Greek letters
\\bind "A-g" "math-insert \\\\alpha"
\\bind "A-b" "math-insert \\\\beta"
\\bind "A-d" "math-insert \\\\delta"
\\bind "A-l" "math-insert \\\\lambda"
\\bind "A-p" "math-insert \\\\pi"
\\bind "A-s" "math-insert \\\\sigma"
\\bind "A-t" "math-insert \\\\theta"

# Special characters
\\bind "A-space" "space-insert protected"
\\bind "C-period" "specialchar-insert end-of-sentence"
\\bind "M-period" "specialchar-insert dots"`;

    if (this.elements.configTextarea) {
      this.elements.configTextarea.value = sampleConfig;
    }
    this.showStatus('Sample configuration loaded', 'info');
    await this.parseAndDisplayConfig(sampleConfig);
  }

  // Save and export methods

  async saveConfiguration() {
    const configText = this.elements.configTextarea?.value.trim() || '';
    
    if (!configText) {
      this.showStatus('Please enter a configuration', 'error');
      return;
    }

    try {
      await this.parseAndDisplayConfig(configText);
      
      const mappingsObj = Object.fromEntries(this.currentMappings);
      
      // Save to storage
      await this.saveToStorage({
        config: configText,
        hotkeyMappings: mappingsObj
      });
      
      // Notify background script
      await this.eventManager.sendMessage({
        action: 'updateMappings',
        mappings: mappingsObj
      });
      
      this.showStatus('Configuration saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      this.showStatus('Error saving configuration: ' + error.message, 'error');
    }
  }

  exportCurrentConfig() {
    const configText = this.elements.configTextarea?.value || '';
    
    if (!configText.trim()) {
      this.showStatus('No configuration to export', 'error');
      return;
    }

    const blob = new Blob([configText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lyx-hotkeys.bind';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    this.showStatus('Configuration exported successfully', 'success');
  }

  async resetToDefaults() {
    if (!confirm('Are you sure you want to reset to default configuration? This will overwrite your current settings.')) {
      return;
    }

    try {
      await this.eventManager.sendMessage({ 
        action: 'loadConfig', 
        configText: '' 
      });
      
      await this.loadCurrentConfiguration();
      this.showStatus('Reset to default configuration', 'success');
      
    } catch (error) {
      console.error('Error resetting configuration:', error);
      this.showStatus('Error resetting configuration: ' + error.message, 'error');
    }
  }

  async clearAllConfig() {
    if (!confirm('Are you sure you want to clear all hotkey configurations? This cannot be undone.')) {
      return;
    }

    try {
      await this.saveToStorage({
        config: '',
        hotkeyMappings: {}
      });
      
      await this.eventManager.sendMessage({
        action: 'updateMappings',
        mappings: {}
      });
      
      if (this.elements.configTextarea) {
        this.elements.configTextarea.value = '';
      }
      this.currentMappings.clear();
      await this.displayHotkeyList();
      
      this.showStatus('All configurations cleared', 'info');
      
    } catch (error) {
      console.error('Error clearing configuration:', error);
      this.showStatus('Error clearing configuration: ' + error.message, 'error');
    }
  }

  // Settings methods

  async updateMacKeyPreference(preference) {
    try {
      this.settings.macMMapping = preference;
      
      await this.eventManager.sendMessage({
        action: 'updateSettings',
        settings: { macMMapping: preference }
      });
      
      this.showStatus(`Mac key mapping preference saved: ${preference === 'ctrl' ? 'Ctrl' : 'Command'}`, 'success');
      
      // Reparse current config if available
      const configText = this.elements.configTextarea?.value;
      if (configText?.trim()) {
        await this.parseAndDisplayConfig(configText);
      }
      
    } catch (error) {
      console.error('Error saving Mac key preference:', error);
      this.showStatus('Error saving preference', 'error');
    }
  }

  async updateSequenceTimeout(timeout) {
    try {
      this.settings.sequenceTimeout = timeout;
      
      await this.eventManager.sendMessage({
        action: 'updateSequenceTimeout',
        timeout: timeout
      });
      
      console.log(`Sequence timeout updated: ${timeout}ms`);
      
    } catch (error) {
      console.error('Error saving sequence timeout:', error);
      this.showStatus('Error saving timeout setting', 'error');
    }
  }

  // Utility methods

  showStatus(message, type) {
    const { statusMessage } = this.elements;
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.classList.remove('hidden');
    
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }

  async getFromStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  async saveToStorage(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.lyxOptionsPage = new LyXOptionsPage();
});
