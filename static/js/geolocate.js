'use strict';

function geoSuccess(result) {
  // stop detect location icon from pulsing.
  $('#detect-location').children().removeClass('pulse');
  clearTimeout(keyupTimer);
  const {
    coords: { latitude: lat, longitude: lng },
  } = result;
  latitude = +lat;
  longitude = +lng;
  // clear location text
  $('#location').val(``);
  // insert lng, lat as placeholder
  $('#location').prop(
    'placeholder',
    `lat: ${lat.toFixed(2)}, lng: ${longitude.toFixed(2)}`
  );
  // note user allowed geolocation
  localStorage.setItem('geoAllowed', true);
  searchYelp();
}

function showError(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      alert('User denied the request for Geolocation.');
      localStorage.setItem('geoAllowed', false);
      break;
    case error.POSITION_UNAVAILABLE:
      alert('Location information is unavailable.');
      break;
    case error.TIMEOUT:
      alert('The request to get user location timed out.');
      break;
    case error.UNKNOWN_ERROR:
      alert('An unknown error occurred.');
      break;
  }
  $('#detect-location').children().removeClass('pulse');
  if (longitude) {
    userMarker = addUserMarker([longitude, latitude]);
  }
}

var options = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 30000,
};

/*
/* Detect location. 
/* Set lat, lng. Set if user is sharing location.
*/
function detectLocation(coords) {
  if (navigator.geolocation) {
    $('#detect-location').children().addClass('pulse');
    navigator.geolocation.getCurrentPosition(geoSuccess, showError, options);
  } else {
    alert('Geolocation is not supported by this browser.');
    if (longitude) {
      userMarker = addUserMarker([longitude, latitude]);
    }
  }
}
