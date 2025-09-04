/**
 * Test Page JavaScript - moved from inline to fix CSP
 */

function showDebugInfo() {
    const debugDiv = document.getElementById('debugInfo');
    
    if (typeof window.lyxHotkeyExtension !== 'undefined') {
        const status = window.lyxHotkeyExtension.getStatus();
        debugDiv.innerHTML = `
            <strong>Extension Status:</strong><br>
            Initialized: ${status.initialized}<br>
            Has Active Element: ${status.hasActiveElement}<br>
            Last Active Element: ${status.lastActiveElement || 'None'}<br><br>
            
            <strong>Available Modules:</strong><br>
            EventManager: ${typeof EventManager !== 'undefined'}<br>
            KeySequenceHandler: ${typeof KeySequenceHandler !== 'undefined'}<br>
            ActionExecutor: ${typeof ActionExecutor !== 'undefined'}<br>
            ElementDetector: ${typeof ElementDetector !== 'undefined'}<br><br>
            
            <strong>Extension Instance:</strong><br>
            ${JSON.stringify(status, null, 2)}
        `;
    } else {
        debugDiv.innerHTML = `
            <strong style="color: red;">Extension not loaded</strong><br>
            Make sure the extension is properly loaded
        `;
    }
    
    debugDiv.style.display = debugDiv.style.display === 'none' ? 'block' : 'none';
}

// Monitor extension status
function checkExtensionStatus() {
    const indicator = document.getElementById('statusIndicator');
    
    if (typeof window.lyxHotkeyExtension !== 'undefined') {
        const status = window.lyxHotkeyExtension.getStatus();
        if (status.initialized) {
            indicator.textContent = 'Extension Active ✅';
            indicator.className = 'status-indicator status-active';
        } else {
            indicator.textContent = 'Extension Loading... 🔄';
            indicator.className = 'status-indicator status-inactive';
        }
    } else {
        indicator.textContent = 'Extension Not Loaded ❌';
        indicator.className = 'status-indicator status-inactive';
    }
}

// Check status periodically
setInterval(checkExtensionStatus, 1000);

// Initial check
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkExtensionStatus, 500);
    
    // Add event listener to debug button
    const debugButton = document.getElementById('debugButton');
    if (debugButton) {
        debugButton.addEventListener('click', showDebugInfo);
    }
});
