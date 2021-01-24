// TODO: read from settings
const INTERVAL_PROCESS_UPDATE = 2; // seconds


class TaskManager extends Object {
  constructor() {
    super();

    this.interval_process_update = INTERVAL_PROCESS_UPDATE;

    this.processes = new Map();

    browser.alarms.onAlarm.addListener(this.updateProcessInfo.bind(this));
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    this.createProcessInfoAlarm();
  }

  createProcessInfoAlarm() {
    if (browser.alarms.get("get-process-info")) {
      browser.alarms.clear("get-process-info");
    }
    browser.alarms.create("get-process-info", {
      when: Date.now(),
      periodInMinutes: this.interval_process_update / 60,
    });
  }

  async handleMessage(request) {
    switch (request.name) {
      case "get-process-list":
        return this.updateProcessInfo();
      case "set-update-interval":
        time_update_interval = request.interval;
        this.createProcessInfoAlarm();
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
