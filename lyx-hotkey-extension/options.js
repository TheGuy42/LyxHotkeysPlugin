/**
 * Options Page Script for LyX Hotkey Extension
 * Refactored to use modular architecture with proper separation of concerns
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for modules to be available
  while (typeof LyXLogger === 'undefined' || typeof LyXUIUtils === 'undefined') {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const logger = LyXLogger.getLogger('Options');
  const uiUtils = LyXUIUtils.getUIUtils(logger);
  
  logger.info('Options page initializing...');
  
  // Initialize options controller
  const optionsController = new OptionsController(logger, uiUtils);
  await optionsController.initialize();
  
  logger.info('Options page initialized successfully');
});

/**
 * Options Controller class to manage the options page
 */
class OptionsController {
  constructor(logger, uiUtils) {
    this.logger = logger;
    this.uiUtils = uiUtils;
    this.currentMappings = new Map();
    this.configParser = null;
    this.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  /**
   * Initialize the options controller
   */
  async initialize() {
    try {
      // Initialize config parser
      this.configParser = new LyXConfigParser();
      
      // Get DOM elements
      this.elements = this.getElements();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load current configuration
      await this.loadCurrentConfig();
      
      // Set up platform-specific features
      this.setupPlatformFeatures();
      
      // Load preferences
      await this.loadPreferences();
      
      this.logger.debug('Options controller initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize options:', error);
      this.uiUtils.showStatus('Failed to initialize options page', 'error');
    }
  }

  /**
   * Get required DOM elements
   */
  getElements() {
    try {
      return {
        // File upload
        uploadArea: this.uiUtils.getElementById('uploadArea'),
        fileInput: this.uiUtils.getElementById('fileInput'),
        browseButton: this.uiUtils.getElementById('browseButton'),
        
        // Config textarea
        configTextarea: this.uiUtils.getElementById('configTextarea'),
        
        // Buttons
        loadSampleButton: this.uiUtils.getElementById('loadSampleButton'),
        saveButton: this.uiUtils.getElementById('saveButton'),
        resetButton: this.uiUtils.getElementById('resetButton'),
        clearButton: this.uiUtils.getElementById('clearButton'),
        exportButton: this.uiUtils.getElementById('exportButton'),
        
        // Display
        hotkeyList: this.uiUtils.getElementById('hotkeyList'),
        statusMessage: this.uiUtils.getElementById('statusMessage', false),
        
        // Mac preferences
        macKeyNote: this.uiUtils.getElementById('macKeyNote', false),
        
        // Sequence timeout
        sequenceTimeoutSlider: this.uiUtils.getElementById('sequenceTimeout', false),
        timeoutValueDisplay: this.uiUtils.getElementById('timeoutValue', false)
      };
    } catch (error) {
      this.logger.error('Failed to get DOM elements:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // File upload
    this.setupFileUpload();
    
    // Button handlers
    this.uiUtils.addEventListener(this.elements.browseButton, 'click', () => {
      this.elements.fileInput.click();
    });
    
    this.uiUtils.addEventListener(this.elements.loadSampleButton, 'click', () => {
      this.loadSampleConfig();
    });
    
    this.uiUtils.addEventListener(this.elements.saveButton, 'click', () => {
      this.saveConfiguration();
    });
    
    this.uiUtils.addEventListener(this.elements.resetButton, 'click', () => {
      this.resetConfiguration();
    });
    
    this.uiUtils.addEventListener(this.elements.clearButton, 'click', () => {
      this.clearConfiguration();
    });
    
    this.uiUtils.addEventListener(this.elements.exportButton, 'click', () => {
      this.exportConfiguration();
    });
    
    // Config textarea changes
    this.uiUtils.addEventListener(this.elements.configTextarea, 'input', 
      this.uiUtils.debounce(() => this.parseCurrentConfig(), 500)
    );
  }

  /**
   * Set up file upload functionality
   */
  setupFileUpload() {
    // Drag and drop
    this.uiUtils.addEventListener(this.elements.uploadArea, 'dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.elements.uploadArea.classList.add('dragover');
    });
    
    this.uiUtils.addEventListener(this.elements.uploadArea, 'dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.elements.uploadArea.classList.remove('dragover');
    });
    
    this.uiUtils.addEventListener(this.elements.uploadArea, 'drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.elements.uploadArea.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        await this.handleFileUpload(files[0]);
      }
    });
    
