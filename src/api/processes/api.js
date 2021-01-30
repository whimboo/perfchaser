const { E10SUtils } = ChromeUtils.import(
  "resource://gre/modules/E10SUtils.jsm"
);
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const NS_PER_MS = 1000 * 1000;

// From: dom/chrome-webidl/ChromeUtils.webidl
const PROCESS_TYPES_MAP = {
  "browser": "main process",
  "preallocated": "web content (preallocated)",
  "privilegedabout": "privileged content",
  "rdd": "data decoder",
  "socket": "network",
  "web": "web content (shared)",
  "webIsolated": "web content",
};

var previousSnapshotTime = 0;
var previousProcesses = new Map();

class Thread extends Object {
  constructor(tid, name) {
    super();

    this.tid = tid;
    this.name = name;

    this.totalCpuKernel = 0;
    this.totalCpuUser = 0;
    this.totalCpu = 0;

    this.currentCpuKernel = null;
    this.currentCpuUser = null;
    this.currentCpu = null;
  }

  static fromProcessInfo(info) {
    const thread = new Thread(info.tid, info.name);

    thread.totalCpuKernel = info.cpuKernel;
    thread.totalCpuUser = info.cpuUser;
    thread.totalCpu = info.cpuKernel + info.cpuUser;

    return thread;
  }

  updateDelta(timeDelta, previousProcessSnapshot) {
    const previous = previousProcessSnapshot.threads.get(this.tid);
    if (!previous) {
      return;
    }

    this.currentCpuKernel =
      (this.totalCpuKernel - previous.totalCpuKernel) / timeDelta;
    this.currentCpuUser =
      (this.totalCpuUser - previous.totalCpuUser) / timeDelta;
    this.currentCpu = this.currentCpuKernel + this.currentCpuUser;
  }
}

class Process extends Object {
  constructor(pid, type, name) {
    super();

    this.pid = pid;
    this.type = type;
    this.name = name;
    this.threads = new Map();

    this.isParent = false;

    this.totalCpuKernel = 0;
    this.totalCpuUser = 0;
    this.totalCpu = 0;

    this.currentCpuKernel = null;
    this.currentCpuUser = null;
    this.currentCpu = null;

    this.residentMemory = 0;
  }

  static fromProcessInfo(info) {
    const type = PROCESS_TYPES_MAP[info.type] || info.type;
    const process = new Process(info.pid, type, info.filename);

    process.totalCpuKernel = info.cpuKernel;
    process.totalCpuUser = info.cpuUser;
    process.totalCpu = info.cpuKernel + info.cpuUser;

    // Resident set size is the total memory used by the process, including shared memory.
    // Resident unique size is the memory used by the process, without shared memory.
    // Since all processes share memory with the parent process, we count the shared memory
    // as part of the parent process (`"browser"`) rather than as part of the individual
    // processes.
    if (info.type == "browser") {
      process.isParent = true;
      process.residentMemory = info.residentSetSize;
    } else {
      process.residentMemory = info.residentUniqueSize;
    }

    info.threads.forEach(entry => {
      const thread = Thread.fromProcessInfo(entry);
      process.threads.set(thread.tid, thread);
    });

    return process;
  }

  updateDelta(timeDelta) {
    const previous = previousProcesses.get(this.pid);
    if (!previous) {
      return;
    }

    this.currentCpuKernel =
      (this.totalCpuKernel - previous.totalCpuKernel) / timeDelta;
    this.currentCpuUser =
      (this.totalCpuUser - previous.totalCpuUser) / timeDelta;
    this.currentCpu = this.currentCpuKernel + this.currentCpuUser;

    this.threads.forEach(thread => {
      thread.updateDelta(timeDelta, previous);
    });
  }
}

var processes = class extends ExtensionAPI {
  getAPI(context) {
    return {
      processes: {
        async getProcessesForTab(tabId) {
          const tab = context.extension.tabManager.get(tabId);
          return E10SUtils.getBrowserPids(
            tab.browser,
            tab.browser.ownerGlobal.docShell.nsILoadContext.useRemoteSubframes
          );
        },
        async getProcessInfo() {
          const info = await ChromeUtils.requestProcInfo();
          const now = Cu.now();
          const timeDelta = (now - previousSnapshotTime) * NS_PER_MS;

          const processes = new Map();
          const parentProcess = Process.fromProcessInfo(info, true);
          parentProcess.updateDelta(timeDelta);
          processes.set(parentProcess.pid, parentProcess);

          for (const child of info.children) {
            const process = Process.fromProcessInfo(child, false);
            process.updateDelta(timeDelta);
            processes.set(process.pid, process);
          }

          previousSnapshotTime = now;
          previousProcesses = processes

          return processes;
        }
      }
    };
  }
}