'use strict';

class StickyScroll {
  constructor() {
    this.avatarCol = document.querySelector('.avatar-col');
    this.avatarColOffset = null; // ACO
    this.adjustedACO = null;

    this.addScrollListener();
    this.addTabslistListener();
    this.addResizeListener();
  }

  // check if screen size is mobile.
  isMobileScreen() {
    if (window.innerWidth < 768) return true;
    if (window.innerHeight < 400) return true;
    return false;
  }

  // check if screen size is mobile.
  isLgMobileScreen() {
    if (window.innerWidth <= 992) return true;
    if (window.innerHeight < 600) return true;
    return false;
  }

  // check if screen size is mobile in portrait.
  isMobilePortrait() {
    if (window.innerWidth < 576) return true;
    return false;
  }

  /*
  /* Set adjusted avatar column offset. We don't want avatar col to 
  /* stop scrolling all the way at the top of screen. We want different
  /* offsets depending on the screen size.
  */
  setAdjustedACO() {
    this.avatarColOffset = this.avatarCol.offsetTop;
    if (this.isMobileScreen()) this.adjustedACO = this.avatarColOffset - 91;
    else if (this.isLgMobileScreen())
      this.adjustedACO = this.avatarColOffset - 105;
    else this.adjustedACO = this.avatarColOffset - 250;
  }

  /*
  /* Add sroll listener to set profile section top offset.
  */
  addScrollListener() {
    $(window).scroll(this.adjustProfilePosition.bind(this));
  }

  /*
  /* Adjust profile section top offset.
  */
  adjustProfilePosition() {
    // If mobile portrait oreintation no position fixing needed.
    if (this.isMobilePortrait()) {
      // remove position fixed.
      $('.sticky-profile').removeClass('p-fixed');
      return;
    }
    // Set amount that when top scroll is greater than
    // avatar-col fixing begins to happen.
    this.setAdjustedACO();

    // If user scrolled greater amount than our adjusted offset.
    if (window.pageYOffset > this.adjustedACO) {
      // Make sticky-profile fixed and set top offset.
      $('.sticky-profile')
        .addClass('p-fixed')
        .css('min-width', `${this.avatarCol.offsetWidth}px`)
        .css('top', `${this.avatarColOffset - this.adjustedACO}px`);
      // If not user scrolled greater amount than our adjusted offset.
    } else $('.sticky-profile').removeClass('p-fixed');
  }

  /*
  /* When tabs button clicked go to top of tabs content div.
  */
  addTabslistListener() {
    $('div[role="tablist"] a').click(
      function () {
        setTimeout(() => {
          window.location.href = '#pills-tabContent';
          // Scroll down a bit.
          $(window).scrollTop($(window).scrollTop() - 60);
        }, 100);
      }.bind(this)
    );
  }

  /*
  /* When phone orientation changes update profile position.
  */
  addResizeListener() {
    window.addEventListener('resize', this.adjustProfilePosition.bind(this));
  }
}

const StickyScrollObj = new StickyScroll();
