const db = require("./db");
const bcrypt = require("bcrypt");

async function seedAccounts() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);

    // 1. Seed Student: mohammedshameem1105@gmail.com
    const studentEmail = "mohammedshameem1105@gmail.com";
    const studentName = "Mohammed Shameem";
    
    db.query("SELECT * FROM users WHERE email = ?", [studentEmail], (err, res) => {
      if (err) {
        console.error("Error checking student user:", err);
      } else if (res.length === 0) {
        db.query(
          "INSERT INTO users (email, name, password, college_name) VALUES (?, ?, ?, ?)",
          [studentEmail, studentName, hashedPassword, "Aethon Institute of Technology"],
          (errIns, resIns) => {
            if (errIns) console.error("Error inserting student user:", errIns);
            else console.log(`✓ Student inserted: ${studentEmail}`);
          }
        );
      } else {
        db.query(
          "UPDATE users SET password = ?, name = ? WHERE email = ?",
          [hashedPassword, studentName, studentEmail],
          (errUpd) => {
            if (errUpd) console.error("Error updating student user:", errUpd);
            else console.log(`✓ Student password/name updated: ${studentEmail}`);
          }
        );
      }
    });

    // 2. Seed Admin: smvcreators43@gmail.com
    const adminEmail = "smvcreators43@gmail.com";
    const adminName = "SMV Admin";

    db.query("SELECT * FROM admin_users WHERE email = ?", [adminEmail], (err, res) => {
      if (err) {
        console.error("Error checking admin user:", err);
      } else if (res.length === 0) {
        db.query(
          "INSERT INTO admin_users (name, email, password) VALUES (?, ?, ?)",
          [adminName, adminEmail, hashedPassword],
          (errIns) => {
            if (errIns) console.error("Error inserting admin user:", errIns);
            else console.log(`✓ Admin inserted: ${adminEmail}`);
          }
        );
      } else {
        db.query(
          "UPDATE admin_users SET password = ?, name = ? WHERE email = ?",
          [hashedPassword, adminName, adminEmail],
          (errUpd) => {
            if (errUpd) console.error("Error updating admin user:", errUpd);
            else console.log(`✓ Admin password/name updated: ${adminEmail}`);
          }
        );
      }
    });

    // 3. Assign existing assessments to student mohammedshameem1105@gmail.com
    db.query("SELECT id FROM assessments", (err, assessments) => {
      if (!err && assessments && assessments.length > 0) {
        assessments.forEach(ass => {
          db.query(
            "INSERT INTO assigned_students (assessment_id, student_email, submitted) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE student_email=student_email",
            [ass.id, studentEmail],
            (errAssign) => {
              if (errAssign) console.error(`Error assigning assessment ${ass.id}:`, errAssign);
            }
          );
        });
        console.log(`✓ Assigned all available assessments to student ${studentEmail}`);
      }
    });

    setTimeout(() => {
      console.log("Seeding process completed successfully.");
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedAccounts();
