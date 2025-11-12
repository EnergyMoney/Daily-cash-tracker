let entries = JSON.parse(localStorage.getItem("entries") || "[]");
let premium = JSON.parse(localStorage.getItem("premium") || "null");

// --- show splash ---
window.onload = () => {
  setTimeout(() => {
    document.getElementById("splash").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    checkPremiumStatus();
    renderList();
  }, 2000);
};

// --- add entry ---
document.getElementById("addBtn").addEventListener("click", () => {
  if(!premium || Date.now() > premium.expiry){
    showPopup();
    return;
  }
  const desc = document.getElementById("desc").value;
  const amt = parseFloat(document.getElementById("amt").value);
  const type = document.getElementById("type").value;
  if(!desc || !amt) return alert("Enter details!");
  entries.push({desc, amt, type, date: new Date().toLocaleDateString()});
  localStorage.setItem("entries", JSON.stringify(entries));
  renderList();
});

// --- render list ---
function renderList(){
  let list = document.getElementById("list");
  list.innerHTML = "";
  let total = 0;
  entries.forEach(e=>{
    const row = `<tr><td>${e.date}</td><td>${e.desc}</td><td>${e.type}</td><td>₹${e.amt}</td></tr>`;
    list.innerHTML += row;
    total += (e.type=="income"?e.amt:-e.amt);
  });
  document.getElementById("total").textContent = "Total: ₹" + total.toFixed(2);
}

// --- clear all ---
document.getElementById("clearBtn").addEventListener("click",()=>{
  if(confirm("Delete all data? Backup will be lost!")){
    localStorage.removeItem("entries");
    entries = [];
    renderList();
  }
});

// --- restore backup ---
document.getElementById("restoreBtn").addEventListener("click",()=>{
  let backup = localStorage.getItem("backup");
  if(backup){
    localStorage.setItem("entries", backup);
    entries = JSON.parse(backup);
    renderList();
    alert("Backup restored!");
  } else alert("No backup found!");
});

// --- backup auto save ---
setInterval(()=>{
  localStorage.setItem("backup", JSON.stringify(entries));
},10000);

// --- premium popup controls ---
function showPopup(){ document.getElementById("premiumPopup").classList.remove("hidden"); }
document.getElementById("closePopup").addEventListener("click",()=>document.getElementById("premiumPopup").classList.add("hidden"));

// --- upgrade logic ---
document.querySelectorAll(".plan").forEach(btn=>{
  btn.addEventListener("click",()=>{
    let months = btn.dataset.plan=="29"?1:36;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth()+months);
    premium = {plan:btn.dataset.plan, expiry:expiry.getTime()};
    localStorage.setItem("premium", JSON.stringify(premium));
    alert("Premium Activated ✅");
    document.getElementById("premiumPopup").classList.add("hidden");
  });
});

// --- check expiry auto disable ---
function checkPremiumStatus(){
  if(premium && Date.now() < premium.expiry){
    console.log("Premium active till:", new Date(premium.expiry).toLocaleDateString());
  } else {
    localStorage.removeItem("premium");
    premium=null;
  }
}
