// maintenance.js — Maintenance module (Add Record + Records List + Compliance Report)
import { db, storage } from './firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const COL = 'maintenance_records';
const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = $('toast');
  if (!t) { alert(msg); return; }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
};

// ---------- Home tile -> Maintenance tab ----------
document.addEventListener('click', (e) => {
  const tile = e.target.closest('.home-tile[data-go="maintenance"]');
  if (tile) {
    const t = document.querySelector('.tab[data-tab="maintenance"]');
    if (t) t.click();
  }
});

// ---------- Sub-tab switching ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#maintenance .mt-subtab');
  if (!btn) return;
  document.querySelectorAll('#maintenance .mt-subtab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#maintenance .sub-panel').forEach(p => p.classList.remove('active'));
  const target = $(btn.dataset.subtab);
  if (target) target.classList.add('active');
});

// ---------- Helpers ----------
const computeStatus = (r) => {
  if (r.actualDate) return 'Completed';
  const today = new Date().toISOString().slice(0, 10);
  if (r.plannedDate && r.plannedDate < today) return 'Overdue';
  return 'Pending';
};
const statusBadge = (s) => {
  const c = s === 'Completed' ? '#16a34a' : (s === 'Overdue' ? '#dc2626' : '#f59e0b');
  return `<span style="background:${c};color:#fff;padding:3px 8px;border-radius:10px;font-size:12px;">${s}</span>`;
};
const fmtDate = (d) => d || '-';
const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c])));

// ---------- Save (add or update) ----------
const form = $('maintenanceForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const equipment = $('mtEquipment').value.trim();
    const type = $('mtType').value;
    if (!equipment || !type) { toast('Equipment and Maintenance Type are required'); return; }

    const editId = $('mtEditId').value;
    const file = $('mtProofFile').files[0];

    const rec = {
      equipment,
      type,
      plannedDate: $('mtPlannedDate').value || '',
      actualDate: $('mtActualDate').value || '',
      workOrderId: $('mtWorkOrder').value.trim(),
      technician: $('mtTechnician').value.trim(),
      proofType: $('mtProofType').value,
      notes: $('mtNotes').value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: (window.__session?.email || null),
    };

    try {
      let docId = editId;
      if (editId) {
        await updateDoc(doc(db, COL, editId), rec);
      } else {
        rec.createdAt = serverTimestamp();
        rec.createdBy = (window.__session?.email || null);
        const added = await addDoc(collection(db, COL), rec);
        docId = added.id;
      }
      if (file) {
        const path = `maintenance/${docId}/${Date.now()}_${file.name}`;
        const sref = ref(storage, path);
        await uploadBytes(sref, file);
        const url = await getDownloadURL(sref);
        await updateDoc(doc(db, COL, docId), {
          proofFileUrl: url, proofFileName: file.name, proofFilePath: path
        });
      }
      toast(editId ? 'Maintenance record updated' : 'Maintenance record saved');
      resetForm();
    } catch (err) {
      console.error(err);
      toast('Save failed: ' + (err.message || err.code));
    }
  });
}

const resetForm = () => {
  if (!form) return;
  form.reset();
  $('mtEditId').value = '';
  $('mtSaveBtn').textContent = 'Save Record';
};
$('mtResetBtn')?.addEventListener('click', resetForm);

// ---------- Live data ----------
let allRecords = [];
try {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'));
  onSnapshot(q, (snap) => {
    allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderRecords();
    renderReport();
    refreshEquipmentFilter();
  }, (err) => console.error('maintenance snapshot', err));
} catch (err) { console.error(err); }

