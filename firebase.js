// firebase.js — Firestore + Storage + Auth init for QMS-V1
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, addDoc, deleteDoc,
  onSnapshot, writeBatch, serverTimestamp, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAohCS5bgcYbNdQd3vRjJteL8fNd3A0D1o",
  authDomain: "qms-v1-3a24d.firebaseapp.com",
  projectId: "qms-v1-3a24d",
  storageBucket: "qms-v1-3a24d.firebasestorage.app",
  messagingSenderId: "57116468212",
  appId: "1:57116468212:web:f1892395d1b0c906c34fa1",
  measurementId: "G-MQQ59ME2BP"
};

// Admin emails — full delete & user-management rights
export const ADMIN_EMAILS = ["mostafa.hegab83@gmail.com"];

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export {
  collection, doc, setDoc, getDoc, addDoc, deleteDoc,
  onSnapshot, writeBatch, serverTimestamp, query, orderBy, limit,
  ref, uploadBytes, getDownloadURL, deleteObject,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail
};
