document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  // Menu structure with grouped sections
  // Room 6 is intentionally hidden (secret/access-code content)
  const menuStructure = [
    // Home
    { href: 'room0.html', text: 'Home' },

    // Section: Rooms (1-5)
    { type: 'header', text: 'Rooms' },
    { href: 'room1.html', text: 'Room 1' },
    { href: 'room2.html', text: 'Room 2' },
    { href: 'room3.html', text: 'Room 3' },
    { href: 'room4.html', text: 'Room 4' },
    { href: 'room5.html', text: 'Room 5' },

    { type: 'divider' },

    // Section: Levels (7-10)
    { type: 'header', text: 'Levels' },
    { href: 'room7.html', text: 'Level 7' },
    { href: 'room8.html', text: 'Level 8' },
    { href: 'room9.html', text: 'Level 9' },
    { href: 'room10.html', text: 'Level 10' },

    { type: 'divider' },

    // Section: Special rooms
    { href: 'roomA.html', text: 'Dome' },
    { href: 'roomA1.html', text: 'Dome 1', indent: true },
    { href: 'roomB.html', text: 'Box' },
    { href: 'roomB1.html', text: 'Box 1', indent: true },
    { href: 'roomB2.html', text: 'Box 2', indent: true },

    { type: 'divider' },

    // Soon (under construction)
    { href: 'roomC.html', text: 'Soon' }
  ];

  // Clear existing menu items and rebuild
  menu.innerHTML = '';

  menuStructure.forEach(item => {
    if (item.type === 'divider') {
      // Create divider line
      const divider = document.createElement('li');
      divider.className = 'nav-divider';
      menu.appendChild(divider);
    } else if (item.type === 'header') {
      // Create section header
      const header = document.createElement('li');
      header.className = 'nav-header';
      header.textContent = item.text;
      menu.appendChild(header);
    } else {
      // Create regular menu item
      const li = document.createElement('li');
      if (item.indent) {
        li.className = 'nav-indent';
      }
      const link = document.createElement('a');
      link.href = item.href;
      link.textContent = item.text;
      li.appendChild(link);
      menu.appendChild(li);
    }
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
