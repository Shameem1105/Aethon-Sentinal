const db = require("./db");

function setupTutorDB() {
  console.log("Setting up Examate AI Tutor Database Tables...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS tutor_conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_email VARCHAR(255) NOT NULL,
      title VARCHAR(255) DEFAULT 'New Conversation',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_student_email (student_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    `CREATE TABLE IF NOT EXISTS tutor_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      sender ENUM('user', 'assistant') NOT NULL,
      content TEXT NOT NULL,
      tools_used TEXT DEFAULT NULL,
      tokens_used INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES tutor_conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`,

    `CREATE TABLE IF NOT EXISTS tutor_provider_connections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_email VARCHAR(255) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      encrypted_key TEXT DEFAULT NULL,
      active TINYINT(1) DEFAULT 0,
      selected_model VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_student_provider (student_email, provider)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`
  ];

  let completed = 0;
  queries.forEach((q, idx) => {
    db.query(q, (err) => {
      if (err) {
        console.error(`Error executing Tutor table query #${idx + 1}:`, err);
      } else {
        console.log(`✓ Tutor table query #${idx + 1} executed successfully.`);
      }
      completed++;
      if (completed === queries.length) {
        console.log("Examate AI Tutor Database setup completed successfully.");
        process.exit(0);
      }
    });
  });
}

setupTutorDB();
