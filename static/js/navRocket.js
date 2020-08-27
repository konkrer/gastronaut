'use strict';

//
// Class to hold navbar rocket animation logic.
// Rocket flys across navbar every few minutes.
//
class navbarRocketAnimation {
  constructor() {
    this.navRocketTimer = null;
    this.rocketStart();
  }

  // Navbar rocket animation.
  navbarRocketAnimation() {
    document
      .querySelector('.navbar-traverse')
      .animate([{ right: '-56px' }, { right: '100vw' }], 20000);
  }

  // Start the animation cycle.
  rocketStart() {
    setTimeout(() => {
      this.navbarRocketAnimation();
      this.navRocketTimer = setInterval(() => {
        this.navbarRocketAnimation();
      }, 500000);
    }, 120000);
  }

  // Stop the animation cycle.
  rocketStop() {
    clearInterval(this.navbarRocketTimer);
  }
}

const RocketAnimation = new navbarRocketAnimation();
