import { db, storage } from "./Firebase.js";

import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  getCountFromServer
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

// ==========================
// Default Admin Password
// ==========================

if (!localStorage.getItem("adminPassword")) {
    localStorage.setItem("adminPassword", "12345");
}


// ==========================
// Admin Login
// ==========================

function adminLogin() {


    const username = document.getElementById("username");
    const password = document.getElementById("password");

    if (!username || !password) return;

    if (
        username.value.trim() === "admin" &&
        password.value.trim() === localStorage.getItem("adminPassword")
    ) {

        sessionStorage.setItem("adminLoggedIn", "true");

        window.location.href = "dashboard.html";

    } else {

        alert("Invalid Username or Password");

    }

}

window.adminLogin = adminLogin;


// ==========================
// Dashboard Security
// ==========================

const page = location.pathname;

if (
    page.includes("dashboard.html") ||
    page.includes("students.html") ||
    page.includes("edit-student.html") ||
    page.includes("change-password.html") ||
    page.includes("teachers.html") ||
page.includes("add-teacher.html") ||
page.includes("edit-teacher.html") ||
page.includes("teacher-profile.html") ||
page.includes("school-profile.html")
) {

    if (sessionStorage.getItem("adminLoggedIn") !== "true") {

        window.location.replace("admin.html");

    }

}


// ==========================
// Logout
// ==========================

function adminLogout() {


    sessionStorage.clear();

    window.location.replace("admin.html");

}

window.adminLogout = adminLogout;


// ==========================
// Console Test
// ==========================

console.log("admin.js Loaded Successfully");


// ==========================
// Student List
// ==========================



// ==========================
// Student Table
// ==========================
const tableBody = document.getElementById("studentTable");

if (tableBody) {

    loadStudentTable();

}

async function loadStudentTable() {

    tableBody.innerHTML = "";

    const snapshot = await getDocs(
        collection(db, "students")
    );

    snapshot.forEach((docSnap) => {
      const totalBox =
document.getElementById("totalStudents");

if(totalBox){

totalBox.textContent =
snapshot.size;

}

        const student = docSnap.data();

        tableBody.innerHTML += `
        <tr>

            <td>${docSnap.id}</td>

            <td>${student.name}</td>

            <td>${student.class}</td>

            <td>

    <button onclick="editStudent('${docSnap.id}')">
        Edit
    </button>

    <button onclick="deleteStudent('${docSnap.id}')">
        Delete
    </button>

</td>

        </tr>
        `;

    });

}


// ==========================
// Edit Student
// ==========================

function editStudent(roll) {

    localStorage.setItem("editRoll", roll);

    window.location.href = "edit-student.html";

}

window.editStudent = editStudent;

// ==========================
// Class Subjects
// ==========================

const classSubjects = {

"Nursery": [
        "English",
        "Math",
        "Hindi",
        "Rhymes",
        "G.K",
    ],

  "L.K.G": [
        "English",
        "Math",
        "Hindi",
        "Rhymes",
        "G.K",
    ],

  "U.K.G": [
        "English",
        "Math",
        "Hindi",
        "Rhymes",
        "G.K",
    ],
  
    "1": [
        "English",
        "Math",
        "Hindi",
        "Computer",
        "E.V.S",
        "G.K"
    ],

    "2": [
        "English",
        "Math",
        "Hindi",
        "Computer",
        "E.V.S",
        "G.K"
    ],

    "3": [
        "English",
        "Math",
        "Hindi",
        "Computer",
        "E.V.S",
        "G.K"
    ],

    "4": [
        "English",
        "Math",
        "Hindi",
        "Computer",
        "E.V.S",
        "G.K"
    ],

    "5": [
        "English",
        "Math",
        "Hindi",
        "Computer",
        "E.V.S",
        "G.K"
    ],

    "6": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ],

  "7": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
    ],

  
  "8": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ],

  "9": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ],

  "10": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
        
    ]

};

