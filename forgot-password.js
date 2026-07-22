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
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      resetBtn.classList.add('loading');
      const span = resetBtn.querySelector('span');
      const originalText = span.textContent;
      span.textContent = 'Sending...';

      setTimeout(function () {
        span.textContent = 'Link Sent!';
        setTimeout(function () {
          span.textContent = originalText;
          resetBtn.classList.remove('loading');
        }, 1800);
      }, 1400);
    });
  }
});
