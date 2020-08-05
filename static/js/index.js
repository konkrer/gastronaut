'use strict';

// Cooridnate percision used to look for lng/lat changes
// which would warant new Yelp API call for fresh data.
const coordsPercision = 3;

// Cards variables
let firstCardsAdded = false;
let resultsRemaining;
let offset;
let paginationListener;

// Scroll position listener to detect scroll to bottom
// of page to hide globe animation and lock control panel view.
let $scrollListener;

/*
/* Check if control panel form data has changed.
*/
function checkFormChanges(change, currFormState) {
  const prevFormState = localStorage.getItem('formData');

  // if form data changed warrants API call
  if (JSON.stringify(currFormState) !== prevFormState) {
    FormFunctsObj.setFormDataArray(currFormState);
    console.log('form data changed');
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
function checkCoordsChange(change) {
  const prevCoords = JSON.parse(localStorage.getItem('coords'));

  // if there is lng/lat data but no previous stored coords data
  if (Map_Obj.longitude && !prevCoords) {
    localStorage.setItem(
      'coords',
      JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
    );
    // if there is not a location given having coords warrants an API call
    console.log('was blank now coords');
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
      Map_Obj.longitude.toFixed(coordsPercision) !==
        prevLng.toFixed(coordsPercision) ||
      Map_Obj.latitude.toFixed(coordsPercision) !==
        prevLat.toFixed(coordsPercision)
    ) {
      localStorage.setItem(
        'coords',
        JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
      );
      console.log('coords have changed');
      return true;
    }
  }
  return change;
}

/*
/* Check if the category has changed.
*/
function checkCategoryChange(change) {
  const prevCategory = localStorage.getItem('category');

  // category change warrants an API call
  if (prevCategory !== Animations.category) {
    localStorage.setItem('category', Animations.category);
    console.log('category changed');
    return true;
  }
  return change;
}

/*
/* Check if ther is previous data stored in local storage.
*/
function checkLastData(lastData) {
  // if there is no stored yelp data must make api call
  if (!lastData || ['undefined', 'false'].includes(lastData)) {
    return true;
  }
  return false;
}

/*
/* Check for changes that warrant a new Yelp API call.
/* Form, category, significant GPS change, or no stored data warrant API call.
/* Called functions update local storage if they detect changes.
*/
function checkParameterChange(lastData, currFormState) {
  // set change to true if a new API call is waranted.
  let change = false;

  change = checkFormChanges(change, currFormState);

  change = checkCoordsChange(change);

  change = checkCategoryChange(change);

  if (!change) change = checkLastData(lastData);

  return change;
}

/*
/* Make a requst to /v1/search endpoint. 
*/
async function searchApiCall(useOffset) {
  let queryData = FormFunctsObj.getFormData();
  if (useOffset) queryData += `&offset=${offset * 50}`;
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
/* Set lng/lat from Yelp data if it has changed. 
*/
function yelpSetLocation(data) {
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
/* Set lng/lat from Yelp data if user entered location.
/* Mark user. 
*/
function userMarkAndYelpCoordsLogic(data) {
  // if text location given and new Yelp data
  // use coords Yelp returned for lng, lat.
  if (FormFunctsObj.$locationInput.val() && data) {
    navigator.geolocation.clearWatch(Geolocation_Obj.locationWatcher);
    yelpSetLocation(data);
  }
  Map_Obj.addUserMarker();
}

/*
/* Returen bool representing if no new data and transactions
/* haven't changed. If so nothing new to display.
/* But if first cards not added yet return false.
*/
function transactionsNoChangeAndNoNewData(newData) {
  if (!firstCardsAdded) {
    firstCardsAdded = true;
    return false;
  }
  const transactionsChanged = FormFunctsObj.checkTransactionsChange();

  if (!transactionsChanged && !newData) return true;
  FormFunctsObj.setTransactions();
  return false;
}

/*
/* Map first business. 
*/
function mapFirstBusiness(data) {
  const {
    businesses: [first, ...rest],
  } = data;
  const { longitude: lng, latitude: lat } = first.coordinates;
  Map_Obj.addRestMarkerAndFitBounds([lng, lat], first.name, first.id);
}

/*
/* Map first business. 
*/
function mapAndAddCardsForNewApiCall(data) {
  if (paginationListener) paginationListener.off();
  $('.resultsCount').text(data.total);
  $('.arrow-wrapper').removeClass('pulse-outline-mobile');
  resultsRemaining = data.total - data.businesses.length;
  offset = 1;

  if (data.businesses.length == 0) {
    $('.card-track-inner').html(CardsModalsFactoryObj.getNoResultsCard());
    if (Map_Obj.restMarker) Map_Obj.restMarker.remove();
    return;
  }
  $('.card-track-inner').hide();
  userMarkAndYelpCoordsLogic(data);

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
    mapFirstBusiness(data);
    // No dummy card needed for one result.
    if (!resultsRemaining && data.total !== 1)
      CardsModalsFactoryObj.addDummyCard();
    $('.arrow-wrapper').addClass('pulse-outline-mobile');
    Animations.setCardScrollTrackerMapper();
    setTimeout(() => {
      addNextCardsListener();
    }, 1000);
  } else {
    // if no cards no restMarker should be visible.
    if (Map_Obj.restMarker) Map_Obj.restMarker.remove();
  }
}

/* 
/* Post search DOM manipulation. 
*/
function postSearchDomManipulation(currFormState) {
  $('.spinner-zone').hide();
  showCardTrack();
  FormFunctsObj.filterIndicatorCheck(currFormState);
}

/*
/* Search request handler. Needs location.
/* If queryData is unchaged from last request 
/* transactions choices must have changed, skip API call.
*/
async function searchYelp() {
  console.log('searchYelp');

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
  if (checkParameterChange(lastData, currFormState)) {
    console.log('new search api call <<<<<<<<<<<<<<<<<<<******<<');

    var data = await searchApiCall();

    if (data === false) {
      $('.spinner-zone').hide();
      FormFunctsObj.filterIndicatorCheck();
      return;
    }

    // Check if new data is different from last data.
    // If not, set data to null so card repaint is avoided
    // usless transactions have changed.
    // NOTE: ["delivery", "pickup"] text changes places in
    //  JSON from Yelp. Equality test only effective sometimes.
    const jsonData = JSON.stringify(data.data);
    if (jsonData === lastData) data = null;
    // save new data in local storage
    else localStorage.setItem('currData', jsonData);
    console.log(data);
  }
  postSearchDomManipulation(currFormState);

  if (transactionsNoChangeAndNoNewData(!!data)) return;

  Animations.justSearchedYelp = true;

  // If no new data use last data.
  var data = data ? data.data : JSON.parse(lastData);

  mapAndAddCardsForNewApiCall(data);
}

/*
/* When cards scrolled almost to end add next cards.
*/
function addNextCardsListener() {
  if (resultsRemaining === 0) return;
  paginationListener = $('#scrl4').scroll(function (e) {
    if ($(this).scrollLeft() + $(this).width() > e.target.scrollWidth * 0.96) {
      paginationListener.off();
      addNextCards();
    }
  });
}

/*
/* Add more cards for "infinite" scroll.
/* If more results remain, call API, make cards. 
*/
async function addNextCards() {
  if (!resultsRemaining || offset === 20) {
    CardsModalsFactoryObj.addDummyCard();
    setTimeout(() => {
      Animations.setCardScrollTrackerMapper();
    }, 100);
    return;
  }
  console.log('adding next cards <<<<<<<<<<<<<<<+++++++<<');
  const data = await searchApiCall(true);
  offset++;
  if (data === false) return;

  resultsRemaining -= data.data.businesses.length;
  $('.card-track-inner').append(CardsModalsFactoryObj.getCardsHtml(data.data));
  Animations.setCardScrollTrackerMapper();

  if (resultsRemaining)
    setTimeout(() => {
      addNextCardsListener();
    }, 10000);
  else CardsModalsFactoryObj.addDummyCard();
}

/*
/* Navbar search listener.
*/
$('.navbar form.searchForm').submit(function (e) {
  e.preventDefault();
  navbarSearch();
});

/*
/* Navbar search function.
*/
function navbarSearch() {
  $('.spinner-zone').show();
  $('.navbar-collapse').removeClass('open');
  const term = $('.navbar form.searchForm input').val();
  FormFunctsObj.$searchTerm.val(term);
  FormFunctsObj.keywordDisplayLogic(term);
  if (term) {
    // check for @ symbol and redirect index with q query term
    // to check for user.
    if (term[0] === '@') {
      window.location.href = `/?q=${term}`;
      return;
    }
    Animations.category = 'restaurants,bars,food';
    $('.cat-display').text('All');
    FormFunctsObj.turnActiveOffCatBtns();
    $('#All').addClass('active');
    location.href = '#';
    location.href = '#All';
  }
  hideHeroAndSearch();
}

/*
/* Navbar explore button toggles view lock to bottom
/* and globe animation display.
*/
$('.explore-nav').on('click', function (e) {
  e.preventDefault();
  $('.hero-animation').toggle();
  $('.alert').hide();
  window.dispatchEvent(new Event('resize'));
  $('.navbar-collapse').removeClass('open');
  lockOnScrollBottom(false);
});

/*
/* Hero explore button lock view to bottom and search.
*/
$('.explore').on('click', function (e) {
  e.preventDefault();
  hideHeroAndSearch();
});

/*
/* Show restaurant marker and fit bounds when card map button is clicked.
*/
$('.card-track-inner').on('click', '.cardMapButton', function (e) {
  e.preventDefault();
  const lng = $(this).next().children().data('lng');
  const lat = $(this).next().children().data('lat');
  const name = $(this).next().children().data('name');
  const id = $(this).next().children().data('id');
  if (!Map_Obj.mapOpen) toggleMap();
  Map_Obj.addRestMarkerAndFitBounds([+lng, +lat], name, id);
});

/*
/* Show map button fuctionality. Open and close map.
*/
$('.showMap').each(function (index) {
  $(this).on('click', toggleMap);
});

function toggleMap() {
  if (Map_Obj.mapOpen && $('.card-map-zone').hasClass('cards-collapse')) {
    $('.card-map-zone').removeClass('cards-collapse');
    $('.card-track').show();
    $('.toggleCards')
      .children()
      .each(function (index) {
        $(this).toggleClass('d-none');
      });
    if (!$('.card-map-zone').hasClass('cards-collapse')) {
      Animations.setCardsScrollLeft();
    }
  }
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
/* Show/hide cards fuctionality. Big/small map.
*/
$('.toggleCards').on('click', toggleCards);

function toggleCards() {
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
function showCardTrack() {
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
/* Updating from local storage.
*/

function hideHeroAndSearch() {
  $('.hero-animation').hide();
  $('.alert').hide();
  Animations.scrollCategoriesToCurrent();
  // if there is given location request search
  if (FormFunctsObj.$locationInput.val()) searchYelp();
  // if no given location but allowing location sharing detect location
  else if (
    !Geolocation_Obj.locationWatcher &&
    localStorage.getItem('geoAllowed') === 'true'
  )
    setTimeout(() => {
      Geolocation_Obj.detectLocation();
    }, 600);
  // If coords use those to search.
  else if (Map_Obj.longitude) searchYelp();
}

/*
/* When user scrolls to bottom of page call hideHeroAndSearch() if makeSearch is true.
/* else hide hero animation.
*/
function lockOnScrollBottom(makeSearch = true) {
  $scrollListener = $(window).on('scroll', function () {
    // when bottom of screen is scrolled to.
    if (
      $(window).scrollTop() + $(window).height() >
      $(document).height() - 100
    ) {
      $scrollListener.off();
      if (makeSearch) hideHeroAndSearch();
      else $('.hero-animation').hide();
    }
  });
}

/*
/* Check localStorage for coordinate data.
/* Set script lng/lat. Return coords.
*/
function setCoordsFromStorage() {
  const coords = localStorage.getItem('coords');
  if (coords) {
    const [lng, lat] = JSON.parse(coords);
    Map_Obj.longitude = lng;
    Map_Obj.latitude = lat;
  }
}

/*
/* Set Lng/lat data from hidden inputs then remove hidden inputs.
/* If no data in hidden inputs use last location data.
*/
function setLngLatInit() {
  FormFunctsObj.setLngLatFromHiddenInputs();
  if (!Map_Obj.latitude) setCoordsFromStorage();
}

/*
/* Check localStorage for data to bring form to last known
/* state set last category active, and search.
*/
function checkLocalStorage() {
  FormFunctsObj.setCategoryFromStorage();
  FormFunctsObj.updateFormFromStorage();
}

/*
/* If there is navbar search term value on page load then
/* execute navbarSearch function on the passed in value.
/* Otherwise check local storage for form data to load.
/* Return true or false if a further Yelp search is needed.
*/
function checkSearchInputOrCheckLocalStorage() {
  if ($('.navbar form.searchForm input').val()) {
    // Set location then search using navbarSearch function.
    FormFunctsObj.setLocationValue();
    navbarSearch();
    return false;
    //
  } else {
    checkLocalStorage();
    return true;
  }
}

setLngLatInit();
const makeSearch = checkSearchInputOrCheckLocalStorage();
lockOnScrollBottom(makeSearch);

/*
/* Card business detail functionality.
*/
$('.card-track-inner').on('click', '.detailsBtnCard', getBtnAndShowDetails);
$('.card-track-inner').on('dblclick', '.my-card', getBtnAndShowDetails);

/*
/* Get the add-to-missions button which holds the business id and call 
/* getShowBusinessDetails.
*/
function getBtnAndShowDetails() {
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
