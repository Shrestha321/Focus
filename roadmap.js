const ROADMAP_STORAGE_KEY = 'focus-roadmap';

// Nude/pastel palette for boxes — border + soft matching background
const BOX_COLORS = ['#c98a6b', '#8aa88a', '#c98a9a', '#c9b28a', '#a89ac9'];
const BOX_BG_MAP = {
  '#c98a6b': '#f7ebe3',
  '#8aa88a': '#edf2ea',
  '#c98a9a': '#f7eaee',
  '#c9b28a': '#f7f0e3',
  '#a89ac9': '#efeaf7'
};

// Arrow color palette (kept separate from box colors)
const SHAPE_COLORS = ['#5b6f8a', '#5b8a6f', '#8a5b6f', '#8a7a5b', '#6f5b8a'];

function getBoxBg(color) {
  return BOX_BG_MAP[color] || '#f0f0f0';
}

function getRoadmapData() {
  const data = localStorage.getItem(ROADMAP_STORAGE_KEY);
  return data ? JSON.parse(data) : { goals: [] };
}

function saveRoadmapData(data) {
  localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(data));
}

function getDeadlineStatus(deadline) {
  if (!deadline) return { label: '', cls: '' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { label: `Overdue · ${formatDate(deadline)}`, cls: 'overdue' };
  if (diffDays === 0) return { label: `Due today · ${formatDate(deadline)}`, cls: 'today' };
  if (diffDays === 1) return { label: `Due tomorrow · ${formatDate(deadline)}`, cls: '' };
  return { label: `Due ${formatDate(deadline)} (${diffDays} days)`, cls: '' };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderRoadmap() {
  const sectionBody = document.getElementById('section-body');
  const data = getRoadmapData();

  const total = data.goals.length;
  const completed = data.goals.filter(g => g.done).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  sectionBody.innerHTML = `
    <div class="rm-add-bar">
      <input type="text" id="rm-title-input" class="rm-input rm-input-title" placeholder="Goal or task name...">
      <input type="date" id="rm-deadline-input" class="rm-input">
      <button id="rm-add-btn" class="nb-btn" style="margin-bottom:0;">+ Add</button>
    </div>
    <div class="rm-progress-wrap">
      <div class="rm-progress-label">
        <span>Progress</span>
        <span>${completed} / ${total} completed (${percent}%)</span>
      </div>
      <div class="rm-progress-bar-bg">
        <div class="rm-progress-bar-fill" style="width: ${percent}%;"></div>
      </div>
    </div>
    <div class="rm-list" id="rm-list"></div>
  `;

  const list = document.getElementById('rm-list');

  if (data.goals.length === 0) {
    list.innerHTML = `<div class="rm-empty">No goals yet — add your first one above.</div>`;
  } else {
    const sorted = [...data.goals].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

    sorted.forEach(goal => {
      const status = getDeadlineStatus(goal.deadline);
      const item = document.createElement('div');
      item.className = 'rm-item' + (goal.done ? ' done' : '');
      item.innerHTML = `
        <input type="checkbox" class="rm-checkbox" ${goal.done ? 'checked' : ''}>
        <div class="rm-item-body">
          <div class="rm-item-title">${goal.title}</div>
          ${goal.deadline ? `<div class="rm-item-deadline ${status.cls}">${status.label}</div>` : ''}
        </div>
        <button class="rm-item-delete">×</button>
      `;

      item.querySelector('.rm-checkbox').addEventListener('change', (e) => {
        const d = getRoadmapData();
        const g = d.goals.find(g => g.id === goal.id);
        g.done = e.target.checked;
        saveRoadmapData(d);
        renderRoadmap();
      });

      item.querySelector('.rm-item-delete').addEventListener('click', () => {
        if (!confirm(`Delete "${goal.title}"?`)) return;
        const d = getRoadmapData();
        d.goals = d.goals.filter(g => g.id !== goal.id);
        saveRoadmapData(d);
        renderRoadmap();
      });

      item.querySelector('.rm-item-body').addEventListener('click', () => {
        renderGoalCanvas(goal.id);
      });

      list.appendChild(item);
    });
  }

  document.getElementById('rm-add-btn').addEventListener('click', () => {
    const titleInput = document.getElementById('rm-title-input');
    const deadlineInput = document.getElementById('rm-deadline-input');
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }
    const d = getRoadmapData();
    d.goals.push({
      id: Date.now().toString(),
      title,
      deadline: deadlineInput.value || null,
      done: false,
      notes: '',
      shapes: []
    });
    saveRoadmapData(d);
    renderRoadmap();
  });

  document.getElementById('rm-title-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('rm-add-btn').click();
  });
}

