'use strict';

function geoSuccess(result) {
  clearTimeout(keyupTimer);
  const {
    coords: { latitude: lat, longitude: lng },
  } = result;
  latitude = lat;
  longitude = lng;
  // clear location text
  $('#location').val(``);
  // insert lng, lat as placeholder
  $('#location').prop(
    'placeholder',
    `lat: ${lat.toFixed(2)}, lng: ${longitude.toFixed(2)}`
  );
  // note user allowed geolocation
  localStorage.setItem('geoAllowed', true);
  requestSearch();
  // map point on map
  renderMiniMap([lng, lat], 10, [lng, lat], [-122.536, 37.908]);
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
}
