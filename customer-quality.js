/* Customer Quality — Complaints Management
   - Firestore collection: "customerComplaints"
   - Storage path:         "customerComplaints/{complaintId}/{timestamp}-{filename}"
   - Hooks into the existing tab system (.tab[data-tab="customerQuality"])
     and the home tile [data-go="customerQuality"].
   - Features: list (one record per row), View, Edit, Delete, Attach Evidence,
     Close Complaint, Export to Excel, Export Report (Excel summary).
   - Requires SheetJS (window.XLSX) — already loaded by index.html.
*/
import {
  db, storage, auth,
  collection, doc, setDoc, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
  ref, uploadBytes, getDownloadURL, deleteObject,
  onAuthStateChanged
} from "./firebase.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const CATEGORIES = ["Service", "Delay", "Quality", "Product", "Billing", "Communication", "Other"];
const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES   = ["Open", "In Progress", "Pending", "Resolved", "Closed"];

let currentUserEmail = null;
onAuthStateChanged(auth, u => { currentUserEmail = u?.email || null; });

/* ---------- Mount UI ---------- */
const panel = document.getElementById("customerQuality");
if (panel) {
  panel.innerHTML = `
    <style>
      #customerQuality{padding:20px 16px;}
      #customerQuality .cq-header{max-width:1400px;margin:0 auto 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
      #customerQuality .cq-header h1{color:#1f3a8a;margin:0;font-size:22px;}
      #customerQuality .cq-header .cq-tools{display:flex;gap:8px;flex-wrap:wrap;}
      #customerQuality .cq-filters{max-width:1400px;margin:0 auto 12px;display:flex;gap:8px;flex-wrap:wrap;}
      #customerQuality .cq-filters input,#customerQuality .cq-filters select{padding:6px 10px;border:1px solid #e3e8ef;border-radius:6px;font-size:13px;}
      #customerQuality .cq-btn{font-size:12px;padding:6px 12px;border:1px solid #1f3a8a;background:#fff;color:#1f3a8a;border-radius:6px;cursor:pointer;font-weight:600;}
      #customerQuality .cq-btn.solid{background:#1f3a8a;color:#fff;}
      #customerQuality .cq-btn.danger{border-color:#dc2626;color:#dc2626;}
      #customerQuality .cq-btn.success{border-color:#16a34a;color:#16a34a;}
      #customerQuality .cq-btn:hover{opacity:.85;}
      #customerQuality .cq-wrap{max-width:100%;overflow:auto;background:#fff;border:1px solid #e3e8ef;border-radius:8px;}
      #customerQuality table.cq-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:1600px;}
      #customerQuality .cq-tbl th,#customerQuality .cq-tbl td{border:1px solid #e3e8ef;padding:6px 8px;text-align:left;vertical-align:top;}
      #customerQuality .cq-tbl th{background:#1f3a8a;color:#fff;position:sticky;top:0;font-size:11px;text-transform:uppercase;letter-spacing:.3px;}
      #customerQuality .cq-tbl tr:nth-child(even){background:#f8fafc;}
      #customerQuality .cq-acts{display:flex;flex-wrap:wrap;gap:4px;}
      #customerQuality .cq-acts button{font-size:11px;padding:3px 6px;}
      #customerQuality .sev-Low{color:#16a34a;font-weight:600;}
      #customerQuality .sev-Medium{color:#d97706;font-weight:600;}
      #customerQuality .sev-High{color:#dc2626;font-weight:600;}
      #customerQuality .sev-Critical{color:#7f1d1d;font-weight:700;}
      #customerQuality .st-pill{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;}
      #customerQuality .st-Open{background:#fee2e2;color:#991b1b;}
      #customerQuality .st-InProgress{background:#fef3c7;color:#92400e;}
      #customerQuality .st-Pending{background:#dbeafe;color:#1e40af;}
      #customerQuality .st-Resolved{background:#d1fae5;color:#065f46;}
      #customerQuality .st-Closed{background:#e5e7eb;color:#374151;}
      .cq-modal{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;z-index:9700;padding:30px 16px;overflow:auto;}
      .cq-card{background:#fff;border-radius:10px;width:100%;max-width:900px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.2);}
      .cq-card h3{margin:0 0 14px;color:#1f3a8a;}
      .cq-card label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#374151;margin-bottom:10px;}
      .cq-card input,.cq-card select,.cq-card textarea{padding:8px 10px;border:1px solid #e3e8ef;border-radius:6px;font-size:14px;font-family:inherit;color:#1f2937;}
      .cq-card textarea{min-height:70px;resize:vertical;}
      .cq-card .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}
      .cq-card .actions{display:flex;gap:8px;margin-top:16px;justify-content:flex-end;flex-wrap:wrap;}
      .cq-card table{width:100%;border-collapse:collapse;font-size:13px;}
      .cq-card th,.cq-card td{border:1px solid #e3e8ef;padding:6px;text-align:left;vertical-align:top;}
      .cq-card th{background:#f5f7fa;color:#374151;font-size:12px;width:180px;}
      .cq-files{margin-top:10px;border-top:1px dashed #e3e8ef;padding-top:10px;}
      .cq-files .f-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;}
      .cq-files .f-row a{color:#1f3a8a;text-decoration:none;font-weight:600;}
      .cq-files .f-row .rm{margin-left:auto;color:#dc2626;background:none;border:0;cursor:pointer;font-size:12px;}
    </style>

    <div class="cq-header">
      <h1>📞 Customer Quality — Complaints Register</h1>
      <div class="cq-tools">
        <button class="cq-btn solid" id="cqNew">+ New Complaint</button>
        <button class="cq-btn" id="cqExport">Export to Excel</button>
        <button class="cq-btn" id="cqReport">Export Report</button>
      </div>
    </div>

    <div class="cq-filters">
      <input type="search" id="cqSearch" placeholder="Search ID / customer / description…" />
      <select id="cqFCat"><option value="">All Categories</option>${CATEGORIES.map(c=>`<option>${c}</option>`).join("")}</select>
      <select id="cqFSev"><option value="">All Severities</option>${SEVERITIES.map(c=>`<option>${c}</option>`).join("")}</select>
      <select id="cqFStat"><option value="">All Statuses</option>${STATUSES.map(c=>`<option>${c}</option>`).join("")}</select>
      <button class="cq-btn" id="cqClear">Clear</button>
    </div>

    <div class="cq-wrap">
      <table class="cq-tbl">
        <thead>
          <tr>
            <th>Complaint ID</th>
            <th>Customer</th>
            <th>Description</th>
            <th>Category</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Root Cause</th>
            <th>Corrective Action</th>
            <th>Owner</th>
            <th>Created</th>
            <th>Closed</th>
            <th>Resolution</th>
            <th>Evidence</th>
            <th style="min-width:240px;">Actions</th>
          </tr>
        </thead>
        <tbody id="cqBody"></tbody>
      </table>
    </div>
  `;
}

