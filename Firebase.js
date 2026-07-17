import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA83oNjXsBaXPl5jVZgdLm2E1f4MMoFfEM",
  authDomain: "school-management-portal-fb8da.firebaseapp.com",
  projectId: "school-management-portal-fb8da",
  storageBucket: "school-management-portal-fb8da.firebasestorage.app",
  messagingSenderId: "271719672244",
  appId: "1:271719672244:web:7396de0b78e997dd672ae1"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
