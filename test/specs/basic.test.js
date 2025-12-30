import assert from 'assert';
import { By, until } from 'selenium-webdriver';
import FirefoxExtensionHelper from '../helpers/firefox-extension.js';

describe('PerfChaser Extension - Basic Tests', function() {
  let helper;
  let driver;

  before(async function() {
    helper = new FirefoxExtensionHelper();
    driver = await helper.init();
  });

  after(async function() {
    await helper.quit();
  });

  describe('Extension Installation', function() {
    it('should load the sidebar page', async function() {
      await driver.get(helper.sidebarUrl);

      // Verify page loaded by checking body element exists
      const body = await driver.findElement(By.css('body'));
      assert.ok(body, 'Sidebar body element should exist');
    });

    it('should display the process table', async function() {
      await driver.get(helper.sidebarUrl);

      // Wait for table to be present
      const table = await driver.wait(
        until.elementLocated(By.css('#tbody-processes')),
        10000,
        'Process table should be present'
      );

      assert.ok(table, 'Process table element should exist');
    });

    it('should display CPU history chart', async function() {
      await driver.get(helper.sidebarUrl);

      // Check for SVG chart element
      const chart = await driver.findElement(By.css('#history-chart'));
      const isDisplayed = await chart.isDisplayed();

      assert.ok(isDisplayed, 'CPU history chart should be displayed');
    });

    it('should load the popup page', async function() {
      await driver.get(helper.popupUrl);

      // Verify page loaded by checking body element exists
      const body = await driver.findElement(By.css('body'));
      assert.ok(body, 'Popup body element should exist');
    });

    it('should display the update interval controls', async function() {
      await driver.get(helper.popupUrl);

      // Check for interval slider
      const slider = await driver.findElement(By.css('#update-interval-slider'));
      assert.ok(slider, 'Update interval slider should exist');

      // Check for interval value display
      const value = await driver.findElement(By.css('#update-interval-value'));
      assert.ok(value, 'Update interval value display should exist');
    });
  });

  describe('Process Data Collection', function() {
    it('should collect and display process data', async function() {
      await driver.get(helper.sidebarUrl);

      // Wait up to 15 seconds for process data to load
      await driver.wait(async () => {
        const rows = await driver.findElements(By.css('#tbody-processes tr'));
        return rows.length > 0;
      }, 15000, 'Expected process data to be loaded');

      const rows = await driver.findElements(By.css('#tbody-processes tr'));
      assert.ok(rows.length > 0, 'Should have at least one process row');
    });
  });
});
