const BYTES_TO_MEGABYTE = 1024 * 1024;
const BYTES_TO_GIGABYTE = BYTES_TO_MEGABYTE * 1024;

// CPU usage thresholds for colorization
const CPU_MEDIUM_THRESHOLD = 25;
const CPU_HIGH_THRESHOLD = 75;
const CPU_VERY_HIGH_THRESHOLD = 90;

var taskManager;
var win;

var sortBy = "cpu";
var sortAscending = false;

// An array of objects representing information about processes.
var processes;
var processesActiveTab;
var selectedProcesses = [];

var selectedDetailsPane = "details";
var pages;
var threads;

// Cached elements
var historyChart;

// Cached values to avoid extra calculation and layout flushes
var historyChartDeltaX;
var historyChartHeight;
var historyChartHeighRatio;
var historyChartWidth;

function handleMessage(request) {
  switch (request.name) {
    case "process-list-updated":
      processes = sortProcesses(taskManager.currentProcessList);
      updateViews();
  }
}

async function handleTabActivated(info) {
  // No pre-filtering support for window id yet (Bug 1696763)
  if (info.windowId != win.id) {
    return;
  }
  processesActiveTab = await browser.processes.getProcessesForTab(info.tabId);
  updateViews();
}

async function handleTabUpdated(tabId) {
  processesActiveTab = await browser.processes.getProcessesForTab(tabId);
  updateViews();
}

function updateViews() {
  updateHistoryChart();
  updateProcessesView();
  updateDetailsPane();
}

async function updateHistoryChart() {
  const history = await taskManager.getHistory(selectedProcesses);

  const chartCpuTotal = document.getElementById("chart-cpu-total");

  let currentX = historyChartWidth - 2 + historyChartDeltaX;

  const points = history.reduceRight((points, item) => {
    const cpuTotal = item.cpuTotal * historyChartHeighRatio;

    currentX -= historyChartDeltaX;
    const cpu_yPos = historyChartHeight - cpuTotal.toFixed(0);

    return {
      cpuTotal: points.cpuTotal + `${currentX},${cpu_yPos} `,
    }
  }, { cpuTotal: "" });

  chartCpuTotal.setAttributeNS(null, "points", points.cpuTotal);
}

function updateProcessesView() {
  const content = document.getElementById("tbody-processes");
  let reuseableRow = content.firstChild;

  processes.forEach(process => {
    let row;
    let type;
    let pid;
    let cpu;
    let memory;

    if (reuseableRow) {
      row = reuseableRow;
      type = reuseableRow.firstChild;
      pid = type.nextSibling;
      cpu = pid.nextSibling;
      memory = cpu.nextSibling;
      reuseableRow = reuseableRow.nextSibling;
    } else {
      row = document.createElement("tr");
      type = document.createElement("td");
      type.appendChild(document.createTextNode(""));
      row.appendChild(type);

      pid = document.createElement("td");
      pid.appendChild(document.createTextNode(""));
      row.appendChild(pid);

      cpu = document.createElement("td");
      cpu.appendChild(document.createTextNode(""));
      row.appendChild(cpu);

      memory = document.createElement("td");
      memory.appendChild(document.createTextNode(""));
      row.appendChild(memory);

      content.appendChild(row);
    }

    type.firstChild.data = process.type;
    pid.firstChild.data = process.pid;
    cpu.firstChild.data = process.cpuTotal.toFixed(1);

    if (process.memory > BYTES_TO_GIGABYTE) {
      memory.firstChild.data = `${(process.memory / BYTES_TO_GIGABYTE).toFixed(1)} GB`;
    } else {
      memory.firstChild.data = `${(process.memory / BYTES_TO_MEGABYTE).toFixed(1)} MB`;
    }

    // Assume that if no processes are listed for the active tab it runs in
    // the parent process.
    const active =
      processesActiveTab.includes(process.pid) ||
      process.isParent && !processesActiveTab.length;

    const selected =
      selectedProcesses.includes(process.pid) ||
      process.isParent && selectedProcesses == [];

    row.pid = process.pid;

    // Determine CPU usage category
    let cpuLevel;
    if (process.cpuTotal >= CPU_VERY_HIGH_THRESHOLD) {
      cpuLevel = "very-high";
    } else if (process.cpuTotal >= CPU_HIGH_THRESHOLD) {
      cpuLevel = "high";
    } else if (process.cpuTotal >= CPU_MEDIUM_THRESHOLD) {
      cpuLevel = "medium";
    } else {
      cpuLevel = "low";
    }

    row.setAttribute("active", active);
    row.setAttribute("cpu-level", cpuLevel);
    row.setAttribute("idle", process.cpuTotal == 0.0);
    row.setAttribute("selected", selected);
  });

  while (reuseableRow) {
    var nextSibling = reuseableRow.nextSibling;
    reuseableRow.remove();
    reuseableRow = nextSibling;
  }
}

