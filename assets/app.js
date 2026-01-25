const STORAGE_KEY = "budgetcart_site_v1";

const els = {
  budgetInput: document.getElementById("budgetInput"),
  spentValue: document.getElementById("spentValue"),
  leftValue: document.getElementById("leftValue"),
  statusBadge: document.getElementById("statusBadge"),
  countOnlyBought: document.getElementById("countOnlyBought"),

  itemForm: document.getElementById("itemForm"),
  nameInput: document.getElementById("nameInput"),
  priceInput: document.getElementById("priceInput"),
  categoryInput: document.getElementById("categoryInput"),
  storeInput: document.getElementById("storeInput"),

  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  filterSelect: document.getElementById("filterSelect"),

  listWrap: document.getElementById("listWrap"),
  savingsBox: document.getElementById("savingsBox"),

  addTemplateBtn: document.getElementById("addTemplateBtn"),
  clearBoughtBtn: document.getElementById("clearBoughtBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function safeNumber(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function normalize(str){ return (str || "").trim().toLowerCase(); }
function money(n){ return safeNumber(n).toFixed(2) + " £"; }

const defaultState = {
  budget: 0,
  countOnlyBought: false,
  items: [],
  ui: { search:"", sort:"createdDesc", filter:"all" }
};
let state = load();

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaultState);
    const p = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...p,
      items: Array.isArray(p.items) ? p.items : [],
      ui: { ...structuredClone(defaultState.ui), ...(p.ui || {}) }
    };
  }catch{
    return structuredClone(defaultState);
  }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function setBadge(text, mode){
  els.statusBadge.textContent = text;
  els.statusBadge.style.borderColor =
    mode === "bad" ? "rgba(255,80,80,.35)" :
    mode === "warn" ? "rgba(255,200,0,.35)" :
    "rgba(255,255,255,.10)";
  els.statusBadge.style.background =
    mode === "bad" ? "rgba(255,80,80,.10)" :
    mode === "warn" ? "rgba(255,200,0,.10)" :
    "rgba(255,255,255,.03)";
  els.statusBadge.style.color =
    mode === "bad" ? "#ffd1d1" :
    mode === "warn" ? "#ffe9a6" :
    "#9fb0c8";
}

function getSpent(){
  return state.items.reduce((sum,it)=>{
    if(state.countOnlyBought && !it.bought) return sum;
    return sum + safeNumber(it.price);
  },0);
}

function compute(){
  const budget = safeNumber(state.budget);
  const spent = getSpent();
  const left = budget - spent;

  els.spentValue.textContent = money(spent);
  els.leftValue.textContent = money(left);

  if(budget <= 0) setBadge("Укажи бюджет", "warn");
  else if(left < 0) setBadge("Превышение бюджета", "bad");
  else if(left <= budget * 0.15) setBadge("Почти на нуле", "warn");
  else setBadge("В пределах бюджета", "ok");

  renderSavings(budget);
}

function addItem({name, price, category, store}){
  state.items.unshift({
    id: uid(),
    name: name.trim(),
    price: safeNumber(price),
    category: category || "Другое",
    store: (store || "").trim(),
    bought:false,
    createdAt: Date.now()
  });
  save(); render();
}
function updateItem(id, patch){
  const i = state.items.findIndex(x=>x.id===id);
  if(i===-1) return;
  state.items[i] = { ...state.items[i], ...patch };
  save(); render();
}
function deleteItem(id){
  state.items = state.items.filter(x=>x.id!==id);
  save(); render();
}
function clearBought(){
  state.items = state.items.filter(x=>!x.bought);
  save(); render();
}

function addTemplate(){
  const t = [
    { name:"Хлеб", price:1.20, category:"Еда", store:"" },
    { name:"Молоко", price:1.50, category:"Напитки", store:"" },
    { name:"Яйца", price:2.10, category:"Еда", store:"" },
    { name:"Макароны", price:1.00, category:"Еда", store:"" },
    { name:"Курица", price:4.50, category:"Еда", store:"" },
    { name:"Чай", price:2.20, category:"Напитки", store:"" },
    { name:"Гель для посуды", price:2.30, category:"Быт", store:"" },
  ];
  t.reverse().forEach(addItem);
}

function applyUI(){
  els.budgetInput.value = state.budget || "";
  els.countOnlyBought.checked = !!state.countOnlyBought;
  els.searchInput.value = state.ui.search || "";
  els.sortSelect.value = state.ui.sort || "createdDesc";
  els.filterSelect.value = state.ui.filter || "all";
}

function getItems(){
  let items = [...state.items];
  const q = normalize(state.ui.search);
  if(q){
    items = items.filter(it => normalize(`${it.name} ${it.category} ${it.store}`).includes(q));
  }
  if(state.ui.filter === "need") items = items.filter(it=>!it.bought);
  if(state.ui.filter === "bought") items = items.filter(it=>it.bought);

  const s = state.ui.sort;
  items.sort((a,b)=>{
    if(s==="createdDesc") return b.createdAt - a.createdAt;
    if(s==="createdAsc") return a.createdAt - b.createdAt;
    if(s==="priceAsc") return safeNumber(a.price) - safeNumber(b.price);
    if(s==="priceDesc") return safeNumber(b.price) - safeNumber(a.price);
    if(s==="nameAsc") return a.name.localeCompare(b.name, "ru");
    return 0;
  });
  return items;
}

