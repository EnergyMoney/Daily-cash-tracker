const STORAGE_KEY = "moneyTracker_data";
const PREMIUM_KEY = "moneyTracker_premium";

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let premium = JSON.parse(localStorage.getItem(PREMIUM_KEY) || "{}");

const $ = id => document.getElementById(id);
const app = $(".app");
const splash = $("#splash");
const premiumPopup = $("#premiumPopup");

// Show app after splash
setTimeout(() => {
  splash.classList.add("hidden");
  app.classList.remove("hidden");
}, 4000);

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatMoney(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function checkPremium() {
  if (!premium.expiry) return false;
  return new Date() < new Date(premium.expiry);
}

function checkLimit() {
  if (checkPremium()) return true;
  const month = new Date().getMonth();
  const thisMonth = entries.filter(e => new Date(e.ts).getMonth() === month);
  return thisMonth.length < 100;
}

// Add Entry
$("#addBtn").addEventListener("click", () => {
  if (!checkLimit()) return alert("Monthly limit reached! Upgrade to premium.");
  const amount = Number($("#amount").value);
  const desc = $("#description").value;
  const type = $("#type").value;
  const category = $("#category").value;
  if (!amount || !desc) return alert("Enter amount & description");
  entries.push({ amount, desc, type, category, ts: Date.now() });
  save();
  updateAll();
  $("#amount").value = ""; $("#description").value = "";
});

$("#clearBtn").addEventListener("click", () => {
  if (confirm("Clear all entries?")) {
    entries = []; save(); updateAll();
  }
});

function updateAll() {
  const hist = $("#historyList");
  hist.innerHTML = "";
  let income = 0, expense = 0;
  entries.slice().reverse().forEach(e => {
    const div = document.createElement("div");
    div.textContent = `${new Date(e.ts).toLocaleDateString()} — ${e.desc} (${e.category}) : ${formatMoney(e.amount)} ${e.type}`;
    hist.appendChild(div);
    if (e.type === "income") income += e.amount; else expense += e.amount;
  });
  $("#balance").innerText = formatMoney(income - expense);
  $("#incExp").innerText = `${formatMoney(income)} / ${formatMoney(expense)}`;
}

// Premium buttons
$("#premiumBtn").addEventListener("click", ()=> premiumPopup.classList.remove("hidden"));
$("#closePopup").addEventListener("click", ()=> premiumPopup.classList.add("hidden"));

// Plan selection
document.querySelectorAll(".plan").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const plan = btn.dataset.plan;
    const expiry = new Date();
    if(plan==="1m") expiry.setMonth(expiry.getMonth()+1);
    if(plan==="3y") expiry.setFullYear(expiry.getFullYear()+3);
    premium = {active:true, expiry};
    localStorage.setItem(PREMIUM_KEY, JSON.stringify(premium));
    alert("Premium activated till " + expiry.toDateString());
    premiumPopup.classList.add("hidden");
  });
});

// Backup & Restore
$("#backupBtn").addEventListener("click", ()=>{
  const blob = new Blob([JSON.stringify(entries)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "money_backup.json"; a.click();
});

$("#restoreBtn").addEventListener("click", ()=>{
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = e=>{
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev=>{
      entries = JSON.parse(ev.target.result);
      save(); updateAll();
    };
    reader.readAsText(file);
  };
  input.click();
});

// init
updateAll();
