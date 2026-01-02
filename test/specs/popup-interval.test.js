import assert from 'assert';
import { By, until, Key } from 'selenium-webdriver';
import FirefoxExtensionHelper from '../helpers/firefox-extension.js';

describe('PerfChaser Extension - Popup Interval Tests', function() {
  let helper;
  let driver;

  before(async function() {
    helper = new FirefoxExtensionHelper();
    driver = await helper.init();
  });

  after(async function() {
    await helper.quit();
  });

  describe('Update Interval Controls', function() {
    it('should display the update interval number input with correct attributes', async function() {
      await driver.get(helper.popupUrl);

      const input = await driver.findElement(By.css('#update-interval-input'));
      assert.ok(input, 'Update interval input should exist');

      const inputType = await input.getAttribute('type');
      assert.strictEqual(inputType, 'number', 'Input should be type number');

      const value = await input.getAttribute('value');
      assert.strictEqual(value, '5', 'Default interval should be 5 seconds');

      const min = await input.getAttribute('min');
      const max = await input.getAttribute('max');
      assert.strictEqual(min, '1', 'Min interval should be 1 second');
      assert.strictEqual(max, '5', 'Max interval should be 5 seconds');
    });

    it('should allow changing the interval value', async function() {
      await driver.get(helper.popupUrl);

      const input = await driver.findElement(By.css('#update-interval-input'));

      // Clear and set new value
      await input.clear();
      await input.sendKeys('2', Key.RETURN);

      const newValue = await input.getAttribute('value');
      assert.strictEqual(newValue, '2', 'Interval value should be updated to 2');
    });
  });

  describe('Interval Application to Background Script', function() {
    it('should apply interval changes to sidebar updates', async function() {
      // This test verifies that changing the interval in the popup
      // correctly updates the background script's alarm timer

      // Step 1: Set a short interval (1 second) via the popup
      await driver.get(helper.popupUrl);
      const input = await driver.findElement(By.css('#update-interval-input'));
      await input.clear();
      await input.sendKeys('1', Key.RETURN);

      // Step 2: Open sidebar and wait for initial data
      await driver.get(helper.sidebarUrl);
      await driver.wait(async () => {
        const rows = await driver.findElements(By.css('#tbody-processes tr'));
        return rows.length > 0;
      }, 10000, 'Expected initial process data to be loaded');

      // Step 3: Set up a MutationObserver to detect table updates
      await helper.setupTableObserver();

      const startTime = Date.now();

      // Step 4: Wait for a table update to occur
      await driver.wait(async () => {
        const updateCount = await driver.executeScript('return window.__updateCount');
        return updateCount > 0;
      }, 3000, 'Process table should update within 3 seconds with 1s interval');

      const timeElapsed = Date.now() - startTime;

      // The update should happen within ~1-2 seconds (allowing some margin)
      assert.ok(timeElapsed < 2500,
        `Update should occur within ~2 seconds with 1s interval (took ${timeElapsed}ms)`);
    });

    it('should respect longer intervals', async function() {
      // Set interval to 5 seconds
      await driver.get(helper.popupUrl);
      const input = await driver.findElement(By.css('#update-interval-input'));
      await input.clear();
      await input.sendKeys('5', Key.RETURN);

      // Go to sidebar
      await driver.get(helper.sidebarUrl);
      await driver.wait(async () => {
        const rows = await driver.findElements(By.css('#tbody-processes tr'));
        return rows.length > 0;
      }, 10000, 'Sidebar should load data');

      // Set up MutationObserver to count table updates
      await helper.setupTableObserver();

      // Wait for 7 seconds
      await driver.sleep(7000);

      // Check update count - should be at most 2 updates in 7 seconds with 5s interval
      // (one might happen right away, then one at ~5s, possibly one at ~10s but we stop at 7s)
      const updateCount = await driver.executeScript('return window.__updateCount');

      assert.ok(updateCount <= 2,
        `With 5s interval, should have at most 2 updates in 7 seconds (got ${updateCount})`);
    });

    it('should immediately apply interval changes', async function() {
      // This test verifies that changing the interval immediately recreates the alarm
      // rather than waiting for the next scheduled update

      // Start with 5 second interval
      await driver.get(helper.popupUrl);
      let input = await driver.findElement(By.css('#update-interval-input'));
      await input.clear();
      await input.sendKeys('5', Key.RETURN);

      // Wait a moment for the change to apply
      await driver.sleep(500);

      // Change to 1 second interval
      await driver.get(helper.popupUrl);
      input = await driver.findElement(By.css('#update-interval-input'));
      await input.clear();
      await input.sendKeys('1', Key.RETURN);

      // Go to sidebar and set up MutationObserver
      await driver.get(helper.sidebarUrl);
      await driver.wait(async () => {
        const rows = await driver.findElements(By.css('#tbody-processes tr'));
        return rows.length > 0;
      }, 10000, 'Sidebar should load');

      await helper.setupTableObserver();

      // Should receive an update within ~2 seconds, not have to wait 5 seconds
      const startTime = Date.now();
      await driver.wait(async () => {
        const updateCount = await driver.executeScript('return window.__updateCount');
        return updateCount > 0;
      }, 3000, 'Should receive update quickly after interval change');

      const timeElapsed = Date.now() - startTime;

      // Should not have to wait the old 5 second interval
      assert.ok(timeElapsed < 3000,
        `Update should occur within ~2s after changing to 1s interval (took ${timeElapsed}ms)`);
    });
  });
});
