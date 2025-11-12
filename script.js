const STORAGE_KEY = "dailyCash_v1";
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const $ = id => document.getElementById(id);

// splash
window.onload = () => {
  setTimeout(() => {
    $("splash").style.display = "none";
    $("app").style.display = "block";
    updateAll();
    checkPremiumExpiry();
  }, 1500);
};

// Popup control
$("upgradeBtn").onclick = () => $("upgradePopup").style.display = "flex";
$("closePopup").onclick = () => $("upgradePopup").style.display = "none";
$("adminBtn").onclick = () => $("adminPanel").style.display = "flex";
$("closeAdmin").onclick = () => $("adminPanel").style.display = "none";

// Save entries
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Add entry
$("addBtn").onclick = () => {
  const amt = Number($("amount").value);
  const desc = $("description").value.trim();
  const cat = $("category").value;
  const type = $("type").value;
  if (!amt || !desc) return alert("Please fill amount and description!");
  entries.push({ amount: amt, desc, category: cat, type, ts: Date.now() });
  save();
  $("amount").value = $("description").value = "";
  updateAll();
};

// Render
function updateAll() {
  const hist = $("historyList");
  hist.innerHTML = "";
  let income = 0,
    expense = 0,
    todayT = 0,
    monthT = 0;
  const now = new Date();
  const month = now.getMonth(),
    year = now.getFullYear();
  entries.forEach((e) => {
    if (e.type === "income") income += e.amount;
    else expense += e.amount;
    const d = new Date(e.ts);
    if (d.toDateString() === now.toDateString())
      todayT += e.type === "income" ? e.amount : -e.amount;
    if (d.getMonth() === month && d.getFullYear() === year)
      monthT += e.type === "income" ? e.amount : -e.amount;

    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<b>${e.type.toUpperCase()}</b> ₹${e.amount} – ${
      e.desc
    } (${e.category})<br><small>${d.toLocaleString()}</small>
      <div class='ctrl'><button onclick="editEntry(${e.ts})">✏️</button>
      <button onclick="delEntry(${e.ts})">❌</button></div>`;
    hist.appendChild(div);
  });
  $("balance").innerText = "₹" + (income - expense).toFixed(2);
  $("todayTotal").innerText = "₹" + todayT.toFixed(2);
  $("monthTotal").innerText = "₹" + monthT.toFixed(2);
  $("incExp").innerText = `₹${income} / ₹${expense}`;
}

function editEntry(ts) {
  const e = entries.find((x) => x.ts === ts);
  if (!e) return;
  $("amount").value = e.amount;
  $("description").value = e.desc;
  $("category").value = e.category;
  $("type").value = e.type;
  entries = entries.filter((x) => x.ts !== ts);
  save();
  updateAll();
}
function delEntry(ts) {
  if (confirm("Delete this entry?")) {
    entries = entries.filter((x) => x.ts !== ts);
    save();
    updateAll();
  }
}

// Backup / Restore
$("clearBtn").onclick = () => {
  if (confirm("Clear all entries?")) {
    localStorage.setItem("backupCash", JSON.stringify(entries));
    entries = [];
    save();
    updateAll();
    alert("Cleared! Backup saved.");
  }
};
$("restoreBtn").onclick = () => {
  const b = JSON.parse(localStorage.getItem("backupCash") || "[]");
  if (!b.length) return alert("No backup found.");
  entries = b;
  save();
  updateAll();
  alert("Backup restored!");
};

// Export PDF
$("exportPDF").onclick = async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Money Tracker Report", 10, 10);
  let y = 20;
  entries.forEach((e) => {
    doc.text(
      `${new Date(e.ts).toLocaleString()} - ${e.type} ₹${e.amount} ${e.desc}`,
      10,
      y
    );
    y += 8;
  });
  doc.save("MoneyTracker.pdf");
};

// Export Excel
$("exportExcel").onclick = () => {
  const ws = XLSX.utils.json_to_sheet(entries);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "MoneyTracker");
  XLSX.writeFile(wb, "MoneyTracker.xlsx");
};

// Premium expiry handling
$("plan30").onclick = () => setPremiumDays(30);
$("plan1095").onclick = () => setPremiumDays(1095);

function setPremiumDays(days) {
  const exp = Date.now() + days * 24 * 60 * 60 * 1000;
  localStorage.setItem("premiumExpiry", exp);
  alert("✅ Premium activated till " + new Date(exp).toLocaleDateString());
  $("upgradePopup").style.display = "none";
}

function checkPremiumExpiry() {
  const exp = localStorage.getItem("premiumExpiry");
  if (!exp) return;
  if (Date.now() > Number(exp)) {
    alert("⚠️ Premium expired!");
    localStorage.removeItem("premiumExpiry");
  }
}
/* --- Quick fix: admin login, UPI QR display, backup download/restore --- */

// keys (consistent)
const ADMIN_KEY = "mt_admin_v4_fix";
const PREMIUM_KEY = "premiumExpiry"; // keep same as your app uses or will set

// safe selectors with fallbacks
const $id = (id) => document.getElementById(id) || document.querySelector(`[data-id="${id}"]`);

// --- ADMIN: set / verify / UI wiring ---
function adminSetPassword(pass){
  if(!pass) return;
  localStorage.setItem(ADMIN_KEY, btoa(pass));
  console.log("Admin password set (local).");
}
function adminVerify(pass){
  const stored = localStorage.getItem(ADMIN_KEY);
  if(!stored) return false;
  return btoa(pass) === stored;
}

// wire admin-login button (support multiple possible IDs)
const adminLoginBtn = $id("adminLoginBtn") || $id("loginAdmin") || $id("adminLogin");
const adminPassInput = $id("adminPassInput") || $id("adminPass") || $id("admin-password");

// admin area and UI elements
const adminModalEl = $id("adminModal") || $id("adminPanel");
const adminAreaEl = $id("adminArea") || $id("adminArea");
const pendingListEl = $id("pendingList") || $id("pendingList");

if(adminLoginBtn && adminPassInput){
  adminLoginBtn.addEventListener("click", () => {
    const pass = adminPassInput.value ? adminPassInput.value.trim() : "";
    if(!pass){
      alert("Enter a password to set or login.");
      return;
    }
    const stored = localStorage.getItem(ADMIN_KEY);
    if(!stored){
      // first-time set
      if(confirm("No admin password found. Set this as admin password?")){
        adminSetPassword(pass);
        adminPassInput.value = "";
        alert("Admin password saved. Re-open Admin and login using this password.");
      }
      return;
    }
    // verify
    if(adminVerify(pass)){
      alert("Admin login successful.");
      // show admin area if available
      if(adminAreaEl){ adminAreaEl.style.display = "block"; }
      // populate pending if any
      renderPendingSafely();
    } else {
      alert("Wrong password.");
    }
  });
}

// --- PENDING list renderer (robust) ---
function renderPendingSafely(){
  try {
    const pend = JSON.parse(localStorage.getItem("mt_pending_v4") || "[]");
    const listEl = pendingListEl || document.getElementById("pendingList") || document.querySelector(".pending-list");
    if(!listEl) return;
    listEl.innerHTML = "";
    if(!pend || pend.length === 0){ listEl.innerHTML = "<div class='muted'>No pending payments</div>"; return; }
    pend.forEach((p, idx) => {
      const row = document.createElement("div");
      row.className = "pending-row";
      row.innerHTML = `<div><b>${p.phone || "unknown"}</b> • ₹${p.plan} • <small>${new Date(p.ts).toLocaleString()}</small></div>`;
      const btn = document.createElement("button"); btn.textContent = "Approve"; btn.className="primary small";
      btn.addEventListener("click", () => {
        // approve -> set premium expiry (days)
        const days = (p.plan === "29" || p.plan === 29) ? 30 : 1095;
        const exp = Date.now() + days * 24*60*60*1000;
        localStorage.setItem(PREMIUM_KEY, exp);
        // remove this pending
        pend.splice(idx,1);
        localStorage.setItem("mt_pending_v4", JSON.stringify(pend));
        alert(`Approved ${p.phone}. Premium active till ${new Date(exp).toDateString()}`);
        renderPendingSafely();
      });
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  } catch(err){
    console.error("renderPendingSafely error:", err);
  }
}

// --- UPI QR: ensure QR image present & generated on open ---
function ensureQrOnOpen(){
  const qrImg = $id("qrImg") || document.querySelector(".qr") || document.querySelector("img[alt*='UPI']") || null;
  // Button(s) that open upgrade modal
  const openers = [];
  const a1 = $id("openUpgrade") || document.getElementById("openUpgrade") || document.querySelector("[data-id='openUpgrade']");
  const a2 = $id("openUpgrade2") || document.getElementById("openUpgrade2");
  if(a1) openers.push(a1);
  if(a2) openers.push(a2);
  if(openers.length === 0) {
    // try any upgrade button
    const any = document.querySelectorAll("button");
    any.forEach(b => { if(/upgrade/i.test(b.innerText)) openers.push(b); });
  }
  openers.forEach(btn => btn.addEventListener("click", () => {
    if(!qrImg) return;
    const upi = encodeURIComponent(`upi://pay?pa=visakhsivaji95-4@okhdfcbank&pn=Visakh%20S&cu=INR`);
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${upi}`;
    // show modal if scripted hidden
    const modal = btn.dataset.modalId ? document.getElementById(btn.dataset.modalId) : document.getElementById("upgradeModal") || document.getElementById("upgradePopup");
    if(modal) modal.classList.remove("hidden"), modal.style.display = "flex";
  }));
}
ensureQrOnOpen();

// --- BACKUP DOWNLOAD and RESTORE robust handlers ---
const downloadBtn = $id("downloadBackup") || $id("downloadBackupBtn") || document.getElementById("downloadBackup");
const restoreInput = $id("restoreInput") || document.getElementById("restoreInput") || null;
const restoreBtn = $id("restoreBtn") || document.getElementById("restoreBtn");

if(downloadBtn){
  downloadBtn.addEventListener("click", ()=> {
    try {
      const payload = {
        entries: JSON.parse(localStorage.getItem("mt_entries_v4") || localStorage.getItem("mt_entries_v3") || "[]"),
        pending: JSON.parse(localStorage.getItem("mt_pending_v4") || "[]"),
        users: JSON.parse(localStorage.getItem("mt_users_v4") || "{}"),
        premium: localStorage.getItem(PREMIUM_KEY) || null,
        ts: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `moneytracker_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      console.log("Backup saved.");
    } catch(e){
      console.error("download backup failed", e);
      alert("Backup failed: " + e.message);
    }
  });
}

