const PROCESS_TYPES_MAP = {
  "browser": "Main Process",
  "extension": "WebExtensions",
  "preallocated": "Web Content (preallocated)",
  "privilegedabout": "Privileged Content",
  "rdd": "Data Decoder",
  "socket": "Network",
  "web": "Web Content (shared)",
  "webIsolated": "Web Content",
};

class Thread extends Object {
  constructor(tid, name) {
    super();

    this.tid = tid;
    this.name = name;

    this.cpuKernel = 0;
    this.cpuUser = 0;
    this.cpuTotal = 0;
  }

  static fromProcessInfo(info) {
    const thread = new Thread(info.tid, info.name);

    thread.cpuKernel = info.cpuKernel;
    thread.cpuUser = info.cpuUser;
    thread.cpuTotal = info.cpuKernel + info.cpuUser;

    return thread;
  }
}

class Process extends Object {
  constructor(pid, type, name) {
    super();

    this.pid = pid;
    this.type = type;
    this.name = name;
    this.threads = new Map();

    this.cpuKernel = 0;
    this.cpuUser = 0;
    this.cpuTotal = 0;

    // Resident set size is the total memory used by the process, including shared memory.
    // Resident unique size is the memory used by the process, without shared memory.
    // Since all processes share memory with the parent process, we count the shared memory
    // as part of the parent process (`"browser"`) rather than as part of the individual
    // processes.
    this.residentMemory = 0;
  }

  static fromProcessInfo(info) {
    const type = PROCESS_TYPES_MAP[info.type] || info.type;
    const process = new Process(info.pid, type, info.filename);

    process.cpuKernel = info.cpuKernel;
    process.cpuUser = info.cpuUser;
    process.cpuTotal = info.cpuKernel + info.cpuUser;

    if (info.type == "browser") {
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
}

var processes = class extends ExtensionAPI {
  getAPI() {
    return {
      processes: {
        async getProcessInfo() {
          const info = await ChromeUtils.requestProcInfo();

          const processes = new Map();
          const parentProcess = Process.fromProcessInfo(info, true);
          processes.set(parentProcess.pid, parentProcess);

          for (const child of info.children) {
            const process = Process.fromProcessInfo(child, false);
            processes.set(process.pid, process);
          }

          return processes;
        }
      }
    };
  }
}