// ==========================
// Load Student 
// ==========================
async function loadStudent() {

    const editRoll = localStorage.getItem("editRoll");

    if (!editRoll) return;

    const studentRef = doc(db, "students", editRoll);

    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        alert("Student not found");
        return;
    }

    const student = studentSnap.data();

    localStorage.setItem("studentClass", student.class);

    document.getElementById("studentName").value = student.name || "";
    document.getElementById("fatherName").value = student.father || "";
    document.getElementById("attendance").value = student.attendance || "";

    loadMonths();

    const monthSelect = document.getElementById("month");
    monthSelect.value = "June 2026";

    loadSubjects(student);

    await loadMarksFromFirestore(editRoll, monthSelect.value);

    monthSelect.addEventListener("change", async function () {
        await loadMarksFromFirestore(editRoll, this.value);
    });

}
// ==========================
// Load Months
// ==========================

function loadMonths() {

    const month = document.getElementById("month");

    if (!month) return;

    month.innerHTML = "";

    const months = [
        "June 2026",
        "July 2026",
        "August 2026",
        "September 2026",
        "October 2026",
        "November 2026",
        "December 2026",
        "January 2027",
        "February 2027",
        "March 2027",
        "April 2027",
        "May 2027",
        "June 2027",
        "July 2027",
        "August 2027",
        "September 2027",
        "October 2027",
        "November 2027",
        "December 2027",
        "January 2028"
    ];

    months.forEach(item => {

        const option = document.createElement("option");

        option.value = item;

        option.textContent = item;

        month.appendChild(option);

    });

}

window.loadMonths = loadMonths;
if (window.location.pathname.includes("edit-student.html")) {
    loadStudent();
}

function loadSubjects(student) {

    const marksEditor = document.getElementById("marksEditor");

    if (!marksEditor) return;

    const subjects = classSubjects[student.class];

    marksEditor.innerHTML = "";

    subjects.forEach(subject => {

    const lowerClasses = [
        "Nursery",
        "L.K.G",
        "U.K.G",
        "1",
        "2",
        "3",
        "4",
        "5"
    ];

    const maxMarks =
        lowerClasses.includes(student.class)
        ? 50
        : 60;

    const passMarks =
        lowerClasses.includes(student.class)
        ? 17
        : 20;

    marksEditor.innerHTML += `
    <div class="subject-row">

        <label>
            ${subject}
            <br>
            <small>
                Max : ${maxMarks}
                &nbsp;&nbsp;
                Pass : ${passMarks}
            </small>
        </label>

        <input
            type="number"
            min="0"
            max="${maxMarks}"
            value="0">

    </div>
    `;
});
}
async function loadMarksFromFirestore(roll, month) {

    const resultRef = doc(db, "students", roll, "results", month);

    const resultSnap = await getDoc(resultRef);

    if (!resultSnap.exists()) return;

    const data = resultSnap.data();

    const inputs =
        document.querySelectorAll("#marksEditor input");

    const labels =
        document.querySelectorAll("#marksEditor label");

    labels.forEach((label, index) => {

        const subject =
            label.childNodes[0].textContent.trim();

        if (data[subject] !== undefined) {

            inputs[index].value = data[subject];

        }

    });

}

async function saveStudent() {

    const roll = localStorage.getItem("editRoll");

    const studentData = {

        name: document.getElementById("studentName").value,
        father: document.getElementById("fatherName").value,
        class: localStorage.getItem("studentClass"),
        attendance: document.getElementById("attendance").value,
        month: document.getElementById("month").value,
        publishStatus: document.getElementById("publishStatus").value

    };

    try {

    console.log("Roll =", roll);
    console.log(studentData);
    alert("Saving document: " + roll);

    await setDoc(
        doc(db, "students", roll),
        studentData,
        { merge: true }
    );
      const month = document.getElementById("month").value;

const inputs = document.querySelectorAll("#marksEditor input");

const resultData = {};

const labels = document.querySelectorAll("#marksEditor label");

labels.forEach((label, index) => {

    const subject =
        label.childNodes[0].textContent.trim();

    resultData[subject] =
        Number(inputs[index].value);

});
      console.log(resultData);

await setDoc(

    doc(db, "students", roll, "results", month),

    resultData

);

    const checkDoc = await getDoc(doc(db, "students", roll));

    alert(JSON.stringify(checkDoc.data()));

    alert("Student data saved successfully.");

} catch (error) {

    alert(error.message);
    console.error(error);

}

}

window.saveStudent = saveStudent;

