'use strict';
// should this be in class?

const $locationInput = $('#location');
const $searchTerm = $('#search-term');
const $mainForm = $('#main-form');
const $categoryButtons = $('#cat-btns');

let keyupTimer;
let latitude = null;
let longitude = null;
let hasScrolledCategory = false;

/*
/* Get current form data plus lat, lng, and category
/* as query string for search request api endpoint.
*/
function getFormData() {
  let data = $mainForm.serialize();
  data = `${data}&categories=${localStorage.getItem(
    'category'
  )}&latitude=${latitude}&longitude=${longitude}`;
  console.log(data);
  return data;
}

/*
/* Get current form data as obj array.
/* Store in local storage as "formData".
*/
function setFormDataArray() {
  let data = $mainForm.serializeArray();
  data.push({ transactions: getTransactions() });
  console.log(data);
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
/* Make a requst to /search endpoint. Needs location.
/* If queryData is unchaged from last request interface
/* choices must have changed, skip api call. When making api
/* call store query parameters, latest data, and form state.
*/
async function requestSearch() {
  // Make sure there is a location to search.
  if (!latitude && $('#location').val() === '') {
    alert('Enter a location or press detect location.');
    return;
  }
  const queryData = getFormData();
  setFormDataArray();
  // if yelp parameters have changed call api endpoint
  if (queryData !== localStorage.getItem('lastParameters')) {
    // TODO: axios my search api endpoint
    // const data = await axios.get(`/search?${querryData}`);
    // currData = data;
    // localStorage.setItem('currData', data);
    console.log(
      'new search api call <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<******<<'
    );
    localStorage.setItem('lastParameters', queryData);
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
  }, 1000);
});

/*
/* Auto search with search term input change.
*/
$searchTerm.on('keyup', function (e) {
  clearTimeout(keyupTimer);
  keyupTimer = setTimeout(function () {
    const term = $searchTerm.val();
    if (term) $('.keyword-display').text(` - ${term}`);
    else $('.keyword-display').text('');
    requestSearch();
  }, 1000);
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
  }, 1000);
});

/*
/* Auto search with category input change.
/* Set clicked category to active.
/* Set category in local storage and display in filter display.
*/
$categoryButtons.on('click', 'button', function (e) {
  clearTimeout(keyupTimer);
  $(this)
    .parent()
    .children()
    .each(function (index) {
      $(this).removeClass('active');
    });
  $(this).addClass('active');
  keyupTimer = setTimeout(function () {
    localStorage.setItem('category', e.target.value);
    $('.cat-display').text(e.target.textContent);
    requestSearch();
  }, 1000);
});

/*
/* Detect location. 
/* Set lat, lng. Set if user is sharing location.
*/
function detectLocation(e) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(geoSuccess, showError);
  } else {
    alert('Geolocation is not supported by this browser.');
  }
}
/*
/* Detect location button. Call detectLocation.
*/
$('#detect-location').on('click', detectLocation);

/*
/* Show map button. Open and close map.
*/
$('.showMap').each(function (index) {
  $(this).on('click', function () {
    $('.card-zone').toggleClass('map-collapse');
    $('#map').toggleClass('d-none');
    $('.map-track').toggleClass(['border-top', 'border-secondary']);
    $('.card-map-close').toggleClass('bottom-5');
  });
});

/*
/* Clear search term when clear term button pressed.
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
/* Pulse Animations for location and search buttons
*/
$('.jsPulser').each(function (i) {
  $(this).on('mouseover', function (e) {
    $(this).children().addClass('pulse');
  });
});
$('.jsPulser').each(function (i) {
  $(this).on('mouseout', function (e) {
    $(this).children().removeClass('pulse');
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
function setTransactions(transactions) {
  ['delivery', 'pickup', 'reservations'].forEach(id => {
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
    'yelp_reservation',
    'cashback',
    'deals',
    'wheelchair_accessible',
    'open_to_all',
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
  // remove transactions from end of data array set transactions
  const transactions = data.splice(data.length - 1)[0].transactions;
  setTransactions(transactions);
  // set location, term, and rest of form inputs
  const [location, term, ...rest] = data;
  if (location.value) $locationInput.val(location.value);
  if (term.value) {
    $searchTerm.val(term.value);
    $('.keyword-display').text(` - ${term.value}`);
  }
  setForm(rest);
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
