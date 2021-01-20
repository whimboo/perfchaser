// TODO: read from settings
const TIME_UPDATE_INTERVAL = 2; // seconds


class TaskManager extends Object {
  constructor() {
    super();

    this.processes = new Map();

    browser.alarms.onAlarm.addListener(this.updateProcessInfo.bind(this));
    browser.alarms.create("get-process-info", {
      when: Date.now(),
      periodInMinutes: TIME_UPDATE_INTERVAL / 60,
    });
  }

  async updateProcessInfo() {
    this.processes = await browser.processes.getProcessInfo();

    await browser.runtime.sendMessage({
      processes: this.processes,
    });
  }
}

const taskManager = new TaskManager();
