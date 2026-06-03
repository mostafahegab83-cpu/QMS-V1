// supplier.js — Supplier Evaluation module
import { db } from './firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'supplier_evaluations';
const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = $('toast');
  if (!t) { alert(msg); return; }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
};

const CRITERIA = [
  { key: 'quality',       label: 'Quality of service/product' },
  { key: 'delivery',      label: 'Delivery timeliness' },
  { key: 'compliance',    label: 'Compliance with requirements' },
  { key: 'communication', label: 'Communication & responsiveness' },
  { key: 'cost',          label: 'Cost competitiveness' },
];

// ---------- Home tile -> Supplier tab ----------
document.addEventListener('click', (e) => {
  const tile = e.target.closest('.home-tile[data-go="supplier"]');
  if (tile) {
    const t = document.querySelector('.tab[data-tab="supplier"]');
    if (t) t.click();
  }
});

// ---------- Sub-tab switching ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#supplier .sp-subtab');
  if (!btn) return;
  document.querySelectorAll('#supplier .sp-subtab').forEach(b => {
    b.classList.remove('active');
    b.style.borderBottom = '3px solid transparent';
    b.style.color = '#6b7280';
  });
  btn.classList.add('active');
  btn.style.borderBottom = '3px solid #1f3a8a';
  btn.style.color = '#1f3a8a';
  document.querySelectorAll('#supplier .sp-panel').forEach(p => p.style.display = 'none');
  const target = $(btn.dataset.subtab);
  if (target) target.style.display = 'block';

  // Hide form chrome when on Reports tab
  const form = $('supplierForm');
  if (form) form.style.display = (btn.dataset.subtab === 'sp-report') ? 'none' : 'block';
});

// ---------- Render criteria table ----------
const criteriaTbody = document.querySelector('#spCriteriaTable tbody');
if (criteriaTbody) {
  criteriaTbody.innerHTML = CRITERIA.map(c => `
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb;">${c.label}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">
        <span class="sp-stars" data-key="${c.key}" style="font-size:22px;cursor:pointer;color:#d1d5db;letter-spacing:2px;">★★★★★</span>
        <div style="font-size:11px;color:#6b7280;">Score: <span class="sp-score-val" data-key="${c.key}">0</span></div>
        <input type="hidden" class="sp-score" data-key="${c.key}" value="0">
      </td>
      <td style="padding:4px;border:1px solid #e5e7eb;">
        <input type="text" class="sp-comment" data-key="${c.key}" placeholder="Comments…" style="width:100%;padding:6px;border:1px solid #cfd6df;border-radius:4px;">
      </td>
    </tr>`).join('');
}

// Star rating interaction
document.addEventListener('click', (e) => {
  const stars = e.target.closest('#supplier .sp-stars');
  if (!stars) return;
  const rect = stars.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const score = Math.min(5, Math.max(1, Math.ceil((x / rect.width) * 5)));
  setStars(stars.dataset.key, score);
  updateOverall();
});

function setStars(key, score) {
  const stars = document.querySelector(`#supplier .sp-stars[data-key="${key}"]`);
  const input = document.querySelector(`#supplier .sp-score[data-key="${key}"]`);
  const valEl = document.querySelector(`#supplier .sp-score-val[data-key="${key}"]`);
  if (stars) {
    stars.textContent = '★★★★★';
    stars.style.background = `linear-gradient(90deg,#f59e0b ${score * 20}%,#d1d5db ${score * 20}%)`;
    stars.style.webkitBackgroundClip = 'text';
    stars.style.backgroundClip = 'text';
    stars.style.color = 'transparent';
  }
  if (input) input.value = String(score);
  if (valEl) valEl.textContent = String(score);
}

