// TODO: read from settings
const TIME_UPDATE_INTERVAL = 5; // seconds


class TaskManager extends Object {
  constructor() {
    super();

    this.processes = new Map();

    browser.alarms.onAlarm.addListener(this.updateProcessInfo.bind(this));
    browser.alarms.create("get-process-info", {
      when: Date.now(),
      periodInMinutes: TIME_UPDATE_INTERVAL / 60,
    });

    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }

  async handleMessage(request) {
    switch (request.name) {
      case "get-process-list":
        return this.updateProcessInfo();
    }
  }

  async updateProcessInfo() {
    this.processes = await browser.processes.getProcessInfo();

    return browser.runtime.sendMessage({
      processes: this.processes,
    });
  }
}

const taskManager = new TaskManager();
