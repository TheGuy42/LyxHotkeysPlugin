/**
 * Unified Logging System for LyX Hotkeys Extension
 * Provides consistent, configurable logging across all components
 */

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Log level names for display
const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.ERROR]: 'ERROR',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.TRACE]: 'TRACE'
};

// Default configuration
const DEFAULT_CONFIG = {
  level: LOG_LEVELS.INFO,
  enableTimestamps: true,
  enableContext: true,
  enableColors: true,
  maxLogEntries: 1000
};

/**
 * Logger class with context-aware logging
 */
class Logger {
  constructor(context = 'LyX', config = {}) {
    this.context = context;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logEntries = [];
  }

  /**
   * Set the global log level
   */
  setLevel(level) {
    this.config.level = level;
  }

  /**
   * Get current log level
   */
  getLevel() {
    return this.config.level;
  }

  /**
   * Update logger configuration
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext) {
    const childContext = `${this.context}:${additionalContext}`;
    return new Logger(childContext, this.config);
  }

  /**
   * Log at ERROR level
   */
  error(message, ...args) {
    this._log(LOG_LEVELS.ERROR, message, args);
  }

  /**
   * Log at WARN level
   */
  warn(message, ...args) {
    this._log(LOG_LEVELS.WARN, message, args);
  }

  /**
   * Log at INFO level
   */
  info(message, ...args) {
    this._log(LOG_LEVELS.INFO, message, args);
  }

  /**
   * Log at DEBUG level
   */
  debug(message, ...args) {
    this._log(LOG_LEVELS.DEBUG, message, args);
  }

  /**
   * Log at TRACE level
   */
  trace(message, ...args) {
    this._log(LOG_LEVELS.TRACE, message, args);
  }

  /**
   * Log method calls for debugging
   */
  logMethodCall(methodName, args = []) {
    this.debug(`🔧 ${methodName}(${args.map(arg => JSON.stringify(arg)).join(', ')})`);
  }

  /**
   * Log state changes
   */
  logStateChange(stateName, oldValue, newValue) {
    this.debug(`📊 State change: ${stateName} = ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`);
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation, duration) {
    this.debug(`⏱️ Performance: ${operation} took ${duration}ms`);
  }

  /**
   * Log key events for hotkey debugging
   */
  logKeyEvent(eventType, keyInfo) {
    const combo = this._formatKeyCombo(keyInfo);
    this.debug(`🔑 ${eventType}: ${combo}`, keyInfo);
  }

  /**
   * Log action execution
   */
  logAction(action, target = null) {
    const targetInfo = target ? ` on ${target.tagName}` : '';
    this.info(`🎬 Action: ${JSON.stringify(action)}${targetInfo}`);
  }

  /**
   * Get all log entries for debugging
   */
  getLogs() {
    return [...this.logEntries];
  }

  /**
   * Clear all log entries
   */
  clearLogs() {
    this.logEntries = [];
  }

  /**
   * Internal logging method
   */
  _log(level, message, args) {
    if (level > this.config.level) {
      return; // Skip if log level is too low
    }

    const timestamp = this.config.enableTimestamps ? this._getTimestamp() : '';
    const context = this.config.enableContext ? `[${this.context}]` : '';
    const levelName = LOG_LEVEL_NAMES[level];
    
    const logEntry = {
      timestamp: Date.now(),
      level,
      levelName,
      context: this.context,
      message,
      args
    };

    // Store log entry
    this.logEntries.push(logEntry);
    
    // Maintain max log entries
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries.shift();
    }

    // Format message for console
    const prefix = [timestamp, context, levelName].filter(Boolean).join(' ');
    const formattedMessage = prefix ? `${prefix} ${message}` : message;

    // Output to console
    this._outputToConsole(level, formattedMessage, args);
  }

  /**
   * Output log to console with appropriate method
   */
  _outputToConsole(level, message, args) {
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(message, ...args);
        break;
      case LOG_LEVELS.WARN:
        console.warn(message, ...args);
        break;
      case LOG_LEVELS.INFO:
        console.info(message, ...args);
        break;
      case LOG_LEVELS.DEBUG:
      case LOG_LEVELS.TRACE:
        console.log(message, ...args);
        break;
    }
  }

  /**
   * Get formatted timestamp
   */
  _getTimestamp() {
    const now = new Date();
    return `[${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}]`;
  }

  /**
   * Format key combination for logging
   */
  _formatKeyCombo(keyInfo) {
    if (!keyInfo) return 'unknown';
    
    const parts = [];
    if (keyInfo.ctrlKey) parts.push('ctrl');
    if (keyInfo.altKey) parts.push('alt');
    if (keyInfo.shiftKey) parts.push('shift');
    if (keyInfo.metaKey) parts.push('meta');
    
    const key = keyInfo.key ? keyInfo.key.toLowerCase() : keyInfo.code;
    if (key && key !== 'control' && key !== 'alt' && key !== 'shift' && key !== 'meta') {
      parts.push(key);
    }
    
    return parts.join('+') || 'unknown';
  }
}

/**
 * Global logger instance
 */
let globalLogger = new Logger('LyX');

/**
 * Configure the global logger
 */
function configureLogger(config) {
  globalLogger.configure(config);
}

/**
 * Get the global logger
 */
function getLogger(context = null) {
  return context ? globalLogger.child(context) : globalLogger;
}

/**
 * Set global log level
 */
function setLogLevel(level) {
  globalLogger.setLevel(level);
}

/**
 * Load logging configuration from storage
 */
async function loadLoggerConfig() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['loggerConfig']);
      if (result.loggerConfig) {
        configureLogger(result.loggerConfig);
      }
    }
  } catch (error) {
    console.warn('Failed to load logger config:', error);
  }
}

/**
 * Save logging configuration to storage
 */
async function saveLoggerConfig(config) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ loggerConfig: config });
      configureLogger(config);
    }
  } catch (error) {
    console.warn('Failed to save logger config:', error);
  }
}

// Load configuration on startup
if (typeof chrome !== 'undefined') {
  loadLoggerConfig();
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    Logger,
    getLogger,
    configureLogger,
    setLogLevel,
    loadLoggerConfig,
    saveLoggerConfig,
    LOG_LEVELS
  };
} else if (typeof window !== 'undefined') {
  // Browser global
  window.LyXLogger = {
    Logger,
    getLogger,
    configureLogger,
    setLogLevel,
    loadLoggerConfig,
    saveLoggerConfig,
    LOG_LEVELS
  };
} else if (typeof self !== 'undefined') {
  // Service worker global
  self.LyXLogger = {
    Logger,
    getLogger,
    configureLogger,
    setLogLevel,
    loadLoggerConfig,
    saveLoggerConfig,
    LOG_LEVELS
  };
}