/* ---------- State + Firestore subscription ---------- */
let RECORDS = [];

if (panel) {
  onSnapshot(query(collection(db, "customerComplaints"), orderBy("createdAt", "desc")), snap => {
    RECORDS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTable();
  }, err => { console.error(err); toast("Load failed: " + err.message); });

  document.getElementById("cqNew").addEventListener("click", () => openEdit(null));
  document.getElementById("cqExport").addEventListener("click", exportExcel);
  document.getElementById("cqReport").addEventListener("click", exportReport);
  ["cqSearch","cqFCat","cqFSev","cqFStat"].forEach(id =>
    document.getElementById(id).addEventListener("input", renderTable));
  document.getElementById("cqClear").addEventListener("click", () => {
    ["cqSearch","cqFCat","cqFSev","cqFStat"].forEach(id => document.getElementById(id).value = "");
    renderTable();
  });
}

function getFiltered() {
  const q = (document.getElementById("cqSearch")?.value || "").toLowerCase().trim();
  const fc = document.getElementById("cqFCat")?.value || "";
  const fs = document.getElementById("cqFSev")?.value || "";
  const ft = document.getElementById("cqFStat")?.value || "";
  return RECORDS.filter(r => {
    if (fc && r.category !== fc) return false;
    if (fs && r.severity !== fs) return false;
    if (ft && r.status   !== ft) return false;
    if (q) {
      const hay = `${r.complaintId||""} ${r.customerName||""} ${r.description||""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function fmtDate(v) {
  if (!v) return "";
  if (v?.toDate) return v.toDate().toLocaleDateString();
  return String(v);
}

function renderTable() {
  const tbody = document.getElementById("cqBody");
  if (!tbody) return;
  const list = getFiltered();
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;color:#6b7280;padding:18px;">No complaints found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(r => {
    const stKey = (r.status || "Open").replace(/\s+/g, "");
    const closed = r.status === "Closed";
    return `
      <tr>
        <td><strong>${esc(r.complaintId || r.id)}</strong></td>
        <td>${esc(r.customerName)}</td>
        <td style="max-width:260px;white-space:pre-wrap;">${esc(r.description)}</td>
        <td>${esc(r.category)}</td>
        <td class="sev-${esc(r.severity||"")}">${esc(r.severity)}</td>
        <td><span class="st-pill st-${esc(stKey)}">${esc(r.status||"Open")}</span></td>
        <td style="max-width:200px;white-space:pre-wrap;">${esc(r.rootCause)}</td>
        <td style="max-width:200px;white-space:pre-wrap;">${esc(r.correctiveAction)}</td>
        <td>${esc(r.owner)}</td>
        <td>${esc(fmtDate(r.createdDate || r.createdAt))}</td>
        <td>${esc(fmtDate(r.closedDate))}</td>
        <td style="max-width:200px;white-space:pre-wrap;">${esc(r.resolution)}</td>
        <td>${(r.files||[]).length}</td>
        <td>
          <div class="cq-acts">
            <button class="cq-btn solid" data-act="view"   data-id="${r.id}">View</button>
            <button class="cq-btn"       data-act="edit"   data-id="${r.id}">Edit</button>
            <button class="cq-btn"       data-act="attach" data-id="${r.id}">Attach</button>
            ${closed ? `` : `<button class="cq-btn success" data-act="close" data-id="${r.id}">Close</button>`}
            <button class="cq-btn danger" data-act="delete" data-id="${r.id}">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join("");

  tbody.querySelectorAll("button[data-act]").forEach(b => {
    b.addEventListener("click", () => {
      const rec = RECORDS.find(x => x.id === b.dataset.id);
      if (!rec) return;
      const act = b.dataset.act;
      if (act === "view")   openView(rec);
      if (act === "edit")   openEdit(rec);
      if (act === "attach") openAttach(rec);
      if (act === "close")  closeComplaint(rec);
      if (act === "delete") deleteRecord(rec);
    });
  });
}

/* ---------- Modal helpers ---------- */
function closeModal(){ document.querySelectorAll(".cq-modal").forEach(m => m.remove()); }
function openModal(innerHTML) {
  const m = document.createElement("div");
  m.className = "cq-modal";
  m.innerHTML = `<div class="cq-card">${innerHTML}</div>`;
  document.body.appendChild(m);
  m.addEventListener("click", e => { if (e.target === m) closeModal(); });
  return m;
}

/* ---------- VIEW ---------- */
function openView(r) {
  const m = openModal(`
    <h3>📋 Complaint ${esc(r.complaintId || r.id)}</h3>
    <table>
      <tr><th>Complaint ID</th><td>${esc(r.complaintId || r.id)}</td></tr>
      <tr><th>Customer Name</th><td>${esc(r.customerName)}</td></tr>
      <tr><th>Description</th><td style="white-space:pre-wrap;">${esc(r.description)}</td></tr>
      <tr><th>Category</th><td>${esc(r.category)}</td></tr>
      <tr><th>Severity / Priority</th><td>${esc(r.severity)}</td></tr>
      <tr><th>Status</th><td>${esc(r.status)}</td></tr>
      <tr><th>Root Cause</th><td style="white-space:pre-wrap;">${esc(r.rootCause)}</td></tr>
      <tr><th>Corrective Action</th><td style="white-space:pre-wrap;">${esc(r.correctiveAction)}</td></tr>
      <tr><th>Owner</th><td>${esc(r.owner)}</td></tr>
      <tr><th>Created Date</th><td>${esc(fmtDate(r.createdDate || r.createdAt))}</td></tr>
      <tr><th>Closed Date</th><td>${esc(fmtDate(r.closedDate))}</td></tr>
      <tr><th>Resolution</th><td style="white-space:pre-wrap;">${esc(r.resolution)}</td></tr>
    </table>
    ${renderFilesList(r, false)}
    <div class="actions">
      <button class="cq-btn" id="cqClose1">Close</button>
    </div>
  `);
  m.querySelector("#cqClose1").addEventListener("click", closeModal);
}

/* ---------- EDIT / NEW ---------- */
function openEdit(r) {
  const isNew = !r;
  r = r || {};
  const m = openModal(`
    <h3>${isNew ? "➕ New Complaint" : "✏️ Edit Complaint " + esc(r.complaintId || r.id)}</h3>
    <div class="grid2">
      <label>Complaint ID<input name="complaintId" value="${esc(r.complaintId || autoId())}" /></label>
      <label>Customer Name<input name="customerName" value="${esc(r.customerName||"")}" /></label>
      <label>Category
        <select name="category">${CATEGORIES.map(c=>`<option ${r.category===c?"selected":""}>${c}</option>`).join("")}</select>
      </label>
      <label>Severity / Priority
        <select name="severity">${SEVERITIES.map(c=>`<option ${r.severity===c?"selected":""}>${c}</option>`).join("")}</select>
      </label>
      <label>Status
        <select name="status">${STATUSES.map(c=>`<option ${(r.status||"Open")===c?"selected":""}>${c}</option>`).join("")}</select>
      </label>
      <label>Owner<input name="owner" value="${esc(r.owner||"")}" /></label>
      <label>Created Date<input type="date" name="createdDate" value="${esc(toInputDate(r.createdDate)||todayStr())}" /></label>
      <label>Closed Date<input type="date" name="closedDate" value="${esc(toInputDate(r.closedDate)||"")}" /></label>
    </div>
    <label>Description<textarea name="description">${esc(r.description||"")}</textarea></label>
    <label>Root Cause<textarea name="rootCause">${esc(r.rootCause||"")}</textarea></label>
    <label>Corrective Action<textarea name="correctiveAction">${esc(r.correctiveAction||"")}</textarea></label>
    <label>Resolution<textarea name="resolution">${esc(r.resolution||"")}</textarea></label>
    <div class="actions">
      <button class="cq-btn" id="cqCancel">Cancel</button>
      <button class="cq-btn solid" id="cqSave">Save</button>
    </div>
  `);
  m.querySelector("#cqCancel").addEventListener("click", closeModal);
  m.querySelector("#cqSave").addEventListener("click", async () => {
    const payload = {
      complaintId:      val(m,"complaintId"),
      customerName:     val(m,"customerName"),
      description:      val(m,"description"),
      category:         val(m,"category"),
      severity:         val(m,"severity"),
      status:           val(m,"status"),
      rootCause:        val(m,"rootCause"),
      correctiveAction: val(m,"correctiveAction"),
      owner:            val(m,"owner"),
      createdDate:      val(m,"createdDate"),
      closedDate:       val(m,"closedDate"),
      resolution:       val(m,"resolution"),
      updatedAt:        serverTimestamp(),
      updatedBy:        currentUserEmail || ""
    };
    try {
      if (isNew) {
        payload.createdAt = serverTimestamp();
        payload.createdBy = currentUserEmail || "";
        payload.files = [];
        await addDoc(collection(db, "customerComplaints"), payload);
      } else {
        await setDoc(doc(db, "customerComplaints", r.id), payload, { merge: true });
      }
      toast("Saved ✓"); closeModal();
    } catch (e) { console.error(e); toast("Save failed: " + e.message); }
  });
}

function val(m, name) { return (m.querySelector(`[name="${name}"]`)?.value || "").trim(); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function toInputDate(v){
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0,10);
  if (v?.toDate) return v.toDate().toISOString().slice(0,10);
  return "";
}
function autoId(){ return "CMP-" + Date.now().toString().slice(-6); }

/* ---------- DELETE ---------- */
async function deleteRecord(r) {
  if (!confirm(`Delete complaint ${r.complaintId || r.id}? This also removes its evidence files.`)) return;
  try {
    for (const f of (r.files || [])) {
      if (f?.path) { try { await deleteObject(ref(storage, f.path)); } catch(_){} }
    }
    await deleteDoc(doc(db, "customerComplaints", r.id));
    toast("Deleted");
  } catch (e) { console.error(e); toast("Delete failed: " + e.message); }
}

/* ---------- CLOSE COMPLAINT ---------- */
async function closeComplaint(r) {
  const resolution = prompt("Enter resolution / closing note:", r.resolution || "");
  if (resolution === null) return;
  try {
    await setDoc(doc(db, "customerComplaints", r.id), {
      status: "Closed",
      closedDate: todayStr(),
      resolution,
      updatedAt: serverTimestamp(),
      updatedBy: currentUserEmail || ""
    }, { merge: true });
    toast("Complaint closed ✓");
  } catch (e) { console.error(e); toast("Close failed: " + e.message); }
}

/* ---------- ATTACH EVIDENCE ---------- */
function openAttach(r) {
  const m = openModal(`
    <h3>📎 Attach Evidence — ${esc(r.complaintId || r.id)}</h3>
    <label>Choose file(s) to upload<input type="file" id="cqFile" multiple /></label>
    <div id="cqUpStatus" style="font-size:12px;color:#6b7280;margin-top:6px;"></div>
    ${renderFilesList(r, true)}
    <div class="actions"><button class="cq-btn" id="cqDone">Close</button></div>
  `);
  m.querySelector("#cqDone").addEventListener("click", closeModal);

  const fileInput = m.querySelector("#cqFile");
  const status    = m.querySelector("#cqUpStatus");
  fileInput.addEventListener("change", async () => {
    const files = [...fileInput.files];
    if (!files.length) return;
    status.textContent = "Uploading...";
    try {
      const fresh = RECORDS.find(x => x.id === r.id) || r;
      const existing = fresh.files || [];
      const newOnes = [];
      for (const f of files) {
        const path = `customerComplaints/${r.id}/${Date.now()}-${f.name}`;
        const refObj = ref(storage, path);
        await uploadBytes(refObj, f);
        const url = await getDownloadURL(refObj);
        newOnes.push({ name: f.name, path, url, date: new Date().toLocaleString(), by: currentUserEmail || "" });
      }
      await setDoc(doc(db, "customerComplaints", r.id), {
        files: [...existing, ...newOnes],
        updatedAt: serverTimestamp(), updatedBy: currentUserEmail || ""
      }, { merge: true });
      status.textContent = "Uploaded ✓"; toast("Uploaded ✓"); closeModal();
    } catch (e) { console.error(e); status.textContent = "Failed: " + e.message; }
  });

  m.querySelectorAll(".rm").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = +btn.dataset.i;
      const fresh = RECORDS.find(x => x.id === r.id) || r;
      const files = [...(fresh.files || [])];
      const removed = files.splice(i, 1)[0];
      try {
        if (removed?.path) { try { await deleteObject(ref(storage, removed.path)); } catch(_){} }
        await setDoc(doc(db, "customerComplaints", r.id), {
          files, updatedAt: serverTimestamp(), updatedBy: currentUserEmail || ""
        }, { merge: true });
        toast("Removed"); closeModal();
      } catch (e) { toast("Remove failed: " + e.message); }
    });
  });
}

