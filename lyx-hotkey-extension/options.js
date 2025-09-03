/**
 * Options Page Script for LyX Hotkey Extension
 * Handles configuration management and file operations
 */

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const configTextarea = document.getElementById('configTextarea');
  const statusMessage = document.getElementById('statusMessage');
  const hotkeyList = document.getElementById('hotkeyList');
  const macKeyNote = document.getElementById('macKeyNote');
  
  const browseButton = document.getElementById('browseButton');
  const loadSampleButton = document.getElementById('loadSampleButton');
  const exportButton = document.getElementById('exportButton');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const clearButton = document.getElementById('clearButton');

  let currentMappings = new Map();

  // Show/hide Mac note based on platform
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (!isMac && macKeyNote) {
    macKeyNote.style.display = 'none';
  }

  // Handle Mac key mapping preference
  if (isMac) {
    const macMappingRadios = document.querySelectorAll('input[name="macMMapping"]');
    macMappingRadios.forEach(radio => {
      radio.addEventListener('change', async () => {
        if (radio.checked) {
          saveMacKeyPreference(radio.value);
          // Reparse current config with new preference
          if (currentMappings.size > 0) {
            await reparseWithMacPreference();
          }
        }
      });
    });
    
    // Load saved preference
    loadMacKeyPreference();
  }

  // Handle sequence timeout slider
  const sequenceTimeoutSlider = document.getElementById('sequenceTimeout');
  const timeoutValueDisplay = document.getElementById('timeoutValue');
  
  if (sequenceTimeoutSlider && timeoutValueDisplay) {
    sequenceTimeoutSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      timeoutValueDisplay.textContent = `${value}ms`;
      saveSequenceTimeout(parseInt(value));
    });
    
    // Load saved timeout value
    loadSequenceTimeout();
  }

  // Load current configuration on page load
  loadCurrentConfig();

  // File upload event listeners
  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);
  
  fileInput.addEventListener('change', handleFileSelect);
  
  // Button event listeners
  browseButton.addEventListener('click', () => fileInput.click());
  loadSampleButton.addEventListener('click', loadSampleConfig);
  exportButton.addEventListener('click', exportCurrentConfig);
  saveButton.addEventListener('click', saveConfiguration);
  resetButton.addEventListener('click', resetToDefaults);
  clearButton.addEventListener('click', clearAllConfig);

  // Drag and drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  }

  function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
  }

  function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }

  function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }

  function processFile(file) {
    if (!file.name.endsWith('.bind') && !file.name.endsWith('.txt')) {
      showStatus('Please select a .bind or .txt file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      configTextarea.value = content;
      showStatus(`Loaded file: ${file.name}`, 'success');
      await parseAndDisplayConfig(content);
    };
    reader.onerror = () => {
      showStatus('Error reading file', 'error');
    };
    reader.readAsText(file);
  }

  async function loadSampleConfig() {
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

    configTextarea.value = sampleConfig;
    showStatus('Sample configuration loaded', 'info');
    await parseAndDisplayConfig(sampleConfig);
  }

  async function loadCurrentConfig() {
    try {
      const result = await chrome.storage.local.get(['config', 'hotkeyMappings', 'macMMapping']);
      
      if (result.config) {
        configTextarea.value = result.config;
        
        // Always reparse the config with current Mac preference instead of loading stored mappings
        // This ensures the mappings match the current preference setting
        await parseAndDisplayConfig(result.config);
      } else if (result.hotkeyMappings) {
        // Fallback: only use stored mappings if no config text is available
        currentMappings = new Map(Object.entries(result.hotkeyMappings));
        await displayHotkeyList();
      }
    } catch (error) {
      showStatus('Error loading current configuration', 'error');
    }
  }

  async function parseAndDisplayConfig(configText) {
    try {
      const parser = new LyXConfigParser();
      
      // Get current Mac preference
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      let macMMapping = 'ctrl'; // default
      
      if (isMac) {
        try {
          const result = await chrome.storage.local.get(['macMMapping']);
          macMMapping = result.macMMapping || 'ctrl';
        } catch (error) {
          console.warn('Could not load Mac preference, using default:', error);
        }
      }
      
      // Parse with Mac preference options
      const options = {
        mapMetaToCtrl: macMMapping === 'ctrl'
      };
      
      console.log(`🔧 Parsing config with Mac preference: ${macMMapping}`, options);
      console.log(`🔧 Platform detected as Mac: ${isMac}`);
      const mappings = parser.parse(configText, options);
      
      // Debug: Log some key mappings to see what we got
      console.log(`🔍 Sample mappings generated:`);
      let count = 0;
      for (const [key, action] of mappings) {
        if (count < 5) {
          console.log(`  "${key}" → ${action.type}: ${action.action || action.text || 'unknown'}`);
          count++;
        }
      }
      
      currentMappings = mappings;
      await displayHotkeyList();
      showStatus(`Parsed ${mappings.size} hotkey mappings`, 'success');
    } catch (error) {
      showStatus('Error parsing configuration: ' + error.message, 'error');
    }
  }

  async function displayHotkeyList() {
    if (currentMappings.size === 0) {
      hotkeyList.innerHTML = '<p style="text-align: center; color: #718096; margin: 20px 0;">No hotkeys configured</p>';
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    let macMMapping = 'ctrl'; // default
    
    if (isMac) {
      try {
        const result = await chrome.storage.local.get(['macMMapping']);
        macMMapping = result.macMMapping || 'ctrl';
      } catch (error) {
        console.warn('Could not load Mac preference for display, using default:', error);
      }
    }
    
    let html = '';
    for (const [key, action] of currentMappings) {
      console.log(`🎯 Mapping key: "${key}" → action:`, action);
      console.log(`🔧 Mac mapping preference for display: ${macMMapping}`);
      const displayKey = formatKeyForDisplay(key, isMac, macMMapping);
      console.log(`🎨 Display key: "${key}" → "${displayKey}"`);
      
      // Check if this is a sequence (contains space)
      const isSequence = key.includes(' ');
      const sequenceClass = isSequence ? ' sequence' : '';
      
      html += `
        <div class="hotkey-item${sequenceClass}">
          <span class="hotkey-key">${displayKey}</span>
          <span class="hotkey-action">${getActionDescription(action)}</span>
        </div>
      `;
    }
    
    hotkeyList.innerHTML = html;
  }

  function formatKeyForDisplay(key, isMac, macMMapping) {
    if (!isMac) return key;
    
    console.log(`🎨 formatKeyForDisplay: key="${key}", isMac=${isMac}, macMMapping=${macMMapping}`);
    
    // Convert to Mac-style display based on user preference
    let formatted;
    if (macMMapping === 'meta') {
      // User chose to map M- to Command, show meta+ as ⌘
      formatted = key
        .replace(/ctrl\+/gi, '⌃ ')  // Regular Ctrl keys
        .replace(/meta\+/gi, '⌘ ')  // M- keys mapped to Command  
        .replace(/alt\+/gi, '⌥ ')
        .replace(/shift\+/gi, '⇧ ');
    } else {
      // User chose to map M- to Ctrl (default), show both ctrl+ and meta+ as ⌃
      formatted = key
        .replace(/ctrl\+/gi, '⌃ ')  // Regular Ctrl keys
        .replace(/meta\+/gi, '⌃ ')  // M- keys mapped to Ctrl  
        .replace(/alt\+/gi, '⌥ ')
        .replace(/shift\+/gi, '⇧ ');
    }
    
    // Clean up arrow keys and special keys - be specific to avoid double replacements
    formatted = formatted
      .replace(/arrowright/gi, '→')
      .replace(/arrowleft/gi, '←')
      .replace(/arrowup/gi, '↑')
      .replace(/arrowdown/gi, '↓')
      .replace(/enter/gi, '⏎')
      .replace(/backspace/gi, '⌫')
      .replace(/space/gi, '␣')
      .replace(/delete/gi, '⌦')
      .replace(/insert/gi, 'Ins')
      .replace(/home/gi, '⤴')
      .replace(/end/gi, '⤵')
      .replace(/kp_/gi, 'Num ')
      .replace(/period/gi, '.')
      .replace(/quotedbl/gi, '"')
      .replace(/minus/gi, '-')
      .replace(/slash/gi, '/')
      .replace(/nobreak/gi, 'NoBreak');
    
    // Clean up and format final result - remove trailing + and uppercase
    formatted = formatted
      .replace(/\s+$/, '')  // Remove trailing spaces
      .replace(/\+$/, '')   // Remove trailing +
      .trim();
    
    // Uppercase the final key only (single letters)
    formatted = formatted.replace(/([a-z])$/i, (match) => match.toUpperCase());
    
    console.log(`🎨 formatKeyForDisplay result: "${formatted}"`);
    return formatted;
  }

  function getActionDescription(action) {
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

  async function saveConfiguration() {
    const configText = configTextarea.value.trim();
    
    if (!configText) {
      showStatus('Please enter a configuration', 'error');
      return;
    }

    try {
      // Parse the configuration
      await parseAndDisplayConfig(configText);
      
      // Save to storage
      const mappingsObj = Object.fromEntries(currentMappings);
      await chrome.storage.local.set({
        config: configText,
        hotkeyMappings: mappingsObj
      });
      
      // Notify background script
      await chrome.runtime.sendMessage({
        action: 'updateMappings',
        mappings: mappingsObj
      });
      
      showStatus('Configuration saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving configuration: ' + error.message, 'error');
    }
  }

  async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset to default configuration? This will overwrite your current settings.')) {
      return;
    }

    try {
      // Send message to background script to load defaults
      await chrome.runtime.sendMessage({ action: 'loadConfig', configText: '' });
      
      // Reload the page configuration
      await loadCurrentConfig();
      
      showStatus('Reset to default configuration', 'success');
    } catch (error) {
      showStatus('Error resetting configuration: ' + error.message, 'error');
    }
  }

  async function clearAllConfig() {
    if (!confirm('Are you sure you want to clear all hotkey configurations? This cannot be undone.')) {
      return;
    }

    try {
      await chrome.storage.local.set({
        config: '',
        hotkeyMappings: {}
      });
      
      await chrome.runtime.sendMessage({
        action: 'updateMappings',
        mappings: {}
      });
      
      configTextarea.value = '';
      currentMappings.clear();
      await displayHotkeyList();
      
      showStatus('All configurations cleared', 'info');
    } catch (error) {
      showStatus('Error clearing configuration: ' + error.message, 'error');
    }
  }

  function exportCurrentConfig() {
    const configText = configTextarea.value;
    
    if (!configText.trim()) {
      showStatus('No configuration to export', 'error');
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
    showStatus('Configuration exported successfully', 'success');
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message status-${type}`;
    statusMessage.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }

  // Mac key preference functions
  async function saveMacKeyPreference(preference) {
    try {
      await chrome.storage.local.set({ macMMapping: preference });
      showStatus(`Mac key mapping preference saved: ${preference === 'ctrl' ? 'Ctrl' : 'Command'}`, 'success');
    } catch (error) {
      console.error('Error saving Mac key preference:', error);
      showStatus('Error saving preference', 'error');
    }
  }

  async function loadMacKeyPreference() {
    try {
      const result = await chrome.storage.local.get(['macMMapping']);
      const preference = result.macMMapping || 'ctrl'; // Default to ctrl
      
      const radio = document.querySelector(`input[name="macMMapping"][value="${preference}"]`);
      if (radio) {
        radio.checked = true;
      }
    } catch (error) {
      console.error('Error loading Mac key preference:', error);
    }
  }

  async function reparseWithMacPreference() {
    try {
      const result = await chrome.storage.local.get(['config', 'macMMapping']);
      if (result.config) {
        const preference = result.macMMapping || 'ctrl';
        const parser = new LyXConfigParser();
        
        // Parse with Mac preference
        const options = {
          mapMetaToCtrl: preference === 'ctrl'
        };
        
        console.log(`🔄 Reparsing with preference: ${preference}`, options);
        const mappings = parser.parse(result.config, options);
        
        // Debug: Log some key mappings to see what we got after reparse
        console.log(`🔍 Sample mappings after reparse:`);
        let count = 0;
        for (const [key, action] of mappings) {
          if (count < 5 && key.includes('m')) { // Focus on M- keys
            console.log(`  "${key}" → ${action.type}: ${action.action || action.text || 'unknown'}`);
            count++;
          }
        }
        
        const mappingsObj = Object.fromEntries(mappings);
        
        // Update storage and display
        await chrome.storage.local.set({ hotkeyMappings: mappingsObj });
        currentMappings = mappings;
        await displayHotkeyList();
        
        // Notify background script
        chrome.runtime.sendMessage({ 
          action: 'updateMappings', 
          mappings: mappingsObj 
        });
        
        showStatus('Configuration reloaded with new Mac key preference', 'success');
      }
    } catch (error) {
      console.error('Error reparsing with Mac preference:', error);
      showStatus('Error updating configuration', 'error');
    }
  }

  // Sequence timeout functions
  async function saveSequenceTimeout(timeout) {
    try {
      await chrome.storage.local.set({ sequenceTimeout: timeout });
      
      // Notify background script and all tabs
      chrome.runtime.sendMessage({ 
        action: 'updateSequenceTimeout', 
        timeout: timeout 
      });
      
      console.log(`Sequence timeout saved: ${timeout}ms`);
    } catch (error) {
      console.error('Error saving sequence timeout:', error);
      showStatus('Error saving timeout setting', 'error');
    }
  }

  async function loadSequenceTimeout() {
    try {
      const result = await chrome.storage.local.get(['sequenceTimeout']);
      const timeout = result.sequenceTimeout || 1000; // Default 1000ms
      
      const slider = document.getElementById('sequenceTimeout');
      const display = document.getElementById('timeoutValue');
      
      if (slider && display) {
        slider.value = timeout;
        display.textContent = `${timeout}ms`;
      }
    } catch (error) {
      console.error('Error loading sequence timeout:', error);
    }
  }
});
