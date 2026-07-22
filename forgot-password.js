alert("forgot-password.js loaded");
import { auth } from "./Firebase.js";

import {
sendPasswordResetEmail
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";



document.addEventListener("DOMContentLoaded", async () => {

    const form = document.getElementById("fpForm");
    const emailInput = document.getElementById("email");

    form.addEventListener("submit", async (e) => {

        e.preventDefault();

        const email = emailInput.value.trim();

        if (!email) {
            alert("Please enter your email.");
            return;
        }

        try {

            await sendPasswordResetEmail(auth, email);

            alert("Password reset link sent successfully.");

        } catch (error) {

            alert(error.code + "\n" + error.message);

        }

    });

});
