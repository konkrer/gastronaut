/**
 * Logic for buttons on index page.
 */
class ButtonsLogics {
  constructor() {
    this.addMapBusinessBtnListener();
    this.addMapToggleBtnListener();
    this.addCardsToggleBtnListener();
    this.addBusinessDetailsListeners();
    this.addWriteReportListener();
    this.addNavigationListener();
    this.addToggleDirectionsDivListener();
    this.addCancelNavigationListener();
  }

  //
  // Listen for card map button click and call mapBusiness.
  //
  addMapBusinessBtnListener() {
    const this_ = this;
    $('.card-track-inner').on('click', '.cardMapButton', function () {
      this_.mapBusiness($(this));
    });
  }

  //
  // Show restaurant marker and fit bounds when card map button is clicked.
  //
  mapBusiness($el) {
    const lng = $el.next().children().data('lng');
    const lat = $el.next().children().data('lat');
    const name = $el.next().children().data('name');
    const id = $el.next().children().data('id');
    if (!Map_Obj.mapOpen) this.toggleMap();
    Map_Obj.addRestMarkerAndFitBounds([+lng, +lat], name, id);
  }

  //
  // Toggle map listener.
  //
  addMapToggleBtnListener() {
    $('.showMap').on('click', this.toggleMap);
    $('.showMap').on('dragstart', this.toggleMap);
    document.querySelector('.showMap').addEventListener(
      'touchstart',
      e => {
        e.preventDefault();
        this.toggleMap();
      },
      { passive: false }
    );
  }

  //
  // Toggle map button functionality. Open and close map.
  //
  toggleMap() {
    // If map is open and cards are hidden show cards.
    if (Map_Obj.mapOpen && $('.card-map-zone').hasClass('cards-collapse')) {
      $('.card-map-zone').removeClass('cards-collapse');
      $('.card-track').show();
      // Toggle toggle cards icon.
      $('.toggleCards')
        .children()
        .each(function (index) {
          $(this).toggleClass('d-none');
        });
      // make sure correct cards show.
      IndexAnimationsObj.setCardsScrollLeft();
    }
    // Toggle all map items.
    $('.card-map-zone').toggleClass('map-collapse');
    $('#map').toggle();
    $('.mapBtns').toggle();
    $('.map-toggle').toggleClass('toggle-on-map');
    $('.map-track').toggleClass(['border-top', 'border-secondary']);
    if ($('#directions-panel').hasClass('show'))
      $('#directions-panel').removeClass('show').hide();
    if (Map_Obj.mapOpen) {
      Map_Obj.mapOpen = false;
    } else {
      Map_Obj.mapOpen = true;
      Map_Obj.mappyBoi.resize();
      if ($('div.map-routing .reset').hasClass('resetHorizontal'))
        $('#directions-panel').addClass('show').fadeIn();
    }
  }

  //
  // Cards toggle listener.
  //
  addCardsToggleBtnListener() {
    $('.toggleCards').on('click', this.toggleCards);
    $('.toggleCards').on('dragstart', this.toggleCards);
    document.querySelector('.toggleCards').addEventListener(
      'touchstart',
      e => {
        e.preventDefault();
        this.toggleCards();
      },
      { passive: false }
    );
  }

  //
  // Show/hide cards functionality. Big/small map.
  //
  toggleCards() {
    $('.card-map-zone').toggleClass('cards-collapse');
    $('.card-track').toggle();
    Map_Obj.mappyBoi.resize();
    // toggle up/down arrow
    $('.toggleCards')
      .children()
      .each(function (index) {
        $(this).toggleClass('d-none');
      });
    if (!$('.card-map-zone').hasClass('cards-collapse')) {
      IndexAnimationsObj.setCardsScrollLeft();
    }
  }

  //
  // Show cards functionality for search Yelp. If cards are hidden
  // they will be shown after search Yelp.
  //
  showCardTrack() {
    if ($('.card-map-zone').hasClass('cards-collapse')) {
      $('.card-map-zone').removeClass('cards-collapse');
      $('.card-track').show();
      Map_Obj.mappyBoi.resize();
      $('.toggleCards')
        .children()
        .each(function (index) {
          $(this).toggleClass('d-none');
        });
    }
  }

  //
  // Card business detail listeners.
  //
  addBusinessDetailsListeners() {
    const this_ = this;
    $('.card-track-inner').on(
      'click',
      '.detailsBtnCard',
      this.getBtnAndShowDetails
    );
    $('.card-track-inner').on(
      'dblclick',
      '.my-card.mr-card',
      this.getBtnAndShowDetails
    );
  }

  //
  // Get the mission-btn (add to mission) button which holds the
  // business data and call getShowBusinessDetails.
  //
  getBtnAndShowDetails() {
    // Get the details button.
    const detailBtn = $(this).hasClass('detailsBtnCard')
      ? $(this)
      : $(this).find('.detailsBtnCard');

    const $addToMissionBtn = detailBtn.next().next().children();

    const fakeE = {
      currentTarget: {
        dataset: {
          id: $addToMissionBtn.data('id'),
          name: $addToMissionBtn.data('name'),
          latlng: `${$addToMissionBtn.data('lat')},${$addToMissionBtn.data(
            'lng'
          )}`,
        },
      },
    };

    ApiFunctsObj.getShowBusinessDetails(fakeE);
  }

