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

      this.cpuRatio = this.os == "win" ? 1 : 1 / this.cpuInfo.count;

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

    return browser.runtime.sendMessage({
      name: "process-list-updated",
    });
  }

  async updateProcesses() {
    const { timeStamp, processes } = await browser.processes.getProcessInfo(
      this.includeThreads,
      this.includeWindows
    );

    const timeDelta = (timeStamp - this.lastSnapshotTime) * NS_PER_MS;

    this.lastSnapshotTime = timeStamp;

    const mappedProcesses = processes.map(process => {
      const previousProcess =
        this.currentProcessList?.find(p => p.pid == process.pid);

      if (previousProcess) {
        process.currentCpuKernel =
          (process.cpuKernel - previousProcess.cpuKernel) / timeDelta;
        process.currentCpuUser =
          (process.cpuUser - previousProcess.cpuUser) / timeDelta;
        process.currentCpu = process.currentCpuKernel + process.currentCpuUser;
      } else {
        process.currentCpuKernel = 0;
        process.currentCpuUser = 0;
        process.currentCpu = 0;
      }

      process.threads = process.threads.map(thread => {
        const previousThread =
          previousProcess?.threads.find(t => t.tid == thread.tid);

        if (previousThread) {
          thread.currentCpuKernel =
            (thread.cpuKernel - previousThread.cpuKernel) / timeDelta;
          thread.currentCpuUser =
            (thread.cpuUser - previousThread.cpuUser) / timeDelta;
          thread.currentCpu = thread.currentCpuKernel + thread.currentCpuUser;
        } else {
          thread.currentCpuKernel = 0;
          thread.currentCpuUser = 0;
          thread.currentCpu = 0;
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
          val.currentCpuKernel = val.currentCpuKernel + proc.currentCpuKernel;
          val.currentCpuUser = val.currentCpuUser + proc.currentCpuUser;
          val.currentCpu = val.currentCpu + proc.currentCpu;
        }
        return val;
      }, { currentCpuKernel: 0, currentCpuUser: 0, currentCpu: 0});
    });
  }

  getProcessDetails(pids = []) {
    let processes;
    if (pids.length == 0) {
      processes = this.currentProcessList;
    } else {
      processes = this.currentProcessList.filter(
        process => pids.includes(process.pid)
      );
    }

    const data = {
      cpuKernel: 0,
      cpuUser: 0,
      pageCount: 0,
      processCount: processes.length,
      threadCount: 0,
    };

    return processes.reduce((val, proc) => {
      val.cpuKernel = val.cpuKernel + proc.currentCpuKernel;
      val.cpuUser = val.cpuUser + proc.currentCpuUser;
      val.pageCount = val.pageCount + proc.windows.length;
      val.threadCount = val.threadCount + proc.threadCount;
      return val;
    }, data);
  }

  getPageInfo(pids = []) {
    let processes;
    if (pids.length == 0) {
      processes = this.currentProcessList;
    } else {
      processes = this.currentProcessList.filter(
        process => pids.includes(process.pid)
      );
    }

    return processes.reduce((val, proc) => {
      return val.concat(proc.windows);
    }, []);
  }

  getThreadInfo(pids = []) {
    let processes;
    if (pids.length == 0) {
      processes = this.currentProcessList;
    } else {
      processes = this.currentProcessList.filter(
        process => pids.includes(process.pid)
      );
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
