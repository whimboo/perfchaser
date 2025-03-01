const updateIntervalSlider = document.getElementById("update-interval-slider");
const updateIntervalValue = document.getElementById("update-interval-value");

function updateInterval(ev) {
  browser.runtime.sendMessage({
    name: "set-update-interval",
    interval: parseInt(ev.target.value),
  })
}

updateIntervalSlider.addEventListener("change", updateInterval);
updateIntervalSlider.addEventListener("input", ev => {
  updateIntervalValue.value = ev.target.value;
});
updateIntervalValue.value = updateIntervalSlider.value;