function renderGoalCanvas(goalId) {
  const sectionBody = document.getElementById('section-body');
  const data = getRoadmapData();
  const goal = data.goals.find(g => g.id === goalId);
  if (!goal) return renderRoadmap();
  if (!goal.shapes) goal.shapes = [];
  if (goal.notes === undefined) goal.notes = '';
  saveRoadmapData(data);

  sectionBody.innerHTML = `
    <button class="nb-back-btn" id="rm-canvas-back">← Roadmap</button>
    <h3 class="nb-subtitle">${goal.title}</h3>
    <div class="nb-toolbar" id="rm-toolbar">
      <select id="rm-font-select" class="nb-select"></select>
      <select id="rm-size-select" class="nb-select"></select>
      <div class="nb-color-group" id="rm-text-color-group"></div>
      <div class="nb-color-group" id="rm-highlight-color-group"></div>
      <button id="rm-clear-highlight-btn" class="nb-clear-btn">Clear Highlight</button>
      <button id="rm-add-box-btn" class="nb-btn nb-btn-small">+ Box</button>
      <button id="rm-add-arrow-btn" class="nb-btn nb-btn-small">+ Arrow</button>
    </div>
    <div class="nb-color-popup" id="rm-shape-color-popup"></div>
    <div class="nb-page-wrapper">
      <div class="nb-editor" id="rm-editor" contenteditable="true">${goal.notes}</div>
      <div class="rm-shape-layer" id="rm-shape-layer"></div>
    </div>
  `;

  document.getElementById('rm-canvas-back').addEventListener('click', renderRoadmap);

  const editor = document.getElementById('rm-editor');
  document.execCommand('styleWithCSS', false, true);

  let savedRange = null;
  function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  }
  function restoreSelection() {
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
  }
  editor.addEventListener('mouseup', saveSelection);
  editor.addEventListener('keyup', saveSelection);

  function applyCommand(command, value) {
    editor.focus();
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
    saveSelection();
  }

  const fontSelect = document.getElementById('rm-font-select');
  FONT_OPTIONS.forEach(font => {
    const opt = document.createElement('option');
    opt.value = font;
    opt.textContent = font;
    opt.style.fontFamily = font;
    fontSelect.appendChild(opt);
  });
  fontSelect.addEventListener('change', () => applyCommand('fontName', fontSelect.value));

  const sizeSelect = document.getElementById('rm-size-select');
  SIZE_OPTIONS.forEach(size => {
    const opt = document.createElement('option');
    opt.value = size.value;
    opt.textContent = size.label;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.addEventListener('change', () => applyCommand('fontSize', sizeSelect.value));

  const textColorGroup = document.getElementById('rm-text-color-group');
  TEXT_COLORS.forEach(color => {
    const dot = document.createElement('span');
    dot.className = 'nb-color-dot';
    dot.style.background = color;
    dot.title = 'Text color';
    dot.addEventListener('click', () => applyCommand('foreColor', color));
    textColorGroup.appendChild(dot);
  });

  const highlightGroup = document.getElementById('rm-highlight-color-group');
  HIGHLIGHT_COLORS.forEach(color => {
    const dot = document.createElement('span');
    dot.className = 'nb-color-dot';
    dot.style.background = color;
    dot.title = 'Highlight';
    dot.addEventListener('click', () => applyCommand('hiliteColor', color));
    highlightGroup.appendChild(dot);
  });

  document.getElementById('rm-clear-highlight-btn').addEventListener('click', () => applyCommand('hiliteColor', 'transparent'));

  editor.addEventListener('input', () => {
    const d = getRoadmapData();
    const g = d.goals.find(g => g.id === goalId);
    g.notes = editor.innerHTML;
    saveRoadmapData(d);
  });

  const shapeLayer = document.getElementById('rm-shape-layer');
  goal.shapes.forEach(shape => createShapeElement(shape, shapeLayer, goalId));

  const colorPopup = document.getElementById('rm-shape-color-popup');

  function openColorPopup(palette, onPick) {
    if (colorPopup.style.display === 'flex') {
      colorPopup.style.display = 'none';
      return;
    }
    colorPopup.innerHTML = '';
    palette.forEach(color => {
      const swatch = document.createElement('span');
      swatch.className = 'nb-popup-swatch';
      swatch.style.background = color;
      swatch.addEventListener('click', () => {
        colorPopup.style.display = 'none';
        onPick(color);
      });
      colorPopup.appendChild(swatch);
    });
    colorPopup.style.display = 'flex';
  }

  document.getElementById('rm-add-box-btn').addEventListener('click', () => {
    openColorPopup(BOX_COLORS, (color) => {
      const newShape = { id: Date.now().toString(), type: 'box', x: 30, y: 30, width: 160, height: 100, color, text: '' };
      const d = getRoadmapData();
      const g = d.goals.find(g => g.id === goalId);
      g.shapes.push(newShape);
      saveRoadmapData(d);
      createShapeElement(newShape, shapeLayer, goalId);
    });
  });

  document.getElementById('rm-add-arrow-btn').addEventListener('click', () => {
    openColorPopup(SHAPE_COLORS, (color) => {
      const newShape = { id: Date.now().toString(), type: 'arrow', x: 30, y: 160, width: 160, height: 40, color, rotation: 0 };
      const d = getRoadmapData();
      const g = d.goals.find(g => g.id === goalId);
      g.shapes.push(newShape);
      saveRoadmapData(d);
      createShapeElement(newShape, shapeLayer, goalId);
    });
  });
}

function createShapeElement(shape, layer, goalId) {
  const el = document.createElement('div');
  el.className = 'rm-shape ' + (shape.type === 'box' ? 'rm-shape-box' : 'rm-shape-arrow');
  el.style.left = shape.x + 'px';
  el.style.top = shape.y + 'px';
  el.style.width = shape.width + 'px';
  el.style.height = shape.height + 'px';

  if (shape.type === 'box') {
    el.style.borderColor = shape.color;
    el.style.background = getBoxBg(shape.color);

    const header = document.createElement('div');
    header.className = 'rm-shape-header';

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'rm-shape-delete';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', () => {
      el.remove();
      deleteShape(goalId, shape.id);
    });
    header.appendChild(deleteBtn);
    el.appendChild(header);

    const textDiv = document.createElement('div');
    textDiv.className = 'rm-shape-text';
    textDiv.contentEditable = true;
    textDiv.innerText = shape.text || '';
    textDiv.addEventListener('input', () => {
      updateShape(goalId, shape.id, { text: textDiv.innerText });
    });
    el.appendChild(textDiv);

    layer.appendChild(el);
    makeGenericDraggable(el, header, (x, y) => updateShape(goalId, shape.id, { x, y }));
    makeGenericResizable(el, (w, h) => updateShape(goalId, shape.id, { width: w, height: h }));

  } else {
    if (shape.rotation) {
      el.style.transform = `rotate(${shape.rotation}deg)`;
    }

    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'rm-arrow-delete';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      deleteShape(goalId, shape.id);
    });
    el.appendChild(deleteBtn);

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgEl.setAttribute('viewBox', '0 0 100 20');
    svgEl.setAttribute('preserveAspectRatio', 'none');
    svgEl.innerHTML = `
      <line x1="2" y1="10" x2="85" y2="10" stroke="${shape.color}" stroke-width="3"/>
      <polygon points="80,2 98,10 80,18" fill="${shape.color}"/>
    `;
    el.appendChild(svgEl);

    layer.appendChild(el);
    makeArrowInteraction(el, shape, goalId);
    makeGenericResizable(el, (w, h) => updateShape(goalId, shape.id, { width: w, height: h }));
  }
}

