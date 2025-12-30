import { Builder } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { ServiceBuilder } from 'selenium-webdriver/firefox.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fxRunner from 'fx-runner/lib/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EXTENSION_PATH = path.join(PROJECT_ROOT, 'src');

/**
 * Helper class for managing Firefox WebDriver with PerfChaser extension loaded
 */
class FirefoxExtensionHelper {
  #baseUrl;
  #driver;
  #extensionId;
  #internalId;

  constructor() {
    this.#extensionId = 'perfchaser@hskupin.info';

    this.#baseUrl = null;
    this.#driver = null;
    this.#internalId = null;
  }

  get internalId() {
    return this.#internalId;
  }

  get popupUrl() {
    if (!this.#driver) {
      throw new Error(`No driver created yet`);
    }

    return `${this.#baseUrl}/popup.html`;
  }

  get sidebarUrl() {
    if (!this.#driver) {
      throw new Error(`No driver created yet`);
    }

    return `${this.#baseUrl}/sidebar.html`;
  }

  /**
   * Detect Firefox Nightly binary path using fx-runner utilities.
   *
   * @returns {Promise<string|null>}
   *     Promise that resolves to Firefox Nightly binary,
   *     or null if not found.
   */
  async detectFirefoxNightly() {
    try {
      const firefoxPath = await fxRunner.normalizeBinary('nightly');

      // Verify the binary exists
      if (firefoxPath && fs.existsSync(firefoxPath)) {
        return firefoxPath;
      }

      return null;
    } catch (error) {
      // If fx-runner cannot find Firefox Nightly, return null
      console.debug(`fx-runner could not find Firefox Nightly: ${error.message}`);
      return null;
    }
  }

  /**
   * Initialize Firefox WebDriver with extension loaded
   *
   * @returns {Promise<WebDriver>}
   *     The WebDriver instance
   */
  async init() {
    // Verify extension source directory exists
    if (!fs.existsSync(EXTENSION_PATH)) {
      throw new Error(
        `Extension source directory not found: ${EXTENSION_PATH}`
      );
    }

    // Configure Firefox options
    const options = new firefox.Options();

    // Set Firefox preferences required for WebExtension Experiments
    options.setPreference('extensions.experiments.enabled', true);
    options.setPreference('xpinstall.signatures.required', false);

    // Add command-line arguments
    options.addArguments('-remote-allow-system-access');

    // Use Firefox Nightly by default (required for WebExtension Experiments)
    // Can be overridden with FIREFOX_BINARY environment variable
    const firefoxBinary = process.env.FIREFOX_BINARY || await this.detectFirefoxNightly();

    if (firefoxBinary) {
      console.log(`Using Firefox binary: ${firefoxBinary}`);
      options.setBinary(firefoxBinary);
    } else {
      console.warn('Warning: Firefox Nightly not found. Falling back to default Firefox.');
      console.warn('Tests may fail if default Firefox does not support WebExtension Experiments.');
      console.warn('Set FIREFOX_BINARY environment variable to specify Firefox Nightly path.');
    }

    // Configure geckodriver service to output logs to console
    const service = new ServiceBuilder()
      .setStdio('inherit')  // Pipe geckodriver output to console
      .enableVerboseLogging(true);  // Enable trace-level logging

    // Build WebDriver instance
    this.#driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .setFirefoxService(service)
      .build();

    // Temporary install the extension
    await this.#driver.installAddon(EXTENSION_PATH, true);
    
    // Initialize internal states
    this.#internalId = await this.#getInternalUUID();
    this.#baseUrl = `moz-extension://${this.#internalId}/content`;

    return this.#driver;
  }

  /**
   * Take screenshot for debugging.
   *
   * @param {string} name - Name for the screenshot file
   */
  async takeScreenshot(name) {
    const screenshotDir = path.join(PROJECT_ROOT, 'test', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = path.join(screenshotDir, `${name}-${timestamp}.png`);

    const image = await this.#driver.takeScreenshot();
    fs.writeFileSync(filename, image, 'base64');
    console.log(`Screenshot saved: ${filename}`);
  }

  /**
   * Cleanup - quit driver
   */
  async quit() {
    if (this.#driver) {
      await this.#driver.quit();

      this.#driver = null;
    }
  }

  /**
   * Get internal extension UUID from Firefox.
   *
   * @returns {Promise<string>}
   *     Promise that resolves to the internal UUID.
   */
  async #getInternalUUID() {
    let uuid;

    // Execute script in browser context to find extension UUID
    await this.#driver.setContext('chrome');
    try {
      uuid = await this.#driver.executeScript(`
        const { ExtensionParent } =
          ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs");

        const extension = ExtensionParent.GlobalManager.getExtension('${this.#extensionId}');
        if (extension) {
          return extension.uuid;
        } else {
          throw new Error('Extension with id "${this.#extensionId}" not found');
        }
      `);
    } finally {
      await this.#driver.setContext('content');
    }

    if (!uuid) {
      throw new Error('Could not determine extension internal UUID');
    }

    return uuid;
  }
}

export default FirefoxExtensionHelper;
