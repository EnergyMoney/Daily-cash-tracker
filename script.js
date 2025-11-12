const STORAGE_KEY = "dailyCash_v1";
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
const $ = id => document.getElementById(id);

// Elements
const app = $("app"), splash = $("splash"), upgradeBtn = $("upgradeBtn");
const popup = $("upgradePopup"), closePopup = $("closePopup");

// Splash animation
window.addEventListener("load", () => {
  setTimeout(() => {
    splash.style.display = "none";
    app.style.display = "block";
  }, 1800);
});

// Popup open/close
upgradeBtn.onclick = () => popup.style.display = "flex";
closePopup.onclick = () => popup.style.display = "none";

// Add entry
$("addBtn").addEventListener("click", () => {
  const amount = Number($("amount").value);
  const desc = $("description").value;
  const type = $("type").value;
  const cat = $("category").value;
  if(!amount || !desc) return alert("Fill all fields!");
  entries.push({amount, desc, type, category:cat, ts:Date.now()});
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  alert("✅ Entry Added!");
  updateAll();
});

// Update summary
function updateAll(){
  let income=0, expense=0;
  entries.forEach(e => e.type==="income" ? income+=e.amount : expense+=e.amount);
  $("balance").innerText = "₹" + (income-expense).toFixed(2);
  $("incExp").innerText = `₹${income} / ₹${expense}`;
  $("historyList").innerHTML = entries.map(e=>`
    <div class="item">
      <b>${e.type.toUpperCase()}</b> ₹${e.amount} - ${e.desc} (${e.category})
    </div>`).join("");
}
updateAll();
