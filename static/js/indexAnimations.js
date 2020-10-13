'use strict';

//
// Scroll Mapping and sidebar animations for index page.
//
class IndexAnimations {
  constructor() {
    this.$cardTrack = $('#scrl4');
    this.cardsLeftGlobal;
    this.currCard = 0;
    this.cardScrollTimer;
    this.sidebarOpen = true;
    this.justSearchedYelp = false;
    this.category = null;
    this.windowResizeCardScrollResetTimer = null;
    this.trakerMapperBound = this.trakerMapper.bind(this);
    this.heroAnimation = null;
    this.initHeroAnimation();
    this.toggleSidebarListeners();
    this.addWindowResizeListener();
    this.initMiscAnimtions();
  }

  //
  // Globe hero animation.
  //
  initHeroAnimation() {
    this.heroAnimation = VANTA.GLOBE({
      el: '.hero-animation',
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0xbc7aa,
      color2: 0xe7ae0f,
      size: 1.3,
      backgroundColor: 0x0b1168,
    });
  }

  //
  // Function to count how many card widths the user has scrolled off
  // to the left in the card track dragscroll div.
  //
  countCards() {
    if ($('.my-card')[0]) {
      let margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
      let cardWidth = $('.my-card').width() + margin;
      let $sL = this.$cardTrack.scrollLeft();
      // Count cards by measuring scrollLeft
      // divided by card widths.
      this.cardsLeftGlobal = $sL / cardWidth;
    }
  }

  //
  // Set the scroll left to equal the current card width times the number of
  // cards that were scrolled off to the left.
  //
  setCardsScrollLeft() {
    if (this.cardsLeftGlobal) {
      let margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
      const cardWidth = $('.my-card').width() + margin;
      this.$cardTrack.scrollLeft(cardWidth * this.cardsLeftGlobal);
    }
  }

  //
  // Scroll listener and current card mapper for card track.
  //
  setCardScrollTrackerMapper() {
    document
      .querySelector('#scrl4')
      .addEventListener('scroll', this.trakerMapperBound, {
        passive: true,
      });
  }

  //
  // Track scroll position and map current card.
  //
  trakerMapper() {
    this.countCards();
    clearTimeout(this.cardScrollTimer);

    if (!Map_Obj.mapOpen || !$('.my-card')[0]) return;

    this.cardScrollTimer = setTimeout(
      function () {
        const focusCardIdx = Number.parseInt(this.cardsLeftGlobal + 0.5);

        // if focus card is current card return
        if (focusCardIdx === this.currCard) return;

        this.currCard = focusCardIdx;
        this.mapCurrCard(this.currCard);
      }.bind(this),
      700
    );
  }

  //
  // Add marker and fit bounds with data found in current card.
  //
  mapCurrCard() {
    // get the focused (center) card
    const $focusCard = $('.my-card').eq(this.currCard);
    // if dummy card return
    if ($focusCard.hasClass('dummy-card')) return;
    // map the focus card business
    const $mapButton = $focusCard.find('.cardMapButton');
    IndexButtonsLogicsObj.mapBusiness($mapButton);
  }

  //
  // Toggle sidebar
  //
  // Listen for sidebar button click, drag, or touchstart and toggle sidebar.
  //
  toggleSidebarListeners() {
    const boundToggleSidebar = this.toggleSidebar.bind(this);
    $('.sidebar-toggle-btn').on('click', boundToggleSidebar);
    $('.sidebar-toggle-btn').on('dragstart', boundToggleSidebar);
    document.querySelector('.sidebar-toggle-btn').addEventListener(
      'touchstart',
      e => {
        e.preventDefault();
        boundToggleSidebar();
      },
      { passive: false }
    );
  }

