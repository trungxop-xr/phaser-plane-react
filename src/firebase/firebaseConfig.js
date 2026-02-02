import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBx7qVn8iVYb2DQx3A_f6n33W-s8bDWuHk",
    authDomain: "phaser-plane.firebaseapp.com",
    projectId: "phaser-plane",
    storageBucket: "phaser-plane.firebasestorage.app",
    messagingSenderId: "825328293083",
    appId: "1:825328293083:web:4604f3a7eedc78b27d28fe",
    measurementId: "G-BVS1ZYM6E8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
