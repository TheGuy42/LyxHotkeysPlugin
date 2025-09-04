const logger = new Logger('options');

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

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (!isMac && macKeyNote) {
    macKeyNote.style.display = 'none';
  }

  if (isMac) {
    const macMappingRadios = document.querySelectorAll('input[name="macMMapping"]');
    macMappingRadios.forEach(radio => {
      radio.addEventListener('change', async () => {
        if (radio.checked) {
          saveMacKeyPreference(radio.value);
          if (currentMappings.size > 0) {
            await reparseWithMacPreference();
          }
        }
      });
    });
    
    loadMacKeyPreference();
  }

  const sequenceTimeoutSlider = document.getElementById('sequenceTimeout');
  const timeoutValueDisplay = document.getElementById('timeoutValue');
  
  if (sequenceTimeoutSlider && timeoutValueDisplay) {
    sequenceTimeoutSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      timeoutValueDisplay.textContent = `${value}ms`;
      saveSequenceTimeout(parseInt(value));
    });
    
    loadSequenceTimeout();
  }

  loadCurrentConfig();

  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', handleDragOver);
  uploadArea.addEventListener('dragleave', handleDragLeave);
  uploadArea.addEventListener('drop', handleDrop);
  
  fileInput.addEventListener('change', handleFileSelect);
  
  browseButton.addEventListener('click', () => fileInput.click());
  loadSampleButton.addEventListener('click', loadSampleConfig);
  exportButton.addEventListener('click', exportCurrentConfig);
  saveButton.addEventListener('click', saveConfiguration);
  resetButton.addEventListener('click', resetToDefaults);
  clearButton.addEventListener('click', clearAllConfig);

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
      logger.error('Error reading file:', file.name);
    };
    reader.readAsText(file);
  }

  async function loadSampleConfig() {
    const sampleConfig = `# Sample LyX Hotkey Configuration...`; // Same as before
    configTextarea.value = sampleConfig;
    showStatus('Sample configuration loaded', 'info');
    await parseAndDisplayConfig(sampleConfig);
  }

  async function loadCurrentConfig() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.CONFIG, STORAGE_KEYS.HOTKEY_MAPPINGS, STORAGE_KEYS.MAC_M_MAPPING]);
      
      if (result.config) {
        configTextarea.value = result.config;
        await parseAndDisplayConfig(result.config);
      } else if (result.hotkeyMappings) {
        currentMappings = new Map(Object.entries(result.hotkeyMappings));
        await displayHotkeyList();
      }
      logger.info('Current configuration loaded.');
    } catch (error) {
      showStatus('Error loading current configuration', 'error');
      logger.error('Error loading current configuration:', error);
    }
  }

  async function parseAndDisplayConfig(configText) {
    try {
      const parser = new LyXConfigParser();
      
      let macMMapping = 'ctrl';
      if (isMac) {
        const result = await chrome.storage.local.get([STORAGE_KEYS.MAC_M_MAPPING]);
        macMMapping = result.macMMapping || 'ctrl';
      }
      
      const options = { mapMetaToCtrl: macMMapping === 'ctrl' };
      logger.debug(`Parsing config with options:`, options);
      const mappings = parser.parse(configText, options);
      
      currentMappings = mappings;
      await displayHotkeyList();
      showStatus(`Parsed ${mappings.size} hotkey mappings`, 'success');
      logger.info(`Parsed ${mappings.size} hotkey mappings.`);
    } catch (error) {
      showStatus('Error parsing configuration: ' + error.message, 'error');
      logger.error('Error parsing configuration:', error);
    }
  }

  async function displayHotkeyList() {
    // ... (same as before, but add logging)
  }

  async function saveConfiguration() {
    const configText = configTextarea.value.trim();
    if (!configText) {
      showStatus('Please enter a configuration', 'error');
      return;
    }

    try {
      await parseAndDisplayConfig(configText);
      
      const mappingsObj = Object.fromEntries(currentMappings);
      await chrome.storage.local.set({
        [STORAGE_KEYS.CONFIG]: configText,
        [STORAGE_KEYS.HOTKEY_MAPPINGS]: mappingsObj
      });
      
      await chrome.runtime.sendMessage({
        action: MESSAGE_ACTIONS.UPDATE_MAPPINGS,
        mappings: mappingsObj
      });
      
      showStatus('Configuration saved successfully!', 'success');
      logger.info('Configuration saved.');
    } catch (error) {
      showStatus('Error saving configuration: ' + error.message, 'error');
      logger.error('Error saving configuration:', error);
    }
  }

  // ... other functions with logging added
});
