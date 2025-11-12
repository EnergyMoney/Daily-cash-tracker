/* Money Tracker - premium + backup + expiry + admin WhatsApp notify */
// admin WhatsApp
const ADMIN_WH = "9544599733"; // admin number

// storage keys
const KEY_ENTRIES = "mt_entries_v1";
const KEY_USERS = "mt_users_v1"; // object map phone -> {premium, expiry, phone}
const KEY_CURRENT = "mt_current_phone";

// initial load
let entries = JSON.parse(localStorage.getItem(KEY_ENTRIES) || "[]");
let users = JSON.parse(localStorage.getItem(KEY_USERS) || "{}");
let currentPhone = localStorage.getItem(KEY_CURRENT) || null;

// DOM
const splash = document.getElementById("splash");
const app = document.getElementById("app");
const badge = document.getElementById("badge");
const identifyPhone = document.getElementById("userPhone");
const btnIdentify = document.getElementById("btnIdentify");
const mainUI = document.getElementById("mainUI");

const typeSel = document.getElementById("type");
const amountEl = document.getElementById("amount");
const descEl = document.getElementById("description");
const payMethodEl = document.getElementById("paymentMethod");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const listEl = document.getElementById("list");

const entryCountEl = document.getElementById("entryCount");
const todayTotalEl = document.getElementById("todayTotal");
const monthTotalEl = document.getElementById("monthTotal");
const incExpEl = document.getElementById("incExp");
const balanceEl = document.getElementById("balance") || document.createElement("div"); // optional

const exportExcelBtn = document.getElementById("exportExcel");
const exportPDFBtn = document.getElementById("exportPDF");
const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const restoreInput = document.getElementById("restoreInput");
const upgradeOpen = document.getElementById("upgradeOpen");

// premium modal
const premiumModal = document.getElementById("premiumModal");
const qrImg = document.getElementById("qrImg");
const payPhone = document.getElementById("payPhone");
const planSelect = document.getElementById("planSelect");
const iPaidBtn = document.getElementById("iPaidBtn");
const closePremium = document.getElementById("closePremium");

// utility
function saveEntries(){ localStorage.setItem(KEY_ENTRIES, JSON.stringify(entries)); }
function saveUsers(){ localStorage.setItem(KEY_USERS, JSON.stringify(users)); }
function setCurrentPhone(p){ currentPhone = p; localStorage.setItem(KEY_CURRENT, p); }

function isAdminPhone(p){ return p === "9999"; }

function isPremiumFor(phone){
  if(!phone) return false;
  const u = users[phone];
  if(!u) return false;
  const now = Date.now();
  if(u.expiry && now <= u.expiry) return true;
  // expired -> ensure flag off
  if(u.expiry && now > u.expiry){ u.premium = false; saveUsers(); return false; }
  return !!u.premium;
}

// UI update
function updateBadge(){
  if(isAdminPhone(currentPhone)){
    badge.textContent = "ADMIN";
    badge.className = "badge";
    badge.style.background = "#222"; badge.style.color = "#fff";
  } else if(isPremiumFor(currentPhone)){
    badge.textContent = "PREMIUM";
    badge.className = "badge";
    badge.style.background = "#ffd700"; badge.style.color = "#000";
  } else {
    badge.textContent = "FREE";
    badge.className = "badge";
    badge.style.background = "#fff3cd"; badge.style.color = "#856404";
  }
}

function formatMoney(n){ return "₹" + Number(n).toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2}); }

function updateList(){
  // render entries (newest first)
  listEl.innerHTML = "";
  const reversed = [...entries].reverse();
  reversed.forEach(entry => {
    const row = document.createElement("div");
    row.className = "entry-row";
    const left = document.createElement("div");
    left.innerHTML = `<div class="entry-meta">${entry.date} ${entry.time} • ${entry.desc} (${entry.method})</div>`;
    const right = document.createElement("div");
    right.innerHTML = `<div class="entry-amt">${entry.type==="income" ? "+" : "-"} ${formatMoney(entry.amount)}</div>`;
    // delete button (admin only or owner)
    const del = document.createElement("button");
    del.textContent = "Delete"; del.style.marginLeft="8px";
    del.addEventListener("click", ()=>{
      if(confirm("Delete this entry?")){
        const idx = entries.findIndex(e=> e.id===entry.id);
        if(idx>-1){ entries.splice(idx,1); saveEntries(); updateAll(); }
      }
    });
    right.appendChild(del);
    row.appendChild(left); row.appendChild(right);
    listEl.appendChild(row);
  });
}

