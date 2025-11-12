// script.js - Money Tracker final
// Admin WhatsApp number (used to prefill message)
const ADMIN_WH = "919544599733"; // with country code for wa.me (no plus sign)

// Storage keys
const KEY_ENTRIES = "mt_entries_v2";
const KEY_USERS   = "mt_users_v2";    // map phone -> { premium: bool, expiry: timestamp }
const KEY_PENDING = "mt_pending_v2";  // pending payments array
const KEY_ADMIN   = "mt_admin_v2";    // store admin password hashed (btoa) - only on creator machine
const KEY_CURRENT = "mt_current_v2";  // current phone (string)

// In-memory
let entries = JSON.parse(localStorage.getItem(KEY_ENTRIES) || "[]");
let users   = JSON.parse(localStorage.getItem(KEY_USERS) || "{}");
let pending = JSON.parse(localStorage.getItem(KEY_PENDING) || "[]");
let adminHash = localStorage.getItem(KEY_ADMIN) || null;
let currentPhone = localStorage.getItem(KEY_CURRENT) || null;

// DOM
const splash = document.getElementById("splash");
const app = document.getElementById("app");
const badge = document.getElementById("badge");
const phoneInput = document.getElementById("phoneInput");
const btnSetPhone = document.getElementById("btnSetPhone");
const identify = document.getElementById("identify");
const mainUI = document.getElementById("mainUI");
const listDiv = document.getElementById("list");
const amountEl = document.getElementById("amount");
const descEl = document.getElementById("description");
const typeSel = document.getElementById("type");
const payMethod = document.getElementById("paymentMethod");
const addBtn = document.getElementById("addBtn");
const entryCountEl = document.getElementById("entryCount");
const todayTotalEl = document.getElementById("todayTotal");
const monthTotalEl = document.getElementById("monthTotal");
const incExpEl = document.getElementById("incExp");
const balanceEl = document.getElementById("balance");
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
const closeModal = document.getElementById("closeModal");

const adminBtn = document.getElementById("adminBtn");
const adminModal = document.getElementById("adminModal");
const viewPendingBtn = document.getElementById("viewPending");
const pendingListDiv = document.getElementById("pendingList");
const approveBtn = document.getElementById("approveBtn");
const approveArea = document.getElementById("approveArea");
const approvePhone = document.getElementById("approvePhone");
const doApprove = document.getElementById("doApprove");
const setPassBtn = document.getElementById("setPassBtn");
const setPassArea = document.getElementById("setPassArea");
const newPass = document.getElementById("newPass");
const savePass = document.getElementById("savePass");
const closeAdmin = document.getElementById("closeAdmin");

