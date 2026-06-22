const STICKY_STORAGE_KEY = 'focus-sticky-notes';
const NOTE_COLORS = ['#3a3a55', '#5b3a55', '#3a554f', '#553a3a', '#3a4a55'];

function getStickyNotes() {
  const data = localStorage.getItem(STICKY_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveStickyNotes(notes) {
  localStorage.setItem(STICKY_STORAGE_KEY, JSON.stringify(notes));
}

function renderStickyNotes() {
  const sectionBody = document.getElementById('section-body');
  sectionBody.innerHTML = `
    <button id="add-note-btn" class="add-note-btn">+ Add Note</button>
    <div class="sticky-board" id="sticky-board"></div>
  `;

  const board = document.getElementById('sticky-board');
  const notes = getStickyNotes();
  notes.forEach(note => createNoteElement(note, board));

  document.getElementById('add-note-btn').addEventListener('click', () => {
    const newNote = {
      id: Date.now().toString(),
      x: 40,
      y: 20,
      width: 200,
      height: 160,
      color: NOTE_COLORS[0],
      text: ''
    };
    const notes = getStickyNotes();
    notes.push(newNote);
    saveStickyNotes(notes);
    createNoteElement(newNote, board);
  });
}

function createNoteElement(note, board) {
  const noteEl = document.createElement('div');
  noteEl.className = 'sticky-note';
  noteEl.style.left = note.x + 'px';
  noteEl.style.top = note.y + 'px';
  noteEl.style.width = note.width + 'px';
  noteEl.style.height = note.height + 'px';
  noteEl.style.background = note.color;
  noteEl.dataset.id = note.id;

  const header = document.createElement('div');
  header.className = 'note-header';

  const colorRow = document.createElement('div');
  colorRow.className = 'note-colors';
  NOTE_COLORS.forEach(color => {
    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.background = color;
    swatch.addEventListener('click', () => {
      noteEl.style.background = color;
      updateNote(note.id, { color });
    });
    colorRow.appendChild(swatch);
  });

  const deleteBtn = document.createElement('span');
  deleteBtn.className = 'note-delete';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', () => {
    noteEl.remove();
    deleteNote(note.id);
  });

  header.appendChild(colorRow);
  header.appendChild(deleteBtn);

  const content = document.createElement('div');
  content.className = 'note-content';
  content.contentEditable = true;
  content.innerText = note.text || '';
  content.addEventListener('input', () => {
    updateNote(note.id, { text: content.innerText });
  });

  noteEl.appendChild(header);
  noteEl.appendChild(content);
  board.appendChild(noteEl);

  makeDraggable(noteEl, header, note.id);
  makeResizable(noteEl, note.id);
}

function makeDraggable(noteEl, handle, id) {
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
      updateNote(id, { x: noteEl.offsetLeft, y: noteEl.offsetTop });
    }
  });
}

function makeResizable(noteEl, id) {
  const observer = new ResizeObserver(() => {
    updateNote(id, { width: noteEl.offsetWidth, height: noteEl.offsetHeight });
  });
  observer.observe(noteEl);
}

function updateNote(id, changes) {
  const notes = getStickyNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...changes };
    saveStickyNotes(notes);
  }
}

function deleteNote(id) {
  const notes = getStickyNotes().filter(n => n.id !== id);
  saveStickyNotes(notes);
}