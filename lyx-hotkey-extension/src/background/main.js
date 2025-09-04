importScripts('../common/constants.js', '../common/logger.js', '../common/lyx-parser.js');

const logger = new Logger('background');

// Extension state
let extensionEnabled = true;
let hotkeyMappings = new Map();

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('Extension installed.');
  // Load default LyX-style shortcuts
  const defaultMappings = await loadDefaultMappings();
  
  // Set default state
  await chrome.storage.local.set({ 
    [STORAGE_KEYS.ENABLED]: true,
    [STORAGE_KEYS.HOTKEY_MAPPINGS]: defaultMappings,
    [STORAGE_KEYS.CONFIG]: ''
  });
  
  hotkeyMappings = new Map(Object.entries(defaultMappings));
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Extension started up.');
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.HOTKEY_MAPPINGS]);
  extensionEnabled = result.enabled ?? true;
  
  if (result.hotkeyMappings && Object.keys(result.hotkeyMappings).length > 0) {
    hotkeyMappings = new Map(Object.entries(result.hotkeyMappings));
  } else {
    // If no mappings, load defaults
    const defaultMappings = await loadDefaultMappings();
    hotkeyMappings = new Map(Object.entries(defaultMappings));
    await chrome.storage.local.set({ [STORAGE_KEYS.HOTKEY_MAPPINGS]: defaultMappings });
  }
  logger.info(`State loaded: enabled=${extensionEnabled}, mappings=${hotkeyMappings.size}`);
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.debug('Message received:', request);
  try {
    switch (request.action) {
      case MESSAGE_ACTIONS.GET_STATE:
        sendResponse({
          enabled: extensionEnabled,
          mappings: Object.fromEntries(hotkeyMappings)
        });
        break;
        
      case MESSAGE_ACTIONS.TOGGLE_EXTENSION:
        extensionEnabled = !extensionEnabled;
        chrome.storage.local.set({ [STORAGE_KEYS.ENABLED]: extensionEnabled });
        
        // Notify all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: MESSAGE_ACTIONS.EXTENSION_TOGGLED,
              enabled: extensionEnabled
            }).catch((error) => {
                logger.debug(`Could not send message to tab ${tab.id}:`, error.message);
            });
          });
        });
        
        sendResponse({ enabled: extensionEnabled });
        logger.info(`Extension toggled: ${extensionEnabled ? 'ON' : 'OFF'}`);
        break;
        
      case MESSAGE_ACTIONS.UPDATE_MAPPINGS:
        if (request.mappings && typeof request.mappings === 'object') {
          hotkeyMappings = new Map(Object.entries(request.mappings));
          chrome.storage.local.set({ 
            [STORAGE_KEYS.HOTKEY_MAPPINGS]: request.mappings 
          });
          
          // Notify all tabs
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, {
                action: MESSAGE_ACTIONS.MAPPINGS_UPDATED,
                mappings: request.mappings
              }).catch((error) => {
                logger.debug(`Could not send message to tab ${tab.id}:`, error.message);
              });
            });
          });
          
          sendResponse({ success: true });
          logger.info(`Mappings updated: ${hotkeyMappings.size} mappings loaded.`);
        } else {
          logger.error('Invalid mappings provided:', request.mappings);
          sendResponse({ success: false, error: 'Invalid mappings' });
        }
        break;
        
      case MESSAGE_ACTIONS.LOAD_CONFIG:
        loadConfigFromText(request.configText);
        sendResponse({ success: true });
        break;
        
      case MESSAGE_ACTIONS.UPDATE_SEQUENCE_TIMEOUT:
        // Notify all tabs about sequence timeout change
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: MESSAGE_ACTIONS.SEQUENCE_TIMEOUT_UPDATED,
              timeout: request.timeout
            }).catch((error) => {
                logger.debug(`Could not send message to tab ${tab.id}:`, error.message);
            });
          });
        });
        sendResponse({ success: true });
        logger.info(`Sequence timeout updated to ${request.timeout}ms`);
        break;
        
      default:
        logger.warn('Unknown action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    logger.error('Error handling message:', error, request);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep message channel open for async response
});

