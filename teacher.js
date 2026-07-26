import { db, auth } from "./Firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
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
// Teacher Dashboard Security
// ==========================
const page = location.pathname;

if (page.includes("teacher-dashboard.html")) {
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

  } catch (error) {
    console.error("Could not load teacher dashboard:", error);
  }

}

loadTeacherDashboard();
