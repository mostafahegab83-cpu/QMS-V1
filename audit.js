/* =========================================================
   QMS V1 - Audit Module (config pre-filled from live site)
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAohCS5bgcYbNdQd3vRjJteL8fNd3A0D1o",
  authDomain: "qms-v1-3a24d.firebaseapp.com",
  projectId: "qms-v1-3a24d",
  storageBucket: "qms-v1-3a24d.firebasestorage.app",
  messagingSenderId: "57116468212",
  appId: "1:57116468212:web:f1892395d1b0c906c34fa1",
  measurementId: "G-MQQ59ME2BP"
};

// Init Firebase (guard against double-init)
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// DOM
const form = document.getElementById("auditForm");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("auditList");
const formTitle = document.getElementById("formTitle");
const currentFile = document.getElementById("currentFile");
const logoutBtn = document.getElementById("logoutBtn");
const resetBtn = document.getElementById("resetBtn");

let currentUser = null;
let editingFileUrl = null;
let editingFilePath = null;

// Auth gate
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  loadAudits();
});

logoutBtn.addEventListener("click", () => auth.signOut());

// Reset
resetBtn.addEventListener("click", () => resetForm());

function resetForm() {
  form.reset();
  document.getElementById("auditId").value = "";
  formTitle.textContent = "New Audit Record";
  currentFile.textContent = "";
  editingFileUrl = null;
  editingFilePath = null;
  statusEl.textContent = "";
  statusEl.className = "status";
}

// Save / update
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const id = document.getElementById("auditId").value;
  const fileInput = document.getElementById("evidenceFile");
  const file = fileInput.files[0];

  if (file && file.size > 20 * 1024 * 1024) {
    setStatus("File exceeds 20MB limit.", "error");
    return;
  }

  setStatus("Saving...", "");

  try {
    let fileUrl = editingFileUrl || null;
    let filePath = editingFilePath || null;

    if (file) {
      // delete old file if replacing
      if (editingFilePath) {
        try { await storage.ref(editingFilePath).delete(); } catch (_) {}
      }
      filePath = `audits/${currentUser.uid}/${Date.now()}_${file.name}`;
      const snap = await storage.ref(filePath).put(file);
      fileUrl = await snap.ref.getDownloadURL();
    }

    const data = {
      auditDate: val("auditDate"),
      auditorName: val("auditorName"),
      processArea: val("processArea"),
      processOwner: val("processOwner"),
      slaTarget: val("slaTarget"),
      slaActual: val("slaActual"),
      complianceStatus: val("complianceStatus"),
      riskType: val("riskType"),
      riskLevel: val("riskLevel"),
      capaType: val("capaType"),
      capaDueDate: val("capaDueDate"),
      findings: val("findings"),
      capaDescription: val("capaDescription"),
      fileUrl,
      filePath,
      ownerUid: currentUser.uid,
      ownerEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (id) {
      await db.collection("audits").doc(id).update(data);
      setStatus("Audit updated successfully.", "success");
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("audits").add(data);
      setStatus("Audit saved successfully.", "success");
    }

    resetForm();
    loadAudits();
  } catch (err) {
    console.error(err);
    setStatus("Error: " + err.message, "error");
  }
});

// Load list
async function loadAudits() {
  listEl.innerHTML = "Loading...";
  try {
    const snap = await db.collection("audits")
      .where("ownerUid", "==", currentUser.uid)
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      listEl.innerHTML = "<p style='color:#6b7280'>No audit records yet.</p>";
      return;
    }

    listEl.innerHTML = "";
    snap.forEach((doc) => {
      const a = doc.data();
      const badgeClass = (a.complianceStatus || "").split(" ")[0] || "";
      const item = document.createElement("div");
      item.className = "audit-item";
      item.innerHTML = `
        <div class="info">
          <strong>${escape(a.processArea || "(no area)")}</strong>
          <span>${escape(a.auditDate || "")} · ${escape(a.auditorName || "")}
            <span class="badge ${badgeClass}">${escape(a.complianceStatus || "")}</span>
          </span>
        </div>
        <div class="btns">
          ${a.fileUrl ? `<a href="${a.fileUrl}" target="_blank" rel="noopener">View File</a>` : ""}
          <button data-id="${doc.id}" class="edit">Edit</button>
          <button data-id="${doc.id}" class="del">Delete</button>
        </div>
      `;
      listEl.appendChild(item);
    });

    listEl.querySelectorAll("button.edit").forEach((b) =>
      b.addEventListener("click", () => editAudit(b.dataset.id))
    );
    listEl.querySelectorAll("button.del").forEach((b) =>
      b.addEventListener("click", () => deleteAudit(b.dataset.id))
    );
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<p style='color:#b91c1c'>Failed to load: ${escape(err.message)}</p>`;
  }
}

async function editAudit(id) {
  const doc = await db.collection("audits").doc(id).get();
  if (!doc.exists) return;
  const a = doc.data();
  document.getElementById("auditId").value = id;
  setVal("auditDate", a.auditDate);
  setVal("auditorName", a.auditorName);
  setVal("processArea", a.processArea);
  setVal("processOwner", a.processOwner);
  setVal("slaTarget", a.slaTarget);
  setVal("slaActual", a.slaActual);
  setVal("complianceStatus", a.complianceStatus);
  setVal("riskType", a.riskType);
  setVal("riskLevel", a.riskLevel);
  setVal("capaType", a.capaType);
  setVal("capaDueDate", a.capaDueDate);
  setVal("findings", a.findings);
  setVal("capaDescription", a.capaDescription);
  editingFileUrl = a.fileUrl || null;
  editingFilePath = a.filePath || null;
  currentFile.innerHTML = a.fileUrl
    ? `Current file: <a href="${a.fileUrl}" target="_blank">view</a> (upload a new one to replace)`
    : "";
  formTitle.textContent = "Edit Audit Record";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteAudit(id) {
  if (!confirm("Delete this audit record? This cannot be undone.")) return;
  try {
    const doc = await db.collection("audits").doc(id).get();
    const a = doc.data();
    if (a && a.filePath) {
      try { await storage.ref(a.filePath).delete(); } catch (_) {}
    }
    await db.collection("audits").doc(id).delete();
    setStatus("Audit deleted.", "success");
    loadAudits();
  } catch (err) {
    setStatus("Delete failed: " + err.message, "error");
  }
}

// Helpers
function val(id) { return document.getElementById(id).value.trim(); }
function setVal(id, v) { document.getElementById(id).value = v || ""; }
function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className = "status " + (cls || "");
}
function escape(s) {
  return String(s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}
