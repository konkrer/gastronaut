'use strict';

class IndexSearchLogic {
  constructor() {
    // Cards variables
    this.firstCardsAdded = false;
    this.resultsRemaining = 0;
    this.offset = 0;
    this.paginationListener = null;
    this.addNavbarTogglerListener();
    this.addNavbarSearchListener();
    this.addExploreBtnsListeners();
    this.setLngLatInit();
    this.makeSearch = this.checkSearchInputOrCheckLocalStorage();
    this.addlockOnScrollBottomListener();
  }

  //
  // When navbar toggler is clicked (sandwich menu) make navbar have
  // a display of flex !important so opening keyboard on mobile does
  // not allow landscape mobile breakpoint to change navbar to display
  // none.
  //
  addNavbarTogglerListener() {
    $('.navbar-toggler').click(function () {
      $('nav.navbar').toggleClass('display-flex-important');
    });
  }

  //
  // Navbar search listener.
  //
  addNavbarSearchListener() {
    $('.navbar form.searchForm').submit(
      function (e) {
        e.preventDefault();
        this.navbarSearch();
      }.bind(this)
    );
  }

  //
  // Navbar search function.
  //
  navbarSearch() {
    $('.spinner-zone').show();
    $('.navbar-collapse').removeClass('open');
    $('nav.navbar').removeClass('display-flex-important');
    const term = $('.navbar form.searchForm input').val();
    FormFunctsObj.$searchTerm.val(term);
    FormFunctsObj.keywordDisplayLogic(term);
    if (term) {
      // Check for @ symbol and reload index page with q query term
      // to check for user and possibly redirect to the user's profile.
      if (term[0] === '@') {
        window.location.href = `/navbar-search?q=${term}`;
        return;
      }
      // Search in All category.
      IndexAnimationsObj.category = 'restaurants,bars,food';
      $('.cat-display').text('All');
      FormFunctsObj.turnActiveOffCatBtns();
      $('#All').addClass('active');
      location.href = '#';
      location.href = '#All';
    }
    this.hideHeroAndSearch();
  }

  addExploreBtnsListeners() {
    // Navbar explore button closes navbar slideout menu.
    $('.explore-nav').on(
      'click',
      function (e) {
        e.preventDefault();
        $('.alert').hide();
        $('nav.navbar').removeClass('display-flex-important');
        // // Resize for map.
        // window.dispatchEvent(new Event('resize'));
        $('.navbar-collapse').removeClass('open');
      }.bind(this)
    );
    // Hero explore button lock view to bottom and search.
    $('.explore').on(
      'click',
      function (e) {
        e.preventDefault();
        this.hideHeroAndSearch();
      }.bind(this)
    );
  }

  //
  // Make a request to /v1/search endpoint.
  //
  async searchApiCall(useOffset) {
    let queryData = FormFunctsObj.getFormData();
    if (useOffset) queryData += `&offset=${this.offset * 50}`;
    // Axios get search endpoint with query data
    try {
      var data = await axios.get(`/v1/search?${queryData}`);
    } catch (error) {
      alert(`Yelp API Error ${error.message}`);
      return false;
    }
    if (data.data.error) {
      CardsModalsFactoryObj.errorCard(data.data);
      return false;
    }
    return data;
  }

  //
  // Search request handler. Needs location.
  //
  async searchYelp() {
    // Make sure there is a location to search.
    if (!Map_Obj.latitude && FormFunctsObj.$locationInput.val() === '') {
      alert('Enter a location or press detect location.');
      return;
    }
    // Get last search results from API call.
    const lastData = localStorage.getItem('currData');
    // Get current form data array.
    const currFormState = FormFunctsObj.$mainForm.serializeArray();

    // if yelp parameters have changed call api endpoint
    if (ParamsChangeObj.checkParameterChange(lastData, currFormState)) {
      // Make request to Yelp through function searchApiCall.
      var data = await this.searchApiCall();

      if (data === false) {
        $('.spinner-zone').hide();
        FormFunctsObj.filterIndicatorCheck();
        return;
      }
      // Check if new data is different from last data.
      // If not, set data to null so card repaint is avoided
      // unless transactions have changed.
      // NOTE: ["delivery", "pickup"] text changes places in
      // JSON from Yelp. Equality test only effective sometimes.
      const jsonData = JSON.stringify(data.data);
      if (jsonData === lastData) data = null;
      // save new data in local storage
      else localStorage.setItem('currData', jsonData);
    }
    this.postSearchDomManipulation(currFormState);
    // Avoid repaint.
    if (this.transactionsNoChangeAndNoNewData(!!data)) return;

    IndexAnimationsObj.justSearchedYelp = true;
    // If no new data use last data.
    var data = data ? data.data : JSON.parse(lastData);

    this.mapAndAddCardsForNewApiCall(data);
  }