function searchStudent() {

    const input =
        document.getElementById("searchStudent")
        .value.toLowerCase();

    const rows =
        document.querySelectorAll("#studentTable tr");

    rows.forEach(row => {

        const roll =
            row.cells[0].textContent.toLowerCase();

        const name =
            row.cells[1].textContent.toLowerCase();

        if (
            roll.includes(input) ||
            name.includes(input)
        ) {

            row.style.display = "";

        } else {

            row.style.display = "none";

        }

    });

}

window.searchStudent = searchStudent;

async function addStudent() {

    const roll = document.getElementById("roll").value.trim();

    const name = document.getElementById("studentName").value.trim();

    const father = document.getElementById("fatherName").value.trim();

    const studentClass = document.getElementById("studentClass").value;

    const attendance = document.getElementById("attendance").value.trim();

    if (!roll || !name || !father || !studentClass || !attendance) {

        alert("Please fill all fields.");

        return;

    }

    const studentRef = doc(db, "students", roll);

    const studentSnap = await getDoc(studentRef);

    if (studentSnap.exists()) {

        alert("Roll Number already exists.");

        return;

    }

    await setDoc(studentRef, {

        name: name,

        father: father,

        class: studentClass,

        attendance: attendance,

        publishStatus: "unpublished"

    });

    alert("Student Added Successfully");

    window.location.href = "students.html";

}

window.addStudent = addStudent;

