const { E10SUtils } = ChromeUtils.import(
  "resource://gre/modules/E10SUtils.jsm"
);

let extensionContext;

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

let tabFinder = {
  update() {
    this._map = new Map();
    for (let win of Services.wm.getEnumerator("navigator:browser")) {
      let tabbrowser = win.gBrowser;
      for (let browser of tabbrowser.browsers) {
        let id = browser.outerWindowID; // May be `null` if the browser isn't loaded yet
        if (id != null) {
          this._map.set(id, browser);
        }
      }
      if (tabbrowser.preloadedBrowser) {
        let browser = tabbrowser.preloadedBrowser;
        if (browser.outerWindowID) {
          this._map.set(browser.outerWindowID, browser);
        }
      }
    }
  },

  /**
   * Find the tab id for a window id.
   *
   * This is useful e.g. for reloading or closing tabs.
   *
   * @return tabId
   *     The tab id, or null if it could not be found.
   */
  get(id) {
    let type = "Frame";

    const browser = this._map.get(id);
    const tabbrowser = browser?.getTabBrowser();

    let tab = null;
    if (tabbrowser) {
      type = "Tab";
      tab = extensionContext.extension.tabManager.getWrapper(tabbrowser.getTabForBrowser(browser));
    }

    return { type, tab };
  },
};

function updateProcessInfo(process, threads, windows) {
  process.type = PROCESS_TYPES_MAP[process.type] || process.type;
  process.isParent = process.type == "main process";

  // Resident set size is the total memory used by the process, including shared memory.
  // Resident unique size is the memory used by the process, without shared memory.
  // Since all processes share memory with the parent process, we count the shared memory
  // as part of the parent process rather than as part of the individual processes.
  process.residentMemory =
    process.isParent ? process.residentSetSize : process.residentUniqueSize;

  if (windows && process.windows && process.type != "extension") {
    process.windows = process.windows.map(win => {
      const { type, tab } = tabFinder.get(win.outerWindowId);
      let displayRank;

      if (tab) {
        displayRank = 1;
      } else if (win.isProcessRoot) {
        displayRank = 2;
      } else if (win.documentTitle) {
        displayRank = 3;
      } else {
        displayRank = 4;
      }

      return {
        outerWindowId: win.outerWindowId,
        // Bug 1690644: Structured cloning doesn't support nsIURI.
        documentURI: win.documentURI.spec,
        documentTitle: win.documentTitle,
        isProcessRoot: win.isProcessRoot,
        isInProcess: win.isInProcess,
        tabId: tab?.id,
        type,
        // A rank used to quickly sort windows.
        displayRank,
      };
    });
  } else {
    process.windows = [];
  }
  process.windowCount = process.windows ? process.windows.length : 0;

  process.threadCount = process.threads.length;
  if (!threads) {
    process.threads = [];
  }

  return process;
}

var processes = class extends ExtensionAPI {
  getAPI(context) {
    extensionContext = context;

    return {
      processes: {
        async getCPUInfo() {
          return Services.sysinfo.processInfo;
        },

        async getProcessesForTab(tabId) {
          const tab = extensionContext.extension.tabManager.get(tabId);
          return E10SUtils.getBrowserPids(
            tab.browser,
            tab.browser.ownerGlobal.docShell.nsILoadContext.useRemoteSubframes
          );
        },

        async getProcessInfo(threads = false, windows = false) {
          const processes = [];
          const timeStamp = Cu.now();

          const info = await ChromeUtils.requestProcInfo();
          tabFinder.update();

          const parentProcess = updateProcessInfo(info, threads, windows);
          processes.push(parentProcess);

          for (const process of parentProcess.children) {
            processes.push(updateProcessInfo(process, threads, windows));
          }

          return {
            processes,
            timeStamp,
          }
        },
      },
    };
  }
}