async function minimizeMemory() {
  const button = document.getElementById("minimize");
  button.disabled = true;
  await browser.memory.minimizeMemory();
  button.disabled = false;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("minimize").addEventListener("click", minimizeMemory);
});
