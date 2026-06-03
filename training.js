// training.js — Training & Competency module (Add Record + Reports)
import { db } from './firebase.js';
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COL = 'training_records';
const $ = (id) => document.getElementById(id);
const toast = (msg) => {
  const t = $('toast');
  if (!t) { alert(msg); return; }
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
};

// ---------- Home tile -> Training tab ----------
document.addEventListener('click', (e) => {
  const tile = e.target.closest('.home-tile[data-go="training"]');
  if (tile) {
    const t = document.querySelector('.tab[data-tab="training"]');
    if (t) t.click();
  }
});

// ---------- Sub-tab switching inside Training ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#training .tr-subtab');
  if (!btn) return;
  document.querySelectorAll('#training .tr-subtab').forEach(b => {
    b.classList.remove('active');
    b.style.borderBottom = '3px solid transparent';
    b.style.color = '#6b7280';
  });
  btn.classList.add('active');
  btn.style.borderBottom = '3px solid #1f3a8a';
  btn.style.color = '#1f3a8a';
  document.querySelectorAll('#training .tr-panel').forEach(p => p.style.display = 'none');
  const target = $(btn.dataset.subtab);
  if (target) target.style.display = 'block';
});

// ---------- Chip inputs ----------
let completed = [];
let missing = [];
const renderChips = (arr, containerId, color) => {
  const wrap = $(containerId); if (!wrap) return;
  wrap.innerHTML = '';
  arr.forEach((v, i) => {
    const chip = document.createElement('span');
    chip.style.cssText = `background:${color};color:#fff;padding:4px 10px;border-radius:14px;font-size:13px;display:inline-flex;align-items:center;gap:6px;`;
    chip.innerHTML = `${v} <span style="cursor:pointer;font-weight:700;">×</span>`;
    chip.querySelector('span').onclick = () => { arr.splice(i, 1); renderChips(arr, containerId, color); };
    wrap.appendChild(chip);
  });
};
const wireChip = (inputId, btnId, arr, chipsId, color) => {
  const btn = $(btnId), inp = $(inputId);
  if (!btn || !inp) return;
  const add = () => {
    const v = inp.value.trim(); if (!v) return;
    arr.push(v); inp.value = ''; renderChips(arr, chipsId, color);
  };
  btn.onclick = add;
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
};
wireChip('trCompletedInput', 'trAddCompleted', completed, 'trCompletedChips', '#16a34a');
wireChip('trMissingInput', 'trAddMissing', missing, 'trMissingChips', '#dc2626');

// ---------- Save record ----------
const form = $('trainingForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const empName = $('trEmpName').value.trim();
    const empId = $('trEmpId').value.trim();
    if (!empName || !empId) { toast('Employee Name and ID are required'); return; }
    if (completed.length === 0 && missing.length === 0) {
      toast('Add at least one training (completed or missing)'); return;
    }
    const rec = {
      employeeName: empName,
      employeeId: empId,
      department: $('trDept').value.trim(),
      position: $('trPosition').value.trim(),
      completedTrainings: [...completed],
      missingTrainings: [...missing],
      createdAt: serverTimestamp(),
      createdBy: (window.__session?.email || null),
    };
    try {
      await addDoc(collection(db, COL), rec);
      toast('Training record saved');
      form.reset();
      completed.length = 0; missing.length = 0;
      renderChips(completed, 'trCompletedChips', '#16a34a');
      renderChips(missing, 'trMissingChips', '#dc2626');
    } catch (err) {
      console.error(err);
      const detail = err.code === 'permission-denied'
        ? 'Permission denied. Deploy the updated firestore.rules and make sure this login is approved.'
        : (err.message || err.code);
      toast('Save failed: ' + detail);
    }
  });
}

// ---------- Reports: live data + filters + chart ----------
let allRecords = [];
let complianceChart = null;

const matches = (val, q) => !q || (val || '').toString().toLowerCase().includes(q.toLowerCase());

const renderReports = () => {
  const fId = $('fEmpId')?.value.trim() || '';
  const fName = $('fEmpName')?.value.trim() || '';
  const fDept = $('fDept')?.value.trim() || '';
  const fComp = $('fCompleted')?.value.trim() || '';
  const fMiss = $('fMissing')?.value.trim() || '';

  const rows = allRecords.filter(r => {
    const compStr = (r.completedTrainings || []).join(', ');
    const missStr = (r.missingTrainings || []).join(', ');
    return matches(r.employeeId, fId)
      && matches(r.employeeName, fName)
      && matches(r.department, fDept)
      && matches(compStr, fComp)
      && matches(missStr, fMiss);
  });

  const tbody = document.querySelector('#trResultsTable tbody');
  if (tbody) {
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:16px;">No records</td></tr>';
    } else {
      tbody.innerHTML = rows.map(r => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${r.employeeId || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${r.employeeName || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${r.department || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${(r.completedTrainings || []).join(', ')}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${(r.missingTrainings || []).join(', ')}</td>
        </tr>`).join('');
    }
  }

  // Chart: aggregate compliance from filtered rows
  const totalCompleted = rows.reduce((s, r) => s + (r.completedTrainings?.length || 0), 0);
  const totalMissing = rows.reduce((s, r) => s + (r.missingTrainings?.length || 0), 0);
  const ctx = $('trComplianceChart');
  if (ctx && window.Chart) {
    if (complianceChart) complianceChart.destroy();
    complianceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Completed Trainings', 'Missing Trainings'],
        datasets: [{
          data: [totalCompleted, totalMissing],
          backgroundColor: ['#7CB342', '#42A5F5'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = totalCompleted + totalMissing;
                const pct = total ? Math.round(ctx.parsed / total * 100) : 0;
                return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
};

// Search / clear / live updates
$('trSearchBtn')?.addEventListener('click', renderReports);
$('trClearBtn')?.addEventListener('click', () => {
  ['fEmpId', 'fEmpName', 'fDept', 'fCompleted', 'fMissing'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  renderReports();
});
['fEmpId', 'fEmpName', 'fDept', 'fCompleted', 'fMissing'].forEach(id => {
  $(id)?.addEventListener('input', renderReports);
});

try {
  onSnapshot(query(collection(db, COL), orderBy('createdAt', 'desc')), (snap) => {
    allRecords = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderReports();
  }, (err) => {
    console.warn('training onSnapshot:', err.message);
    if (err.code === 'permission-denied') {
      toast('Training reports need the updated firestore.rules to be deployed.');
    }
  });
} catch (e) { console.warn(e); }

// ---------- Export ----------
$('trExportXlsx')?.addEventListener('click', () => {
  if (!window.XLSX) return toast('Excel library not loaded');
  const rows = allRecords.map(r => ({
    'Employee ID': r.employeeId || '',
    'Employee Name': r.employeeName || '',
    'Department': r.department || '',
    'Position': r.position || '',
    'Completed Trainings': (r.completedTrainings || []).join('; '),
    'Missing Trainings': (r.missingTrainings || []).join('; '),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Training');
  XLSX.writeFile(wb, 'training_records.xlsx');
});