// helpers
function saveAll(){ localStorage.setItem(KEY_ENTRIES,JSON.stringify(entries)); localStorage.setItem(KEY_USERS,JSON.stringify(users)); localStorage.setItem(KEY_PENDING,JSON.stringify(pending)); }
function formatMoney(n){ return "₹" + Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function isAdminPasswordSet(){ return !!adminHash; }
function verifyAdmin(pass){ return adminHash === btoa(pass); }
function setAdminPass(pass){ adminHash = btoa(pass); localStorage.setItem(KEY_ADMIN, adminHash); alert("Admin password saved."); }

// splash hide
setTimeout(()=>{ if(splash) splash.style.display="none"; document.getElementById("app").classList.remove("hidden"); }, 2000);

// identify / set phone
btnSetPhone.addEventListener("click", ()=>{
  const v = phoneInput.value.trim();
  if(!v){ alert("Enter phone or 'admin'"); return; }
  // if user typed 'admin' open admin login/set flow
  if(v.toLowerCase()==="admin"){
    openAdminLogin();
    return;
  }
  currentPhone = v;
  localStorage.setItem(KEY_CURRENT, currentPhone);
  if(!users[currentPhone]){ users[currentPhone] = { premium:false, expiry:0 }; localStorage.setItem(KEY_USERS, JSON.stringify(users)); }
  identify.classList.add("hidden");
  mainUI.classList.remove("hidden");
  updateAll();
});

// admin flows
adminBtn.addEventListener("click", openAdminLogin);
function openAdminLogin(){
  // if admin password not set -> ask to create
  if(!isAdminPasswordSet()){
    const p = prompt("Set admin password (create) — keep it safe:");
    if(p){ setAdminPass(p); alert("Admin set. Now click Admin to login."); }
    return;
  }
  // ask for password to show admin modal
  const p = prompt("Enter admin password:");
  if(!p) return;
  if(!verifyAdmin(p)){ alert("Wrong password."); return; }
  // open admin modal
  adminModal.classList.remove("hidden");
  // show pending
  renderPending();
}
document.getElementById("closeAdmin").addEventListener("click", ()=> adminModal.classList.add("hidden"));

viewPendingBtn.addEventListener("click", renderPending);
function renderPending(){
  pendingListDiv.innerHTML = "";
  if(pending.length===0){ pendingListDiv.innerHTML = "<div class='small muted'>No pending payments</div>"; return; }
  pending.forEach(p => {
    const d = document.createElement("div");
    d.innerHTML = `<b>${p.phone}</b> • Plan ₹${p.plan} • <small>${new Date(p.ts).toLocaleString()}</small>`;
    const approve = document.createElement("button"); approve.className="primary"; approve.textContent="Approve"; approve.style.marginLeft="8px";
    approve.addEventListener("click", ()=> { doApproveFor(p.phone, p.plan); });
    d.appendChild(approve);
    pendingListDiv.appendChild(d);
  });
}

approveBtn.addEventListener("click", ()=> { approveArea.classList.toggle("hidden"); setPassArea.classList.add("hidden"); });
setPassBtn.addEventListener("click", ()=> { setPassArea.classList.toggle("hidden"); approveArea.classList.add("hidden"); });

doApprove.addEventListener("click", ()=> {
  const ph = approvePhone.value.trim();
  const u = prompt("Enter months to grant (1 for monthly, 36 for 3 years) OR leave blank to use plan durations:");
  if(!ph) return alert("Enter phone");
  // approve by setting users[ph].premium true and expiry accordingly
  const months = u ? Number(u) : 1;
  const expiry = new Date(); expiry.setMonth(expiry.getMonth() + months);
  users[ph] = users[ph] || {};
  users[ph].premium = true;
  users[ph].expiry = expiry.getTime();
  // remove pending entries for this phone
  pending = pending.filter(p=>p.phone !== ph);
  saveAll();
  alert(`Approved premium for ${ph} until ${expiry.toDateString()}`);
  renderPending();
});

savePass.addEventListener("click", ()=> {
  const p = newPass.value.trim();
  if(!p) return alert("Enter password");
  setAdminPass(p);
  newPass.value="";
});

// premium modal open
openUpgrade.addEventListener("click", ()=> {
  // generate UPI QR with our UPI id and show
  const upi = encodeURIComponent(`upi://pay?pa=visakhsivaji95-4@okhdfcbank&pn=Visakh%20S&cu=INR`);
  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${upi}`;
  premiumModal.classList.remove("hidden");
});
closeModal.addEventListener("click", ()=> premiumModal.classList.add("hidden"));

// "I Paid" button
paidBtn.addEventListener("click", ()=> {
  const payer = payerPhone.value.trim();
  const plan = planSelect.value;
  if(!payer) return alert("Enter phone you used to pay");
  // add to pending
  pending.push({ phone: payer, plan: plan, ts: Date.now() });
  localStorage.setItem(KEY_PENDING, JSON.stringify(pending));
  // open whatsapp to admin with prefilled message
  const text = `Payment made: Payer ${payer} | Plan ₹${plan} | App Money Tracker. Please verify.`;
  const waUrl = `https://wa.me/${ADMIN_WH}?text=${encodeURIComponent(text)}`;
  window.open(waUrl,"_blank");
  alert("WhatsApp opened to notify admin. After admin approves, premium will be active.");
  premiumModal.classList.add("hidden");
});

// add entry
addBtn.addEventListener("click", ()=> {
  // check current user
  const phone = currentPhone || prompt("Enter your phone to identify (so premium can be applied):");
  if(!phone) return alert("Please identify first.");
  // check limit
  if(!isPremium(phone)){
    const thisMonth = new Date().toISOString().slice(0,7);
    const monthEntries = entries.filter(e => e.phone === phone && e.fullTs.startsWith(thisMonth));
    if(monthEntries.length >= 100) return alert("Free monthly limit 100 reached. Upgrade to premium.");
  }
  const amt = parseFloat(amountEl.value);
  const desc = descEl.value.trim();
  const type = typeSel.value;
  const method = payMethod.value;
  if(!amt || !desc) return alert("Please enter amount and description.");
  const now = new Date();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    phone: phone,
    amount: amt,
    desc: desc,
    type: type,
    method: method,
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    fullTs: now.toISOString()
  };
  // auto backup snapshot
  autoBackupSnapshot();
  entries.push(entry);
  saveAll();
  amountEl.value = ""; descEl.value=""; payMethod.selectedIndex = 0;
  updateAll();
});

