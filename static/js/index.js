'use strict';
// should all/any this be in class?

const $locationInput = $('#location');
const $searchTerm = $('#search-term');
const $mainForm = $('#main-form');
const $categoryButtons = $('#cat-btns');

const autoSearchDelay = 2000;
const coordsPercision = 3;
let keyupTimer;
let latitude = null;
let longitude = null;
let category = 'restaurants';
// let hasScrolledToCategory = false;
let markedUser = false;
let locationChange;
let firstCardsAdded = false;
let mapOpen = true;
let resultsRemaining;
let offset;

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
/* Report error of api call.
*/
function errorCard(data) {
  alert(`${data.error.code}, ${data.error.description}`);
  console.error(data);
}

/*
/* If filters are on show filter indicator.
*/
function filterIndicatorCheck(formArray) {
  // no need to show filter indicator for these inputs
  const notFilters = ['location', 'sort_by', 'lng', 'lat'];
  let initLength = formArray.length;
  const withoutPrices = formArray.filter(obj => obj.name[0] !== 'p');
  // number of price options slected
  const numPrices = initLength - withoutPrices.length;
  if (
    numPrices === 1 ||
    numPrices === 2 ||
    numPrices === 3 ||
    getTransactions().length > 0 ||
    withoutPrices.some(obj => {
      if (!notFilters.includes(obj.name) && obj.value !== '') return true;
    })
  )
    $('.filter-icon-display').each(function () {
      $(this).show();
    });
  else
    $('.filter-icon-display').each(function () {
      $(this).hide();
    });
}

/*
/* Check for changes that warrant a new API call.
/* Form, category, or significant GPS change.
*/
function checkParameterChange(lastData) {
  const currFormState = $mainForm.serializeArray();
  const prevFormState = localStorage.getItem('formData');
  const prevCoords = JSON.parse(localStorage.getItem('coords'));
  const prevCategory = localStorage.getItem('category');

  filterIndicatorCheck(currFormState);
  // set change to true if a new API call is waranted.
  let change = false;
  // set locationChange to true if coords have significant change.
  locationChange = false;

  // if form data changed warrants API call
  if (JSON.stringify(currFormState) !== prevFormState) {
    change = true;
    setFormDataArray(currFormState);
    console.log('form data changed');
  }
  // if there is lng/lat data but no previous stored coords data
  if (longitude && !prevCoords) {
    locationChange = true;
    localStorage.setItem('coords', JSON.stringify([longitude, latitude]));
    // if there is not a search term having coords warrants an API call
    if (!$searchTerm.val()) change = true;
    console.log('was blank now coords');
    //
  } else if (longitude && prevCoords) {
    const [prevLng, prevLat] = prevCoords;
    // if coords have changed
    if (
      longitude.toFixed(coordsPercision) !== prevLng.toFixed(coordsPercision) ||
      latitude.toFixed(coordsPercision) !== prevLat.toFixed(coordsPercision)
    ) {
      locationChange = true;
      localStorage.setItem('coords', JSON.stringify([longitude, latitude]));
      // if there is not a search term new coords warrant an API call
      if (!$searchTerm.val()) change = true;
      console.log('coords have changed');
    }
  }
  // category change warrants an API call
  if (prevCategory !== category) {
    change = true;
    localStorage.setItem('category', category);
    console.log('category changed');
  }
  // if there is no stored yelp data must make api call
  if (!lastData || ['undefined', 'false'].includes(lastData)) {
    change = true;
  }

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
    alert(`Yelp API Error${error.message}`);
    return false;
  }
  if (data.data.error) {
    errorCard(data.data);
    return false;
  }
  return data;
}

/*
/* Use Yelp lng/lat data if new lng/lat data or if rendering first coords map. 
*/
function yelpSetLocation(data) {
  // extract lng/lat from new yelp data
  const {
    region: {
      center: { longitude: lng, latitude: lat },
    },
  } = data;
  // if lng/lat has changed or coords map has not been rendered yet
  if (longitude !== lng || latitude !== lat || !markedUser) {
    longitude = lng;
    latitude = lat;
    // Set location placeholder back to 'Location'
    $locationInput.prop('placeholder', `Location`);
    // store coords, render map, note rendered first coords map
    localStorage.setItem('coords', JSON.stringify([lng, lat]));
    if (userMarker) userMarker.remove();
    userMarker = addUserMarker([longitude, latitude]);
    markedUser = true;
  }
}

/*
/* Render map from storage if rendering first coords map and lng/lat data.. 
*/
function renderFirstMapFromStorage() {
  // no new Yelp data block.
  // if coords map not rendered yet and there are stored coords
  // use stored coords to render map.
  if (!markedUser && latitude) {
    userMarker = addUserMarker([longitude, latitude]);
    markedUser = true;
  }
}

