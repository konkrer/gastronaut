'use strict';

class StickyScroll {
  constructor() {
    // flag to indicate if avatar-col top padding is being activly adjusted
    //  as of last scroll event.
    this.scrollPaddingAdjust = false;
    this.avatarCol = document.querySelector('.avatar-col');
    this.avatarColOffset = null; // ACO
    this.adjustedACO = null;
    this.originalDocHeight = $(document).height();

    this.addScrollListener();
    this.addTabslistListener();
    this.addResizeListener();
  }

  // check if screen size is mobile.
  isMobileScreen() {
    if (window.innerWidth < 768) return true;
    return false;
  }

  // check if screen size is mobile.
  isLgMobileScreen() {
    if (window.innerWidth <= 992) return true;
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
    else this.adjustedACO = this.avatarColOffset - 350;
  }

  /*
  /* Add sroll listener to adjust profile section top padding.
  */
  addScrollListener() {
    $(window).scroll(this.adjustProfilePosition.bind(this));
  }

  /*
  /* Adjust profile section top padding.
  */
  adjustProfilePosition() {
    // Set amount that when top scroll is greater than
    // avatar-col padding adjustment begins to happen.
    this.setAdjustedACO();

    // If mobile portrait oreintation no padding ajustment needed.
    if (this.isMobilePortrait()) {
      // If top padding was just being adjusted in landscape orientation.
      if (this.scrollPaddingAdjust) {
        // remove top padding.
        this.avatarCol.setAttribute('style', '');
        this.scrollPaddingAdjust = false;
      }
      return;
    }

    // If user scrolled greater amount than our adjusted offset.
    if (window.pageYOffset > this.adjustedACO) {
      // Adjust top padding.
      this.avatarCol.setAttribute(
        'style',
        `padding-top: ${window.pageYOffset - this.adjustedACO}px;`
      );
      this.scrollPaddingAdjust = true;
      // If not user scrolled greater amount than our adjusted offset
      // but flag is true remove top padding and set flag false.
    } else if (this.scrollPaddingAdjust) {
      this.avatarCol.setAttribute('style', '');
      this.scrollPaddingAdjust = false;
    }
  }

  /*
  /* When tabs button clicked go to top of tabs content div.
  */
  addTabslistListener() {
    $('div[role="tablist"] a').click(
      function () {
        setTimeout(() => {
          window.location.href = '#pills-tabContent';
          $(window).scrollTop($(window).scrollTop() - 60);
        }, 400);
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
