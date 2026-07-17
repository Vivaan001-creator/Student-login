// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA83oNjXsBaXPl5jVZgdLm2E1f4MMoFfEM",
  authDomain: "school-management-portal-fb8da.firebaseapp.com",
  projectId: "school-management-portal-fb8da",
  storageBucket: "school-management-portal-fb8da.firebasestorage.app",
  messagingSenderId: "271719672244",
  appId: "1:271719672244:web:7396de0b78e997dd672ae1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const app = firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
