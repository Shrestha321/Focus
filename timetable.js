const TIMETABLE_STORAGE_KEY = 'focus-timetable';
const TT_DAYS = [
  { label: 'MON', value: 1 },
  { label: 'TUE', value: 2 },
  { label: 'WED', value: 3 },
  { label: 'THU', value: 4 },
  { label: 'FRI', value: 5 },
  { label: 'SAT', value: 6 },
  { label: 'SUN', value: 0 }
];
const TT_START_HOUR = 7;
const TT_END_HOUR = 21;
const TT_COLORS = ['#5b6f8a', '#5b8a6f', '#8a5b6f', '#8a7a5b', '#6f5b8a'];

function getTimetableData() {
  const data = localStorage.getItem(TIMETABLE_STORAGE_KEY);
  return data ? JSON.parse(data) : { classes: [], notified: {} };
}

function saveTimetableData(data) {
  localStorage.setItem(TIMETABLE_STORAGE_KEY, JSON.stringify(data));
}

function formatHour(h) {
  const period = h >= 12 ? 'PM' : 'AM';
  let displayHour = h % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour} ${period}`;
}

function renderTimetable() {
  const sectionBody = document.getElementById('section-body');
  const data = getTimetableData();
  const totalRows = TT_END_HOUR - TT_START_HOUR;
  const todayValue = new Date().getDay();

  let gridHtml = `<div class="tt-grid" id="tt-grid" style="grid-template-columns: 70px repeat(7, 1fr); grid-template-rows: 40px repeat(${totalRows}, 56px);">`;
  gridHtml += `<div class="tt-cell tt-corner"></div>`;
  TT_DAYS.forEach(d => {
    const isToday = d.value === todayValue;
    gridHtml += `<div class="tt-cell tt-day-header${isToday ? ' tt-today-col' : ''}">${d.label}</div>`;
  });
  for (let h = TT_START_HOUR; h < TT_END_HOUR; h++) {
    const rowIdx = h - TT_START_HOUR + 2;
    gridHtml += `<div class="tt-cell tt-time-label" style="grid-column: 1; grid-row: ${rowIdx};">${formatHour(h)}</div>`;
    TT_DAYS.forEach((d, colIdx) => {
      gridHtml += `<div class="tt-cell tt-slot" data-day="${d.value}" data-hour="${h}" style="grid-column: ${colIdx + 2}; grid-row: ${rowIdx};"></div>`;
    });
  }
  gridHtml += `</div>`;

  sectionBody.innerHTML = `
    <p class="tt-hint">Click an empty slot to add a class. Reminders notify you 10 minutes before class starts — only while this tab stays open in your browser.</p>
    <div class="tt-color-popup" id="tt-color-popup"></div>
    ${gridHtml}
  `;

  const grid = document.getElementById('tt-grid');

  data.classes.forEach(cls => renderClassBlock(cls, grid));

  grid.querySelectorAll('.tt-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const day = parseInt(slot.dataset.day);
      const hour = parseInt(slot.dataset.hour);
      openAddClassFlow(day, hour, grid);
    });
  });

  requestNotificationPermission();
}

function openAddClassFlow(day, hour, grid) {
  const name = prompt('Class / Subject name:');
  if (!name) return;

  let duration = parseInt(prompt('Duration in hours (1-4):', '1'));
  if (!duration || duration < 1) duration = 1;
  if (duration > 4) duration = 4;
  if (hour + duration > TT_END_HOUR) duration = TT_END_HOUR - hour;

  const location = prompt('Location / notes (optional):') || '';

  const popup = document.getElementById('tt-color-popup');
  popup.innerHTML = '';
  popup.style.display = 'flex';
  TT_COLORS.forEach(color => {
    const swatch = document.createElement('span');
    swatch.className = 'nb-popup-swatch';
    swatch.style.background = color;
    swatch.title = 'Use this color';
    swatch.addEventListener('click', () => {
      popup.style.display = 'none';
      const newClass = { id: Date.now().toString(), day, startHour: hour, duration, name, location, color };
      const d = getTimetableData();
      d.classes.push(newClass);
      saveTimetableData(d);
      renderClassBlock(newClass, grid);
    });
    popup.appendChild(swatch);
  });
}

function renderClassBlock(cls, grid) {
  const colIdx = TT_DAYS.findIndex(d => d.value === cls.day);
  if (colIdx === -1) return;
  const rowStart = cls.startHour - TT_START_HOUR + 2;
  const rowEnd = rowStart + cls.duration;

  const block = document.createElement('div');
  block.className = 'tt-class-block';
  block.style.gridColumn = colIdx + 2;
  block.style.gridRow = `${rowStart} / ${rowEnd}`;
  block.style.background = cls.color;
  block.innerHTML = `
    <span class="tt-class-delete">×</span>
    <div class="tt-class-name">${cls.name}</div>
    ${cls.location ? `<div class="tt-class-location">${cls.location}</div>` : ''}
  `;

  block.querySelector('.tt-class-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!confirm(`Delete "${cls.name}" from timetable?`)) return;
    const d = getTimetableData();
    d.classes = d.classes.filter(c => c.id !== cls.id);
    saveTimetableData(d);
    block.remove();
  });

  grid.appendChild(block);
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

setInterval(() => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const data = getTimetableData();
  const now = new Date();
  const todayDay = now.getDay();
  const todayKey = now.toISOString().slice(0, 10);

  data.classes.forEach(cls => {
    if (cls.day !== todayDay) return;
    const classStart = new Date(now);
    classStart.setHours(cls.startHour, 0, 0, 0);
    const diffMinutes = (classStart - now) / 60000;

    const notifyKey = `${cls.id}-${todayKey}`;
    if (diffMinutes > 0 && diffMinutes <= 10 && !data.notified[notifyKey]) {
      new Notification('Upcoming class: ' + cls.name, {
        body: `Starts at ${formatHour(cls.startHour)}${cls.location ? ' · ' + cls.location : ''}`
      });
      data.notified[notifyKey] = true;
      saveTimetableData(data);
    }
  });
}, 30000);