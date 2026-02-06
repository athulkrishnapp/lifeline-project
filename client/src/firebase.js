// client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAD5BLU7kAQyud-k4-VdTmJy-rqvzKmIMI",
  authDomain: "lifeline-43c9d.firebaseapp.com",
  projectId: "lifeline-43c9d",
  storageBucket: "lifeline-43c9d.firebasestorage.app",
  messagingSenderId: "53367349824",
  appId: "1:53367349824:web:98c58d8ffb137189e9b5a5",
  measurementId: "G-6M45C3CZVM"
};

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize Authentication (We need this!)
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 3. Export them so Login.jsx can use them
export { auth, provider };