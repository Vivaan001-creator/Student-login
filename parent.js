import { db } from "./Firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  documentId
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================================================
// Helpers
// ==========================================================
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showEmpty(emptyMsg, text) {
  if (emptyMsg) {
    emptyMsg.style.display = "block";
    emptyMsg.textContent = text;
  }
}

// Normalizes "Class 3" / "class 3" / "3" all to the same key.
// Admin's Add Student form saves student.class as the full
// display text (e.g. "Class 3"), while a class document's own
// id (used by homework.classId, fee structure, etc.) is usually
// just "3" — this bridges the two everywhere this file needs to
// match a student to their class.
function classKeyOf(value) {
  return String(value || "").trim().toLowerCase().replace(/^class\s*/, "");
}

// Looks up a class document either by its exact id (fast path,
// works once data is keyed consistently) or, failing that, by
// scanning and normalizing every class id — so Fee Status still
// works correctly even when a student's class is stored as
// "Class 3" but the class document's id is "3".
async function findClassDoc(classValue) {
  if (!classValue) return null;

  const directSnap = await getDoc(doc(db, "classes", classValue));
  if (directSnap.exists()) return directSnap.data();

  const targetKey = classKeyOf(classValue);
  const allSnap = await getDocs(collection(db, "classes"));
  const match = allSnap.docs.find((d) => classKeyOf(d.id) === targetKey);
  return match ? match.data() : null;
}

// ==========================================================
// Shared month list (same as student.js / result.js, so a
// month picked here matches what's actually stored under
// students/{roll}/results/{month})
// ==========================================================
const MONTHS = [
  "June 2026", "July 2026", "August 2026", "September 2026", "October 2026",
  "November 2026", "December 2026", "January 2027", "February 2027", "March 2027",
  "April 2027", "May 2027", "June 2027", "July 2027", "August 2027", "September 2027",
  "October 2027", "November 2027", "December 2027", "January 2028"
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function currentMonthLabel() {
  const now = new Date();
  const label = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  return MONTHS.includes(label) ? label : MONTHS[0];
}

function populateMonthDropdown(selectEl, months, defaultValue) {
  selectEl.innerHTML = "";
  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    selectEl.appendChild(opt);
  });
  selectEl.value = defaultValue || months[0];
}

// Converts a "June 2026" style label into a [start, end) yyyy-mm-dd
// range, used to query the attendance subcollection (doc IDs are
// plain yyyy-mm-dd dates, same as teacher.js writes them).
function monthLabelToRange(label) {
  const parts = (label || "").split(" ");
  const monthName = parts[0];
  const year = Number(parts[1]);
  const monthIndex = MONTH_NAMES.indexOf(monthName);
  if (monthIndex === -1 || !year) return null;

  const pad = (n) => String(n).padStart(2, "0");
  const start = `${year}-${pad(monthIndex + 1)}-01`;

  const endMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
  const endYear = monthIndex === 11 ? year + 1 : year;
  const end = `${endYear}-${pad(endMonthIndex + 1)}-01`;

  return { start, end };
}

// ==========================================================
// Parent Login (Roll Number + Registered Mobile Number)
//
// Deliberately a DIFFERENT credential pair than student login
// (which uses Roll + DOB) — this is what makes the Parent
// Portal "separate from student login" per login.html's own
// description, and it doubles as the key used to find every
// sibling registered under the same contact number.
// ==========================================================
async function parentLogin() {
  const rollInput = document.getElementById("parentRoll");
  const contactInput = document.getElementById("parentContact");

  const roll = rollInput.value.trim();
  const contact = contactInput.value.trim();

  if (!roll || !contact) {
    alert("Roll Number aur Mobile Number dono bharein.");
    return;
  }

  try {
    const studentSnap = await getDoc(doc(db, "students", roll));

    if (!studentSnap.exists()) {
      alert("Yeh Roll Number system mein nahi mila.");
      return;
    }

    const student = studentSnap.data();
    const storedContact = String(student.contactNumber || "").trim();

    if (!storedContact) {
      alert("Is Roll Number ke liye koi mobile number register nahi hai. Kripya school office se sampark karein.");
      return;
    }

    if (storedContact !== contact) {
      alert("Mobile Number match nahi hua. Kripya dobara try karein.");
      return;
    }

    sessionStorage.setItem("parentLoggedIn", "true");
    sessionStorage.setItem("parentContact", contact);
    sessionStorage.setItem("parentActiveRoll", roll);

    window.location.href = "parent-dashboard.html";

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}
window.parentLogin = parentLogin;

const parentLoginForm = document.getElementById("parentLoginForm");
if (parentLoginForm) {
  parentLoginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    await parentLogin();
  });
}

