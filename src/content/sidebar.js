async function handleMessage(request, sender, sendResponse) {
  const content = document.getElementById("tbody");
  while (content.hasChildNodes()) {
    content.removeChild(content.lastChild);
  }

  //request.processes.sort((a, b) => b.residentSize - a.residentSize);
  request.processes.forEach(process => {
    addProcess(process);
  });
}

function addProcess(process) {
  const content = document.getElementById("tbody");
  const row = document.createElement("tr");

  const type = document.createElement("td");
  type.textContent = process.type;
  row.appendChild(type);

  const pid = document.createElement("td");
  pid.textContent = process.pid;
  row.appendChild(pid);

  const cpu = document.createElement("td");
  cpu.textContent = (process.currentCpu * 100).toFixed(1);
  row.appendChild(cpu);

  const memory = document.createElement("td");

  memory.textContent = `${(process.residentMemory / 1024 / 1024).toFixed(1)} MB`;
  row.appendChild(memory);

  content.appendChild(row);
}

document.addEventListener("DOMContentLoaded", () => {
  browser.runtime.onMessage.addListener(handleMessage);
});
