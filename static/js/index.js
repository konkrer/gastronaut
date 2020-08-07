'use strict';

class IndexSearchLogic {
  constructor() {
    // Cooridnate percision used to look for lng/lat changes
    // which would warant new Yelp API call for fresh data.
    this.coordsPercision = 3;

    // Cards variables
    this.firstCardsAdded = false;
    this.resultsRemaining = 0;
    this.offset = 0;
    this.paginationListener = null;

    // Scroll position listener to detect scroll to bottom
    // of page to hide globe animation and lock control panel view.
    this.$scrollListener = null;

    this.addNavbarTogglerListener();
    this.addNavbarSearchListener();
    this.addExploreBtnsListeners();
    this.setLngLatInit();
    const makeSearch = this.checkSearchInputOrCheckLocalStorage();
    this.lockOnScrollBottom(makeSearch);
  }

  /*
  /* When navbar toggler is clicked (sandwich menu) make navbar have
  /* a display of flex !important so opening keyboard on mobile does 
  /* not allow landscape mobile breakpoint change navbar to  display 
  /* none.
  */
  addNavbarTogglerListener() {
    $('.navbar-toggler').click(function () {
      $('nav.navbar').toggleClass('display-flex-important');
    });
  }

  /*
  /* Navbar search listener.
  */
  addNavbarSearchListener() {
    $('.navbar form.searchForm').submit(
      function (e) {
        e.preventDefault();
        this.navbarSearch();
      }.bind(this)
    );
  }

