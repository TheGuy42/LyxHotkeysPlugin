# Testing the LyX Extension

## Current Issues & Solutions

### Issue 1: Content Script Not Running on File URLs
Chrome extensions don't run content scripts on `file://` URLs by default. 

**Solution**: The test page now includes a standalone test script that simulates the extension behavior.

### Issue 2: Mac Key Bindings
Mac Command key (⌘) conflicts with system shortcuts like ⌘+M (minimize window).

**Current Solution**: The extension maps LyX `M-` to `Ctrl+` instead of `Meta+` for practicality.

**Alternative Solution**: Add option to override system shortcuts (requires more complex implementation).

## Testing Steps

1. **Open Test Page**: 
   - Open `file:///Users/guycohen/Downloads/LyxPlugin/lyx-hotkey-extension/test.html`
   - You should see a blue indicator saying "🧪 Standalone LyX Test Mode Active"

2. **Open Developer Console**:
   - Right-click → Inspect → Console tab
   - This will show detailed logging of key detection and action execution

3. **Test Math Mode**:
   - Click in any text input field
   - Press `Ctrl+M` (not ⌘+M)
   - Should wrap selected text with `$` signs or insert `$$` if nothing selected
   - Watch console for detailed logs

4. **Test Greek Letters**:
   - Press `Alt+M` → should insert `\mu`
   - Press `Alt+G` → should insert `\alpha`
   - Press `Alt+P` → should insert `\pi`

5. **Test Text Formatting**:
   - Press `Ctrl+B` → should wrap with `**bold**`
   - Press `Ctrl+E` → should wrap with `*italic*`

## Expected Console Output

When pressing `Ctrl+M`, you should see:
```
🔑 Test handler: Keydown detected: {key: "m", ctrl: true, ...}
🔑 Test handler: Generated combo: "ctrl+m"
🔍 Test handler: Processing key combo: "ctrl+m"
🎯 Test handler: Full sequence: "ctrl+m"
🎬 Test handler: Action found: {type: "wrap", before: "$", after: "$"}
✅ Test handler: Executing action for "ctrl+m"
🎁 Test handler: Wrapping with: "$" ... "$"
✅ Test handler: Text wrapped with "$" ... "$"
```

## Troubleshooting

### No Console Output on Keypress
- Make sure you clicked in a text input field first
- Check that the blue test indicator is visible
- Try refreshing the page

### Keys Not Working as Expected
- On Mac, use `Ctrl` not `⌘` for LyX `M-` bindings
- Make sure to focus on an editable element (input, textarea)
- Check console for error messages

### Extension vs Standalone Mode
- The standalone test script simulates extension behavior for testing
- Once the extension is properly installed, it should work on all web pages
- File URLs require special permission in Chrome extension settings

## Next Steps

1. Test the standalone version first to verify the logic works
2. Fix any issues found in testing
3. Test the actual extension on a real website (not file://)
4. Add options for Mac key binding preferences