function updateProcessDetails(details) {
  const cpuTotal = document.getElementById("cpu-total");
  const cpuIdle = document.getElementById("cpu-idle");
  const processCount = document.getElementById("process-count");
  const threadCount = document.getElementById("thread-count");
  const pageCount = document.getElementById("page-count");

  const cpuTotalValue = details.cpuTotal.toFixed(2);
  cpuTotal.innerText = `${cpuTotalValue} %`;

  const cpuIdleValue = details.cpuIdle.toFixed(2);
  cpuIdle.innerText = `${cpuIdleValue} %`;

  processCount.innerText = details.processCount;
  threadCount.innerText = details.threadCount;
  pageCount.innerText = details.pageCount;
}

function updatePagesView() {
  const content = document.getElementById("tbody-pages");
  let reuseableRow = content.firstChild;

  pages.forEach(page => {
    let row;
    let url;
    let type;

    if (reuseableRow) {
      row = reuseableRow;
      url = reuseableRow.firstChild;
      type = url.nextSibling;
      reuseableRow = reuseableRow.nextSibling;
    } else {
      row = document.createElement("tr");
      url = document.createElement("td");
      url.appendChild(document.createTextNode(""));
      row.appendChild(url);

      type = document.createElement("td");
      type.appendChild(document.createTextNode(""));
      row.appendChild(type);

      content.appendChild(row);
    }

    url.firstChild.data = page.documentURI;
    type.firstChild.data = page.type;
  });

  while (reuseableRow) {
    var nextSibling = reuseableRow.nextSibling;
    reuseableRow.remove();
    reuseableRow = nextSibling;
  }
}

function updateThreadsView() {
  const content = document.getElementById("tbody-threads");
  let reuseableRow = content.firstChild;

  threads.forEach(thread => {
    let row;
    let type;
    let tid;
    let cpu;

    if (reuseableRow) {
      row = reuseableRow;
      type = reuseableRow.firstChild;
      tid = type.nextSibling;
      cpu = tid.nextSibling;
      reuseableRow = reuseableRow.nextSibling;
    } else {
      row = document.createElement("tr");
      type = document.createElement("td");
      type.appendChild(document.createTextNode(""));
      row.appendChild(type);

      tid = document.createElement("td");
      tid.appendChild(document.createTextNode(""));
      row.appendChild(tid);

      cpu = document.createElement("td");
      cpu.appendChild(document.createTextNode(""));
      row.appendChild(cpu);

      content.appendChild(row);
    }

    type.firstChild.data = thread.name;
    tid.firstChild.data = thread.tid;
    cpu.firstChild.data = thread.cpuTotal.toFixed(1);

    row.setAttribute("idle", thread.cpuTotal == 0.0);
  });

  while (reuseableRow) {
    var nextSibling = reuseableRow.nextSibling;
    reuseableRow.remove();
    reuseableRow = nextSibling;
  }
}

