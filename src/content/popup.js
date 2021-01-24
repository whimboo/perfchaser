const updateIntervalSlider = document.getElementById("update-interval");
const updateIntervalValue = document.getElementById("update-interval-value");

function updateInterval(ev) {
  browser.runtime.sendMessage({
    name: "set-update-interval",
    interval: parseFloat(ev.target.value),
  })
}

updateIntervalSlider.addEventListener("change", updateInterval);
updateIntervalSlider.addEventListener("input", ev => {
  updateIntervalValue.value = ev.target.value;
});
updateIntervalValue.value = updateIntervalSlider.value;