// ---------- Records list ----------
const renderRecords = () => {
  const tbody = $('mtRecordsBody'); if (!tbody) return;
  const q = ($('mtSearch')?.value || '').toLowerCase();
  const rows = allRecords.filter(r => !q ||
    [r.equipment, r.type, r.workOrderId, r.technician].some(v => (v || '').toLowerCase().includes(q))
  );
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="padding:20px;text-align:center;color:#6b7280;">No records</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const s = computeStatus(r);
    return `<tr>
      <td style="padding:8px;border:1px solid #e3e8ef;">${esc(r.equipment)}</td>
      <td style="padding:8px;border:1px solid #e3e8ef;">${esc(r.type)}</td>
      <td style="padding:8px;border:1px solid #e3e8ef;">${fmtDate(r.plannedDate)}</td>
      <td style="padding:8px;border:1px solid #e3e8ef;">${fmtDate(r.actualDate)}</td>
      <td style="padding:8px;border:1px solid #e3e8ef;">${esc(r.workOrderId)}</td>
      <td style="padding:8px;border:1px solid #e3e8ef;">${esc(r.technician)}</td>
      <td style="padding:8px;border:1px solid #e3e8ef;">${statusBadge(s)}</td>
      <td style="padding:8px;border:1px solid #e3e8ef;white-space:nowrap;">
        <button data-mt-view="${r.id}" style="background:#0ea5e9;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;margin-right:4px;">View</button>
        <button data-mt-edit="${r.id}" style="background:#1f3a8a;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;margin-right:4px;">Edit</button>
        <button data-mt-del="${r.id}" style="background:#dc2626;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;">Delete</button>
      </td>
    </tr>`;
  }).join('');
};
$('mtSearch')?.addEventListener('input', renderRecords);

