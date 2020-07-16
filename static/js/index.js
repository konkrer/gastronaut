'use strict';

const $locationInput = $('#location');
const $searchTerm = $('#search-term');
const $mainForm = $('#main-form');
const $categoryButtons = $('#cat-btns');

// Keyup timer for autosearch and keyup autosearch delay.
let keyupTimer;
const autoSearchDelay = 1500;

// Cooridnate percision used to look for lng/lat changes
// which would warant new Yelp API call for fresh data.
const coordsPercision = 3;
let latitude = null;
let longitude = null;

// Cards variables
let firstCardsAdded = false;
let resultsRemaining;
let offset;
let paginationListener;

// Used to reset form when passed into setForm.
const defaultFormState = [
  { name: 'location', value: '' },
  { name: 'term', value: '' },
  { name: 'price-1', value: '1' },
  { name: 'price-2', value: '2' },
  { name: 'price-3', value: '3' },
  { name: 'price-4', value: '4' },
  { name: 'sort_by', value: 'best_match' },
];

/*
/* Get current form data plus lat, lng, and category
/* as query string for search request api endpoint.
*/
function getFormData() {
  let data = $mainForm.serialize();
  data = `${data}&categories=${category}&limit=50`;
  if (latitude)
    data += `&latitude=${latitude.toFixed(3)}&longitude=${longitude.toFixed(
      3
    )}`;
  return data;
}

/*
/* Get current form data as obj array.
/* Store in local storage as "formData".
*/
function setFormDataArray(data) {
  data = data ? data : $mainForm.serializeArray();
  localStorage.setItem('formData', JSON.stringify(data));
}

/*
/* Get current interface form data as array of strings.
/* Used to filter results after api call.
*/
function getTransactions() {
  const transactions = [];
  $('.interface:checked').each(function (index) {
    transactions.push($(this).val());
  });
  if (transactions.length > 0) $('.resultsCount').addClass('bg-disabled');
  else $('.resultsCount').removeClass('bg-disabled');
  return transactions;
}