// Handle tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.startsWith('http') || tab.url.startsWith('https'))) {
    
    logger.debug(`Tab ${tabId} updated, sending state.`);
    // Send current state to the tab
    chrome.tabs.sendMessage(tabId, {
      action: MESSAGE_ACTIONS.EXTENSION_TOGGLED,
      enabled: extensionEnabled
    }).catch((error) => {
        logger.debug(`Could not send message to tab ${tab.id}:`, error.message);
    });
    
    chrome.tabs.sendMessage(tabId, {
      action: MESSAGE_ACTIONS.MAPPINGS_UPDATED,
      mappings: Object.fromEntries(hotkeyMappings)
    }).catch((error) => {
        logger.debug(`Could not send message to tab ${tab.id}:`, error.message);
    });
  }
});

/**
 * Load default LyX-style key mappings
 */
async function loadDefaultMappings() {
  const defaultMappings = {
    // Math mode
    'ctrl+m': { type: 'wrap', before: '$', after: '$' },
    'ctrl+shift+m': { type: 'wrap', before: '$$\n', after: '\n$$' },
    
    // Text formatting
    'ctrl+b': { type: 'wrap', before: '**', after: '**' },
    'ctrl+e': { type: 'wrap', before: '*', after: '*' },
    'ctrl+u': { type: 'wrap', before: '_', after: '_' },
    'ctrl+shift+p': { type: 'wrap', before: '`', after: '`' },
    
    // LaTeX commands (multi-key sequences)
    'ctrl+l': { type: 'wrap', before: '\\', after: '' },
    'ctrl+shift f': { type: 'insert', text: '\\frac{}{}' },
    'ctrl+shift r': { type: 'insert', text: '\\sqrt{}' },
    'ctrl+shift i': { type: 'insert', text: '\\int_{}^{}' },
    
    // Greek letters (single keys)
    'alt+g': { type: 'insert', text: '\\alpha' },
    'alt+b': { type: 'insert', text: '\\beta' },
    'alt+d': { type: 'insert', text: '\\delta' },
    'alt+l': { type: 'insert', text: '\\lambda' },
    'alt+m': { type: 'insert', text: '\\mu' },
    'alt+p': { type: 'insert', text: '\\pi' },
    'alt+s': { type: 'insert', text: '\\sigma' },
    'alt+t': { type: 'insert', text: '\\theta' },
    
    // Greek letters (multi-key sequences with ctrl+l)
    'ctrl+l a': { type: 'insert', text: '\\alpha' },
    'ctrl+l b': { type: 'insert', text: '\\beta' },
    'ctrl+l g': { type: 'insert', text: '\\gamma' },
    'ctrl+l d': { type: 'insert', text: '\\delta' },
    'ctrl+l e': { type: 'insert', text: '\\epsilon' },
    'ctrl+l l': { type: 'insert', text: '\\lambda' },
    'ctrl+l m': { type: 'insert', text: '\\mu' },
    'ctrl+l p': { type: 'insert', text: '\\pi' },
    'ctrl+l s': { type: 'insert', text: '\\sigma' },
    'ctrl+l t': { type: 'insert', text: '\\theta' },
    
    // Special characters
    'alt+space': { type: 'insert', text: '\u00A0' }, // Non-breaking space
    'ctrl+period': { type: 'insert', text: '. ' },
    'meta+period': { type: 'insert', text: '…' }
  };
  
  return defaultMappings;
}

/**
 * Load configuration from LyX .bind file text
 */
async function loadConfigFromText(configText) {
  try {
    const parser = new LyXConfigParser();
    const mappings = parser.parse(configText);
    
    const mappingsObj = Object.fromEntries(mappings);
    
    hotkeyMappings = mappings;
    await chrome.storage.local.set({ 
      [STORAGE_KEYS.HOTKEY_MAPPINGS]: mappingsObj,
      [STORAGE_KEYS.CONFIG]: configText
    });
    
    // Notify all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: MESSAGE_ACTIONS.MAPPINGS_UPDATED,
          mappings: mappingsObj
        }).catch((error) => {
            logger.debug(`Could not send message to tab ${tab.id}:`, error.message);
        });
      });
    });
    logger.info(`Configuration loaded from text: ${mappings.size} mappings.`);
  } catch (error) {
    logger.error('Failed to parse LyX config:', error);
  }
}
