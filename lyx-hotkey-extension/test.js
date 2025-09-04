/**
 * Test Suite for Refactored LyX Hotkey Extension
 * Verify that all functionality works correctly
 */

class RefactoredExtensionTester {
  constructor() {
    this.tests = [];
    this.results = [];
    this.setupTestEnvironment();
  }

  setupTestEnvironment() {
    // Create test elements
    this.createTestElements();
    
    // Setup test reporting
    this.setupReporting();
    
    console.log('🧪 LyX Extension Test Suite: Environment ready');
  }

  createTestElements() {
    // Create test input field
    const testInput = document.createElement('textarea');
    testInput.id = 'testTextarea';
    testInput.placeholder = 'Test area for LyX hotkeys...';
    testInput.style.cssText = `
      width: 100%;
      height: 200px;
      margin: 20px 0;
      padding: 10px;
      border: 2px solid #667eea;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
    `;
    document.body.appendChild(testInput);

    // Create contenteditable div
    const testDiv = document.createElement('div');
    testDiv.id = 'testContentEditable';
    testDiv.contentEditable = true;
    testDiv.innerHTML = 'Test contenteditable area...';
    testDiv.style.cssText = `
      width: 100%;
      min-height: 100px;
      margin: 20px 0;
      padding: 10px;
      border: 2px solid #48bb78;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
    `;
    document.body.appendChild(testDiv);

    // Focus on test input
    testInput.focus();
  }

  setupReporting() {
    const reportingDiv = document.createElement('div');
    reportingDiv.id = 'testReporting';
    reportingDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
    `;
    reportingDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #333;">🧪 Extension Tests</h3>
      <div id="testResults"></div>
      <button id="runTests" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
        width: 100%;
      ">Run All Tests</button>
    `;
    document.body.appendChild(reportingDiv);

    document.getElementById('runTests').addEventListener('click', () => {
      this.runAllTests();
    });
  }

  addTest(name, testFunction) {
    this.tests.push({ name, test: testFunction });
  }

  async runAllTests() {
    console.log('🧪 Running all tests...');
    this.results = [];
    
    const resultsDiv = document.getElementById('testResults');
    resultsDiv.innerHTML = '<p>Running tests...</p>';

    for (const { name, test } of this.tests) {
      try {
        const result = await test();
        this.results.push({ name, passed: true, result });
        console.log(`✅ ${name}: PASSED`);
      } catch (error) {
        this.results.push({ name, passed: false, error: error.message });
        console.error(`❌ ${name}: FAILED -`, error);
      }
    }

    this.displayResults();
  }

