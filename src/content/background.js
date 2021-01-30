// TODO: read from settings
const INTERVAL_PROCESS_UPDATE = 5; // seconds


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
      case "get-thread-list":
        return this.updateThreadInfo(request.pid);
      case "set-update-interval":
        this.interval_process_update = request.interval;
        this.createProcessInfoAlarm();
    }
  }

  async updateProcessInfo() {
    this.processes = await browser.processes.getProcessInfo();

    return browser.runtime.sendMessage({
      name: "process-list",
      processes: this.processes,
    });
  }

  async updateThreadInfo(pid) {
    const process = this.processes.get(pid);

    return browser.runtime.sendMessage({
      name: "thread-list",
      threads: process ? process.threads : [],
    });
  }
}

const taskManager = new TaskManager();