function sortProcesses(processes) {
  if (!sortBy) {
    return processes;
  }

  processes.sort((a, b) => {
    switch (sortBy) {
      case "type":
        if (a.type < b.type) {
          return -1;
        }
        if (a.type > b.type) {
          return 1;
        }
        return 0;
      case "pid":
        return a.pid - b.pid;
      case "cpu":
        return a.cpuTotal - b.cpuTotal;
      case "memory":
        return a.memory - b.memory;
    }
  });

  if (!sortAscending) {
    processes.reverse();
  }
  return processes;
}

function sort(by) {
  if (sortBy != by) {
    sortBy = by;
    sortAscending = false;
  } else {
    sortAscending = !sortAscending;
  }

  if (processes) {
    processes = sortProcesses(processes);
    updateProcessesView();
  }
}

async function updateDetailsPane() {
  switch (selectedDetailsPane) {
    case "details":
      const details = await taskManager.getProcessDetails(selectedProcesses);
      updateProcessDetails(details);
      break;

    case "pages":
      pages = await taskManager.getPageInfo(selectedProcesses);
      pages.sort((a, b) => a.displayRank - b.displayRank);
      updatePagesView();
      break;

    case "threads":
      threads = await taskManager.getThreadInfo(selectedProcesses);
      threads = sortProcesses(threads);
      updateThreadsView();
      break;
  }
}

function selectDetailsPane(event) {
  const paneName = event.target.name;

  selectedDetailsPane = paneName;

  for (const tab of document.getElementsByClassName("tabcontent")) {
    tab.setAttribute("active", tab.id == paneName);
  }

  const tablinks = document.getElementsByClassName("tablinks");
  for (const link of tablinks) {
    link.setAttribute("active", link.name == paneName);
  }

  updateDetailsPane();
}

window.addEventListener("load", async () => {
  const backgroundPage = await browser.runtime.getBackgroundPage();
  taskManager = await backgroundPage.getTaskManager();

  document.documentElement.setAttribute("platform", taskManager.os);

  const cpuFactor = taskManager.loadByCpu ? 1 / taskManager.cpuCount : 1;
  historyChart = document.getElementById('history-chart');
  historyChartHeight = historyChart.clientHeight;
  historyChartWidth = historyChart.clientWidth;
  historyChartDeltaX = Math.round((historyChartWidth - 4) / (60 - 1));
  historyChartHeighRatio = historyChartHeight * cpuFactor / 100;

  const cpuCount = document.getElementById("cpu-count");
  cpuCount.innerText = await taskManager.cpuCount;

  win = await browser.windows.getCurrent();

  browser.runtime.onMessage.addListener(handleMessage);
  browser.tabs.onActivated.addListener(handleTabActivated);
  browser.tabs.onUpdated.addListener(handleTabUpdated, { windowId: win.id });

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  processesActiveTab = await browser.processes.getProcessesForTab(tabs[0].id);

  taskManager.refreshProcesses();

  document.getElementsByTagName("thead")[0].addEventListener("click", ev => {
    if (ev.target.id) {
      sort(ev.target.id);
    }
  });

  document.getElementsByTagName("tbody")[0].addEventListener("click", ev => {
    const pid = ev.target.parentNode.pid;
    if (pid === undefined) {
      return;
    }

    if (
      ev.ctrlKey && taskManager.os !== "mac" ||
      ev.metaKey && taskManager.os == "mac"
    ) {
      const index = selectedProcesses.indexOf(pid);
      if (index > -1) {
        selectedProcesses.splice(index, 1);
      } else {
        selectedProcesses.push(pid);
      }
    } else {
      selectedProcesses = [pid];
    }

    updateViews();
  });

  const detailTabs = document.getElementsByClassName("tablinks");
  for (tab of detailTabs) {
    tab.addEventListener("click", selectDetailsPane);
  }
}, { once: true });

window.addEventListener("resize", () => {
  historyChartWidth = historyChart.clientWidth;
  historyChartDeltaX = Math.round((historyChartWidth - 4) / (60 - 1));
  updateDetailsPane();
});
