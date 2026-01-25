const STORAGE_KEY = "budgetcart_v1";

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
  groupSelect: document.getElementById("groupSelect"),

  listWrap: document.getElementById("listWrap"),
  savingsBox: document.getElementById("savingsBox"),

  addTemplateBtn: document.getElementById("addTemplateBtn"),
  clearBoughtBtn: document.getElementById("clearBoughtBtn"),
  resetBtn: document.getElementById("resetBtn"),
};

function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function money(n){ return Number(n || 0).toFixed(2) + " £"; }
function normalize(str){ return (str || "").trim().toLowerCase(); }
function safeNumber(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

const defaultState = {
  budget: 0,
  countOnlyBought: false,
  items: [],
  ui: { search:"", sort:"createdDesc", filter:"all", group:"category" }
};

let state = load();

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      ui: { ...structuredClone(defaultState.ui), ...(parsed.ui || {}) }
    };
  }catch{
    return structuredClone(defaultState);
  }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function setBadge(text, mode){
  els.statusBadge.textContent = text;
  els.statusBadge.style.borderColor =
    mode==="bad" ? "rgba(255,80,80,.35)" :
    mode==="warn"? "rgba(255,200,0,.35)" :
    "rgba(255,255,255,.10)";
  els.statusBadge.style.background =
    mode==="bad" ? "rgba(255,80,80,.10)" :
    mode==="warn"? "rgba(255,200,0,.10)" :
    "rgba(255,255,255,.03)";
  els.statusBadge.style.color =
    mode==="bad" ? "#ffd1d1" :
    mode==="warn"? "#ffe9a6" :
    "#9fb0c8";
}

function getSpent(){
  const onlyBought = state.countOnlyBought;
  return state.items.reduce((sum,it)=>{
    if(onlyBought && !it.bought) return sum;
    return sum + safeNumber(it.price);
  },0);
}

function compute(){
  const budget = safeNumber(state.budget);
  const spent = getSpent();
  const left = budget - spent;

  els.spentValue.textContent = money(spent);
  els.leftValue.textContent = money(left);

  if (budget <= 0) setBadge("Укажи бюджет", "warn");
  else if (left < 0) setBadge("Превышение бюджета", "bad");
  else if (left <= budget * 0.15) setBadge("Почти на нуле", "warn");
  else setBadge("В пределах бюджета", "ok");

  renderSavings(budget);
}

function addItem({name, price, category, store}){
  const item = {
    id: uid(),
    name: name.trim(),
    price: safeNumber(price),
    category: category || "Другое",
    store: (store || "").trim(),
    bought: false,
    createdAt: Date.now(),
  };
  state.items.unshift(item);
  save();
  render();
}

function updateItem(id, patch){
  const idx = state.items.findIndex(x=>x.id===id);
  if(idx === -1) return;
  state.items[idx] = { ...state.items[idx], ...patch };
  save();
  render();
}
function deleteItem(id){
  state.items = state.items.filter(x=>x.id!==id);
  save();
  render();
}
function clearBought(){
  state.items = state.items.filter(x=>!x.bought);
  save();
  render();
}

function addTemplate(){
  const template = [
    { name:"Хлеб", price:1.20, category:"Еда", store:"" },
    { name:"Молоко", price:1.50, category:"Напитки", store:"" },
    { name:"Яйца", price:2.10, category:"Еда", store:"" },
    { name:"Макароны", price:1.00, category:"Еда", store:"" },
    { name:"Курица", price:4.50, category:"Еда", store:"" },
    { name:"Чай", price:2.20, category:"Напитки", store:"" },
    { name:"Гель для посуды", price:2.30, category:"Быт", store:"" },
  ];
  template.reverse().forEach(t=>addItem(t));
}

function applyUIFromState(){
  els.budgetInput.value = state.budget || "";
  els.countOnlyBought.checked = !!state.countOnlyBought;

  els.searchInput.value = state.ui.search || "";
  els.sortSelect.value = state.ui.sort || "createdDesc";
  els.filterSelect.value = state.ui.filter || "all";
  els.groupSelect.value = state.ui.group || "category";
}

function getFilteredSortedItems(){
  const q = normalize(state.ui.search);
  const filter = state.ui.filter;

  let items = [...state.items];

  if(q){
    items = items.filter(it=>{
      const hay = normalize(`${it.name} ${it.category} ${it.store}`);
      return hay.includes(q);
    });
  }
  if(filter==="need") items = items.filter(it=>!it.bought);
  if(filter==="bought") items = items.filter(it=>it.bought);

  const sort = state.ui.sort;
  items.sort((a,b)=>{
    if(sort==="createdDesc") return b.createdAt - a.createdAt;
    if(sort==="createdAsc") return a.createdAt - b.createdAt;
    if(sort==="priceAsc") return safeNumber(a.price) - safeNumber(b.price);
    if(sort==="priceDesc") return safeNumber(b.price) - safeNumber(a.price);
    if(sort==="nameAsc") return a.name.localeCompare(b.name, "ru");
    return 0;
  });

  return items;
}

