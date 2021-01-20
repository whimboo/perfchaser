var memory = class extends ExtensionAPI {
  getAPI() {
    const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

    const memSrv = Cc["@mozilla.org/memory-reporter-manager;1"]
      .getService(Ci.nsIMemoryReporterManager);

    return {
      memory: {
        async getResident() {
          return memSrv.residentFast;
        },

        async getHeapAllocated() {
          return memSrv.heapAllocated;
        },

        async getHeapUnclassified() {
          let heapTotal = 0;

          function handleReport(
            aProcess,
            aUnsafePath,
            aKind,
            aUnits,
            aAmount,
            aDescription
          ) {
            if (aKind == Ci.nsIMemoryReporter.KIND_HEAP) {
              heapTotal += aAmount;
            }
          }

          return new Promise(resolve => {
            const finish = () => {
              console.log(`** finished`);
              resolve(heapTotal - memSrv.heapAllocated);
            }
            memSrv.getReports(handleReport, null, finish, null, false);
          });

        },

        async minimizeMemory() {
          return new Promise(resolve => {
            Services.obs.notifyObservers(null, "child-mmu-request", null);
            memSrv.minimizeMemoryUsage(resolve);
          });
        }
      }
    };
  }
}