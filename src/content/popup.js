const updateIntervalInput = document.getElementById("update-interval-input");

updateIntervalInput.addEventListener("change", ev => {
  browser.runtime.sendMessage({
    name: "set-update-interval",
    interval: parseInt(ev.target.value),
  })
});
