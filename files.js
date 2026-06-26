const FILES_STORAGE_KEY = 'focus-files';
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB safety cap per file

function getFilesData() {
  const data = localStorage.getItem(FILES_STORAGE_KEY);
  return data ? JSON.parse(data) : { subjects: [] };
}

function saveFilesData(data) {
  localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(data));
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Converts a stored base64 data URL into a blob: URL, which browsers allow
// opening directly — unlike data: URLs, which Chrome blocks for new-tab navigation.
function dataUrlToBlobUrl(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

function renderFilesHome() {
  const sectionBody = document.getElementById('section-body');
  const data = getFilesData();

  sectionBody.innerHTML = `
    <button id="add-subject-file-btn" class="nb-btn">+ Add Subject</button>
    <div class="nb-grid" id="file-subject-grid"></div>
  `;

  const grid = document.getElementById('file-subject-grid');
  data.subjects.forEach(subject => {
    const card = createListCard(
      subject.name,
      () => renderSubjectFiles(subject.id),
      () => {
        const d = getFilesData();
        const removedSubject = d.subjects.find(s => s.id === subject.id);
        if (removedSubject) {
          removedSubject.files.forEach(f => unpinById('file-' + f.id));
        }
        d.subjects = d.subjects.filter(s => s.id !== subject.id);
        saveFilesData(d);
        renderFilesHome();
      }
    );
    grid.appendChild(card);
  });

  document.getElementById('add-subject-file-btn').addEventListener('click', () => {
    const name = prompt('Subject name:');
    if (!name) return;
    const d = getFilesData();
    d.subjects.push({ id: Date.now().toString(), name, files: [] });
    saveFilesData(d);
    renderFilesHome();
  });
}

function renderSubjectFiles(subjectId) {
  const sectionBody = document.getElementById('section-body');
  const data = getFilesData();
  const subject = data.subjects.find(s => s.id === subjectId);
  if (!subject) return renderFilesHome();

  sectionBody.innerHTML = `
    <button class="nb-back-btn" id="back-to-file-subjects">← Subjects</button>
    <h3 class="nb-subtitle">${subject.name}</h3>
    <p class="file-hint">PDFs and images only. Keep file sizes modest — everything is stored in your browser.</p>
    <input type="file" id="file-upload-input" accept=".pdf,image/*" style="display:none;">
    <button id="upload-file-btn" class="nb-btn">+ Upload File</button>
    <div class="file-list" id="file-list"></div>
  `;

  document.getElementById('back-to-file-subjects').addEventListener('click', renderFilesHome);

  const list = document.getElementById('file-list');

  if (subject.files.length === 0) {
    list.innerHTML = `<div class="file-empty">No files yet — upload your first one above.</div>`;
  } else {
    subject.files.forEach(file => {
      const pinId = 'file-' + file.id;
      const pinnedNow = isPinned(pinId);
      const icon = file.type === 'application/pdf' ? '📄' : '🖼️';
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <span class="file-icon">${icon}</span>
        <div class="file-body">
          <div class="file-name">${file.name}</div>
          <div class="file-meta">${formatFileSize(file.size)}</div>
        </div>
        <div class="file-actions">
          <a class="file-action-link file-view-link" href="#">View</a>
          <a class="file-action-link file-download-link" href="#" download="${file.name}">Download</a>
          <span class="note-pin-btn" title="Pin this file">${pinnedNow ? '★' : '☆'}</span>
          <button class="file-delete-btn" title="Delete">×</button>
        </div>
      `;

      row.querySelector('.file-view-link').addEventListener('click', (e) => {
        e.preventDefault();
        const blobUrl = dataUrlToBlobUrl(file.data);
        window.open(blobUrl, '_blank');
      });

      row.querySelector('.file-download-link').addEventListener('click', (e) => {
        e.preventDefault();
        const blobUrl = dataUrlToBlobUrl(file.data);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      row.querySelector('.note-pin-btn').addEventListener('click', (e) => {
        const pinned = togglePin(pinId, { type: 'file', subjectId, fileId: file.id });
        e.target.textContent = pinned ? '★' : '☆';
      });

      row.querySelector('.file-delete-btn').addEventListener('click', () => {
        if (!confirm(`Delete "${file.name}"?`)) return;
        const d = getFilesData();
        const s = d.subjects.find(s => s.id === subjectId);
        s.files = s.files.filter(f => f.id !== file.id);
        saveFilesData(d);
        unpinById(pinId);
        renderSubjectFiles(subjectId);
      });

      list.appendChild(row);
    });
  }

  document.getElementById('upload-file-btn').addEventListener('click', () => {
    document.getElementById('file-upload-input').click();
  });

  document.getElementById('file-upload-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    if (!isPdf && !isImage) {
      alert('Only PDF and image files are allowed.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('File is too large. Please keep files under 3MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const d = getFilesData();
      const s = d.subjects.find(s => s.id === subjectId);
      s.files.push({
        id: Date.now().toString(),
        name: file.name,
        type: file.type,
        size: file.size,
        data: reader.result
      });
      saveFilesData(d);
      renderSubjectFiles(subjectId);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
}