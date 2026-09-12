import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvyiyW5s1HGP8JVLHIlOM2ASR5kYo2_Nc",
  authDomain: "hirelens-90c92.firebaseapp.com",
  projectId: "hirelens-90c92",
  storageBucket: "hirelens-90c92.firebasestorage.app",
  messagingSenderId: "1007918718864",
  appId: "1:1007918718864:web:8b798b56649ebabcae9d15",
  measurementId: "G-G71N1C6TLL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
