// ---------- STORAGE ----------
let entries = JSON.parse(localStorage.getItem("entries") || "[]");
let user = JSON.parse(localStorage.getItem("user") || "null");

// ---------- ELEMENTS ----------
const loginSection = document.getElementById("authSection");
const mainSection = document.getElementById("mainSection");
const badge = document.getElementById("premiumBadge");
const phoneInput = document.getElementById("phone");
const loginBtn = document.getElementById("loginBtn");
const type = document.getElementById("type");
const amount = document.getElementById("amount");
const category = document.getElementById("category");
const desc = document.getElementById("description");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const historyList = document.getElementById("list");
const bal = document.getElementById("balance");
const today = document.getElementById("todayTotal");
const month = document.getElementById("monthTotal");
const incExp = document.getElementById("incExp");
const exportExcel = document.getElementById("exportExcel");
const exportPDF = document.getElementById("exportPDF");
const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");

// ---------- FUNCTIONS ----------
function saveAll() {
  localStorage.setItem("entries", JSON.stringify(entries));
}

function render() {
  historyList.innerHTML = "";
  let income = 0, expense = 0, todayTotal = 0, monthTotal = 0;
  const todayStr = new Date().toLocaleDateString();
  const monthStr = new Date().getMonth();

  entries.forEach(e => {
    const li = document.createElement("li");
    li.textContent = `${e.date} - ${e.type} ₹${e.amount} (${e.cat}) ${e.desc}`;
    historyList.appendChild(li);

    if (e.type === "income") income += e.amount;
    else expense += e.amount;
    if (e.date === todayStr) todayTotal += e.amount;
    if (new Date(e.date).getMonth() === monthStr) monthTotal += e.amount;
  });

  const balance = income - expense;
  bal.textContent = "₹" + balance.toFixed(2);
  today.textContent = "₹" + todayTotal.toFixed(2);
  month.textContent = "₹" + monthTotal.toFixed(2);
  incExp.textContent = `₹${income.toFixed(2)} / ₹${expense.toFixed(2)}`;
}

function checkPremium() {
  if (!user) return false;
  const now = Date.now();
  return user.premium && now < user.expiry;
}

function login() {
  const phone = phoneInput.value.trim();
  if (phone === "9999") {
    user = { phone, premium: true, expiry: 9999999999999, admin: true };
    alert("✅ Admin access granted!");
  } else {
    user = JSON.parse(localStorage.getItem("user_" + phone) || "null");
    if (!user) {
      user = { phone, premium: false, expiry: 0 };
      alert("Free account created! Limited features.");
    } else if (Date.now() > user.expiry) {
      user.premium = false;
      alert("⚠️ Premium expired! Please renew.");
    }
  }
  localStorage.setItem("user", JSON.stringify(user));
  showApp();
}

function showApp() {
  if (user) {
    loginSection.classList.add("hidden");
    mainSection.classList.remove("hidden");
    badge.textContent = checkPremium() ? "PREMIUM" : "FREE";
    badge.className = checkPremium() ? "premium-badge premium" : "premium-badge";
    render();
  }
}

function addEntry() {
  if (!checkPremium() && entries.length >= 100) {
    alert("Free limit 100 entries. Upgrade to Premium for more!");
    return;
  }
  const amt = parseFloat(amount.value);
  if (!amt || amt <= 0) return alert("Enter valid amount");

  const entry = {
    type: type.value,
    amount: amt,
    cat: category.value,
    desc: desc.value,
    date: new Date().toLocaleDateString()
  };
  entries.push(entry);
  saveAll();
  render();
  amount.value = "";
  desc.value = "";
}

function clearAll() {
  if (confirm("Clear all entries?")) {
    entries = [];
    saveAll();
    render();
  }
}

// ---------- BACKUP ----------
function downloadBackup() {
  const blob = new Blob([JSON.stringify(entries)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup.json";
  a.click();
}

function restoreBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    entries = JSON.parse(reader.result);
    saveAll();
    render();
    alert("✅ Backup restored!");
  };
  reader.readAsText(file);
}

// ---------- EXPORT ----------
function exportToExcel() {
  if (!checkPremium()) return alert("Upgrade to Premium to export.");
  let csv = "Date,Type,Amount,Category,Description\n";
  entries.forEach(e => {
    csv += `${e.date},${e.type},${e.amount},${e.cat},${e.desc}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "entries.csv";
  a.click();
}

function exportToPDF() {
  if (!checkPremium()) return alert("Upgrade to Premium to export PDF.");
  const win = window.open("", "", "width=600,height=600");
  win.document.write("<h2>Monthly Report</h2>");
  entries.forEach(e => {
    win.document.write(`${e.date} - ${e.type} ₹${e.amount} (${e.cat}) ${e.desc}<br>`);
  });
  win.print();
}

// ---------- EVENT ----------
loginBtn.addEventListener("click", login);
addBtn.addEventListener("click", addEntry);
clearBtn.addEventListener("click", clearAll);
exportExcel.addEventListener("click", exportToExcel);
exportPDF.addEventListener("click", exportToPDF);
backupBtn.addEventListener("click", downloadBackup);
restoreBtn.addEventListener("change", restoreBackup);

// ---------- INIT ----------
showApp();
