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
