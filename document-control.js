/* Document Control module — QMS-V1
   - Firestore collections: "documents" + "documentVersionHistory"
   - NO file uploads. Only metadata + external shared URL (SharePoint/OneDrive/Drive).
   - Hooks into existing tab system (.tab[data-tab="docctrl"]) and home tile [data-go="docctrl"].
*/
import {
  db, auth,
  collection, doc, setDoc, getDoc, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
  onAuthStateChanged
} from "./firebase.js";

const DOC_TYPES = ["Policy", "Procedure", "Work Instruction", "Form", "Template", "Record"];
const STATUSES  = ["Draft", "Under Review", "Approved", "Obsolete"];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const state = { docs: [], hist: {}, search: "", fDept: "", fType: "", fStatus: "", sort: "reviewDate" };
let currentUserEmail = null;

onAuthStateChanged(auth, u => { currentUserEmail = u?.email || null; });

/* ---------- Mount UI ---------- */
const panel = document.getElementById("docctrl");
panel.innerHTML = `
  <style>
    #docctrl .dc-widgets{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px;}
    #docctrl .dc-widget{background:#fff;border:1px solid #e3e8ef;border-radius:8px;padding:14px;box-shadow:0 1px 2px rgba(0,0,0,.04);}
    #docctrl .dc-widget .lbl{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}
    #docctrl .dc-widget .val{font-size:26px;font-weight:600;margin-top:4px;color:#1f3a8a;}
    #docctrl .dc-widget.warn .val{color:#d97706;}
    #docctrl .dc-widget.danger .val{color:#dc2626;}
    #docctrl .dc-toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;}
    #docctrl .dc-toolbar input,#docctrl .dc-toolbar select{padding:8px 10px;border:1px solid #e3e8ef;border-radius:6px;font-size:14px;background:#fff;}
    #docctrl table{width:100%;border-collapse:collapse;min-width:1200px;}
    #docctrl th,#docctrl td{padding:8px 10px;text-align:left;border-bottom:1px solid #e3e8ef;font-size:13px;white-space:nowrap;}
    #docctrl th{background:#f5f7fa;font-size:11px;text-transform:uppercase;color:#6b7280;}
    #docctrl tr.row-warn{background:#fffbeb;}
    #docctrl tr.row-danger{background:#fef2f2;}
    #docctrl .pill{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;}
    #docctrl .pill.Draft{background:#e5e7eb;color:#374151;}
    #docctrl .pill.Under{background:#dbeafe;color:#1e40af;}
    #docctrl .pill.Approved{background:#dcfce7;color:#166534;}
    #docctrl .pill.Obsolete{background:#fee2e2;color:#991b1b;}
    .dc-modal{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;z-index:9500;padding:30px 16px;overflow:auto;}
    .dc-modal-card{background:#fff;border-radius:10px;width:100%;max-width:880px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.2);}
    .dc-modal-card h3{margin:0 0 14px;color:#1f3a8a;}
    .dc-modal-card .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;}
    .dc-modal-card label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#6b7280;}
    .dc-modal-card label.full{grid-column:1/-1;}
    .dc-modal-card input,.dc-modal-card select,.dc-modal-card textarea{padding:8px 10px;border:1px solid #e3e8ef;border-radius:6px;font-size:14px;font-family:inherit;color:#1f2937;}
    .dc-modal-card .actions{display:flex;gap:8px;margin-top:18px;justify-content:flex-end;}
    .dc-hist-table{width:100%;border-collapse:collapse;margin-top:12px;}
    .dc-hist-table th,.dc-hist-table td{padding:6px 8px;border-bottom:1px solid #e3e8ef;font-size:12px;text-align:left;}
  </style>

  <div class="dc-widgets">
    <div class="dc-widget"><div class="lbl">Total</div><div class="val" id="dcTotal">0</div></div>
    <div class="dc-widget"><div class="lbl">Active (Approved)</div><div class="val" id="dcActive">0</div></div>
    <div class="dc-widget"><div class="lbl">Under Review</div><div class="val" id="dcReview">0</div></div>
    <div class="dc-widget"><div class="lbl">Obsolete</div><div class="val" id="dcObsolete">0</div></div>
    <div class="dc-widget warn"><div class="lbl">Due in 30 days</div><div class="val" id="dcDue">0</div></div>
    <div class="dc-widget danger"><div class="lbl">Overdue Review</div><div class="val" id="dcOverdue">0</div></div>
  </div>

  <div class="dc-toolbar">
    <input id="dcSearch" type="search" placeholder="Search by ID or name…" style="min-width:220px;" />
    <select id="dcFDept"><option value="">All Departments</option></select>
    <select id="dcFType">
      <option value="">All Types</option>
      ${DOC_TYPES.map(t=>`<option>${t}</option>`).join("")}
    </select>
    <select id="dcFStatus">
      <option value="">All Statuses</option>
      ${STATUSES.map(s=>`<option>${s}</option>`).join("")}
    </select>
    <select id="dcSort">
      <option value="reviewDate">Sort: Review Date</option>
      <option value="modifiedDate">Sort: Last Updated</option>
    </select>
    <span style="flex:1"></span>
    <button id="dcAdd" class="btn primary">+ Add Document</button>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Doc ID</th><th>Name</th><th>Dept</th><th>Type</th><th>Ver</th>
        <th>Owner</th><th>Status</th><th>Effective</th><th>Review</th>
        <th>Updated</th><th>Link</th><th>Actions</th>
      </tr></thead>
      <tbody id="dcBody"><tr><td colspan="12" style="text-align:center;color:#6b7280;padding:20px">Loading…</td></tr></tbody>
    </table>
  </div>
`;

