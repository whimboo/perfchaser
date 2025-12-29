const NS_PER_MS = 1000 * 1000;

// TODO: read from settings
const INTERVAL_PROCESS_UPDATE = 5; // seconds

// TODO: read from settings
const MAX_BUFFER_ENTRIES = 60 / INTERVAL_PROCESS_UPDATE * 5; // 5 minutes

class TaskManager extends Object {
  constructor() {
    super();

    // TODO: Set enabled status based on global setting and selected sidebar
    // process pane.
    this.includeThreads = true;
    this.includeWindows = true;

    this.interval_process_update = INTERVAL_PROCESS_UPDATE;

    this.lastSnapshotTime;
    this.processesBuffer = [];

    browser.alarms.onAlarm.addListener(this.refreshProcesses.bind(this));
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

    this.createProcessInfoAlarm();

    this._initializedPromise = new Promise(async resolve => {
      this.cpuInfo = await browser.processes.getCPUInfo();
      this.platformInfo = await browser.runtime.getPlatformInfo();

      // On Windows a CPU load value of 100% means that all available CPUs are
      // under load, whereby on MacOS and Linux it's just for a single CPU.
      this.loadByCpu = this.os != "win";

      resolve();
    });
  }

  get cpuCount() {
    return this.cpuInfo.count;
  }

  get currentProcessList() {
    return this.processesBuffer[this.processesBuffer.length - 1];
  }

  get os() {
    return this.platformInfo.os;
  }

  async createProcessInfoAlarm() {
    if (browser.alarms.get("get-process-info")) {
      browser.alarms.clear("get-process-info");
    }

    // Makes sure we have initial data to compare with when the
    // first alarm for refreshProcesses is fired.
    if (this.processesBuffer.length == 0) {
      await this.updateProcesses();
    }

    browser.alarms.create("get-process-info", {
      when: Date.now(),
      periodInMinutes: this.interval_process_update / 60,
    });
  }

  async handleMessage(request) {
    switch (request.name) {
      case "set-update-interval":
        this.interval_process_update = request.interval;
        this.createProcessInfoAlarm();
    }
  }

  async ready() {
    return this._initializedPromise;
  }

  async refreshProcesses() {
    await this.updateProcesses();

    try {
      await browser.runtime.sendMessage({
        name: "process-list-updated",
      });
    } catch (error) {
      // Ignore connection errors when sidebar is not open
      if (!error.message.includes("Receiving end does not exist")) {
        throw error;
      }
    }
  }

  async updateProcesses() {
    const { timeStamp, processes } = await browser.processes.getProcessInfo(
      this.includeThreads,
      this.includeWindows
    );

    const timeDelta = (timeStamp - this.lastSnapshotTime) * NS_PER_MS;
    const cpuFactor = this.loadByCpu ? 100 : 100 / this.cpuCount;
    const ratio = cpuFactor / timeDelta;

    this.lastSnapshotTime = timeStamp;

    const mappedProcesses = processes.map(process => {
      const previousProcess =
        this.currentProcessList?.find(p => p.pid == process.pid);

      if (previousProcess) {
        process.cpuTotal = (process.cpuTime - previousProcess.cpuTime) * ratio;
      } else {
        process.cpuTotal = 0;
      }

      // Starting with Firefox 94 the memory property improves performance
      // when retrieving used memory. For older releases keep backward
      // compatibility.
      if (typeof(process.memory) == "undefined") {
        process.memory = process.residentMemory;
      }

      process.threads = process.threads.map(thread => {
        const previousThread =
          previousProcess?.threads.find(t => t.tid == thread.tid);

        if (previousThread) {
          thread.cpuTotal = (thread.cpuTime - previousThread.cpuTime) * ratio;
        } else {
          thread.cpuTotal = 0;
        }

        return thread;
      });

      return process;
    });

    this.processesBuffer.push(mappedProcesses);
    if (this.processesBuffer.length > MAX_BUFFER_ENTRIES) {
      this.processesBuffer.splice(0, 1);
    }
  }

  getHistory(pids = []) {
    return this.processesBuffer.map(processes => {
      return processes.reduce((val, proc) => {
        if (pids.length == 0 || pids.includes(proc.pid)) {
          val.cpuTotal = val.cpuTotal + proc.cpuTotal;
        }
        return val;
      }, { cpuTotal: 0 });
    });
  }

  getProcessDetails(pids = []) {
    const processes = this.currentProcessList;

    const data = {
      cpuIdle: 0,
      cpuTotal: 0,
      cpuTotalAllProcesses: 0,
      pageCount: 0,
      processCount: processes.length,
      threadCount: 0,
    };

    const entry = processes.reduce((val, proc) => {
      val.cpuTotalAllProcesses += proc.cpuTotal;

      if (pids.length == 0 || pids.includes(proc.pid)) {
        // The following data applies only to the
        // selected processes if there are any.
        val.cpuTotal += proc.cpuTotal;
        val.pageCount += proc.windows.length;
        val.threadCount += proc.threadCount;
      }

      return val;
    }, data);

    entry.cpuIdle = Math.max(0, 100 - entry.cpuTotalAllProcesses);

    return entry;
  }

  getPageInfo(pids = []) {
    let processes = this.currentProcessList;
    if (pids.length > 0) {
      processes = processes.filter(process => pids.includes(process.pid));
    }

    return processes.reduce((val, proc) => {
      return val.concat(proc.windows);
    }, []);
  }

  getThreadInfo(pids = []) {
    let processes = this.currentProcessList;
    if (pids.length > 0) {
      processes = processes.filter(process => pids.includes(process.pid));
    }

    return processes.reduce((val, proc) => {
      return val.concat(proc.threads);
    }, []);
  }
}

var taskManager = new TaskManager();

async function getTaskManager() {
  await taskManager.ready();
  return taskManager;
}
