import { db, auth } from "./Firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ==========================
// Helpers
// ==========================
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = (text === undefined || text === null || text === "") ? "-" : text;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ==========================================================
// BUG FIX — class-key matching
//
// Admin's "Add Student" form saves student.class as whatever
// text the Class <select> shows (e.g. "Class 3"), while a
// class document's own id/key (used everywhere here as
// ctx.myClass.id) is usually just "3". An exact Firestore
// where("class","==", ctx.myClass.id) query therefore missed
// every admin-added student, which is why "My Students",
// Marks, Attendance and the dashboard's student count all
// showed empty/0 for a teacher whose class had real students.
//
// Firestore can't normalize inside a where() clause, so for
// this small-school scale we fetch all students once and
// filter client-side using the same normalization admin.js
// now uses for its own class counts.
// ==========================================================
function classKeyOf(value) {
  return String(value || "").trim().toLowerCase().replace(/^class\s*/, "");
}

async function getStudentsInClass(classId) {
  const allSnap = await getDocs(collection(db, "students"));
  const targetKey = classKeyOf(classId);
  return allSnap.docs.filter((d) => classKeyOf(d.data().class) === targetKey);
}

// ==========================
// Teacher Login
// ==========================
async function teacherLogin() {

  const email = document.getElementById("teacherEmail").value.trim();
  const password = document.getElementById("teacherPassword").value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {

    await signInWithEmailAndPassword(auth, email, password);

    const teacherQuery = query(collection(db, "teachers"), where("email", "==", email));
    const snap = await getDocs(teacherQuery);

    if (snap.empty) {
      await signOut(auth);
      alert("Ye account Teacher ke roop mein register nahi hai. Admin se sampark karein.");
      return;
    }

    const teacherDoc = snap.docs[0];

    sessionStorage.setItem("teacherLoggedIn", "true");
    sessionStorage.setItem("teacherDocId", teacherDoc.id);

    window.location.href = "teacher-dashboard.html";

  } catch (error) {
    alert(error.message);
  }

}
window.teacherLogin = teacherLogin;

const teacherLoginForm = document.getElementById("teacherLoginForm");
if (teacherLoginForm) {
  teacherLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await teacherLogin();
  });
}

// ==========================
// Teacher Pages Security
// ==========================
const teacherPages = [
  "teacher-dashboard.html",
  "teacher-students.html",
  "teacher-marks.html",
  "teacher-attendance.html",
  "teacher-homework.html"
];

const page = location.pathname;

if (teacherPages.some((p) => page.includes(p))) {
  if (sessionStorage.getItem("teacherLoggedIn") !== "true") {
    window.location.replace("teacher-login.html");
  }
}

// ==========================
// Teacher Logout
// ==========================
async function teacherLogout() {
  try {
    await signOut(auth);
    sessionStorage.removeItem("teacherLoggedIn");
    sessionStorage.removeItem("teacherDocId");
    window.location.replace("teacher-login.html");
  } catch (error) {
    alert(error.message);
  }
}
window.teacherLogout = teacherLogout;

// ==========================
// Change Password (sends a reset link to the teacher's own email)
// ==========================
async function teacherChangePassword() {

  const teacherDocId = sessionStorage.getItem("teacherDocId");
  if (!teacherDocId) return;

  try {
    const snap = await getDoc(doc(db, "teachers", teacherDocId));
    if (!snap.exists()) return;

    const email = snap.data().email;
    await sendPasswordResetEmail(auth, email);
    alert("Password reset link bhej diya gaya hai: " + email);

  } catch (error) {
    alert(error.message);
  }

}
window.teacherChangePassword = teacherChangePassword;

