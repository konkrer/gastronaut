'use strict';

class GeolocationObj {
  constructor() {
    this.locationWatcher;
    this.options = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 15000,
    };
  }

  /*
  /* Detect location. 
  /* Set lat, lng. Set if user is sharing location.
  */
  detectLocation() {
    if (navigator.geolocation) {
      $('#detect-location').children().addClass('pulse');
      navigator.geolocation.clearWatch(this.locationWatcher);
      navigator.geolocation.getCurrentPosition(
        this.geoSuccess.bind(this),
        this.showError,
        this.options
      );
    } else {
      alert('Geolocation is not supported by this browser.');
      if (Map_Obj.longitude) {
        Map_Obj.addUserMarker();
      }
    }
  }

  geoSuccess(position) {
    // stop detect location icon from pulsing.
    $('#detect-location').children().removeClass('pulse');
    clearTimeout(keyupTimer);
    const {
      coords: { latitude: lat, longitude: lng },
    } = position;
    Map_Obj.latitude = +lat;
    Map_Obj.longitude = +lng;
    // clear location text
    $('#location').val(``);
    // insert lng, lat as placeholder
    $('#location').prop(
      'placeholder',
      `lat: ${lat.toFixed(2)}, lng: ${lng.toFixed(2)}`
    );
    // note user allowed geolocation
    localStorage.setItem('geoAllowed', true);
    this.locationWatcher = navigator.geolocation.watchPosition(
      this.watchSuccess,
      this.watchError,
      this.options
    );
    searchYelp();
  }

  showError(error) {
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
    $('.spinner-zone').hide();
    if (Map_Obj.longitude) {
      Map_Obj.addUserMarker();
    }
    searchYelp();
  }

  watchSuccess(position) {
    const {
      coords: { latitude: lat, longitude: lng },
    } = position;
    Map_Obj.latitude = +lat;
    Map_Obj.longitude = +lng;

    // insert lng, lat as placeholder
    $('#location').prop(
      'placeholder',
      `lat: ${lat.toFixed(2)}, lng: ${lng.toFixed(2)}`
    );
    Map_Obj.addUserMarker();
  }

  watchError(err) {
    console.warn('ERROR(' + err.code + '): ' + err.message);
  }
}

const Geolocation_Obj = new GeolocationObj();
