/**
 * src/common/constants.js
 * Shared constants used across the extension.
 */

const MESSAGE_ACTIONS = {
  GET_STATE: 'getState',
  TOGGLE_EXTENSION: 'toggleExtension',
  UPDATE_MAPPINGS: 'updateMappings',
  LOAD_CONFIG: 'loadConfig',
  UPDATE_SEQUENCE_TIMEOUT: 'updateSequenceTimeout',
  EXTENSION_TOGGLED: 'extensionToggled',
  MAPPINGS_UPDATED: 'mappingsUpdated',
  SEQUENCE_TIMEOUT_UPDATED: 'sequenceTimeoutUpdated',
};

const STORAGE_KEYS = {
  ENABLED: 'enabled',
  HOTKEY_MAPPINGS: 'hotkeyMappings',
  CONFIG: 'config',
  MAC_M_MAPPING: 'macMMapping',
  SEQUENCE_TIMEOUT: 'sequenceTimeout',
  LOG_LEVEL: 'logLevel',
};