// helper isPremium
function isPremium(phone){
  if(!phone) return false;
  const u = users[phone];
  if(!u) return false;
  if(u.expiry && Date.now() <= u.expiry) return true;
  // expired: cleanup
  if(u.expiry && Date.now() > u.expiry){ u.premium=false; u.expiry=0; saveAll(); return false; }
  return false;
}

// update UI
function updateAll(){
  // badge
  if(currentPhone){
    if(currentPhone==="9999") badge.textContent="ADMIN";
    else if(isPremium(currentPhone)) badge.textContent="PREMIUM";
    else badge.textContent="FREE";
  } else badge.textContent="FREE";

  // entries list
  renderEntries();
  computeSummary();
  // entry count this month for currentPhone
  if(currentPhone){
    const monthPre = new Date().toISOString().slice(0,7);
    const thisMonthEntries = entries.filter(e => e.phone === currentPhone && e.fullTs.startsWith(monthPre));
    entryCountEl.textContent = thisMonthEntries.length;
  } else entryCountEl.textContent = "0";
}

function renderEntries(){
  listDiv.innerHTML = "";
  // newest first
  const shown = [...entries].reverse();
  shown.forEach(e=>{
    const row = document.createElement("div"); row.className="entry-row";
    const left = document.createElement("div"); left.className="entry-meta";
    left.innerHTML = `${e.date} ${e.time} • ${e.desc} • <small>${e.method}</small> <div class="small muted">By: ${e.phone}</div>`;
    const right = document.createElement("div"); right.className="entry-amt";
    right.innerHTML = `${e.type==="income"?"+":"-"} ${formatMoney(e.amount)}`;
    // delete button (only admin)
    const del = document.createElement("button"); del.textContent="Delete"; del.className="muted"; del.style.marginLeft="8px";
    del.addEventListener("click", ()=> {
      if(!verifyAdminPrompt()) return;
      if(confirm("Delete this entry?")){ entries = entries.filter(x=>x.id!==e.id); saveAll(); updateAll(); }
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
  let todayTotal=0, monthTotal=0, income=0, expense=0;
  entries.forEach(e=>{
    const amt = Number(e.amount);
    if(e.type==="income") income += amt; else expense += amt;
    if(e.date === todayStr) todayTotal += (e.type==="expense"? -amt : amt);
    const d = new Date(e.fullTs);
    if(d.getMonth()===monthIdx && d.getFullYear()===yearIdx) monthTotal += (e.type==="expense"? -amt : amt);
  });
  todayTotalEl.textContent = formatMoney(todayTotal);
  monthTotalEl.textContent = formatMoney(monthTotal);
  incExpEl.textContent = `${formatMoney(income)} / ${formatMoney(expense)}`;
  if(balanceEl) balanceEl.textContent = formatMoney(income - expense);
}

// export CSV (premium/admin only)
exportCsv.addEventListener("click", ()=> {
  // allow if currentPhone premium or admin
  if(!(isPremium(currentPhone) || verifyAdminSkip())) return alert("Export available for premium/admin only.");
  let csv = "Date,Time,Phone,Type,Amount,Method,Description\n";
  entries.forEach(e=> csv += `${e.date},${e.time},${e.phone},${e.type},${e.amount},${e.method},"${e.desc}"\n`);
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "moneytracker.csv"; a.click();
});

// export PDF
exportPdf.addEventListener("click", ()=> {
  if(!(isPremium(currentPhone) || verifyAdminSkip())) return alert("Export available for premium/admin only.");
  const w = window.open("","_blank");
  w.document.write("<h2>Money Tracker Report</h2>");
  w.document.write("<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><tr><th>Date</th><th>Time</th><th>Phone</th><th>Type</th><th>Amount</th><th>Method</th><th>Desc</th></tr>");
  entries.forEach(e=> w.document.write(`<tr><td>${e.date}</td><td>${e.time}</td><td>${e.phone}</td><td>${e.type}</td><td>₹${e.amount}</td><td>${e.method}</td><td>${e.desc}</td></tr>`));
  w.document.write("</table>");
  w.print();
});

// backup / restore
downloadBackup.addEventListener("click", ()=> {
  const payload = { entries, users, pending, ts:new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `mt_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
});

restoreBackupBtn.addEventListener("click", ()=> restoreInput.click());
restoreInput.addEventListener("change", (ev)=>{
  const f = ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try{
      const data = JSON.parse(reader.result);
      if(data.entries) entries = data.entries;
      if(data.users) users = data.users;
      if(data.pending) pending = data.pending;
      saveAll(); updateAll();
      alert("Backup restored.");
    }catch(err){ alert("Invalid backup file."); }
  };
  reader.readAsText(f);
});

// auto backup snapshot before critical ops
function autoBackupSnapshot(){
  const snap = { entries, users, ts:new Date().toISOString() };
  localStorage.setItem("mt_last_snapshot", JSON.stringify(snap));
}

// verify admin prompt (returns true if verified)
function verifyAdminPrompt(){
  if(!adminHash){ alert("No admin password set. To delete entries, admin must set password."); return false; }
  const p = prompt("Enter admin password:");
  if(!p) return false;
  if(!verifyAdmin(p)) { alert("Wrong password."); return false; }
  return true;
}

// helper to check admin without prompt (only returns true if currentPhone==='9999')
function verifyAdminSkip(){ return currentPhone === "9999" || (adminHash && btoa(prompt("Enter admin password for export:") || "")===adminHash); }

// pending approve helper
function doApproveFor(phone, plan){
  const months = plan === "29" ? 1 : 36;
  const expiry = new Date(); expiry.setMonth(expiry.getMonth() + months);
  users[phone] = users[phone] || {};
  users[phone].premium = true;
  users[phone].expiry = expiry.getTime();
  // remove pending
  pending = pending.filter(p=>p.phone !== phone);
  saveAll(); updateAll(); alert(`Premium activated for ${phone} until ${expiry.toDateString()}`);
}

// initial show if currentPhone exists
if(localStorage.getItem(KEY_CURRENT)){
  currentPhone = localStorage.getItem(KEY_CURRENT);
  identify.classList.add("hidden");
  mainUI.classList.remove("hidden");
  updateAll();
}

// open admin modal close
document.getElementById("closeModal")?.addEventListener("click", ()=> premiumModal.classList.add("hidden"));
document.getElementById("closeAdmin")?.addEventListener("click", ()=> adminModal.classList.add("hidden"));

// admin approve area actions wired in HTML: doApprove is defined earlier

// final update UI
function updateAll(){ updateEntriesCount(); updateAllDisplays(); renderEntries(); }
function updateEntriesCount(){
  if(!currentPhone){ entryCountEl.textContent="0"; return; }
  const monthPref = new Date().toISOString().slice(0,7);
  const c = entries.filter(e=> e.phone===currentPhone && e.fullTs.startsWith(monthPref)).length;
  entryCountEl.textContent = c;
}
function updateAllDisplays(){ computeSummary(); }
function renderEntries(){ listDiv.innerHTML=""; const rev = [...entries].reverse(); rev.forEach(e=> {
  const row = document.createElement("div"); row.className="entry-row";
  const left = document.createElement("div"); left.className="entry-meta";
  left.innerHTML = `${e.date} ${e.time} • ${e.desc} • <small>${e.method}</small> <div class="small muted">By: ${e.phone}</div>`;
  const right = document.createElement("div"); right.className="entry-amt";
  right.innerHTML = `${e.type==="income"?"+":"-"} ${formatMoney(e.amount)}`;
  const del = document.createElement("button"); del.className="muted"; del.textContent="Delete"; del.style.marginLeft="8px";
  del.addEventListener("click", ()=> { if(verifyAdminPrompt()){ if(confirm("Delete entry?")){ entries = entries.filter(x=>x.id!==e.id); saveAll(); updateAll(); } }});
  right.appendChild(del);
  row.appendChild(left); row.appendChild(right);
  listDiv.appendChild(row);
}); }

// computeSummary wrapper (already above as computeSummary)
function computeSummary(){ // (already implemented earlier) ... reuse
  const now = new Date();
  const todayStr = now.toLocaleDateString();
  const monthIdx = now.getMonth(), yearIdx = now.getFullYear();
  let todayTotal=0, monthTotal=0, income=0, expense=0;
  entries.forEach(e=>{
    const amt = Number(e.amount);
    if(e.type==="income") income += amt; else expense += amt;
    if(e.date === todayStr) todayTotal += (e.type==="expense"? -amt : amt);
    const d = new Date(e.fullTs);
    if(d.getMonth()===monthIdx && d.getFullYear()===yearIdx) monthTotal += (e.type==="expense"? -amt : amt);
  });
  todayTotalEl.textContent = formatMoney(todayTotal);
  monthTotalEl.textContent = formatMoney(monthTotal);
  incExpEl.textContent = `${formatMoney(income)} / ${formatMoney(expense)}`;
  if(balanceEl) balanceEl.textContent = formatMoney(income - expense);
}

// ensure update
updateAll();
