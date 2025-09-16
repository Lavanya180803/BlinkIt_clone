/* Simple Blinkit-like frontend: products, cart, filters, localStorage persistence.
   No frameworks. Modern vanilla JS (ES6+). */

const PRODUCTS = [
  {id: 'p1', name: 'Bananas (6 pcs)', category: 'Fruits', price: 39, desc: 'Fresh yellow bananas', img: 'images/bananas.jpg'},
  {id: 'p2', name: 'Milk 1L', category: 'Dairy', price: 50, desc: 'Toned milk 1 litre', img: 'images/milk.jpg'},
  {id: 'p3', name: 'Brown Bread', category: 'Bakery', price: 45, desc: 'Whole wheat bread', img: 'images/bread.jpg'},
  {id: 'p4', name: 'Tomatoes (500g)', category: 'Vegetables', price: 30, desc: 'Fresh tomatoes', img: 'images/tomatoes.jpg'},
  {id: 'p5', name: 'Eggs (6)', category: 'Dairy', price: 60, desc: 'Farm fresh eggs', img: 'images/eggs.jpg'},
  {id: 'p6', name: 'Apples (4 pcs)', category: 'Fruits', price: 120, desc: 'Crisp apples', img: 'images/apples.jpg'},
  {id: 'p7', name: 'Paneer 200g', category: 'Dairy', price: 90, desc: 'Cottage cheese', img: 'images/paneer.jpg'},
  {id: 'p8', name: 'Rice 5kg', category: 'Staples', price: 420, desc: 'Daily staple rice', img: 'images/rice.jpg'},
  {id: 'p9', name: 'Potatoes (1kg)', category: 'Vegetables', price: 28, desc: 'Farm potatoes', img: 'images/potatoes.jpg'},
  {id: 'p10', name: 'Chicken 500g', category: 'Meat', price: 220, desc: 'Fresh chicken', img: 'images/chicken.jpg'}
];

const state = {
  products: [...PRODUCTS],
  cart: {}, // {productId: qty}
  filters: {
    category: 'all',
    search: '',
    sort: 'featured'
  }
};

/* ---- DOM refs ---- */
const productsGrid = document.getElementById('productsGrid');
const categoryList = document.getElementById('categoryList');
const categorySelect = document.getElementById('categorySelect');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

const cartToggle = document.getElementById('cartToggle');
const cartSidebar = document.getElementById('cartSidebar');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartItemsDiv = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const subtotalEl = document.getElementById('subtotal');
const checkoutBtn = document.getElementById('checkoutBtn');

const checkoutModal = document.getElementById('checkoutModal');
const confirmCheckout = document.getElementById('confirmCheckout');
const cancelCheckout = document.getElementById('cancelCheckout');

const clearFiltersBtn = document.getElementById('clearFiltersBtn');

/* ---- Persistence ---- */
const LS_KEY = 'blinkit_demo_cart_v1';
function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      state.cart = parsed.cart || {};
    }
  }catch(e){
    console.warn('Failed to load local state', e);
  }
}
function saveState(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify({cart: state.cart}));
  }catch(e){
    console.warn('Failed to save state', e);
  }
}

/* ---- Utils ---- */
function currency(n){ return `₹${n.toFixed(2)}`; }
function getUniqueCategories(){
  const set = new Set(PRODUCTS.map(p=>p.category));
  return ['All', ...[...set]];
}

/* ---- Render functions ---- */
function renderCategories(){
  const cats = [...new Set(PRODUCTS.map(p=>p.category))];
  // populate sidebar list
  categoryList.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.textContent = 'All';
  allBtn.classList.toggle('active', state.filters.category === 'all');
  allBtn.addEventListener('click', ()=>{ setFilterCategory('all'); });
  categoryList.appendChild(allBtn);

  cats.forEach(cat=>{
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.classList.toggle('active', state.filters.category === cat.toLowerCase());
    btn.addEventListener('click', ()=>{ setFilterCategory(cat.toLowerCase()); });
    categoryList.appendChild(btn);
  });

  // populate header select
  categorySelect.innerHTML = `<option value="all">All categories</option>` +
    cats.map(c=>`<option value="${c.toLowerCase()}">${c}</option>`).join('');
  categorySelect.value = state.filters.category;
}

function applyFilters(){
  const s = state.filters.search.trim().toLowerCase();
  const c = state.filters.category;
  let res = PRODUCTS.filter(p=>{
    const matchCat = (c === 'all' || p.category.toLowerCase() === c);
    const matchSearch = p.name.toLowerCase().includes(s) || p.desc.toLowerCase().includes(s);
    return matchCat && matchSearch;
  });

  if(state.filters.sort === 'price-asc'){
    res.sort((a,b)=>a.price-b.price);
  } else if(state.filters.sort === 'price-desc'){
    res.sort((a,b)=>b.price-a.price);
  } // featured: default order

  state.products = res;
  renderProducts();
}