// ==========================================================
// Dashboard access guard
// ==========================================================
if (window.location.pathname.includes("parent-dashboard.html")) {
  if (sessionStorage.getItem("parentLoggedIn") !== "true") {
    window.location.replace("parent-login.html");
  }
}

// ==========================================================
// Logout
// ==========================================================
function parentLogout() {
  sessionStorage.removeItem("parentLoggedIn");
  sessionStorage.removeItem("parentContact");
  sessionStorage.removeItem("parentActiveRoll");
  window.location.replace("parent-login.html");
}
window.parentLogout = parentLogout;

// ==========================================================
// Load Dashboard — profile, result, attendance, homework,
// notices and fee status for the currently active child, plus
// a switcher for parents with more than one child in school.
// ==========================================================
const parentDashboardBox = document.getElementById("parentDashboardBox");

if (parentDashboardBox) {
  loadParentDashboard();
}

let childrenCache = [];

async function loadParentDashboard() {
  const contact = sessionStorage.getItem("parentContact");
  if (!contact) return;

  // Always read fresh from Firestore — no locally-cached student
  // data — so anything Admin edits/uploads shows up here immediately.
  const childSnap = await getDocs(
    query(collection(db, "students"), where("contactNumber", "==", contact))
  );

  if (childSnap.empty) {
    alert("Koi student record nahi mila. Kripya dobara login karein.");
    parentLogout();
    return;
  }

  childrenCache = childSnap.docs.map((d) => ({ roll: d.id, ...d.data() }));

  let activeRoll = sessionStorage.getItem("parentActiveRoll");
  if (!activeRoll || !childrenCache.some((c) => c.roll === activeRoll)) {
    activeRoll = childrenCache[0].roll;
    sessionStorage.setItem("parentActiveRoll", activeRoll);
  }

  renderChildSwitcher(activeRoll);
  await loadChildDashboard(activeRoll);
}

function renderChildSwitcher(activeRoll) {
  const section = document.getElementById("child-switch-section");
  const row = document.getElementById("childSwitchRow");
  if (!section || !row) return;

  if (childrenCache.length <= 1) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  row.innerHTML = childrenCache.map((c) => `
    <button type="button" class="child-chip ${c.roll === activeRoll ? "active" : ""}" onclick="switchChild('${c.roll}')">
      <i class="fa-solid fa-user"></i> ${escapeHtml(c.name || c.roll)}
    </button>
  `).join("");
}

async function switchChild(roll) {
  sessionStorage.setItem("parentActiveRoll", roll);
  renderChildSwitcher(roll);
  await loadChildDashboard(roll);
}
window.switchChild = switchChild;

async function loadChildDashboard(roll) {
  const child = childrenCache.find((c) => c.roll === roll);
  if (!child) return;

  setText("dashChildName", child.name || "-");
  setText("dashChildRoll", roll);
  setText("dashChildRoll2", roll);
  setText("dashChildClass", child.class || "-");
  setText("dashChildClass2", child.class || "-");
  setText("dashFatherName", child.father || "-");
  setText("dashAttendance", (child.attendance || "0") + "%");

  const monthSelect = document.getElementById("resultMonth");
  if (monthSelect) {
    populateMonthDropdown(monthSelect, MONTHS, currentMonthLabel());
  }

  const attMonthSelect = document.getElementById("attendanceMonth");
  if (attMonthSelect) {
    populateMonthDropdown(attMonthSelect, MONTHS, currentMonthLabel());
    attMonthSelect.onchange = () => loadChildAttendance(roll, attMonthSelect.value);
    await loadChildAttendance(roll, attMonthSelect.value);
  }

  await loadChildHomework(child);
  await loadChildFeeStatus(roll, child);
  await loadNotices();
}

