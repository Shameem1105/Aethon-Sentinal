# Aethon IDE Debugging Challenge: Counter Application

## Challenge Overview
The provided web application contains two bugs that prevent the counter from working properly:
1. Clicking **+ Increase** causes the score to concatenate as strings (e.g., `0111`) instead of incrementing numerically (`1, 2, 3`).
2. Clicking **- Decrease** fails to respond due to an event listener typo in `script.js`.

## Task Instructions
1. Inspect `script.js` in the workspace editor.
2. Fix the string concatenation defect in `increment()` so `count` increments as a number.
3. Fix the event listener event name typo in `document.getElementById("decrementBtn").addEventListener(...)`.
4. Test your solution and verify all test cases pass!