function renderItem(it){
  const d = document.createElement("div");
  d.className = "card";
  d.style.padding = "12px";
  d.style.display = "flex";
  d.style.gap = "12px";
  d.style.alignItems = "flex-start";
  if(it.bought) d.style.opacity = ".85";

  const cb = document.createElement("input");
  cb.type="checkbox";
  cb.checked=!!it.bought;
  cb.style.marginTop="4px";
  cb.style.transform="scale(1.15)";
  cb.addEventListener("change", ()=>updateItem(it.id,{bought:cb.checked}));

  const main = document.createElement("div");
  main.style.flex="1";
  main.style.minWidth="0";

  const top = document.createElement("div");
  top.style.display="flex";
  top.style.justifyContent="space-between";
  top.style.gap="10px";

  const name = document.createElement("div");
  name.style.fontWeight="900";
  name.style.wordBreak="break-word";
  name.textContent = it.name;
  if(it.bought){
    name.style.textDecoration="line-through";
    name.style.opacity=".7";
  }

  const price = document.createElement("div");
  price.style.fontWeight="900";
  price.style.cursor="pointer";
  price.style.whiteSpace="nowrap";
  price.title="Нажми, чтобы изменить цену";
  price.textContent = money(it.price);
  price.addEventListener("click", ()=>{
    const next = prompt("Новая цена:", String(it.price));
    if(next===null) return;
    updateItem(it.id,{price:safeNumber(next)});
  });

  top.appendChild(name);
  top.appendChild(price);

  const meta = document.createElement("div");
  meta.className = "small";
  meta.style.marginTop="8px";
  meta.innerHTML = `
    <span class="pill">${it.category}</span>
    ${it.store ? ` <span class="pill">${it.store}</span>` : ""}
  `;

  const actions = document.createElement("div");
  actions.style.display="flex";
  actions.style.gap="8px";
  actions.style.marginTop="10px";

  const edit = document.createElement("button");
  edit.className="btn-ghost btn";
  edit.textContent="Переименовать";
  edit.addEventListener("click", ()=>{
    const nn = prompt("Новое название:", it.name);
    if(nn===null) return;
    const t = nn.trim();
    if(!t) return;
    updateItem(it.id,{name:t});
  });

  const del = document.createElement("button");
  del.className="btn-ghost btn";
  del.textContent="Удалить";
  del.addEventListener("click", ()=>deleteItem(it.id));

  actions.appendChild(edit);
  actions.appendChild(del);

  main.appendChild(top);
  main.appendChild(meta);
  main.appendChild(actions);

  d.appendChild(cb);
  d.appendChild(main);

  return d;
}

function renderList(){
  els.listWrap.innerHTML = "";
  const items = getItems();
  if(items.length===0){
    const e = document.createElement("div");
    e.className="small";
    e.textContent="Пока пусто. Добавь первый товар выше 🙂";
    els.listWrap.appendChild(e);
    return;
  }
  items.forEach(it => els.listWrap.appendChild(renderItem(it)));
}

function renderSavings(budget){
  const totalAll = state.items.reduce((s,it)=>s+safeNumber(it.price),0);
  const over = totalAll - budget;

  if(budget<=0){
    els.savingsBox.textContent = "Укажи бюджет — и появятся подсказки по экономии.";
    return;
  }
  if(over<=0){
    els.savingsBox.textContent = `Ты в бюджете. Сумма: ${money(totalAll)} из ${money(budget)}.`;
    return;
  }
  const top = [...state.items].sort((a,b)=>safeNumber(b.price)-safeNumber(a.price)).slice(0,3);
  els.savingsBox.innerHTML =
    `Перерасход: <b>${money(over)}</b>. Начни с самых дорогих: ` +
    top.map(x => `${x.name} (${money(x.price)})`).join(", ") + ".";
}

function render(){
  applyUI();
  renderList();
  compute();
}

function bind(){
  els.budgetInput.addEventListener("input", ()=>{
    state.budget = safeNumber(els.budgetInput.value);
    save(); compute();
  });
  els.countOnlyBought.addEventListener("change", ()=>{
    state.countOnlyBought = !!els.countOnlyBought.checked;
    save(); compute();
  });

  els.itemForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const name = els.nameInput.value.trim();
    if(!name) return;
    addItem({
      name,
      price: els.priceInput.value,
      category: els.categoryInput.value,
      store: els.storeInput.value
    });
    els.nameInput.value="";
    els.priceInput.value="";
    els.storeInput.value="";
    els.nameInput.focus();
  });

  const uiHandler = ()=>{
    state.ui.search = els.searchInput.value;
    state.ui.sort = els.sortSelect.value;
    state.ui.filter = els.filterSelect.value;
    save(); render();
  };
  els.searchInput.addEventListener("input", uiHandler);
  els.sortSelect.addEventListener("change", uiHandler);
  els.filterSelect.addEventListener("change", uiHandler);

  els.addTemplateBtn.addEventListener("click", addTemplate);
  els.clearBoughtBtn.addEventListener("click", clearBought);

  els.resetBtn.addEventListener("click", ()=>{
    if(!confirm("Сбросить всё?")) return;
    state = structuredClone(defaultState);
    save(); render();
  });
}

bind();
render();
