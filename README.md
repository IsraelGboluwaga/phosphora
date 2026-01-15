# Phosphora

A Chrome extension that automatically detects and highlights Bible verse references on any webpage.

## Features

- **Automatic Detection**: Scans web pages for Bible verse references in various formats (e.g., "John 3:16", "Rom 8:28", "1 Cor 13:4-7")
- **Visual Highlighting**: Wraps detected verses in styled spans with adaptive theming based on page background color
- **Hover Tooltips**: Shows the full verse text when hovering over highlighted references
- **Side Panel**: Click any verse to open a side panel displaying the full text
- **Prefetching**: Automatically prefetches verse text for faster tooltip display
- **Multiple Format Support**: Recognizes full book names, abbreviations, and various verse separators (`:`, `v`, `vs`, `verse`)

## Supported Reference Formats

- `John 3:16` - Standard format
- `Jn 3:16` - Abbreviated book name
- `Romans 8:28-30` - Verse ranges
- `1 Corinthians 13` - Full chapter references
- `Matt 5 v 3` - Alternative verse separator
- `Gen. 1:1` - With period after abbreviation

## Installation

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/phosphora.git
   cd phosphora
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Build the extension:
   ```bash
   yarn build
   ```

4. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Development Mode

For live rebuilding during development:
```bash
yarn dev
```

## Project Structure

```
src/
├── background/        # Service worker for API calls and side panel management
├── content/
│   ├── detector/      # Bible verse detection logic
│   ├── index.ts       # Content script entry point
│   └── styles.css     # Highlight and tooltip styles
├── shared/
│   ├── api/           # Bible API integration (bolls.life)
│   └── constants.ts   # Bible book names and abbreviations
└── sidepanel/         # Side panel UI
```

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and bundler
- **Chrome Extension Manifest V3** - Modern extension APIs
- **bolls.life API** - Bible verse data (NKJV)

## How It Works

1. **Detection**: The content script scans all text nodes on the page using a regex pattern built from known Bible book names and abbreviations
2. **Highlighting**: Detected verses are wrapped in `<span>` elements with appropriate styling. Theme (light/dark) is determined by analyzing the element's effective background color
3. **Prefetching**: On page load, all detected verses are sent to the background script, which fetches them from the API and caches in session storage
4. **Tooltips**: Hovering over a verse shows a tooltip with the full text (served from cache)
5. **Side Panel**: Clicking a verse opens the Chrome side panel with the verse text

## License

MIT
