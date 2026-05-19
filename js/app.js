import { requireAuth, bindLogout } from "./guard.js";

function renderShell({ user, profile }) {
  const nameEl = document.querySelector("#userName");
  const roleEl = document.querySelector("#userRole");
  if (nameEl) nameEl.textContent = profile?.fullName ?? user.email;
  if (roleEl) roleEl.textContent = (profile?.role ?? "employee").replace("_", " ");

  // Highlight active sidebar link
  const path = window.location.pathname.split("/").pop();
  document.querySelectorAll(".sidebar a").forEach((a) => {
    if (a.getAttribute("href").endsWith(path)) a.classList.add("active");
  });

  // Hide admin-only links for non-admins
  const role = profile?.role;
  if (role !== "super_admin" && role !== "admin") {
    document.querySelectorAll("[data-admin-only]").forEach((el) => el.remove());
  }
}

requireAuth(renderShell);
bindLogout();

// Theme toggle
const themeBtn = document.querySelector("#themeToggle");
if (themeBtn) {
  const saved = localStorage.getItem("qms-theme") || "dark";
  document.documentElement.dataset.theme = saved;
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("qms-theme", next);
  });
}
