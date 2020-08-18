'use strict';

class GeolocationObj {
  constructor() {
    this.locationWatcher = null;
    this.noSleep = new NoSleep();
    this.noSleepActive = false;
    this.options = [
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 15000,
      },
      {
        enableHighAccuracy: true,
        timeout: 2000,
        maximumAge: 500,
      },
    ];
    // this.addVisibilityChangeWakeLocker();
  }

  /*
  /* Detect location. 
  /* Set lat, lng. Set if user is sharing location.
  */
  detectLocation() {
    if ('geolocation' in navigator) {
      $('#detect-location').children().addClass('pulse');
      navigator.geolocation.clearWatch(this.locationWatcher);
      this.locationWatcher = null;
      navigator.geolocation.getCurrentPosition(
        this.geoSuccess.bind(this),
        this.showError.bind(this),
        this.options[0]
      );
    } else {
      alert('Geolocation is not supported by this browser.');
      if (Map_Obj.longitude) {
        Map_Obj.addUserMarker();
        Map_Obj.userMarker.togglePopup();
      }
    }
  }

  geoSuccess(position) {
    // stop detect location icon from pulsing.
    $('#detect-location').children().removeClass('pulse');
    if (typeof FormFunctsObj !== 'undefined')
      clearTimeout(FormFunctsObj.keyupTimer);
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
      this.watchSuccess.bind(this),
      this.watchError,
      this.options[1]
    );
    if (typeof IndexSearchObj !== 'undefined') IndexSearchObj.searchYelp();
    else MissionControlNavigationObj.startLocationSuccess();
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
      Map_Obj.userMarker.togglePopup();
    }
    if (typeof IndexSearchObj !== 'undefined') IndexSearchObj.searchYelp();
    this.disableNoSleep();
  }

  watchSuccess(position) {
    const {
      coords: { latitude: lat, longitude: lng, heading },
    } = position;
    Map_Obj.latitude = +lat;
    Map_Obj.longitude = +lng;
    // insert lng, lat as placeholder in location input.
    $('#location').prop(
      'placeholder',
      `lat: ${lat.toFixed(2)}, lng: ${lng.toFixed(2)}`
    );
    Map_Obj.addUserMarker();
    if (Map_Obj.currentRoute) {
      Map_Obj.flyToUser(heading);
    }
  }

  enableNoSleep() {
    if (!this.noSleepActive) {
      this.noSleep.enable();
      this.noSleepActive = true;
    }
  }

  disableNoSleep() {
    if (this.noSleepActive) {
      this.noSleep.disable();
      this.noSleepActive = false;
    }
  }

  watchError(err) {
    console.warn('ERROR(' + err.code + '): ' + err.message);
  }
}

const Geolocation_Obj = new GeolocationObj();