/*
/* Save transactions data in local storage.
*/
function setTransactions(transactions) {
  transactions = transactions ? transactions : getTransactions();
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

/*
/* Check if control panel form data has changed.
*/
function checkFormChanges(change, currFormState) {
  const prevFormState = localStorage.getItem('formData');

  // if form data changed warrants API call
  if (JSON.stringify(currFormState) !== prevFormState) {
    setFormDataArray(currFormState);
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
  if (longitude && !prevCoords) {
    localStorage.setItem('coords', JSON.stringify([longitude, latitude]));
    // if there is not a location given having coords warrants an API call
    console.log('was blank now coords');
    if (!$locationInput.val()) return true;
    // if no location given and new ond old coords to compare:
  } else if (!$locationInput.val() && longitude && prevCoords) {
    const [prevLng, prevLat] = prevCoords;
    // if coords have changed:
    if (
      longitude.toFixed(coordsPercision) !== prevLng.toFixed(coordsPercision) ||
      latitude.toFixed(coordsPercision) !== prevLat.toFixed(coordsPercision)
    ) {
      localStorage.setItem('coords', JSON.stringify([longitude, latitude]));
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
  if (prevCategory !== category) {
    localStorage.setItem('category', category);
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
/* If filters are on show filter indicator.
*/
function filterIndicatorCheck() {
  const formArray = $mainForm.serializeArray();
  // no need to show filter indicator for these inputs
  const notFilters = ['location', 'sort_by', 'lng', 'lat'];
  let initLength = formArray.length;
  const withoutPrices = formArray.filter(
    obj => obj.name.substring(0, 5) !== 'price'
  );
  // number of price options slected
  const numPrices = initLength - withoutPrices.length;
  if (
    // if prices filters in use
    numPrices === 1 ||
    numPrices === 2 ||
    numPrices === 3 ||
    // if transactions filters in use
    getTransactions().length > 0 ||
    // if any of the other filter inputs are n use
    withoutPrices.some(obj => {
      if (!notFilters.includes(obj.name) && obj.value !== '') return true;
    })
  )
    // turn filter indicator on
    $('.filter-icon-display').each(function () {
      $(this).show();
    });
  // turn filter indicator off
  else
    $('.filter-icon-display').each(function () {
      $(this).hide();
    });
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
  let queryData = getFormData();
  if (useOffset) queryData += `&offset=${offset * 50}`;
  // axios get search endpoint with query data
  try {
    var data = await axios.get(`/v1/search?${queryData}`);
  } catch (error) {
    alert(`Yelp API Error ${error.message}`);
    return false;
  }
  if (data.data.error) {
    errorCard(data.data);
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
  if (longitude !== lng || latitude !== lat) {
    longitude = lng;
    latitude = lat;
    // Set location placeholder back to 'Location'.
    $locationInput.prop('placeholder', `Location`);
    // store coords, render map, note rendered first coords map
    localStorage.setItem('coords', JSON.stringify([lng, lat]));
  }
}

/*
/* Mark user on map. 
*/
function markUser() {
  if (!longitude) return;
  if (userMarker) userMarker.remove();
  userMarker = addUserMarker([longitude, latitude]);
}

/*
/* Set lng/lat from Yelp data if user entered location.
/* Mark user. 
*/
function userMarkAndYelpCoordsLogic(data) {
  // if text location given and new Yelp data
  // use coords Yelp returned for lng, lat.
  if ($locationInput.val() && data) {
    navigator.geolocation.clearWatch(locationWatcher);
    yelpSetLocation(data);
  }
  markUser();
}

/*
/* Check if transactions have changed.
/* Compare form data to storage data.
*/
function checkTransactionsChange() {
  const transactions = JSON.stringify(getTransactions());
  const prevTransactions = localStorage.getItem('transactions');
  return transactions !== prevTransactions;
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
  const transactionsChanged = checkTransactionsChange();

  if (!transactionsChanged && !newData) return true;
  setTransactions();
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
  fitBounds([longitude, latitude], [lng, lat], first.name);
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
    $('.card-track-inner').html(getNoResultsCard());
    if (restMarker) restMarker.remove();
    return;
  }
  $('.card-track-inner').hide();
  userMarkAndYelpCoordsLogic(data);

  const cards = getCards(data);
  currCard = 0;

  // Scroll to first card and fade in.
  $('#scrl4').scrollLeft(0);
  $('.card-track-inner')
    .addClass('opaque')
    .show()
    .html(cards ? cards : getNoResultsCard())
    .removeClass('opaque');

  // If cards map first bussiness, watch scroll position for mapping,
  // watch scroll position for adding more cards.
  if (cards) {
    mapFirstBusiness(data);
    if (!resultsRemaining && data.total !== 1) addDummyCard();
    $('.arrow-wrapper').addClass('pulse-outline-mobile');
    setCardScrollTrackerMapper();
    setTimeout(() => {
      addNextCardsListener();
    }, 1000);
  } else {
    // if no cards no restMarker should be visible.
    if (restMarker) restMarker.remove();
  }
}

/* 
/* Post search DOM manipulation. 
*/
function postSearchDomManipulation(currFormState) {
  $('.spinner-zone').hide();
  showCardTrack();
  filterIndicatorCheck(currFormState);
}

/*
/* Search request handler. Needs location.
/* If queryData is unchaged from last request 
/* transactions choices must have changed, skip API call.
*/
async function searchYelp() {
  console.log('searchYelp');

  // Make sure there is a location to search.
  if (!latitude && $locationInput.val() === '') {
    alert('Enter a location or press detect location.');
    return;
  }
  // Get last search results from API call.
  const lastData = localStorage.getItem('currData');
  // Get current form data array.
  const currFormState = $mainForm.serializeArray();

  // if yelp parameters have changed call api endpoint
  if (checkParameterChange(lastData, currFormState)) {
    console.log('new search api call <<<<<<<<<<<<<<<<<<<******<<');

    var data = await searchApiCall();

    if (data === false) {
      $('.spinner-zone').hide();
      filterIndicatorCheck();
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

  justSearchedYelp = true;

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
    addDummyCard();
    setTimeout(() => {
      setCardScrollTrackerMapper();
    }, 100);
    return;
  }
  console.log('adding next cards <<<<<<<<<<<<<<<+++++++<<');
  const data = await searchApiCall(true);
  offset++;
  if (data === false) return;

  resultsRemaining -= data.data.businesses.length;
  $('.card-track-inner').append(getCards(data.data));
  setCardScrollTrackerMapper();

  if (resultsRemaining)
    setTimeout(() => {
      addNextCardsListener();
    }, 10000);
  else addDummyCard();
}

/*
/* Auto search with location input change.
*/
$locationInput.on('keyup', function (e) {
  clearTimeout(keyupTimer);
  $('.spinner-zone').show();
  if ($locationInput.val()) {
    keyupTimer = setTimeout(function () {
      searchYelp();
    }, autoSearchDelay);
  } else $('.spinner-zone').hide();
});

/*
/* Auto search with search term input change.
*/
$searchTerm.on('keyup', function (e) {
  clearTimeout(keyupTimer);
  $('.spinner-zone').show();
  const term = $searchTerm.val();
  keywordDisplayLogic(term);
  keyupTimer = setTimeout(function () {
    searchYelp();
  }, autoSearchDelay);
});

/*
/* Auto search with other form input changes.
*/
$mainForm.on('change', '.onChange', function (e) {
  clearTimeout(keyupTimer);
  // if the form change is the checking of "open at"
  // but no datetime entered yet return.
  if (
    $(this).prop('id') === 'open-at' &&
    $(this).prop('checked') === true &&
    $('#open_at').val() === ''
  )
    return;
  $('.spinner-zone').show();
  keyupTimer = setTimeout(function () {
    searchYelp();
  }, autoSearchDelay);
});

/*
/* Auto search with category input change.
/* Set clicked category to active.
/* Set category in local storage and display in filter display.
*/
$categoryButtons.on('click', 'button', function (e) {
  clearTimeout(keyupTimer);
  $('.spinner-zone').show();
  category = e.target.value;
  $('.cat-display').text(e.target.textContent);
  turnActiveOffCatBtns();
  $(this).addClass('active');
  keyupTimer = setTimeout(function () {
    searchYelp();
  }, autoSearchDelay);
});

/*
/* Turn active off for all category buttons.
*/
function turnActiveOffCatBtns() {
  $categoryButtons.children().each(function (index) {
    $(this).removeClass('active');
  });
}

/*
/* Navbar search listener.
*/
$('.navbar form.navbarSearchForm').submit(navbarSearch);

/*
/* Navbar search function.
*/
function navbarSearch(e) {
  if (e) e.preventDefault();
  $('.spinner-zone').show();
  $('.navbar-collapse').removeClass('open');
  const term = $('.navbar form.searchForm input').val();
  $searchTerm.val(term);
  keywordDisplayLogic(term);
  if (term) {
    category = 'restaurants,bars,food';
    $('.cat-display').text('All');
    turnActiveOffCatBtns();
    $('#All').addClass('active');
    location.href = '#';
    location.href = '#All';
  }
  hideHeroAndSearch();
}

/*
/* Turn keyword input orange or not with keyword input
/* and display keyword in keyword display.
*/
function keywordDisplayLogic(term) {
  if (term) {
    $searchTerm.addClass('bg-orange');
    $('.keyword-display').text(` - ${term}`);
  } else {
    $searchTerm.removeClass('bg-orange');
    $('.keyword-display').text('');
  }
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
/* Detect location button fuctionality. Call detectLocation.
*/
$('#detect-location').on('click', function (e) {
  $(this).children().removeClass('pulse-5');
  detectLocation(e);
});

/*
/* Clear All Filters button fuctionality.
*/
$('#clear-filters').on('click', function (e) {
  $('.spinner-zone').show();
  keyupTimer = setTimeout(() => {
    setForm(defaultFormState);
    setFormTransactions([]);
    searchYelp();
  }, autoSearchDelay);
});

/*
/* Exclusive  checkbox inputs "open now" and "open at".
/* When "open now" checked uncheck "open at".
*/
$('#open_now').on('click', function (e) {
  // uncheck "open at" and disable datetime input
  $('#open-at').prop('checked', false);
  $('#open_at').prop('disabled', true);
});

/*
/* Exclusive  checkbox inputs "open now" and "open at".
/* When "open at" checked uncheck "open now".
/* Additionaly, "open at" needs a datetime input enabled
/* and disabled when it is checked and unchecked.
*/
$('#open-at').on('click', function (e) {
  // uncheck "open now"
  $('#open_now').prop('checked', false);
  // enable or disable datetime input as input is checked or unchecked
  if ($('#open-at').prop('checked')) {
    $('#open_at').prop('disabled', false);
  } else {
    $('#open_at').prop('disabled', true);
  }
});

/*
/* Turn dollar signs green when checkbox is checked.
*/
$('#price-group').on('change', function (e) {
  const parent = e.target.parentElement;
  parent.classList.toggle('txt-green');
});

/*
/* Enable and disable radius range input with power button
/* that is located under Search Radius header.
/* Turn button green when radius input is enabled.
/* Turn display background muted or white.
*/
$('#radius-check').on('click', function () {
  const $radius = $('#radius');
  if ($radius.prop('disabled') === true) {
    $radius.prop('disabled', false);
  } else {
    $radius.prop('disabled', true);
  }
  $('.radiusDisplay').toggleClass('bg-disabled');
  $radius.parent().prev().toggleClass(['txt-green', 'dark-green-outline']);
});

/*
/* Update radius display with range input change.
*/
$('#radius').on('change', function () {
  $('.radiusDisplay').text(metersToMiles($(this).val()));
});

/*
/* Show restaurant marker and fit bounds when card map button is clicked.
*/
$('.card-track-inner').on('click', '.cardMapButton', function (e) {
  e.preventDefault();
  const lng = $(this).data('lng');
  const lat = $(this).data('lat');
  const name = $(this).data('name');
  if (!mapOpen) toggleMap();
  fitBounds([longitude, latitude], [+lng, +lat], name);
});

/*
/* Show map button fuctionality. Open and close map.
*/
$('.showMap').each(function (index) {
  $(this).on('click', toggleMap);
});

function toggleMap() {
  if (mapOpen && $('.card-map-zone').hasClass('cards-collapse')) {
    $('.card-map-zone').removeClass('cards-collapse');
    $('.card-track').show();
    $('.toggleCards')
      .children()
      .each(function (index) {
        $(this).toggleClass('d-none');
      });
    if (!$('.card-map-zone').hasClass('cards-collapse')) {
      setCardsScrollLeft();
    }
  }
  $('.card-map-zone').toggleClass('map-collapse');
  $('#map').toggle();
  $('.mapBtns').toggle();
  $('.map-toggle').toggleClass('toggle-on-map');
  $('.map-track').toggleClass(['border-top', 'border-secondary']);
  if (mapOpen) {
    mapOpen = false;
  } else {
    mapOpen = true;
    mappyBoi.resize();
  }
}

/*
/* Show/hide cards fuctionality. Big/small map.
*/
$('.toggleCards').on('click', toggleCards);

function toggleCards() {
  $('.card-map-zone').toggleClass('cards-collapse');
  $('.card-track').toggle();
  mappyBoi.resize();
  // toggle up/down arrow
  $('.toggleCards')
    .children()
    .each(function (index) {
      $(this).toggleClass('d-none');
    });
  if (!$('.card-map-zone').hasClass('cards-collapse')) {
    setCardsScrollLeft();
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
    mappyBoi.resize();
    $('.toggleCards')
      .children()
      .each(function (index) {
        $(this).toggleClass('d-none');
      });
  }
}

/*
/* Animations.
*/

/*
/* Pulse Animations for location and search buttons
*/
$('.jsPulser').each(function (i) {
  $(this).on('mouseover', function (e) {
    $(this).children().addClass('pulse-5');
  });
});
$('.jsPulser').each(function (i) {
  $(this).on('mouseout', function (e) {
    $(this).children().removeClass('pulse-5');
  });
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

/*
/* Updating from local storage.
*/

/*
/* Check localStorage for last choosen category and set active
*/
function setCategoryFromStorage() {
  // check for category. if none set to all.
  let currCat = localStorage.getItem('category');
  if (!currCat) {
    localStorage.setItem('category', 'restaurants');
    currCat = 'restaurants';
  }
  category = currCat;
  // set list-group button to active for current category
  $categoryButtons.children().each(function (index) {
    if ($(this).val() === currCat) {
      $(this).addClass('active');
      // set card-map-zone filter display to category name
      $('.cat-display').text($(this).text());
    }
  });
}

/*
/* Set interface checkboxes.
*/
function setFormTransactions(transactions) {
  if (!transactions) return;
  ['delivery', 'pickup', 'restaurant_reservation'].forEach(id => {
    if (transactions.includes(id)) $(`#${id}`).prop('checked', true);
    else $(`#${id}`).prop('checked', false);
  });
}

/*
/* Set form checkboxes for yelp parameters.
*/
function setForm(data) {
  // reduce data from array of objects to obj.
  data = data.reduce((acc, curr) => {
    acc[curr.name] = curr.value;
    return acc;
  }, {});
  // inputs to run through and check or uncheck
  const inputIds = [
    'open_now',
    'price-1',
    'price-2',
    'price-3',
    'price-4',
    'hot_and_new',
    'reservation',
    'cashback',
    'deals',
    'wheelchair_accessible',
    'open_to_all',
    'gender_neutral_restrooms',
  ];
  // set location, term
  if (data.location) $locationInput.val(data.location);
  if (data.term) {
    $searchTerm.val(data.term).addClass('bg-orange');
    $('.keyword-display').text(` - ${data.term}`);
  } else {
    $searchTerm.val('');
    $searchTerm.val(data.term).removeClass('bg-orange');
    $('.keyword-display').text(``);
  }
  // if data has input id as a key make that input checked, otherwise un-check.
  inputIds.forEach(id => {
    if (data[id]) $(`#${id}`).prop('checked', true);
    else $(`#${id}`).prop('checked', false);
  });
  // make dollar signs green
  $('#price-group')
    .children()
    .each(function (index) {
      if ($(this).children().prop('checked')) $(this).addClass('txt-green');
      else $(this).removeClass('txt-green');
    });
  // if open_at data enable datetime input, add value, and check box.
  if (data.open_at) {
    $('#open_at').val(data.open_at).prop('disabled', false);
    $('#open-at').prop('checked', true);
  }
  // set sort_by radio to stored value, un-check other options.
  const sortBy = ['best_match', 'rating', 'review_count', 'distance'];
  sortBy.forEach(id => {
    if (data.sort_by === id) $(`#${id}`).prop('checked', true);
    else $(`#${id}`).prop('checked', false);
  });
  // enable radius input and update value if radius data present
  if (data.radius) {
    $('#radius')
      .prop('disabled', false)
      .val(data.radius)
      .parent()
      .prev()
      .addClass('txt-green')
      .addClass('dark-green-outline')
      .children()
      .prop('checked');
    $('.radiusDisplay')
      .removeClass('bg-disabled')
      .text(metersToMiles(data.radius));
  } else {
    $('#radius')
      .prop('disabled', true)
      .val(16094)
      .parent()
      .prev()
      .removeClass('txt-green')
      .removeClass('dark-green-outline')
      .children()
      .prop('checked', false);
    $('.radiusDisplay').addClass('bg-disabled').text(10);
  }
}

/*
/* Check localStorage for data to bring form to last state.
*/
function updateFormFromStorage() {
  // check for data if none return
  let data = localStorage.getItem('formData');
  if (!data) {
    setTransactions([]);
    return;
  }
  setForm(JSON.parse(data));
  // set the interface (transactions) options on the form
  setFormTransactions(JSON.parse(localStorage.getItem('transactions')));
}

function hideHeroAndSearch() {
  $('.hero-animation').hide();
  $('.alert').hide();
  // mappyBoi.resize(); <<<<< look for any problems then remove
  scrollCategoriesToCurrent();
  // if there is given location request search
  if ($locationInput.val()) searchYelp();
  // if no given location but allowing location sharing detect location
  else if (localStorage.getItem('geoAllowed') === 'true') detectLocation();
  // If coords use those to search.
  else if (longitude) searchYelp();
}

/*
/* If page loads scrolled to bottom call scrollCategoriesToCurrent.
/* Otherwise when user scroll to bottom of page call scrollCategoriesToCurrent.
/* Only call once.
*/
let $scrollListener;
function lockOnScrollBottom(map = true) {
  $scrollListener = $(window).on('scroll', function () {
    // when bottom of screen is scrolled to.
    if (
      $(window).scrollTop() + $(window).height() >
      $(document).height() - 100
    ) {
      if (map) hideHeroAndSearch();
      else $('.hero-animation').hide();
      $scrollListener.off();
    }
  });
}

/*
/* Set Lng/lat data from hidden inputs then remove hidden inputs.
*/
function setLngLatFromHiddenInputs() {
  // Set lng/lat from hidden inputs then remove hidden inputs.
  latitude = +$('#main-form input[name=lat]').val();
  longitude = +$('#main-form input[name=lng]').val();
  $('#main-form input[name=lat]').remove();
  $('#main-form input[name=lng]').remove();
}

/*
/* Check localStorage for coordinate data.
/* Set script lng/lat. Return coords.
*/
function setCoordsFromStorage() {
  const coords = localStorage.getItem('coords');
  if (coords) {
    const [lng, lat] = JSON.parse(coords);
    longitude = lng;
    latitude = lat;
  }
}

/*
/* Set Lng/lat data from hidden inputs then remove hidden inputs.
*/
function setLngLatInit() {
  setLngLatFromHiddenInputs();
  if (!latitude) setCoordsFromStorage();
}

/*
/* Check localStorage for data to bring form to last known
/* state set last category active, and search.
*/
function checkLocalStorage() {
  setCategoryFromStorage();
  updateFormFromStorage();
}

/*
/* If there is navbar search term on page load then
/* execute navbarSearch function on the passed in term.
/* Otherwise check local storage for form data to load.
*/
function checkSearchInputOrCheckLocalStorage() {
  if ($('.navbar form.searchForm input').val()) navbarSearch();
  else checkLocalStorage();
}

setLngLatInit();
checkSearchInputOrCheckLocalStorage();
lockOnScrollBottom();
mappyBoi = renderMiniMap();
