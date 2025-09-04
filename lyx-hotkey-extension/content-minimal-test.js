/**
 * Minimal content script test
 */

console.log('🔍 Minimal test: Content script loaded!');
console.log('🔍 Minimal test: Chrome available:', typeof chrome);
console.log('🔍 Minimal test: Document state:', document.readyState);

// Test basic functionality
window.addEventListener('load', () => {
  console.log('🔍 Minimal test: Window loaded');
  
  // Create a simple test
  const testDiv = document.createElement('div');
  testDiv.innerHTML = 'LyX Extension Test - Script Loaded Successfully';
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: green;
    color: white;
    padding: 10px;
    z-index: 10000;
    border-radius: 5px;
    font-family: Arial;
    font-size: 12px;
  `;
  document.body.appendChild(testDiv);
  
  console.log('🔍 Minimal test: Test div added to page');
});
