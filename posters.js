const POSTERS_STORAGE_KEY = 'focus-posters';

const PRESET_POSTERS = [
  { id: 'preset-1', text: 'Small steps every day lead to big results.', sub: 'Keep going.', gradient: 'linear-gradient(135deg, #2a1f4d, #1a3a3a)' },
  { id: 'preset-2', text: 'Discipline is choosing what you want most over what you want now.', sub: '', gradient: 'linear-gradient(135deg, #3a2a4d, #2a3a55)' },
  { id: 'preset-3', text: "You don't have to be perfect, just consistent.", sub: '', gradient: 'linear-gradient(135deg, #1f3a4d, #2a4d3a)' },
  { id: 'preset-4', text: 'Focus on progress, not perfection.', sub: '', gradient: 'linear-gradient(135deg, #4d2a3a, #3a2a55)' },
  { id: 'preset-5', text: 'One page a day is a book in a year.', sub: '', gradient: 'linear-gradient(135deg, #2a3a4d, #1f2a3a)' },
  { id: 'preset-6', text: 'Rest, but never quit.', sub: '', gradient: 'linear-gradient(135deg, #3a3a2a, #2a4d4d)' }
];

function getPostersData() {
  const raw = localStorage.getItem(POSTERS_STORAGE_KEY);
  let data = raw ? JSON.parse(raw) : null;
  if (!data) data = { customPosters: [], dashboardItems: [] };
  if (!data.customPosters) data.customPosters = [];
  if (!data.dashboardItems) {
    data.dashboardItems = [];
    if (data.featuredId) {
      data.dashboardItems.push({ instanceId: Date.now().toString(), posterId: data.featuredId, x: 20, y: 20, width: 260, height: 180 });
    }
  }
  delete data.featuredId;
  return data;
}

function savePostersData(data) {
  localStorage.setItem(POSTERS_STORAGE_KEY, JSON.stringify(data));
}

function findPosterById(id, data) {
  const preset = PRESET_POSTERS.find(p => p.id === id);
  if (preset) return { ...preset, type: 'quote' };
  const custom = data.customPosters.find(p => p.id === id);
  if (custom) return { ...custom, type: 'image' };
  return null;
}

function isOnDashboard(posterId) {
  return getPostersData().dashboardItems.some(i => i.posterId === posterId);
}

function toggleDashboard(posterId) {
  const d = getPostersData();
  const idx = d.dashboardItems.findIndex(i => i.posterId === posterId);
  if (idx !== -1) {
    d.dashboardItems.splice(idx, 1);
  } else {
    d.dashboardItems.push({ instanceId: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7), posterId, x: 20, y: 20, width: 260, height: 180 });
  }
  savePostersData(d);
}

function renderDashboardHome() {
  const sectionBody = document.getElementById('section-body');
  const data = getPostersData();

  sectionBody.innerHTML = `
    <p class="tt-hint">Add posters from the Posters section, then drag (top bar) and resize (bottom-right corner) them here to design your dashboard.</p>
    <div class="dash-poster-board" id="dash-poster-board"></div>
  `;

  const board = document.getElementById('dash-poster-board');
  data.dashboardItems.forEach(item => createDashboardPosterEl(item, board));
}

function createDashboardPosterEl(item, board) {
  const data = getPostersData();
  const poster = findPosterById(item.posterId, data);
  if (!poster) return;

  const el = document.createElement('div');
  el.className = 'dash-poster-item';
  el.style.left = item.x + 'px';
  el.style.top = item.y + 'px';
  el.style.width = item.width + 'px';
  el.style.height = item.height + 'px';

  const header = document.createElement('div');
  header.className = 'dash-poster-item-header';
  const removeBtn = document.createElement('span');
  removeBtn.className = 'dash-poster-item-remove';
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove from dashboard';
  removeBtn.addEventListener('click', () => {
    detachDashPosterObserver(el);
    el.remove();
    removeDashboardItem(item.instanceId);
  });
  header.appendChild(removeBtn);
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dash-poster-item-body';

  if (poster.type === 'image') {
    body.classList.add('has-image');
    body.innerHTML = `<img src="${poster.data}" alt="Poster">`;
  } else {
    body.style.background = poster.gradient;
    body.innerHTML = `
      <div class="dash-poster-item-quote">${poster.text}</div>
      ${poster.sub ? `<div class="dash-poster-item-sub">${poster.sub}</div>` : ''}
    `;
  }
  el.appendChild(body);

  board.appendChild(el);

  makeGenericDraggable(el, header, (x, y) => updateDashboardItem(item.instanceId, { x, y }));
  makeDashPosterResizable(el, (w, h) => updateDashboardItem(item.instanceId, { width: w, height: h }));
}

