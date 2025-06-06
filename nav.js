document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  // Ensure Room 6 link exists in the menu
  if (!menu.querySelector('a[href="room6.html"]')) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = 'room6.html';
    link.textContent = 'Room 6';
    li.appendChild(link);
    menu.appendChild(li);
  }

  // Ensure Room 7 link exists in the menu
  if (!menu.querySelector('a[href="room7.html"]')) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = 'room7.html';
    link.textContent = 'Room 7';
    li.appendChild(link);
    menu.appendChild(li);
  }

  function hideMenu() {
    menu.style.display = 'none';
  }

  toggle.addEventListener('click', function(event) {
    event.stopPropagation();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', hideMenu);
  menu.addEventListener('click', function(event) {
    event.stopPropagation();
  });
});
