#!/usr/bin/env node

/**
 * Validation script to verify all fixes are in place for Chrome extension loading
 */

const fs = require('fs');
const path = require('path');

const extensionPath = path.join(__dirname, 'lyx-hotkey-extension');

console.log('🔍 Validating Chrome Extension Fixes...\n');

// Test 1: Check for identifier conflicts
console.log('1. Checking for logger identifier conflicts...');
const conflictFiles = [
    'core/message-handler.js',
    'core/state-manager.js', 
    'content.js'
];

let hasConflicts = false;
conflictFiles.forEach(file => {
    const filePath = path.join(extensionPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for problematic "let logger;" declarations
    if (content.includes('let logger;')) {
        console.log(`   ❌ Found "let logger;" in ${file}`);
        hasConflicts = true;
    } else {
        console.log(`   ✅ No "let logger;" conflicts in ${file}`);
    }
});

if (!hasConflicts) {
    console.log('   ✅ All identifier conflicts resolved\n');
} else {
    console.log('   ❌ Identifier conflicts still exist\n');
    process.exit(1);
}

// Test 2: Check service worker exports
console.log('2. Checking service worker context exports...');
const serviceWorkerFiles = [
    'utils/logger.js',
    'core/state-manager.js',
    'core/message-handler.js',
    'lyx-parser.js'
];

let hasServiceWorkerExports = true;
serviceWorkerFiles.forEach(file => {
    const filePath = path.join(extensionPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('self.LyX')) {
        console.log(`   ✅ Service worker exports found in ${file}`);
    } else {
        console.log(`   ❌ Missing service worker exports in ${file}`);
        hasServiceWorkerExports = false;
    }
});

if (hasServiceWorkerExports) {
    console.log('   ✅ All service worker exports present\n');
} else {
    console.log('   ❌ Missing service worker exports\n');
    process.exit(1);
}

// Test 3: Check background.js compatibility
console.log('3. Checking background.js service worker compatibility...');
const backgroundPath = path.join(extensionPath, 'background.js');
const backgroundContent = fs.readFileSync(backgroundPath, 'utf8');

const checks = [
    { pattern: 'getLoggerModule', description: 'Logger module getter' },
    { pattern: 'getStateManagerModule', description: 'State manager module getter' },
    { pattern: 'getMessageHandlerModule', description: 'Message handler module getter' },
    { pattern: 'getConfigParserModule', description: 'Config parser module getter' }
];

let backgroundValid = true;
checks.forEach(check => {
    if (backgroundContent.includes(check.pattern)) {
        console.log(`   ✅ ${check.description} present`);
    } else {
        console.log(`   ❌ ${check.description} missing`);
        backgroundValid = false;
    }
});

if (backgroundValid) {
    console.log('   ✅ Background.js service worker compatibility ensured\n');
} else {
    console.log('   ❌ Background.js service worker compatibility issues\n');
    process.exit(1);
}

// Test 4: Check manifest.json structure
console.log('4. Checking manifest.json structure...');
const manifestPath = path.join(extensionPath, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version === 3) {
    console.log('   ✅ Using Manifest V3');
} else {
    console.log('   ❌ Not using Manifest V3');
    process.exit(1);
}

if (manifest.background && manifest.background.service_worker) {
    console.log('   ✅ Service worker configured');
} else {
    console.log('   ❌ Service worker not configured');
    process.exit(1);
}

if (manifest.content_scripts && manifest.content_scripts.length > 0) {
    const contentScript = manifest.content_scripts[0];
    const expectedOrder = [
        'utils/logger.js',
        'core/state-manager.js',
        'core/message-handler.js',
        'hotkeys/key-detector.js',
        'hotkeys/action-executor.js',
        'hotkeys/mapping-manager.js',
        'content.js'
    ];
    
    const actualOrder = contentScript.js;
    const orderCorrect = JSON.stringify(expectedOrder) === JSON.stringify(actualOrder);
    
    if (orderCorrect) {
        console.log('   ✅ Content script loading order correct');
    } else {
        console.log('   ❌ Content script loading order incorrect');
        console.log('   Expected:', expectedOrder);
        console.log('   Actual:', actualOrder);
        process.exit(1);
    }
} else {
    console.log('   ❌ Content scripts not configured');
    process.exit(1);
}

console.log('   ✅ Manifest.json structure valid\n');

// Test 5: Syntax validation
console.log('5. Validating JavaScript syntax...');
const jsFiles = [
    'background.js',
    'content.js',
    'utils/logger.js',
    'core/state-manager.js',
    'core/message-handler.js',
    'hotkeys/key-detector.js',
    'hotkeys/action-executor.js',
    'hotkeys/mapping-manager.js',
    'lyx-parser.js'
];

let syntaxValid = true;
jsFiles.forEach(file => {
    try {
        const filePath = path.join(extensionPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic syntax check using Function constructor
        new Function(content);
        console.log(`   ✅ ${file} syntax valid`);
        
    } catch (error) {
        console.log(`   ❌ ${file} syntax error: ${error.message}`);
        syntaxValid = false;
    }
});

if (syntaxValid) {
    console.log('   ✅ All JavaScript files have valid syntax\n');
} else {
    console.log('   ❌ JavaScript syntax errors found\n');
    process.exit(1);
}

// Final summary
console.log('🎉 All validation checks passed!\n');
console.log('✅ The Chrome extension should now load without errors');
console.log('✅ No "logger identifier already declared" conflicts');
console.log('✅ Service worker context properly supported');
console.log('✅ Background.js compatible with service worker environment');
console.log('✅ All JavaScript syntax is valid');
console.log('');
console.log('🚀 Ready for Chrome extension testing!');
console.log('   1. Open Chrome and navigate to chrome://extensions/');
console.log('   2. Enable Developer mode');
console.log('   3. Click "Load unpacked" and select the lyx-hotkey-extension folder');
console.log('   4. Check for any red error messages');
console.log('   5. Test the extension functionality');
console.log('');
console.log('📝 Use the test-extension.html file to test hotkey functionality');