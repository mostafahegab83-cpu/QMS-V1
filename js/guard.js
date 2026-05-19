import { auth, onAuthStateChanged, getProfile, signOutUser } from "./auth.js";

function appUrl(fileName) {
  const prefix = window.location.pathname.includes("/pages/") ? "../" : "./";
  return `${prefix}${fileName}`;
}

export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = appUrl("index.html");
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
    window.location.href = appUrl("index.html");
  });
}
