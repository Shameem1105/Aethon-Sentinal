// Aethon IDE Debugging Challenge: Fix the Counter Bug
let count = 0;

function updateDisplay() {
  const displayEl = document.getElementById("countDisplay");
  if (displayEl) {
    displayEl.textContent = count;
  }
}

// BUG 1: String concatenation instead of integer addition ("01" instead of 1)
function increment() {
  count = count + "1"; // BUG: Should be integer 1, not string "1"
  updateDisplay();
}

function decrement() {
  count = parseInt(count) - 1;
  updateDisplay();
}

function reset() {
  count = 0;
  updateDisplay();
}

// BUG 2: Typo in event listener event name ("clik" instead of "click")
document.addEventListener("DOMContentLoaded", () => {
  const incBtn = document.getElementById("incrementBtn");
  const decBtn = document.getElementById("decrementBtn");
  const rstBtn = document.getElementById("resetBtn");

  if (incBtn) incBtn.addEventListener("click", increment);
  if (decBtn) decBtn.addEventListener("clik", decrement); // BUG: Typo "clik" instead of "click"
  if (rstBtn) rstBtn.addEventListener("click", reset);
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = { increment, decrement, reset, getCount: () => count };
}
