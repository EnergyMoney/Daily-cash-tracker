/* Ultimate Daily Cash Tracker - client-side only (localStorage) */
/* Currency: ₹, Fixed categories included */

const STORAGE_KEY = "dailyCash_v1";
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

const $ = id => document.getElementById(id);
const typeEl = $("type");
const amountEl = $("amount");
const categoryEl = $("category");
const descEl = $("description");
const addBtn = $("addBtn");
const clearBtn = $("clearBtn");
const historyList = $("historyList");
const balanceEl = $("balance");
const todayTotalEl = $("todayTotal");
const monthTotalEl = $("monthTotal");
const incExpEl = $("incExp");
const monthlyReportEl = $("monthlyReport");

let catChart; // Chart.js instance

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatMoney(n){ return "₹" + Number(n).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits:2}); }

// Render functions
function renderList(){
  historyList.innerHTML = "";
  // newest first
  const list = [...entries].reverse();
  list.forEach(item => {
    const el = document.createElement("div");
    el.className = "item";
    const left = document.createElement("div"); left.className = "left";
    const chip = document.createElement("div"); chip.className = "chip"; chip.innerText = item.type === "income" ? "Income" : "Expense";
    const desc = document.createElement("div"); desc.className = "desc"; desc.innerText = `${item.desc} — ${item.category}`;
    const meta = document.createElement("div"); meta.className = "meta"; meta.innerText = `${new Date(item.ts).toLocaleString()} • ${formatMoney(item.amount)}`;
    left.appendChild(chip); left.appendChild(desc); left.appendChild(meta);

    const controls = document.createElement("div"); controls.className = "controls";
    const editBtn = document.createElement("button"); editBtn.className="icon-btn"; editBtn.innerText="Edit";
    const delBtn = document.createElement("button"); delBtn.className="icon-btn"; delBtn.innerText="Delete";

    // delete
    delBtn.addEventListener("click", ()=> {
      if(confirm("Delete this entry?")){
        // remove first match by ts
        const idx = entries.findIndex(e => e.ts === item.ts);
        if(idx > -1) { entries.splice(idx,1); save(); updateAll(); }
      }
    });

    editBtn.addEventListener("click", ()=> {
      // populate form for editing; use ts as id
      amountEl.value = item.amount;
      descEl.value = item.desc;
      categoryEl.value = item.category;
      typeEl.value = item.type;
      // remove existing entry; will be re-added on Add (simpler)
      const idx = entries.findIndex(e => e.ts === item.ts);
      if(idx > -1) { entries.splice(idx,1); save(); updateAll(); }
      window.scrollTo({top:0, behavior:"smooth"});
    });

    controls.appendChild(editBtn); controls.appendChild(delBtn);
    el.appendChild(left); el.appendChild(controls);
    historyList.appendChild(el);
  });
}

// Summaries
function computeSummary(){
  const now = new Date();
  const today = now.toDateString();
  let todayTotal = 0, monthTotal = 0, incomeTotal = 0, expenseTotal = 0;
  const monthIdx = now.getMonth(), yearIdx = now.getFullYear();

  entries.forEach(e => {
    const d = new Date(e.ts);
    const amt = Number(e.amount);
    if(e.type === "income") incomeTotal += amt; else expenseTotal += amt;
    if(d.toDateString() === today){
      todayTotal += (e.type === "expense" ? -amt : amt);
    }
    if(d.getMonth() === monthIdx && d.getFullYear() === yearIdx){
      monthTotal += (e.type === "expense" ? -amt : amt);
    }
  });

  balanceEl.innerText = formatMoney(incomeTotal - expenseTotal);
  todayTotalEl.innerText = formatMoney(todayTotal);
  monthTotalEl.innerText = formatMoney(monthTotal);
  incExpEl.innerText = `${formatMoney(incomeTotal)} / ${formatMoney(expenseTotal)}`;
}

// Reports: category breakdown for current month
function buildCategoryData(){
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();
  const cats = {};
  const categories = ["Food","Transport","Shopping","Bills","Health","EMI","Salary","Others"];
  categories.forEach(c => cats[c]=0);

  entries.forEach(e => {
    const d = new Date(e.ts);
    if(d.getMonth() === m && d.getFullYear() === y){
      // For chart, show expenses only (positive amounts)
      const val = Number(e.amount);
      if(e.type === "expense"){
        cats[e.category] = (cats[e.category] || 0) + val;
      }
    }
  });
  return {categories:Object.keys(cats), values:Object.values(cats)};
}

function renderChart(){
  const ctx = document.getElementById('catChart').getContext('2d');
  const data = buildCategoryData();
  if(catChart) catChart.destroy();
  catChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.categories,
      datasets: [{ data: data.values }]
    },
    options: {
      plugins:{legend:{position:'bottom'}},
      maintainAspectRatio:false
    }
  });
}

function buildMonthlyReport(){
  // simple aggregation per month (last 6 months)
  const months = [];
  const totals = [];
  const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.toLocaleString('default',{month:'short', year:'numeric'}));
    totals.push(0);
  }
  entries.forEach(e => {
    const d = new Date(e.ts);
    const label = d.toLocaleString('default',{month:'short', year:'numeric'});
    const idx = months.indexOf(label);
    if(idx>-1){
      totals[idx] += (e.type === "expense" ? -Number(e.amount) : Number(e.amount));
    }
  });
  // render table
  let html = "<table style='width:100%'><thead><tr><th>Month</th><th>Total (₹)</th></tr></thead><tbody>";
  months.forEach((m,i)=> html += `<tr><td>${m}</td><td>${formatMoney(totals[i])}</td></tr>`);
  html += "</tbody></table>";
  monthlyReportEl.innerHTML = html;
}

// Main update
function updateAll(){
  renderList();
  computeSummary();
  renderChart();
  buildMonthlyReport();
}

addBtn.addEventListener("click", () => {
  const amt = amountEl.value.trim();
  const desc = descEl.value.trim();
  const cat = categoryEl.value;
  const type = typeEl.value;
  if(!amt || isNaN(amt)) { alert("Please enter a valid amount"); return; }
  if(!desc){ alert("Please add description"); return; }
  entries.push({ amount: Number(amt), desc, category: cat, type, ts: Date.now() });
  save();
  updateAll();
  amountEl.value=""; descEl.value="";
});

clearBtn.addEventListener("click", () => {
  if(confirm("Clear all entries? This cannot be undone.")){
    entries = []; save(); updateAll();
  }
});

// init
updateAll();
