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
    const processInfo = await browser.processes.getProcessInfo();

    // Use a flattened process list
    this.processes = new Map();
    this.processes.set(processInfo.pid, processInfo);
    processInfo.children.forEach(child => {
      this.processes.set(child.pid, child);
    });

    await browser.runtime.sendMessage({
      processes: this.processes,
    });
  }
}

const taskManager = new TaskManager();
