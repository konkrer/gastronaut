'use strict';

//
// Class to hold geolocation and watch location functionality
// and related functionality.
//
class GeolocationObj {
  constructor() {
    this.locationWatcher = null;
    this.madeFirstUpdate = null; // Set true after locationWatcher makes first update.
    this.noSleep = new NoSleep();
    this.noSleepActive = false;
    this.options = [
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000,
      },
      {
        enableHighAccuracy: true,
        timeout: 2000,
        maximumAge: 500,
      },
    ];
  }

  //
  // Detect location.
  // Set lat, lng. Set if user is sharing location.
  //
  detectLocation() {
    if ('geolocation' in navigator) {
      // Make detect location button pulse while geolocation is happening.
      $('#detect-location').children().addClass('pulse');
      // Reset
      this.clearLocationWatching();
      // Get current position.
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

  //
  // If geolocation succeeds.
  //
  geoSuccess(position) {
    // stop detect location button from pulsing.
    $('#detect-location').children().removeClass('pulse');
    if (typeof FormFunctsObj !== 'undefined')
      clearTimeout(FormFunctsObj.keyupTimer);
    const {
      coords: { latitude: lat, longitude: lng, heading },
    } = position;
    Map_Obj.latitude = lat;
    Map_Obj.longitude = lng;
    Map_Obj.heading = heading;
    // clear location text
    $('#location').val(``);
    // insert lng, lat as placeholder
    $('#location').prop(
      'placeholder',
      `lat: ${lat.toFixed(2)}, lng: ${lng.toFixed(2)}`
    );
    // note user allowed geolocation
    localStorage.setItem('geoAllowed', true);
    // Post geolocation actions depending on page.
    // If index page.
    if (typeof IndexSearchObj !== 'undefined') IndexSearchObj.searchYelp();
    // Else mission-control page.
    else MissionControlNavigationObj.startLocationSuccess();

    // Watch location. Pause to ensure when in navigation mode the first location
    // update causes camera to zoom in to user and is not negated by subsequent fit bounds call.
    setTimeout(() => {
      // If active navigation update frequently.
      if (Map_Obj.profile) {
        alert('Frequent Updates');
        this.enableLocationWatcher(1);
        this.enableNoSleep();
      }
      // Update infrequently.
      else this.enableLocationWatcher(0);
    }, 2000);
  }

  //
  // If geolocation fails.
  //
  showError(error) {
    // Error handling from S.O.
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
    // Stop detect location button from pulsing.
    $('#detect-location').children().removeClass('pulse');
    $('.spinner-zone').hide();
    // If there is previous location data use that for userMarker.
    if (Map_Obj.longitude) {
      Map_Obj.addUserMarker();
      Map_Obj.userMarker.togglePopup();
    }
    // If on index page search yelp.
    if (typeof IndexSearchObj !== 'undefined') IndexSearchObj.searchYelp();
  }

  //
  // If location watcher succeeds.
  //
  watchSuccess(position) {
    const {
      coords: { latitude: lat, longitude: lng, heading },
    } = position;

    // If in navigation mode zoom in to user and align for user heading.
    if (Map_Obj.currentRoute) Map_Obj.flyToUser(lng, lat, heading);

    this.madeFirstUpdate = true;
    Map_Obj.latitude = lat;
    Map_Obj.longitude = lng;
    Map_Obj.heading = heading;
    Map_Obj.addUserMarker();
    // insert lng, lat as placeholder in location input.
    $('#location').prop(
      'placeholder',
      `lat: ${lat.toFixed(2)}, lng: ${lng.toFixed(2)}`
    );
  }

  //
  // Do not let display shut off during navigation.
  //
  enableNoSleep() {
    if (!this.noSleepActive) {
      this.noSleep.enable();
      this.noSleepActive = true;
    }
  }

  //
  // Disable display not turning off.
  //
  disableNoSleep() {
    if (this.noSleepActive) {
      this.noSleep.disable();
      this.noSleepActive = false;
    }
  }

  //
  // If location watch fails.
  //
  watchError(err) {
    console.warn('ERROR(' + err.code + '): ' + err.message);
  }

  //
  // Enable location watcher with given option choice.
  //
  enableLocationWatcher(option = 0) {
    this.locationWatcher = navigator.geolocation.watchPosition(
      this.watchSuccess.bind(this),
      this.watchError,
      this.options[option]
    );
  }

  //
  // Clear location watcher and reset related variables.
  //
  clearLocationWatching() {
    navigator.geolocation.clearWatch(this.locationWatcher);
    this.locationWatcher = null;
    this.madeFirstUpdate = false;
    this.disableNoSleep();
    Map_Obj.heading = null;
  }
}

const Geolocation_Obj = new GeolocationObj();
