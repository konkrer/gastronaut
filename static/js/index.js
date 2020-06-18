'use strict';

const $locationInput = $('#location');
const $searchTerm = $('#search-term');
const $mainForm = $('#main-form');
const $categoryButtons = $('#cat-btns');
let keyupTimer;

let currCategory = 'all';
let latitude = null;
let longitude = null;
let lastParameters = null;
let currData = null;

function getFormData() {
  let data = $mainForm.serialize();
  data = `${data}&categories=${currCategory}&latitude=${latitude}&longitude=${longitude}`;
  console.log(data);
  return data;
}

function getTransactions() {
  const transactions = [];
  $('.interface:checked').each(function (index) {
    transactions.push($(this).val());
  });
  return transactions;
}

async function requestSearch() {
  // Make sure there is a location to search.
  if (!latitude && $('#location').val() === '') {
    alert('Enter a location or press detect location.');
    return;
  }
  const querryData = getFormData();
  // if parameters have changed call api endpoint
  if (querryData !== lastParameters) {
    // TODO: axios my search api endpoint
    // const data = await axios.get(`/search?${querryData}`);
    // currData = data;
    // lastParameters = queryData
  }

  // TODO: add cards filter by transactions
}

$locationInput.on('keyup', function (e) {
  clearTimeout(keyupTimer);
  keyupTimer = setTimeout(function () {
    requestSearch();
  }, 1000);
});

$searchTerm.on('keyup', function (e) {
  clearTimeout(keyupTimer);
  keyupTimer = setTimeout(function () {
    const term = $searchTerm.val();
    if (term) $('.keyword-display').text(` - ${term}`);
    else $('.keyword-display').text('');
    requestSearch();
  }, 1000);
});

$mainForm.on('change', '.onChange', function (e) {
  clearTimeout(keyupTimer);
  keyupTimer = setTimeout(function () {
    requestSearch();
  }, 1000);
});

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
    currCategory = e.target.value;
    localStorage.setItem('category', currCategory);
    $('.cat-display').text(e.target.textContent);
    requestSearch();
  }, 1000);
});

/*
/* Detect location button
*/
$('#detect-location').on('click', function (e) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(detectLocation, showError);
  } else {
    alert('Geolocation is not supported by this browser.');
  }
});

/*
/* Clear search term when clear term button pressed
*/
$('#clear-term').on('click', function (e) {
  $searchTerm.val('');
  $('.keyword-display').text('');
});

/*
/* Exclusive  checkbox inputs "open now" and "open at".
/* Additionaly, "open at" needs a datetime input enabled
/* and disabled when it is checked and unchecked.
*/
$('#open-now').on('click', function (e) {
  // uncheck "open at" and disable datetime input
  $('#open-at').prop('checked', false);
  $('#open-at-datetime').prop('disabled', true);
});

$('#open-at').on('click', function (e) {
  // uncheck "open now"
  $('#open-now').prop('checked', false);
  // enable or disable datetime input as input is checked or unchecked
  if ($('#open-at').prop('checked')) {
    $('#open-at-datetime').prop('disabled', false);
  } else {
    $('#open-at-datetime').prop('disabled', true);
  }
});

/*
/* Pulse Animations for location and search buttons
*/
$('#detect-location').on('mouseover', function (e) {
  $('#detect-location-glyph').addClass('pulse');
});
$('#detect-location').on('mouseout', function (e) {
  $('#detect-location-glyph').removeClass('pulse');
});

$('#clear-term').on('mouseover', function (e) {
  $('#clear-term-glyph').addClass('pulse');
});
$('#clear-term').on('mouseout', function (e) {
  $('#clear-term-glyph').removeClass('pulse');
});

/*
/* Check localStorage for last choosen category and set active
*/
function checkLocalStorage() {
  let currCat = localStorage.getItem('category');
  if (!currCat) {
    localStorage.setItem('category', 'all');
    currCat = 'all';
  }
  currCategory = currCat;
  $categoryButtons.children().each(function (index) {
    if ($(this).val() === currCat) {
      $(this).addClass('active');
      $('.cat-display').text($(this).text());
    }
  });
}
checkLocalStorage();
