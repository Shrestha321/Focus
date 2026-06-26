const PINS_STORAGE_KEY = 'focus-pins';
const PIN_TYPE_ICON = { notebook: '📓', sticky: '📌', roadmap: '🎯' };

function getPinsData() {
  const data = localStorage.getItem(PINS_STORAGE_KEY);
  return data ? JSON.parse(data) : { items: [] };
}

function savePinsData(data) {
  localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(data));
}

function isPinned(pinId) {
  return getPinsData().items.some(p => p.id === pinId);
}

function togglePin(pinId, itemData) {
  const data = getPinsData();
  const idx = data.items.findIndex(p => p.id === pinId);
  if (idx !== -1) {
    data.items.splice(idx, 1);
    savePinsData(data);
    return false;
  }
  data.items.unshift({ id: pinId, ...itemData, pinnedAt: Date.now() });
  savePinsData(data);
  return true;
}

function unpinById(pinId) {
  const data = getPinsData();
  data.items = data.items.filter(p => p.id !== pinId);
  savePinsData(data);
}

function getPinDisplayLabel(item) {
  if (item.type === 'sticky') {
    const note = getStickyNotes().find(n => n.id === item.noteId);
    if (!note) return { label: 'Sticky note (deleted)', sub: '', missing: true };
    const text = note.text ? note.text.trim() : '';
    return { label: text ? text.slice(0, 40) : 'Sticky Note', sub: '' };
  }
  if (item.type === 'notebook') {
    const data = getNotebookData();
    const subject = data.subjects.find(s => s.id === item.subjectId);
    const chapter = subject && subject.chapters.find(c => c.id === item.chapterId);
    if (!chapter) return { label: 'Chapter (deleted)', sub: '', missing: true };
    return { label: chapter.name, sub: subject.name };
  }
  if (item.type === 'roadmap') {
    const data = getRoadmapData();
    const goal = data.goals.find(g => g.id === item.goalId);
    if (!goal) return { label: 'Goal (deleted)', sub: '', missing: true };
    return { label: goal.title, sub: goal.deadline ? 'Due ' + formatDate(goal.deadline) : '' };
  }
  return { label: 'Item', sub: '', missing: true };
}

function renderPins() {
  const sectionBody = document.getElementById('section-body');
  const data = getPinsData();

  if (data.items.length === 0) {
    sectionBody.innerHTML = `<div class="pin-empty">No pins yet. Pin a notebook chapter, sticky note, or roadmap goal to see it here for quick access.</div>`;
    return;
  }

  sectionBody.innerHTML = `<div class="pin-list" id="pin-list"></div>`;
  const list = document.getElementById('pin-list');

  data.items.forEach(item => {
    const display = getPinDisplayLabel(item);
    const row = document.createElement('div');
    row.className = 'pin-row' + (display.missing ? ' pin-missing' : '');
    row.innerHTML = `
      <span class="pin-icon">${PIN_TYPE_ICON[item.type] || '📍'}</span>
      <div class="pin-body">
        <div class="pin-title">${display.label}</div>
        ${display.sub ? `<div class="pin-sub">${display.sub}</div>` : ''}
      </div>
      <button class="pin-unpin-btn" title="Unpin">×</button>
    `;

    if (!display.missing) {
      row.querySelector('.pin-body').addEventListener('click', () => openPinTarget(item));
      row.querySelector('.pin-icon').addEventListener('click', () => openPinTarget(item));
    }

    row.querySelector('.pin-unpin-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      unpinById(item.id);
      renderPins();
    });

    list.appendChild(row);
  });
}

function openPinTarget(item) {
  const sectionMap = { notebook: 'notebook', sticky: 'sticky', roadmap: 'roadmap' };
  const targetSection = sectionMap[item.type];
  if (targetSection) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[data-section="${targetSection}"]`);
    if (navEl) {
      navEl.classList.add('active');
      document.getElementById('section-title').textContent = navEl.textContent.trim();
    }
  }

  if (item.type === 'notebook') {
    renderChapterEditor(item.subjectId, item.chapterId);
  } else if (item.type === 'sticky') {
    renderStickyNotes();
    setTimeout(() => {
      const noteEl = document.querySelector(`.sticky-note[data-id="${item.noteId}"]`);
      if (noteEl) {
        noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        noteEl.style.outline = '3px solid #ffd43b';
        setTimeout(() => { noteEl.style.outline = 'none'; }, 1500);
      }
    }, 50);
  } else if (item.type === 'roadmap') {
    renderGoalCanvas(item.goalId);
  }
}