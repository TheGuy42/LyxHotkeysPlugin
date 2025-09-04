/**
 * Popup Script for LyX Hotkey Extension
 * Handles the popup interface and controls
 */

document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');
  const hotkeyCount = document.getElementById('hotkeyCount');
  const pageStatus = document.getElementById('pageStatus');
  const openOptionsBtn = document.getElementById('openOptions');
  const testModeBtn = document.getElementById('testMode');

  // Initialize UI first
  updateUI(false, {});

  // Get current state from background script
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getState' });
    if (response) {
      updateUI(response.enabled, response.mappings);
    }
  } catch (error) {
    console.error('Failed to get extension state:', error);
    // Fallback: try to get from storage directly
    try {
      const result = await chrome.storage.local.get(['enabled', 'hotkeyMappings']);
      updateUI(result.enabled ?? false, result.hotkeyMappings || {});
    } catch (storageError) {
      console.error('Failed to get from storage:', storageError);
    }
  }

  // Toggle switch event listener
  toggleSwitch.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ action: 'toggleExtension' });
    if (response) {
      updateUI(response.enabled, await getCurrentMappings());
    }
  });

  // Open options page
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  // Test mode - opens a simple test page
  testModeBtn.addEventListener('click', () => {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('test.html')
    });
    window.close();
  });
  
  // Add debug mode button if needed
  const debugBtn = document.createElement('button');
  debugBtn.className = 'btn btn-secondary';
  debugBtn.textContent = 'Debug Keys';
  debugBtn.style.marginTop = '5px';
  debugBtn.addEventListener('click', () => {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('debug.html')
    });
    window.close();
  });
  testModeBtn.parentNode.appendChild(debugBtn);

  // Check if current page is compatible
  checkPageCompatibility();

  function updateUI(enabled, mappings) {
    // Update toggle switch
    toggleSwitch.classList.toggle('active', enabled);
    
    // Update status
    status.className = enabled ? 'status enabled' : 'status disabled';
    status.textContent = enabled 
      ? 'Extension is active and monitoring hotkeys'
      : 'Extension is disabled';
    
    // Update hotkey count
    const count = mappings ? Object.keys(mappings).length : 0;
    hotkeyCount.textContent = count;
  }

  async function getCurrentMappings() {
    const result = await chrome.storage.local.get(['hotkeyMappings']);
    return result.hotkeyMappings || {};
  }

  async function checkPageCompatibility() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:') ||
          tab.url.startsWith('moz-extension://')) {
        pageStatus.textContent = 'Not Compatible';
        pageStatus.style.color = '#991b1b';
      } else if (tab.url.startsWith('http://') || 
                 tab.url.startsWith('https://') ||
                 tab.url.startsWith('chrome-extension://')) {
        // Extension pages (like test.html, debug.html) are compatible
        if (tab.url.includes('test.html') || tab.url.includes('debug.html')) {
          pageStatus.textContent = 'Test Page';
          pageStatus.style.color = '#2563eb';
        } else {
          pageStatus.textContent = 'Compatible';
          pageStatus.style.color = '#2d662d';
        }
      } else {
        pageStatus.textContent = 'Unknown';
        pageStatus.style.color = '#92400e';
      }
    } catch (error) {
      pageStatus.textContent = 'Unknown';
      pageStatus.style.color = '#92400e';
    }
  }
});
