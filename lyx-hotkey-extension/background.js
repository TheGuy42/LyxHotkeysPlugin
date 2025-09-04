/**
 * Background Script for LyX Hotkey Extension
 * Service worker for Chrome extension
 */

// Simple inline logger for service worker context
const logger = {
  info: (msg, ...args) => console.log(`[Background] INFO: ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[Background] WARN: ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[Background] ERROR: ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`[Background] DEBUG: ${msg}`, ...args),
  getLogs: () => [],
  clearLogs: () => {},
  setLevel: () => {}
};

// Extension state
let extensionEnabled = true;
let hotkeyMappings = new Map();

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('Extension installed, initializing...');
  
  try {
    // Load default LyX-style shortcuts
    const defaultMappings = await loadDefaultMappings();
    
    // Set default state
    await chrome.storage.local.set({ 
      enabled: true,
      hotkeyMappings: defaultMappings,
      config: ''
    });
    
    hotkeyMappings = new Map(Object.entries(defaultMappings));
    logger.info('Extension initialization complete');
    
  } catch (error) {
    logger.error('Failed to initialize extension:', error);
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Extension starting up...');
  
  try {
    const result = await chrome.storage.local.get(['enabled', 'hotkeyMappings']);
    extensionEnabled = result.enabled ?? true;
    
    if (result.hotkeyMappings && Object.keys(result.hotkeyMappings).length > 0) {
      hotkeyMappings = new Map(Object.entries(result.hotkeyMappings));
    } else {
      // If no mappings, load defaults
      const defaultMappings = await loadDefaultMappings();
      hotkeyMappings = new Map(Object.entries(defaultMappings));
      await chrome.storage.local.set({ hotkeyMappings: defaultMappings });
    }
    
    logger.info('Extension startup complete');
    
  } catch (error) {
    logger.error('Failed to start extension:', error);
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case 'getState':
        sendResponse({
          enabled: extensionEnabled,
          mappings: Object.fromEntries(hotkeyMappings)
        });
        break;
        
      case 'toggleExtension':
        extensionEnabled = !extensionEnabled;
        chrome.storage.local.set({ enabled: extensionEnabled });
        
        // Notify all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'extensionToggled',
              enabled: extensionEnabled
            }).catch(() => {}); // Ignore errors for tabs that can't receive messages
          });
        });
        
        sendResponse({ enabled: extensionEnabled });
        break;
        
      case 'updateMappings':
        if (request.mappings && typeof request.mappings === 'object') {
          hotkeyMappings = new Map(Object.entries(request.mappings));
          chrome.storage.local.set({ 
            hotkeyMappings: request.mappings 
          });
          
          // Notify all tabs
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, {
                action: 'mappingsUpdated',
                mappings: request.mappings
              }).catch(() => {});
            });
          });
          
          sendResponse({ success: true });
        } else {
          logger.error('Invalid mappings provided:', request.mappings);
          sendResponse({ success: false, error: 'Invalid mappings' });
        }
        break;
        
      case 'loadConfig':
        loadConfigFromText(request.configText);
        sendResponse({ success: true });
        break;
        
      case 'updateSequenceTimeout':
        // Notify all tabs about sequence timeout change
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'sequenceTimeoutUpdated',
              timeout: request.timeout
            }).catch(() => {});
          });
        });
        sendResponse({ success: true });
        break;
        
      default:
        logger.warn('Unknown action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
        break;
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep message channel open for async response
});

/**
 * Load configuration from LyX .bind file text
 */
async function loadConfigFromText(configText) {
  try {
    // Simple config parsing - for now just save the text
    // Full parsing would require LyXConfigParser but that's imported separately
    await chrome.storage.local.set({ 
      config: configText
    });
    
    // Notify all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'configUpdated',
          config: configText
        }).catch(() => {});
      });
    });
    
    logger.info('Configuration text saved');
    
  } catch (error) {
    logger.error('Failed to save configuration:', error);
  }
}

/**
 * Load default LyX-style key mappings
 */
async function loadDefaultMappings() {
  logger.debug('Loading default mappings...');
  
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
  
  logger.debug(`Default mappings loaded: ${Object.keys(defaultMappings).length} entries`);
  return defaultMappings;
}

// Legacy function for compatibility - now handled by message handlers and state manager
// This function is kept for any remaining references but functionality moved to loadConfig handler