function groupItems(items){
  const mode = state.ui.group;
  if(mode==="none") return [{ key:"Все", items }];

  const getKey = (it)=>{
    if(mode==="store") return it.store ? it.store : "Без магазина";
    return it.category || "Другое";
  };

  const map = new Map();
  for(const it of items){
    const k = getKey(it);
    if(!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }

  return [...map.entries()]
    .sort((a,b)=>a[0].localeCompare(b[0], "ru"))
    .map(([key, arr])=>({ key, items: arr }));
}

function renderItem(it){
  const wrap = document.createElement("div");
  wrap.className = "item" + (it.bought ? " bought" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "checkbox";
  checkbox.checked = !!it.bought;
  checkbox.addEventListener("change", ()=>updateItem(it.id, { bought: checkbox.checked }));

  const main = document.createElement("div");
  main.className = "item-main";

  const top = document.createElement("div");
  top.className = "item-top";

  const name = document.createElement("div");
  name.className = "item-name";
  name.textContent = it.name;

  const price = document.createElement("div");
  price.className = "price";
  price.textContent = money(it.price);
  price.title = "Нажми, чтобы изменить цену";
  price.addEventListener("click", ()=>{
    const next = prompt("Новая цена:", String(it.price));
    if(next === null) return;
    updateItem(it.id, { price: safeNumber(next) });
  });

  top.appendChild(name);
  top.appendChild(price);

  const meta = document.createElement("div");
  meta.className = "item-meta";

  const cat = document.createElement("span");
  cat.className = "pill";
  cat.textContent = it.category;
  meta.appendChild(cat);

  if(it.store){
    const st = document.createElement("span");
    st.className = "pill";
    st.textContent = it.store;
    meta.appendChild(st);
  }

  main.appendChild(top);
  main.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "item-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.textContent = "✎";
  editBtn.title = "Переименовать";
  editBtn.addEventListener("click", ()=>{
    const nextName = prompt("Новое название:", it.name);
    if(nextName === null) return;
    const trimmed = nextName.trim();
    if(!trimmed) return;
    updateItem(it.id, { name: trimmed });
  });

  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn";
  delBtn.textContent = "🗑";
  delBtn.title = "Удалить";
  delBtn.addEventListener("click", ()=>deleteItem(it.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  wrap.appendChild(checkbox);
  wrap.appendChild(main);
  wrap.appendChild(actions);

  return wrap;
}

function renderList(){
  els.listWrap.innerHTML = "";
  const items = getFilteredSortedItems();

  if(items.length===0){
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "Пока пусто. Добавь первый товар выше 🙂";
    els.listWrap.appendChild(empty);
    return;
  }

  const groups = groupItems(items);
  for(const g of groups){
    if(state.ui.group!=="none"){
      const title = document.createElement("div");
      title.className = "group-title";
      title.textContent = g.key;
      els.listWrap.appendChild(title);
    }
    for(const it of g.items) els.listWrap.appendChild(renderItem(it));
  }
}

function renderSavings(budget){
  els.savingsBox.innerHTML = "";
  if(budget<=0){
    els.savingsBox.textContent = "Укажи бюджет — тогда смогу подсказать, где перерасход.";
    return;
  }

  const totalAll = state.items.reduce((s,it)=>s + safeNumber(it.price), 0);
  const over = totalAll - budget;

  const row = (title, value)=>{
    const d = document.createElement("div");
    d.className="row";
    const t = document.createElement("div");
    t.className="title";
    t.textContent=title;
    const v = document.createElement("div");
    v.className="value";
    v.textContent=value;
    d.appendChild(t);
    d.appendChild(v);
    return d;
  };

  els.savingsBox.appendChild(row("Сумма всех товаров", money(totalAll)));
  els.savingsBox.appendChild(row("Бюджет", money(budget)));

  if(over<=0){
    els.savingsBox.appendChild(row("Перерасход", money(0)));
    const tip = document.createElement("div");
    tip.className="hint";
    tip.style.marginTop="10px";
    tip.textContent="Ты в бюджете. Отмечай покупки — и сайт покажет реальную сумму.";
    els.savingsBox.appendChild(tip);
    return;
  }

  els.savingsBox.appendChild(row("Перерасход", money(over)));

  const top = [...state.items].sort((a,b)=>safeNumber(b.price)-safeNumber(a.price)).slice(0,3);
  const tip = document.createElement("div");
  tip.className="hint";
  tip.style.marginTop="10px";
  tip.textContent="Начни экономию с самых дорогих позиций:";
  els.savingsBox.appendChild(tip);

  for(const it of top){
    els.savingsBox.appendChild(row(it.name, money(it.price)));
  }
}

function render(){
  applyUIFromState();
  renderList();
  compute();
}

function bind(){
  els.budgetInput.addEventListener("input", ()=>{
    state.budget = safeNumber(els.budgetInput.value);
    save();
    compute();
  });

  els.countOnlyBought.addEventListener("change", ()=>{
    state.countOnlyBought = !!els.countOnlyBought.checked;
    save();
    compute();
  });

  els.itemForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    const name = els.nameInput.value.trim();
    const price = safeNumber(els.priceInput.value);
    const category = els.categoryInput.value;
    const store = els.storeInput.value;
    if(!name) return;

    addItem({ name, price, category, store });

    els.nameInput.value="";
    els.priceInput.value="";
    els.storeInput.value="";
    els.nameInput.focus();
  });

  const uiHandler = ()=>{
    state.ui.search = els.searchInput.value;
    state.ui.sort = els.sortSelect.value;
    state.ui.filter = els.filterSelect.value;
    state.ui.group = els.groupSelect.value;
    save();
    render();
  };

  els.searchInput.addEventListener("input", uiHandler);
  els.sortSelect.addEventListener("change", uiHandler);
  els.filterSelect.addEventListener("change", uiHandler);
  els.groupSelect.addEventListener("change", uiHandler);

  els.addTemplateBtn.addEventListener("click", ()=>addTemplate());
  els.clearBoughtBtn.addEventListener("click", ()=>clearBought());

  els.resetBtn.addEventListener("click", ()=>{
    const ok = confirm("Точно сбросить всё? Бюджет и список удалятся.");
    if(!ok) return;
    state = structuredClone(defaultState);
    save();
    render();
  });
}

bind();
render();
