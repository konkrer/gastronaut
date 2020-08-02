'use strict';

class navbarRocketAnimation {
  constructor() {
    this.navRocketTimer = null;
  }

  // Navbar rocket animation.
  navbarRocketAnimation() {
    document
      .querySelector('.navbar-traverse')
      .animate([{ right: '-56px' }, { right: '100vw' }], 20000);
  }

  rocketStart() {
    setTimeout(() => {
      this.navbarRocketAnimation();
      this.navRocketTimer = setInterval(() => {
        this.navbarRocketAnimation();
      }, 300000);
    }, 60000);
  }

  rocketStop() {
    clearInterval(this.navbarRocketTimer);
  }
}

const RocketAnimation = new navbarRocketAnimation();
RocketAnimation.rocketStart();