  //
  // Post search DOM manipulation.
  //
  postSearchDomManipulation(currFormState) {
    $('.spinner-zone').hide();
    IndexButtonsLogicsObj.showCardTrack();
    FormFunctsObj.filterIndicatorCheck(currFormState);
  }

  //
  // Return bool representing if no new data and transactions
  // haven't changed. If so nothing new to display.
  // But if first cards not added yet return false.
  //
  transactionsNoChangeAndNoNewData(newData) {
    if (!this.firstCardsAdded) {
      this.firstCardsAdded = true;
      return false;
    }
    const transactionsChanged = FormFunctsObj.checkTransactionsChange();

    if (!transactionsChanged && !newData) return true;
    FormFunctsObj.setTransactions();
    return false;
  }

  //
  // Map first business and add cards for business results..
  //
  mapAndAddCardsForNewApiCall(data) {
    if (this.paginationListener) this.paginationListener.off();
    $('.resultsCount').text(data.total);
    $('.arrow-wrapper').removeClass('pulse-outline-mobile');
    this.resultsRemaining = data.total - data.businesses.length;
    this.offset = 1;

    if (data.businesses.length == 0) {
      $('.card-track-inner').html(CardsModalsFactoryObj.getNoResultsCard());
      if (Map_Obj.restMarker) Map_Obj.restMarker.remove();
      return;
    }
    $('.card-track-inner').hide();
    this.userMarkAndYelpCoordsLogic(data);

    const cards = CardsModalsFactoryObj.getCardsHtml(data.businesses);
    IndexAnimationsObj.currCard = 0;

    // Scroll to first card and fade in.
    // There may not be results cards because of transaction post filtering.
    $('#scrl4').scrollLeft(0);
    $('.card-track-inner')
      .addClass('opaque')
      .show()
      .html(cards ? cards : CardsModalsFactoryObj.getNoResultsCard())
      .removeClass('opaque');

    // If cards map first business, watch scroll position for mapping,
    // watch scroll position for adding more cards. Filtering for transactions
    // (interface) may result in no cards.
    if (cards) {
      this.mapFirstBusiness(data);
      // No dummy card needed for one result.
      if (!this.resultsRemaining && data.total !== 1)
        CardsModalsFactoryObj.addDummyCard();
      if (IndexAnimationsObj.sidebarOpen)
        $('.arrow-wrapper').addClass('pulse-outline-mobile');
      IndexAnimationsObj.setCardScrollTrackerMapper();
      setTimeout(() => {
        this.addNextCardsListener();
      }, 1000);
    } else {
      // if no cards no restMarker should be visible.
      if (Map_Obj.restMarker) Map_Obj.restMarker.remove();
    }
  }

  //
  // Set lng/lat from Yelp data if user entered location.
  // Mark user.
  //
  userMarkAndYelpCoordsLogic(data) {
    // if text location given and new Yelp data
    // use coords Yelp returned for lng, lat.
    if (FormFunctsObj.$locationInput.val() && data) {
      Geolocation_Obj.clearLocationWatching();
      this.yelpSetLocation(data);
    }
    Map_Obj.addUserMarker();
    Map_Obj.userMarker.togglePopup();
  }

  //
  // Set lng/lat from Yelp data if it has changed.
  //
  yelpSetLocation(data) {
    // extract lng/lat from new yelp data
    const {
      region: {
        center: { longitude: lng, latitude: lat },
      },
    } = data;
    // if lng/lat has changed
    if (Map_Obj.longitude !== lng || Map_Obj.latitude !== lat) {
      Map_Obj.longitude = lng;
      Map_Obj.latitude = lat;
      // Set location placeholder back to 'Location'.
      FormFunctsObj.$locationInput.prop('placeholder', `Location`);
      // store coords
      localStorage.setItem('coords', JSON.stringify([lng, lat]));
    }
  }

  //
  // Map first business.
  //
  mapFirstBusiness(data) {
    const {
      businesses: [first, ...rest],
    } = data;
    const { longitude: lng, latitude: lat } = first.coordinates;
    Map_Obj.addRestMarkerAndFitBounds([lng, lat], first.name, first.id);
  }

  //
  // When cards scrolled almost to end add next cards.
  //
  addNextCardsListener() {
    const this_ = this;
    if (this.resultsRemaining === 0) return;
    this.paginationListener = $('#scrl4').scroll(function (e) {
      if (
        $(this).scrollLeft() + $(this).width() >
        e.target.scrollWidth * 0.96
      ) {
        this_.paginationListener.off();
        this_.addNextCards();
      }
    });
  }

