import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBTIXZcNDAJU-VwA93fVNdvqgWmIgZIpwA",
  authDomain: "evaluation-b38b8.firebaseapp.com",
  projectId: "evaluation-b38b8",
  storageBucket: "evaluation-b38b8.firebasestorage.app",
  messagingSenderId: "658850406057",
  appId: "1:658850406057:web:02c9580815489ac65293b8"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;