function getScores() {
  const out = {};
  document.querySelectorAll('#supplier .sp-score').forEach(i => {
    out[i.dataset.key] = parseInt(i.value || '0', 10) || 0;
  });
  return out;
}
function getComments() {
  const out = {};
  document.querySelectorAll('#supplier .sp-comment').forEach(i => {
    out[i.dataset.key] = i.value.trim();
  });
  return out;
}
function ratingFromAvg(avg) {
  if (avg >= 4) return { label: 'Approved ✅', color: '#16a34a' };
  if (avg >= 2.5) return { label: 'Conditional ⚠️', color: '#f59e0b' };
  return { label: 'Rejected ❌', color: '#dc2626' };
}
function updateOverall() {
  const s = getScores();
  const vals = CRITERIA.map(c => s[c.key] || 0);
  const total = vals.reduce((a, b) => a + b, 0);
  const filled = vals.filter(v => v > 0).length;
  const avg = filled ? total / filled : 0;
  $('spTotal').textContent = String(total);
  $('spAvg').textContent = avg.toFixed(2);
  const r = ratingFromAvg(avg);
  const ratingEl = $('spRating');
  if (filled === 0) { ratingEl.textContent = '—'; ratingEl.style.color = '#6b7280'; }
  else { ratingEl.textContent = r.label; ratingEl.style.color = r.color; }
}

// ---------- Submit / Update ----------
const form = $('supplierForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('spName').value.trim();
    const sid = $('spId').value.trim();
    const cat = $('spCategory').value;
    const evaluator = $('spEvaluator').value.trim();
    const date = $('spDate').value;
    if (!name || !sid || !cat || !evaluator || !date) {
      toast('Please fill Supplier Name, ID, Category, Evaluator and Date');
      return;
    }
    const scores = getScores();
    const comments = getComments();
    const vals = CRITERIA.map(c => scores[c.key] || 0);
    if (vals.every(v => v === 0)) { toast('Please score at least one criterion'); return; }
    const total = vals.reduce((a, b) => a + b, 0);
    const filled = vals.filter(v => v > 0).length;
    const avg = filled ? total / filled : 0;
    const rating = ratingFromAvg(avg).label;

    const rec = {
      supplierName: name,
      supplierId: sid,
      category: cat,
      department: $('spDept').value.trim(),
      evaluator,
      evaluationDate: date,
      scores, comments,
      totalScore: total,
      averageScore: Number(avg.toFixed(2)),
      rating,
      updatedAt: serverTimestamp(),
      updatedBy: (window.__session?.email || null),
    };

    const editId = $('spEditId').value;
    try {
      if (editId) {
        await updateDoc(doc(db, COL, editId), rec);
        toast('Supplier evaluation updated');
      } else {
        rec.createdAt = serverTimestamp();
        rec.createdBy = (window.__session?.email || null);
        await addDoc(collection(db, COL), rec);
        toast('Supplier evaluation saved');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      const detail = err.code === 'permission-denied'
        ? 'Permission denied. Deploy the updated firestore.rules and make sure this login is approved.'
        : (err.message || err.code);
      toast('Save failed: ' + detail);
    }
  });
}

function resetForm() {
  form.reset();
  $('spEditId').value = '';
  $('spEditBadge').style.display = 'none';
  $('spCancelEdit').style.display = 'none';
  $('spSubmitBtn').textContent = 'Submit';
  CRITERIA.forEach(c => { setStars(c.key, 0); });
  document.querySelectorAll('#supplier .sp-score').forEach(i => i.value = '0');
  document.querySelectorAll('#supplier .sp-score-val').forEach(i => i.textContent = '0');
  document.querySelectorAll('#supplier .sp-comment').forEach(i => i.value = '');
  updateOverall();
}
$('spCancelEdit')?.addEventListener('click', resetForm);

function loadForEdit(r) {
  $('spEditId').value = r.id;
  $('spName').value = r.supplierName || '';
  $('spId').value = r.supplierId || '';
  $('spCategory').value = r.category || '';
  $('spDept').value = r.department || '';
  $('spEvaluator').value = r.evaluator || '';
  $('spDate').value = r.evaluationDate || '';
  CRITERIA.forEach(c => {
    setStars(c.key, (r.scores && r.scores[c.key]) || 0);
    const ci = document.querySelector(`#supplier .sp-comment[data-key="${c.key}"]`);
    if (ci) ci.value = (r.comments && r.comments[c.key]) || '';
  });
  updateOverall();
  $('spEditBadge').style.display = 'block';
  $('spCancelEdit').style.display = 'inline-block';
  $('spSubmitBtn').textContent = 'Update Record';
  // jump to first sub-panel
  const first = document.querySelector('#supplier .sp-subtab[data-subtab="sp-form"]');
  if (first) first.click();
}

