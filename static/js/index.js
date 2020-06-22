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
let hasScrolledCategory = false;
let firstRenderMap = true;

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
  const coords = JSON.parse(localStorage.getItem('coords'));
  const prevCategory = localStorage.getItem('category');
  const transactions = JSON.stringify(getTransactions());
  const prevTransactions = localStorage.getItem('transactions');
  let change = false;

  // if form data changed warrants API call
  if (currFormState !== prevFormState) {
    change = true;
    setFormDataArray();
  }
  if (longitude && !coords) {
    // if there is not a search term having coords warrants an API call
    if (!$searchTerm.val()) change = true;
    localStorage.setItem(
      'coords',
      JSON.stringify([longitude.toFixed(3), latitude.toFixed(3)])
    );
  } else if (longitude && coords) {
    const [prevLng, prevLat] = coords;
    if (longitude.toFixed(3) !== prevLng || latitude.toFixed(3) !== prevLat) {
      // if there is not a search term new coords warrant an API call
      if (!$searchTerm.val()) change = true;
      localStorage.setItem(
        'coords',
        JSON.stringify([longitude.toFixed(3), latitude.toFixed(3)])
      );
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
/* Make a requst to /search endpoint. Needs location.
/* If queryData is unchaged from last request interface (transactions)
/* choices must have changed, skip api call. When making api
/* call store query parameters, latest data, and form state.
*/
async function requestSearch() {
  // Make sure there is a location to search.
  if (!latitude && $locationInput.val() === '') {
    alert('Enter a location or press detect location.');
    return;
  }
  // if yelp parameters have changed call api endpoint
  if (checkParameterChange()) {
    console.log(
      'new search api call <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<******<<'
    );
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
    // save new data in local storage
    // to reload as necessary.
    localStorage.setItem('currData', JSON.stringify(data));

    console.log(data);
  }
  // get previous lng/lat data
  const coords = JSON.parse(localStorage.getItem('coords'));
  const [prevLng, prevLat] = coords ? coords : [undefined, undefined];
  // if text location given
  if ($locationInput.val()) {
    console.log('in loc given');
    // if new data
    if (data) {
      // extract lng/lat from new data
      const {
        data: {
          region: {
            center: { longitude: lng, latitude: lat },
          },
        },
      } = data;
      // if lng/lat has changed or this map has not been rendered yet
      if (
        prevLng !== lng.toFixed(3) ||
        prevLat !== lat.toFixed(3) ||
        firstRenderMap
      ) {
        localStorage.setItem(
          'coords',
          JSON.stringify([lng.toFixed(3), lat.toFixed(3)])
        );
        renderMiniMap([lng, lat], 10, [lng, lat]);
        firstRenderMap = false;
        console.log('map rendering new coors or first');
      }
    } else {
      console.log('in loc else');
      // if no new data
      // if map not rendered yet and stored coords use stored coords
      if (firstRenderMap && prevLng) {
        renderMiniMap([prevLng, prevLat], 10, [prevLng, prevLat]);
        firstRenderMap = false;
      }
    }
  } else {
    // if stored coords are different than curr coords
    // render map and store current coords.
    // Needed when switching from text location back to last detected location.
    if (prevLng !== longitude.toFixed(3) || prevLat !== latitude.toFixed(3)) {
      renderMiniMap([longitude, latitude], 10, [longitude, latitude]);
      localStorage.setItem(
        'coords',
        JSON.stringify([longitude.toFixed(3), latitude.toFixed(3)])
      );
      console.log('map rendering bottom else');
    }
  }
  // TODO: add cards filter by transactions
}

/*
/* Auto search with location input change.
*/
$locationInput.on('keyup', function (e) {
  clearTimeout(keyupTimer);
  keyupTimer = setTimeout(function () {
    requestSearch();
  }, autoSearchDelay);
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
    requestSearch();
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
    requestSearch();
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
    requestSearch();
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
/* Show map button fuctionality. Open and close map.
*/
$('.showMap').each(function (index) {
  $(this).on('click', function () {
    $('.card-zone').toggleClass('map-collapse');
    $('#map').toggle();
    $('.map-info').toggle();
    $('.map-track').toggleClass(['border-top', 'border-secondary']);
    $('.map-close').toggleClass('bottom-10');
  });
});

/*
/* Clear search term button fuctionality.
*/
$('#clear-term').on('click', function (e) {
  $searchTerm.val('');
  $('.keyword-display').text('');
  requestSearch();
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
  $('.radius-display').toggleClass('bg-disabled');
  $radius.prev().toggleClass('txt-green');
});

/*
/* Update radius display with range input change.
*/
$('#radius').on('change', function () {
  $('.radius-display').text(metersToMiles($(this).val()));
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
  // set list-group button to active for current category
  $categoryButtons.children().each(function (index) {
    if ($(this).val() === currCat) {
      $(this).addClass('active');
      // set card-zone filter display to category name
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
    $('.radius-display')
      .removeClass('bg-disabled')
      .text(metersToMiles(data.radius));
  }
}

/*
/* Check localStorage for data to bring form to last state on page navigation/refresh.
*/
function updateFormFromStorage() {
  // check for data if none return
  let data = localStorage.getItem('formData');
  if (!data) return;
  data = JSON.parse(data);

  // set location, term, and rest of form inputs
  const [location, term, ...rest] = data;
  if (location.value) $locationInput.val(location.value);
  if (term.value) {
    $searchTerm.val(term.value);
    $('.keyword-display').text(` - ${term.value}`);
  }
  setForm(rest);
  setFormTransactions(JSON.parse(localStorage.getItem('transactions')));
}

/*
/* Check localStorage for data to bring form to last state
/* set category active, and search.
*/
function checkLocalStorage() {
  setCategoryFromStorage();
  updateFormFromStorage();
  // if there is given location request search
  if ($locationInput.val()) requestSearch();
  // if no given location but allowing location sharing detect location
  else if (localStorage.getItem('geoAllowed')) {
    detectLocation();
    firstRenderMap = false;
  }
}
checkLocalStorage();

/*
/* S.O. adapted https://stackoverflow.com/a/3898152/11164558
/* Function to scroll last selected category into view.
*/
function scrollCategoriesToCurrent() {
  let currCat = localStorage.getItem('category');
  currCat = currCat === 'restaurants' ? 'A' : currCat[0].toUpperCase();
  location.href = '#';
  location.href = `#${currCat}`;
  hasScrolledCategory = true;
  $locationInput.focus();
  $locationInput.blur();
}

/*
/* S.O. adapted https://stackoverflow.com/a/3898152/11164558
/* If page loads scrolled to bottom call scrollCategoriesToCurrent.
/* Otherwise when user scroll to bottom of page call scrollCategoriesToCurrent.
*/
if ($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
  scrollCategoriesToCurrent();
} else {
  $(window).scroll(function () {
    if (
      $(window).scrollTop() + $(window).height() >
      $(document).height() - 100
    ) {
      if (!hasScrolledCategory) {
        scrollCategoriesToCurrent();
      }
    }
  });
}
