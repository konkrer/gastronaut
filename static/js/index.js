'use strict';
// should all/any this be in class?

const $locationInput = $('#location');
const $searchTerm = $('#search-term');
const $mainForm = $('#main-form');
const $categoryButtons = $('#cat-btns');

const autoSearchDelay = 1500;
let keyupTimer;
let latitude = null;
let longitude = null;
let category = 'restaurants';
let hasScrolledToCategory = false;
let markedUser = false;
const coordsPercision = 4;
let locationChange;
// let mappyBoi;

/*
/* Get current form data plus lat, lng, and category
/* as query string for search request api endpoint.
*/
function getFormData() {
  let data = $mainForm.serialize();
  data = `${data}&categories=${category}`;
  if (latitude) data = `${data}&latitude=${latitude}&longitude=${longitude}`;
  return data;
}

/*
/* Get current form data as obj array.
/* Store in local storage as "formData".
*/
function setFormDataArray() {
  let data = $mainForm.serializeArray();
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
  return transactions;
}

/*
/* Save transactions data in local storage.
*/
function setTransactions() {
  localStorage.setItem('transactions', JSON.stringify(getTransactions()));
}

/*
/* Report error of api call.
*/
function errorCard(data) {
  alert(`${data.error.code}, ${data.error.description}`);
  console.error(data);
}

/*
/* Check for changes that warrant a new API call.
/* Form, category, or significant GPS change.
*/
function checkParameterChange() {
  const currFormState = JSON.stringify($mainForm.serializeArray());
  const prevFormState = localStorage.getItem('formData');
  const prevCoords = JSON.parse(localStorage.getItem('coords'));
  const prevCategory = localStorage.getItem('category');
  const transactions = JSON.stringify(getTransactions());
  const prevTransactions = localStorage.getItem('transactions');
  // change flag.
  // set change to true if a new API call is waranted.
  let change = false;
  // location change flag.
  // set locationChange to true if coords have significant change.
  locationChange = false;

  // if form data changed warrants API call
  if (currFormState !== prevFormState) {
    change = true;
    setFormDataArray();
  }
  // if there is lng/lat data but no previous stored coords data
  if (longitude && !prevCoords) {
    locationChange = true;
    localStorage.setItem('coords', JSON.stringify([longitude, latitude]));
    // if there is not a search term having coords warrants an API call
    if (!$searchTerm.val()) change = true;
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
    }
  }
  // category change warrants an API call
  if (prevCategory !== category) {
    change = true;
    localStorage.setItem('category', category);
  }
  // transactions change does not warrant an API call
  if (transactions !== prevTransactions) setTransactions();

  return change;
}

/*
/* Make a requst to /v1/search endpoint. 
*/
async function searchApiCall() {
  const queryData = getFormData();
  // axios get search endpoint with query data
  try {
    var data = await axios.get(`/v1/search?${queryData}`);
  } catch (error) {
    alert(`Yelp API Error${error.message}`);
    return;
  }
  if (data.data.error) {
    errorCard(data.data);
    return;
  }
  return data;
}

