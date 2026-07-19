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

import { storage } from "./Firebase.js";

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
  alert("login Clicked");

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
    page.includes("change-password.html")
) {

    if (sessionStorage.getItem("adminLoggedIn") !== "true") {

        window.location.replace("admin.html");

    }

}


// ==========================
// Logout
// ==========================

function adminLogout() {

    alert("Logout function called");

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

    "1": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies",
        "Computer"
    ],

    "2": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies",
        "Computer"
    ],

    "3": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies",
        "Computer"
    ],

    "4": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
    ],

    "5": [
        "English",
        "Math",
        "Hindi",
        "Science",
        "Social Studies"
    ],

    "6": [
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
        "December 2026"
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

        const maxMarks =
            student.class === "1" ||
            student.class === "2" ||
            student.class === "3"
            ? 50
            : 60;

        const passMarks =
            student.class === "1" ||
            student.class === "2" ||
            student.class === "3"
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
// Dashboard Mouse Effect
// ==========================

const dashboard = document.querySelector(".dashboard");

if(dashboard){

document.addEventListener("mousemove",(e)=>{

const x =
(window.innerWidth/2-e.clientX)/45;

const y =
(window.innerHeight/2-e.clientY)/45;

dashboard.style.transform=

`rotateY(${x}deg) rotateX(${-y}deg)`;

});

document.addEventListener("mouseleave",()=>{

dashboard.style.transform=

"rotateX(0deg) rotateY(0deg)";

});

}

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

    teacherTable.innerHTML += `
<tr>

<td>
<img
src="${teacher.photo || 'teacher.png'}"
class="teacher-list-photo">
</td>

<td>${docSnap.id}</td>

<td>${teacher.name}</td>

<td>${teacher.subject}</td>

<td>
<span class="${
teacher.status==="Active"
?
"status-active"
:
"status-inactive"
}">
${teacher.status}
</span>
</td>

<td>${teacher.phone}</td>

<td>

<button onclick="viewTeacher('${docSnap.id}')">
View
</button>

<button onclick="editTeacher('${docSnap.id}')">
Edit
</button>

<button onclick="deleteTeacher('${docSnap.id}')">
Delete
</button>

</td>

</tr>
`;

    });

}

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

window.editTeacher =
editTeacher;

// ==========================
// Save Teacher
// ==========================

async function saveTeacher(){

    const id =
      
        localStorage.getItem(
            "editTeacherId"
        );
const file =
document
.getElementById(
"teacherPhoto"
).files[0];

let photoURL = "";

if(file){

    photoURL =
    await uploadTeacherPhoto(
        file,
        id
    );

}
  
    await setDoc(

        doc(db,"teachers",id),

        {

            name:
document.getElementById("teacherName").value,

            subject:
document.getElementById("teacherSubject").value,

            phone:
document.getElementById("teacherPhone").value,

            email:
document.getElementById("teacherEmail").value,

            qualification:
document.getElementById("teacherQualification").value,

            experience:
Number(
document.getElementById("teacherExperience").value
),

            status:
document.getElementById("teacherStatus").value,

          photo:

photoURL ||

document.getElementById(
"teacherPhotoPreview"
).src

        },

        { merge:true }

    );

    alert(
        "Teacher Updated Successfully"
    );

    window.location.href =
        "teachers.html";

}

window.saveTeacher =
saveTeacher;

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

if(teacher.photo){

    document.getElementById(
        "teacherPhotoPreview"
    ).src = teacher.photo;

}
  
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

    const keyword=

    document.getElementById("searchTeacher")

    ?.value

    .toLowerCase();

    const rows=

    document.querySelectorAll(

        "#teacherTable tr"

    );

    rows.forEach(row=>{

        const id=

        row.cells[0].textContent.toLowerCase();

        const name=

        row.cells[1].textContent.toLowerCase();

        const subject=

        row.cells[2].textContent.toLowerCase();

        if(

            id.includes(keyword)||

            name.includes(keyword)||

            subject.includes(keyword)

        ){

            row.style.display="";

        }

        else{

            row.style.display="none";

        }

    });

}

window.searchTeacher=searchTeacher;

// ==========================
// Teacher Photo Preview
// ==========================

const teacherPhotoInput =
document.getElementById("teacherPhoto");

if(teacherPhotoInput){

teacherPhotoInput.addEventListener(
"change",
function(){

const file=this.files[0];

if(!file) return;

const reader=new FileReader();

reader.onload=function(e){

document.getElementById(
"teacherPhotoPreview"
).src=e.target.result;

};

reader.readAsDataURL(file);

});

}


