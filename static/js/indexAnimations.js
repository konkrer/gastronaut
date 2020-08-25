'use strict';

// Scroll Mapping and sidebar animations for index page.
class IndexAnimations {
  constructor() {
    this.$cardTrack = $('#scrl4');
    this.cardsLeftGlobal;
    this.currCard = 0;
    this.cardScrollTimer;
    this.cardScrollTrackerAndMapper;
    this.sidebarOpen = true;
    this.justSearchedYelp = false;
    this.category = null;
    this.windowResizeCardScrollResetTimer;
    this.toggleSidebarListeners();
    this.addWindowResizeListener();
    this.initMiscAnimtions();
  }

  // Function to count how many card widths the user has scrolled off
  // to the left in the card track dragscroll div.
  countCards() {
    if ($('.my-card')[0]) {
      let margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
      let cardWidth = $('.my-card').width() + margin;
      let $sL = this.$cardTrack.scrollLeft();
      // Count cards by mesuring scrollLeft
      // divided by card widths.
      this.cardsLeftGlobal = $sL / cardWidth;
    }
  }

  // Set the scroll left to equal the current card width times the number of
  // cards that were scrolled off to the left.
  setCardsScrollLeft() {
    if (this.cardsLeftGlobal) {
      let margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
      const cardWidth = $('.my-card').width() + margin;
      this.$cardTrack.scrollLeft(cardWidth * this.cardsLeftGlobal);
    }
  }

  // Scroll listerner and current card mapper for card track.
  setCardScrollTrackerMapper() {
    this.cardScrollTrackerAndMapper = this.$cardTrack.on(
      'scroll',
      function () {
        this.countCards();
        clearTimeout(this.cardScrollTimer);

        if (!Map_Obj.mapOpen || !$('.my-card')[0]) return;

        this.cardScrollTimer = setTimeout(
          function () {
            const focusCardIdx = Number.parseInt(this.cardsLeftGlobal + 0.5);

            if (focusCardIdx === this.currCard) return;

            this.currCard = focusCardIdx;
            this.mapCurrCard(this.currCard);
          }.bind(this),
          700
        );
      }.bind(this)
    );
  }

  // Add marker and fit bounds with data found in current card.
  mapCurrCard() {
    const $focusCard = $('.my-card').eq(this.currCard);
    if ($focusCard.hasClass('dummy-card')) return;
    const $mapButton = $focusCard.find('.cardMapButton');
    const lat = $mapButton.next().children().data('lat');
    const lng = $mapButton.next().children().data('lng');
    const name = $mapButton.next().children().data('name');
    const id = $mapButton.next().children().data('id');

    if (isFinite(lat))
      Map_Obj.addRestMarkerAndFitBounds([+lng, +lat], name, id);
  }

  // Listen for sidebar button click or drag and toggle sidbar.
  toggleSidebarListeners() {
    const boundToggleSidebar = this.toggleSidebar.bind(this);
    $('.sidebar-toggle-btn').on('click', boundToggleSidebar);
    $('.sidebar-toggle-btn').on('dragstart', boundToggleSidebar);
    $('.sidebar-toggle-btn').on('touchstart', function (e) {
      e.preventDefault();
      boundToggleSidebar();
    });
  }

  // Sidebar toggle logic.
  async toggleSidebar() {
    // Prevent unnecessary scroll mapping events.
    if (this.cardScrollTrackerAndMapper) this.cardScrollTrackerAndMapper.off();

    // If not on mobile -
    // Fade cards out then hide cards.
    const onMobile = Map_Obj.isMobileScreen();
    if (!onMobile) {
      $('.card-track-inner').addClass('opaque');
      await this.sleep(200);
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

  /*
  /* Restaurant categories auto scroll to last choosen category.
  /* Function to scroll last selected category into view.
  */
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
    location.href = '#';
    location.href = `#${currCat[0].toUpperCase()}${currCat.substr(1, 2)}`;
    const $scrl3 = $('#scrl3');
    // move scrolled category a little lower for better visibility.
    const sT = $scrl3.scrollTop();
    if (sT >= 50) $scrl3.scrollTop(sT - 50);
    else $scrl3.scrollTop(0);

    FormFunctsObj.focusBlur();
  }

  /* 
  /* Reset card scroll position after resize events
  /* to keep same card centered.
  */
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

  initMiscAnimtions() {
    //Pulse Animations for location and search buttons
    // Pulse with mouseover.
    $('.jsPulser').each(function (i) {
      $(this).on('mouseover', function (e) {
        $(this).children().addClass('pulse-5');
      });
    });
    // Stop pulsing with mouseout.
    $('.jsPulser').each(function (i) {
      $(this).on('mouseout', function (e) {
        $(this).children().removeClass('pulse-5');
      });
    });
    //Open more tips modal when user clicks more tips button.
    $('.moreTips').click(() => {
      $('#tips-2-modal').modal();
    });
    /* Make map icon grow when hovered.
  /* Add grow-1_3 class to map icon 
  /* with hover of containing div. 
  */
    $('.jsGrow').on('mouseover', function (e) {
      $(this).children().addClass('grow-1_3');
    });
    $('.jsGrow').on('mouseout', function (e) {
      $(this).children().removeClass('grow-1_3');
    });
  }

  /*
  /* Inline sleep timer function.
  */
  sleep(delay) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }
}

const IndexAnimationsObj = new IndexAnimations();
