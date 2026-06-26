const navItems = document.querySelectorAll('.nav-item');
const sectionTitle = document.getElementById('section-title');
const sectionBody = document.getElementById('section-body');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    const section = item.dataset.section;
    sectionTitle.textContent = item.textContent.trim();

    if (section === 'sticky') {
      renderStickyNotes();
    } else if (section === 'notebook') {
      renderNotebookHome();
    } else if (section === 'attendance') {
      renderAttendance();
    } else if (section === 'timetable') {
      renderTimetable();
    } else if (section === 'roadmap') {
      renderRoadmap();
    } else if (section === 'pins') {
      renderPins();
    } else {
      sectionBody.innerHTML = `<p>The ${section} section will be built in an upcoming phase.</p>`;
    }
  });
});