/*
/* Use Yelp lng/lat data if new lng/lat data or if rendering first coords map. 
*/
function yelpSetLocation(data) {
  // extract lng/lat from new yelp data
  const {
    data: {
      region: {
        center: { longitude: lng, latitude: lat },
      },
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
function renderMapFromStorage() {
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
/* mapping as there's nothing new to map, unless rendering the first map 
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
      renderMapFromStorage();
    }
  } else {
    renderOnLocationChangeOrFirstCoordsMap();
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
    alert('Enter a location or press detect location.');
    return;
  }
  // if yelp parameters have changed call api endpoint
  if (checkParameterChange()) {
    console.log('new search api call <<<<<<<<<<<<<<<<<<<******<<');
    var data = await searchApiCall();
    // save new data in local storage
    localStorage.setItem('currData', JSON.stringify(data));
    console.log(data);
  }
  mappingAndCoordsLogic(data);
  // TODO: add cards filter by transactions
  var data = data ? data : JSON.parse(localStorage.getItem('currData'));
  addCards(data);
}

/*
/* Auto search with location input change.
*/
$locationInput.on('keyup', function (e) {
  clearTimeout(keyupTimer);
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
  const term = $searchTerm.val();
  if (term) $('.keyword-display').text(` - ${term}`);
  else $('.keyword-display').text('');
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
/* Detect location button fuctionality. Call detectLocation.
*/
$('#detect-location').on('click', function (e) {
  $(this).children().removeClass('pulse-5');
  detectLocation(e);
});

/*
/* Explore buttons lock view to bottom.
*/
$('.explore').on('click', function (e) {
  e.preventDefault();
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
  $('.map-track').toggleClass(['border-top', 'border-secondary']);
  $('.map-close').toggleClass('top-10');
}

/* Show restaurant marker and fit bounds when address clicked.
 */
$('.card-track-inner').on('click', '.cardAddress', function (e) {
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
$('#clear-term').on('click', function (e) {
  $searchTerm.val('');
  $('.keyword-display').text('');
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
  $radius.prev().toggleClass('txt-green');
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
  ['delivery', 'pickup', 'trans-reservations'].forEach(id => {
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
    'price-5',
    'hot_and_new',
    'reservation',
    'cashback',
    'deals',
    'wheelchair_accessible',
    'open_to_all',
    'gender_neutral_restrooms',
  ];
  // if data has input id as a key make that input checked, otherwise un-check.
  inputIds.forEach(id => {
    if (data[id]) $(`#${id}`).prop('checked', true);
    else $(`#${id}`).prop('checked', false);
  });
  // make dollar signs green
  $('#price-group')
    .children()
    .each(function (index) {
      if (!$(this).children().prop('checked')) $(this).removeClass('txt-green');
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
      .children()
      .prop('checked');
    $('.radiusDisplay')
      .removeClass('bg-disabled')
      .text(metersToMiles(data.radius));
  }
}

/*
/* Check localStorage for data to bring form to last state.
*/
function updateFormFromStorage() {
  // check for data if none return
  let data = localStorage.getItem('formData');
  if (!data) return;
  data = JSON.parse(data);

  // set location, term
  const [location, term, ...rest] = data;
  if (location.value) $locationInput.val(location.value);
  if (term.value) {
    $searchTerm.val(term.value);
    $('.keyword-display').text(` - ${term.value}`);
  }
  // set the rest of the Yelp parameters
  setForm(rest);
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
/* Check localStorage for data to bring form to last state
/* set category active, and search.
*/
function checkLocalStorage() {
  setCategoryFromStorage();
  updateFormFromStorage();
  const coords = setCoordsFromStorage();
  // if there is given location request search
  if ($locationInput.val()) searchYelp();
  // if no given location but allowing location sharing detect location
  else if (localStorage.getItem('geoAllowed') === 'true') detectLocation();
  // if not sharing location but stored coords use those to center map.
  else if (coords) {
    userMarker = userMarker = addUserMarker(coords);
  }
}
checkLocalStorage();

/*
/* Restaurant categories auto scroll to last choosen category.
*/

/*
/* S.O. adapted https://stackoverflow.com/a/3898152/11164558
/* Function to scroll last selected category into view.
*/
function scrollCategoriesToCurrent() {
  let currCat = localStorage.getItem('category');
  currCat = currCat === 'restaurants' ? 'A' : currCat[0].toUpperCase();
  location.href = '#';
  location.href = `#${currCat}`;
  hasScrolledToCategory = true;
  $locationInput.focus();
  $locationInput.blur();
}
/*
/* If page loads scrolled to bottom call scrollCategoriesToCurrent.
/* Otherwise when user scroll to bottom of page call scrollCategoriesToCurrent.
/* Only call once.
*/
if ($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
  scrollCategoriesToCurrent();
} else {
  $(window).scroll(function () {
    if (
      $(window).scrollTop() + $(window).height() >
      $(document).height() - 100
    ) {
      if (!hasScrolledToCategory) {
        scrollCategoriesToCurrent();
      }
    }
  });
}
