// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4LHj2Tyq-8rThmE8TJGJS8g7MniKCP5k",
  authDomain: "chatbot-a6c0a.firebaseapp.com",
  projectId: "chatbot-a6c0a",
  storageBucket: "chatbot-a6c0a.firebasestorage.app",
  messagingSenderId: "369216124918",
  appId: "1:369216124918:web:2f5a91569648f49730f9d7",
  measurementId: "G-H92DELG67T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