function makeArrowInteraction(el, shape, goalId) {
  let startX, startY, startLeft, startTop, dragging = false, moved = false;
  const DRAG_THRESHOLD = 5;
  const RESIZE_HANDLE_SIZE = 16;

  el.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('rm-arrow-delete')) return;

    // If the click is on the native resize handle (bottom-right corner), let the browser handle it
    const rect = el.getBoundingClientRect();
    const nearRight = e.clientX > rect.right - RESIZE_HANDLE_SIZE;
    const nearBottom = e.clientY > rect.bottom - RESIZE_HANDLE_SIZE;
    if (nearRight && nearBottom) {
      return;
    }

    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = el.offsetLeft;
    startTop = el.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      moved = true;
      el.style.zIndex = 10;
      el.style.left = (startLeft + dx) + 'px';
      el.style.top = (startTop + dy) + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    el.style.zIndex = 1;
    if (moved) {
      updateShape(goalId, shape.id, { x: el.offsetLeft, y: el.offsetTop });
    } else {
      const current = shape.rotation || 0;
      const next = (current + 90) % 360;
      shape.rotation = next;
      el.style.transform = `rotate(${next}deg)`;
      updateShape(goalId, shape.id, { rotation: next });
    }
  });
}

function makeGenericDraggable(el, handle, onMove) {
  let dragging = false;
  let startX, startY, startLeft, startTop;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = el.offsetLeft;
    startTop = el.offsetTop;
    el.style.zIndex = 10;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = (startLeft + dx) + 'px';
    el.style.top = (startTop + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      el.style.zIndex = 1;
      onMove(el.offsetLeft, el.offsetTop);
    }
  });
}

function makeGenericResizable(el, onResize) {
  const observer = new ResizeObserver(() => {
    onResize(el.offsetWidth, el.offsetHeight);
  });
  observer.observe(el);
}

function updateShape(goalId, shapeId, changes) {
  const d = getRoadmapData();
  const g = d.goals.find(g => g.id === goalId);
  const idx = g.shapes.findIndex(s => s.id === shapeId);
  if (idx !== -1) {
    g.shapes[idx] = { ...g.shapes[idx], ...changes };
    saveRoadmapData(d);
  }
}

function deleteShape(goalId, shapeId) {
  const d = getRoadmapData();
  const g = d.goals.find(g => g.id === goalId);
  g.shapes = g.shapes.filter(s => s.id !== shapeId);
  saveRoadmapData(d);
}