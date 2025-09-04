// Monitor extension status
let extensionActive = false;

// Check if extension is active
function checkExtensionStatus() {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        updateStatusIndicator(false);
      } else if (response) {
        updateStatusIndicator(response.enabled);
      }
    });
  } else {
    updateStatusIndicator(false);
  }
}

function updateStatusIndicator(active) {
  const indicator = document.getElementById('statusIndicator');
  extensionActive = active;
  
  if (active) {
    indicator.textContent = 'Extension Active ✅';
    indicator.className = 'status-indicator status-active';
  } else {
    indicator.textContent = 'Extension Inactive ❌';
    indicator.className = 'status-indicator status-inactive';
  }
}

// Monitor text changes to show LaTeX output
function setupTextMonitoring() {
  const textareas = document.querySelectorAll('.test-textarea, .contenteditable');
  const exampleOutput = document.getElementById('exampleOutput');
  
  textareas.forEach(element => {
    element.addEventListener('input', () => {
      const content = element.value || element.textContent;
      if (content.includes('\\') || content.includes('$')) {
        exampleOutput.textContent = content;
      }
    });
  });
}

// Add helpful instructions
function addInstructions() {
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: #667eea;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
  `;
  instructions.innerHTML = `
    <strong>💡 Testing Tips:</strong><br>
    • Focus on any input field above<br>
    • Try the hotkeys from the green box<br>
    • Check the status indicator (top-right)<br>
    • Open DevTools to see debug info
  `;
  document.body.appendChild(instructions);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    instructions.style.opacity = '0';
    instructions.style.transition = 'opacity 0.5s ease';
    setTimeout(() => instructions.remove(), 500);
  }, 10000);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupTextMonitoring();
  addInstructions();
  
  // Show Mac controls on Mac platforms
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  if (isMac) {
    setupMacTestControls();
  }
  
  // Check status on load and periodically
  checkExtensionStatus();
  setInterval(checkExtensionStatus, 2000);
});

function setupMacTestControls() {
  const macControls = document.getElementById('macTestControls');
  if (macControls) {
    macControls.style.display = 'block';
    
    // Handle Mac mapping preference change
    const macRadios = document.querySelectorAll('input[name="testMacMapping"]');
    macRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked && window.standaloneTestHandler) {
          window.standaloneTestHandler.macMMapping = radio.value;
          window.standaloneTestHandler.setupDefaultMappings();
          console.log(`🍎 Test Mac mapping changed to: ${radio.value}`);
        }
      });
    });
    
    // Handle timeout slider
    const timeoutSlider = document.getElementById('testSequenceTimeout');
    const timeoutDisplay = document.getElementById('testTimeoutValue');
    
    if (timeoutSlider && timeoutDisplay) {
      timeoutSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        timeoutDisplay.textContent = `${value}ms`;
        
        if (window.standaloneTestHandler) {
          window.standaloneTestHandler.sequenceTimeoutDuration = value;
          console.log(`⏱️ Test timeout changed to: ${value}ms`);
        }
      });
    }
  }
}
