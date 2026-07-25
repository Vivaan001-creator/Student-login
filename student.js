import { db } from "./Firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================================================
// Date helper — accepts dd-mm-yyyy OR yyyy-mm-dd and returns
// a canonical yyyy-mm-dd string so login comparison works
// regardless of which format was typed / picked.
// ==========================================================
function toISODate(value) {
  if (!value) return "";
  const str = value.trim();

  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }

  m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }

  return str;
}

// ==========================================================
// Student / Parent Login (Roll Number + Date of Birth)
//
// NOTE on security: this checks the roll+DOB pair against the
// "students" collection directly from the client — there is no
// Firebase Auth account per student. That means your Firestore
// rules must allow read access to a student doc for this check
// to work, which also means DOB alone is a soft guard, not a
// strong password. Fine for a school portal MVP; if you need
// stronger security later, the standard upgrade is a Cloud
// Function that verifies roll+DOB server-side and mints a
// custom Firebase Auth token.
// ==========================================================
async function studentLogin() {
  const rollInput = document.getElementById("studentRoll");
  const dobInput = document.getElementById("studentDob");

  const roll = rollInput.value.trim();
  const dob = dobInput.value.trim();

  if (!roll || !dob) {
    alert("Roll Number aur Date of Birth dono bharein.");
    return;
  }

  try {
    const studentSnap = await getDoc(doc(db, "students", roll));

    if (!studentSnap.exists()) {
      alert("Yeh Roll Number system mein nahi mila.");
      return;
    }

    const student = studentSnap.data();
    const storedDob = toISODate(student.dob);
    const enteredDob = toISODate(dob);

    if (!storedDob || storedDob !== enteredDob) {
      alert("Date of Birth match nahi hui. Kripya dobara try karein.");
      return;
    }

    sessionStorage.setItem("studentLoggedIn", "true");
    sessionStorage.setItem("studentRoll", roll);
    window.location.href = "student-dashboard.html";

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}
window.studentLogin = studentLogin;

const studentLoginForm = document.getElementById("studentLoginForm");
if (studentLoginForm) {
  studentLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    await studentLogin();
  });
}

// ==========================================================
// Dashboard access guard
// ==========================================================
if (window.location.pathname.includes("student-dashboard.html")) {
  if (sessionStorage.getItem("studentLoggedIn") !== "true") {
    window.location.replace("student-login.html");
  }
}

// ==========================================================
// Logout
// ==========================================================
function studentLogout() {
  sessionStorage.removeItem("studentLoggedIn");
  sessionStorage.removeItem("studentRoll");
  window.location.replace("student-login.html");
}
window.studentLogout = studentLogout;

// ==========================================================
// Class → pass/max marks scale
// (mirrors the scale used in admin.js; normalizes "Class 1"
// and "1" to the same key since the Add Student form and the
// Class Management page currently store these differently)
// ==========================================================
const lowerClassKeys = ["nursery", "l.k.g", "u.k.g", "1", "2", "3", "4", "5"];

function isLowerClass(classValue) {
  const key = (classValue || "").toLowerCase().replace(/^class\s*/, "").trim();
  return lowerClassKeys.includes(key);
}

// ==========================================================
// Load Profile + Result (student-dashboard.html)
// ==========================================================
const profileBox = document.getElementById("studentProfileBox");

if (profileBox) {
  loadStudentDashboard();
}