// Dedicated resize tracker for dashboard posters — ignores zero-size readings,
// which happen when an element is removed/re-rendered, so we never overwrite
// a valid saved size with a bogus 0x0 reading.
const dashPosterObservers = new WeakMap();

function makeDashPosterResizable(el, onResize) {
  const observer = new ResizeObserver(() => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w === 0 || h === 0) return;
    onResize(w, h);
  });
  observer.observe(el);
  dashPosterObservers.set(el, observer);
}

function detachDashPosterObserver(el) {
  const observer = dashPosterObservers.get(el);
  if (observer) {
    observer.disconnect();
    dashPosterObservers.delete(el);
  }
}

function updateDashboardItem(instanceId, changes) {
  const d = getPostersData();
  const idx = d.dashboardItems.findIndex(i => i.instanceId === instanceId);
  if (idx !== -1) {
    d.dashboardItems[idx] = { ...d.dashboardItems[idx], ...changes };
    savePostersData(d);
  }
}

function removeDashboardItem(instanceId) {
  const d = getPostersData();
  d.dashboardItems = d.dashboardItems.filter(i => i.instanceId !== instanceId);
  savePostersData(d);
}

function renderPosters() {
  const sectionBody = document.getElementById('section-body');
  const data = getPostersData();

  sectionBody.innerHTML = `
    <input type="file" id="poster-upload-input" accept="image/*" style="display:none;">
    <button id="poster-add-btn" class="poster-add-btn">+ Add Custom Poster</button>
    <div class="poster-grid" id="poster-grid"></div>
  `;

  const grid = document.getElementById('poster-grid');

  PRESET_POSTERS.forEach(poster => {
    const card = document.createElement('div');
    card.className = 'poster-card';
    card.style.background = poster.gradient;
    const onDash = isOnDashboard(poster.id);
    card.innerHTML = `
      <div class="poster-card-actions">
        <button class="poster-action-btn${onDash ? ' featured' : ''}">${onDash ? '★ On Dashboard' : '☆ Add to Dashboard'}</button>
      </div>
      <div class="poster-card-overlay">
        <div class="poster-quote-text">${poster.text}</div>
        ${poster.sub ? `<div class="poster-quote-sub">${poster.sub}</div>` : ''}
      </div>
    `;
    card.querySelector('.poster-action-btn').addEventListener('click', () => {
      toggleDashboard(poster.id);
      renderPosters();
    });
    grid.appendChild(card);
  });

  data.customPosters.forEach(poster => {
    const card = document.createElement('div');
    card.className = 'poster-card';
    const onDash = isOnDashboard(poster.id);
    card.innerHTML = `
      <img src="${poster.data}" alt="Custom poster">
      <div class="poster-card-actions">
        <button class="poster-action-btn${onDash ? ' featured' : ''}">${onDash ? '★ On Dashboard' : '☆ Add to Dashboard'}</button>
        <button class="poster-action-btn poster-delete-btn">Delete</button>
      </div>
    `;
    card.querySelector('.poster-action-btn').addEventListener('click', () => {
      toggleDashboard(poster.id);
      renderPosters();
    });
    card.querySelector('.poster-delete-btn').addEventListener('click', () => {
      if (!confirm('Delete this poster?')) return;
      const d = getPostersData();
      d.customPosters = d.customPosters.filter(p => p.id !== poster.id);
      d.dashboardItems = d.dashboardItems.filter(i => i.posterId !== poster.id);
      savePostersData(d);
      renderPosters();
    });
    grid.appendChild(card);
  });

  document.getElementById('poster-add-btn').addEventListener('click', () => {
    document.getElementById('poster-upload-input').click();
  });

  document.getElementById('poster-upload-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const d = getPostersData();
      d.customPosters.push({ id: Date.now().toString(), data: reader.result });
      savePostersData(d);
      renderPosters();
    };
    reader.readAsDataURL(file);
  });
}