// ==========================
// Upload Teacher Photo
// ==========================

async function uploadTeacherPhoto(file,id){

const storageRef=

ref(

storage,

"teachers/"+id

);

await uploadBytes(

storageRef,

file

);

const url=

await getDownloadURL(

storageRef

);

return url;

}

// ==========================
// View Teacher
// ==========================

function viewTeacher(id){

localStorage.setItem(

"profileTeacherId",

id

);

window.location.href=

"teacher-profile.html";

}

window.viewTeacher=viewTeacher;

// ==========================
// Load Teacher Profile
// ==========================

async function loadTeacherProfile(){

const id=

localStorage.getItem(

"profileTeacherId"

);

if(!id) return;

const snap=

await getDoc(

doc(db,"teachers",id)

);

if(!snap.exists()) return;

const teacher=snap.data();

document.getElementById(

"profilePhoto"

).src=

teacher.photo||

"teacher.png";

document.getElementById(

"profileName"

).textContent=

teacher.name;

document.getElementById(

"profileSubject"

).textContent=

teacher.subject;

document.getElementById(

"profilePhone"

).textContent=

teacher.phone;

document.getElementById(

"profileEmail"

).textContent=

teacher.email;

document.getElementById(

"profileQualification"

).textContent=

teacher.qualification;

document.getElementById(

"profileExperience"

).textContent=

teacher.experience;

document.getElementById(

"profileStatus"

).textContent=

teacher.status;

}

if(

window.location.pathname.includes(

"teacher-profile.html"

)

){

loadTeacherProfile();

}

// ==========================
// School Profile
// ==========================

async function saveSchoolProfile(){

  const logoFile =
document.getElementById("schoolLogo").files[0];

let logoURL = "";

if(logoFile){

const logoRef = ref(

storage,

"schoolLogo/logo.png"

);

await uploadBytes(

logoRef,

logoFile

);

logoURL = await getDownloadURL(

logoRef

);

}

    const profile={
const profile = {

    schoolName:
    document.getElementById("schoolName").value.trim(),

    principalName:
    document.getElementById("principalName").value.trim(),

    schoolAddress:
    document.getElementById("schoolAddress").value.trim(),

    schoolPhone:
    document.getElementById("schoolPhone").value.trim(),

    schoolEmail:
    document.getElementById("schoolEmail").value.trim(),

    schoolWebsite:
    document.getElementById("schoolWebsite").value.trim(),

    logoURL: logoURL

};
  
const preview =

document.getElementById("logoPreview");

if(

preview &&

data.logoURL

){

preview.src = data.logoURL;

}
      
    };

    try{

        await setDoc(

            doc(db,"settings","schoolProfile"),

            profile

        );

        alert("School Profile Saved Successfully");

    }

    catch(error){

        alert(error.message);

    }

}

window.saveSchoolProfile=saveSchoolProfile;


async function loadSchoolProfile(){

    if(
        !location.pathname.includes("school-profile.html")
    ) return;

    const profileRef=
        doc(db,"settings","schoolProfile");

    const profileSnap=
        await getDoc(profileRef);

    if(!profileSnap.exists()) return;

    const data=profileSnap.data();

    document.getElementById("schoolName").value=
        data.schoolName||"";

    document.getElementById("principalName").value=
        data.principalName||"";

    document.getElementById("schoolAddress").value=
        data.schoolAddress||"";

    document.getElementById("schoolPhone").value=
        data.schoolPhone||"";

    document.getElementById("schoolEmail").value=
        data.schoolEmail||"";

    document.getElementById("schoolWebsite").value=
        data.schoolWebsite||"";

}

if(data.logoURL){

document.getElementById("logoPreview").src =
data.logoURL;

}

loadSchoolProfile();

// ==========================
// Show School Name
// ==========================

async function showSchoolName(){

    const schoolTitle =
        document.getElementById("schoolTitle");

    if(!schoolTitle) return;

    try{

        const profileSnap =
            await getDoc(
                doc(db,"settings","schoolProfile")
            );

        if(profileSnap.exists()){

            schoolTitle.textContent =
                profileSnap.data().schoolName;

const logo =
document.getElementById("schoolLogoImage");

if(logo){

logo.src =
profileSnap.data().logoURL || "";

}
          
        }

    }

    catch(error){

        console.error(error);

    }

}

showSchoolName();


async function loadTeacherCount(){

const teacherBox =
document.getElementById("teacherCount");

if(!teacherBox) return;

const snap =
await getCountFromServer(
collection(db,"teachers")
);

teacherBox.textContent =
snap.data().count;

}

loadTeacherCount();