/*
/* Render map on location change or if rendering first coords map. 
*/
function renderOnLocationChangeOrFirstCoordsMap() {
  // no text location given block.
  // if there was a location change and coords map was
  // not rendered yet, render map.
  if (locationChange || !markedUser) {
    if (userMarker) userMarker.remove();
    userMarker = addUserMarker([longitude, latitude]);
    markedUser = true;
  }
}

/*
/* Determine if new map rendering is needed after making or not making new Yelp API call.
/* 
/* If using text location to search Yelp use the coords Yelp returned
/* to map location. But if Yelp coords are the same as the stored data skip
/* mapping as there's no new user location to map, unless rendering the first map 
/* with user coordinates since page refresh.
/*
/* If using text location and page just loaded and there is no new data (using 
/* cached data) render new map if there is lng/lat data.
/*
/* Otherwise, render new map if the location changed or if rendering the first map 
/* with user coordinates since page refresh.
/* 
*/
function mappingAndCoordsLogic(data) {
  // if text location given
  if ($locationInput.val()) {
    // if new Yelp data
    if (data) {
      yelpSetLocation(data);
    } else {
      renderFirstMapFromStorage();
    }
  } else {
    renderOnLocationChangeOrFirstCoordsMap();
  }
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
  $('.arrow-wrapper').removeClass('pulse-outline-mobile');
  if (data.businesses.length == 0) {
    $('.card-track-inner').html(getNoResultsCard());
    restMarker?.remove();
    $('.resultsCount').text('0');
    return;
  }
  mappingAndCoordsLogic(data);
  mapFirstBusiness(data);
  $('.resultsCount').text(data.total);
  const cards = getCards(data);
  currCard = 0;
  $('#scrl4').scrollLeft(0);
  $('.card-track-inner').hide().html(cards).fadeIn(1000);
  setTrackerMaper();

  if (cards) $('.arrow-wrapper').addClass('pulse-outline-mobile');

  if (resultsRemaining) {
    addNextCardsListener();
  } else {
    addDummyCard();
  }
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
    $('.spinner-zone').hide();
    alert('Enter a location or press detect location.');
    return;
  }
  // Get last search results from API call.
  const lastData = localStorage.getItem('currData');

  // if yelp parameters have changed call api endpoint
  if (checkParameterChange(lastData)) {
    console.log('new search api call <<<<<<<<<<<<<<<<<<<******<<');

    var data = await searchApiCall();
    $('.spinner-zone').hide();
    if (data === false) return;
    // bug hunt!
    if (!data.data.businesses) {
      alert('no businesses data');
      console.error('no businesses data');
      console.log(data);
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
  $('.spinner-zone').hide();
  if (transactionsNoChangeAndNoNewData(!!data)) return;

  // If no new data use last data.
  var data = data ? data.data : JSON.parse(lastData);

  resultsRemaining = data.total - data.businesses.length;
  offset = 1;
  mapAndAddCardsForNewApiCall(data);
}

/*
/* If more results remain, call API, make cards. 
*/
async function addNextCards() {
  if (!resultsRemaining || offset === 20) {
    cardScrollTrackerAndMapper.off();
    addDummyCard();
    setTimeout(() => {
      setTrackerMaper();
    }, 1000);
    return;
  }
  console.log('adding next cards <<<<<<<<<<<<<<<<<<<<<<<<<<<+++++++++++++++<<');
  const data = await searchApiCall(true);
  offset++;
  if (data === false) return;
  resultsRemaining -= data.data.businesses.length;
  cardScrollTrackerAndMapper.off();
  $('.card-track-inner').append(getCards(data.data));
  setTrackerMaper();
  if (resultsRemaining)
    setTimeout(() => {
      addNextCardsListener();
    }, 10000);
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
  }
});

/*
/* Auto search with search term input change.
*/
$searchTerm.on('keyup', function (e) {
  clearTimeout(keyupTimer);
  $('.spinner-zone').show();
  const term = $searchTerm.val();
  if (term) {
    $searchTerm.addClass('bg-orange');
    $('.keyword-display').text(` - ${term}`);
  } else {
    $searchTerm.removeClass('bg-orange');
    $('.keyword-display').text('');
  }
  keyupTimer = setTimeout(function () {
    searchYelp();
  }, autoSearchDelay);
});

/*
/* Auto search with other form input changes.
*/
$mainForm.on('change', '.onChange', function (e) {
  clearTimeout(keyupTimer);
  $('.spinner-zone').show();
  // if the form change is the checking of "open at"
  // but no datetime entered yet return.
  if (
    $(this).prop('id') === 'open-at' &&
    $(this).prop('checked') === true &&
    $('#open_at').val() === ''
  )
    return;
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
  $(this)
    .parent()
    .children()
    .each(function (index) {
      $(this).removeClass('active');
    });
  $(this).addClass('active');
  keyupTimer = setTimeout(function () {
    searchYelp();
  }, autoSearchDelay);
});