    // File input change
    this.uiUtils.addEventListener(this.elements.fileInput, 'change', async (e) => {
      if (e.target.files.length > 0) {
        await this.handleFileUpload(e.target.files[0]);
      }
    });
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(file) {
    try {
      const fileData = await this.uiUtils.handleFileUpload(
        { files: [file] }, 
        {
          maxSize: 1024 * 1024, // 1MB
          allowedTypes: ['text/plain', 'application/octet-stream'],
          readAs: 'text'
        }
      );
      
      this.elements.configTextarea.value = fileData.content;
      await this.parseCurrentConfig();
      
      this.uiUtils.showStatus(`File "${fileData.name}" loaded successfully`, 'success');
      this.logger.info(`Config file loaded: ${fileData.name} (${this.uiUtils.formatFileSize(fileData.size)})`);
      
    } catch (error) {
      this.logger.error('Failed to handle file upload:', error);
      this.uiUtils.showStatus(`Failed to load file: ${error.message}`, 'error');
    }
  }

  /**
   * Load sample configuration
   */
  loadSampleConfig() {
    const sampleConfig = `# Sample LyX Configuration
# Math mode
\\bind "C-m" "math-mode"
\\bind "C-S-m" "math-display"

# Text formatting
\\bind "C-b" "font-bold"
\\bind "C-e" "font-emph"
\\bind "C-u" "font-underline"

# Greek letters
\\bind "A-g" "math-insert \\\\alpha"
\\bind "A-p" "math-insert \\\\pi"
\\bind "A-s" "math-insert \\\\sigma"

# Special characters
\\bind "A-space" "space-insert protected"
\\bind "C-period" "specialchar-insert end-of-sentence"`;

    this.elements.configTextarea.value = sampleConfig;
    this.parseCurrentConfig();
    this.uiUtils.showStatus('Sample configuration loaded', 'success');
  }

  /**
   * Parse current configuration
   */
  async parseCurrentConfig() {
    const configText = this.elements.configTextarea.value.trim();
    
    if (!configText) {
      this.currentMappings.clear();
      this.updateHotkeyDisplay();
      return;
    }
    
    try {
      // Get Mac preference
      const macMMapping = await this.getMacKeyPreference();
      const options = {
        mapMetaToCtrl: macMMapping === 'ctrl'
      };
      
      this.logger.debug('Parsing config with options:', options);
      const mappings = this.configParser.parse(configText, options);
      
      this.currentMappings = mappings;
      this.updateHotkeyDisplay();
      
      this.logger.info(`Configuration parsed: ${mappings.size} mappings`);
      
    } catch (error) {
      this.logger.error('Failed to parse configuration:', error);
      this.uiUtils.showStatus(`Parse error: ${error.message}`, 'error');
    }
  }

  /**
   * Save configuration to extension
   */
  async saveConfiguration() {
    try {
      const configText = this.elements.configTextarea.value;
      
      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'loadConfig',
        configText: configText
      });
      
      if (response && response.success) {
        this.uiUtils.showStatus('Configuration saved successfully', 'success');
        this.logger.info('Configuration saved to extension');
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
      
    } catch (error) {
      this.logger.error('Failed to save configuration:', error);
      this.uiUtils.showStatus(`Failed to save: ${error.message}`, 'error');
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration() {
    const confirmed = await this.uiUtils.showConfirmDialog(
      'This will reset all hotkeys to their default values. Continue?',
      'Reset Configuration'
    );
    
    if (confirmed) {
      this.elements.configTextarea.value = '';
      this.currentMappings.clear();
      this.updateHotkeyDisplay();
      
      // Clear from extension
      await this.saveConfiguration();
      
      this.uiUtils.showStatus('Configuration reset to defaults', 'success');
      this.logger.info('Configuration reset');
    }
  }

  /**
   * Clear all configuration
   */
  async clearConfiguration() {
    const confirmed = await this.uiUtils.showConfirmDialog(
      'This will clear all hotkey configuration. Continue?',
      'Clear Configuration'
    );
    
    if (confirmed) {
      this.elements.configTextarea.value = '';
      this.currentMappings.clear();
      this.updateHotkeyDisplay();
      this.uiUtils.showStatus('Configuration cleared', 'success');
    }
  }

  /**
   * Export configuration to file
   */
  exportConfiguration() {
    const configText = this.elements.configTextarea.value;
    if (!configText.trim()) {
      this.uiUtils.showStatus('No configuration to export', 'warning');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substr(0, 19);
    const filename = `lyx-config-${timestamp}.bind`;
    
    this.uiUtils.downloadTextAsFile(configText, filename, 'text/plain');
    this.uiUtils.showStatus('Configuration exported', 'success');
    this.logger.info(`Configuration exported as ${filename}`);
  }

  /**
   * Update hotkey display
   */
  updateHotkeyDisplay() {
    if (!this.elements.hotkeyList) return;
    
    if (this.currentMappings.size === 0) {
      this.elements.hotkeyList.innerHTML = '<div class="no-hotkeys">No hotkeys configured</div>';
      return;
    }
    
    const hotkeyItems = Array.from(this.currentMappings.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, action]) => {
        return `
          <div class="hotkey-item">
            <div class="hotkey-key">${this.escapeHtml(key)}</div>
            <div class="hotkey-action">${this.formatActionForDisplay(action)}</div>
          </div>
        `;
      })
      .join('');
    
    this.elements.hotkeyList.innerHTML = hotkeyItems;
  }

