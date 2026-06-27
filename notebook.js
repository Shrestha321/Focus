const NOTEBOOK_STORAGE_KEY = 'focus-notebook';

function getNotebookData() {
  const data = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
  return data ? JSON.parse(data) : { subjects: [] };
}

function saveNotebookData(data) {
  localStorage.setItem(NOTEBOOK_STORAGE_KEY, JSON.stringify(data));
}

document.addEventListener('click', () => {
  document.querySelectorAll('.nb-card-menu-dropdown.open').forEach(d => d.classList.remove('open'));
});

function createListCard(name, onOpen, onDelete) {
  const card = document.createElement('div');
  card.className = 'nb-card';
  card.innerHTML = `
    <span class="nb-card-title">${name}</span>
    <div class="nb-card-menu">
      <span class="nb-card-menu-btn">⋮</span>
      <div class="nb-card-menu-dropdown">
        <button class="nb-delete-option">Delete</button>
      </div>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.nb-card-menu')) return;
    onOpen();
  });

  const menuBtn = card.querySelector('.nb-card-menu-btn');
  const dropdown = card.querySelector('.nb-card-menu-dropdown');

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.nb-card-menu-dropdown.open').forEach(d => {
      if (d !== dropdown) d.classList.remove('open');
    });
    dropdown.classList.toggle('open');
  });

  card.querySelector('.nb-delete-option').addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      onDelete();
    }
  });

  return card;
}

function renderNotebookHome() {
  const sectionBody = document.getElementById('section-body');
  const data = getNotebookData();

  sectionBody.innerHTML = `
    <button id="add-subject-btn" class="nb-btn">+ Add Subject</button>
    <div class="nb-grid" id="subject-grid"></div>
  `;

  const grid = document.getElementById('subject-grid');
  data.subjects.forEach(subject => {
    const card = createListCard(
      subject.name,
      () => renderSubjectChapters(subject.id),
      () => {
        const d = getNotebookData();
        const removedSubject = d.subjects.find(s => s.id === subject.id);
        if (removedSubject) {
          removedSubject.chapters.forEach(c => unpinById('notebook-' + c.id));
        }
        d.subjects = d.subjects.filter(s => s.id !== subject.id);
        saveNotebookData(d);
        renderNotebookHome();
      }
    );
    grid.appendChild(card);
  });

  document.getElementById('add-subject-btn').addEventListener('click', () => {
    const name = prompt('Subject name:');
    if (!name) return;
    const d = getNotebookData();
    d.subjects.push({ id: Date.now().toString(), name, chapters: [] });
    saveNotebookData(d);
    renderNotebookHome();
  });
}

function renderSubjectChapters(subjectId) {
  const sectionBody = document.getElementById('section-body');
  const data = getNotebookData();
  const subject = data.subjects.find(s => s.id === subjectId);
  if (!subject) return renderNotebookHome();

  sectionBody.innerHTML = `
    <button class="nb-back-btn" id="back-to-subjects">← Subjects</button>
    <h3 class="nb-subtitle">${subject.name}</h3>
    <button id="add-chapter-btn" class="nb-btn">+ Add Chapter</button>
    <div class="nb-grid" id="chapter-grid"></div>
  `;

  document.getElementById('back-to-subjects').addEventListener('click', renderNotebookHome);

  const grid = document.getElementById('chapter-grid');
  subject.chapters.forEach(chapter => {
    const card = createListCard(
      chapter.name,
      () => renderChapterEditor(subjectId, chapter.id),
      () => {
        const d = getNotebookData();
        const s = d.subjects.find(s => s.id === subjectId);
        s.chapters = s.chapters.filter(c => c.id !== chapter.id);
        saveNotebookData(d);
        unpinById('notebook-' + chapter.id);
        renderSubjectChapters(subjectId);
      }
    );
    grid.appendChild(card);
  });

  document.getElementById('add-chapter-btn').addEventListener('click', () => {
    const name = prompt('Chapter name:');
    if (!name) return;
    const d = getNotebookData();
    const s = d.subjects.find(s => s.id === subjectId);
    s.chapters.push({ id: Date.now().toString(), name, content: '', stickies: [], images: [] });
    saveNotebookData(d);
    renderSubjectChapters(subjectId);
  });
}

const FONT_OPTIONS = ['Segoe UI', 'Georgia', 'Courier New', 'Comic Sans MS', 'Verdana'];
const SIZE_OPTIONS = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '5' },
  { label: 'Huge', value: '7' }
];
const TEXT_COLORS = ['#1a1a1a', '#d32f2f', '#2e7d32', '#1565c0', '#f57f17'];
const HIGHLIGHT_COLORS = ['#FFF59D', '#A5D6A7', '#F48FB1', '#90CAF9'];
const NOTE_PAGE_COLORS = ['#FFF59D', '#FFAB91', '#A5D6A7', '#90CAF9', '#F48FB1'];
const NB_MAX_IMAGE_SIZE = 3 * 1024 * 1024;

function renderChapterEditor(subjectId, chapterId) {
  const sectionBody = document.getElementById('section-body');
  const data = getNotebookData();
  const subject = data.subjects.find(s => s.id === subjectId);
  const chapter = subject.chapters.find(c => c.id === chapterId);
  if (!chapter.images) chapter.images = [];
  saveNotebookData(data);

  const chapterPinId = 'notebook-' + chapterId;
  const pinnedInitially = isPinned(chapterPinId);

  sectionBody.innerHTML = `
    <button class="nb-back-btn" id="back-to-chapters">← ${subject.name}</button>
    <h3 class="nb-subtitle">${chapter.name}</h3>
    <div class="nb-toolbar" id="nb-toolbar">
      <select id="font-select" class="nb-select"></select>
      <select id="size-select" class="nb-select"></select>
      <div class="nb-color-group" id="text-color-group"></div>
      <div class="nb-color-group" id="highlight-color-group"></div>
      <button id="clear-highlight-btn" class="nb-clear-btn">Clear Highlight</button>
      <button id="nb-pin-btn" class="nb-clear-btn${pinnedInitially ? ' pinned-active' : ''}">${pinnedInitially ? '★ Pinned' : '☆ Pin Chapter'}</button>
      <button id="add-sticky-on-page" class="nb-btn nb-btn-small">+ Sticky</button>
      <button id="add-image-on-page" class="nb-btn nb-btn-small">+ Image</button>
      <input type="file" id="nb-image-upload-input" accept="image/*" style="display:none;">
    </div>
    <div class="nb-color-popup" id="sticky-color-popup"></div>
    <div class="nb-page-wrapper">
      <div class="nb-editor" id="nb-editor" contenteditable="true">${chapter.content}</div>
      <div class="nb-sticky-layer" id="nb-sticky-layer"></div>
    </div>
  `;

  document.getElementById('back-to-chapters').addEventListener('click', () => renderSubjectChapters(subjectId));

  document.getElementById('nb-pin-btn').addEventListener('click', () => {
    const pinned = togglePin(chapterPinId, { type: 'notebook', subjectId, chapterId });
    const btn = document.getElementById('nb-pin-btn');
    btn.textContent = pinned ? '★ Pinned' : '☆ Pin Chapter';
    btn.classList.toggle('pinned-active', pinned);
  });

  const editor = document.getElementById('nb-editor');
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

  const fontSelect = document.getElementById('font-select');
  FONT_OPTIONS.forEach(font => {
    const opt = document.createElement('option');
    opt.value = font;
    opt.textContent = font;
    opt.style.fontFamily = font;
    fontSelect.appendChild(opt);
  });
  fontSelect.addEventListener('change', () => applyCommand('fontName', fontSelect.value));

  const sizeSelect = document.getElementById('size-select');
  SIZE_OPTIONS.forEach(size => {
    const opt = document.createElement('option');
    opt.value = size.value;
    opt.textContent = size.label;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.addEventListener('change', () => applyCommand('fontSize', sizeSelect.value));

  const textColorGroup = document.getElementById('text-color-group');
  TEXT_COLORS.forEach(color => {
    const dot = document.createElement('span');
    dot.className = 'nb-color-dot';
    dot.style.background = color;
    dot.title = 'Text color';
    dot.addEventListener('click', () => applyCommand('foreColor', color));
    textColorGroup.appendChild(dot);
  });

  const highlightGroup = document.getElementById('highlight-color-group');
  HIGHLIGHT_COLORS.forEach(color => {
    const dot = document.createElement('span');
    dot.className = 'nb-color-dot';
    dot.style.background = color;
    dot.title = 'Highlight';
    dot.addEventListener('click', () => applyCommand('hiliteColor', color));
    highlightGroup.appendChild(dot);
  });

  document.getElementById('clear-highlight-btn').addEventListener('click', () => applyCommand('hiliteColor', 'transparent'));

  editor.addEventListener('input', () => {
    const d = getNotebookData();
    const s = d.subjects.find(s => s.id === subjectId);
    const c = s.chapters.find(c => c.id === chapterId);
    c.content = editor.innerHTML;
    saveNotebookData(d);
  });

  const stickyLayer = document.getElementById('nb-sticky-layer');
  chapter.stickies.forEach(sticky => createPageSticky(sticky, stickyLayer, subjectId, chapterId));
  chapter.images.forEach(image => createPageImage(image, stickyLayer, subjectId, chapterId));

  const colorPopup = document.getElementById('sticky-color-popup');
  document.getElementById('add-sticky-on-page').addEventListener('click', () => {
    if (colorPopup.style.display === 'flex') {
      colorPopup.style.display = 'none';
      return;
    }
    colorPopup.innerHTML = '';
    NOTE_PAGE_COLORS.forEach(color => {
      const swatch = document.createElement('span');
      swatch.className = 'nb-popup-swatch';
      swatch.style.background = color;
      swatch.title = 'Use this color';
      swatch.addEventListener('click', () => {
        colorPopup.style.display = 'none';
        const newSticky = {
          id: Date.now().toString(),
          x: 30, y: 30, width: 180, height: 140,
          color, text: ''
        };
        const d = getNotebookData();
        const s = d.subjects.find(s => s.id === subjectId);
        const c = s.chapters.find(c => c.id === chapterId);
        c.stickies.push(newSticky);
        saveNotebookData(d);
        createPageSticky(newSticky, stickyLayer, subjectId, chapterId);
      });
      colorPopup.appendChild(swatch);
    });
    colorPopup.style.display = 'flex';
  });

  document.getElementById('add-image-on-page').addEventListener('click', () => {
    document.getElementById('nb-image-upload-input').click();
  });

  document.getElementById('nb-image-upload-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.');
      e.target.value = '';
      return;
    }
    if (file.size > NB_MAX_IMAGE_SIZE) {
      alert('Image is too large. Please keep it under 3MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const newImage = {
        id: Date.now().toString(),
        x: 40, y: 40, width: 220, height: 160,
        data: reader.result
      };
      const d = getNotebookData();
      const s = d.subjects.find(s => s.id === subjectId);
      const c = s.chapters.find(c => c.id === chapterId);
      if (!c.images) c.images = [];
      c.images.push(newImage);
      saveNotebookData(d);
      createPageImage(newImage, stickyLayer, subjectId, chapterId);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}

function createPageSticky(sticky, layer, subjectId, chapterId) {
  const noteEl = document.createElement('div');
  noteEl.className = 'page-sticky';
  noteEl.style.left = sticky.x + 'px';
  noteEl.style.top = sticky.y + 'px';
  noteEl.style.width = sticky.width + 'px';
  noteEl.style.height = sticky.height + 'px';
  noteEl.style.background = sticky.color;

  const header = document.createElement('div');
  header.className = 'page-sticky-header';

  const colorRow = document.createElement('div');
  colorRow.className = 'note-colors';
  NOTE_PAGE_COLORS.forEach(color => {
    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.background = color;
    swatch.addEventListener('click', () => {
      noteEl.style.background = color;
      updatePageSticky(subjectId, chapterId, sticky.id, { color });
    });
    colorRow.appendChild(swatch);
  });

  const deleteBtn = document.createElement('span');
  deleteBtn.className = 'note-delete';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', () => {
    detachNbObserver(noteEl);
    noteEl.remove();
    deletePageSticky(subjectId, chapterId, sticky.id);
  });

  header.appendChild(colorRow);
  header.appendChild(deleteBtn);

  const content = document.createElement('div');
  content.className = 'note-content';
  content.contentEditable = true;
  content.innerText = sticky.text || '';
  content.addEventListener('input', () => {
    updatePageSticky(subjectId, chapterId, sticky.id, { text: content.innerText });
  });

  noteEl.appendChild(header);
  noteEl.appendChild(content);
  layer.appendChild(noteEl);

  makePageStickyDraggable(noteEl, header, subjectId, chapterId, sticky.id);
  makePageStickyResizable(noteEl, subjectId, chapterId, sticky.id);
}

function createPageImage(image, layer, subjectId, chapterId) {
  const imgEl = document.createElement('div');
  imgEl.className = 'page-image';
  imgEl.style.left = image.x + 'px';
  imgEl.style.top = image.y + 'px';
  imgEl.style.width = image.width + 'px';
  imgEl.style.height = image.height + 'px';

  const header = document.createElement('div');
  header.className = 'page-image-header';

  const deleteBtn = document.createElement('span');
  deleteBtn.className = 'page-image-delete';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', () => {
    detachNbObserver(imgEl);
    imgEl.remove();
    deletePageImage(subjectId, chapterId, image.id);
  });
  header.appendChild(deleteBtn);

  const body = document.createElement('div');
  body.className = 'page-image-body';
  body.innerHTML = `<img src="${image.data}" alt="Notebook image">`;

  imgEl.appendChild(header);
  imgEl.appendChild(body);
  layer.appendChild(imgEl);

  makePageImageDraggable(imgEl, header, subjectId, chapterId, image.id);
  makePageImageResizable(imgEl, subjectId, chapterId, image.id);
}

function makePageStickyDraggable(noteEl, handle, subjectId, chapterId, id) {
  let dragging = false;
  let startX, startY, startLeft, startTop;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = noteEl.offsetLeft;
    startTop = noteEl.offsetTop;
    noteEl.style.zIndex = 10;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    noteEl.style.left = (startLeft + dx) + 'px';
    noteEl.style.top = (startTop + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      noteEl.style.zIndex = 1;
      updatePageSticky(subjectId, chapterId, id, { x: noteEl.offsetLeft, y: noteEl.offsetTop });
    }
  });
}

const nbResizeObservers = new WeakMap();

function attachNbResizable(el, onResize) {
  const observer = new ResizeObserver(() => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w === 0 || h === 0) return;
    onResize(w, h);
  });
  observer.observe(el);
  nbResizeObservers.set(el, observer);
}

function detachNbObserver(el) {
  const observer = nbResizeObservers.get(el);
  if (observer) {
    observer.disconnect();
    nbResizeObservers.delete(el);
  }
}

function makePageStickyResizable(noteEl, subjectId, chapterId, id) {
  attachNbResizable(noteEl, (w, h) => updatePageSticky(subjectId, chapterId, id, { width: w, height: h }));
}

function makePageImageDraggable(imgEl, handle, subjectId, chapterId, id) {
  let dragging = false;
  let startX, startY, startLeft, startTop;

  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = imgEl.offsetLeft;
    startTop = imgEl.offsetTop;
    imgEl.style.zIndex = 10;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    imgEl.style.left = (startLeft + dx) + 'px';
    imgEl.style.top = (startTop + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      imgEl.style.zIndex = 1;
      updatePageImage(subjectId, chapterId, id, { x: imgEl.offsetLeft, y: imgEl.offsetTop });
    }
  });
}

function makePageImageResizable(imgEl, subjectId, chapterId, id) {
  attachNbResizable(imgEl, (w, h) => updatePageImage(subjectId, chapterId, id, { width: w, height: h }));
}

function updatePageSticky(subjectId, chapterId, id, changes) {
  const d = getNotebookData();
  const s = d.subjects.find(s => s.id === subjectId);
  const c = s.chapters.find(c => c.id === chapterId);
  const idx = c.stickies.findIndex(st => st.id === id);
  if (idx !== -1) {
    c.stickies[idx] = { ...c.stickies[idx], ...changes };
    saveNotebookData(d);
  }
}

function deletePageSticky(subjectId, chapterId, id) {
  const d = getNotebookData();
  const s = d.subjects.find(s => s.id === subjectId);
  const c = s.chapters.find(c => c.id === chapterId);
  c.stickies = c.stickies.filter(st => st.id !== id);
  saveNotebookData(d);
}

function updatePageImage(subjectId, chapterId, id, changes) {
  const d = getNotebookData();
  const s = d.subjects.find(s => s.id === subjectId);
  const c = s.chapters.find(c => c.id === chapterId);
  if (!c.images) c.images = [];
  const idx = c.images.findIndex(im => im.id === id);
  if (idx !== -1) {
    c.images[idx] = { ...c.images[idx], ...changes };
    saveNotebookData(d);
  }
}

function deletePageImage(subjectId, chapterId, id) {
  const d = getNotebookData();
  const s = d.subjects.find(s => s.id === subjectId);
  const c = s.chapters.find(c => c.id === chapterId);
  if (!c.images) c.images = [];
  c.images = c.images.filter(im => im.id !== id);
  saveNotebookData(d);
}