/*
/* Navbar search function.
*/
$('.navbar form').submit(function (e) {
  e.preventDefault();
  $('.spinner-zone').show();
  const term = $(this).children().val();
  $searchTerm.val(term);
  if (term) $('.keyword-display').text(` - ${term}`);
  else $('.keyword-display').text('');
  searchYelp();
});

/*
/* Explore buttons lock view to bottom.
*/
$('.explore-nav').on('click', function (e) {
  e.preventDefault();
  $('.hero-animation').toggle();
  lockOnScrollBottom(false);
});

/*
/* Hero explore button lock view to bottom and search.
*/
$('.explore').on('click', function (e) {
  e.preventDefault();
  hideHeroAndSearchMap();
});

/*
/* Detect location button fuctionality. Call detectLocation.
*/
$('#detect-location').on('click', function (e) {
  $(this).children().removeClass('pulse-5');
  detectLocation(e);
});

/*
/* Show map button fuctionality. Open and close map.
*/
$('.showMap').each(function (index) {
  $(this).on('click', toggleMap);
});

function toggleMap() {
  $('.card-map-zone').toggleClass('map-collapse');
  $('#map').toggle();
  $('.map-info').toggle();
  $('.map-close').toggleClass('top-10');
  $('.map-track').toggleClass(['border-top', 'border-secondary']);
  if (!$('.card-map-zone').hasClass('map-collapse')) {
    mappyBoi.resize();
    mapOpen = true;
  } else mapOpen = false;
}

/* Show restaurant marker and fit bounds map button is clicked.
 */
$('.card-track-inner').on('click', '.cardMapButton', function (e) {
  e.preventDefault();
  const lng = $(this).data('lng');
  const lat = $(this).data('lat');
  const name = $(this).data('name');
  fitBounds([longitude, latitude], [+lng, +lat], name);
  if ($('.card-map-zone').hasClass('map-collapse')) {
    toggleMap();
  }
});

/*
/* Clear search term button fuctionality.
*/
$('#clear-filters').on('click', function (e) {
  setForm(defaultFormState);
  setFormTransactions([]);
  searchYelp();
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
$('#search-check').on('click', function () {
  const $radius = $('#radius');
  if ($radius.prop('disabled') === true) {
    $radius.prop('disabled', false);
  } else {
    $radius.prop('disabled', true);
  }
  $('.radiusDisplay').toggleClass('bg-disabled');
  $radius.prev().toggleClass(['txt-green', 'dark-green-outline']);
});

/*
/* Update radius display with range input change.
*/
$('#radius').on('change', function () {
  $('.radiusDisplay').text(metersToMiles($(this).val()));
});

/*
/* Convert meters to miles to one decimal place.
*/
function metersToMiles(num) {
  return (num * 0.00062137).toFixed(1);
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

/*
/* Check localStorage for coordinate data.
/* Set script lng/lat. Return coords.
*/
function setCoordsFromStorage() {
  const coords = localStorage.getItem('coords');
  if (coords) {
    const [lng, lat] = JSON.parse(coords);
    latitude = +lat;
    longitude = +lng;
    return [lng, lat];
  }
}

/*
/* Restaurant categories auto scroll to last choosen category.
*/

/*
/* S.O. adapted https://stackoverflow.com/a/3898152/11164558
/* Function to scroll last selected category into view.
*/
function scrollCategoriesToCurrent() {
  let currCat = localStorage.getItem('category');
  const converter = {
    raw_food: 'Liv',
    restaurants: 'All',
    newamerican: 'Ame',
    tradamerican: 'Ame',
    hotdogs: 'Fas',
  };
  if (currCat in converter) currCat = converter[currCat];
  location.href = '#';
  location.href = `#${currCat[0].toUpperCase()}${currCat.substr(1, 2)}`;
  // hasScrolledToCategory = true;
  $locationInput.focus();
  $locationInput.blur();
}

function hideHeroAndSearchMap(coords) {
  $('.hero-animation').hide();
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
    if ($(window).scrollTop() + $(window).height() > $(document).height() - 1) {
      if (map) hideHeroAndSearchMap();
      else $('.hero-animation').hide();
      $scrollListener.off();
    }
  });
}

/*
/* Check localStorage for data to bring form to last state
/* set category active, and search.
*/
function checkLocalStorage() {
  latitude = +$('#main-form input[name=lat]').val();
  longitude = +$('#main-form input[name=lng]').val();
  setCategoryFromStorage();
  updateFormFromStorage();
  if (!latitude) setCoordsFromStorage();
  lockOnScrollBottom();
}

checkLocalStorage();
mappyBoi = renderMiniMap();

/*
/* When cards scrolled almost to end add next cards.
*/
let paginationListener;
function addNextCardsListener() {
  paginationListener = $('#scrl4').scroll(function (e) {
    if ($(this).scrollLeft() + $(this).width() > e.target.scrollWidth * 0.96) {
      addNextCards();
      paginationListener.off();
    }
  });
}
