/**
 * Logic for buttons on index page.
 */
class ButtonsLogics {
  constructor() {
    this.routingDelay = 2000;
    this.addMapBusinessBtnListener();
    this.addMapToggleBtnListener();
    this.addCardsToggleBtnListener();
    this.addBusinessDetailsListeners();
    this.addWriteReportListener();
    this.addNavigationListener();
    this.addToggleDirectionsDivListener();
    this.addCancelNavigationListener();
  }

  /**
   * Listen for card map button click and call mapBusiness.
   */
  addMapBusinessBtnListener() {
    const this_ = this;
    $('.card-track-inner').on('click', '.cardMapButton', function () {
      this_.mapBusiness($(this));
    });
  }

  /**
   * Show restaurant marker and fit bounds when card map button is clicked.
   */
  mapBusiness($el) {
    const lng = $el.next().children().data('lng');
    const lat = $el.next().children().data('lat');
    const name = $el.next().children().data('name');
    const id = $el.next().children().data('id');
    if (!Map_Obj.mapOpen) this.toggleMap();
    if (isFinite(lat))
      Map_Obj.addRestMarkerAndFitBounds([+lng, +lat], name, id);
  }

  /**
   * Toggle map listener.
   */
  addMapToggleBtnListener() {
    $('.showMap').on('click', this.toggleMap.bind(this));
    $('.showMap').on('dragstart', this.toggleMap.bind(this));
    document.querySelector('.showMap').addEventListener(
      'touchstart',
      e => {
        e.preventDefault();
        this.toggleMap.bind(this)();
      },
      { passive: false }
    );
  }

  /**
   * Toggle map button functionality. Open and close map.
   */
  toggleMap() {
    // If map is open and cards are hidden show cards.
    if (Map_Obj.mapOpen && $('.card-map-zone').hasClass('cards-collapse')) {
      this.showCardTrack();
      // make sure correct cards show.
      IndexAnimationsObj.setCardsScrollLeft();
    }
    // Toggle all map items and border.
    this.toggleMapDOMToggle();

    // If closing map.
    if (Map_Obj.mapOpen) {
      Map_Obj.mapOpen = false;
      // If directions panel is visible hide it.
      if ($('#directions-panel').hasClass('show'))
        $('#directions-panel').removeClass('show').hide();
      // If opening map.
    } else {
      Map_Obj.mapOpen = true;
      Map_Obj.mappyBoi.resize();
      // If app in navigation mode show directions panel.
      if ($('div.map-routing .reset').hasClass('resetHorizontal'))
        $('#directions-panel').addClass('show').fadeIn();
    }
  }

  /**
   * Toggle map DOM toggle adjustments.
   */
  toggleMapDOMToggle() {
    // Toggle all map items and border.
    $('.card-map-zone').toggleClass('map-collapse');
    $('#map').toggle();
    $('.mapBtns').toggle();
    $('.map-toggle').toggleClass('toggle-on-map');
    $('.map-track').toggleClass(['border-top', 'border-secondary']);
  }
  /**
   * Cards toggle listener.
   */
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

  /**
   * Show/hide cards functionality. Big/small map.
   */
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

  /**
   * Show cards functionality.
   */
  showCardTrack() {
    if ($('.card-map-zone').hasClass('cards-collapse')) {
      // Show cards
      $('.card-map-zone').removeClass('cards-collapse');
      $('.card-track').show();
      // Resize map.
      Map_Obj.mappyBoi.resize();
      // Toggle toggle cards icon.
      $('.toggleCards')
        .children()
        .each(function (index) {
          $(this).toggleClass('d-none');
        });
    }
  }

  /**
   * Card business detail listeners.
   */
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

  /**
   * Get the mission-btn (add to mission) button which holds the
   * business data and call getShowBusinessDetails.
   */
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

  /**
   * Listen for the write report button click in the business detail modal
   * and call add_report with business information as parameters. This is
   * to be able to create a new business entry in Database if necessary.
   */
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

      const queryString = new URLSearchParams(params);

