const db = require("./db");

setTimeout(() => {
  db.query("SELECT id FROM aethon_tests WHERE title = 'Aethon Sentinel - Core Debugging Assessment'", (err, res) => {
    if (err) {
      console.error("DB query error:", err);
      process.exit(1);
    }
    
    let testId;
    if (res.length === 0) {
      db.query(`INSERT INTO aethon_tests (title, description, test_type, duration_minutes, status) VALUES 
      ('Aethon Sentinel - Core Debugging Assessment', 'Professional AI-Assisted Debugging Assessment evaluating multi-file code inspection, array boundary safety, and error resolution skills.', 'AI Assessment', 45, 'Active')`, (err2, res2) => {
        if (err2) {
          console.error("Error inserting test:", err2);
          process.exit(1);
        }
        testId = res2.insertId;
        insertQuestion(testId);
      });
    } else {
      testId = res[0].id;
      insertQuestion(testId);
    }
  });
}, 1000);

function insertQuestion(testId) {
  db.query("SELECT id FROM aethon_questions WHERE test_id = ?", [testId], (err, res) => {
    if (res && res.length === 0) {
      const starter_files = {
        "src/index.js": "// Bug 1: Off-by-one error in array boundary check\nfunction calculateAverage(numbers) {\n    if (!numbers || numbers.length === 0) return 0;\n    let sum = 0;\n    // BUG: Loop condition contains <= instead of <\n    for (let i = 0; i <= numbers.length; i++) {\n        sum += numbers[i];\n    }\n    return sum / numbers.length;\n}\n\nmodule.exports = { calculateAverage };",
        "src/utils.js": "// Helper functions for Aethon Sentinel Assessment\nfunction sanitizeInput(data) {\n    if (typeof data !== 'string') return '';\n    return data.trim().toLowerCase();\n}\n\nmodule.exports = { sanitizeInput };",
        "README.md": "# Bug 1: Array Boundary Calculation Defect\n\n## Scenario\nThe function `calculateAverage(numbers)` in `src/index.js` is failing with `NaN` or `TypeError` when computing averages for numerical arrays.\n\n## Objective\n1. Inspect `src/index.js` and locate why the loop accesses an out-of-bounds index.\n2. Fix the loop termination condition so that all elements are added without dereferencing `numbers[numbers.length]`.\n3. Use **Aethon Sentinel AI Copilot** on the right sidebar if you need conceptual debugging hints!"
      };

      const solution_files = {
        "src/index.js": "function calculateAverage(numbers) {\n    if (!numbers || numbers.length === 0) return 0;\n    let sum = 0;\n    for (let i = 0; i < numbers.length; i++) {\n        sum += numbers[i];\n    }\n    return sum / numbers.length;\n}\n\nmodule.exports = { calculateAverage };"
      };

      const test_cases = [
        { name: "Basic Array Average", input: "[10, 20, 30]", expected: "20", hidden: false },
        { name: "Single Element Array", input: "[5]", expected: "5", hidden: false },
        { name: "Empty Array Handling", input: "[]", expected: "0", hidden: false },
        { name: "Negative Numbers", input: "[-10, 10]", expected: "0", hidden: true }
      ];

      db.query(`INSERT INTO aethon_questions (test_id, title, description, category, difficulty, starter_files, solution_files, test_cases) VALUES (?, 'Fix Array Out-of-Bounds in Average Calculator', 'Detect and fix the off-by-one boundary defect inside src/index.js.', 'Array Debugging', 'Easy', ?, ?, ?)`,
        [testId, JSON.stringify(starter_files), JSON.stringify(solution_files), JSON.stringify(test_cases)], (err3) => {
          if (err3) console.error("Error inserting question:", err3);
          else console.log("Seeded sample Aethon Sentinel Assessment into Portfolio database!");
          process.exit(0);
        });
    } else {
      console.log("Sample question already exists in Portfolio database.");
      process.exit(0);
    }
  });
}