// View / Edit / Delete
document.addEventListener('click', async (e) => {
  const v = e.target.closest('[data-mt-view]');
  const ed = e.target.closest('[data-mt-edit]');
  const del = e.target.closest('[data-mt-del]');
  if (v) {
    const r = allRecords.find(x => x.id === v.dataset.mtView); if (!r) return;
    const s = computeStatus(r);
    const lines = [
      `Equipment: ${r.equipment || '-'}`,
      `Type: ${r.type || '-'}`,
      `Planned Date: ${r.plannedDate || '-'}`,
      `Actual Date: ${r.actualDate || '-'}`,
      `Work Order ID: ${r.workOrderId || '-'}`,
      `Technician: ${r.technician || '-'}`,
      `Proof Type: ${r.proofType || '-'}`,
      `Proof File: ${r.proofFileName || '-'}`,
      `Notes: ${r.notes || '-'}`,
      `Status: ${s}`,
    ].join('\n');
    if (r.proofFileUrl) {
      if (confirm(lines + '\n\nOpen proof file?')) window.open(r.proofFileUrl, '_blank');
    } else { alert(lines); }
  }
  if (ed) {
    const r = allRecords.find(x => x.id === ed.dataset.mtEdit); if (!r) return;
    document.querySelector('.tab[data-tab="maintenance"]')?.click();
    document.querySelector('#maintenance .mt-subtab[data-subtab="mt-add"]')?.click();
    $('mtEditId').value = r.id;
    $('mtEquipment').value = r.equipment || '';
    $('mtType').value = r.type || '';
    $('mtPlannedDate').value = r.plannedDate || '';
    $('mtActualDate').value = r.actualDate || '';
    $('mtWorkOrder').value = r.workOrderId || '';
    $('mtTechnician').value = r.technician || '';
    $('mtProofType').value = r.proofType || '';
    $('mtNotes').value = r.notes || '';
    $('mtSaveBtn').textContent = 'Update Record';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (del) {
    if (!confirm('Delete this maintenance record?')) return;
    const r = allRecords.find(x => x.id === del.dataset.mtDel);
    try {
      if (r?.proofFilePath) {
        try { await deleteObject(ref(storage, r.proofFilePath)); } catch (_) {}
      }
      await deleteDoc(doc(db, COL, del.dataset.mtDel));
      toast('Record deleted');
    } catch (err) { console.error(err); toast('Delete failed: ' + (err.message || err.code)); }
  }
});

// ---------- Compliance Report ----------
const refreshEquipmentFilter = () => {
  const sel = $('rptEquipment'); if (!sel) return;
  const current = sel.value;
  const items = Array.from(new Set(allRecords.map(r => r.equipment).filter(Boolean))).sort();
  sel.innerHTML = '<option value="">All equipment</option>' +
    items.map(i => `<option ${i === current ? 'selected' : ''}>${esc(i)}</option>`).join('');
};

const renderReport = () => {
  const sumBody = $('rptSummaryBody');
  const detBody = $('rptDetailBody');
  const kpis = $('rptKpis');
  if (!sumBody || !detBody || !kpis) return;

  const eq = $('rptEquipment').value;
  const from = $('rptFrom').value;
  const to = $('rptTo').value;
  const st = $('rptStatus').value;

  const filtered = allRecords.filter(r => {
    if (eq && r.equipment !== eq) return false;
    if (from && (r.plannedDate || '') < from) return false;
    if (to && (r.plannedDate || '') > to) return false;
    if (st && computeStatus(r) !== st) return false;
    return true;
  });

  const planned = filtered.length;
  const completed = filtered.filter(r => computeStatus(r) === 'Completed').length;
  const overdue = filtered.filter(r => computeStatus(r) === 'Overdue').length;
  const compliance = planned ? Math.round((completed / planned) * 100) : 0;

  const kpi = (label, val, color) =>
    `<div style="background:#fff;border:1px solid #e3e8ef;border-radius:8px;padding:10px 16px;min-width:140px;">
       <div style="font-size:12px;color:#6b7280;">${label}</div>
       <div style="font-size:20px;font-weight:700;color:${color};">${val}</div>
     </div>`;
  kpis.innerHTML =
    kpi('Planned', planned, '#1f3a8a') +
    kpi('Completed', completed, '#16a34a') +
    kpi('Overdue', overdue, '#dc2626') +
    kpi('Compliance', compliance + '%', '#1f3a8a');

  // Per equipment summary
  const groups = {};
  filtered.forEach(r => {
    const k = r.equipment || '(unspecified)';
    if (!groups[k]) groups[k] = { planned: 0, completed: 0, overdue: 0 };
    groups[k].planned++;
    const s = computeStatus(r);
    if (s === 'Completed') groups[k].completed++;
    if (s === 'Overdue') groups[k].overdue++;
  });
  const keys = Object.keys(groups).sort();
  sumBody.innerHTML = keys.length === 0
    ? `<tr><td colspan="5" style="padding:16px;text-align:center;color:#6b7280;">No data</td></tr>`
    : keys.map(k => {
        const g = groups[k];
        const c = g.planned ? Math.round((g.completed / g.planned) * 100) : 0;
        return `<tr>
          <td style="padding:8px;border:1px solid #e3e8ef;">${esc(k)}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${g.planned}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${g.completed}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${g.overdue}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${c}%</td>
        </tr>`;
      }).join('');

  detBody.innerHTML = filtered.length === 0
    ? `<tr><td colspan="5" style="padding:16px;text-align:center;color:#6b7280;">No records</td></tr>`
    : filtered.map(r => {
        const s = computeStatus(r);
        const proof = r.proofFileUrl
          ? `<a href="${r.proofFileUrl}" target="_blank" style="color:#1f3a8a;">${esc(r.workOrderId || r.proofFileName || 'View')}</a>`
          : esc(r.workOrderId || '-');
        return `<tr>
          <td style="padding:8px;border:1px solid #e3e8ef;">${esc(r.equipment)}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${fmtDate(r.plannedDate)}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${fmtDate(r.actualDate)}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${statusBadge(s)}</td>
          <td style="padding:8px;border:1px solid #e3e8ef;">${proof}</td>
        </tr>`;
      }).join('');
};

['rptEquipment','rptFrom','rptTo','rptStatus'].forEach(id => {
  $(id)?.addEventListener('change', renderReport);
});