/* ---------- Realtime subscription ---------- */
onSnapshot(query(collection(db, "documents"), orderBy("documentName")), snap => {
  state.docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  refreshDeptFilter();
  render();
});
onSnapshot(collection(db, "documentVersionHistory"), snap => {
  state.hist = {};
  snap.docs.forEach(d => {
    const h = { id: d.id, ...d.data() };
    (state.hist[h.documentId] ||= []).push(h);
  });
  Object.values(state.hist).forEach(arr => arr.sort((a,b) => (b.updatedDate?.seconds||0)-(a.updatedDate?.seconds||0)));
});

/* ---------- Filters / sort ---------- */
function refreshDeptFilter(){
  const sel = panel.querySelector("#dcFDept");
  const cur = sel.value;
  const depts = [...new Set(state.docs.map(d => d.department).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">All Departments</option>` + depts.map(d=>`<option ${d===cur?"selected":""}>${esc(d)}</option>`).join("");
}
panel.querySelector("#dcSearch").addEventListener("input", e => { state.search = e.target.value.toLowerCase(); render(); });
panel.querySelector("#dcFDept").addEventListener("change", e => { state.fDept = e.target.value; render(); });
panel.querySelector("#dcFType").addEventListener("change", e => { state.fType = e.target.value; render(); });
panel.querySelector("#dcFStatus").addEventListener("change", e => { state.fStatus = e.target.value; render(); });
panel.querySelector("#dcSort").addEventListener("change", e => { state.sort = e.target.value; render(); });
panel.querySelector("#dcAdd").addEventListener("click", () => openForm(null));

/* ---------- Render ---------- */
function daysUntil(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr); if(isNaN(d)) return null;
  return Math.ceil((d - new Date()) / 86400000);
}
function fmtDate(v){
  if(!v) return "";
  if(typeof v === "string") return v;
  if(v.seconds) return new Date(v.seconds*1000).toISOString().slice(0,10);
  return "";
}
function render(){
  let list = state.docs.filter(d => {
    if(state.search){
      const hay = (d.documentId+" "+d.documentName).toLowerCase();
      if(!hay.includes(state.search)) return false;
    }
    if(state.fDept && d.department !== state.fDept) return false;
    if(state.fType && d.documentType !== state.fType) return false;
    if(state.fStatus && d.status !== state.fStatus) return false;
    return true;
  });
  list.sort((a,b) => {
    const av = state.sort==="modifiedDate" ? (a.modifiedDate?.seconds||0) : new Date(a.reviewDate||0).getTime();
    const bv = state.sort==="modifiedDate" ? (b.modifiedDate?.seconds||0) : new Date(b.reviewDate||0).getTime();
    return state.sort==="modifiedDate" ? bv-av : av-bv;
  });

  // Widgets
  panel.querySelector("#dcTotal").textContent    = state.docs.length;
  panel.querySelector("#dcActive").textContent   = state.docs.filter(d=>d.status==="Approved").length;
  panel.querySelector("#dcReview").textContent   = state.docs.filter(d=>d.status==="Under Review").length;
  panel.querySelector("#dcObsolete").textContent = state.docs.filter(d=>d.status==="Obsolete").length;
  panel.querySelector("#dcDue").textContent      = state.docs.filter(d=>{const n=daysUntil(d.reviewDate);return n!==null&&n>=0&&n<=30;}).length;
  panel.querySelector("#dcOverdue").textContent  = state.docs.filter(d=>{const n=daysUntil(d.reviewDate);return n!==null&&n<0;}).length;

  // Rows
  const body = panel.querySelector("#dcBody");
  if(!list.length){
    body.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#6b7280;padding:20px">No documents.</td></tr>`;
    return;
  }
  body.innerHTML = list.map(d => {
    const n = daysUntil(d.reviewDate);
    const rowCls = n!==null && n<0 ? "row-danger" : (n!==null && n<=30 ? "row-warn" : "");
    const statusKey = (d.status||"").startsWith("Under") ? "Under" : (d.status||"");
    const link = d.sharedUrl ? `<a href="${esc(d.sharedUrl)}" target="_blank" rel="noopener" class="btn sm primary">Open</a>` : `<span class="muted">—</span>`;
    return `<tr class="${rowCls}">
      <td>${esc(d.documentId)}</td>
      <td>${esc(d.documentName)}</td>
      <td>${esc(d.department||"")}</td>
      <td>${esc(d.documentType||"")}</td>
      <td>${esc(d.version||"")}</td>
      <td>${esc(d.owner||"")}</td>
      <td><span class="pill ${statusKey}">${esc(d.status||"")}</span></td>
      <td>${esc(d.effectiveDate||"")}</td>
      <td>${esc(d.reviewDate||"")}</td>
      <td>${esc(fmtDate(d.modifiedDate))}</td>
      <td>${link}</td>
      <td>
        <button class="btn sm" data-edit="${d.id}">Edit</button>
        <button class="btn sm" data-hist="${d.id}">History</button>
        <button class="btn sm danger" data-del="${d.id}">Del</button>
      </td>
    </tr>`;
  }).join("");

  body.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openForm(state.docs.find(d=>d.id===b.dataset.edit))));
  body.querySelectorAll("[data-hist]").forEach(b => b.addEventListener("click", () => openHistory(state.docs.find(d=>d.id===b.dataset.hist))));
  body.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    if(!confirm("Delete this document record? (the actual file in SharePoint/Drive is NOT deleted)")) return;
    await deleteDoc(doc(db, "documents", b.dataset.del));
    toast("Document deleted");
  }));
}

