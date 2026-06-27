const ATTENDANCE_STORAGE_KEY = 'focus-attendance';

function getAttendanceData() {
  const data = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
  return data ? JSON.parse(data) : { subjects: [] };
}

function saveAttendanceData(data) {
  localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(data));
}

function calcSubjectStats(subject) {
  let present = 0, absent = 0;
  Object.values(subject.records || {}).forEach(status => {
    if (status === 'present') present++;
    else if (status === 'absent') absent++;
  });
  const total = present + absent;
  const percent = total === 0 ? 0 : Math.round((present / total) * 100);
  return { present, absent, percent };
}

function renderAttendance() {
  const sectionBody = document.getElementById('section-body');
  const data = getAttendanceData();

  let totalPresent = 0, totalAbsent = 0;
  data.subjects.forEach(s => {
    const stats = calcSubjectStats(s);
    totalPresent += stats.present;
    totalAbsent += stats.absent;
  });
  const totalAll = totalPresent + totalAbsent;
  const overallPercent = totalAll === 0 ? 0 : Math.round((totalPresent / totalAll) * 100);

  sectionBody.innerHTML = `
    <div class="att-summary">
      <div class="att-summary-card">
        <div class="att-summary-label">Overall Attendance</div>
        <div class="att-summary-value ${overallPercent >= 75 ? 'good' : 'warning'}">${overallPercent}%</div>
      </div>
      <div class="att-summary-card">
        <div class="att-summary-label">Subjects Tracked</div>
        <div class="att-summary-value">${data.subjects.length}</div>
      </div>
    </div>
    <button id="add-subject-att-btn" class="nb-btn">+ Add Subject</button>
    <div class="att-subject-list" id="att-subject-list"></div>
  `;

  const list = document.getElementById('att-subject-list');

  data.subjects.forEach(subject => {
    const stats = calcSubjectStats(subject);
    const ringColor = stats.percent >= 75 ? '#6fae8a' : '#c97f7f';
    const row = document.createElement('div');
    row.className = 'att-subject-row';
    row.innerHTML = `
      <div class="att-subject-left">
        <div class="att-circle" style="background: conic-gradient(${ringColor} ${stats.percent * 3.6}deg, var(--border) 0deg)">
          <div class="att-circle-inner">${stats.percent}%</div>
        </div>
        <div>
          <div class="att-subject-name">${subject.name}</div>
          <div class="att-subject-meta">${stats.present} present · ${stats.absent} absent</div>
        </div>
      </div>
      <button class="att-delete-btn" title="Delete subject">×</button>
    `;

    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('att-delete-btn')) return;
      renderAttendanceCalendar(subject.id);
    });

    row.querySelector('.att-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${subject.name}" from attendance tracking? This removes all its records.`)) return;
      const d = getAttendanceData();
      d.subjects = d.subjects.filter(s => s.id !== subject.id);
      saveAttendanceData(d);
      renderAttendance();
    });

    list.appendChild(row);
  });

  document.getElementById('add-subject-att-btn').addEventListener('click', () => {
    const name = prompt('Subject name:');
    if (!name) return;
    const d = getAttendanceData();
    d.subjects.push({ id: Date.now().toString(), name, records: {} });
    saveAttendanceData(d);
    renderAttendance();
  });
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function pad(n) { return n.toString().padStart(2, '0'); }

function renderAttendanceCalendar(subjectId, year, month) {
  const data = getAttendanceData();
  const subject = data.subjects.find(s => s.id === subjectId);
  if (!subject) return renderAttendance();

  const today = new Date();
  if (year === undefined) year = today.getFullYear();
  if (month === undefined) month = today.getMonth();

  const sectionBody = document.getElementById('section-body');

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: daysInPrevMonth - firstDay + 1 + i, empty: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, empty: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, empty: true });
  }

  const stats = calcSubjectStats(subject);

  sectionBody.innerHTML = `
    <button class="nb-back-btn" id="att-back-btn">← Attendance</button>
    <h3 class="nb-subtitle">${subject.name}</h3>
    <div class="att-cal-header">
      <div class="att-cal-nav">
        <button class="att-cal-nav-btn" id="att-prev-month">‹</button>
        <span class="att-cal-month-label">${MONTH_NAMES[month].toUpperCase()} ${year}</span>
        <button class="att-cal-nav-btn" id="att-next-month">›</button>
      </div>
    </div>
    <div class="att-cal-grid" id="att-cal-grid">
      ${WEEKDAY_NAMES.map(w => `<div class="att-cal-weekday">${w}</div>`).join('')}
    </div>
    <div class="att-cal-legend">
      <span class="att-legend-item"><span class="att-legend-dot present"></span>Present</span>
      <span class="att-legend-item"><span class="att-legend-dot absent"></span>Absent</span>
      <span class="att-legend-item"><span class="att-legend-dot holiday"></span>Holiday</span>
      <span>Click a date to cycle status</span>
    </div>
    <div class="att-cal-footer">
      <div class="att-footer-stat">
        <span class="att-footer-label">Present</span>
        <span class="att-footer-value">${stats.present}</span>
      </div>
      <div class="att-footer-stat">
        <span class="att-footer-label">Absent</span>
        <span class="att-footer-value">${stats.absent}</span>
      </div>
      <div class="att-footer-stat">
        <span class="att-footer-label">Percentage</span>
        <span class="att-footer-value ${stats.percent >= 75 ? 'good' : 'warning'}">${stats.percent}%</span>
      </div>
    </div>
  `;

  document.getElementById('att-back-btn').addEventListener('click', renderAttendance);

  document.getElementById('att-prev-month').addEventListener('click', () => {
    let m = month - 1, y = year;
    if (m < 0) { m = 11; y--; }
    renderAttendanceCalendar(subjectId, y, m);
  });

  document.getElementById('att-next-month').addEventListener('click', () => {
    let m = month + 1, y = year;
    if (m > 11) { m = 0; y++; }
    renderAttendanceCalendar(subjectId, y, m);
  });

  const grid = document.getElementById('att-cal-grid');
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  cells.forEach(cell => {
    const cellEl = document.createElement('div');

    if (cell.empty) {
      cellEl.className = 'att-cal-cell empty';
      cellEl.textContent = cell.day;
      grid.appendChild(cellEl);
      return;
    }

    const dateStr = `${year}-${pad(month + 1)}-${pad(cell.day)}`;
    const status = subject.records[dateStr];
    cellEl.className = 'att-cal-cell' + (status ? ` ${status}` : '') + (isToday(cell.day) ? ' today' : '');
    cellEl.textContent = cell.day;

    cellEl.addEventListener('click', () => {
      const d = getAttendanceData();
      const s = d.subjects.find(s => s.id === subjectId);
      const current = s.records[dateStr];
      let next;
      if (!current) next = 'present';
      else if (current === 'present') next = 'absent';
      else if (current === 'absent') next = 'holiday';
      else next = null;

      if (next === null) delete s.records[dateStr];
      else s.records[dateStr] = next;

      saveAttendanceData(d);
      renderAttendanceCalendar(subjectId, year, month);
    });

    grid.appendChild(cellEl);
  });
}