/* Document Control module — QMS-V1
   - Firestore collections: "documents" + "documentVersionHistory"
   - Supports a shared URL (SharePoint/OneDrive/Drive) AND file attachments
     (PDF, Word, Excel, Email) uploaded to Firebase Storage.
   - Hooks into existing tab system (.tab[data-tab="docctrl"]) and home tile [data-go="docctrl"].
*/
import {
  db, auth, storage,
  collection, doc, setDoc, getDoc, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy,
  ref, uploadBytes, getDownloadURL, deleteObject,
  onAuthStateChanged
} from "./firebase.js";

const DOC_TYPES = ["Policy", "Procedure", "Work Instruction", "Form", "Template", "Record"];
const STATUSES  = ["Draft", "Under Review", "Approved", "Obsolete"];

// Accepted attachment formats
const ACCEPT_ATTACH = [
  ".pdf",
  ".doc", ".docx",
  ".xls", ".xlsx",
  ".eml", ".msg"
].join(",");
const ATTACH_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

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
    #docctrl .att-count{display:inline-block;background:#eef2ff;color:#3730a3;border-radius:10px;padding:1px 7px;font-size:11px;font-weight:600;}
    .dc-modal{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;z-index:9500;padding:30px 16px;overflow:auto;}
    .dc-modal-card{background:#fff;border-radius:10px;width:100%;max-width:880px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.2);}
    .dc-modal-card h3{margin:0 0 14px;color:#1f3a8a;}
    .dc-modal-card .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;}
    .dc-modal-card label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#6b7280;}
    .dc-modal-card label.full{grid-column:1/-1;}
    .dc-modal-card input,.dc-modal-card select,.dc-modal-card textarea{padding:8px 10px;border:1px solid #e3e8ef;border-radius:6px;font-size:14px;font-family:inherit;color:#1f2937;}
    .dc-modal-card .actions{display:flex;gap:8px;margin-top:18px;justify-content:flex-end;}
    .dc-attach-box{grid-column:1/-1;border:1px dashed #cbd5e1;border-radius:8px;padding:12px;background:#f8fafc;}
    .dc-attach-box h4{margin:0 0 8px;color:#1f3a8a;font-size:14px;}
    .dc-attach-list{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-direction:column;gap:6px;}
    .dc-attach-list li{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e3e8ef;border-radius:6px;padding:6px 10px;font-size:13px;}
    .dc-attach-list li .name{flex:1;color:#1f2937;text-decoration:none;word-break:break-all;}
    .dc-attach-list li .size{color:#6b7280;font-size:11px;}
    .dc-attach-list li button{background:#fee2e2;color:#991b1b;border:none;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:11px;}
    .dc-attach-pending{color:#6b7280;font-size:12px;margin-top:6px;}
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
        <th>Updated</th><th>Link / Files</th><th>Actions</th>
      </tr></thead>
      <tbody id="dcBody"><tr><td colspan="12" style="text-align:center;color:#6b7280;padding:20px">Loading…</td></tr></tbody>
    </table>
  </div>
`;

/* ---------- Realtime subscription ---------- */
function showLoadError(msg){
  const body = panel.querySelector("#dcBody");
  if(body) body.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#b91c1c;padding:20px">${esc(msg)}</td></tr>`;
}

onSnapshot(query(collection(db, "documents"), orderBy("documentName")),
  snap => {
    state.docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    refreshDeptFilter();
    render();
  },
  err => {
    console.error("documents listener error:", err);
    showLoadError(
      err.code === "permission-denied"
        ? "Permission denied reading documents. Make sure the updated firestore.rules are deployed and your account is in approved_users."
        : "Failed to load documents: " + err.message
    );
  }
);

onSnapshot(collection(db, "documentVersionHistory"),
  snap => {
    state.hist = {};
    snap.docs.forEach(d => {
      const h = { id: d.id, ...d.data() };
      (state.hist[h.documentId] ||= []).push(h);
    });
    Object.values(state.hist).forEach(arr => arr.sort((a,b) => (b.updatedDate?.seconds||0)-(a.updatedDate?.seconds||0)));
  },
  err => console.error("documentVersionHistory listener error:", err)
);

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

/* ---------- Helpers ---------- */
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
function fmtSize(n){
  if(!n && n!==0) return "";
  if(n < 1024) return n + " B";
  if(n < 1024*1024) return (n/1024).toFixed(1) + " KB";
  return (n/1024/1024).toFixed(1) + " MB";
}
function normalizeUrl(u){
  u = (u||"").trim();
  if(!u) return "";
  if(/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
  return "https://" + u;
}

/* ---------- Render ---------- */
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
    const statusKey = (d.status||"Draft").split(" ")[0];
    const attachs = Array.isArray(d.attachments) ? d.attachments : [];
    const linkCell = [
      d.sharedUrl ? `<a href="${esc(d.sharedUrl)}" target="_blank" rel="noopener">Open</a>` : "",
      attachs.length ? `<span class="att-count" title="${esc(attachs.map(a=>a.name).join(', '))}">${attachs.length} file${attachs.length>1?'s':''}</span>` : ""
    ].filter(Boolean).join(" ");
    return `
      <tr class="${rowCls}" data-id="${esc(d.id)}">
        <td>${esc(d.documentId||"")}</td>
        <td>${esc(d.documentName||"")}</td>
        <td>${esc(d.department||"")}</td>
        <td>${esc(d.documentType||"")}</td>
        <td>${esc(d.version||"")}</td>
        <td>${esc(d.owner||"")}</td>
        <td><span class="pill ${statusKey}">${esc(d.status||"")}</span></td>
        <td>${esc(d.effectiveDate||"")}</td>
        <td>${esc(d.reviewDate||"")}</td>
        <td>${esc(fmtDate(d.modifiedDate))}</td>
        <td>${linkCell || '<span style="color:#9ca3af">—</span>'}</td>
        <td>
          <button class="btn small" data-act="edit">Edit</button>
          <button class="btn small" data-act="hist">History</button>
          <button class="btn small danger" data-act="del">Delete</button>
        </td>
      </tr>`;
  }).join("");

  body.querySelectorAll("tr[data-id]").forEach(tr => {
    const rec = list.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-act="edit"]')?.addEventListener("click", () => openForm(rec));
    tr.querySelector('[data-act="hist"]')?.addEventListener("click", () => openHistory(rec));
    tr.querySelector('[data-act="del"]')?.addEventListener("click", async () => {
      if(!confirm(`Delete document "${rec.documentName}"?`)) return;
      try{
        // best-effort attachment cleanup
        for(const a of (rec.attachments||[])){
          try { await deleteObject(ref(storage, a.path)); } catch(e){ /* ignore */ }
        }
        await deleteDoc(doc(db, "documents", rec.id));
        if(window.__writeAudit) window.__writeAudit("doc_delete", rec.id, { documentId: rec.documentId });
        toast("Document deleted");
      }catch(err){
        alert("Delete failed: " + err.message);
      }
    });
  });
}

/* ---------- Add/Edit Modal ---------- */
function openForm(rec){
  const isEdit = !!rec;
  const r = rec || { status:"Draft", version:"1.0" };

  // Working copy of attachments for this edit session
  let attachments = Array.isArray(r.attachments) ? r.attachments.map(a => ({...a})) : [];
  const pendingFiles = []; // File objects to upload on save
  const removedExisting = []; // storage paths to delete on save

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
          <label class="full">Shared Document URL <span style="font-size:11px;color:#9ca3af">(SharePoint / OneDrive / Google Drive — optional if you attach files below)</span>
            <input type="url" id="f_sharedUrl" placeholder="https://…" value="${esc(r.sharedUrl||"")}" />
          </label>

          <div class="dc-attach-box">
            <h4>Attachments <span style="font-weight:400;font-size:12px;color:#6b7280">(PDF, Word, Excel, Email — max 25&nbsp;MB each)</span></h4>
            <input type="file" id="f_attachInput" multiple accept="${ACCEPT_ATTACH}" />
            <ul class="dc-attach-list" id="f_attachList"></ul>
            <div class="dc-attach-pending" id="f_attachPending"></div>
          </div>

          <label>Prepared By<input id="f_preparedBy" value="${esc(r.preparedBy||"")}" /></label>
          <label>Reviewed By<input id="f_reviewedBy" value="${esc(r.reviewedBy||"")}" /></label>
          <label>Approved By<input id="f_approvedBy" value="${esc(r.approvedBy||"")}" /></label>
          <label>Approval Date<input type="date" id="f_approvalDate" value="${esc(r.approvalDate||"")}" /></label>
          <label class="full">Change Description<textarea id="f_changeDescription" rows="2">${esc(r.changeDescription||"")}</textarea></label>
          <label class="full">Remarks<textarea id="f_remarks" rows="2">${esc(r.remarks||"")}</textarea></label>
        </div>
        <div class="actions">
          <button type="button" class="btn" id="dcCancel">Cancel</button>
          <button type="submit" class="btn primary" id="dcSubmit">${isEdit?"Save Changes":"Create Document"}</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", e => { if(e.target===overlay) close(); });
  overlay.querySelector("#dcCancel").addEventListener("click", close);

  const listEl    = overlay.querySelector("#f_attachList");
  const pendingEl = overlay.querySelector("#f_attachPending");

  function renderAttachList(){
    const existing = attachments.map((a, idx) => `
      <li>
        <a class="name" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>
        <span class="size">${esc(fmtSize(a.size))}</span>
        <button type="button" data-rm-existing="${idx}">Remove</button>
      </li>`).join("");
    const pend = pendingFiles.map((f, idx) => `
      <li>
        <span class="name">${esc(f.name)} <em style="color:#9ca3af">(pending upload)</em></span>
        <span class="size">${esc(fmtSize(f.size))}</span>
        <button type="button" data-rm-pending="${idx}">Remove</button>
      </li>`).join("");
    listEl.innerHTML = existing + pend || `<li style="color:#9ca3af;border:none;background:transparent;padding:4px 0">No attachments yet.</li>`;
    listEl.querySelectorAll("[data-rm-existing]").forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.dataset.rmExisting,10);
      const [removed] = attachments.splice(i,1);
      if(removed?.path) removedExisting.push(removed.path);
      renderAttachList();
    }));
    listEl.querySelectorAll("[data-rm-pending]").forEach(b => b.addEventListener("click", () => {
      const i = parseInt(b.dataset.rmPending,10);
      pendingFiles.splice(i,1);
      renderAttachList();
    }));
  }
  renderAttachList();

  overlay.querySelector("#f_attachInput").addEventListener("change", e => {
    for(const f of e.target.files){
      if(f.size > ATTACH_MAX_BYTES){
        alert(`"${f.name}" exceeds the 25 MB limit and was skipped.`);
        continue;
      }
      pendingFiles.push(f);
    }
    e.target.value = "";
    renderAttachList();
  });

  overlay.querySelector("#dcForm").addEventListener("submit", async e => {
    e.preventDefault();

    const url = overlay.querySelector("#f_sharedUrl").value.trim();
    let normUrl = "";
    if(url){
      normUrl = normalizeUrl(url);
      try { new URL(normUrl); } catch { alert("Please enter a valid Shared Document URL"); return; }
    }
    if(!normUrl && attachments.length===0 && pendingFiles.length===0){
      alert("Please provide a Shared Document URL or attach at least one file.");
      return;
    }

    const submitBtn = overlay.querySelector("#dcSubmit");
    submitBtn.disabled = true;
    const origLabel = submitBtn.textContent;

    try{
      const docIdField = overlay.querySelector("#f_documentId").value.trim();

      // Decide the firestore doc id first so storage paths are stable.
      let firestoreDocId = isEdit ? rec.id : null;
      let docRefId;

      const basePayload = {
        documentId: docIdField,
        documentName: overlay.querySelector("#f_documentName").value.trim(),
        department: overlay.querySelector("#f_department").value.trim(),
        documentType: overlay.querySelector("#f_documentType").value,
        version: overlay.querySelector("#f_version").value.trim(),
        owner: overlay.querySelector("#f_owner").value.trim(),
        effectiveDate: overlay.querySelector("#f_effectiveDate").value,
        reviewDate: overlay.querySelector("#f_reviewDate").value,
        status: overlay.querySelector("#f_status").value,
        sharedUrl: normUrl,
        preparedBy: overlay.querySelector("#f_preparedBy").value.trim(),
        reviewedBy: overlay.querySelector("#f_reviewedBy").value.trim(),
        approvedBy: overlay.querySelector("#f_approvedBy").value.trim(),
        approvalDate: overlay.querySelector("#f_approvalDate").value,
        changeDescription: overlay.querySelector("#f_changeDescription").value.trim(),
        remarks: overlay.querySelector("#f_remarks").value.trim(),
        modifiedBy: currentUserEmail || "(unknown)",
        modifiedDate: serverTimestamp()
      };

      if(!isEdit){
        basePayload.createdBy = currentUserEmail || "(unknown)";
        basePayload.createdDate = serverTimestamp();
        basePayload.attachments = [];
        const newRef = await addDoc(collection(db, "documents"), basePayload);
        firestoreDocId = newRef.id;
        docRefId = newRef.id;
      }

      // Upload pending files
      const newlyUploaded = [];
      for(let i=0; i<pendingFiles.length; i++){
        const f = pendingFiles[i];
        submitBtn.textContent = `Uploading ${i+1}/${pendingFiles.length}…`;
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `documents/${firestoreDocId}/${Date.now()}_${i}_${safeName}`;
        const sref = ref(storage, path);
        await uploadBytes(sref, f, { contentType: f.type || "application/octet-stream" });
        const url2 = await getDownloadURL(sref);
        newlyUploaded.push({
          name: f.name,
          path,
          url: url2,
          contentType: f.type || "",
          size: f.size,
          uploadedBy: currentUserEmail || "(unknown)",
          uploadedAt: new Date().toISOString()
        });
      }

      // Delete attachments the user removed
      for(const p of removedExisting){
        try { await deleteObject(ref(storage, p)); } catch(e){ console.warn("Storage delete failed:", p, e); }
      }

      const finalAttachments = [...attachments, ...newlyUploaded];
      const finalPayload = { ...basePayload, attachments: finalAttachments };

      submitBtn.textContent = "Saving…";
      await setDoc(doc(db, "documents", firestoreDocId), finalPayload, { merge: true });
      docRefId = firestoreDocId;

      if(isEdit){
        if(rec.version !== finalPayload.version || finalPayload.changeDescription){
          await addDoc(collection(db, "documentVersionHistory"), {
            documentId: finalPayload.documentId,
            version: finalPayload.version,
            changeDescription: finalPayload.changeDescription,
            updatedBy: currentUserEmail || "(unknown)",
            updatedDate: serverTimestamp()
          });
        }
      } else {
        await addDoc(collection(db, "documentVersionHistory"), {
          documentId: finalPayload.documentId,
          version: finalPayload.version,
          changeDescription: finalPayload.changeDescription || "Initial version",
          updatedBy: currentUserEmail || "(unknown)",
          updatedDate: serverTimestamp()
        });
      }

      if(window.__writeAudit) window.__writeAudit(isEdit?"doc_update":"doc_create", docRefId, { documentId: finalPayload.documentId });
      toast(isEdit ? "Document updated" : "Document created");
      close();
    }catch(err){
      console.error(err);
      alert("Save failed: " + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = origLabel;
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

/* ---------- Home tile fallback ---------- */
document.querySelectorAll('.home-tile[data-go="docctrl"]').forEach(tile => {
  tile.addEventListener("click", () => {
    const tab = document.querySelector('.tab[data-tab="docctrl"]');
    if(tab) tab.click();
  });
});
