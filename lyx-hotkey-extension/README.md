# LyX Hotkey Extension for Chrome

A Chrome extension that replicates LyX hotkey behavior in web browsers, allowing you to use familiar LyX shortcuts in any text field, textarea, or content-editable element.

## Features

- **LyX Configuration Parsing**: Load and parse LyX `.bind` files
- **Multi-key Sequences**: Support for complex key combinations like in LyX
- **Text Insertion**: Insert LaTeX commands, Greek letters, and special characters
- **Text Formatting**: Wrap selected text with formatting (bold, italic, math mode, etc.)
- **Navigation & Editing**: Cursor movement, selection, and deletion commands
- **Universal Compatibility**: Works in text inputs, textareas, and content-editable elements
- **Easy Configuration**: Upload your LyX config files or use the built-in editor

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked" and select the extension directory
5. The extension should now appear in your extensions list

### Icon Setup (Optional)

The extension includes placeholder PNG icons. For production use, convert the included SVG icon to proper PNG files:

```bash
# If you have ImageMagick installed:
convert -density 300 icons/icon.svg -resize 16x16 icons/icon16.png
convert -density 300 icons/icon.svg -resize 32x32 icons/icon32.png
convert -density 300 icons/icon.svg -resize 48x48 icons/icon48.png
convert -density 300 icons/icon.svg -resize 128x128 icons/icon128.png
```

## Usage

### Basic Setup

1. **Install the extension** (see above)
2. **Click the extension icon** in the toolbar to open the popup
3. **Configure hotkeys** by clicking "Configure Hotkeys" or use the default set

### Loading LyX Configuration

1. Open the extension options page
2. Either:
   - **Upload a file**: Drag and drop your LyX `.bind` file, or click "Browse Files"
   - **Paste content**: Copy your LyX configuration and paste it in the text area
   - **Use sample**: Click "Load Sample Config" for a basic setup

### Using Hotkeys

1. **Focus on any editable field** (input, textarea, contentEditable)
2. **Press your configured hotkeys**
3. **See the magic happen!**

### Default Hotkeys

The extension comes with these default hotkeys:

| Hotkey | Action | Result |
|--------|--------|--------|
| `Ctrl+B` | Bold | Wraps selection with `**text**` |
| `Ctrl+E` | Emphasis | Wraps selection with `*text*` |
| `Ctrl+U` | Underline | Wraps selection with `_text_` |
| `Ctrl+Shift+P` | Code | Wraps selection with `` `text` `` |
| `Ctrl+M` | Math mode | Wraps selection with `$text$` |
| `Ctrl+Shift+M` | Display math | Wraps selection with `$$\ntext\n$$` |
| `Ctrl+L` | LaTeX command | Inserts `\` prefix |
| `Alt+G` | Greek alpha | Inserts `\alpha` |
| `Alt+P` | Greek pi | Inserts `\pi` |
| `Alt+Space` | Non-breaking space | Inserts `\u00A0` |

## LyX Configuration Format

The extension parses standard LyX `.bind` files. Here's the basic format:

```
# Comments start with #
\bind "key-sequence" "command"
```

### Key Modifiers

- `C-` = Ctrl
- `M-` = Meta (Cmd on Mac, Alt on others)  
- `A-` = Alt
- `S-` = Shift
- `~S-` = Not Shift

### Examples

```
# Text formatting
\bind "C-b" "font-bold"
\bind "C-e" "font-emph"
\bind "C-u" "font-underline"

# Math mode
\bind "C-m" "math-mode"
\bind "C-S-M" "math-display"

# Greek letters
\bind "A-g" "math-insert \\alpha"
\bind "A-p" "math-insert \\pi"

# Special characters
\bind "A-space" "space-insert protected"
\bind "C-period" "specialchar-insert end-of-sentence"
```

## Supported Commands

### Text Formatting
- `font-bold` → `**text**`
- `font-emph` → `*text*`
- `font-underline` → `_text_`
- `font-typewriter` → `` `text` ``
- `font-strikeout` → `~~text~~`

### Math Mode
- `math-mode` → `$text$`
- `math-display` → `$$\ntext\n$$`

### Text Insertion
- `ert-insert` → `\` (LaTeX command prefix)
- `quote-insert inner` → `"`
- `specialchar-insert end-of-sentence` → `. `
- `space-insert protected` → Non-breaking space

### Navigation
- `char-forward`, `char-backward`
- `word-right`, `word-left`
- `line-begin`, `line-end`
- `buffer-begin`, `buffer-end`

### Deletion
- `char-delete-forward`, `char-delete-backward`
- `word-delete-forward`, `word-delete-backward`
- `line-delete-forward`

## Testing

The extension includes a test page accessible via:
1. Click the extension icon
2. Click "Test Mode"
3. Try your hotkeys in the various input fields

## Development

### File Structure

```
lyx-hotkey-extension/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script (main hotkey logic)
├── lyx-parser.js         # LyX configuration parser
├── popup.html/js         # Extension popup interface
├── options.html/js       # Configuration page
├── test.html            # Testing page
├── icons/               # Extension icons
└── README.md           # This file
```

### Key Components

1. **LyX Parser** (`lyx-parser.js`): Parses LyX `.bind` files and converts commands to actions
2. **Hotkey Handler** (`content.js`): Detects key sequences and executes actions
3. **Background Script** (`background.js`): Manages extension state and communication
4. **Options Page** (`options.html`): Configuration interface

### Adding New Commands

To add support for new LyX commands:

1. Update the `convertCommand()` method in `lyx-parser.js`
2. Add the corresponding action handler in `content.js`
3. Test with a sample configuration

## Troubleshooting

### Extension Not Working

1. **Check if enabled**: Click the extension icon and ensure it's toggled on
2. **Check page compatibility**: The extension only works on regular web pages (not chrome:// pages)
3. **Reload the page**: Try refreshing the page after enabling the extension

### Hotkeys Not Triggering

1. **Focus an editable element**: Make sure you're in a text input, textarea, or contentEditable
2. **Check for conflicts**: Some hotkeys might conflict with browser shortcuts
3. **Check timing**: Multi-key sequences have a 1-second timeout

### Configuration Issues

1. **Parse errors**: Check the console for parsing errors in your LyX config
2. **Invalid commands**: Not all LyX commands are supported yet
3. **Key format**: Ensure key sequences follow the LyX format

## Limitations

- **Browser shortcuts**: Some key combinations are reserved by the browser
- **Content Security Policy**: May not work on pages with strict CSP
- **Complex commands**: Some advanced LyX features aren't supported yet
- **Clipboard operations**: Limited clipboard access in content scripts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to modify and distribute.

## Changelog

### v1.0.0
- Initial release
- Basic LyX hotkey support
- Configuration file parsing
- Text insertion and formatting
- Options page and test interface
