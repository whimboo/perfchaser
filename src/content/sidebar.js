var sortBy;
var sortAscending = false;
// An array of objects representing information about processes.
var processes;

async function handleMessage(request, sender, sendResponse) {

  processes = Array.from(request.processes.values());
  updateView(sortProcesses(processes));
}

function updateView(processes) {
  const content = document.getElementById("tbody");
  let reuseableRow = content.firstChild;
  processes.forEach(process => {
    let type;
    let pid;
    let cpu;
    let memory;
    if (reuseableRow) {
      type = reuseableRow.firstChild;
      pid = type.nextSibling;
      cpu = pid.nextSibling;
      memory = cpu.nextSibling;
      reuseableRow = reuseableRow.nextSibling;
    } else {
      let row = document.createElement("tr");
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
  });

  while (reuseableRow) {
    var nextSibling = reuseableRow.nextSibling;
    reuseableRow.remove();
    reuseableRow = nextSibling;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  browser.runtime.onMessage.addListener(handleMessage);
});

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

window.addEventListener("load", () => {
  document.getElementsByTagName("thead")[0].addEventListener("click", (event) => {
    if (event.target.id) {
      sort(event.target.id);
    }
  });
}, {once: true});
