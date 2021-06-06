'use strict';

class IndexSearchLogic {
  constructor() {
    // Cards variables
    this.firstCardsAdded = false;
    this.resultsRemaining = 0;
    this.offset = 0;
    this.paginationListener = null;
    this.nextCardsBlocker = false; // Prevent race condition loading next cards twice.
    this.blockLockScrollBottom = false; // Prevent race condition firing event twice.
    this.addNavbarTogglerListener();
    this.addNavbarSearchListener();
    this.addExploreBtnsListeners();
    this.setLngLatInit();
    const addLockOnScrollBottom = this.checkSearchInputOrCheckLocalStorage();
    if (addLockOnScrollBottom) this.addLockOnScrollBottomListener();
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
    $('.navbar form.searchForm').submit(e => {
      e.preventDefault();
      this.navbarSearch();
    });
  }

  //
  // Navbar search function.
  //
  navbarSearch() {
    $('.spinner-zone').slideDown();
    // Hide slide-out navbar menu.
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
      location.href = '#All';
    }
    // Avoid double yelp search if lockOnScrollBottotmListener is active.
    this.blockLockScrollBottom = true;
    this.hideHeroAndSearch();
  }

  addExploreBtnsListeners() {
    // Navbar explore button closes navbar slide out menu.
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
      var { data } = await axios.get(`/v1/search?${queryData}`);
    } catch (error) {
      alert(`Yelp API Error ${error.message}`);
      return false;
    }
    if (data.error) {
      CardsModalsFactoryObj.errorCard(data.error);
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
      $('.spinner-zone').slideUp();
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
        $('.spinner-zone').slideUp();
        FormFunctsObj.filterIndicatorCheck();
        return;
      }
      // Check if new data is different from last data.
      // If not, set data to null so card repaint is avoided
      // unless transactions have changed.
      // NOTE: ["delivery", "pickup"] text changes places in
      // JSON from Yelp. Equality test only effective sometimes.
      const jsonData = JSON.stringify(data);
      if (jsonData === lastData) data = null;
      // save new data in local storage
      else localStorage.setItem('currData', jsonData);
    }
    this.postSearchDomManipulation(currFormState);
    // Avoid repaint.
    if (this.transactionsNoChangeAndNoNewData(!!data)) return;

    IndexAnimationsObj.justSearchedYelp = true;
    // If no new data use last data.
    var data = data || JSON.parse(lastData);

    this.mapAndAddCardsForNewApiCall(data);
  }

  //
  // Post search DOM manipulation.
  //
  postSearchDomManipulation(currFormState) {
    $('.spinner-zone').slideUp();
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
        this.nextCardsBlocker = false;
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
    if (this.nextCardsBlocker) return;
    this.nextCardsBlocker = true;
    if (!this.resultsRemaining || this.offset === 20) {
      CardsModalsFactoryObj.addDummyCard();
      setTimeout(() => {
        IndexAnimationsObj.setCardScrollTrackerMapper();
      }, 100);
      return;
    }
    const data = await this.searchApiCall(true);
    if (data === false) return;
    // Update remaining results.
    this.resultsRemaining -= data.businesses.length;
    // Add cards.
    $('.card-track-inner').append(
      CardsModalsFactoryObj.getCardsHtml(data.businesses)
    );
    IndexAnimationsObj.setCardScrollTrackerMapper();
    // Get first added next card to move misaligned cards up. (iphone bug fix)
    const firstCard = $('.my-card').eq(this.offset * 50);
    // Increment offset.
    this.offset++;
    setTimeout(() => {
      // Add text to firstCard to move misaligned cards up. (iphone bug fix)
      firstCard.find('.offset-fix').text('_');
    }, 400);

    if (this.resultsRemaining)
      setTimeout(() => {
        this.addNextCardsListener();
        this.nextCardsBlocker = false;
      }, 10000);
    else CardsModalsFactoryObj.addDummyCard();
  }

  //
  // Hide hero animation and make yelp search.
  //
  async hideHeroAndSearch() {
    IndexAnimationsObj.heroAnimation.destroy();
    $('.hero-animation').hide();
    $('.alert').hide();
    $('.spinner-zone').slideDown();
    IndexAnimationsObj.scrollCategoriesToCurrent();
    // Make sure map has loaded before searching Yelp.
    while (Map_Obj.mappyBoi === null) {
      await Base_Obj.sleep(100);
    }
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
  // When user scrolls call lockOnScrollBottom.
  //
  addLockOnScrollBottomListener() {
    window.addEventListener('scroll', this.lockOnScrollBottom.bind(this), {
      passive: true,
    });
  }

  //
  // When page scrolled within 100px of the bottom of the page,
  // lock the page to the bottom view (main-interface) by removing
  //
  lockOnScrollBottom() {
    // when bottom of screen is scrolled to.
    if (
      window.pageYOffset + window.innerHeight >
      document.body.clientHeight - 100
    ) {
      // Avoid multiple events firing this function more than once.
      if (this.blockLockScrollBottom) return;
      this.blockLockScrollBottom = true;
      window.removeEventListener('scroll', this.lockOnScrollBottom, {
        passive: true,
      });
      this.hideHeroAndSearch();
    }
  }

  //
  // Set Lng/lat data from hidden inputs then remove hidden inputs.
  // If no data in hidden inputs use last location data.
  //
  setLngLatInit() {
    FormFunctsObj.setLngLatFromHiddenInputs();
    if (!Map_Obj.latitude) this.setCoordsFromStorage();
  }

  //
  // Check localStorage for coordinate data.
  // Set Map_Obj lng/lat.
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
  // Return true or false if lockOnScrollBottomListener is necessary.
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

const IndexSearchObj = new IndexSearchLogic();
