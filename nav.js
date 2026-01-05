document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  // Define the correct room order
  const roomOrder = [
    { href: 'room0.html', text: 'Room 0' },
    { href: 'room1.html', text: 'Room 1' },
    { href: 'room2.html', text: 'Room 2' },
    { href: 'room3.html', text: 'Room 3' },
    { href: 'room4.html', text: 'Room 4' },
    { href: 'room5.html', text: 'Room 5' },
    { href: 'room6.html', text: 'Room 6' },
    { href: 'room7.html', text: 'Room 7' },
    { href: 'room8.html', text: 'Room 8' },
    { href: 'room9.html', text: 'Room 9' },
    { href: 'room10.html', text: 'Room X' },
    { href: 'roomA.html', text: 'Room A' },
    { href: 'roomA1.html', text: 'Room A1' },
    { href: 'roomB.html', text: 'Room B' },
    { href: 'roomB1.html', text: 'Room B1' },
    { href: 'roomB2.html', text: 'Room B2' },
    { href: 'roomC.html', text: 'Room C' }
  ];

  // Clear existing menu items and rebuild in correct order
  menu.innerHTML = '';
  roomOrder.forEach(room => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = room.href;
    link.textContent = room.text;
    li.appendChild(link);
    menu.appendChild(li);
  });

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
