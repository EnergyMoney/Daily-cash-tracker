/* Money Tracker - final combined version
   - Free trial 30 days from first start (device)
   - Premium plans: 29 => 30 days, 299 => 1095 days
   - Admin approve flow (local-only)
   - Backup / Restore / Export
   - LocalStorage keys: mt_entries_v4, mt_users_v4, mt_pending_v4, mt_admin_v4, mt_trial_v4
*/

(() => {
  // Config
  const ADMIN_WH = "919544599733"; // for wa.me links (no plus)
  const UPI_ID = "visakhsivaji95-4@okhdfcbank";

  // Storage keys
  const K_ENT = "mt_entries_v4";
  const K_PENDING = "mt_pending_v4";
  const K_USERS = "mt_users_v4"; // not heavily used here, kept for extend
  const K_ADMIN = "mt_admin_v4"; // base64(stored pass)
  const K_TRIAL = "mt_trial_v4";
  const K_PREMIUM = "mt_premium_v4"; // {expiry:timestamp}

  // State
  let entries = JSON.parse(localStorage.getItem(K_ENT) || "[]");
  let pending = JSON.parse(localStorage.getItem(K_PENDING) || "[]");
  let users = JSON.parse(localStorage.getItem(K_USERS) || "{}");
  let adminHash = localStorage.getItem(K_ADMIN) || null;
  let trial = JSON.parse(localStorage.getItem(K_TRIAL) || "null"); // {start: iso}
  let premium = JSON.parse(localStorage.getItem(K_PREMIUM) || "null"); // {expiry: timestamp}

  // DOM shortcuts
  const $ = id => document.getElementById(id);

  const splash = $("splash"), app = $("app");
  const startBtn = $("startBtn"), identifyCard = $("identifyCard");
  const openUpgrade = $("openUpgrade"), openUpgrade2 = $("openUpgrade2");
  const mainUI = $("mainUI");
  const addBtn = $("addBtn"), clearBtn = $("clearBtn");
  const amountEl = $("amount"), descEl = $("description"), typeEl = $("type"), catEl = $("category");
  const listDiv = $("list");
  const entryCountEl = $("entryCount"), todayTotalEl = $("todayTotal"), monthTotalEl = $("monthTotal"), incExpEl = $("incExp"), balanceEl = $("balance");
  const statusBadge = $("statusBadge");

  // Upgrade modal elements
  const upgradeModal = $("upgradeModal"), qrImg = $("qrImg"), payerPhone = $("payerPhone"), planSelect = $("planSelect");
  const iPaidBtn = $("iPaidBtn"), closeUpgradeBtn = $("closeUpgrade");

  // Admin modal elements
  const adminModal = $("adminModal"), adminBtn = $("adminBtn");
  const adminLoginBtn = $("adminLoginBtn"), adminPassInput = $("adminPassInput");
  const adminArea = $("adminArea"), adminLoginArea = $("adminLoginArea");
  const pendingList = $("pendingList"), viewPending = $("viewPending");
  const approveBtn = $("approveBtn"), changePassBtn = $("changePassBtn");
  const adminRestore = $("adminRestore"), adminLogout = $("adminLogout");
  const closeAdmin = $("closeAdmin");

  // Helper save
  function saveAll() {
    localStorage.setItem(K_ENT, JSON.stringify(entries));
    localStorage.setItem(K_PENDING, JSON.stringify(pending));
    localStorage.setItem(K_USERS, JSON.stringify(users));
    if(adminHash) localStorage.setItem(K_ADMIN, adminHash);
    if(trial) localStorage.setItem(K_TRIAL, JSON.stringify(trial));
    if(premium) localStorage.setItem(K_PREMIUM, JSON.stringify(premium));
  }

  // Splash hide -> app show
  setTimeout(() => {
    if(splash) splash.style.display = "none";
    if(app) app.classList.remove("hidden");
  }, 1400);

  // TRIAL: start on first "Start App" click
  startBtn.addEventListener("click", () => {
    if(!trial) {
      trial = { start: new Date().toISOString() };
      localStorage.setItem(K_TRIAL, JSON.stringify(trial));
      alert("Free trial started — 30 days full access. Enjoy!");
    }
    identifyCard.classList.add("hidden");
    mainUI.classList.remove("hidden");
    updateAll();
  });

  // Upgrade open
  [openUpgrade, openUpgrade2].forEach(b => b && b.addEventListener("click", openUpgradeModal));
  function openUpgradeModal(){
    // generate UPI QR
    const upi = encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=Visakh%20S&cu=INR`);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${upi}`;
    upgradeModal.classList.remove("hidden");
    upgradeModal.setAttribute("aria-hidden","false");
  }
  closeUpgradeBtn.addEventListener("click", ()=> { upgradeModal.classList.add("hidden"); upgradeModal.setAttribute("aria-hidden","true"); });

  // I Paid -> add to pending and open WhatsApp to admin
  iPaidBtn.addEventListener("click", () => {
    const payer = payerPhone.value.trim() || "unknown";
    const plan = planSelect.value;
    pending.push({ phone: payer, plan, ts: Date.now() });
    localStorage.setItem(K_PENDING, JSON.stringify(pending));
    const msg = `Payment claimed by ${payer} for Money Tracker - ₹${plan}. Please verify and approve.`;
    window.open(`https://wa.me/${ADMIN_WH}?text=${encodeURIComponent(msg)}`, "_blank");
    alert("WhatsApp opened to admin. Your claim is added to pending list.");
    upgradeModal.classList.add("hidden");
  });

  // Add entry
  addBtn.addEventListener("click", () => {
    // check access: trial or premium active
    if(!isFullAccess()){
      return alert("Free trial expired. Please upgrade to Premium.");
    }
    const amt = parseFloat(amountEl.value);
    const desc = descEl.value.trim();
    const type = typeEl.value;
    const cat = catEl.value;
    if(!amt || !desc) return alert("Enter amount and description.");
    // free monthly limit only if trial expired and not premium (during trial full access)
    if(!isPremiumActive() && isTrialExpired()){
      const monthPrefix = new Date().toISOString().slice(0,7);
      const thisMonth = entries.filter(e => e.fullTs.startsWith(monthPrefix));
      if(thisMonth.length >= 100) return alert("Free monthly limit reached. Upgrade to premium.");
    }
    const now = new Date();
    entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      amount: amt,
      desc,
      type,
      category: cat,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      fullTs: now.toISOString()
    });
    saveAll();
    amountEl.value = ""; descEl.value = "";
    updateAll();
  });

  // Clear all
  clearBtn.addEventListener("click", () => {
    if(!confirm("Clear all entries? This cannot be undone (you can restore from backup).")) return;
    autoSnapshot();
    entries = []; saveAll(); updateAll();
  });

  // Export CSV
  $("exportCsv").addEventListener("click", ()=> {
    if(!isFullAccess()) return alert("Export locked — upgrade to premium or be in trial.");
    exportCSV();
  });

  // Export PDF (print)
  $("exportPdf").addEventListener("click", ()=>{
    if(!isFullAccess()) return alert("Export locked — upgrade to premium or be in trial.");
    exportPDF();
  });

  // Backup download
  $("downloadBackup").addEventListener("click", ()=> {
    const payload = { entries, pending, users, ts: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload,null,2)], { type:"application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `moneytracker_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
  });

  // Restore input trigger
  $("restoreBtn").addEventListener("click", ()=> $("restoreInput").click());
  $("restoreInput").addEventListener("change", (ev)=> {
    const f = ev.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=> {
      try {
        const data = JSON.parse(r.result);
        if(data.entries) entries = data.entries;
        if(data.pending) pending = data.pending;
        if(data.users) users = data.users;
        saveAll(); updateAll(); alert("Backup restored.");
      } catch(e){ alert("Invalid backup file."); }
    };
    r.readAsText(f);
  });

  // --- Admin flows ---
  adminBtn.addEventListener("click", ()=> adminModal.classList.remove("hidden"));
  // close admin modal (close button wired in HTML: closeAdmin)
  closeAdmin.addEventListener("click", ()=> adminModal.classList.add("hidden"));

  // Admin set/login
  adminLoginBtn.addEventListener("click", ()=> {
    const p = adminPassInput.value.trim();
    if(!p){ return alert("Enter a password to set or login"); }
    if(!adminHash){
      // set first time
      adminHash = btoa(p);
      localStorage.setItem(K_ADMIN, adminHash);
      adminPassInput.value = "";
      alert("Admin password set. Reopen Admin and login.");
      return;
    }
    // verify
    if(btoa(p) === adminHash){
      // show admin area
      adminLoginArea.classList.add("hidden");
      adminArea.classList.remove("hidden");
      renderPendingList();
    } else {
      alert("Wrong password.");
    }
  });

  // View pending button
  viewPending.addEventListener("click", renderPendingList);

  function renderPendingList(){
    pendingList.innerHTML = "";
    if(pending.length === 0) { pendingList.innerHTML = "<div class='muted'>No pending payments</div>"; return; }
    pending.forEach((p, idx) => {
      const div = document.createElement("div");
      div.className = "pending-row";
      div.innerHTML = `<b>${p.phone}</b> • ₹${p.plan} • ${new Date(p.ts).toLocaleString()}`;
      const approveBtnEl = document.createElement("button");
      approveBtnEl.className = "primary small";
      approveBtnEl.innerText = "Approve";
      approveBtnEl.addEventListener("click", ()=> approvePendingAt(idx));
      div.appendChild(approveBtnEl);
      pendingList.appendChild(div);
    });
  }

  // Approve button (also generic)
  approveBtn.addEventListener("click", ()=> {
    // if there is at least one pending, approve first as default
    if(pending.length === 0) return alert("No pending.");
    approvePendingAt(0);
  });

  function approvePendingAt(index){
    const item = pending[index];
    if(!item) return;
    const days = item.plan === "29" ? 30 : 1095;
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    // save premium globally (device) and optionally per phone (we keep global for simplicity)
    premium = { expiry };
    // remove pending
    pending.splice(index,1);
    saveAll();
    alert(`Approved for ${item.phone}. Premium active until ${new Date(expiry).toDateString()}`);
    renderPendingList(); updateAll();
  }

  // Change admin password
  changePassBtn.addEventListener("click", ()=> {
    const np = prompt("Enter new admin password (leave blank to cancel):");
    if(np){ adminHash = btoa(np); localStorage.setItem(K_ADMIN, adminHash); alert("Admin password updated."); }
  });

  // Admin restore (dangerous) — only admin area
  adminRestore.addEventListener("click", ()=> {
    if(!confirm("Restore backup (this will clear current data)? PLEASE ensure you have a file to restore.")) return;
    // open file select to restore
    $("restoreInput").click();
  });

  // Admin logout
  adminLogout.addEventListener("click", ()=> {
    adminArea.classList.add("hidden");
    adminLoginArea.classList.remove("hidden");
  });

  // --- Utility functions ---
  function isTrialActive(){
    if(!trial) return false;
    const start = new Date(trial.start);
    const diff = Date.now() - start.getTime();
    return diff < (30 * 24 * 60 * 60 * 1000); // 30 days
  }
  function isTrialExpired(){ return !isTrialActive(); }
  function isPremiumActive(){
    if(!premium || !premium.expiry) return false;
    return Date.now() <= premium.expiry;
  }
  function isFullAccess(){ // used to permit actions
    return isTrialActive() || isPremiumActive();
  }

  // Export CSV
  function exportCSV(){
    let csv = "Date,Time,Type,Category,Amount,Description\n";
    entries.forEach(e => {
      csv += `${e.date},${e.time},${e.type},${e.category},${e.amount},"${e.desc.replace(/"/g,'""')}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `moneytracker_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  // Export PDF (simple print page)
  function exportPDF(){
    const w = window.open("","_blank","width=900,height=700");
    w.document.write("<h2>Money Tracker Report</h2>");
    w.document.write("<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><tr><th>Date</th><th>Time</th><th>Type</th><th>Category</th><th>Amount</th><th>Description</th></tr>");
    entries.forEach(e => {
      w.document.write(`<tr><td>${e.date}</td><td>${e.time}</td><td>${e.type}</td><td>${e.category}</td><td>₹${e.amount}</td><td>${e.desc}</td></tr>`);
    });
    w.document.write("</table>");
    w.print();
  }

  // Auto snapshot (local)
  function autoSnapshot(){
    localStorage.setItem("mt_last_snapshot", JSON.stringify({ entries, pending, users, ts: new Date().toISOString() }));
  }

  // Update UI functions
  function renderEntries(){
    listDiv.innerHTML = "";
    const rev = [...entries].reverse();
    rev.forEach(e => {
      const row = document.createElement("div"); row.className = "entry-row";
      const left = document.createElement("div"); left.className = "entry-meta";
      left.innerHTML = `${e.date} ${e.time} • ${e.desc} • <small>${e.category}</small>`;
      const right = document.createElement("div"); right.className = "entry-amt";
      right.innerHTML = `${e.type==="income"?"+":"-"} ${formatMoney(e.amount)}`;
      const del = document.createElement("button"); del.className="muted small"; del.textContent="Delete";
      del.addEventListener("click", ()=> {
        // admin confirmation required to delete if trial expired/premium not active? we require admin always for delete
        if(!adminHash) return alert("Admin not set. Open Admin and set a password to enable delete.");
        const p = prompt("Enter admin password to confirm delete:");
        if(!p) return;
        if(btoa(p) !== adminHash) return alert("Wrong password.");
        if(confirm("Delete this entry?")) {
          entries = entries.filter(x => x.id !== e.id);
          saveAll(); updateAll();
        }
      });
      right.appendChild(del);
      row.appendChild(left); row.appendChild(right);
      listDiv.appendChild(row);
    });
  }

  function computeSummary(){
    let income = 0, expense = 0;
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const monthIdx = now.getMonth(), yearIdx = now.getFullYear();
    let todayTotal = 0, monthTotal = 0;
    entries.forEach(e => {
      const amt = Number(e.amount);
      if(e.type === "income") income += amt; else expense += amt;
      if(e.date === todayStr) todayTotal += (e.type==="expense" ? -amt : amt);
      const d = new Date(e.fullTs);
      if(d.getMonth() === monthIdx && d.getFullYear() === yearIdx) monthTotal += (e.type==="expense" ? -amt : amt);
    });
    todayTotalEl.textContent = formatMoney(todayTotal);
    monthTotalEl.textContent = formatMoney(monthTotal);
    incExpEl.textContent = `${formatMoney(income)} / ${formatMoney(expense)}`;
    if(balanceEl) balanceEl.textContent = formatMoney(income - expense);
  }

  function updateEntryCount(){
    const monthPref = new Date().toISOString().slice(0,7);
    const c = entries.filter(e => e.fullTs.startsWith(monthPref)).length;
    entryCountEl.textContent = c;
  }

  function updateBadge(){
    if(isPremiumActive()){
      statusBadge.textContent = "PREMIUM";
      statusBadge.style.background = "#ffd700"; statusBadge.style.color="#000";
    } else if(isTrialActive()){
      statusBadge.textContent = "FREE TRIAL";
      statusBadge.style.background = "#cfe9ff"; statusBadge.style.color="#05668d";
    } else {
      statusBadge.textContent = "UPGRADE REQUIRED";
      statusBadge.style.background = "#ffd6d6"; statusBadge.style.color="#800000";
    }
  }

  function updateAll(){
    renderEntries(); computeSummary(); updateEntryCount(); updateBadge();
    saveAll();
  }

  function formatMoney(n){ return "₹" + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 }); }

  // wire export/print
  $("exportCsv").addEventListener("click", exportCSV);
  $("exportPdf").addEventListener("click", exportPDF);

  function exportCSV(){ if(!isFullAccess()) return alert("Locked — upgrade or be in trial."); exportCSV_core(); }
  function exportPDF(){ if(!isFullAccess()) return alert("Locked — upgrade or be in trial."); exportPDF_core(); }

  function exportCSV_core(){ // used above
    let csv = "Date,Time,Type,Category,Amount,Description\n";
    entries.forEach(e => csv += `${e.date},${e.time},${e.type},${e.category},${e.amount},"${e.desc.replace(/"/g,'""')}"\n`);
    const blob = new Blob([csv], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "moneytracker.csv"; a.click();
  }
  function exportPDF_core(){
    const w = window.open("","_blank","width=900,height=700");
    w.document.write("<h2>Money Tracker Report</h2>");
    w.document.write("<table border='1' cellpadding='6' style='border-collapse:collapse;width:100%'><tr><th>Date</th><th>Time</th><th>Type</th><th>Category</th><th>Amount</th><th>Desc</th></tr>");
    entries.forEach(e => w.document.write(`<tr><td>${e.date}</td><td>${e.time}</td><td>${e.type}</td><td>${e.category}</td><td>₹${e.amount}</td><td>${e.desc}</td></tr>`));
    w.document.write("</table>"); w.print();
  }

  // approve pending list renderer
  function renderPendingList(){ renderPendingList = renderPendingList; } // placeholder to be overwritten earlier

  // initial update
  updateAll();

  // expose small helpers globally for console debugging (optional)
  window.moneyTracker = { entries, pending, isTrialActive, isPremiumActive, isFullAccess, updateAll, exportCSV_core, exportPDF_core };

})();
