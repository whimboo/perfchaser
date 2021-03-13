const BYTES_TO_MEGABYTE = 1024 * 1024;
const BYTES_TO_GIGABYTE = BYTES_TO_MEGABYTE * 1024;

var backgroundPage;
var taskManager;
var win;

var sortBy = "cpu";
var sortAscending = false;

// An array of objects representing information about processes.
var processes;
var processesActiveTab;
var selectedProcess;

var selectedDetailsPane = "details";
var pages;
var threads;

// Cached elements
var historyChart;

// Cached values to avoid extra calculation and layout flushes
var historyChartDeltaX;
var historyChartHeight;
var historyChartWidth;

function handleMessage(request) {
  switch (request.name) {
    case "process-list-updated":
      processes = sortProcesses(taskManager.currentProcessList);

      const pids = processes.map(process => process.pid);
      if (!pids.includes(selectedProcess)) {
        const parent = processes.filter(process => process.isParent);
        selectedProcess = parent[0].pid;
      }

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
  const details = await taskManager.getHistory(selectedProcess);

  const chartKernelCpu = document.getElementById("chart-kernel-cpu");
  const chartUserCpu = document.getElementById("chart-user-cpu");

  let currentX = historyChartWidth - 2 + historyChartDeltaX;
  const points = details.history.reduceRight((points, item) => {
    currentX -= historyChartDeltaX;
    const kernel_yPos =
      historyChartHeight - (item.currentCpuKernel * 100).toFixed(0);
    const user_yPos = kernel_yPos - (item.currentCpuUser * 100).toFixed(0);

    const new_points = {
      kernel: points.kernel + `${currentX},${kernel_yPos} `,
      user: points.user + `${currentX},${user_yPos} `,
    }
    return new_points;
  }, { kernel: "", user: "" });

  chartKernelCpu.setAttributeNS(null, "points", points.kernel);
  chartUserCpu.setAttributeNS(null, "points", points.user);
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
    cpu.firstChild.data = (process.currentCpu * 100).toFixed(1);

    if (process.residentMemory > BYTES_TO_GIGABYTE) {
      memory.firstChild.data = `${(process.residentMemory / BYTES_TO_GIGABYTE).toFixed(1)} GB`;
    } else {
      memory.firstChild.data = `${(process.residentMemory / BYTES_TO_MEGABYTE).toFixed(1)} MB`;
    }

    // Assume that if no processes are listed for the active tab it runs in
    // the parent process.
    const active =
      processesActiveTab.includes(process.pid) ||
      process.isParent && !processesActiveTab.length;

    const selected =
      process.pid == selectedProcess ||
      process.isParent && selectedProcess == undefined;

    row.pid = process.pid;

    row.setAttribute("active", active);
    row.setAttribute("idle", process.currentCpu == 0.0);
    row.setAttribute("selected", selected);
  });

  while (reuseableRow) {
    var nextSibling = reuseableRow.nextSibling;
    reuseableRow.remove();
    reuseableRow = nextSibling;
  }
}

function updateProcessDetails(details) {
  const cpuKernel = document.getElementById("cpu-kernel");
  const cpuUser = document.getElementById("cpu-user");
  const cpuIdle = document.getElementById("cpu-idle");
  const threadCount = document.getElementById("thread-count");

  const cpuKernelValue = (details.cpuKernel * 100).toFixed(2);
  cpuKernel.innerText = `${cpuKernelValue} %`;

  const cpuUserValue = (details.cpuUser * 100).toFixed(2);
  cpuUser.innerText = `${cpuUserValue} %`;

  cpuIdle.innerText = `${Math.max(0, (100 - cpuKernelValue - cpuUserValue).toFixed(2))} %`;
  threadCount.innerText = details.threadCount;
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

    url.firstChild.data = page.documentTitle || page.documentURI;
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
    cpu.firstChild.data = (thread.currentCpu * 100).toFixed(1);

    row.setAttribute("idle", thread.currentCpu == 0.0);
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
        return a.currentCpu - b.currentCpu;
      case "memory":
        return a.residentMemory - b.residentMemory;
    }
  });

  if (!sortAscending) {
    processes.reverse();
  }
  return processes;
}

function selectProcess(pid) {
  selectedProcess = pid;
  updateViews();
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
      const details = await taskManager.getProcessDetails(selectedProcess);
      updateProcessDetails(details);
      break;

    case "pages":
      pages = await taskManager.getPageInfo(selectedProcess);
      pages.sort((a, b) => a.displayRank - b.displayRank);
      updatePagesView();
      break;

    case "threads":
      threads = await taskManager.getThreadInfo(selectedProcess);
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
  backgroundPage = await browser.runtime.getBackgroundPage();
  taskManager = backgroundPage.taskManager;
  taskManager.refreshProcesses();

  win = await browser.windows.getCurrent();

  browser.runtime.onMessage.addListener(handleMessage);
  browser.tabs.onActivated.addListener(handleTabActivated);
  browser.tabs.onUpdated.addListener(handleTabUpdated, { windowId: win.id });

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  processesActiveTab = await browser.processes.getProcessesForTab(tabs[0].id);

  document.getElementsByTagName("thead")[0].addEventListener("click", ev => {
    if (ev.target.id) {
      sort(ev.target.id);
    }
  });

  document.getElementsByTagName("tbody")[0].addEventListener("click", ev => {
    selectProcess(ev.target.parentNode.pid);
  });

  const detailTabs = document.getElementsByClassName("tablinks");
  for (tab of detailTabs) {
    tab.addEventListener("click", selectDetailsPane);
  }

  historyChart = document.getElementById('history-chart');
  historyChartHeight = historyChart.clientHeight;
  historyChartWidth = historyChart.clientWidth;
  historyChartDeltaX = Math.round((historyChartWidth - 4) / (60 - 1));
}, { once: true });

window.addEventListener("resize", () => {
  historyChartWidth = historyChart.clientWidth;
  historyChartDeltaX = Math.round((historyChartWidth - 4) / (60 - 1));
  updateDetailsPane();
});
