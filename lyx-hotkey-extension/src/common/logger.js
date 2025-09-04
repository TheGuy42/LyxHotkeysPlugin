/**
 * src/common/logger.js
 * A simple logger for the extension.
 */
class Logger {
  constructor(component) {
    this.component = component;
    this.logLevel = 'INFO'; // Default log level
    this.loadLogLevel();
  }

  async loadLogLevel() {
    try {
      const result = await chrome.storage.local.get('logLevel');
      if (result.logLevel) {
        this.logLevel = result.logLevel;
      }
    } catch (e) {
      // Use default if storage is not available
    }
  }

  _log(level, ...args) {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (levels.indexOf(level) >= levels.indexOf(this.logLevel)) {
      console.log(`[${this.component}] [${level}]`, ...args);
    }
  }

  debug(...args) {
    this._log('DEBUG', ...args);
  }

  info(...args) {
    this._log('INFO', ...args);
  }

  warn(...args) {
    this._log('WARN', ...args);
  }

  error(...args) {
    this._log('ERROR', ...args);
  }
}