  //
  // Listen for the write report button click in the business detail modal
  // and call add_report with business information as parameters. This is
  // to be able to create a new business entry in Database if necessary.
  //
  addWriteReportListener() {
    $('#business-detail-modal').on('click', '.writeReport', function (e) {
      e.preventDefault();
      const reportUrl = $(this).parent().prop('href');
      const $missionBtn = $(this).parent().parent().prev().find('.mission-btn');

      const params = {
        city: $missionBtn.data('city'),
        state: $missionBtn.data('state'),
        country: $missionBtn.data('country'),
        name: $missionBtn.data('name'),
        lng: $missionBtn.data('lng'),
        lat: $missionBtn.data('lat'),
      };

      // https://attacomsian.com/blog/javascript-convert-object-to-query-string-parameters
      const queryString = new URLSearchParams(params);

      window.open(`${reportUrl}&${queryString}`);
    });
  }

  //
  // Add navigation start buttons listener.
  //
  addNavigationListener() {
    $('.map-track').on(
      'click',
      '.directionsBtn',
      this.startNavigation.bind(this)
    );
  }

  //
  // Start navigation. Update Map_Obj state, add alternate colored user marker,
  // get route for appropriate destination.
  //
  async startNavigation(e) {
    const $el = $(e.currentTarget);
    Map_Obj.changedProfile = Map_Obj.profile !== $el.data('profile');
    Map_Obj.profile = $el.data('profile');
    Map_Obj.markerStyle = 1;
    Map_Obj.userMarkerStyle = 1;
    Map_Obj.addUserMarker();
    this.navStartDOMAdjustments($el);
    // If currently navigating home show route for newly selected navigation profile.
    if ($('.map-routing .home').hasClass('homeActive')) {
      Map_Obj.fitBounds();
      Map_Obj.showDirectionsAndLine();
      // Else use IndexAnimationsObj to map current (center) card's business and route.
    } else {
      // Pause to allow user to click home btn before mapping restaurant.
      if (!Map_Obj.currentRoute) await Base_Obj.sleep(1500);
      // If user didn't click home btn map current card.
      if (!Map_Obj.homeMarker) IndexAnimationsObj.mapCurrCard();
    }
    // If active navigation following user:
    if (Geolocation_Obj.locationWatcher) {
      // Disable location watcher which may have infrequent updates.
      Geolocation_Obj.clearLocationWatching();
      // Make camera zoom into user on location update from location watcher after brief delay.
      setTimeout(() => {
        // Enable frequent updates with location watcher.
        Geolocation_Obj.enableLocationWatcher(1);
        // Keep screen on.
        Geolocation_Obj.enableNoSleep();
      }, 2000);
      // If on phone size screen close sidebar and card track for full-screen navigation.
      if (Map_Obj.isMobileScreen()) {
        if (IndexAnimationsObj.sidebarOpen) IndexAnimationsObj.toggleSidebar();
        if (!$('.card-map-zone').hasClass('cards-collapse')) this.toggleCards();
      }
    }
  }

  //
  // Make adjustments to DOM elements for visual change of navigation start.
  //
  navStartDOMAdjustments($el) {
    Map_Obj.clearNavBtnsActive();
    $el.addClass('active');
    $('.map-routing').addClass('horizontal');
    $('.walk').addClass('walkHorizontal');
    $('.bike').addClass('bikeHorizontal');
    $('div.home').fadeIn().addClass('homeHorizontal');
    $('div.reset').fadeIn().addClass('resetHorizontal');
    $('.profileDisplay').text(Map_Obj.profileDict[Map_Obj.profile]);
    $('#directions-panel').addClass('show').fadeIn();
  }

  //
  // Add listener to show text directions.
  //
  addToggleDirectionsDivListener() {
    const this_ = this;
    $('.map-track').on('click', '.directionsToggle', this.toggleDirectionsDiv);
  }

  //
  // Show directions text and alter directionsToggle alignment (vertical to horizontal).
  //
  toggleDirectionsDiv() {
    $('.directionsToggle')
      .toggleClass(['h-100', 'border-bottom', 'border-dark', 'bg-trans-b0'])
      .children()
      .each(function () {
        $(this).toggleClass('d-inline-block');
      });
    $('.directionsClipboard').toggleClass('pr-sm-1');
    $('.directionsHeader').toggle();
    // flip left/right arrow
    $('.directionsCaret')
      .children()
      .each(function () {
        $(this).toggle();
      });
    $('#directions-panel').toggleClass('directionsShow');
    $('#directions-text').toggle();
  }

  //
  // Cancel navigation listener.
  //
  addCancelNavigationListener() {
    $('.map-track').on(
      'click',
      '.map-routing div.reset',
      function () {
        Map_Obj.clearRouting();
        Map_Obj.markerStyle = 0;
        Map_Obj.userMarkerStyle = 0;
        Map_Obj.addUserMarker();
        Map_Obj.userMarker.togglePopup();
        IndexAnimationsObj.mapCurrCard();
        if ($('#directions-panel').hasClass('directionsShow'))
          this.toggleDirectionsDiv();
        this.navEndDOMAdjustments();
      }.bind(this)
    );
  }

  //
  // Make adjustments to DOM elements for visual change of navigation end.
  //
  navEndDOMAdjustments() {
    $('#directions-panel').removeClass('show').fadeOut();
    $('.map-routing').removeClass('horizontal');
    $('.walk').removeClass('walkHorizontal');
    $('.bike').removeClass('bikeHorizontal');
    $('div.home').fadeOut().removeClass('homeHorizontal');
    $('div.reset').fadeOut().removeClass('resetHorizontal');
    $('.map-routing .home').removeClass('homeActive');
  }
}

const IndexButtonsLogicsObj = new ButtonsLogics();