  //
  // Add more cards for "infinite" scroll.
  // If more results remain, call API, make cards.
  //
  async addNextCards() {
    if (!this.resultsRemaining || this.offset === 20) {
      CardsModalsFactoryObj.addDummyCard();
      setTimeout(() => {
        IndexAnimationsObj.setCardScrollTrackerMapper();
      }, 100);
      return;
    }
    const data = await this.searchApiCall(true);
    this.offset++;
    if (data === false) return;

    this.resultsRemaining -= data.data.businesses.length;
    $('.card-track-inner').append(
      CardsModalsFactoryObj.getCardsHtml(data.data.businesses)
    );
    IndexAnimationsObj.setCardScrollTrackerMapper();

    if (this.resultsRemaining)
      setTimeout(() => {
        this.addNextCardsListener();
      }, 10000);
    else CardsModalsFactoryObj.addDummyCard();
  }

  //
  // Hide hero animation and make yelp search.
  //
  hideHeroAndSearch() {
    IndexAnimationsObj.heroAnimation.destroy();
    $('.hero-animation').hide();
    $('.alert').hide();
    $('.spinner-zone').show();
    IndexAnimationsObj.scrollCategoriesToCurrent();
    // if there is given location request search
    if (FormFunctsObj.$locationInput.val()) this.searchYelp();
    // if no given location but allowing location sharing detect location
    else if (
      !Geolocation_Obj.locationWatcher &&
      localStorage.getItem('geoAllowed') === 'true'
    )
      setTimeout(() => {
        Geolocation_Obj.detectLocation();
      }, 600);
    // If already watching location or if there are already coords to use.
    else if (Map_Obj.longitude) this.searchYelp();
  }

  //
  // When user scrolls to bottom of page call lockOnScrollBottom.
  //
  addlockOnScrollBottomListener() {
    window.addEventListener('scroll', this.lockOnScrollBottom.bind(this), {
      passive: true,
    });
  }

  //
  // When page scrolled within 100px of the bottom of the page,
  // lock the page to the bottom view (main-interface) by removing
  // the hero animation. Search if makeSearch flag is true.
  //
  lockOnScrollBottom() {
    // when bottom of screen is scrolled to.
    if (
      window.pageYOffset + window.innerHeight >
      document.body.clientHeight - 100
    ) {
      window.removeEventListener('scroll', this.lockOnScrollBottom, {
        passive: true,
      });
      if (this.makeSearch && !this.firstCardsAdded) {
        this.hideHeroAndSearch();
        this.makeSearch = false;
      } else $('.hero-animation').hide();
    }
  }

  //
  // Set Lng/lat data from hidden inputs then remove hidden inputs.
  // If no data in hidden inputs use last location data.
  //
  setLngLatInit() {
    FormFunctsObj.setLngLatFromHiddenInputs();
    if (!Map_Obj.latitude) setCoordsFromStorage();
  }

  //
  // Check localStorage for coordinate data.
  // Set script lng/lat. Return coords.
  //
  setCoordsFromStorage() {
    const coords = localStorage.getItem('coords');
    if (coords) {
      const [lng, lat] = JSON.parse(coords);
      Map_Obj.longitude = lng;
      Map_Obj.latitude = lat;
    }
  }

  //
  // If there is navbar search term value on page load then
  // execute navbarSearch function on the passed in value.
  // Otherwise check local storage for form data to load.
  // Return true or false if a further Yelp search is needed.
  //
  checkSearchInputOrCheckLocalStorage() {
    if ($('.navbar form.searchForm input').val()) {
      // Set location then search using navbarSearch function.
      FormFunctsObj.setLocationValue();
      this.navbarSearch();
      return false;
      //
    } else {
      this.checkLocalStorage();
      return true;
    }
  }

  //
  // Check localStorage for data to bring form to last known
  // state set last category active, and search.
  //
  checkLocalStorage() {
    FormFunctsObj.setCategoryFromStorage();
    FormFunctsObj.updateFormFromStorage();
  }
}

// ParamsChange -----------------------------------------------------------  //
// ParamsChange -----------------------------------------------------------  //
// ParamsChange -----------------------------------------------------------  //
// ParamsChange -----------------------------------------------------------  //
// ParamsChange -----------------------------------------------------------  //
// ParamsChange -----------------------------------------------------------  //