function renderProducts(){
  productsGrid.innerHTML = '';
  if(state.products.length === 0){
    productsGrid.innerHTML = '<p style="padding:20px;color:var(--muted)">No products found</p>';
    return;
  }

  state.products.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy" />
      <div class="meta">
        <h4>${escapeHtml(p.name)}</h4>
        <p>${escapeHtml(p.desc)}</p>
        <div class="price-row">
          <div class="price">${currency(p.price)}</div>
          <div class="muted" style="font-size:13px;color:var(--muted)"> • ${p.category}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn small" data-id="${p.id}" aria-label="Add ${escapeHtml(p.name)}">Add</button>
      </div>
    `;
    const btn = card.querySelector('button');
    btn.addEventListener('click', ()=> addToCart(p.id));
    productsGrid.appendChild(card);
  });
}

function escapeHtml(str){
  return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

/* ---- Cart functions ---- */
function addToCart(productId, qty = 1){
  state.cart[productId] = (state.cart[productId] || 0) + qty;
  saveState();
  renderCart();
  openCart();
}
function removeFromCart(productId){
  delete state.cart[productId];
  saveState();
  renderCart();
}
function updateQty(productId, qty){
  if(qty <= 0){ removeFromCart(productId); return; }
  state.cart[productId] = qty;
  saveState();
  renderCart();
}
function cartQuantity(){
  return Object.values(state.cart).reduce((s,n)=>s+n,0);
}
function cartSubtotal(){
  return Object.entries(state.cart).reduce((sum,[id,qty])=>{
    const p = PRODUCTS.find(x=>x.id===id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

function renderCart(){
  cartItemsDiv.innerHTML = '';
  const entries = Object.entries(state.cart);
  if(entries.length === 0){
    cartItemsDiv.innerHTML = '<p style="color:var(--muted);padding:12px">Your cart is empty. Add items to get started.</p>';
    cartCount.textContent = '0';
    subtotalEl.textContent = currency(0);
    return;
  }

  entries.forEach(([id, qty])=>{
    const p = PRODUCTS.find(x=>x.id===id);
    if(!p) return;
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.innerHTML = `
      <img src="${p.img}" alt="${escapeHtml(p.name)}" />
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${escapeHtml(p.name)}</strong><div style="font-size:13px;color:var(--muted)">${currency(p.price)} each</div></div>
          <button class="icon-btn remove" title="Remove item">🗑️</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <div class="qty-controls">
            <button class="decrease">−</button>
            <div style="min-width:32px;text-align:center">${qty}</div>
            <button class="increase">+</button>
          </div>
          <div style="font-weight:700">${currency(p.price * qty)}</div>
        </div>
      </div>
    `;
    // wire up buttons
    item.querySelector('.increase').addEventListener('click', ()=> updateQty(id, state.cart[id]+1));
    item.querySelector('.decrease').addEventListener('click', ()=> updateQty(id, state.cart[id]-1));
    item.querySelector('.remove').addEventListener('click', ()=> removeFromCart(id));
    cartItemsDiv.appendChild(item);
  });

  cartCount.textContent = String(cartQuantity());
  subtotalEl.textContent = currency(cartSubtotal());
}

/* ---- UI helpers ---- */
function openCart(){ cartSidebar.classList.add('open'); cartSidebar.setAttribute('aria-hidden','false'); }
function closeCart(){ cartSidebar.classList.remove('open'); cartSidebar.setAttribute('aria-hidden','true'); }
function toggleCart(){ cartSidebar.classList.toggle('open'); }

/* ---- Filters setters ---- */
function setFilterCategory(cat){
  state.filters.category = cat;
  categorySelect.value = cat;
  // update active buttons
  Array.from(categoryList.children).forEach(btn=>{
    btn.classList.toggle('active', btn.textContent.toLowerCase() === (cat === 'all' ? 'all' : cat));
  });
  applyFilters();
}
function setSearch(q){
  state.filters.search = q;
  applyFilters();
}
function setSort(s){
  state.filters.sort = s;
  applyFilters();
}

function clearFilters(){
  state.filters = {category:'all', search:'', sort:'featured'};
  searchInput.value = '';
  sortSelect.value = 'featured';
  categorySelect.value = 'all';
  renderCategories();
  applyFilters();
}

/* ---- Event bindings ---- */
function bindEvents(){
  searchInput.addEventListener('input', e=> setSearch(e.target.value));
  categorySelect.addEventListener('change', e=> setFilterCategory(e.target.value));
  sortSelect.addEventListener('change', e=> setSort(e.target.value));
  cartToggle.addEventListener('click', ()=> toggleCart());
  closeCartBtn.addEventListener('click', ()=> closeCart());
  checkoutBtn.addEventListener('click', ()=> showModal());
  confirmCheckout.addEventListener('click', ()=> {
    // demo checkout behavior: clear cart & show thanks
    state.cart = {};
    saveState();
    renderCart();
    hideModal();
    alert('Thank you! Your demo order is placed.');
    closeCart();
  });
  cancelCheckout.addEventListener('click', ()=> hideModal());
  clearFiltersBtn.addEventListener('click', clearFilters);

  // close modal if clicked outside content
  checkoutModal.addEventListener('click', (e)=>{
    if(e.target === checkoutModal) hideModal();
  });

  // keyboard escape
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') {
      hideModal();
      closeCart();
    }
  });
}

function showModal(){ checkoutModal.classList.add('show'); checkoutModal.setAttribute('aria-hidden','false'); }
function hideModal(){ checkoutModal.classList.remove('show'); checkoutModal.setAttribute('aria-hidden','true'); }

/* ---- Init ---- */
function init(){
  loadState();
  renderCategories();
  bindEvents();
  applyFilters();
  renderCart();
}

init();