/* ---------- Add/Edit Modal ---------- */
function openForm(rec){
  const isEdit = !!rec;
  const r = rec || { status:"Draft", version:"1.0" };
  const overlay = document.createElement("div");
  overlay.className = "dc-modal";
  overlay.innerHTML = `
    <div class="dc-modal-card">
      <h3>${isEdit?"Edit":"Add"} Document</h3>
      <form id="dcForm">
        <div class="grid">
          <label>Document ID *<input required id="f_documentId" value="${esc(r.documentId||"")}" ${isEdit?"readonly":""} /></label>
          <label>Document Name *<input required id="f_documentName" value="${esc(r.documentName||"")}" /></label>
          <label>Department<input id="f_department" value="${esc(r.department||"")}" list="dlDepartment" /></label>
          <label>Document Type
            <select id="f_documentType">${DOC_TYPES.map(t=>`<option ${t===r.documentType?"selected":""}>${t}</option>`).join("")}</select>
          </label>
          <label>Version *<input required id="f_version" value="${esc(r.version||"")}" /></label>
          <label>Document Owner<input id="f_owner" value="${esc(r.owner||"")}" /></label>
          <label>Effective Date<input type="date" id="f_effectiveDate" value="${esc(r.effectiveDate||"")}" /></label>
          <label>Review Date<input type="date" id="f_reviewDate" value="${esc(r.reviewDate||"")}" /></label>
          <label>Status
            <select id="f_status">${STATUSES.map(s=>`<option ${s===r.status?"selected":""}>${s}</option>`).join("")}</select>
          </label>
          <label class="full">Shared Document URL * <span style="font-size:11px;color:#9ca3af">(SharePoint / OneDrive / Google Drive)</span>
            <input required type="url" id="f_sharedUrl" placeholder="https://…" value="${esc(r.sharedUrl||"")}" />
          </label>
          <label>Prepared By<input id="f_preparedBy" value="${esc(r.preparedBy||"")}" /></label>
          <label>Reviewed By<input id="f_reviewedBy" value="${esc(r.reviewedBy||"")}" /></label>
          <label>Approved By<input id="f_approvedBy" value="${esc(r.approvedBy||"")}" /></label>
          <label>Approval Date<input type="date" id="f_approvalDate" value="${esc(r.approvalDate||"")}" /></label>
          <label class="full">Change Description<textarea id="f_changeDescription" rows="2">${esc(r.changeDescription||"")}</textarea></label>
          <label class="full">Remarks<textarea id="f_remarks" rows="2">${esc(r.remarks||"")}</textarea></label>
        </div>
        <div class="actions">
          <button type="button" class="btn" id="dcCancel">Cancel</button>
          <button type="submit" class="btn primary">${isEdit?"Save Changes":"Create Document"}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", e => { if(e.target===overlay) close(); });
  overlay.querySelector("#dcCancel").addEventListener("click", close);

  overlay.querySelector("#dcForm").addEventListener("submit", async e => {
    e.preventDefault();
    const url = overlay.querySelector("#f_sharedUrl").value.trim();
    try { new URL(url); } catch { alert("Please enter a valid Shared Document URL (must start with http:// or https://)"); return; }

    const payload = {
      documentId: overlay.querySelector("#f_documentId").value.trim(),
      documentName: overlay.querySelector("#f_documentName").value.trim(),
      department: overlay.querySelector("#f_department").value.trim(),
      documentType: overlay.querySelector("#f_documentType").value,
      version: overlay.querySelector("#f_version").value.trim(),
      owner: overlay.querySelector("#f_owner").value.trim(),
      effectiveDate: overlay.querySelector("#f_effectiveDate").value,
      reviewDate: overlay.querySelector("#f_reviewDate").value,
      status: overlay.querySelector("#f_status").value,
      sharedUrl: url,
      preparedBy: overlay.querySelector("#f_preparedBy").value.trim(),
      reviewedBy: overlay.querySelector("#f_reviewedBy").value.trim(),
      approvedBy: overlay.querySelector("#f_approvedBy").value.trim(),
      approvalDate: overlay.querySelector("#f_approvalDate").value,
      changeDescription: overlay.querySelector("#f_changeDescription").value.trim(),
      remarks: overlay.querySelector("#f_remarks").value.trim(),
      modifiedBy: currentUserEmail || "(unknown)",
      modifiedDate: serverTimestamp()
    };

    try{
      let docRefId;
      if(isEdit){
        await setDoc(doc(db, "documents", rec.id), payload, { merge: true });
        docRefId = rec.id;
        // Log version history if version OR change description changed
        if(rec.version !== payload.version || payload.changeDescription){
          await addDoc(collection(db, "documentVersionHistory"), {
            documentId: payload.documentId,
            version: payload.version,
            changeDescription: payload.changeDescription,
            updatedBy: currentUserEmail || "(unknown)",
            updatedDate: serverTimestamp()
          });
        }
      } else {
        payload.createdBy = currentUserEmail || "(unknown)";
        payload.createdDate = serverTimestamp();
        const newRef = await addDoc(collection(db, "documents"), payload);
        docRefId = newRef.id;
        await addDoc(collection(db, "documentVersionHistory"), {
          documentId: payload.documentId,
          version: payload.version,
          changeDescription: payload.changeDescription || "Initial version",
          updatedBy: currentUserEmail || "(unknown)",
          updatedDate: serverTimestamp()
        });
      }
      if(window.__writeAudit) window.__writeAudit(isEdit?"doc_update":"doc_create", docRefId, { documentId: payload.documentId });
      toast(isEdit ? "Document updated" : "Document created");
      close();
    }catch(err){
      console.error(err);
      alert("Save failed: " + err.message);
    }
  });
}

/* ---------- Version History Modal ---------- */
function openHistory(rec){
  if(!rec) return;
  const list = (state.hist[rec.documentId] || []);
  const overlay = document.createElement("div");
  overlay.className = "dc-modal";
  overlay.innerHTML = `
    <div class="dc-modal-card" style="max-width:680px;">
      <h3>Version History — ${esc(rec.documentId)} · ${esc(rec.documentName)}</h3>
      ${list.length ? `
        <table class="dc-hist-table">
          <thead><tr><th>Version</th><th>Updated By</th><th>Date</th><th>Change Description</th></tr></thead>
          <tbody>${list.map(h => `
            <tr>
              <td>${esc(h.version||"")}</td>
              <td>${esc(h.updatedBy||"")}</td>
              <td>${esc(fmtDate(h.updatedDate))}</td>
              <td>${esc(h.changeDescription||"")}</td>
            </tr>`).join("")}
          </tbody>
        </table>` : `<p class="muted">No version history yet.</p>`}
      <div class="actions"><button class="btn" id="dcHistClose">Close</button></div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", e => { if(e.target===overlay) close(); });
  overlay.querySelector("#dcHistClose").addEventListener("click", close);
}

/* ---------- Toast ---------- */
function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- Home tile fallback (in case existing handler doesn't cover docctrl) ---------- */
document.querySelectorAll('.home-tile[data-go="docctrl"]').forEach(tile => {
  tile.addEventListener("click", () => {
    const tab = document.querySelector('.tab[data-tab="docctrl"]');
    if(tab) tab.click();
  });
});