class ParamsChange {
  constructor() {}
  //
  // Check for changes that warrant a new Yelp API call.
  // Form, category, significant GPS change, or no stored data warrant API call.
  // Called functions update local storage if they detect changes.
  //
  checkParameterChange(lastData, currFormState) {
    // set change to true if a new API call is warranted.
    let change = false;
    // Coordinate precision used to look for lng/lat changes
    // which would warrant new Yelp API call for fresh data.
    this.coordsPercision = 3;

    change = this.checkFormChanges(change, currFormState);

    change = this.checkCoordsChange(change);

    change = this.checkCategoryChange(change);

    if (!change) change = this.checkLastData(lastData);

    return change;
  }

  //
  // Check if control panel form data has changed.
  //
  checkFormChanges(change, currFormState) {
    const prevFormState = localStorage.getItem('formData');

    // if form data changed warrants API call
    if (JSON.stringify(currFormState) !== prevFormState) {
      FormFunctsObj.setFormDataArray(currFormState);
      return true;
    }
    // Else if open now selected always make a new api call
    else if ($('#open_now').prop('checked') === true) return true;

    // TODO: Add 30sec or greater data age then make new api call.
    // when open_now selected.

    // TODO: Add 1 day age or greater data age then make new api call
    // general search functionality.
    return change;
  }

  //
  // Check if user coordinates have changed.
  //
  checkCoordsChange(change) {
    const prevCoords = JSON.parse(localStorage.getItem('coords'));

    // if there is lng/lat data but no previous stored coordinates data
    if (Map_Obj.longitude && !prevCoords) {
      // Store coords.
      localStorage.setItem(
        'coords',
        JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
      );
      // if there is not a location given having coordinates warrants an API call
      if (!FormFunctsObj.$locationInput.val()) return true;
      // Else if no location given and new and old coordinates to compare:
    } else if (
      !FormFunctsObj.$locationInput.val() &&
      Map_Obj.longitude &&
      prevCoords
    ) {
      const [prevLng, prevLat] = prevCoords;
      // if coordinates have changed beyond precision threshold:
      if (
        Map_Obj.longitude.toFixed(this.coordsPercision) !==
          prevLng.toFixed(this.coordsPercision) ||
        Map_Obj.latitude.toFixed(this.coordsPercision) !==
          prevLat.toFixed(this.coordsPercision)
      ) {
        // Store coords.
        localStorage.setItem(
          'coords',
          JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
        );
        // Warrants an API call.
        return true;
      }
    }
    return change;
  }

  //
  // Check if the category has changed.
  //
  checkCategoryChange(change) {
    const prevCategory = localStorage.getItem('category');

    // category change warrants an API call
    if (prevCategory !== IndexAnimationsObj.category) {
      localStorage.setItem('category', IndexAnimationsObj.category);
      return true;
    }
    return change;
  }

  //
  // Check if their is previous data stored in local storage.
  //
  checkLastData(lastData) {
    // if there is no stored yelp data must make api call
    if (!lastData || ['undefined', 'false'].includes(lastData)) {
      return true;
    }
    return false;
  }
}

// Buttons Logic ---------------------------------------------------------- //
// Buttons Logic ---------------------------------------------------------- //
// Buttons Logic ---------------------------------------------------------- //
// Buttons Logic ---------------------------------------------------------- //
// Buttons Logic ---------------------------------------------------------- //
// Buttons Logic ---------------------------------------------------------- //
// Buttons Logic ---------------------------------------------------------- //

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
    const this_ = this;
    $('.showMap').on('click', this.toggleMap);
    $('.showMap').on('dragstart', this.toggleMap);
    $('.showMap').on('touchstart', function (e) {
      e.preventDefault();
      this_.toggleMap();
    });
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
    const this_ = this;
    $('.toggleCards').on('click', this.toggleCards);
    $('.toggleCards').on('dragstart', this.toggleCards);
    $('.toggleCards').on('touchstart', function (e) {
      e.preventDefault();
      this_.toggleCards();
    });
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
  // Get the mission-btn (add to mission) button which holds the business id and call
  // getShowBusinessDetails.
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
    Map_Obj.profile = $el.data('profile');
    Map_Obj.markerStyle = 1;
    Map_Obj.userMarkerStyle = 1;
    Map_Obj.addUserMarker();
    this.navStartDOMAdjustments($el);
    // If currently navigating home show route for newly selected navigation profile.
    if ($('.map-routing .home').hasClass('homeActive')) {
      Map_Obj.showDirectionsAndLine();
      Map_Obj.fitBounds();
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

const ParamsChangeObj = new ParamsChange();
const IndexButtonsLogicsObj = new ButtonsLogics();
const IndexSearchObj = new IndexSearchLogic();
