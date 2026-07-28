import { db } from "./Firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// Student Data



// Get Login Data

const roll = localStorage.getItem("studentRoll");
const month = localStorage.getItem("selectedMonth");
console.log("Selected Month =", month);

const student = {};

const studentRef = doc(db, "students", roll);

const studentSnap = await getDoc(studentRef);

if (!studentSnap.exists()) {

    alert("Student data not found");

    window.location.href = "student-login.html";

    throw new Error("Student Not Found");

}

Object.assign(student, studentSnap.data());

const publishStatus =
    student.publishStatus || "published";

if (publishStatus === "unpublished") {

    document.body.innerHTML = `
    <div style="text-align:center;padding:80px;font-family:Arial;">
        <h1>Result Not Published Yet</h1>
        <p>Please contact your Examiner.</p>
        <button onclick="window.location.href='student-dashboard.html'" style="margin-top:20px;padding:10px 20px;border:none;border-radius:8px;background:#4e54c8;color:white;font-weight:bold;cursor:pointer;">
            Back to Dashboard
        </button>
    </div>
    `;

    throw new Error("Result Hidden");
}
if (!student) {
    alert("Student data not found");
    window.location.href = "index.html";
}

console.log(student);
console.log(month);
console.log(student.results);


const resultRef = doc(db, "students", roll, "results", month);
const resultSnap = await getDoc(resultRef);

if (!resultSnap.exists()) {

document.body.innerHTML = `
<div style="
text-align:center;
padding:100px;
font-family:Arial;
">
<h1>Result Not Uploaded Yet</h1>
<p>Result for ${month} is not available.</p>
<button onclick="window.location.href='student-dashboard.html'" style="margin-top:20px;padding:10px 20px;border:none;border-radius:8px;background:#4e54c8;color:white;font-weight:bold;cursor:pointer;">
    Back to Dashboard
</button>
</div>
`;

throw new Error("Result Not Uploaded");
}

const data = resultSnap.data();
console.log(data);

// Subjects now come straight from the saved result document in
// Firebase (exactly what the teacher entered marks for) instead of
// a separate hardcoded class -> subjects list here, so this page
// can never drift out of sync with what marks-management actually
// saves.
const subjects = Object.keys(data);

// Same lower-class list used in teacher.js / admin.js for grading
// (classes 6-10 use 60 max / 20 pass, not 50 / 17).
const lowerClasses = ["Nursery", "L.K.G", "U.K.G", "1", "2", "3", "4", "5"];

function normalizeClassKey(value) {
    if (!value) return "";
    return String(value).replace(/^class\s*/i, "").trim();
}

const normalizedClass = normalizeClassKey(student.class);

const maxMarks = lowerClasses.includes(normalizedClass) ? 50 : 60;
const passMarks = lowerClasses.includes(normalizedClass) ? 17 : 20;

const selectedResult = subjects.map(subject => [
    subject,
    maxMarks,
    passMarks,
    data[subject] || 0
]);
// Profile Section

document.getElementById("studentName").textContent = student.name;

document.getElementById("studentRoll").textContent = roll;

document.getElementById("studentClass").textContent =
    student.class;

document.getElementById("fatherName").textContent =
  student.father;

document.getElementById("month").textContent =
  month;

// Table

let totalMarks = 0;
let totalMaxMarks = 0;

const table = document.getElementById("marksTable");

if (selectedResult.length === 0) {
  table.innerHTML = `<tr><td colspan="5">No subject marks found for ${month}.</td></tr>`;
}

selectedResult.forEach(subject => {

  const subjectName = subject[0];
  const max = subject[1];
  const pass = subject[2];
  const marks = subject[3];

  totalMarks += marks;
  totalMaxMarks += max;

  const status =
    marks >= pass ? "Pass" : "Fail";

  table.innerHTML += `
    <tr>
      <td>${subjectName}</td>
      <td>${max}</td>
      <td>${pass}</td>
      <td>${marks}</td>
      <td>${status}</td>
    </tr>
  `;
});

// Percentage

const percentage =
totalMaxMarks > 0
? ((totalMarks / totalMaxMarks) * 100).toFixed(2)
: "0.00";

document.getElementById("totalMarks").textContent =
totalMarks + " / " + totalMaxMarks;

document.getElementById("percentage").textContent =
percentage + "%";

// Grade 

let grade = "";

if (percentage >= 90) {
    grade = "A1";
}
else if (percentage >= 80) {
    grade = "A2";
}
else if (percentage >= 70) {
    grade = "B1";
}
else if (percentage >= 60) {
    grade = "B2";
}
else if (percentage >= 50) {
    grade = "C1";
}
else if (percentage >= 40) {
    grade = "C2";
}
else if (percentage >= 33) {
    grade = "D";
}
else {
    grade = "E";
}

document.getElementById("grade").textContent =
grade;

// Attendance

document.getElementById("attendance").textContent =
student.attendance;

// Comment

if (percentage >= 90) {

    document.getElementById("comment").textContent =
    "Excellent performance! Keep up the good work. Stay focused and aim higher.";

}
else if (percentage >= 80) {

    document.getElementById("comment").textContent =
    "Outstanding performance! Keep up the excellent work.";

}
else if (percentage >= 70) {

    document.getElementById("comment").textContent =
    "Good progress! Displays a solid understanding of the lessons.";

}
else if (percentage >= 60) {

    document.getElementById("comment").textContent =
    "Good effort, but needs more practice in core concepts to improve.";

}
else if (percentage >= 50) {

    document.getElementById("comment").textContent =
    "An average performance. Needs to pay closer attention during lessons.";

}
else if (percentage >= 33) {

    document.getElementById("comment").textContent =
    "Must focus more in class and practice regularly at home to improve scores.";

}
else {

    document.getElementById("comment").textContent =
    "Needs hard work and regular practice for better improvement.";

}
function printResult(){

window.print();

}

function downloadPDF(){

window.print();

}

function logoutStudent(){

localStorage.clear();

sessionStorage.clear();

window.location.replace(
"index.html"
);

}

function goToDashboard(){

window.location.href = "student-dashboard.html";

}
history.pushState(null,null,location.href);

window.onpopstate = function(){

    history.go(1);

};

function updateClock(){

    const clock = document.getElementById("resultClock");

    if(!clock){
        return;
    }

    const now = new Date();

    const time = now.toLocaleTimeString('en-IN');

    const day = now.toLocaleDateString('en-IN',{
        weekday:'long'
    });

    const date = now.toLocaleDateString('en-IN',{
        day:'numeric',
        month:'long',
        year:'numeric'
    });

    clock.innerHTML =
    `${time} | ${day} | ${date}`;
}

updateClock();
setInterval(updateClock,1000);

window.printResult = printResult;
window.downloadPDF = downloadPDF;
window.logoutStudent = logoutStudent;
window.goToDashboard = goToDashboard;
