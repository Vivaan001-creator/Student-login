import { auth } from "./firebase.js";

import {
sendPasswordResetEmail
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const emailInput =
document.getElementById("email");

const sendBtn =
document.getElementById("sendCodeBtn");


sendBtn.addEventListener("click", async () => {

const email = emailInput.value.trim();

if(email===""){
alert("Please enter email.");
return;
}

try{

await sendPasswordResetEmail(auth,email);

alert("Password reset link sent successfully.");

}catch(error){

alert(error.message);

}

});


document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('fpForm');
  const resetBtn = document.querySelector('.reset-btn');

  if (form) {
    form.addEventListener("submit", async function(e){

e.preventDefault();

const email = emailInput.value.trim();

if(email===""){
alert("Please enter email");
return;
}

try{

await sendPasswordResetEmail(auth,email);

alert("Reset link sent successfully.");

}catch(error){

alert(error.message);

}

});
  }
}
                                                                           
