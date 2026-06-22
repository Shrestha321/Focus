const starsContainer = document.getElementById('stars');
const numStars = 60;

for (let i = 0; i < numStars; i++) {
  const star = document.createElement('div');
  star.className = 'star';
  star.style.top = Math.random() * 100 + '%';
  star.style.left = Math.random() * 100 + '%';
  star.style.opacity = Math.random() * 0.7 + 0.3;
  starsContainer.appendChild(star);
}