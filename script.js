/* script.js - final stable version */
/* Features:
   - local-only data (localStorage)
   - premium via UPI QR (I Paid -> notify admin via WhatsApp)
   - admin panel to approve pending payments, set/change admin password
   - backup/download/restore JSON
   - export CSV / print PDF for premium or admin
   - daily/monthly summary, grand total, per-user monthly limit (100 free)
*/

// ----- Config -----
const ADMIN_WH = "919544599733"; // admin WhatsApp (country code no plus)
const UPI_ID = "visakhsivaji95-4@okhdfcbank";

// ----- Storage Keys -----
const KEY_ENTRIES = "mt_entries_v3";
const KEY_USERS = "mt_users_v3";
const KEY_PENDING = "mt_pending_v3";
const KEY_ADMIN  = "mt_admin_v3";   // base64 stored
const KEY_CURRENT = "mt_current_v3";
const KEY_SNAPSHOT = "mt_snapshot_v3";

// ----- App State -----
let entries = JSON.parse(localStorage.getItem(KEY_ENTRIES) || "[]");
let users   = JSON.parse(localStorage.getItem(KEY_USERS) || "{}");
let pending = JSON.parse(localStorage.getItem(KEY_PENDING) || "[]");
let adminHash = localStorage.getItem(KEY_ADMIN) || null;
let currentPhone = localStorage.getItem(KEY_CURRENT) || null;

// ----- DOM -----
const splash = document.getElementById("splash");
const app = document.getElementById("app");
const badge = document.getElementById("badge");
const phoneInput = document.getElementById("phoneInput");
const btnSetPhone = document.getElementById("btnSetPhone");
const identify = document.getElementById("identify");
const mainUI = document.getElementById("mainUI");

const typeSel = document.getElementById("type");
const amountEl = document.getElementById("amount");
const descEl = document.getElementById("description");
const payMethod = document.getElementById("paymentMethod");
const addBtn = document.getElementById("addBtn");
const listDiv = document.getElementById("list");

const entryCountEl = document.getElementById("entryCount");
const todayTotalEl = document.getElementById("todayTotal");
const monthTotalEl = document.getElementById("monthTotal");
const incExpEl = document.getElementById("incExp");
const balanceEl = document.getElementById("balance") || null;

const exportCsv = document.getElementById("exportCsv");
const exportPdf = document.getElementById("exportPdf");
const downloadBackup = document.getElementById("downloadBackup");
const restoreBackupBtn = document.getElementById("restoreBackupBtn");
const restoreInput = document.getElementById("restoreInput");
const openUpgrade = document.getElementById("openUpgrade");

const premiumModal = document.getElementById("premiumModal");
const qrImg = document.getElementById("qrImg");
const payerPhone = document.getElementById("payerPhone");
const planSelect = document.getElementById("planSelect");
const paidBtn = document.getElementById("paidBtn");
const closePremium = document.getElementById("closePremium");

const adminBtn = document.getElementById("adminBtn");
const adminModal = document.getElementById("adminModal");
const viewPendingBtn = document.getElementById("viewPending");
const pendingListDiv = document.getElementById("pendingList");
const approveBtn = document.getElementById("approveBtn");
const approveArea = document.getElementById("approveArea");
const approvePhone = document.getElementById("approvePhone");
const approvePlan = document.getElementById("approvePlan");
const doApprove = document.getElementById("doApprove");
const setPassBtn = document.getElementById("setPassBtn");
const setPassArea = document.getElementById("setPassArea");
const newPass = document.getElementById("newPass");
const savePass = document.getElementById("savePass");
const closeAdmin = document.getElementById("closeAdmin");