// ==========================================================
// Attendance (reads students/{roll}/attendance/{yyyy-mm-dd}
// docs written by the teacher's Attendance page)
// ==========================================================
async function loadChildAttendance(roll, month) {
  const summaryBox = document.getElementById("attendanceSummaryBox");
  const tableBody = document.getElementById("attendanceTableBody");
  const emptyMsg = document.getElementById("attendanceEmptyMsg");

  if (!tableBody) return;

  tableBody.innerHTML = "";
  if (summaryBox) summaryBox.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  const range = monthLabelToRange(month);
  if (!range) return;

  try {
    const attQuery = query(
      collection(db, "students", roll, "attendance"),
      where(documentId(), ">=", range.start),
      where(documentId(), "<", range.end),
      orderBy(documentId(), "desc")
    );

    const snap = await getDocs(attQuery);

    if (snap.empty) {
      showEmpty(emptyMsg, month + " ke liye abhi tak attendance record nahi hai.");
      return;
    }

    let present = 0;
    let absent = 0;
    let rows = "";

    snap.forEach((docSnap) => {
      const status = docSnap.data().status || "Present";
      if (status === "Present") present++; else absent++;

      const dateText = new Date(docSnap.id + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      });

      rows += `
        <tr>
          <td data-label="Date">${dateText}</td>
          <td data-label="Status">
            <span class="${status === "Present" ? "status-active" : "status-inactive"}">${escapeHtml(status)}</span>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = rows;

    const total = present + absent;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";

    if (summaryBox) {
      summaryBox.innerHTML = `
        <div class="mini-stat-card">
          <div class="mini-stat-icon green"><i class="fa-solid fa-circle-check"></i></div>
          <div class="mini-stat-info">
            <div class="mini-stat-number">${present}</div>
            <div class="mini-stat-label">Present</div>
          </div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-icon orange"><i class="fa-solid fa-circle-xmark"></i></div>
          <div class="mini-stat-info">
            <div class="mini-stat-number">${absent}</div>
            <div class="mini-stat-label">Absent</div>
          </div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-icon blue"><i class="fa-solid fa-chart-line"></i></div>
          <div class="mini-stat-info">
            <div class="mini-stat-number">${percentage}%</div>
            <div class="mini-stat-label">Attendance</div>
          </div>
        </div>
      `;
    }

  } catch (error) {
    console.error(error);
    showEmpty(emptyMsg, "Attendance load nahi ho paayi: " + error.message);
  }
}

// ==========================================================
// Homework (reads the top-level "homework" collection the
// same way teacher.js writes it — scoped to the child's class,
// matched with the same normalized key used across the app so
// "Class 3" on the student and "3" on the homework doc still
// match up)
// ==========================================================
async function loadChildHomework(child) {
  const list = document.getElementById("homeworkList");
  const emptyMsg = document.getElementById("homeworkEmptyMsg");

  if (!list) return;

  list.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  if (!child.class) {
    showEmpty(emptyMsg, "Class set nahi hai, isliye homework nahi dikhaya ja sakta.");
    return;
  }

  try {
    const allSnap = await getDocs(collection(db, "homework"));
    const targetKey = classKeyOf(child.class);

    const matching = allSnap.docs
      .filter((d) => classKeyOf(d.data().classId) === targetKey)
      .map((d) => d.data())
      .sort((a, b) => {
        const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });

    if (matching.length === 0) {
      showEmpty(emptyMsg, "Abhi tak koi homework nahi diya gaya.");
      return;
    }

    list.innerHTML = matching.map((hw) => `
      <div class="homework-item">
        <div class="homework-tag">
          <span class="subject">${escapeHtml(hw.subject || "-")}</span>
          <span class="due">${escapeHtml(hw.dueDate || "")}</span>
        </div>
        <div class="homework-body">
          <h4>${escapeHtml(hw.title || "Homework")}</h4>
          <p>${escapeHtml(hw.description || "")}</p>
        </div>
      </div>
    `).join("");

  } catch (error) {
    console.error(error);
    showEmpty(emptyMsg, "Homework load nahi ho paaya: " + error.message);
  }
}

// ==========================================================
// Notice Board (reads the top-level "notices" collection,
// same one notices.html on the admin side writes to — school-
// wide, so it's identical regardless of which child is active)
// ==========================================================
async function loadNotices() {
  const list = document.getElementById("noticesList");
  const emptyMsg = document.getElementById("noticesEmptyMsg");

  if (!list) return;

  list.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  try {
    const noticesQuery = query(collection(db, "notices"), orderBy("date", "desc"), limit(30));
    const snap = await getDocs(noticesQuery);

    if (snap.empty) {
      showEmpty(emptyMsg, "Abhi tak koi notice nahi hai.");
      return;
    }

    let html = "";

    snap.forEach((docSnap) => {
      const n = docSnap.data();
      const dateText = n.date && n.date.toDate
        ? n.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";

      html += `
        <div class="notice-item">
          <div class="notice-tag">
            <i class="fa-regular fa-bell"></i>
            <span class="date">${dateText}</span>
          </div>
          <div class="notice-body">
            <h4>${escapeHtml(n.title || "-")}</h4>
            <p>${escapeHtml(n.description || "")}</p>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;

  } catch (error) {
    console.error(error);
    showEmpty(emptyMsg, "Notices load nahi ho paayi: " + error.message);
  }
}

// ==========================================================
// Fee Status (reads classes/{classId} for the fee structure
// and students/{roll}/payments for this child's own payment
// history — same data admin's Fee Management page writes)
// ==========================================================
async function loadChildFeeStatus(roll, child) {
  const summaryBox = document.getElementById("feeSummaryBox");
  const tableBody = document.getElementById("feeTableBody");
  const emptyMsg = document.getElementById("feeEmptyMsg");

  if (!summaryBox) return;

  summaryBox.innerHTML = "";
  if (tableBody) tableBody.innerHTML = "";
  if (emptyMsg) emptyMsg.style.display = "none";

  try {
    const classData = await findClassDoc(child.class);
    const feeAmount = classData ? Number(classData.feeAmount) || 0 : 0;
    const feeFrequency = classData ? (classData.feeFrequency || "-") : "-";

    const paymentsSnap = await getDocs(
      query(collection(db, "students", roll, "payments"), orderBy("date", "desc"))
    );

    let totalPaid = 0;
    let rows = "";

    paymentsSnap.forEach((p) => {
      const pay = p.data();
      totalPaid += Number(pay.amount) || 0;
      const dateText = pay.date && pay.date.toDate
        ? pay.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";
      rows += `
        <tr>
          <td data-label="Date">${dateText}</td>
          <td data-label="Amount">₹${pay.amount}</td>
          <td data-label="Mode">${escapeHtml(pay.mode || "-")}</td>
          <td data-label="Note">${escapeHtml(pay.note || "-")}</td>
        </tr>
      `;
    });

    const balance = feeAmount - totalPaid;
    const statusBadge = !feeAmount
      ? `<span class="status-inactive">Fee not set</span>`
      : balance <= 0
        ? `<span class="status-active">Paid</span>`
        : `<span class="status-inactive">Due ₹${balance}</span>`;

    summaryBox.innerHTML = `
      <div class="fee-student-summary">
        <div class="fee-student-who">
          <strong>${escapeHtml(child.name || "-")}</strong>
          <span>${escapeHtml(child.class || "-")} · Roll ${escapeHtml(roll)}</span>
        </div>
        <div class="fee-student-amounts">
          <span>Fee: ₹${feeAmount || 0} / ${escapeHtml(feeFrequency)}</span>
          <span>Paid: ₹${totalPaid}</span>
          ${statusBadge}
        </div>
      </div>
    `;

    if (tableBody) {
      tableBody.innerHTML = rows || `<tr><td colspan="4">Abhi koi payment record nahi hai.</td></tr>`;
    }

  } catch (error) {
    console.error(error);
    if (emptyMsg) showEmpty(emptyMsg, "Fee status load nahi ho paayi: " + error.message);
  }
}

// ==========================================================
// Sidebar hamburger + backdrop (same behaviour as student.js /
// teacher.js / admin.js)
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
