const logger = new Logger('popup');

document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');
  const hotkeyCount = document.getElementById('hotkeyCount');
  const pageStatus = document.getElementById('pageStatus');
  const openOptionsBtn = document.getElementById('openOptions');
  const testModeBtn = document.getElementById('testMode');

  updateUI(false, {});

  try {
    const response = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.GET_STATE });
    if (response) {
      updateUI(response.enabled, response.mappings);
    }
  } catch (error) {
    logger.error('Failed to get extension state:', error);
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.ENABLED, STORAGE_KEYS.HOTKEY_MAPPINGS]);
      updateUI(result.enabled ?? false, result.hotkeyMappings || {});
    } catch (storageError) {
      logger.error('Failed to get from storage:', storageError);
    }
  }

  toggleSwitch.addEventListener('click', async () => {
    const response = await chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.TOGGLE_EXTENSION });
    if (response) {
      updateUI(response.enabled, await getCurrentMappings());
    }
  });

  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  testModeBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('test.html') });
    window.close();
  });
  
  const debugBtn = document.createElement('button');
  debugBtn.className = 'btn btn-secondary';
  debugBtn.textContent = 'Debug Keys';
  debugBtn.style.marginTop = '5px';
  debugBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('debug.html') });
    window.close();
  });
  testModeBtn.parentNode.appendChild(debugBtn);

  checkPageCompatibility();

  function updateUI(enabled, mappings) {
    toggleSwitch.classList.toggle('active', enabled);
    status.className = enabled ? 'status enabled' : 'status disabled';
    status.textContent = enabled 
      ? 'Extension is active'
      : 'Extension is disabled';
    const count = mappings ? Object.keys(mappings).length : 0;
    hotkeyCount.textContent = count;
  }

  async function getCurrentMappings() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.HOTKEY_MAPPINGS]);
    return result.hotkeyMappings || {};
  }

  async function checkPageCompatibility() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') ||
          tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
        pageStatus.textContent = 'Not Compatible';
        pageStatus.style.color = '#991b1b';
      } else {
        pageStatus.textContent = 'Compatible';
        pageStatus.style.color = '#2d662d';
      }
    } catch (error) {
      pageStatus.textContent = 'Unknown';
      pageStatus.style.color = '#92400e';
      logger.error("Could not check page compatibility", error);
    }
  }
});
