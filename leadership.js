/* Leadership & Governance Hub — QMS-V1
   10 items, each driven by an action-matrix config (view/edit/upload/link).
   - Firestore collection: "leadership"  (one doc per item, id = item key)
   - Firebase Storage path: "leadership/{itemKey}/{timestamp}-{filename}"
   - Hooks into existing tab system (.tab[data-tab="leadership"]) and home tile [data-go="leadership"].
*/
import {
  db, storage, auth,
  collection, doc, setDoc, getDoc,
  onSnapshot, serverTimestamp,
  ref, uploadBytes, getDownloadURL, deleteObject,
  onAuthStateChanged
} from "./firebase.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

let currentUserEmail = null;
onAuthStateChanged(auth, u => { currentUserEmail = u?.email || null; });

/* ---------- Action-matrix configuration (per request) ---------- */
const ITEMS = [
  { key:"companyDetails",  title:"Company Details",          icon:"🏢",
    view:true, edit:true,  upload:false, link:false,
    kind:"form",
    fields:[
      {name:"legalName",   label:"Legal Name"},
      {name:"tradeName",   label:"Trade Name"},
      {name:"registrationNo", label:"Registration / CR No."},
      {name:"taxId",       label:"Tax ID"},
      {name:"address",     label:"Address", textarea:true},
      {name:"phone",       label:"Phone"},
      {name:"email",       label:"Email"},
      {name:"website",     label:"Website"},
      {name:"ceo",         label:"CEO / MD"},
      {name:"industry",    label:"Industry"}
    ]},
  { key:"isoScope",        title:"ISO Scope Statement",      icon:"📜",
    view:true, edit:true,  upload:true,  link:false,
    kind:"text" },
  { key:"departments",     title:"Departments",              icon:"🏗️",
    view:true, edit:true,  upload:true,  link:false,
    kind:"list", listLabel:"Department" },
  { key:"processes",       title:"Processes",                icon:"🔁",
    view:true, edit:true,  upload:true,  link:true,
    kind:"list", listLabel:"Process" },
  { key:"orgChart",        title:"Organization Chart",       icon:"🗂️",
    view:true, edit:false, upload:true,  link:true,
    kind:"fileOnly" },
  { key:"roles",           title:"Roles & Responsibilities", icon:"👤",
    view:true, edit:true,  upload:true,  link:false,
    kind:"roles" },
  { key:"interestedParties", title:"Interested Parties",     icon:"🤝",
    view:true, edit:true,  upload:true,  link:false,
    kind:"table",
    columns:[
      {name:"party",        label:"Party"},
      {name:"needs",        label:"Needs / Expectations"},
      {name:"influence",    label:"Influence"},
      {name:"response",     label:"Our Response"}
    ]},
  { key:"contextOrg",      title:"Context of Organization",  icon:"🌐",
    view:true, edit:true,  upload:true,  link:false,
    kind:"text" },
  { key:"mom",             title:"Management Review MOM",    icon:"📝",
    view:true, edit:false, upload:true,  link:true,
    kind:"fileVersions" },
  { key:"swot",            title:"SWOT Analysis",            icon:"🎯",
    view:true, edit:true,  upload:true,  link:true,
    kind:"swot" }
];

