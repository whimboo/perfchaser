var win;

var sortBy = "cpu";
var sortAscending = false;

// An array of objects representing information about processes.
var processes;
var processesActiveTab;

async function handleMessage(request) {
  switch (request.name) {
    case "process-list":
      processes = Array.from(request.processes.values());
      updateView(sortProcesses(processes), processesActiveTab);
      break;
  }
}

async function handleTabActivated(info) {
  if (info.windowId != win.id) {
    return;
  }
  processesActiveTab = await browser.processes.getProcessesForTab(info.tabId);
  updateView(sortProcesses(processes), processesActiveTab);
}

async function handleTabUpdated(tabId) {
  processesActiveTab = await browser.processes.getProcessesForTab(tabId);
  updateView(sortProcesses(processes), processesActiveTab);
}

function updateView(processes, processesActiveTab) {
  const content = document.getElementById("tbody");
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
    memory.firstChild.data = `${(process.residentMemory / 1024 / 1024).toFixed(1)} MB`;

    // Assume that if no processes are listed for the active tab it runs in
    // the parent process.
    const selected =
      processesActiveTab.includes(process.pid) ||
      process.isParent && !processesActiveTab.length;
    row.setAttribute("active", selected);

    row.setAttribute("idle", process.currentCpu == 0.0);
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

function sort(by) {
  if (sortBy != by) {
    sortBy = by;
    sortAscending = false;
  } else {
    sortAscending = !sortAscending;
  }

  if (processes) {
    updateView(sortProcesses(processes));
  }
}

window.addEventListener("load", async () => {
  win = await browser.windows.getCurrent();

  browser.runtime.onMessage.addListener(handleMessage);
  browser.tabs.onActivated.addListener(handleTabActivated);
  browser.tabs.onUpdated.addListener(handleTabUpdated, { windowId: win.id });

  browser.runtime.sendMessage({ name: "get-process-list" });
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  processesActiveTab = await browser.processes.getProcessesForTab(tabs[0].id);

  document.getElementsByTagName("thead")[0].addEventListener("click", ev => {
    if (ev.target.id) {
      sort(ev.target.id);
    }
  });
}, { once: true });