function computeSummary(){
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const monthIdx = now.getMonth(), yearIdx = now.getFullYear();
  let todayTotal=0, monthTotal=0, income=0, expense=0;
  entries.forEach(e=>{
    const amt = Number(e.amount);
    if(e.type==="income"){ income += amt; } else { expense += amt; }
    if(e.date === todayStr) todayTotal += (e.type==="expense"? -amt: amt);
    const d = new Date(e.fullTs);
    if(d.getMonth()===monthIdx && d.getFullYear()===yearIdx) monthTotal += (e.type==="expense"? -amt: amt);
  });
  document.getElementById("todayTotal").textContent = formatMoney(todayTotal);
  document.getElementById("monthTotal").textContent = formatMoney(monthTotal);
  document.getElementById("incExp").textContent = `${formatMoney(income)} / ${formatMoney(expense)}`;
  // optional balance
  if(balanceEl) balanceEl.textContent = formatMoney(income - expense);
  // entry count this month
  const monthPrefix = new Date().toISOString().slice(0,7);
  const thisMonthEntries = entries.filter(e => e.fullTs.toString().startsWith(monthPrefix));
  document.getElementById("entryCount").textContent = thisMonthEntries.length;
}

// add entry
function addEntry(){
  // free limit check
  if(!isPremiumFor(currentPhone) && !isAdminPhone(currentPhone)){
    // calc entries this month
    const monthPrefix = new Date().toISOString().slice(0,7);
    const thisMonthEntries = entries.filter(e => e.fullTs.toString().startsWith(monthPrefix));
    if(thisMonthEntries.length >= 100){ alert("Free monthly limit 100 reached. Upgrade to Premium."); return; }
  }

  const amt = parseFloat(amountEl.value);
  const desc = descEl.value.trim();
  const method = payMethodEl.value;
  const ttype = typeSel.value;
  if(!amt || !desc || !method){ alert("Please fill all fields."); return; }

  const now = new Date();
  const entry = {
    id: Date.now() + Math.random().toString(36).slice(2,7),
    amount: amt,
    desc: desc,
    method: method,
    type: ttype,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    fullTs: now.toISOString()
  };
  // backup before change
  autoBackup();
  entries.push(entry);
  saveEntries();
  updateAll();
  // clear
  amountEl.value = ""; descEl.value = ""; payMethodEl.selectedIndex = 0;
}

// clear all
function clearAll(){
  if(confirm("Clear ALL entries? This will backup first.")){
    autoBackup();
    entries = [];
    saveEntries();
    updateAll();
  }
}

// export CSV (premium/admin only)
function exportCSV(){
  if(!(isPremiumFor(currentPhone) || isAdminPhone(currentPhone))){ return alert("Export available for Premium only."); }
  let csv = "Date,Time,Type,Amount,Description,Method\n";
  entries.forEach(e => csv += `${e.date},${e.time},${e.type},${e.amount},"${e.desc}",${e.method}\n`);
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "moneytracker.csv"; a.click();
}

// export PDF simple print
function exportPDF(){
  if(!(isPremiumFor(currentPhone) || isAdminPhone(currentPhone))){ return alert("Export available for Premium only."); }
  const win = window.open("", "_blank", "width=800,height=900");
  win.document.write("<h2>Money Tracker - Monthly Report</h2>");
  win.document.write("<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><tr><th>Date</th><th>Time</th><th>Type</th><th>Amount</th><th>Description</th><th>Method</th></tr>");
  entries.forEach(e => win.document.write(`<tr><td>${e.date}</td><td>${e.time}</td><td>${e.type}</td><td>₹${e.amount}</td><td>${e.desc}</td><td>${e.method}</td></tr>`));
  win.document.write("</table>");
  win.print();
}

