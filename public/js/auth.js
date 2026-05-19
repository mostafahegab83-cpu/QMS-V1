import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp, addDoc, collection
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig, SUPER_ADMIN_EMAIL } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function signUp(email, password, fullName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const role = email.toLowerCase() === SUPER_ADMIN_EMAIL ? "super_admin" : "employee";
  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    fullName: fullName || email.split("@")[0],
    role,
    createdAt: serverTimestamp()
  });
  await logAudit("user.signup", cred.user.uid, { email, role });
  return cred.user;
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await logAudit("user.signin", cred.user.uid, { email });
  return cred.user;
}

export async function signOutUser() {
  if (auth.currentUser) {
    await logAudit("user.signout", auth.currentUser.uid, { email: auth.currentUser.email });
  }
  return signOut(auth);
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function logAudit(action, actorId, meta = {}) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      action,
      actorId,
      actorEmail: auth.currentUser?.email ?? null,
      target: meta.target ?? null,
      meta,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}

export { onAuthStateChanged };
