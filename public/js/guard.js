import { auth, onAuthStateChanged, getProfile, signOutUser } from "./auth.js";

export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "/index.html";
      return;
    }
    const profile = await getProfile(user.uid);
    callback?.({ user, profile });
  });
}

export function bindLogout(selector = "#logoutBtn") {
  const btn = document.querySelector(selector);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await signOutUser();
    window.location.href = "/index.html";
  });
}