  displayResults() {
    const resultsDiv = document.getElementById('testResults');
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;

    let html = `<p><strong>${passed}/${total} tests passed</strong></p>`;
    
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? '#48bb78' : '#f56565';
      html += `
        <div style="margin: 5px 0; color: ${color};">
          ${icon} ${result.name}
          ${result.error ? `<br><small style="color: #666;">${result.error}</small>` : ''}
        </div>
      `;
    });

    resultsDiv.innerHTML = html;
  }

  // Test methods
  testExtensionInitialization() {
    return new Promise((resolve, reject) => {
      if (typeof window.lyxHotkeyExtension === 'undefined') {
        reject(new Error('Extension not initialized'));
        return;
      }

      const status = window.lyxHotkeyExtension.getStatus();
      if (!status.initialized) {
        reject(new Error('Extension not properly initialized'));
        return;
      }

      resolve('Extension initialized successfully');
    });
  }

  testEventManagerPresence() {
    return new Promise((resolve, reject) => {
      if (typeof EventManager === 'undefined') {
        reject(new Error('EventManager not available'));
        return;
      }

      const eventManager = new EventManager();
      if (typeof eventManager.on !== 'function') {
        reject(new Error('EventManager methods not available'));
        return;
      }

      resolve('EventManager is functional');
    });
  }

  testElementDetection() {
    return new Promise((resolve, reject) => {
      const textarea = document.getElementById('testTextarea');
      if (!textarea) {
        reject(new Error('Test textarea not found'));
        return;
      }

      textarea.focus();
      
      setTimeout(() => {
        const extension = window.lyxHotkeyExtension;
        if (!extension) {
          reject(new Error('Extension not available'));
          return;
        }

        const status = extension.getStatus();
        if (!status.hasActiveElement) {
          reject(new Error('Active element not detected'));
          return;
        }

        resolve('Element detection working');
      }, 100);
    });
  }

  testBasicHotkey() {
    return new Promise((resolve, reject) => {
      const textarea = document.getElementById('testTextarea');
      if (!textarea) {
        reject(new Error('Test textarea not found'));
        return;
      }

      textarea.focus();
      textarea.value = '';

      // Simulate Ctrl+M (math mode)
      const event = new KeyboardEvent('keydown', {
        key: 'm',
        code: 'KeyM',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });

      textarea.dispatchEvent(event);

      setTimeout(() => {
        if (textarea.value === '$$') {
          resolve('Basic hotkey working');
        } else {
          reject(new Error(`Expected '$$', got '${textarea.value}'`));
        }
      }, 200);
    });
  }

  testSequenceHotkey() {
    return new Promise((resolve, reject) => {
      const textarea = document.getElementById('testTextarea');
      if (!textarea) {
        reject(new Error('Test textarea not found'));
        return;
      }

      textarea.focus();
      textarea.value = '';

      // Simulate Ctrl+L (LaTeX prefix)
      let event1 = new KeyboardEvent('keydown', {
        key: 'l',
        code: 'KeyL',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });

      textarea.dispatchEvent(event1);

      setTimeout(() => {
        // Then 'a' for alpha
        let event2 = new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
          bubbles: true,
          cancelable: true
        });

        textarea.dispatchEvent(event2);

        setTimeout(() => {
          if (textarea.value === '\\alpha') {
            resolve('Sequence hotkey working');
          } else {
            reject(new Error(`Expected '\\alpha', got '${textarea.value}'`));
          }
        }, 200);
      }, 200);
    });
  }

  testConfigurationLoad() {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        reject(new Error('Chrome runtime not available'));
        return;
      }

      chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Failed to communicate with background script'));
          return;
        }

        if (!response) {
          reject(new Error('No response from background script'));
          return;
        }

        if (!response.mappings || Object.keys(response.mappings).length === 0) {
          reject(new Error('No mappings loaded'));
          return;
        }

        resolve(`Configuration loaded with ${Object.keys(response.mappings).length} mappings`);
      });
    });
  }

  testContentEditableSupport() {
    return new Promise((resolve, reject) => {
      const div = document.getElementById('testContentEditable');
      if (!div) {
        reject(new Error('Test contenteditable not found'));
        return;
      }

      div.focus();
      
      // Clear content
      div.innerHTML = '';

      // Simulate Ctrl+B (bold)
      const event = new KeyboardEvent('keydown', {
        key: 'b',
        code: 'KeyB',
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      });

      div.dispatchEvent(event);

      setTimeout(() => {
        if (div.textContent === '****') {
          resolve('ContentEditable support working');
        } else {
          reject(new Error(`Expected '****', got '${div.textContent}'`));
        }
      }, 200);
    });
  }

  // Initialize and run tests
  init() {
    // Add all tests
    this.addTest('Extension Initialization', () => this.testExtensionInitialization());
    this.addTest('EventManager Presence', () => this.testEventManagerPresence());
    this.addTest('Element Detection', () => this.testElementDetection());
    this.addTest('Basic Hotkey (Ctrl+M)', () => this.testBasicHotkey());
    this.addTest('Sequence Hotkey (Ctrl+L A)', () => this.testSequenceHotkey());
    this.addTest('Configuration Load', () => this.testConfigurationLoad());
    this.addTest('ContentEditable Support', () => this.testContentEditableSupport());

    console.log('🧪 LyX Extension Test Suite: Ready with', this.tests.length, 'tests');
    
    // Auto-run tests after a delay to let extension initialize
    setTimeout(() => {
      console.log('🧪 Auto-running tests...');
      this.runAllTests();
    }, 2000);
  }
}

// Initialize tester when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.extensionTester = new RefactoredExtensionTester();
    window.extensionTester.init();
  });
} else {
  window.extensionTester = new RefactoredExtensionTester();
  window.extensionTester.init();
}
