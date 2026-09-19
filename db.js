const mysql = require("mysql2");
require("dotenv").config(); 

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "portfolio",
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes("planetscale") 
        ? { rejectUnauthorized: true } 
        : false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("MySQL Pool Connected");


function addColumnIfNotExists(table, column, definition) {
  db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
    if (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes("Duplicate column")) {
        
      } else {
        console.error(`Error adding column ${column} to ${table}:`, err);
      }
    } else {
      console.log(`Column ${column} added to table ${table}`);
    }
  });
}

addColumnIfNotExists('assigned_students', 'auto_submitted', 'TINYINT(1) DEFAULT 0 AFTER submitted');
addColumnIfNotExists('assigned_students', 'started', 'TINYINT(1) DEFAULT 0 AFTER auto_submitted');
addColumnIfNotExists('assigned_students', 'resume_count', 'INT DEFAULT 0 AFTER started');
addColumnIfNotExists('student_results', 'auto_submitted', 'TINYINT(1) DEFAULT 0 AFTER score');
addColumnIfNotExists('proctoring_logs', 'status', "VARCHAR(50) DEFAULT 'Review' AFTER file_path");
addColumnIfNotExists('student_answers', 'language', 'VARCHAR(50) DEFAULT NULL');
addColumnIfNotExists('users', 'joining_year', 'INT DEFAULT NULL');
addColumnIfNotExists('users', 'passing_year', 'INT DEFAULT NULL');



db.query(`
  CREATE TABLE IF NOT EXISTS student_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    question_id INT NOT NULL,
    selected_option VARCHAR(255) DEFAULT NULL,
    code_submitted TEXT DEFAULT NULL,
    is_correct TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_student_question (assessment_id, student_email, question_id),
    CONSTRAINT fk_answers_assessment FOREIGN KEY (assessment_id) REFERENCES assessments (id) ON DELETE CASCADE,
    CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
`, (err) => {
  if (err) console.error("Error creating student_answers table:", err);
  else {
    console.log("student_answers table verified/created.");
    
    
    console.log("Running automatic database updates on startup for assessment 60...");
    db.query(`
      UPDATE assessments 
      SET start_time = NOW(), 
          end_time = DATE_ADD(NOW(), INTERVAL 24 HOUR) 
      WHERE id = 60
    `, (errUpdate) => {
      if (errUpdate) console.error("Error updating assessment times:", errUpdate);
      else console.log("Assessment 60 start/end times updated successfully.");
    });

    db.query(`
      INSERT INTO exam_controls (assessment_id, fullscreen, tab_switch, hover_detection, copy_paste_block, webcam, mic, screen_record)
      VALUES (60, 0, 0, 0, 0, 0, 0, 0)
      ON DUPLICATE KEY UPDATE fullscreen=0, tab_switch=0, hover_detection=0, copy_paste_block=0, webcam=0, mic=0, screen_record=0
    `, (errControls) => {
      if (errControls) console.error("Error updating exam_controls:", errControls);
      else console.log("Exam controls for assessment 60 disabled for testing.");
    });

    db.query("DELETE FROM student_results WHERE assessment_id = 60 AND student_email = 'shameem123@gmail.com'", (errDel) => {
      if (errDel) console.error("Error cleaning student_results:", errDel);
    });

    db.query("DELETE FROM student_answers WHERE assessment_id = 60 AND student_email = 'shameem123@gmail.com'", (errDel2) => {
      if (errDel2) console.error("Error cleaning student_answers:", errDel2);
    });

    db.query("UPDATE assigned_students SET submitted = 0, auto_submitted = 0 WHERE assessment_id = 60 AND student_email = 'shameem123@gmail.com'", (errReset) => {
      if (errReset) console.error("Error resetting assigned_students status:", errReset);
      else console.log("Reset submission status for shameem123@gmail.com successfully.");
    });
  }
});


const bcrypt = require("bcrypt");
bcrypt.hash("admin123", 10).then((hashed) => {
  
  db.query("UPDATE admin_users SET password = ? WHERE email = ?", [hashed, "admin@aethon.edu"], (err) => {
    if (err) console.error("Error setting admin@aethon.edu password:", err);
    else console.log("Auto-setup admin@aethon.edu password to 'admin123' (hashed)");
  });
  db.query("UPDATE admin_users SET password = ? WHERE email = ?", [hashed, "laxman123@gmail.com"], (err) => {
    if (err) console.error("Error setting laxman123@gmail.com password:", err);
    else console.log("Auto-setup laxman123@gmail.com password to 'admin123' (hashed)");
  });
  
  
  db.query("DELETE FROM users WHERE email IN ('admin@aethon.edu', 'laxman123@gmail.com')", (err) => {
    if (err) console.error("Error cleaning up admin emails from users table:", err);
    else console.log("Cleaned up any admin emails from users table");
  });
});

// Aethon Sentinel Table Verification
db.query(`
  CREATE TABLE IF NOT EXISTS aethon_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    test_type VARCHAR(50) DEFAULT 'AI Assessment',
    duration_minutes INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'Active',
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`, (err) => { if (err) console.error("Error creating aethon_tests:", err); });

db.query(`
  CREATE TABLE IF NOT EXISTS aethon_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    test_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'Debugging',
    difficulty VARCHAR(50) DEFAULT 'Medium',
    starter_files JSON NOT NULL,
    solution_files JSON NULL,
    test_cases JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`, (err) => { if (err) console.error("Error creating aethon_questions:", err); });

db.query(`
  CREATE TABLE IF NOT EXISTS aethon_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_email VARCHAR(255) NOT NULL,
    test_id INT NULL,
    question_id INT NOT NULL,
    submitted_files JSON NOT NULL,
    test_results JSON NULL,
    hints_used INT DEFAULT 0,
    score INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`, (err) => { if (err) console.error("Error creating aethon_submissions:", err); });

db.query(`
  CREATE TABLE IF NOT EXISTS aethon_ai_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_email VARCHAR(255) NOT NULL,
    question_id INT NOT NULL,
    student_prompt TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`, (err) => { if (err) console.error("Error creating aethon_ai_logs:", err); });

module.exports = db;