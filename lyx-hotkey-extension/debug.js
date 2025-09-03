const debugOutput = document.getElementById('debugOutput');
const lastKey = document.getElementById('lastKey');
const testInput = document.getElementById('testInput');
const testArea = document.getElementById('testArea');

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  debugOutput.textContent += `[${timestamp}] ${message}\n`;
  debugOutput.scrollTop = debugOutput.scrollHeight;
}

function getKeyInfo(e) {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  const info = {
    key: e.key,
    code: e.code,
    keyCode: e.keyCode,
    which: e.which,
    ctrlKey: e.ctrlKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
    metaKey: e.metaKey,
    platform: navigator.platform,
    isMac: isMac
  };
  
  return info;
}

function handleKeyDown(e) {
  const info = getKeyInfo(e);
  
  // Show detailed key info
  lastKey.innerHTML = `
    Key: "${info.key}" | Code: "${info.code}"<br>
    Ctrl: ${info.ctrlKey} | Alt: ${info.altKey} | Shift: ${info.shiftKey} | Meta: ${info.metaKey}<br>
    Platform: ${info.platform} (isMac: ${info.isMac})
  `;
  
  // Log the event
  log(`KeyDown: key="${info.key}" code="${info.code}" ctrl=${info.ctrlKey} alt=${info.altKey} shift=${info.shiftKey} meta=${info.metaKey}`);
  
  // Simulate the extension's key combo generation
  const parts = [];
  if (info.ctrlKey) parts.push('ctrl');
  if (info.altKey) parts.push('alt');
  if (info.shiftKey) parts.push('shift');
  if (info.metaKey) parts.push('meta');
  
  let key = info.key.toLowerCase();
  
  // Mac Option key fix
  if (info.isMac && info.altKey && !info.ctrlKey && !info.metaKey) {
    const codeToKey = {
      'KeyM': 'm', 'KeyG': 'g', 'KeyB': 'b', 'KeyD': 'd',
      'KeyL': 'l', 'KeyP': 'p', 'KeyS': 's', 'KeyT': 't'
    };
    
    if (codeToKey[info.code]) {
      key = codeToKey[info.code];
      log(`Mac Option key fix: Using "${key}" instead of "${info.key}"`);
    }
  }
  
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
    parts.push(key);
    const combo = parts.join('+');
    log(`Generated key combo: "${combo}"`);
    
    // Check if this would match common LyX shortcuts
    const commonShortcuts = {
      'alt+m': '\\mu (Greek mu)',
      'alt+g': '\\alpha (Greek alpha)',
      'alt+p': '\\pi (Greek pi)',
      'ctrl+m': 'Math mode',
      'ctrl+b': 'Bold'
    };
    
    if (commonShortcuts[combo]) {
      log(`✅ This should trigger: ${commonShortcuts[combo]}`);
    } else {
      log(`❌ No action mapped for: ${combo}`);
    }
    
    // Check if extension is actually running
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
        if (chrome.runtime.lastError) {
          log(`❌ Extension communication failed: ${chrome.runtime.lastError.message}`);
        } else if (response) {
          log(`📊 Extension state: enabled=${response.enabled}, mappings=${Object.keys(response.mappings).length}`);
          if (response.mappings[combo]) {
            log(`🎯 Found mapping for ${combo}: ${JSON.stringify(response.mappings[combo])}`);
          } else {
            log(`🔍 Available mappings: ${Object.keys(response.mappings).slice(0, 5).join(', ')}...`);
          }
        } else {
          log(`❌ No response from extension`);
        }
      });
    } else {
      log(`❌ Chrome extension API not available`);
    }
  }
  
  log('---');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add event listeners
  testInput.addEventListener('keydown', handleKeyDown);
  testArea.addEventListener('keydown', handleKeyDown);
  
  log('Debug tool initialized. Press keys in the input fields above.');
  log('Platform detected: ' + navigator.platform);
  log('User agent: ' + navigator.userAgent);
  log('---');
});
