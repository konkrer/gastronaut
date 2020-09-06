'use strict';

//
// Class to hold mission control navigation logic.
//
class MissionControlNavigation {
  constructor() {
    this.currentRestMarkerIdx = 0;
    this.lastRestMarkerIdx = null;
    this.lastRestMarkerHtml = null;
    // nav buttons
    this.addNavProfileBtnsListener();
    this.addDetectLocationListener();
    this.addStartFromHomeListener();
    // Add location autocomplete listener.
    Base_Obj.addLocationAutocompleteListener();
    // Location entry or restart navigation.
    this.addNavStartListener();
    this.addNavEndListener();
  }

  //
  // Navigation Profile Buttons Listener (drive, walk, cycle).
  // Opens modal. Sets Map_Obj profile.
  //
  addNavProfileBtnsListener() {
    const this_ = this;
    $('.map-routing').on('click', '.directionsBtn', function () {
      // If no cache for mission or no businesses in mission return.
      const currMissionId = localStorage.getItem('currMissionId');
      if (
        MissionControlObj.missionCache[currMissionId] === undefined ||
        MissionControlObj.missionCache[currMissionId].businesses.length === 0
      )
        return;
      // Navigation profile.
      Map_Obj.changedProfile = Map_Obj.profile !== $(this).data('profile');
      const profile = $(this).data('profile');
      Map_Obj.profile = profile;
      $('.profileDisplay').text(Map_Obj.profileDict[profile]);
      // If navigation active.
      if (Map_Obj.currentRoute) {
        // If new destination.
        if (this.lastRestMarkerIdx !== this.currentRestMarkerIdx)
          // change lastRestMarker to default color.
          MissionControlObj.changeMarkerColor(this_.lastRestMarkerIdx, null);
        this_.startLocationSuccess();
      }
      // Else have user pick starting location.
      else $('#navigationModal').modal('show');
    });
  }

  //
  // Detect location listener.
  //
  addDetectLocationListener() {
    // detect location
    $('#detect-location').click(function () {
      Geolocation_Obj.detectLocation();
    });
  }

  //
  // Start from Home button listener.
  //
  addStartFromHomeListener() {
    $('.startFromHomeBtn').click(
      function () {
        const lng = $('.map-routing .home').data('lng');
        if (!lng) $('.startFromHomeDiv').hide();
        else {
          const lat = $('.map-routing .home').data('lat');
          Map_Obj.longitude = lng;
          Map_Obj.latitude = lat;
          Map_Obj.addUserMarker();
          Map_Obj.userMarker.togglePopup();
          Geolocation_Obj.clearLocationWatching();
          this.startLocationSuccess();
          // Remove any lat/lng placeholder if user had detected location.
          $('#location').prop('placeholder', 'Starting Location');
        }
      }.bind(this)
    );
  }

  //
  // Start/Restart Navigation Listener.
  //
  addNavStartListener() {
    const this_ = this;
    $('#nav-start-form').submit(async function (e) {
      e.preventDefault();

      const location = $(this).find('#location').val();

      if (location) {
        // If user selected a suggested address there will be coords cached.
        let coords = Base_Obj.locationAutocompleteCache[location];
        if (!coords) {
          // Geocode user provided address.
          const features = await Base_Obj.geocode(location);
          if (features.length === 0) {
            alert('No location found. Please fix location input.');
            return;
          }
          coords = features[0].geometry.coordinates;
        }
        Map_Obj.longitude = coords[0];
        Map_Obj.latitude = coords[1];
        Map_Obj.addUserMarker();
        Map_Obj.userMarker.togglePopup();
        Geolocation_Obj.clearLocationWatching();
        // Remove any lat/lng placeholder if user had detected location.
        $('#location').prop('placeholder', 'Starting Location');
      }
      if (Map_Obj.longitude) {
        this_.startLocationSuccess();
        // If watching location.
        if (Geolocation_Obj.locationWatcher) {
          // Disable location watcher.
          Geolocation_Obj.clearLocationWatching();
          // Make camera zoom into user on location update from location watcher after brief delay.
          setTimeout(() => {
            // Enable frequent updates with location watcher.
            Geolocation_Obj.enableLocationWatcher(1);
            // Don't allow display to sleep.
            Geolocation_Obj.enableNoSleep();
          }, 2000);
        }
      } else alert('Enter a starting location or click the detect location button.');
    });
  }

  //
  // If start coordinates were determined start navigation.
  //
  startLocationSuccess() {
    // Get show route.
    Map_Obj.showDirectionsAndLine();
    // If not routing to home and routing to new destination.
    if (
      this.currentRestMarkerIdx !== -1 &&
      this.lastRestMarkerIdx !== this.currentRestMarkerIdx
    )
      // Change marker that was routed to to alternate color.
      MissionControlObj.changeMarkerColor(
        this.currentRestMarkerIdx,
        $('#businesses-list .list-group-item').eq(this.currentRestMarkerIdx),
        1
      );
    // Make sure home button is active on nav restart to home.
    else if (this.currentRestMarkerIdx === -1)
      $('.map-routing .home').addClass('homeActive');
    // Set lastRestMarker to know what to turn back to original color marker.
    this.lastRestMarkerIdx = this.currentRestMarkerIdx;
    this.postDirectionsMapAdjustments();
    $('#navigationModal').modal('hide');
    $('#directions-panel').show();
    $('.map-routing .home').fadeIn();
    $('.map-routing .reset').fadeIn();
    // Make current button active.
    Map_Obj.clearNavBtnsActive();
    $(`.map-routing div[data-profile="${Map_Obj.profile}"]`).addClass('active');
    // Wait to see if location watcher is enbaled to determine if sidebar should
    // be closed for following user navigation.
    setTimeout(() => {
      // If navi following user close sidebar.
      if (Geolocation_Obj.locationWatcher && MissionControlObj.sidebarOpen)
        MissionControlObj.toggleSidebar();
      else $('#businesses-list').removeClass('show');
    }, 2500);
  }

  //
  // Make post directions map adjustments.
  //
  postDirectionsMapAdjustments() {
    Map_Obj.closePopupsArray();
    Map_Obj.restMarker.togglePopup();
    // If new navigation profile fit-bounds.
    if (Map_Obj.changedProfile) Map_Obj.fitBounds();
    // Else skip fit-bounds for re-routing and reset changedProfile flag to true.
    else Map_Obj.changedProfile = true;
  }

  //
  // End navigation listener.
  //
  addNavEndListener() {
    $('.map-routing .reset').click(this.endNavigation.bind(this));
  }

  //
  // End navigation actions.
  //
  endNavigation() {
    // If there are still markers on the map turn last navigation marker
    // back to default color.
    if (Map_Obj.restMarkers.length > 0)
      MissionControlObj.changeMarkerColor(this.lastRestMarkerIdx, null);
    this.lastRestMarkerIdx = null;
    Map_Obj.clearRouting();
    $('#directions-panel').fadeOut();
    $('.map-routing .home').fadeOut().removeClass('homeActive');
    $('.map-routing .reset').fadeOut();
    MissionControlObj.mapAllBusinesses();
  }
}
