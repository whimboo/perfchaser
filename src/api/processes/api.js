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
  }

  static fromProcessInfo(info) {
    const thread = new Thread(info.tid, info.name);
    thread.cpuKernel = info.cpuKernel;
    thread.cpuUser = info.cpuUser;
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
    process.residentMemory = info.residentUniqueSize;

    info.threads.forEach(entry => {
      const thread = Thread.fromProcessInfo(entry);
      process.threads.set(thread.tid, thread);
    });

    return process;
  }
}

class ParentProcess extends Process {
  constructor(pid, name) {
    super(pid, "Main Process", name);

    this.children = new Map();
  }

  static fromProcessInfo(info) {
    const process = new ParentProcess(info.pid, info.filename);
    process.cpuKernel = info.cpuKernel;
    process.cpuUser = info.cpuUser;
    process.residentMemory = info.residentSetSize;

    info.threads.forEach(entry => {
      const thread = Thread.fromProcessInfo(entry);
      process.threads.set(thread.tid, thread);
    });

    for (const child of info.children) {
      const childProcess = Process.fromProcessInfo(child);
      process.children.set(childProcess.pid, childProcess);
    }

    return process;
  }
}

var processes = class extends ExtensionAPI {
  getAPI() {
    return {
      processes: {
        async getProcessInfo() {
          const info = await ChromeUtils.requestProcInfo();
          return ParentProcess.fromProcessInfo(info);
        }
      }
    };
  }
}