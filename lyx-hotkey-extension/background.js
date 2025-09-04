/**
 * Background Script for LyX Hotkey Extension
 * Refactored to use modular architecture with centralized state and message handling
 */

// Import required modules
importScripts('utils/logger.js');
importScripts('core/state-manager.js');
importScripts('core/message-handler.js');
importScripts('lyx-parser.js');

// Initialize logger for background context
const logger = LyXLogger.getLogger('Background');

// Global instances
let stateManager;
let messageHandler;

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('Extension installed, initializing...');
  
  try {
    // Initialize state manager
    stateManager = LyXStateManager.getStateManager();
    await stateManager.initialize();
    
    // Load default mappings if none exist
    const currentMappings = stateManager.getMappings();
    if (currentMappings.size === 0) {
      const defaultMappings = await loadDefaultMappings();
      await stateManager.setMappings(defaultMappings);
      logger.info(`Loaded ${Object.keys(defaultMappings).length} default mappings`);
    }
    
    // Initialize message handler
    messageHandler = LyXMessageHandler.initializeMessageHandler(stateManager);
    
    // Register custom message handlers
    registerCustomHandlers();
    
    logger.info('Extension initialization complete');
    
  } catch (error) {
    logger.error('Failed to initialize extension:', error);
  }
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Extension starting up...');
  
  try {
    // Re-initialize state manager
    stateManager = LyXStateManager.getStateManager();
    await stateManager.initialize();
    
    // Re-initialize message handler
    messageHandler = LyXMessageHandler.initializeMessageHandler(stateManager);
    
    // Register custom handlers
    registerCustomHandlers();
    
    logger.info('Extension startup complete');
    
  } catch (error) {
    logger.error('Failed to start extension:', error);
  }
});

/**
 * Handle tab updates to sync state with new tabs
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.startsWith('http') || tab.url.startsWith('https'))) {
    
    if (stateManager && messageHandler) {
      // Send current state to the tab
      const state = stateManager.getState();
      
      messageHandler.sendToTab(tabId, {
        action: 'extensionToggled',
        enabled: state.enabled
      });
      
      messageHandler.sendToTab(tabId, {
        action: 'mappingsUpdated',
        mappings: state.mappings
      });
      
      logger.debug(`State synced to tab ${tabId}`);
    }
  }
});

/**
 * Register custom message handlers specific to background script
 */
function registerCustomHandlers() {
  // Handler for loading configuration from text
  messageHandler.registerHandler('loadConfig', async (request) => {
    if (!request.configText) {
      throw new Error('No config text provided');
    }
    
    try {
      const parser = new LyXConfigParser();
      const mappings = parser.parse(request.configText);
      
      // Update state with parsed mappings
      await stateManager.setMappings(mappings);
      await stateManager.setConfig(request.configText);
      
      logger.info(`Configuration loaded: ${mappings.size} mappings`);
      
      return { success: true, mappingCount: mappings.size };
      
    } catch (error) {
      logger.error('Failed to parse configuration:', error);
      throw new Error(`Configuration parsing failed: ${error.message}`);
    }
  });
  
  // Handler for getting debug logs
  messageHandler.registerHandler('getLogs', async () => {
    const logs = logger.getLogs();
    return { success: true, logs };
  });
  
  // Handler for clearing debug logs
  messageHandler.registerHandler('clearLogs', async () => {
    logger.clearLogs();
    return { success: true };
  });
  
  // Handler for updating log level
  messageHandler.registerHandler('updateLogLevel', async (request) => {
    if (typeof request.level !== 'number') {
      throw new Error('Invalid log level');
    }
    
    logger.setLevel(request.level);
    await stateManager.setLoggerConfig({ level: request.level });
    
    logger.info(`Log level updated to: ${request.level}`);
    
    return { success: true };
  });
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