// backup download
function downloadBackup(){
  const payload = {
    entries, users, ts: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mt_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

// restore (file input)
function restoreFromFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(data.entries) entries = data.entries;
      if(data.users) users = data.users;
      saveEntries(); saveUsers();
      updateAll();
      alert("✅ Backup restored.");
    }catch(err){ alert("Invalid backup file."); }
  };
  reader.readAsText(file);
}

// auto backup (save previous snapshot) — store lastBackup in localStorage
function autoBackup(){
  const snapshot = { entries, users, ts: new Date().toISOString() };
  localStorage.setItem("mt_last_backup", JSON.stringify(snapshot));
}

// notify admin via WhatsApp pre-filled message
function notifyAdminWhatsApp(phonePaid, plan){
  // create message
  const msg = `Payment received (may be). Payer: ${phonePaid} | Plan: ₹${plan} | App: Money Tracker. Please verify and unlock.`;
  const url = `https://wa.me/${ADMIN_WH}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
  alert("WhatsApp opened. Send message to admin. After admin confirms, press 'Unlock Premium' button (or admin will mark it).");
}

// activate premium for phone (months param)
function activatePremiumFor(phone, months){
  if(!phone) return;
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  users[phone] = { phone, premium: true, expiry: expiry.getTime() };
  saveUsers();
  if(currentPhone === phone) updateBadge();
  alert(`Premium active for ${phone} until ${expiry.toDateString()}`);
}

// open premium modal prepare QR
function openPremiumModal(){
  // create UPI QR via API (simple)
  const upi = encodeURIComponent(`upi://pay?pa=visakhsivaji95-4@okhdfcbank&pn=Visakh%20S&cu=INR`);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${upi}`;
  qrImg.src = src;
  premiumModal.classList.remove("hidden");
}

// close premium modal
function closePremiumModal(){ premiumModal.classList.add("hidden"); }

// identify / login handler
btnIdentify.addEventListener("click", ()=>{
  const p = identifyPhone.value.trim();
  if(!p) return alert("Enter phone or 9999 for admin");
  setCurrentPhone(p);
  // create user record if not exist
  if(!users[p]){ users[p] = { phone:p, premium:false, expiry:0 }; saveUsers(); }
  // admin special
  if(isAdminPhone(p)){ alert("Admin mode enabled"); }
  // show main UI
  document.querySelector(".identify").classList.add("hidden");
  mainUI.classList.remove("hidden");
  updateBadge(); updateAll();
});

// add entry
addBtn.addEventListener("click", addEntry);
clearBtn.addEventListener("click", clearAll);

// export / backup / restore
exportExcelBtn.addEventListener("click", exportCSV);
exportPDFBtn.addEventListener("click", exportPDF);
backupBtn.addEventListener("click", downloadBackup);
restoreBtn.addEventListener("click", ()=> restoreInput.click());
restoreInput.addEventListener("change", (ev)=> {
  const f = ev.target.files[0]; if(f) restoreFromFile(f);
});

// premium modal buttons
upgradeOpen.addEventListener("click", openPremiumModal);
closePremium.addEventListener("click", closePremiumModal);
iPaidBtn.addEventListener("click", ()=>{
  const payer = payPhone.value.trim();
  const plan = planSelect.value;
  if(!payer) return alert("Enter phone used to pay");
  // notify admin via WhatsApp
  notifyAdminWhatsApp(payer, plan);
  // As a convenience, activate premium locally (trial) — admin should verify ideally
  // If plan == 29 -> 1 month, 299 -> 36 months
  const months = plan === "29" ? 1 : 36;
  activatePremiumFor(payer, months);
  // if current user is same phone, update UI
  if(currentPhone === payer) updateBadge();
  closePremiumModal();
});

// update all UI
function updateAll(){
  updateList(); computeSummary(); updateBadge();
}

// splash hide
setTimeout(()=>{ if(splash) splash.style.display="none"; document.getElementById("app").classList.remove("hidden"); }, 2200);

// initial UI show if currentPhone exists
if(currentPhone){
  document.querySelector(".identify").classList.add("hidden");
  mainUI.classList.remove("hidden");
  updateBadge(); updateAll();
}

// helper to set currentPhone
function setCurrentPhone(p){ currentPhone = p; localStorage.setItem(KEY_CURRENT, p); }
