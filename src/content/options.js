const updateIntervalSlider = document.getElementById("update-interval-slider");
const updateIntervalValue = document.getElementById("update-interval-value");
const transferThreadsCheckbox = document.getElementById("transfer-threads");
const transferWindowsCheckbox = document.getElementById("transfer-pages");

function updateInterval(ev) {
  browser.runtime.sendMessage({
    name: "set-update-interval",
    interval: parseInt(ev.target.value),
  })
}

function updateThreadsTransfer() {
  browser.runtime.sendMessage({
    name: "set-include-threads"
  });
  console.log("updateThreadsTransfer");
}

function updateWindowsTransfer() {
  browser.runtime.sendMessage({
    name: "set-include-windows"
  });
  console.log("updateWindowsTransfer");
}

updateIntervalSlider.addEventListener("change", updateInterval);
updateIntervalSlider.addEventListener("input", ev => {
  updateIntervalValue.value = ev.target.value;
});
updateIntervalValue.value = updateIntervalSlider.value;

transferThreadsCheckbox.addEventListener("change", updateThreadsTransfer);
transferWindowsCheckbox.addEventListener("change", updateWindowsTransfer);