  /*
  /* Navbar search function.
  */
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
      Animations.category = 'restaurants,bars,food';
      $('.cat-display').text('All');
      FormFunctsObj.turnActiveOffCatBtns();
      $('#All').addClass('active');
      location.href = '#';
      location.href = '#All';
    }
    this.hideHeroAndSearch();
  }

  addExploreBtnsListeners() {
    // Navbar explore button toggles view lock to bottom
    // and toggles globe animation display.
    $('.explore-nav').on(
      'click',
      function (e) {
        e.preventDefault();
        $('.hero-animation').toggle();
        $('.alert').hide();
        window.dispatchEvent(new Event('resize'));
        $('.navbar-collapse').removeClass('open');
        this.lockOnScrollBottom(false);
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

  /*
  /* Make a requst to /v1/search endpoint. 
  */
  async searchApiCall(useOffset) {
    let queryData = FormFunctsObj.getFormData();
    if (useOffset) queryData += `&offset=${this.offset * 50}`;
    // axios get search endpoint with query data
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

  /*
  /* Search request handler. Needs location.
  */
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
      // usless transactions have changed.
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

    Animations.justSearchedYelp = true;
    // If no new data use last data.
    var data = data ? data.data : JSON.parse(lastData);

    this.mapAndAddCardsForNewApiCall(data);
  }

  /* 
  /* Post search DOM manipulation. 
  */
  postSearchDomManipulation(currFormState) {
    $('.spinner-zone').hide();
    ButtonsLogicsObj.showCardTrack();
    FormFunctsObj.filterIndicatorCheck(currFormState);
  }

  /*
  /* Returen bool representing if no new data and transactions
  /* haven't changed. If so nothing new to display.
  /* But if first cards not added yet return false.
  */
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

  /*
  /* Map first business and add cards for business results.. 
  */
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
    Animations.currCard = 0;

    // Scroll to first card and fade in.
    // There may not be results cards because of transaction post filtering.
    $('#scrl4').scrollLeft(0);
    $('.card-track-inner')
      .addClass('opaque')
      .show()
      .html(cards ? cards : CardsModalsFactoryObj.getNoResultsCard())
      .removeClass('opaque');

    // If cards map first bussiness, watch scroll position for mapping,
    // watch scroll position for adding more cards. Filtering for transactions
    // (interface) may result in no cards.
    if (cards) {
      this.mapFirstBusiness(data);
      // No dummy card needed for one result.
      if (!this.resultsRemaining && data.total !== 1)
        CardsModalsFactoryObj.addDummyCard();
      if (Animations.sidebarOpen)
        $('.arrow-wrapper').addClass('pulse-outline-mobile');
      Animations.setCardScrollTrackerMapper();
      setTimeout(() => {
        this.addNextCardsListener();
      }, 1000);
    } else {
      // if no cards no restMarker should be visible.
      if (Map_Obj.restMarker) Map_Obj.restMarker.remove();
    }
  }

  /*
  /* Set lng/lat from Yelp data if user entered location.
  /* Mark user. 
  */
  userMarkAndYelpCoordsLogic(data) {
    // if text location given and new Yelp data
    // use coords Yelp returned for lng, lat.
    if (FormFunctsObj.$locationInput.val() && data) {
      navigator.geolocation.clearWatch(Geolocation_Obj.locationWatcher);
      this.yelpSetLocation(data);
    }
    Map_Obj.addUserMarker();
  }

  /*
  /* Set lng/lat from Yelp data if it has changed. 
  */
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
      // store coords, render map, note rendered first coords map
      localStorage.setItem('coords', JSON.stringify([lng, lat]));
    }
  }

  /*
  /* Map first business. 
  */
  mapFirstBusiness(data) {
    const {
      businesses: [first, ...rest],
    } = data;
    const { longitude: lng, latitude: lat } = first.coordinates;
    Map_Obj.addRestMarkerAndFitBounds([lng, lat], first.name, first.id);
  }

  /*
  /* When cards scrolled almost to end add next cards.
  */
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

  /*
  /* Add more cards for "infinite" scroll.
  /* If more results remain, call API, make cards. 
  */
  async addNextCards() {
    if (!this.resultsRemaining || this.offset === 20) {
      CardsModalsFactoryObj.addDummyCard();
      setTimeout(() => {
        Animations.setCardScrollTrackerMapper();
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
    Animations.setCardScrollTrackerMapper();

    if (this.resultsRemaining)
      setTimeout(() => {
        this.addNextCardsListener();
      }, 10000);
    else CardsModalsFactoryObj.addDummyCard();
  }

  /*
  /* Hide hero animation and make yelp search.
  */
  hideHeroAndSearch() {
    $('.hero-animation').hide();
    $('.alert').hide();
    Animations.scrollCategoriesToCurrent();
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
    // If coords use those to search.
    else if (Map_Obj.longitude) this.searchYelp();
  }

  /*
  /* When user scrolls to bottom of page call hideHeroAndSearch()
  /* if makeSearch is true. Else hide hero animation.
  */
  lockOnScrollBottom(makeSearch = true) {
    this.$scrollListener = $(window).on(
      'scroll',
      function () {
        // when bottom of screen is scrolled to.
        if (
          $(window).scrollTop() + $(window).height() >
          $(document).height() - 100
        ) {
          this.$scrollListener.off();
          if (makeSearch) this.hideHeroAndSearch();
          else $('.hero-animation').hide();
        }
      }.bind(this)
    );
  }

  /*
  /* Set Lng/lat data from hidden inputs then remove hidden inputs.
  /* If no data in hidden inputs use last location data.
  */
  setLngLatInit() {
    FormFunctsObj.setLngLatFromHiddenInputs();
    if (!Map_Obj.latitude) setCoordsFromStorage();
  }

  /*
  /* Check localStorage for coordinate data.
  /* Set script lng/lat. Return coords.
  */
  setCoordsFromStorage() {
    const coords = localStorage.getItem('coords');
    if (coords) {
      const [lng, lat] = JSON.parse(coords);
      Map_Obj.longitude = lng;
      Map_Obj.latitude = lat;
    }
  }

  /*
  /* If there is navbar search term value on page load then
  /* execute navbarSearch function on the passed in value.
  /* Otherwise check local storage for form data to load.
  /* Return true or false if a further Yelp search is needed.
  */
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

  /*
  /* Check localStorage for data to bring form to last known
  /* state set last category active, and search.
  */
  checkLocalStorage() {
    FormFunctsObj.setCategoryFromStorage();
    FormFunctsObj.updateFormFromStorage();
  }
}

class ParamsChange {
  constructor() {}
  /*
  /* Check for changes that warrant a new Yelp API call.
  /* Form, category, significant GPS change, or no stored data warrant API call.
  /* Called functions update local storage if they detect changes.
  */
  checkParameterChange(lastData, currFormState) {
    // set change to true if a new API call is waranted.
    let change = false;

    change = this.checkFormChanges(change, currFormState);

    change = this.checkCoordsChange(change);

    change = this.checkCategoryChange(change);

    if (!change) change = this.checkLastData(lastData);

    return change;
  }

  /*
  /* Check if control panel form data has changed.
  */
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

  /*
  /* Check if user coordinates have changed.
  */
  checkCoordsChange(change) {
    const prevCoords = JSON.parse(localStorage.getItem('coords'));

    // if there is lng/lat data but no previous stored coords data
    if (Map_Obj.longitude && !prevCoords) {
      localStorage.setItem(
        'coords',
        JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
      );
      // if there is not a location given having coords warrants an API call
      if (!FormFunctsObj.$locationInput.val()) return true;
      // if no location given and new ond old coords to compare:
    } else if (
      !FormFunctsObj.$locationInput.val() &&
      Map_Obj.longitude &&
      prevCoords
    ) {
      const [prevLng, prevLat] = prevCoords;
      // if coords have changed:
      if (
        Map_Obj.longitude.toFixed(this.coordsPercision) !==
          prevLng.toFixed(this.coordsPercision) ||
        Map_Obj.latitude.toFixed(this.coordsPercision) !==
          prevLat.toFixed(this.coordsPercision)
      ) {
        localStorage.setItem(
          'coords',
          JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
        );
        return true;
      }
    }
    return change;
  }

  /*
  /* Check if the category has changed.
  */
  checkCategoryChange(change) {
    const prevCategory = localStorage.getItem('category');

    // category change warrants an API call
    if (prevCategory !== Animations.category) {
      localStorage.setItem('category', Animations.category);
      return true;
    }
    return change;
  }

  /*
  /* Check if ther is previous data stored in local storage.
  */
  checkLastData(lastData) {
    // if there is no stored yelp data must make api call
    if (!lastData || ['undefined', 'false'].includes(lastData)) {
      return true;
    }
    return false;
  }
}

class ButtonsLogics {
  constructor() {
    this.addMapBusinessBtnListener();
    this.addMapToggleBtnListener();
    this.addCardsToggleBtnListener();
    this.addBusinessDetailsListeners();
  }

  /*
  /* Show restaurant marker and fit bounds when card map button is clicked.
  */
  addMapBusinessBtnListener() {
    $('.card-track-inner').on('click', '.cardMapButton', function (e) {
      e.preventDefault();
      const lng = $(this).next().children().data('lng');
      const lat = $(this).next().children().data('lat');
      const name = $(this).next().children().data('name');
      const id = $(this).next().children().data('id');
      if (!Map_Obj.mapOpen) this.toggleMap();
      Map_Obj.addRestMarkerAndFitBounds([+lng, +lat], name, id);
    });
  }

  /*
  /* Toggle map listener.
  */
  addMapToggleBtnListener() {
    $('.showMap').on('click', this.toggleMap);
  }

  /*
  /* Toggle map button fuctionality. Open and close map.
  */
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
      Animations.setCardsScrollLeft();
    }
    // Toggle all map items.
    $('.card-map-zone').toggleClass('map-collapse');
    $('#map').toggle();
    $('.mapBtns').toggle();
    $('.map-toggle').toggleClass('toggle-on-map');
    $('.map-track').toggleClass(['border-top', 'border-secondary']);
    if (Map_Obj.mapOpen) {
      Map_Obj.mapOpen = false;
    } else {
      Map_Obj.mapOpen = true;
      Map_Obj.mappyBoi.resize();
    }
  }

  /*
  /* Cards toggle listener.
  */
  addCardsToggleBtnListener() {
    $('.toggleCards').on('click', this.toggleCards);
  }

  /*
  /* Show/hide cards fuctionality. Big/small map.
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
      Animations.setCardsScrollLeft();
    }
  }

  /*
  /* Show cards fuctionality for search Yelp. If cards are hidden
  /* they will be shown after search Yelp.
  */
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

  /*
  /* Card business detail listeners.
  */
  addBusinessDetailsListeners() {
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

  /*
  /* Get the add-to-missions button which holds the business id and call 
  /* getShowBusinessDetails.
  */
  getBtnAndShowDetails() {
    // Get the details button.
    const detailBtn = $(this).hasClass('detailsBtnCard')
      ? $(this)
      : $(this).find('.detailsBtnCard');

    const fakeE = {
      currentTarget: {
        dataset: {
          id: detailBtn.next().next().children().data('id'),
        },
      },
    };

    ApiFunctsObj.getShowBusinessDetails(fakeE);
  }
}

const ParamsChangeObj = new ParamsChange();
const ButtonsLogicsObj = new ButtonsLogics();
const IndexSearchObj = new IndexSearchLogic();