  /**
   * Format action for display
   */
  formatActionForDisplay(action) {
    switch (action.type) {
      case 'insert':
        return `Insert: ${this.escapeHtml(action.text)}`;
      case 'wrap':
        return `Wrap: ${this.escapeHtml(action.before)}...${this.escapeHtml(action.after)}`;
      default:
        return this.escapeHtml(action.type);
    }
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set up platform-specific features
   */
  setupPlatformFeatures() {
    // Hide Mac note on non-Mac platforms
    if (!this.isMac && this.elements.macKeyNote) {
      this.elements.macKeyNote.style.display = 'none';
    }
    
    // Set up Mac key preference
    if (this.isMac) {
      this.setupMacKeyPreference();
    }
    
    // Set up sequence timeout
    this.setupSequenceTimeout();
  }

  /**
   * Set up Mac key preference handling
   */
  setupMacKeyPreference() {
    const macMappingRadios = document.querySelectorAll('input[name="macMMapping"]');
    macMappingRadios.forEach(radio => {
      this.uiUtils.addEventListener(radio, 'change', async () => {
        if (radio.checked) {
          await this.saveMacKeyPreference(radio.value);
          // Reparse current config with new preference
          if (this.currentMappings.size > 0) {
            await this.parseCurrentConfig();
          }
        }
      });
    });
  }

  /**
   * Set up sequence timeout handling
   */
  setupSequenceTimeout() {
    if (this.elements.sequenceTimeoutSlider && this.elements.timeoutValueDisplay) {
      this.uiUtils.addEventListener(this.elements.sequenceTimeoutSlider, 'input', (e) => {
        const value = e.target.value;
        this.elements.timeoutValueDisplay.textContent = `${value}ms`;
        this.saveSequenceTimeout(parseInt(value));
      });
    }
  }

  /**
   * Load current configuration from storage
   */
  async loadCurrentConfig() {
    try {
      const result = await chrome.storage.local.get(['config']);
      if (result.config) {
        this.elements.configTextarea.value = result.config;
        await this.parseCurrentConfig();
        this.logger.debug('Current config loaded from storage');
      }
    } catch (error) {
      this.logger.error('Failed to load current config:', error);
    }
  }

  /**
   * Load preferences from storage
   */
  async loadPreferences() {
    await Promise.all([
      this.loadMacKeyPreference(),
      this.loadSequenceTimeout()
    ]);
  }

  /**
   * Save Mac key preference
   */
  async saveMacKeyPreference(preference) {
    try {
      await chrome.storage.local.set({ macMMapping: preference });
      this.logger.debug(`Mac M mapping preference saved: ${preference}`);
    } catch (error) {
      this.logger.error('Failed to save Mac key preference:', error);
    }
  }

  /**
   * Load Mac key preference
   */
  async loadMacKeyPreference() {
    try {
      const result = await chrome.storage.local.get(['macMMapping']);
      const preference = result.macMMapping || 'ctrl';
      
      const radio = document.querySelector(`input[name="macMMapping"][value="${preference}"]`);
      if (radio) {
        radio.checked = true;
      }
      
      this.logger.debug(`Mac M mapping preference loaded: ${preference}`);
      return preference;
    } catch (error) {
      this.logger.error('Failed to load Mac key preference:', error);
      return 'ctrl';
    }
  }

  /**
   * Get Mac key preference
   */
  async getMacKeyPreference() {
    try {
      const result = await chrome.storage.local.get(['macMMapping']);
      return result.macMMapping || 'ctrl';
    } catch (error) {
      this.logger.error('Failed to get Mac key preference:', error);
      return 'ctrl';
    }
  }

  /**
   * Save sequence timeout
   */
  saveSequenceTimeout(timeout) {
    chrome.runtime.sendMessage({
      action: 'updateSequenceTimeout',
      timeout: timeout
    });
    this.logger.debug(`Sequence timeout saved: ${timeout}ms`);
  }

  /**
   * Load sequence timeout
   */
  async loadSequenceTimeout() {
    try {
      const result = await chrome.storage.local.get(['sequenceTimeout']);
      const timeout = result.sequenceTimeout || 1000;
      
      if (this.elements.sequenceTimeoutSlider) {
        this.elements.sequenceTimeoutSlider.value = timeout;
      }
      if (this.elements.timeoutValueDisplay) {
        this.elements.timeoutValueDisplay.textContent = `${timeout}ms`;
      }
      
      this.logger.debug(`Sequence timeout loaded: ${timeout}ms`);
    } catch (error) {
      this.logger.error('Failed to load sequence timeout:', error);
    }
  }
}