/* ---------- Mount UI ---------- */
const panel = document.getElementById("leadership");
if (panel) {
  panel.innerHTML = `
    <style>
      #leadership{padding:24px 16px;}
      #leadership .lg-header{max-width:1200px;margin:0 auto 18px;text-align:center;}
      #leadership .lg-header h1{color:#1f3a8a;margin:0;font-size:26px;}
      #leadership .lg-header p{color:#6b7280;margin:6px 0 0;font-size:14px;}
      #leadership .lg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;max-width:1200px;margin:0 auto;}
      #leadership .lg-card{background:#fff;border:1px solid #e3e8ef;border-left:5px solid #1f3a8a;border-radius:10px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-direction:column;gap:8px;}
      #leadership .lg-card h3{margin:0;color:#1f3a8a;font-size:16px;display:flex;align-items:center;gap:8px;}
      #leadership .lg-card .ico{font-size:22px;}
      #leadership .lg-card .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;}
      #leadership .lg-btn{font-size:12px;padding:6px 10px;border:1px solid #1f3a8a;background:#fff;color:#1f3a8a;border-radius:6px;cursor:pointer;font-weight:600;}
      #leadership .lg-btn.solid{background:#1f3a8a;color:#fff;}
      #leadership .lg-btn:hover{opacity:.85;}
      #leadership .lg-meta{font-size:11px;color:#6b7280;}
      .lg-modal{position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:flex-start;justify-content:center;z-index:9600;padding:30px 16px;overflow:auto;}
      .lg-card-modal{background:#fff;border-radius:10px;width:100%;max-width:860px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.2);}
      .lg-card-modal h3{margin:0 0 14px;color:#1f3a8a;}
      .lg-card-modal label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#374151;margin-bottom:10px;}
      .lg-card-modal input,.lg-card-modal select,.lg-card-modal textarea{padding:8px 10px;border:1px solid #e3e8ef;border-radius:6px;font-size:14px;font-family:inherit;color:#1f2937;}
      .lg-card-modal textarea{min-height:90px;resize:vertical;}
      .lg-card-modal .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}
      .lg-card-modal .actions{display:flex;gap:8px;margin-top:18px;justify-content:flex-end;flex-wrap:wrap;}
      .lg-card-modal table{width:100%;border-collapse:collapse;font-size:13px;}
      .lg-card-modal th,.lg-card-modal td{border:1px solid #e3e8ef;padding:6px;text-align:left;vertical-align:top;}
      .lg-card-modal th{background:#f5f7fa;color:#374151;font-size:12px;}
      .lg-files{margin-top:10px;border-top:1px dashed #e3e8ef;padding-top:10px;}
      .lg-files .f-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;}
      .lg-files .f-row a{color:#1f3a8a;text-decoration:none;font-weight:600;}
      .lg-files .f-row .rm{margin-left:auto;color:#dc2626;background:none;border:0;cursor:pointer;font-size:12px;}
      .lg-list-row{display:flex;gap:6px;margin-bottom:6px;}
      .lg-list-row input{flex:1;}
      .lg-list-row button{background:#fee2e2;color:#991b1b;border:0;border-radius:6px;padding:0 10px;cursor:pointer;}
    </style>
    <div class="lg-header">
      <h1>🏛️ Leadership &amp; Governance Hub</h1>
      <p>Central place for company-level governance records, documents and references.</p>
    </div>
    <div class="lg-grid" id="lgGrid"></div>
  `;
}

/* ---------- State ---------- */
const state = {};  // state[key] = doc data

function renderCards() {
  const grid = document.getElementById("lgGrid");
  if (!grid) return;
  grid.innerHTML = ITEMS.map(it => {
    const d = state[it.key] || {};
    const fileCount = (d.files || []).length;
    const updated = d.updatedAt?.toDate ? d.updatedAt.toDate().toLocaleDateString() : "—";
    const acts = [];
    if (it.view)   acts.push(`<button class="lg-btn solid" data-act="view"   data-key="${it.key}">View</button>`);
    if (it.edit)   acts.push(`<button class="lg-btn"       data-act="edit"   data-key="${it.key}">Edit</button>`);
    if (it.upload) acts.push(`<button class="lg-btn"       data-act="upload" data-key="${it.key}">Upload</button>`);
    if (it.link)   acts.push(`<button class="lg-btn"       data-act="link"   data-key="${it.key}">Link</button>`);
    return `
      <div class="lg-card">
        <h3><span class="ico">${it.icon}</span>${esc(it.title)}</h3>
        <div class="lg-meta">Files: ${fileCount} · Updated: ${esc(updated)}</div>
        <div class="acts">${acts.join("")}</div>
      </div>`;
  }).join("");

  grid.querySelectorAll("button[data-act]").forEach(b => {
    b.addEventListener("click", () => openModal(b.dataset.key, b.dataset.act));
  });
}

/* ---------- Firestore subscription ---------- */
ITEMS.forEach(it => {
  onSnapshot(doc(db, "leadership", it.key), snap => {
    state[it.key] = snap.exists() ? snap.data() : {};
    renderCards();
  });
});

/* ---------- Modal ---------- */
function closeModal(){ document.querySelectorAll(".lg-modal").forEach(m => m.remove()); }