async function deleteStudent(roll) {

    const confirmDelete =
        confirm("Delete this student permanently?");

    if (!confirmDelete) return;

    try {

        await deleteDoc(doc(db, "students", roll));

        alert("Student Deleted Successfully");

        loadStudentTable();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}

window.deleteStudent = deleteStudent;

// ==========================
// Dashboard Statistics
// ==========================

async function loadDashboardStats(){

    const studentElement =
        document.getElementById("studentCount");

    if(!studentElement) return;

    try{

        const snapshot =
            await getCountFromServer(
                collection(db,"students")
            );

        studentElement.textContent =
            snapshot.data().count;

    }

    catch(error){

        console.error(error);

    }

}

loadDashboardStats();

// ==========================
// Dashboard Live Statistics
// ==========================

async function loadSchoolStats() {

    // Total Students
    const studentSnapshot =
        await getCountFromServer(
            collection(db, "students")
        );

    const studentBox =
        document.getElementById("studentCount");

    if (studentBox) {

        studentBox.textContent =
            studentSnapshot.data().count;

    }

    // Teachers (Temporary)

    const teacherBox =
        document.getElementById("teacherCount");

    if (teacherBox) {

        teacherBox.textContent = "0";

    }

    // Classes

    const classBox =
        document.getElementById("classCount");

    if (classBox) {

        classBox.textContent = "6";

    }

    // Published Results

    const publishBox =
        document.getElementById("publishCount");

    if (publishBox) {

        publishBox.textContent = "0";

    }

    // Pending Results

    const pendingBox =
        document.getElementById("pendingCount");

    if (pendingBox) {

        pendingBox.textContent = "0";

    }

}

loadSchoolStats();

// ==========================
// Dashboard Clock
// ==========================

const dashboardClock =
    document.getElementById("dashboardClock");

if(dashboardClock){

    setInterval(()=>{

        dashboardClock.textContent =
            new Date().toLocaleString();

    },1000);

}


const resultCount =
document.getElementById("resultCount");

if(resultCount){

resultCount.textContent="0";

}


// ==========================
// Dashboard Loaded
// ==========================

window.addEventListener("load",()=>{

document.body.classList.add("loaded");

});

// ==========================
// Dashboard Date Time
// ==========================

const timeBox =
document.getElementById("liveDateTime");

if(timeBox){

setInterval(()=>{

const now=new Date();

timeBox.innerHTML=

now.toLocaleDateString()

+"<br>"+

now.toLocaleTimeString();

},1000);

}

// ==========================
// Add Teacher
// ==========================

async function addTeacher(){

    const teacherId =
        document.getElementById("teacherId")?.value.trim();

    const teacherName =
        document.getElementById("teacherName")?.value.trim();

    const teacherSubject =
        document.getElementById("teacherSubject")?.value.trim();

    if(
        !teacherId ||
        !teacherName ||
        !teacherSubject
    ){

        alert("Please fill all fields.");

        return;

    }

    try{

        await setDoc(

            doc(db,"teachers",teacherId),

            {

    name:teacherName,

    subject:teacherSubject,

    phone:
document.getElementById("teacherPhone").value.trim(),

    email:
document.getElementById("teacherEmail").value.trim(),

    qualification:
document.getElementById("teacherQualification").value.trim(),

    experience:
Number(
document.getElementById("teacherExperience").value
),

    status:
document.getElementById("teacherStatus").value

            }

        );

        alert("Teacher Added Successfully.");

        window.location.href="teachers.html";

    }

    catch(error){

        console.error(error);

        alert(error.message);

    }

}

window.addTeacher=addTeacher;

// ==========================
// Load Teacher Table
// ==========================

const teacherTable =
document.getElementById("teacherTable");

if(teacherTable){

    loadTeacherTable();

}

async function loadTeacherTable(){

    teacherTable.innerHTML = "";

    const snapshot = await getDocs(
        collection(db,"teachers")
    );

    snapshot.forEach((docSnap)=>{

        const teacher = docSnap.data();

        teacherTable.innerHTML += `
<tr>


<td>${docSnap.id}</td>

<td>${teacher.name}</td>

<td>${teacher.subject}</td>

<td>
<span class="${teacher.status==="Active" ? "status-active":"status-inactive"}">
${teacher.status}
</span>
</td>

<td>${teacher.phone}</td>

<td>

<button onclick="viewTeacher('${docSnap.id}')">View</button>

<button onclick="editTeacher('${docSnap.id}')">Edit</button>

<button onclick="deleteTeacher('${docSnap.id}')">Delete</button>

</td>

</tr>
`;
    });

}
// ==========================
// View Teacher
// ==========================
function viewTeacher(id){

    localStorage.setItem(
        "profileTeacherId",
        id
    );

    window.location.href =
    "teacher-profile.html";

}

window.viewTeacher = viewTeacher;

// ==========================
// Edit Teacher
// ==========================

function editTeacher(id){

    localStorage.setItem(
        "editTeacherId",
        id
    );

    window.location.href =
    "edit-teacher.html";

}

window.editTeacher = editTeacher;

// ==========================
// Delete Teacher
// ==========================

async function deleteTeacher(id){

    const confirmDelete=

    confirm("Delete this Teacher?");

    if(!confirmDelete) return;

    try{

        await deleteDoc(

            doc(db,"teachers",id)

        );

        alert("Teacher Deleted.");

        loadTeacherTable();

    }

    catch(error){

        alert(error.message);

    }

}

window.deleteTeacher=deleteTeacher;


// ==========================
// Load Teacher
// ==========================

async function loadTeacher(){

    const id =
        localStorage.getItem(
            "editTeacherId"
        );

    if(!id) return;

    const teacherRef =
        doc(db,"teachers",id);

    const teacherSnap =
        await getDoc(teacherRef);

    if(!teacherSnap.exists()){

        alert("Teacher Not Found");

        return;

    }

    const teacher =
        teacherSnap.data();

  
    document.getElementById("teacherName").value =
        teacher.name || "";

    document.getElementById("teacherSubject").value =
        teacher.subject || "";

    document.getElementById("teacherPhone").value =
        teacher.phone || "";

    document.getElementById("teacherEmail").value =
        teacher.email || "";

    document.getElementById("teacherQualification").value =
        teacher.qualification || "";

    document.getElementById("teacherExperience").value =
        teacher.experience || "";

    document.getElementById("teacherStatus").value =
        teacher.status || "Active";

}

if(
window.location.pathname.includes(
"edit-teacher.html"
)
){

    loadTeacher();

}


// ==========================
// Search Teacher
// ==========================

function searchTeacher(){

    const keyword =
    document.getElementById("searchTeacher")
    ?.value.toLowerCase();

    const rows =
    document.querySelectorAll("#teacherTable tr");

    rows.forEach(row=>{

        const id =
        row.cells[1].textContent.toLowerCase();

        const name =
        row.cells[2].textContent.toLowerCase();

        const subject =
        row.cells[3].textContent.toLowerCase();

        if(
            id.includes(keyword) ||
            name.includes(keyword) ||
            subject.includes(keyword)
        ){

            row.style.display = "";

        }else{

            row.style.display = "none";

        }

    });

}

window.searchTeacher = searchTeacher;


// ==========================
// School Profile
// ==========================

async function saveSchoolProf