  //
  // Sidebar toggle logic.
  //
  async toggleSidebar() {
    // Prevent unnecessary scroll mapping events.
    document
      .querySelector('#scrl4')
      .removeEventListener('scroll', this.trakerMapperBound, {
        passive: true,
      });

    // If not on mobile -
    // Fade cards out then hide cards.
    const onMobile = Map_Obj.isMobileScreen();
    if (!onMobile) {
      $('.card-track-inner').addClass('opaque');
      await Base_Obj.sleep(200);
      $('.card-track-inner').hide();
    }

    // Toggle sidebar.
    // Note: Sidebar does not start with sidebarExpand class to avoid animation on load.
    if (this.sidebarOpen === true) {
      $('.control-panel')
        .addClass('sidebarCollapse')
        .removeClass('sidebarExpand');
    } else {
      $('.control-panel').toggleClass(['sidebarExpand', 'sidebarCollapse']);
    }
    this.sidebarOpen = !this.sidebarOpen;

    // Toggle filter display.
    $('.filter-display').slideToggle();

    // Logic to run after sidebar has full expanded or collapsed.
    setTimeout(() => {
      this.sidebarFullyChangedLogic(onMobile);
    }, 500);
  }

  sidebarFullyChangedLogic(onMobile) {
    if (Map_Obj.mapOpen) Map_Obj.mappyBoi.resize();
    // Toggle class for width dependent additional padding.
    $('.card-track-inner').toggleClass('padtop-card-filter-d');
    // correct scroll and fade in on non mobile devices
    if (!onMobile) {
      $('.card-track-inner').show();
      this.setCardsScrollLeft();
      $('.card-track-inner').removeClass('opaque');
    }
    // Stop arrows pulsing green and toggle arrow direction
    $('.arrow-wrapper')
      .removeClass('pulse-outline-mobile')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });

    // Listeners, current category display.
    this.setCardScrollTrackerMapper();
    IndexSearchObj.addNextCardsListener();
    if (this.sidebarOpen) this.scrollCategoriesToCurrent();

    // On mobile portrait zoom into first business when sidebar closed.
    if (this.justSearchedYelp && Map_Obj.isMobilePortrait()) this.mapCurrCard();
    this.justSearchedYelp = false;
  }

  //
  // Restaurant categories auto scroll to last chosen category.
  // Function to scroll last selected category into view.
  //
  scrollCategoriesToCurrent() {
    let currCat = this.category || localStorage.getItem('category');
    if (!currCat) return;

    const converter = {
      raw_food: 'Liv',
      restaurants: 'All',
      'restaurants,bars,food': 'All',
      newamerican: 'Ame',
      tradamerican: 'Ame',
      hotdogs: 'Fas',
      bbq: 'Bar',
      hkcafe: 'Hon',
    };

    if (currCat in converter) currCat = converter[currCat];
    location.href = `#${currCat[0].toUpperCase()}${currCat.substr(1, 2)}`;
    const $scrl3 = $('#scrl3');
    // move scrolled category a little lower for better visibility.
    const sT = $scrl3.scrollTop();
    if (sT >= 50) $scrl3.scrollTop(sT - 50);
    else $scrl3.scrollTop(0);

    FormFunctsObj.focusBlur();
  }

  //
  // Reset card scroll position after resize events
  // to keep same card centered.
  //
  addWindowResizeListener() {
    window.addEventListener('resize', () => {
      clearTimeout(this.windowResizeCardScrollResetTimer);
      // delay necessary for proper function.
      // works correctly most of the time.
      this.windowResizeCardScrollResetTimer = setTimeout(() => {
        this.setCardsScrollLeft();
        Map_Obj.mappyBoi.resize();
      }, 600);
    });
  }

  //
  // Initalize miscelaneous animations.
  //
  initMiscAnimtions() {
    //
    //Pulse Animations for location and search buttons
    // Pulse with mouseover.
    //
    $('.jsPulser').each(function (i) {
      $(this).on('mouseover', function (e) {
        $(this).children().addClass('pulse-5');
      });
    });
    //
    // Stop pulsing with mouseout.
    //
    $('.jsPulser').each(function (i) {
      $(this).on('mouseout', function (e) {
        $(this).children().removeClass('pulse-5');
      });
    });
    //
    //Open more tips modal when user clicks more tips button.
    //
    $('.moreTips').click(() => {
      $('#tips-2-modal').modal();
    });
  }
}

const IndexAnimationsObj = new IndexAnimations();