// restore button wiring (if present)
if(restoreBtn && !restoreInput){
  // create a hidden input
  const inp = document.createElement("input"); inp.type="file"; inp.accept=".json"; inp.style.display="none";
  document.body.appendChild(inp);
  inp.addEventListener("change", (ev) => {
    const f = ev.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if(data.entries) localStorage.setItem("mt_entries_v4", JSON.stringify(data.entries));
        if(data.pending) localStorage.setItem("mt_pending_v4", JSON.stringify(data.pending));
        if(data.users) localStorage.setItem("mt_users_v4", JSON.stringify(data.users));
        if(data.premium) localStorage.setItem(PREMIUM_KEY, data.premium);
        alert("Restore successful. Reloading page.");
        setTimeout(()=>location.reload(), 400);
      } catch(err){
        alert("Invalid backup file.");
      }
    };
    r.readAsText(f);
  });
  restoreBtn.addEventListener("click", ()=> inp.click());
} else if(restoreInput) {
  restoreInput.addEventListener("change", (ev) => {
    const f = ev.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if(data.entries) localStorage.setItem("mt_entries_v4", JSON.stringify(data.entries));
        if(data.pending) localStorage.setItem("mt_pending_v4", JSON.stringify(data.pending));
        if(data.users) localStorage.setItem("mt_users_v4", JSON.stringify(data.users));
        if(data.premium) localStorage.setItem(PREMIUM_KEY, data.premium);
        alert("Restore successful. Reloading page.");
        setTimeout(()=>location.reload(), 400);
      } catch(err){ alert("Invalid backup file."); }
    };
    r.readAsText(f);
  });
}

// --- small helper: safe console notice ---
console.info("MoneyTracker: admin/QR/backup patch loaded. If issues persist, open DevTools (F12) and paste console errors here.");

// Optionally auto-render pending if admin panel visible
if(document.readyState === "complete") renderPendingSafely();
window.addEventListener("load", renderPendingSafely);