// ==========================
// Load Teacher Dashboard
// ==========================
async function loadTeacherDashboard() {

  if (!location.pathname.includes("teacher-dashboard.html")) return;

  const teacherDocId = sessionStorage.getItem("teacherDocId");
  if (!teacherDocId) return;

  try {

    const snap = await getDoc(doc(db, "teachers", teacherDocId));
    if (!snap.exists()) return;

    const t = snap.data();

    setText("topbarTeacherName", t.name);
    setText("teacherNameText", t.name);
    setText("teacherSubjectLine", t.subject ? `${t.subject} Teacher` : "Teacher");
    setText("teacherSubjectText", t.subject);
    setText("teacherEmailText", t.email);
    setText("teacherPhoneText", t.phone);
    setText("teacherQualificationText", t.qualification);
    setText("teacherExperienceText", t.experience ? `${t.experience} yrs` : "-");
    setText("teacherStatusText", t.status);

    // Find the class(es) where this teacher is the class teacher
    const classBox = document.getElementById("teacherClassBox");
    if (classBox && t.email) {

      const classQuery = query(collection(db, "classes"), where("teacherEmail", "==", t.email));
      const classSnap = await getDocs(classQuery);

      if (classSnap.empty) {
        classBox.innerHTML = `<p class="no-class-msg">Abhi koi class assign nahi hui hai — Admin se class assignment ke liye sampark karein.</p>`;
      } else {
        classBox.innerHTML = classSnap.docs.map((d) => {
          const c = d.data();
          return `
            <div class="my-class-card">
              <div class="my-class-icon"><i class="fa-solid fa-chalkboard"></i></div>
              <div>
                <strong>${escapeHtml(c.className || d.id)}</strong>
                <span>${escapeHtml(c.wing || "")}</span>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    // Live counts for the dashboard's quick-stat cards, if present
    const ctx = await getMyContext();

    if (ctx && ctx.myClass) {

      // BUG FIX: was where("class","==", ctx.myClass.id) which missed
      // admin-added students stored as "Class 3" instead of "3".
      const studentDocs = await getStudentsInClass(ctx.myClass.id);
      setText("dashStudentCount", studentDocs.length);

      const hwSnap = await getDocs(query(collection(db, "homework"), where("classId", "==", ctx.myClass.id)));
      setText("dashHomeworkCount", hwSnap.size);

    } else {
      setText("dashStudentCount", "0");
      setText("dashHomeworkCount", "0");
    }

  } catch (error) {
    console.error("Could not load teacher dashboard:", error);
  }

}

loadTeacherDashboard();

// ==========================
// Class -> Subjects map
// (kept in sync with admin.js's class/subject setup; falls
// back to a default list if a class key doesn't match)
// ==========================
const classSubjects = {
  "Nursery": ["English", "Math", "Hindi", "Rhymes", "G.K"],
  "L.K.G": ["English", "Math", "Hindi", "Rhymes", "G.K"],
  "U.K.G": ["English", "Math", "Hindi", "Rhymes", "G.K"],
  "1": ["English", "Math", "Hindi", "Computer", "E.V.S", "G.K"],
  "2": ["English", "Math", "Hindi", "Computer", "E.V.S", "G.K"],
  "3": ["English", "Math", "Hindi", "Computer", "E.V.S", "G.K"],
  "4": ["English", "Math", "Hindi", "Computer", "E.V.S", "G.K"],
  "5": ["English", "Math", "Hindi", "Computer", "E.V.S", "G.K"],
  "6": ["English", "Math", "Hindi", "Science", "Social Studies"],
  "7": ["English", "Math", "Hindi", "Science", "Social Studies"],
  "8": ["English", "Math", "Hindi", "Science", "Social Studies"],
  "9": ["English", "Math", "Hindi", "Science", "Social Studies"],
  "10": ["English", "Math", "Hindi", "Science", "Social Studies"]
};

const lowerClasses = ["Nursery", "L.K.G", "U.K.G", "1", "2", "3", "4", "5"];
const DEFAULT_SUBJECTS = ["English", "Math", "Hindi", "Science", "G.K"];

const MONTHS = [
  "June 2026", "July 2026", "August 2026", "September 2026", "October 2026",
  "November 2026", "December 2026", "January 2027", "February 2027", "March 2027",
  "April 2027", "May 2027", "June 2027", "July 2027", "August 2027", "September 2027",
  "October 2027", "November 2027", "December 2027", "January 2028"
];

function normalizeClassKey(classValue) {
  if (!classValue) return null;
  if (classSubjects[classValue]) return classValue;
  const stripped = String(classValue).replace(/^class\s*/i, "").trim();
  if (classSubjects[stripped]) return stripped;
  return null;
}

function resolveSubjects(classValue) {
  const key = normalizeClassKey(classValue);
  return key ? classSubjects[key] : DEFAULT_SUBJECTS;
}

function maxMarksFor(classValue) {
  const key = normalizeClassKey(classValue);
  return key && lowerClasses.includes(key) ? 50 : 60;
}

function passMarksFor(classValue) {
  const key = normalizeClassKey(classValue);
  return key && lowerClasses.includes(key) ? 17 : 20;
}

// ==========================
// Shared: "my class" lookup (teacher doc + assigned class)
// used by Students / Marks / Attendance / Homework pages
// ==========================
let myContextCache = null;

async function getMyContext() {

  if (myContextCache) return myContextCache;

  const teacherDocId = sessionStorage.getItem("teacherDocId");
  if (!teacherDocId) return null;

  const snap = await getDoc(doc(db, "teachers", teacherDocId));
  if (!snap.exists()) return null;

  const teacher = snap.data();
  let myClass = null;

  if (teacher.email) {
    const classSnap = await getDocs(query(collection(db, "classes"), where("teacherEmail", "==", teacher.email)));
    if (!classSnap.empty) {
      const classDoc = classSnap.docs[0];
      myClass = { id: classDoc.id, ...classDoc.data() };
    }
  }

  myContextCache = { teacherId: teacherDocId, teacher, myClass };
  return myContextCache;

}

function showEmptyClassNote(id) {
  const note = document.getElementById(id);
  if (note) note.style.display = "flex";
}

// ==========================
// My Students
// ==========================
async function loadMyStudents() {

  const tableBody = document.getElementById("myStudentsTable");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4">Loading...</td></tr>`;

  const ctx = await getMyContext();

  if (!ctx || !ctx.myClass) {
    tableBody.innerHTML = `<tr><td colspan="4">Aapko abhi tak koi class assign nahi hui. Admin se sampark karein.</td></tr>`;
    showEmptyClassNote("noClassMsgStudents");
    return;
  }

  // BUG FIX: fetch + normalize instead of an exact-match where()
  const studentDocs = await getStudentsInClass(ctx.myClass.id);

  if (studentDocs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4">Is class mein abhi koi student nahi hai.</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";

  studentDocs.forEach((docSnap) => {

    const s = docSnap.data();
    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Roll No.">${escapeHtml(docSnap.id)}</td>
      <td data-label="Name">${escapeHtml(s.name || "-")}</td>
      <td data-label="Father's Name">${escapeHtml(s.father || "-")}</td>
      <td data-label="Action">
        <div class="action-btns">
          <button class="btn-view" onclick="openMarksFor('${docSnap.id}')">
            <i class="fa-solid fa-pen-to-square"></i> Add Marks
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);

  });

}

function openMarksFor(roll) {
  localStorage.setItem("teacherMarksRoll", roll);
  window.location.href = "teacher-marks.html";
}
window.openMarksFor = openMarksFor;

function searchMyStudents() {
  const input = document.getElementById("searchMyStudent")?.value.toLowerCase() || "";
  const rows = document.querySelectorAll("#myStudentsTable tr");

  rows.forEach((row) => {
    if (!row.cells || row.cells.length < 2) return;
    const roll = row.cells[0].textContent.toLowerCase();
    const name = row.cells[1].textContent.toLowerCase();
    row.style.display = roll.includes(input) || name.includes(input) ? "" : "none";
  });
}
window.searchMyStudents = searchMyStudents;

if (location.pathname.includes("teacher-students.html")) {
  loadMyStudents();
}

// ==========================
// Marks Entry
// ==========================
let currentMarksRoll = null;

async function loadMarksPage() {

  const tableBody = document.getElementById("marksStudentsTable");
  if (!tableBody) return;

  populateMonthDropdown("marksMonth");

  const ctx = await getMyContext();

  if (!ctx || !ctx.myClass) {
    tableBody.innerHTML = `<tr><td colspan="3">Aapko abhi tak koi class assign nahi hui.</td></tr>`;
    showEmptyClassNote("noClassMsgMarks");
    return;
  }

  // BUG FIX: fetch + normalize instead of an exact-match where()
  const studentDocs = await getStudentsInClass(ctx.myClass.id);

  tableBody.innerHTML = "";

  if (studentDocs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3">Is class mein koi student nahi hai.</td></tr>`;
    return;
  }

  studentDocs.forEach((docSnap) => {

    const s = docSnap.data();
    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Roll No.">${escapeHtml(docSnap.id)}</td>
      <td data-label="Name">${escapeHtml(s.name || "-")}</td>
      <td data-label="Action">
        <div class="action-btns">
          <button class="btn-edit" onclick="openMarksModal('${docSnap.id}', '${escapeHtml(s.name || "")}', '${escapeHtml(s.class || ctx.myClass.id)}')">
            <i class="fa-solid fa-pen-to-square"></i> Enter Marks
          </button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);

  });

  const preselectRoll = localStorage.getItem("teacherMarksRoll");

  if (preselectRoll) {
    localStorage.removeItem("teacherMarksRoll");
    const studentSnap = await getDoc(doc(db, "students", preselectRoll));
    if (studentSnap.exists()) {
      const s = studentSnap.data();
      openMarksModal(preselectRoll, s.name || "", s.class || ctx.myClass.id);
    }
  }

}

function populateMonthDropdown(id) {
  const select = document.getElementById(id);
  if (!select) return;

  select.innerHTML = "";

  MONTHS.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
}

async function openMarksModal(roll, name, studentClass) {

  currentMarksRoll = roll;

  document.getElementById("marksModalTitle").textContent = `Marks - ${name} (Roll ${roll})`;

  const monthSelect = document.getElementById("marksMonth");
  if (!monthSelect.value) monthSelect.value = MONTHS[0];

  renderMarksEditor(studentClass);
  await loadMarksFromFirestore(roll, monthSelect.value);

  monthSelect.onchange = async () => {
    renderMarksEditor(studentClass);
    await loadMarksFromFirestore(roll, monthSelect.value);
  };

  document.getElementById("marksModalBackdrop").classList.add("open");

}
window.openMarksModal = openMarksModal;

function renderMarksEditor(studentClass) {

  const editor = document.getElementById("marksEditor");
  if (!editor) return;

  const subjects = resolveSubjects(studentClass);
  const maxM = maxMarksFor(studentClass);
  const passM = passMarksFor(studentClass);

  editor.innerHTML = subjects.map((subject) => `
    <div class="subject-row">
      <label>
        ${escapeHtml(subject)}
        <br>
        <small>Max : ${maxM}&nbsp;&nbsp;Pass : ${passM}</small>
      </label>
      <input type="number" min="0" max="${maxM}" value="0" data-subject="${escapeHtml(subject)}">
    </div>
  `).join("");

}

async function loadMarksFromFirestore(roll, month) {

  const resultSnap = await getDoc(doc(db, "students", roll, "results", month));
  if (!resultSnap.exists()) return;

  const data = resultSnap.data();

  document.querySelectorAll("#marksEditor input").forEach((input) => {
    const subject = input.dataset.subject;
    if (data[subject] !== undefined) input.value = data[subject];
  });

}

async function saveTeacherMarks() {

  if (!currentMarksRoll) return;

  const month = document.getElementById("marksMonth").value;
  const inputs = document.querySelectorAll("#marksEditor input");

  const resultData = {};
  inputs.forEach((input) => {
    resultData[input.dataset.subject] = Number(input.value);
  });

  try {
    await setDoc(doc(db, "students", currentMarksRoll, "results", month), resultData);
    alert("Marks saved successfully.");
    closeMarksModal();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.saveTeacherMarks = saveTeacherMarks;

function closeMarksModal() {
  document.getElementById("marksModalBackdrop").classList.remove("open");
  currentMarksRoll = null;
}
window.closeMarksModal = closeMarksModal;

function searchMarksStudents() {
  const input = document.getElementById("searchMarksStudent")?.value.toLowerCase() || "";
  const rows = document.querySelectorAll("#marksStudentsTable tr");

  rows.forEach((row) => {
    if (!row.cells || row.cells.length < 2) return;
    const roll = row.cells[0].textContent.toLowerCase();
    const name = row.cells[1].textContent.toLowerCase();
    row.style.display = roll.includes(input) || name.includes(input) ? "" : "none";
  });
}
window.searchMarksStudents = searchMarksStudents;

if (location.pathname.includes("teacher-marks.html")) {

  loadMarksPage();

  document.addEventListener("DOMContentLoaded", () => {
    const backdrop = document.getElementById("marksModalBackdrop");
    if (backdrop) {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeMarksModal();
      });
    }
  });

}

// ==========================
// Attendance
// ==========================
async function loadAttendancePage() {

  const tableBody = document.getElementById("attendanceTable");
  if (!tableBody) return;

  const dateInput = document.getElementById("attendanceDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  await renderAttendanceList(dateInput.value);

  dateInput.addEventListener("change", () => renderAttendanceList(dateInput.value));

}

async function renderAttendanceList(date) {

  const tableBody = document.getElementById("attendanceTable");
  tableBody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

  const ctx = await getMyContext();

  if (!ctx || !ctx.myClass) {
    tableBody.innerHTML = `<tr><td colspan="3">Aapko abhi tak koi class assign nahi hui.</td></tr>`;
    showEmptyClassNote("noClassMsgAttendance");
    return;
  }

  // BUG FIX: fetch + normalize instead of an exact-match where()
  const studentDocs = await getStudentsInClass(ctx.myClass.id);

  if (studentDocs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="3">Is class mein koi student nahi hai.</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";

  for (const docSnap of studentDocs) {

    const s = docSnap.data();
    const roll = docSnap.id;
    let existingStatus = "Present";

    try {
      const attSnap = await getDoc(doc(db, "students", roll, "attendance", date));
      if (attSnap.exists()) existingStatus = attSnap.data().status || "Present";
    } catch (e) {
      // ignore - default to Present
    }

    const row = document.createElement("tr");

    row.innerHTML = `
      <td data-label="Roll No.">${escapeHtml(roll)}</td>
      <td data-label="Name">${escapeHtml(s.name || "-")}</td>
      <td data-label="Status">
        <div class="attendance-toggle" data-roll="${escapeHtml(roll)}">
          <button type="button" class="att-pill att-present${existingStatus === "Present" ? " active" : ""}" data-status="Present">Present</button>
          <button type="button" class="att-pill att-absent${existingStatus === "Absent" ? " active" : ""}" data-status="Absent">Absent</button>
        </div>
      </td>
    `;

    tableBody.appendChild(row);

  }

  document.querySelectorAll(".attendance-toggle").forEach((toggle) => {
    toggle.querySelectorAll(".att-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggle.querySelectorAll(".att-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  });

}

async function saveAttendance() {

  const date = document.getElementById("attendanceDate").value;

  if (!date) {
    alert("Pehle date select karein.");
    return;
  }

  const rows = document.querySelectorAll(".attendance-toggle");

  try {

    for (const row of rows) {

      const roll = row.dataset.roll;
      const activeBtn = row.querySelector(".att-pill.active");
      const status = activeBtn ? activeBtn.dataset.status : "Present";

      await setDoc(doc(db, "students", roll, "attendance", date), {
        status,
        markedBy: sessionStorage.getItem("teacherDocId") || "",
        markedAt: serverTimestamp()
      });

    }

    alert("Attendance saved successfully.");

  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.saveAttendance = saveAttendance;

if (location.pathname.includes("teacher-attendance.html")) {
  loadAttendancePage();
}

// ==========================
// Homework
// ==========================
async function loadHomeworkPage() {

  const ctx = await getMyContext();
  const subjectList = document.getElementById("hwSubjectList");

  if (subjectList) {
    subjectList.innerHTML = "";
    const subjects = ctx && ctx.myClass ? resolveSubjects(ctx.myClass.id) : DEFAULT_SUBJECTS;
    subjects.forEach((subj) => {
      const opt = document.createElement("option");
      opt.value = subj;
      subjectList.appendChild(opt);
    });
  }

  if (!ctx || !ctx.myClass) {
    showEmptyClassNote("noClassMsgHw");
  }

  await loadHomeworkList();

}

async function loadHomeworkList() {

  const list = document.getElementById("homeworkList");
  if (!list) return;

  list.innerHTML = `<p class="result-empty-msg">Loading...</p>`;

  const ctx = await getMyContext();

  if (!ctx || !ctx.myClass) {
    list.innerHTML = `<p class="result-empty-msg">Aapko abhi tak koi class assign nahi hui.</p>`;
    return;
  }

  let snap;

  try {
    snap = await getDocs(query(collection(db, "homework"), where("classId", "==", ctx.myClass.id), orderBy("createdAt", "desc")));
  } catch (error) {
    console.error(error);
    snap = await getDocs(query(collection(db, "homework"), where("classId", "==", ctx.myClass.id)));
  }

  if (snap.empty) {
    list.innerHTML = `<p class="result-empty-msg">Abhi tak koi homework nahi diya gaya.</p>`;
    return;
  }

  list.innerHTML = "";

  snap.forEach((docSnap) => {

    const hw = docSnap.data();
    const item = document.createElement("div");
    item.className = "homework-item";

    item.innerHTML = `
      <div class="homework-tag">
        <span class="subject">${escapeHtml(hw.subject || "-")}</span>
        <span class="due">${escapeHtml(hw.dueDate || "")}</span>
      </div>
      <div class="homework-body">
        <h4>${escapeHtml(hw.title || "Homework")}</h4>
        <p>${escapeHtml(hw.description || "")}</p>
      </div>
      <div class="action-btns">
        <button class="btn-delete" onclick="deleteHomework('${docSnap.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    list.appendChild(item);

  });

}

async function addHomework() {

  const subject = document.getElementById("hwSubject").value.trim();
  const title = document.getElementById("hwTitle").value.trim();
  const description = document.getElementById("hwDescription").value.trim();
  const dueDate = document.getElementById("hwDueDate").value;

  if (!subject || !title || !dueDate) {
    alert("Please fill Subject, Title aur Due Date.");
    return;
  }

  const ctx = await getMyContext();

  if (!ctx || !ctx.myClass) {
    alert("Aapko abhi tak koi class assign nahi hui.");
    return;
  }

  try {

    await addDoc(collection(db, "homework"), {
      classId: ctx.myClass.id,
      className: ctx.myClass.className || ctx.myClass.id,
      subject,
      title,
      description,
      dueDate,
      postedBy: sessionStorage.getItem("teacherDocId") || "",
      createdAt: serverTimestamp()
    });

    alert("Homework Added Successfully.");

    document.getElementById("hwSubject").value = "";
    document.getElementById("hwTitle").value = "";
    document.getElementById("hwDescription").value = "";
    document.getElementById("hwDueDate").value = "";

    await loadHomeworkList();

  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.addHomework = addHomework;

async function deleteHomework(id) {

  const confirmDelete = confirm("Yeh homework delete karna hai?");
  if (!confirmDelete) return;

  try {
    await deleteDoc(doc(db, "homework", id));
    alert("Homework Deleted.");
    await loadHomeworkList();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }

}
window.deleteHomework = deleteHomework;

if (location.pathname.includes("teacher-homework.html")) {
  loadHomeworkPage();
}

// ==========================
// Sidebar / mobile menu (shared UI behaviour, mirrors admin.js)
// ==========================
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