// ---------- Reports ----------
let allRecords = [];

function renderReports() {
  const fName = $('spfName')?.value.trim().toLowerCase() || '';
  const fId   = $('spfId')?.value.trim().toLowerCase() || '';
  const fCat  = $('spfCategory')?.value || '';
  const fRat  = $('spfRating')?.value || '';

  const rows = allRecords.filter(r =>
    (!fName || (r.supplierName || '').toLowerCase().includes(fName))
    && (!fId || (r.supplierId || '').toLowerCase().includes(fId))
    && (!fCat || r.category === fCat)
    && (!fRat || (r.rating || '').startsWith(fRat))
  );

  const tbody = document.querySelector('#spResultsTable tbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#6b7280;padding:16px;">No records</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb;">${r.supplierId || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${r.supplierName || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${r.category || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${r.department || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${r.evaluator || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${r.evaluationDate || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${(r.averageScore ?? 0).toFixed ? r.averageScore.toFixed(2) : r.averageScore}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;">${r.rating || ''}</td>
      <td style="padding:8px;border:1px solid #e5e7eb;white-space:nowrap;">
        <button data-sp-edit="${r.id}" style="background:#1f3a8a;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;">Edit</button>
        <button data-sp-del="${r.id}"  style="background:#dc2626;color:#fff;border:0;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;margin-left:4px;">Delete</button>
      </td>
    </tr>`).join('');
}

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-sp-edit]');
  if (ed) {
    const r = allRecords.find(x => x.id === ed.dataset.spEdit);
    if (r) loadForEdit(r);
    return;
  }
  const del = e.target.closest('[data-sp-del]');
  if (del) {
    if (!confirm('Delete this supplier evaluation?')) return;
    try {
      await deleteDoc(doc(db, COL, del.dataset.spDel));
      toast('Record deleted');
    } catch (err) {
      console.error(err);
      const detail = err.code === 'permission-denied'
        ? 'Only admins can delete records.'
        : (err.message || err.code);
      toast('Delete failed: ' + detail);
    }
  }
});

['spfName','spfId','spfCategory','spfRating'].forEach(id => {
  $(id)?.addEventListener('input', renderReports);
  $(id)?.addEventListener('change', renderReports);
});
$('spClearBtn')?.addEventListener('click', () => {
  ['spfName','spfId'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  ['spfCategory','spfRating'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  renderReports();
});

$('spExportXlsx')?.addEventListener('click', () => {
  if (!window.XLSX) return toast('Excel library not loaded');
  const rows = allRecords.map(r => ({
    'Supplier ID': r.supplierId || '',
    'Supplier Name': r.supplierName || '',
    'Category': r.category || '',
    'Department': r.department || '',
    'Evaluator': r.evaluator || '',
    'Date': r.evaluationDate || '',
    'Quality':       r.scores?.quality       ?? '',
    'Delivery':      r.scores?.delivery      ?? '',
    'Compliance':    r.scores?.compliance    ?? '',
    'Communication': r.scores?.communication ?? '',
    'Cost':          r.scores?.cost          ?? '',
    'Total': r.totalScore ?? '',
    'Average': r.averageScore ?? '',
    'Rating': r.rating || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  XLSX.writeFile(wb, 'supplier_evaluations.xlsx');
});

try {
  onSnapshot(query(collection(db, COL), orderBy('createdAt', 'desc')), (snap) => {
    allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderReports();
  }, (err) => {
    console.warn('supplier onSnapshot:', err.message);
    if (err.code === 'permission-denied') {
      toast('Supplier reports need the updated firestore.rules to be deployed.');
    }
  });
} catch (e) { console.warn(e); }

// initial
updateOverall();
