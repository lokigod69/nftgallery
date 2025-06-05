document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

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
