'use strict';

// Navbar rocket animation.
function navbarRocketAnimation() {
  document
    .querySelector('.navbar-traverse')
    .animate([{ right: '-56px' }, { right: '100vw' }], 20000);
}

function navRocketStart() {
  navRocketTimer = setTimeout(() => {
    navbarRocketAnimation();
    setInterval(() => {
      navbarRocketAnimation();
    }, 300000);
  }, 60000);
}

navRocketStart();
