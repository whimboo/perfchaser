# PerfChaser Test Suite

Automated tests for the PerfChaser Firefox extension using Selenium WebDriver and Mocha.

## Prerequisites

- Node.js v16+
- **Firefox Nightly** (or Firefox Developer Edition required for WebExtension Experiments)
  - The test suite automatically detects and uses Firefox Nightly
  - Download from: https://www.mozilla.org/firefox/nightly/
  - Tests automatically start Firefox with `-remote-allow-system-access` flag for WebDriver access

## Installation

```bash
npm install
```

## Running Tests

### Run all tests

```bash
npm test
```

This will:
1. Build the extension (`perfchaser.xpi`)
2. Launch Firefox with the extension installed
3. Run all test specs in `test/specs/`

### Run tests in watch mode

```bash
npm run test:watch
```

Note: You'll need to build the extension first (`npm run build`)

### Run specific test file

```bash
npx mocha --config test/.mocharc.json test/specs/basic.test.js
```

### Debug tests with Node.js debugger

```bash
npm run test:debug
```

This will pause execution at the start. You can then:

**Option 1: Use Chrome DevTools**
1. Open `chrome://inspect` in Chrome/Chromium
2. Click "Open dedicated DevTools for Node"
3. Set breakpoints and resume execution

**Option 2: Use your IDE**
- **VS Code**: The debugger will automatically attach if configured
- **WebStorm/IntelliJ**: Create a Node.js debug configuration pointing to mocha

**Option 3: Debug Firefox extension itself**
To debug the extension code running in Firefox (not the test code):
1. Run tests normally: `npm test`
2. When Firefox launches, open Browser Console: `Cmd+Shift+J` (macOS) or `Ctrl+Shift+J` (Linux/Windows)
3. Use `console.log()` in your extension code
4. Or open Firefox DevTools on the extension pages (sidebar.html, popup.html)

## Writing Tests

### Basic structure

```javascript
import FirefoxExtensionHelper from '../helpers/firefox-extension.js';
import { By } from 'selenium-webdriver';

describe('My Feature', function() {
  let helper, driver;

  before(async function() {
    helper = new FirefoxExtensionHelper();
    driver = await helper.init();
  });

  after(async function() {
    await helper.quit();
  });

  it('should test something', async function() {
    await helper.navigateToSidebar();
    const element = await driver.findElement(By.css('#my-element'));
    // assertions...
  });
});
```

### Available helper methods

- `helper.init()` - Initialize Firefox with extension loaded
- `helper.navigateToSidebar()` - Navigate to sidebar page
- `helper.navigateToPopup()` - Navigate to popup page
- `helper.takeScreenshot(name)` - Capture screenshot for debugging
- `helper.quit()` - Close browser and cleanup

## Troubleshooting

### "Extension not found" error

Run `npm run build` to create the XPI file.

### Tests timeout

- Increase timeout in `test/.mocharc.json`
- Ensure Firefox Nightly/Developer Edition is installed
- Check that extension loaded correctly (look for errors in test output)

### Firefox Nightly not found

The test helper automatically detects Firefox Nightly in common installation locations:

**macOS:**
- `/Applications/Firefox Nightly.app/Contents/MacOS/firefox`
- `~/Applications/Firefox Nightly.app/Contents/MacOS/firefox`

**Linux:**
- `/usr/bin/firefox-nightly`
- `/usr/local/bin/firefox-nightly`
- `/opt/firefox-nightly/firefox`
- `~/.local/bin/firefox-nightly`

**Windows:**
- `C:\Program Files\Firefox Nightly\firefox.exe`
- `C:\Program Files (x86)\Firefox Nightly\firefox.exe`
- `%LOCALAPPDATA%\Firefox Nightly\firefox.exe`

If Firefox Nightly is installed elsewhere, set the `FIREFOX_BINARY` environment variable:

```bash
# macOS/Linux
export FIREFOX_BINARY=/path/to/firefox-nightly
npm test

# Windows
set FIREFOX_BINARY=C:\path\to\firefox.exe
npm test
```

## Project Structure

```text
test/
├── helpers/
│   └── firefox-extension.js   # WebDriver setup and utilities
├── specs/
│   └── basic.test.js          # Test specifications
├── screenshots/               # Debug screenshots (auto-created)
├── .mocharc.json              # Mocha configuration
├── .gitignore                 # Ignore test artifacts
└── README.md                  # This file
```

## Selenium WebDriver Resources

- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/webdriver/)
- [selenium-webdriver npm package](https://www.npmjs.com/package/selenium-webdriver)
- [Mocha Documentation](https://mochajs.org/)
