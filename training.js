// training.js — Training & Competency Assessment module
import {
  db, auth,
  collection, doc, setDoc, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy
} from "./firebase.js";

const COLLECTION = "training_records";

const $ = id => document.getElementById(id);
const escHtml = s => String(s ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

let completed = [];
let missing = [];
let records = [];
let chart = null;
let unsub = null;

function renderChips(targetId, arr, onRemove){
  const el = $(targetId);
  el.innerHTML = arr.map((v,i)=>`
    <span class="chip">${escHtml(v)}<button type="button" data-i="${i}" aria-label="remove">×</button></span>
  `).join("");
  el.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click",()=>{ onRemove(Number(b.dataset.i)); });
  });
}

function rerenderChips(chipsId, getArr, setArr){
  renderChips(chipsId, getArr(), (i)=>{
    const a = getArr(); a.splice(i,1); setArr(a);
    rerenderChips(chipsId, getArr, setArr);
  });
}

function wireChipInput(inputId, addBtnId, chipsId, getArr, setArr){
  const input = $(inputId);
  const add = () => {
    const v = (input.value || "").trim();
    if(!v) return;
    const arr = getArr();
    if(!arr.includes(v)) arr.push(v);
    setArr(arr);
    input.value = "";
    rerenderChips(chipsId, getArr, setArr);
  };
  $(addBtnId).addEventListener("click", add);
  input.addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); add(); } });
}

function renderBreakdown(){
  const body = $("tBreakdownBody");
  if(!body) return;
  if(!records.length){
    body.innerHTML = `<tr><td colspan="5" class="empty">No training records yet.</td></tr>`;
    return;
  }
  body.innerHTML = records.map(r => `
    <tr>
      <td>${escHtml(r.employeeId)}</td>
      <td>${escHtml(r.employeeName)}</td>
      <td>${escHtml(r.department || "")}</td>
      <td>${(r.completed||[]).length}</td>
      <td>${(r.missing||[]).length}</td>
    </tr>
  `).join("");
}

function renderChart(){
  const canvas = $("chartTrainingCompliance");
  if(!canvas || typeof Chart === "undefined") return;
  let completedTotal = 0, missingTotal = 0;
  records.forEach(r => {
    completedTotal += (r.completed||[]).length;
    missingTotal  += (r.missing  ||[]).length;
  });
  const total = completedTotal + missingTotal;
  const data = total === 0 ? [1,0] : [completedTotal, missingTotal];

  if(chart) chart.destroy();
  chart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: ["Completed Trainings", "Missing Trainings"],
      datasets: [{
        data,
        backgroundColor: ["#86c34a", "#56a8d6"],
        borderColor: "#fff",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed;
              const pct = total === 0 ? 0 : Math.round(v*100/total);
              return ` ${ctx.label}: ${v} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function subscribe(){
  if(unsub) return;
  try{
    const q = query(collection(db, COLLECTION), orderBy("createdAt","desc"));
    unsub = onSnapshot(q, snap => {
      records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderBreakdown();
      renderChart();
    }, err => {
      // fallback without order (older docs may lack createdAt)
      console.warn("training onSnapshot ordered failed, fallback:", err?.message);
      unsub = onSnapshot(collection(db, COLLECTION), snap => {
        records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderBreakdown();
        renderChart();
      });
    });
  }catch(e){
    console.error("training subscribe error", e);
  }
}

function init(){
  if($("trainingForm")?._wired) return;
  const form = $("trainingForm");
  if(!form) return;
  form._wired = true;

  wireChipInput("tCompletedInput","tCompletedAdd","tCompletedChips",
    ()=>completed, a=>{completed=a;});
  wireChipInput("tMissingInput","tMissingAdd","tMissingChips",
    ()=>missing, a=>{missing=a;});

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = $("tFormMsg");
    const rec = {
      employeeName: $("tEmpName").value.trim(),
      employeeId:   $("tEmpId").value.trim(),
      department:   $("tDept").value.trim(),
      position:     $("tPos").value.trim(),
      completed:    [...completed],
      missing:      [...missing],
      createdBy:    auth.currentUser?.email || "",
      createdAt:    serverTimestamp()
    };
    if(!rec.employeeName || !rec.employeeId){
      msg.style.color = "#b91c1c";
      msg.textContent = "Employee Name and Employee ID are required.";
      return;
    }
    try{
      msg.style.color = "#1f3a8a";
      msg.textContent = "Saving…";
      await addDoc(collection(db, COLLECTION), rec);
      form.reset();
      completed = []; missing = [];
      rerenderChips("tCompletedChips", ()=>completed, a=>{completed=a;});
      rerenderChips("tMissingChips",   ()=>missing,   a=>{missing=a;});
      msg.style.color = "#16a34a";
      msg.textContent = "Saved.";
      setTimeout(()=>{ msg.textContent = ""; }, 2500);
    }catch(err){
      console.error(err);
      msg.style.color = "#b91c1c";
      msg.textContent = "Save failed: " + (err?.message || err);
    }
  });
}

// Wire on DOM ready + when Training tab opens
function onTabClick(){
  document.querySelectorAll('.tab[data-tab="training"]').forEach(t => {
    t.addEventListener("click", () => { init(); subscribe(); });
  });
  document.querySelectorAll('.home-tile[data-go="training"]').forEach(t => {
    t.addEventListener("click", () => { init(); subscribe(); });
  });
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", () => { init(); onTabClick(); subscribe(); });
} else {
  init(); onTabClick(); subscribe();
}
