


(() => {
  // Ensure default admin session is ready without requiring login
  if (!localStorage.getItem("role") || localStorage.getItem("role") !== "admin") {
    localStorage.setItem("role", "admin");
  }
  if (!localStorage.getItem("userName")) {
    localStorage.setItem("userName", "SMV Admin");
  }
  if (!localStorage.getItem("userEmail")) {
    localStorage.setItem("userEmail", "admin@aethon.edu");
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  const profileWidget = document.querySelector(".sidebar-profile");
  if (profileWidget) {
    const name = localStorage.getItem("userName") || "SMV Admin";
    const roleName = "Administrator";
    const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

    profileWidget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="avatar">${initials}</div>
          <div class="profile-info">
            <span class="profile-name">${escapeHtml(name)}</span>
            <span class="profile-status">${roleName}</span>
          </div>
        </div>
        <button onclick="logout()" style="background: transparent; border: none; color: var(--gray-text); cursor: pointer; font-size: 18px; padding: 4px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Exit to Home">
          <i class="ri-logout-box-r-line"></i>
        </button>
      </div>
    `;
  }

  // Add seamless Student Portal Switcher Button to Admin Header
  const headerActions = document.querySelector(".header-actions");
  if (headerActions && !document.getElementById("btn-student-switch")) {
    const studentBtn = document.createElement("a");
    studentBtn.id = "btn-student-switch";
    studentBtn.href = "dashboard.html";
    studentBtn.style.cssText = "display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; cursor: pointer;";
    studentBtn.innerHTML = `<i class="ri-graduation-cap-line"></i> <span>Student Portal</span>`;
    studentBtn.onclick = () => {
      localStorage.setItem("role", "student");
      localStorage.setItem("userName", "Mohammed Shameem");
      localStorage.setItem("userEmail", "mohammedshameem1105@gmail.com");
    };
    headerActions.insertBefore(studentBtn, headerActions.firstChild);
  }

  const searchInput = document.querySelector(".header-search input");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const query = searchInput.value.trim();
        if (query) {
          console.log(`Global search initiated for: ${query}`);
          
          if (window.location.pathname.includes("admin-students.html")) {
            filterStudentsTable(query);
          } else if (window.location.pathname.includes("admin-assessments.html")) {
            filterAssessmentsTable(query);
          } else if (window.location.pathname.includes("admin-violations.html")) {
            filterViolationsTable(query);
          }
        }
      }
    });
  }

  const bellBtn = document.querySelector(".bell-btn");
  if (bellBtn) {
    bellBtn.addEventListener("click", () => {
      alert("No new critical platform alerts.");
    });
  }
});

function filterStudentsTable(query) {
  const rows = document.querySelectorAll(".custom-table tbody tr");
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? "" : "none";
  });
}

function filterAssessmentsTable(query) {
  const rows = document.querySelectorAll(".custom-table tbody tr");
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? "" : "none";
  });
}

function filterViolationsTable(query) {
  const rows = document.querySelectorAll(".custom-table tbody tr");
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(query.toLowerCase()) ? "" : "none";
  });
}

function logout() {
  window.location.replace("index.html");
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