      window.open(`${reportUrl}&${queryString}`);
    });
  }

  /**
   * Add navigation start buttons listener. Drive, walk, and cycle button.
   */
  addNavigationListener() {
    $('.map-track').on(
      'click',
      '.directionsBtn',
      this.startNavigation.bind(this)
    );
  }

  /**
   * Start navigation.
   *
   * Update Map_Obj state, make DOM adjustments, call activeNaviActions if is
   * active navigation following user, get route for appropriate destination.
   */
  startNavigation(e) {
    // Get element user clicked.
    const $el = $(e.currentTarget);
    // Set Map_Obj state and add user mark.
    this.navStartSetMapObjState($el);
    // Adjust page appearance and layout for navigation mode.
    this.navStartDOMAdjustments($el);
    // If active navigation following user call activeNaviActions.
    if (Geolocation_Obj.locationWatcher) this.activeNaviActions();
    // Logic for showing route.
    this.showRoute();
  }

  /**
   * Adjust state of Map_Obj for navigation.
   * Add user marker to have user marker be navigation user icon.
   *
   * @param($el) jQuery element
   */
  navStartSetMapObjState($el) {
    // Set if the profile has changed. Affects if fitBounds will be called.
    Map_Obj.changedProfile = Map_Obj.profile !== $el.data('profile');
    Map_Obj.profile = $el.data('profile');
    Map_Obj.markerStyle = 1;
    Map_Obj.userMarkerStyle = 1;
    Map_Obj.addUserMarker();
  }

  /**
   * Make adjustments to DOM elements for visual change of navigation start.
   */
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

  /**
   * Actions to take after navigation start when is active navigation following user.
   */
  activeNaviActions() {
    // Disable location watcher which may have infrequent updates.
    Geolocation_Obj.clearLocationWatching();
    // Make camera zoom into user on update from location watcher after brief delay.
    // Delay allows for route to be shown plus a small additional delay (500ms).
    const delay = this.routingDelay + 500;
    setTimeout(() => {
      // Enable frequent updates with location watcher.
      Geolocation_Obj.enableLocationWatcher(1);
      // Keep screen on.
      Geolocation_Obj.enableNoSleep();
    }, delay);
    // If on phone size screen close sidebar and card track for full-screen navigation.
    if (Map_Obj.isMobileScreen()) {
      if (IndexAnimationsObj.sidebarOpen) IndexAnimationsObj.toggleSidebar();
      if (!$('.card-map-zone').hasClass('cards-collapse')) this.toggleCards();
    }
  }

  /**
   * Show route logic for index page.
   *
   * If going home show route.
   * Otherwise use IndexAnimationsObj.mapCurrentCard to show route.
   */
  async showRoute() {
    // If currently navigating home show route for selected navigation profile.
    if (Map_Obj.homeMarker) {
      Map_Obj.fitBounds();
      Map_Obj.showDirectionsAndLine();
      // Else call IndexAnimationsObj.mapCurrentCard (center) to get and display route.
    } else {
      // If navigation was just started:
      if (!Map_Obj.currentRoute) {
        // Pause to allow user to click home btn before mapping route.
        await Base_Obj.sleep(this.routingDelay);
        // If user clicked home button return.
        if (Map_Obj.homeMarker) return;
      }
      // Map route.
      Map_Obj.showDirectionsAndLine();
      this.fitBounds();
    }
  }

  /**
   * Add listener to show text directions.
   */
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
    // flip left/right arrow
    $('.directionsCaret')
      .children()
      .each(function () {
        $(this).toggle();
      });
    $('#directions-panel').toggleClass('directionsShow');
  }

  /**
   * Cancel navigation listener.
   */
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
        // IndexAnimationsObj.mapCurrCard();
        Map_Obj.fitBounds();
        if ($('#directions-panel').hasClass('directionsShow'))
          this.toggleDirectionsDiv();
        this.navEndDOMAdjustments();
      }.bind(this)
    );
  }

  /**
   * Make adjustments to DOM elements for visual change of navigation end.
   */
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
