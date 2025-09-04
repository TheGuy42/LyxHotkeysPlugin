/**
 * Super simple content script test
 */

console.log('🔍 SIMPLE TEST: Script loaded at', new Date().toISOString());
console.log('🔍 SIMPLE TEST: URL:', window.location.href);

try {
  console.log('🔍 SIMPLE TEST: Document ready state:', document.readyState);
  console.log('🔍 SIMPLE TEST: Window object:', typeof window);
  console.log('🔍 SIMPLE TEST: Chrome object:', typeof chrome);
  
  // Add visual indicator
  function addIndicator() {
    // Remove existing indicator first
    const existing = document.getElementById('lyx-extension-indicator');
    if (existing) {
      existing.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.innerHTML = `LyX Extension Loaded!<br>URL: ${window.location.href}<br>Time: ${new Date().toLocaleTimeString()}`;
    indicator.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      background: #00ff00 !important;
      color: black !important;
      padding: 10px !important;
      z-index: 999999 !important;
      border: 2px solid black !important;
      font-family: Arial, sans-serif !important;
      font-size: 12px !important;
      font-weight: bold !important;
      max-width: 300px !important;
      word-wrap: break-word !important;
    `;
    indicator.id = 'lyx-extension-indicator';
    
    // Try multiple approaches to add the element
    if (document.documentElement) {
      document.documentElement.appendChild(indicator);
    } else if (document.body) {
      document.body.appendChild(indicator);
    } else {
      document.appendChild(indicator);
    }
    
    console.log('🔍 SIMPLE TEST: Visual indicator added');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addIndicator);
    document.addEventListener('load', addIndicator);
  } else {
    addIndicator();
  }
  
  // Also try after a delay
  setTimeout(addIndicator, 1000);
  
} catch (error) {
  console.error('🔍 SIMPLE TEST ERROR:', error);
}