async function loadStudentDashboard() {
  const roll = sessionStorage.getItem("studentRoll");
  if (!roll) return;

  const snap = await getDoc(doc(db, "students", roll));
  if (!snap.exists()) return;

  const student = snap.data();

  setText("dashStudentName", student.name || "-");
  setText("dashStudentRoll", roll);
  setText("dashStudentRoll2", roll);
  setText("dashStudentClass", student.class || "-");
  setText("dashStudentClass2", student.class || "-");
  setText("dashFatherName", student.father || "-");
  setText("dashAttendance", (student.attendance || "0") + "%");

  const monthSelect = document.getElementById("resultMonth");
  if (monthSelect) {
    loadResultMonths(monthSelect);
    monthSelect.addEventListener("change", function () {
      loadStudentResult(roll, student, this.value);
    });
    await loadStudentResult(roll, student, monthSelect.value);
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function loadResultMonths(monthSelect) {
  const months = [
    "June 2026", "July 2026", "August 2026", "September 2026", "October 2026",
    "November 2026", "December 2026", "January 2027", "February 2027", "March 2027",
    "April 2027", "May 2027", "June 2027", "July 2027", "August 2027", "September 2027",
    "October 2027", "November 2027", "December 2027", "January 2028"
  ];

  monthSelect.innerHTML = "";
  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });

  monthSelect.value = "June 2026";
}

async function loadStudentResult(roll, student, month) {
  const tableBody = document.getElementById("resultTableBody");
  const emptyMsg = document.getElementById("resultEmptyMsg");
  const summaryBox = document.getElementById("resultSummaryBox");

  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (summaryBox) summaryBox.innerHTML = "";

  if (student.publishStatus !== "published") {
    showEmpty(emptyMsg, "Aapka result abhi school dwara publish nahi kiya gaya hai.");
    return;
  }

  const snap = await getDoc(doc(db, "students", roll, "results", month));

  if (!snap.exists()) {
    showEmpty(emptyMsg, month + " ke liye result abhi upload nahi hua hai.");
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  const data = snap.data();
  const lower = isLowerClass(student.class);
  const maxMarks = lower ? 50 : 60;
  const passMarks = lower ? 17 : 20;

  let total = 0;
  let obtained = 0;
  let rows = "";

  Object.entries(data).forEach(([subject, marks]) => {
    const score = Number(marks) || 0;
    total += maxMarks;
    obtained += score;
    const passed = score >= passMarks;

    rows += `
      <tr>
        <td data-label="Subject">${subject}</td>
        <td data-label="Marks">${score} / ${maxMarks}</td>
        <td data-label="Status">
          <span class="${passed ? "status-pass" : "status-fail"}">
            ${passed ? "Pass" : "Fail"}
          </span>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = rows;

  const percentage = total > 0 ? ((obtained / total) * 100).toFixed(1) : "0.0";
  const overallPass = total > 0 && (obtained / total) * 100 >= (passMarks / maxMarks) * 100;

  if (summaryBox) {
    summaryBox.innerHTML = `
      <div class="mini-stat-card">
        <div class="mini-stat-icon purple"><i class="fa-solid fa-square-check"></i></div>
        <div class="mini-stat-info">
          <div class="mini-stat-number">${obtained}/${total}</div>
          <div class="mini-stat-label">Total Marks</div>
        </div>
      </div>
      <div class="mini-stat-card">
        <div class="mini-stat-icon blue"><i class="fa-solid fa-chart-line"></i></div>
        <div class="mini-stat-info">
          <div class="mini-stat-number">${percentage}%</div>
          <div class="mini-stat-label">Percentage</div>
        </div>
      </div>
      <div class="mini-stat-card">
        <div class="mini-stat-icon ${overallPass ? "green" : "orange"}">
          <i class="fa-solid ${overallPass ? "fa-circle-check" : "fa-triangle-exclamation"}"></i>
        </div>
        <div class="mini-stat-info">
          <div class="mini-stat-number">${overallPass ? "Pass" : "Review"}</div>
          <div class="mini-stat-label">Overall Result</div>
        </div>
      </div>
    `;
  }
}

function showEmpty(emptyMsg, text) {
  if (emptyMsg) {
    emptyMsg.style.display = "block";
    emptyMsg.textContent = text;
  }
}

// ==========================================================
// Sidebar hamburger + backdrop (same behaviour as admin.js,
// duplicated here so student pages don't need to load the
// full staff admin.js bundle)
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menuToggle");
  const sidebarBackdrop = document.getElementById("sidebarBackdrop");

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove("expanded");
    if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
  }

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("expanded");
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle("active");
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", closeSidebar);
  }
});
    
