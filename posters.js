const POSTERS_STORAGE_KEY = 'focus-posters';
const USAGE_STORAGE_KEY = 'focus-usage';
const USAGE_TICK_SECONDS = 15;

const PRESET_POSTERS = [
  { id: 'preset-1', text: 'Small steps every day lead to big results.', sub: 'Keep going.', gradient: 'linear-gradient(135deg, #5f7a52, #3f5a42)' },
  { id: 'preset-2', text: 'Discipline is choosing what you want most over what you want now.', sub: '', gradient: 'linear-gradient(135deg, #a8624a, #7a4535)' },
  { id: 'preset-3', text: "You don't have to be perfect, just consistent.", sub: '', gradient: 'linear-gradient(135deg, #5a7290, #3d5066)' },
  { id: 'preset-4', text: 'Focus on progress, not perfection.', sub: '', gradient: 'linear-gradient(135deg, #8a7550, #5c4d35)' },
  { id: 'preset-5', text: 'One page a day is a book in a year.', sub: '', gradient: 'linear-gradient(135deg, #4a6b52, #324a3a)' },
  { id: 'preset-6', text: 'Rest, but never quit.', sub: '', gradient: 'linear-gradient(135deg, #6f5a7a, #4a3d52)' }
];

function getPostersData() {
  const raw = localStorage.getItem(POSTERS_STORAGE_KEY);
  let data = raw ? JSON.parse(raw) : null;
  if (!data) data = { customPosters: [], dashboardItems: [] };
  if (!data.customPosters) data.customPosters = [];
  if (!data.dashboardItems) {
    data.dashboardItems = [];
    if (data.featuredId) {
      data.dashboardItems.push({ instanceId: Date.now().toString(), type: 'poster', posterId: data.featuredId, x: 20, y: 20, width: 260, height: 180 });
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
    d.dashboardItems.push({ instanceId: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7), type: 'poster', posterId, x: 20, y: 20, width: 260, height: 180 });
  }
  savePostersData(d);
}

/* ---------- Usage tracking ---------- */