// ----- Utility -----
function persistAll(){
  localStorage.setItem(KEY_ENTRIES, JSON.stringify(entries));
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
  localStorage.setItem(KEY_PENDING, JSON.stringify(pending));
}
function formatMoney(n){
  return "₹" + Number(n).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function isAdminPasswordSet(){ return !!adminHash; }
function setAdminPassword(p){ adminHash = btoa(p); localStorage.setItem(KEY_ADMIN, adminHash); }
function verifyAdmin(pass){ return adminHash === btoa(pass); }
function setCurrentPhone(p){ currentPhone = p; localStorage.setItem(KEY_CURRENT, p); }

// ----- Splash -> show app -----
setTimeout(()=>{ splash && (splash.style.display="none"); app && (app.classList.remove("hidden")); }, 1800);

// ----- Identify / Continue -----
btnSetPhone.addEventListener("click", ()=>{
  const v = phoneInput.value.trim();
  if(!v){ alert("Enter phone or 'admin'"); return; }
  if(v.toLowerCase() === "admin"){
    // admin login flow
    openAdminPrompt();
    return;
  }
  setCurrentPhone(v);
  if(!users[v]) { users[v] = { premium:false, expiry:0 }; persistAll(); }
  identify.classList.add("hidden");
  mainUI.classList.remove("hidden");
  updateAll();
});

// ----- Admin flows -----
adminBtn.addEventListener("click", openAdminPrompt);
function openAdminPrompt(){
  if(!isAdminPasswordSet()){
    const p = prompt("Set admin password (store locally). Choose strong password:");
    if(p){ setAdminPassword(p); alert("Admin password set. Click Admin again to login."); }
    return;
  }
  const p = prompt("Enter admin password:");
  if(!p) return;
  if(!verifyAdmin(p)){ alert("Wrong password."); return; }
  // show admin modal
  adminModal.classList.remove("hidden");
  renderPending();
}
document.getElementById("closeAdmin").addEventListener("click", ()=> adminModal.classList.add("hidden"));

viewPendingBtn.addEventListener("click", renderPending);
function renderPending(){
  pendingListDiv.innerHTML = "";
  if(pending.length === 0){ pendingListDiv.innerHTML = "<div class='small muted'>No pending payments</div>"; return; }
  pending.forEach(p=>{
    const d = document.createElement("div");
    d.style.marginBottom = "8px";
    d.innerHTML = `<b>${p.phone}</b> • ₹${p.plan} • <small>${new Date(p.ts).toLocaleString()}</small>`;
    const btn = document.createElement("button"); btn.className="primary"; btn.textContent="Approve"; btn.style.marginLeft="8px";
    btn.addEventListener("click", ()=> doApproveFor(p.phone, p.plan));
    d.appendChild(btn);
    pendingListDiv.appendChild(d);
  });
}

// Approve payment manually
doApprove.addEventListener("click", ()=>{
  const ph = approvePhone.value.trim();
  const plan = approvePlan.value;
  if(!ph) return alert("Enter phone to approve");
  doApproveFor(ph, plan);
});
function doApproveFor(phone, plan){
  const months = plan === "29" ? 1 : 36;
  const expiry = new Date(); expiry.setMonth(expiry.getMonth() + months);
  users[phone] = users[phone] || {};
  users[phone].premium = true;
  users[phone].expiry = expiry.getTime();
  // remove from pending
  pending = pending.filter(x => x.phone !== phone);
  persistAll();
  updateAll();
  alert(`Premium activated for ${phone} until ${expiry.toDateString()}`);
  renderPending();
}

// Set/change admin password UI
setPassBtn.addEventListener("click", ()=> { setPassArea.classList.toggle("hidden"); approveArea.classList.add("hidden"); });
savePass.addEventListener("click", ()=> {
  const p = newPass.value.trim();
  if(!p) return alert("Enter new password");
  setAdminPassword(p);
  newPass.value = "";
  alert("Admin password updated.");
});

// ----- Premium modal -----
openUpgrade.addEventListener("click", ()=>{
  const upi = encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=Visakh%20S&cu=INR`);
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${upi}`;
  premiumModal.classList.remove("hidden");
  premiumModal.setAttribute("aria-hidden", "false");
});
closePremium.addEventListener("click", ()=> { premiumModal.classList.add("hidden"); premiumModal.setAttribute("aria-hidden", "true"); });

// "I Paid" button -> create pending + open WhatsApp to admin
paidBtn.addEventListener("click", ()=>{
  const payer = payerPhone.value.trim();
  const plan = planSelect.value;
  if(!payer) return alert("Enter your phone used for payment");
  // add pending (admin will approve)
  pending.push({ phone: payer, plan: plan, ts: Date.now() });
  localStorage.setItem(KEY_PENDING, JSON.stringify(pending));
  // open WhatsApp to admin with prefilled message
  const msg = `Payment made by ${payer} for Money Tracker - ₹${plan}. Please verify and approve.`;
  const url = `https://wa.me/${ADMIN_WH}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
  alert("WhatsApp opened to notify admin. After admin approves, premium will be active.");
  premiumModal.classList.add("hidden");
  premiumModal.setAttribute("aria-hidden", "true");
});

// ----- Add entry -----
addBtn.addEventListener("click", ()=>{
  if(!currentPhone){ alert("Please enter your phone first (on top)."); return; }
  // Free monthly limit check
  if(!isPremium(currentPhone)){
    const monthPrefix = new Date().toISOString().slice(0,7);
    const thisMonth = entries.filter(e => e.phone === currentPhone && e.fullTs.startsWith(monthPrefix));
    if(thisMonth.length >= 100){ return alert("Free monthly limit (100) reached. Please upgrade."); }
  }
  const amt = parseFloat(amountEl.value);
  const desc = (descEl.value || "").trim();
  const t = typeSel.value;
  const method = payMethod.value;
  if(!amt || !desc) return alert("Enter amount and description.");
  const now = new Date();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    phone: currentPhone,
    amount: amt,
    desc: desc,
    type: t,
    method: method,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    fullTs: now.toISOString()
  };
  // snapshot backup before change
  autoSnapshot();
  entries.push(entry);
  persistAll();
  amountEl.value = ""; descEl.value = ""; payMethod.selectedIndex = 0;
  updateAll();
});

// ----- Delete entry (only admin) implemented per row in renderEntries -----

// ----- Export CSV (premium/admin) -----
exportCsv.addEventListener("click", ()=>{
  if(!(isPremium(currentPhone) || isAdminByPrompt())) return alert("Export available for premium/admin only.");
  let csv = "Date,Time,Phone,Type,Amount,Method,Description\n";
  entries.forEach(e => csv += `${e.date},${e.time},${e.phone},${e.type},${e.amount},${e.method},"${e.desc}"\n`);
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "moneytracker.csv"; a.click();
});

// ----- Export PDF (simple print) -----
exportPdf.addEventListener("click", ()=>{
  if(!(isPremium(currentPhone) || isAdminByPrompt())) return alert("Export available for premium/admin only.");
  const win = window.open("","_blank","width=900,height=700");
  win.document.write("<h2>Money Tracker Report</h2>");
  win.document.write("<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><tr><th>Date</th><th>Time</th><th>Phone</th><th>Type</th><th>Amount</th><th>Method</th><th>Desc</th></tr>");
  entries.forEach(e => win.document.write(`<tr><td>${e.date}</td><td>${e.time}</td><td>${e.phone}</td><td>${e.type}</td><td>₹${e.amount}</td><td>${e.method}</td><td>${e.desc}</td></tr>`));
  win.document.write("</table>");
  win.print();
});

// ----- Backup / Restore -----
downloadBackup.addEventListener("click", ()=>{
  const payload = { entries, users, pending, ts: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mt_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
});
restoreBackupBtn.addEventListener("click", ()=> restoreInput.click());
restoreInput.addEventListener("change", (ev)=>{
  const f = ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try {
      const data = JSON.parse(reader.result);
      if(data.entries) entries = data.entries;
      if(data.users) users = data.users;
      if(data.pending) pending = data.pending;
      persistAll();
      updateAll();
      alert("Backup restored.");
    } catch (err) { alert("Invalid backup file."); }
  };
  reader.readAsText(f);
});

// ----- Helpers -----
function isPremium(phone){
  if(!phone) return false;
  const u = users[phone];
  if(!u || !u.expiry) return false;
  if(Date.now() <= u.expiry) return true;
  // expired -> clear
  u.premium = false; u.expiry = 0; persistAll(); return false;
}
function autoSnapshot(){
  const snap = { entries: entries.slice(), users: JSON.parse(JSON.stringify(users)), ts: new Date().toISOString() };
  localStorage.setItem(KEY_SNAPSHOT, JSON.stringify(snap));
}
function verifyAdminPrompt(){
  if(!isAdminPasswordSet()){ alert("Admin password not set."); return false; }
  const p = prompt("Enter admin password:");
  if(!p) return false;
  if(!verifyAdmin(p)){ alert("Wrong password."); return false; }
  return true;
}
function isAdminByPrompt(){
  // currentPhone '9999' considered admin quick (convenience)
  if(currentPhone === "9999") return true;
  return verifyAdminPrompt();
}

// ----- Render UI -----
function updateAll(){
  // badge
  if(currentPhone){
    if(currentPhone === "9999"){ badge.textContent = "ADMIN"; badge.style.background="#222"; badge.style.color="#fff"; }
    else if(isPremium(currentPhone)){ badge.textContent = "PREMIUM"; badge.style.background="#ffd700"; badge.style.color="#000"; }
    else { badge.textContent = "FREE"; badge.style.background="#fff3cd"; badge.style.color="#856404"; }
  } else { badge.textContent = "FREE"; badge.style.background="#fff3cd"; badge.style.color="#856404"; }

  renderEntries();
  computeSummary();
  updateEntryCount();
}
function renderEntries(){
  listDiv.innerHTML = "";
  const rev = [...entries].reverse();
  rev.forEach(e=>{
    const row = document.createElement("div"); row.className="entry-row";
    const left = document.createElement("div"); left.className="entry-meta";
    left.innerHTML = `${e.date} ${e.time} • ${e.desc} • <small>${e.method}</small> <div class="small muted">By: ${e.phone}</div>`;
    const right = document.createElement("div"); right.className="entry-amt";
    right.innerHTML = `${e.type==="income"?"+":"-"} ${formatMoney(e.amount)}`;
    const del = document.createElement("button"); del.className="muted"; del.textContent="Delete"; del.style.marginLeft="8px";
    del.addEventListener("click", ()=> {
      if(!verifyAdminPrompt()) return;
      if(confirm("Delete this entry?")){ entries = entries.filter(x=>x.id!==e.id); persistAll(); updateAll(); }
    });
    right.appendChild(del);
    row.appendChild(left); row.appendChild(right);
    listDiv.appendChild(row);
  });
}
function computeSummary(){
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const monthIdx = now.getMonth(), yearIdx = now.getFullYear();
  let todayTotal = 0, monthTotal = 0, income = 0, expense = 0;
  entries.forEach(e=>{
    const amt = Number(e.amount);
    if(e.type === "income") income += amt; else expense += amt;
    if(e.date === todayStr) todayTotal += (e.type==="expense"? -amt : amt);
    const d = new Date(e.fullTs);
    if(d.getMonth() === monthIdx && d.getFullYear() === yearIdx) monthTotal += (e.type==="expense"? -amt : amt);
  });
  todayTotalEl.textContent = formatMoney(todayTotal);
  monthTotalEl.textContent = formatMoney(monthTotal);
  incExpEl.textContent = `${formatMoney(income)} / ${formatMoney(expense)}`;
  if(balanceEl) balanceEl.textContent = formatMoney(income - expense);
}
function updateEntryCount(){
  if(!currentPhone){ entryCountEl.textContent = "0"; return; }
  const monthPref = new Date().toISOString().slice(0,7);
  const cnt = entries.filter(e => e.phone === currentPhone && e.fullTs.startsWith(monthPref)).length;
  entryCountEl.textContent = cnt;
}

// ----- Initial load: if current phone exists show main UI -----
if(localStorage.getItem(KEY_CURRENT)){
  currentPhone = localStorage.getItem(KEY_CURRENT);
  identify.classList.add("hidden");
  mainUI.classList.remove("hidden");
  updateAll();
}

// ----- Ensure modal close buttons tied (fix close stuck issue) -----
document.querySelectorAll(".close-btn").forEach(btn=>{
  btn.addEventListener("click", (ev)=>{
    const modal = btn.closest(".modal");
    if(modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
  });
});

// make sure admin modal close tied
document.getElementById("closeAdmin")?.addEventListener("click", ()=> adminModal.classList.add("hidden"));

// final UI update
updateAll();