function renderFilesList(r, withRemove) {
  const files = r.files || [];
  if (!files.length) return `<div class="cq-files"><div style="color:#6b7280;font-size:13px;">No evidence uploaded.</div></div>`;
  return `<div class="cq-files"><strong style="font-size:13px;">Evidence (${files.length})</strong>
    ${files.map((f,i) => `<div class="f-row">
      <span>📎</span>
      <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>
      <span style="color:#6b7280;font-size:11px;">${esc(f.date || "")}</span>
      ${withRemove ? `<button class="rm" data-i="${i}">Remove</button>` : ""}
    </div>`).join("")}
  </div>`;
}

/* ---------- EXPORT TO EXCEL (full data) ---------- */
function exportExcel() {
  if (!window.XLSX) { toast("XLSX library not loaded"); return; }
  const list = getFiltered();
  if (!list.length) { toast("Nothing to export"); return; }
  const rows = list.map(r => ({
    "Complaint ID":      r.complaintId || r.id,
    "Customer Name":     r.customerName || "",
    "Description":       r.description || "",
    "Category":          r.category || "",
    "Severity":          r.severity || "",
    "Status":            r.status || "",
    "Root Cause":        r.rootCause || "",
    "Corrective Action": r.correctiveAction || "",
    "Owner":             r.owner || "",
    "Created Date":      fmtDate(r.createdDate || r.createdAt),
    "Closed Date":       fmtDate(r.closedDate),
    "Resolution":        r.resolution || "",
    "Evidence Count":    (r.files || []).length
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Complaints");
  XLSX.writeFile(wb, `customer-complaints-${todayStr()}.xlsx`);
  toast("Exported ✓");
}

/* ---------- EXPORT REPORT (summary with main fields) ---------- */
function exportReport() {
  if (!window.XLSX) { toast("XLSX library not loaded"); return; }
  const list = getFiltered();
  if (!list.length) { toast("Nothing to export"); return; }

  // Summary sheet
  const total = list.length;
  const byStatus = countBy(list, "status");
  const bySeverity = countBy(list, "severity");
  const byCategory = countBy(list, "category");
  const open = list.filter(r => r.status !== "Closed").length;
  const closed = list.filter(r => r.status === "Closed").length;

  const summary = [
    ["Customer Quality — Complaints Report"],
    ["Generated", new Date().toLocaleString()],
    ["Total Complaints", total],
    ["Open", open],
    ["Closed", closed],
    [],
    ["By Status"], ...Object.entries(byStatus).map(([k,v]) => [k,v]),
    [],
    ["By Severity"], ...Object.entries(bySeverity).map(([k,v]) => [k,v]),
    [],
    ["By Category"], ...Object.entries(byCategory).map(([k,v]) => [k,v]),
  ];

  // Main fields sheet
  const main = list.map(r => ({
    "Complaint ID":  r.complaintId || r.id,
    "Customer":      r.customerName || "",
    "Category":      r.category || "",
    "Severity":      r.severity || "",
    "Status":        r.status || "",
    "Owner":         r.owner || "",
    "Created":       fmtDate(r.createdDate || r.createdAt),
    "Closed":        fmtDate(r.closedDate),
    "Resolution":    r.resolution || ""
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(main),   "Complaints");
  XLSX.writeFile(wb, `customer-complaints-report-${todayStr()}.xlsx`);
  toast("Report exported ✓");
}

function countBy(list, key) {
  return list.reduce((acc, r) => { const k = r[key] || "—"; acc[k] = (acc[k]||0)+1; return acc; }, {});
}

/* ---------- Toast ---------- */
function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) { console.log(msg); return; }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Home tile fallback ---------- */
document.querySelectorAll('.home-tile[data-go="customerQuality"]').forEach(tile => {
  tile.addEventListener("click", () => {
    const tab = document.querySelector('.tab[data-tab="customerQuality"]');
    if (tab) tab.click();
  });
});