function getUsageData() {
  const data = localStorage.getItem(USAGE_STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

function saveUsageData(data) {
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(data));
}

function pad2(n) { return n.toString().padStart(2, '0'); }

function todayKey(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatUsageMinutes(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return totalMinutes + ' min';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins}m`;
}

setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  const data = getUsageData();
  const key = todayKey();
  data[key] = (data[key] || 0) + USAGE_TICK_SECONDS;
  saveUsageData(data);

  const todayValueEl = document.getElementById('dash-usage-today-value');
  if (todayValueEl) todayValueEl.textContent = formatUsageMinutes(data[key]);

  const chartValueEl = document.getElementById('dash-chart-value-today');
  if (chartValueEl) chartValueEl.textContent = Math.round(data[key] / 60) + 'm';
}, USAGE_TICK_SECONDS * 1000);

function buildUsageChartHtml() {
  const data = getUsageData();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const seconds = data[key] || 0;
    const minutes = Math.round(seconds / 60);
    days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), minutes, isToday: i === 0 });
  }
  const maxMinutes = Math.max(...days.map(d => d.minutes), 1);

  return days.map(d => {
    const heightPct = d.minutes > 0 ? Math.max((d.minutes / maxMinutes) * 100, 6) : 2;
    const idAttrs = d.isToday ? `id="dash-chart-bar-today"` : '';
    const valIdAttrs = d.isToday ? `id="dash-chart-value-today"` : '';
    return `
      <div class="dash-chart-col">
        <div class="dash-chart-value" ${valIdAttrs}>${d.minutes}m</div>
        <div class="dash-chart-bar${d.isToday ? ' today' : ''}" ${idAttrs} style="height: ${heightPct}%;"></div>
        <div class="dash-chart-label">${d.label}</div>
      </div>
    `;
  }).join('');
}

/* ---------- Live clock ---------- */

let dashClockInterval = null;

function startDashboardClock() {
  if (dashClockInterval) clearInterval(dashClockInterval);
  updateDashboardClock();
  dashClockInterval = setInterval(updateDashboardClock, 1000);
}

function updateDashboardClock() {
  const timeEl = document.getElementById('dash-clock-time');
  const dateEl = document.getElementById('dash-clock-date');
  if (!timeEl) {
    clearInterval(dashClockInterval);
    dashClockInterval = null;
    return;
  }
  const now = new Date();
  timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

/* ---------- Dashboard home ---------- */

function renderDashboardHome() {
  const sectionBody = document.getElementById('section-body');
  const data = getPostersData();
  const usageData = getUsageData();
  const todaySeconds = usageData[todayKey()] || 0;

  const attendanceData = getAttendanceData();
  let attendanceHtml = '';
  if (attendanceData.subjects.length === 0) {
    attendanceHtml = `<div class="dash-att-empty">No subjects tracked yet.</div>`;
  } else {
    attendanceHtml = `<div class="dash-att-mini-list">` + attendanceData.subjects.map(s => {
      const stats = calcSubjectStats(s);
      const cls = stats.percent >= 75 ? 'good' : 'warning';
      return `<div class="dash-att-mini-row"><span class="dash-att-mini-name">${s.name}</span><span class="dash-att-mini-pct ${cls}">${stats.percent}%</span></div>`;
    }).join('') + `</div>`;
  }

  sectionBody.innerHTML = `
    <div class="dash-top-row">
      <div class="dash-clock-card">
        <div class="dash-clock-time" id="dash-clock-time">--:--:--</div>
        <div class="dash-clock-date" id="dash-clock-date"></div>
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-title">Attendance Overview</div>
        ${attendanceHtml}
      </div>
      <div class="dash-stat-card">
        <div class="dash-stat-title">Time Spent Today</div>
        <div class="dash-usage-today-value" id="dash-usage-today-value">${formatUsageMinutes(todaySeconds)}</div>
        <div class="dash-usage-today-sub">Keep this tab open to track your focus time.</div>
      </div>
    </div>

    <div class="dash-chart-card">
      <div class="dash-chart-title">Time Spent — Last 7 Days</div>
      <div class="dash-chart-bars" id="dash-chart-bars">${buildUsageChartHtml()}</div>
    </div>

    <div class="dash-section-label">Your Board</div>
    <p class="tt-hint">Add posters from the Posters section, or add a sticky note right here. Drag (top bar) and resize (bottom-right corner) to design your dashboard.</p>
    <div class="nb-color-popup" id="dash-sticky-color-popup"></div>
    <button id="dash-add-sticky-btn" class="poster-add-btn">+ Add Sticky Note</button>
    <div class="dash-poster-board" id="dash-poster-board"></div>
  `;

  startDashboardClock();

  const board = document.getElementById('dash-poster-board');
  data.dashboardItems.forEach(item => createDashboardItemEl(item, board));

  const colorPopup = document.getElementById('dash-sticky-color-popup');
  document.getElementById('dash-add-sticky-btn').addEventListener('click', () => {
    if (colorPopup.style.display === 'flex') {
      colorPopup.style.display = 'none';
      return;
    }
    colorPopup.innerHTML = '';
    NOTE_COLORS.forEach(color => {
      const swatch = document.createElement('span');
      swatch.className = 'nb-popup-swatch';
      swatch.style.background = color;
      swatch.addEventListener('click', () => {
        colorPopup.style.display = 'none';
        const newItem = {
          instanceId: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 7),
          type: 'sticky', color, text: '', x: 20, y: 20, width: 200, height: 150
        };
        const d = getPostersData();
        d.dashboardItems.push(newItem);
        savePostersData(d);
        createDashboardItemEl(newItem, board);
      });
      colorPopup.appendChild(swatch);
    });
    colorPopup.style.display = 'flex';
  });
}

function createDashboardItemEl(item, board) {
  if (item.type === 'sticky') {
    createDashboardStickyEl(item, board);
  } else {
    createDashboardPosterEl(item, board);
  }
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

function createDashboardStickyEl(item, board) {
  const el = document.createElement('div');
  el.className = 'dash-poster-item dash-sticky-item';
  el.style.left = item.x + 'px';
  el.style.top = item.y + 'px';
  el.style.width = item.width + 'px';
  el.style.height = item.height + 'px';
  el.style.background = item.color;

  const header = document.createElement('div');
  header.className = 'dash-poster-item-header';

  const colorRow = document.createElement('div');
  colorRow.className = 'dash-sticky-colors';
  NOTE_COLORS.forEach(color => {
    const dot = document.createElement('span');
    dot.className = 'dash-sticky-color-dot';
    dot.style.background = color;
    dot.addEventListener('click', () => {
      el.style.background = color;
      updateDashboardItem(item.instanceId, { color });
    });
    colorRow.appendChild(dot);
  });

  const removeBtn = document.createElement('span');
  removeBtn.className = 'dash-poster-item-remove';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => {
    detachDashPosterObserver(el);
    el.remove();
    removeDashboardItem(item.instanceId);
  });

  header.appendChild(colorRow);
  header.appendChild(removeBtn);
  el.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dash-poster-item-body';
  body.contentEditable = true;
  body.innerText = item.text || '';
  body.addEventListener('input', () => {
    updateDashboardItem(item.instanceId, { text: body.innerText });
  });
  el.appendChild(body);

  board.appendChild(el);

  makeGenericDraggable(el, header, (x, y) => updateDashboardItem(item.instanceId, { x, y }));
  makeDashPosterResizable(el, (w, h) => updateDashboardItem(item.instanceId, { width: w, height: h }));
}

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