function openModal(key, mode) {
  const it = ITEMS.find(x => x.key === key);
  if (!it) return;
  const d = state[key] || {};
  const modal = document.createElement("div");
  modal.className = "lg-modal";
  modal.innerHTML = `<div class="lg-card-modal"><h3>${it.icon} ${esc(it.title)} <span style="font-size:13px;color:#6b7280;font-weight:400;">— ${mode.toUpperCase()}</span></h3><div id="lgBody"></div><div class="actions"><button class="lg-btn" id="lgClose">Close</button><button class="lg-btn solid" id="lgSave" style="display:none;">Save</button></div></div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  modal.querySelector("#lgClose").addEventListener("click", closeModal);

  const body = modal.querySelector("#lgBody");
  const saveBtn = modal.querySelector("#lgSave");

  // Render content for the chosen mode
  if (mode === "view") {
    body.innerHTML = renderView(it, d);
  } else if (mode === "edit") {
    body.innerHTML = renderEdit(it, d);
    saveBtn.style.display = "";
    saveBtn.addEventListener("click", () => saveEdit(it, body));
    wireEditHandlers(it, body);
  } else if (mode === "upload") {
    body.innerHTML = renderUpload(it, d);
    wireUpload(it, body);
  } else if (mode === "link") {
    body.innerHTML = renderLink(it, d);
    saveBtn.style.display = "";
    saveBtn.addEventListener("click", () => saveLink(it, body));
  }
}

/* ---------- VIEW ---------- */
function renderView(it, d) {
  let html = "";
  if (it.kind === "form") {
    html += `<table>${it.fields.map(f => `<tr><th style="width:200px;">${esc(f.label)}</th><td>${esc(d[f.name] || "—")}</td></tr>`).join("")}</table>`;
  } else if (it.kind === "text") {
    html += `<div style="white-space:pre-wrap;background:#f9fafb;padding:12px;border-radius:6px;min-height:60px;">${esc(d.text || "—")}</div>`;
  } else if (it.kind === "list") {
    const items = d.items || [];
    html += items.length
      ? `<ol style="padding-left:20px;">${items.map(i => `<li style="margin:4px 0;">${esc(i)}</li>`).join("")}</ol>`
      : `<div style="color:#6b7280;">No entries.</div>`;
  } else if (it.kind === "roles") {
    const rows = d.rows || [];
    html += rows.length
      ? `<table><thead><tr><th>Role</th><th>Responsibility</th><th>Owner</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.role)}</td><td>${esc(r.resp)}</td><td>${esc(r.owner)}</td></tr>`).join("")}</tbody></table>`
      : `<div style="color:#6b7280;">No roles defined.</div>`;
  } else if (it.kind === "table") {
    const rows = d.rows || [];
    html += rows.length
      ? `<table><thead><tr>${it.columns.map(c => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${it.columns.map(c => `<td>${esc(r[c.name] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      : `<div style="color:#6b7280;">No entries.</div>`;
  } else if (it.kind === "swot") {
    const s = d.swot || {};
    html += `<div class="grid2">
      <div><h4 style="color:#16a34a;margin:0 0 4px;">Strengths</h4><div style="white-space:pre-wrap;background:#f0fdf4;padding:8px;border-radius:6px;min-height:60px;">${esc(s.strengths || "—")}</div></div>
      <div><h4 style="color:#dc2626;margin:0 0 4px;">Weaknesses</h4><div style="white-space:pre-wrap;background:#fef2f2;padding:8px;border-radius:6px;min-height:60px;">${esc(s.weaknesses || "—")}</div></div>
      <div><h4 style="color:#2563eb;margin:0 0 4px;">Opportunities</h4><div style="white-space:pre-wrap;background:#eff6ff;padding:8px;border-radius:6px;min-height:60px;">${esc(s.opportunities || "—")}</div></div>
      <div><h4 style="color:#d97706;margin:0 0 4px;">Threats</h4><div style="white-space:pre-wrap;background:#fffbeb;padding:8px;border-radius:6px;min-height:60px;">${esc(s.threats || "—")}</div></div>
    </div>`;
  } else if (it.kind === "fileOnly" || it.kind === "fileVersions") {
    html += `<div style="color:#6b7280;">See files and link below.</div>`;
  }
  // Files & link list (read-only)
  html += renderFilesList(it, d, false);
  if (it.link && d.link) {
    html += `<div style="margin-top:10px;"><strong>Link:</strong> <a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.link)}</a></div>`;
  }
  return html;
}

/* ---------- EDIT ---------- */
function renderEdit(it, d) {
  if (it.kind === "form") {
    return `<div class="grid2">${it.fields.map(f => `
      <label class="${f.textarea ? "full" : ""}" style="${f.textarea ? "grid-column:1/-1;" : ""}">${esc(f.label)}
        ${f.textarea ? `<textarea name="${f.name}">${esc(d[f.name] || "")}</textarea>` : `<input name="${f.name}" value="${esc(d[f.name] || "")}" />`}
      </label>`).join("")}</div>`;
  }
  if (it.kind === "text") {
    return `<label>Content<textarea name="text" style="min-height:180px;">${esc(d.text || "")}</textarea></label>`;
  }
  if (it.kind === "list") {
    const items = d.items || [];
    return `<div id="lgListWrap">${items.map((v,i)=>listRow(v,i)).join("") || listRow("",0)}</div>
      <button class="lg-btn" id="lgListAdd" type="button">+ Add ${esc(it.listLabel || "item")}</button>`;
  }
  if (it.kind === "roles") {
    const rows = d.rows || [];
    return `<table id="lgRolesTbl"><thead><tr><th>Role</th><th>Responsibility</th><th>Owner</th><th></th></tr></thead>
      <tbody>${(rows.length?rows:[{role:"",resp:"",owner:""}]).map(rolesRow).join("")}</tbody></table>
      <button class="lg-btn" id="lgRolesAdd" type="button" style="margin-top:8px;">+ Add Role</button>`;
  }
  if (it.kind === "table") {
    const rows = d.rows || [];
    return `<table id="lgTblEdit"><thead><tr>${it.columns.map(c=>`<th>${esc(c.label)}</th>`).join("")}<th></th></tr></thead>
      <tbody>${(rows.length?rows:[{}]).map(r=>tableRow(it,r)).join("")}</tbody></table>
      <button class="lg-btn" id="lgTblAdd" type="button" style="margin-top:8px;">+ Add Row</button>`;
  }
  if (it.kind === "swot") {
    const s = d.swot || {};
    return `<div class="grid2">
      <label>Strengths<textarea name="strengths">${esc(s.strengths || "")}</textarea></label>
      <label>Weaknesses<textarea name="weaknesses">${esc(s.weaknesses || "")}</textarea></label>
      <label>Opportunities<textarea name="opportunities">${esc(s.opportunities || "")}</textarea></label>
      <label>Threats<textarea name="threats">${esc(s.threats || "")}</textarea></label>
    </div>`;
  }
  return `<div style="color:#6b7280;">This item is not editable. Use Upload / Link.</div>`;
}

function listRow(v,i){ return `<div class="lg-list-row"><input value="${esc(v)}" /><button type="button" onclick="this.parentNode.remove()">✕</button></div>`; }
function rolesRow(r){ return `<tr>
  <td><input name="role" value="${esc(r.role||"")}" style="width:100%;" /></td>
  <td><input name="resp" value="${esc(r.resp||"")}" style="width:100%;" /></td>
  <td><input name="owner" value="${esc(r.owner||"")}" style="width:100%;" /></td>
  <td><button class="lg-btn" type="button" onclick="this.closest('tr').remove()">✕</button></td></tr>`; }
function tableRow(it,r){ return `<tr>${it.columns.map(c=>`<td><input name="${c.name}" value="${esc(r[c.name]||"")}" style="width:100%;" /></td>`).join("")}<td><button class="lg-btn" type="button" onclick="this.closest('tr').remove()">✕</button></td></tr>`; }

function wireEditHandlers(it, body) {
  if (it.kind === "list") {
    body.querySelector("#lgListAdd")?.addEventListener("click", () => {
      body.querySelector("#lgListWrap").insertAdjacentHTML("beforeend", listRow("", 0));
    });
  }
  if (it.kind === "roles") {
    body.querySelector("#lgRolesAdd")?.addEventListener("click", () => {
      body.querySelector("#lgRolesTbl tbody").insertAdjacentHTML("beforeend", rolesRow({}));
    });
  }
  if (it.kind === "table") {
    body.querySelector("#lgTblAdd")?.addEventListener("click", () => {
      body.querySelector("#lgTblEdit tbody").insertAdjacentHTML("beforeend", tableRow(it, {}));
    });
  }
}

async function saveEdit(it, body) {
  const payload = { updatedAt: serverTimestamp(), updatedBy: currentUserEmail || "" };
  if (it.kind === "form") {
    it.fields.forEach(f => { payload[f.name] = body.querySelector(`[name="${f.name}"]`)?.value.trim() || ""; });
  } else if (it.kind === "text") {
    payload.text = body.querySelector('[name="text"]')?.value || "";
  } else if (it.kind === "list") {
    payload.items = [...body.querySelectorAll("#lgListWrap input")].map(i => i.value.trim()).filter(Boolean);
  } else if (it.kind === "roles") {
    payload.rows = [...body.querySelectorAll("#lgRolesTbl tbody tr")].map(tr => ({
      role: tr.querySelector('[name="role"]').value.trim(),
      resp: tr.querySelector('[name="resp"]').value.trim(),
      owner: tr.querySelector('[name="owner"]').value.trim()
    })).filter(r => r.role || r.resp || r.owner);
  } else if (it.kind === "table") {
    payload.rows = [...body.querySelectorAll("#lgTblEdit tbody tr")].map(tr => {
      const o = {}; it.columns.forEach(c => { o[c.name] = tr.querySelector(`[name="${c.name}"]`).value.trim(); });
      return o;
    }).filter(r => Object.values(r).some(v => v));
  } else if (it.kind === "swot") {
    payload.swot = {
      strengths:     body.querySelector('[name="strengths"]').value,
      weaknesses:    body.querySelector('[name="weaknesses"]').value,
      opportunities: body.querySelector('[name="opportunities"]').value,
      threats:       body.querySelector('[name="threats"]').value
    };
  }
  try {
    await setDoc(doc(db, "leadership", it.key), payload, { merge: true });
    toast("Saved ✓"); closeModal();
  } catch (e) { console.error(e); toast("Save failed: " + e.message); }
}

/* ---------- UPLOAD ---------- */
function renderUpload(it, d) {
  return `<label>Choose file(s) to upload<input type="file" id="lgFile" multiple /></label>
    <div id="lgUpStatus" style="font-size:12px;color:#6b7280;margin-top:6px;"></div>
    ${renderFilesList(it, d, true)}`;
}
function renderFilesList(it, d, withRemove) {
  const files = d.files || [];
  if (!files.length) return `<div class="lg-files"><div style="color:#6b7280;font-size:13px;">No files uploaded.</div></div>`;
  return `<div class="lg-files"><strong style="font-size:13px;">Uploaded files (${files.length})</strong>
    ${files.map((f,i) => `<div class="f-row">
      <span>📎</span>
      <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>
      <span style="color:#6b7280;font-size:11px;">${esc(f.date || "")}</span>
      ${withRemove ? `<button class="rm" data-i="${i}" data-key="${it.key}">Remove</button>` : ""}
    </div>`).join("")}
  </div>`;
}
function wireUpload(it, body) {
  const fileInput = body.querySelector("#lgFile");
  const status    = body.querySelector("#lgUpStatus");
  fileInput.addEventListener("change", async () => {
    const files = [...fileInput.files];
    if (!files.length) return;
    status.textContent = "Uploading...";
    try {
      const existing = state[it.key]?.files || [];
      const newOnes = [];
      for (const f of files) {
        const path = `leadership/${it.key}/${Date.now()}-${f.name}`;
        const r = ref(storage, path);
        await uploadBytes(r, f);
        const url = await getDownloadURL(r);
        newOnes.push({ name: f.name, path, url, date: new Date().toLocaleString(), by: currentUserEmail || "" });
      }
      await setDoc(doc(db, "leadership", it.key), {
        files: [...existing, ...newOnes],
        updatedAt: serverTimestamp(), updatedBy: currentUserEmail || ""
      }, { merge: true });
      status.textContent = "Uploaded ✓";
      toast("Uploaded ✓");
      closeModal();
    } catch (e) { console.error(e); status.textContent = "Failed: " + e.message; }
  });
  body.querySelectorAll(".rm").forEach(btn => {
    btn.addEventListener("click", async () => {
      const i = +btn.dataset.i;
      const files = [...(state[it.key]?.files || [])];
      const removed = files.splice(i,1)[0];
      try {
        if (removed?.path) { try { await deleteObject(ref(storage, removed.path)); } catch(_){} }
        await setDoc(doc(db, "leadership", it.key), {
          files, updatedAt: serverTimestamp(), updatedBy: currentUserEmail || ""
        }, { merge: true });
        toast("Removed");
        closeModal();
      } catch (e) { toast("Remove failed: " + e.message); }
    });
  });
}

/* ---------- LINK ---------- */
function renderLink(it, d) {
  return `<label>External Link (SharePoint / OneDrive / Drive / URL)
    <input type="url" id="lgLinkInput" placeholder="https://..." value="${esc(d.link || "")}" /></label>
    ${d.link ? `<div style="margin-top:8px;font-size:13px;">Current: <a href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.link)}</a></div>` : ""}`;
}
async function saveLink(it, body) {
  const link = body.querySelector("#lgLinkInput").value.trim();
  try {
    await setDoc(doc(db, "leadership", it.key), {
      link, updatedAt: serverTimestamp(), updatedBy: currentUserEmail || ""
    }, { merge: true });
    toast("Link saved ✓"); closeModal();
  } catch (e) { toast("Save failed: " + e.message); }
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

/* ---------- Home tile fallback (in case existing handler doesn't cover leadership) ---------- */
document.querySelectorAll('.home-tile[data-go="leadership"]').forEach(tile => {
  tile.addEventListener("click", () => {
    const tab = document.querySelector('.tab[data-tab="leadership"]');
    if (tab) tab.click();
  });
});
