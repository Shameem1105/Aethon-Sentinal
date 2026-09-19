const db = require("./db");

/**
 * Examate AI Tutor - Read-Only Authorized Data Services & Tools
 * Strictly student-scoped data extraction routines.
 */

function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) resolve([]);
      else resolve(results);
    });
  });
}

async function getRelatedStudentEmails(studentEmail) {
  const emails = [studentEmail];
  const userRows = await queryAsync("SELECT roll_number, name FROM users WHERE email = ?", [studentEmail]);
  if (userRows.length > 0) {
    const { roll_number, name } = userRows[0];
    const namePart = (name || "").split(" ").pop();
    if (namePart && namePart.length > 2) {
      const related = await queryAsync(
        "SELECT email FROM users WHERE (roll_number IS NOT NULL AND roll_number != '' AND roll_number = ?) OR (name LIKE ? AND email != ?)",
        [roll_number || "___NONEXISTENT___", `%${namePart}%`, studentEmail]
      );
      related.forEach(r => {
        if (r.email && !emails.includes(r.email)) emails.push(r.email);
      });
    }
  }
  return emails;
}

// 1. Student Profile Data
async function getStudentProfile(studentEmail) {
  const users = await queryAsync("SELECT id, name, email, college_name, roll_number, dob FROM users WHERE email = ?", [studentEmail]);
  if (users.length === 0) {
    return { email: studentEmail, name: "Student", college: "N/A" };
  }
  return users[0];
}

// 2. Overall Performance Metrics
async function getOverallPerformance(studentEmail) {
  const emails = await getRelatedStudentEmails(studentEmail);
  const results = await queryAsync(
    "SELECT assessment_id, assessment_title, score, percentage, mcq_score, coding_score, mcq_attended, coding_attended, submitted_at FROM student_results WHERE student_email IN (?) ORDER BY submitted_at DESC",
    [emails]
  );
  const assignedSubmitted = await queryAsync(
    "SELECT COUNT(*) as cnt FROM assigned_students WHERE student_email IN (?) AND (submitted = 1 OR started = 1)",
    [emails]
  );

  const totalCount = Math.max(results.length, assignedSubmitted[0]?.cnt || 0);

  if (results.length === 0) {
    return {
      assessmentsCount: totalCount,
      averagePercentage: 0,
      totalScore: 0,
      recentResults: []
    };
  }

  const totalPercentage = results.reduce((acc, curr) => acc + (parseFloat(curr.percentage) || 0), 0);
  const avgPercentage = (totalPercentage / results.length).toFixed(1);

  return {
    assessmentsCount: totalCount,
    averagePercentage: parseFloat(avgPercentage),
    recentResults: results.slice(0, 5)
  };
}

// 3. Topic Weakness Analysis
async function getTopicWeaknesses(studentEmail) {
  const emails = await getRelatedStudentEmails(studentEmail);
  const answers = await queryAsync(
    `SELECT sa.question_id, sa.is_correct, q.section_name, q.difficulty, q.question_type 
     FROM student_answers sa 
     JOIN questions q ON sa.question_id = q.id 
     WHERE sa.student_email IN (?)`,
    [emails]
  );

  if (answers.length === 0) {
    return {
      weaknessSummary: "No assessment question data logged yet.",
      sectionsPerformance: {}
    };
  }

  const sections = {};
  answers.forEach(ans => {
    const sec = ans.section_name || "General";
    if (!sections[sec]) {
      sections[sec] = { total: 0, correct: 0 };
    }
    sections[sec].total++;
    if (ans.is_correct) sections[sec].correct++;
  });

  const analysis = {};
  const weakTopics = [];

  for (const [secName, data] of Object.entries(sections)) {
    const accuracy = Math.round((data.correct / data.total) * 100);
    analysis[secName] = {
      totalQuestions: data.total,
      accuracyPercentage: accuracy
    };
    if (accuracy < 60) {
      weakTopics.push({ section: secName, accuracy });
    }
  }

  return {
    sectionsPerformance: analysis,
    weakTopics: weakTopics.sort((a, b) => a.accuracy - b.accuracy)
  };
}

// 4. Recent Assessments List
async function getRecentAssessments(studentEmail) {
  const emails = await getRelatedStudentEmails(studentEmail);
  const assigned = await queryAsync(
    `SELECT a.id, a.title, a.test_type, a.marks, a.due_date, sa.submitted, sa.auto_submitted 
     FROM assigned_students sa 
     JOIN assessments a ON sa.assessment_id = a.id 
     WHERE sa.student_email IN (?) 
     ORDER BY a.id DESC LIMIT 10`,
    [emails]
  );
  return assigned;
}

// 5. Detailed Assessment Report
async function getAssessmentDetail(studentEmail, assessmentId) {
  const emails = await getRelatedStudentEmails(studentEmail);
  const results = await queryAsync(
    "SELECT * FROM student_results WHERE student_email IN (?) AND assessment_id = ?",
    [emails, assessmentId]
  );
  const answers = await queryAsync(
    `SELECT sa.question_id, sa.selected_option, sa.code_submitted, sa.is_correct, q.question_title, q.section_name, q.question_type 
     FROM student_answers sa 
     JOIN questions q ON sa.question_id = q.id 
     WHERE sa.student_email IN (?) AND sa.assessment_id = ?`,
    [emails, assessmentId]
  );

  return {
    summary: results[0] || null,
    answers: answers
  };
}

// 6. Check Active Exam Lock Status
async function checkActiveExamStatus(studentEmail) {
  const emails = await getRelatedStudentEmails(studentEmail);
  const activeExams = await queryAsync(
    `SELECT sa.assessment_id, a.title, a.start_time, a.end_time 
     FROM assigned_students sa 
     JOIN assessments a ON sa.assessment_id = a.id 
     WHERE sa.student_email IN (?) AND sa.submitted = 0 AND sa.started = 1`,
    [emails]
  );

  if (activeExams.length > 0) {
    return { isExamActive: true, assessment: activeExams[0] };
  }
  return { isExamActive: false };
}

module.exports = {
  getStudentProfile,
  getOverallPerformance,
  getTopicWeaknesses,
  getRecentAssessments,
  getAssessmentDetail,
  checkActiveExamStatus
};
