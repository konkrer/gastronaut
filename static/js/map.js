'use strict';

//
// Class to hold map, map data, and functions.
//
class MapObj {
  constructor() {
    this.accessToken =
      'pk.eyJ1Ijoia29ua3JlciIsImEiOiJja2NiNnI3bjgyMjVnMnJvNmJ6dTF0enlmIn0.AH_5N70IYIX4_tslm49Kmw';
    this.mapboxClient = mapboxSdk({ accessToken: this.accessToken });
    this.mapOpen = true;
    this.mappyBoi = null; // rendered map object
    this.longitude = null; // user longitude data
    this.latitude = null; // user latitude data
    this.heading = null; // user heading
    this.restCoords = null; // used to store current business coords or home coords
    this.userMarker = null;
    this.homeMarker = null;
    this.userMarkerStyle = 0;
    this.markerStyle = 0;
    this.restMarker = null; // restaurant marker for index page. Also used for navigation dest.
    this.restMarkers = []; // restaurant markers for mission-control page.
    this.currentRoute = null;
    this.routeCache = new Set();
    this.directionsCache = {};
    this.profile = null;
    this.changedProfile = true;
    // options
    this.markerOptions = [
      { color: '#00ff26' },
      { color: 'var(--my-info-alt)' },
    ];
    this.userMarkerOptions = [
      { color: '#00ff26' },
      {
        element: $('<div class="marker navi-marker">').get()[0],
        anchor: 'center',
        offset: [0, 0],
      },
    ];
    this.fitBoundsOptions = [
      {
        padding: { top: 120, bottom: 10, left: 80, right: 80 },
        maxZoom: 18,
      },
      {
        padding: { top: 80, bottom: 10, left: 80, right: 80 },
        maxZoom: 18,
      },
      {
        padding: { top: 80, bottom: 40, left: 200, right: 200 },
        maxZoom: 18,
      },
    ];
    // Convert directions profile to string for display.
    this.profileDict = {
      'driving-traffic': '- Driving',
      walking: '- Walking',
      cycling: '- Cycling',
    };
    // Options for creating GeoJson line.
    this.layout = {
      'line-join': 'round',
      'line-cap': 'round',
    };
    this.paint = {
      'line-color': '#51ff00',
      'line-width': 8,
    };
    this.addHomeButtonListener();
  }

  //
  // Render Map.
  //
  renderMiniMap(mapCenter = [-85, 26.8], zoom = 1.3, navControl = false) {
    mapboxgl.accessToken = this.accessToken;
    this.mappyBoi = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/konkrer/ckd9yhr2a0oaf1iplamr9t21y', // <<<<< remove /draft in production
      center: mapCenter,
      pitch: 34,
      zoom,
    });
    this.mappyBoi.addControl(new mapboxgl.FullscreenControl());
    if (navControl) this.mappyBoi.addControl(new mapboxgl.NavigationControl());
  }

  //
  // Add a user marker.
  //
  addUserMarker() {
    if (!this.longitude) return;
    if (this.userMarker) this.userMarker.remove();
    this.userMarker = new mapboxgl.Marker(
      this.userMarkerOptions[this.userMarkerStyle]
    )
      .setLngLat([this.longitude, this.latitude])
      .setPopup(
        new mapboxgl.Popup().setHTML(`<div class="mr-2"><em>You</em></div>`)
      )
      .addTo(this.mappyBoi);
  }

  //
  // Add a business map marker and open popup.
  //
  addMarker(coords, html, openPopup = true) {
    const marker = new mapboxgl.Marker(this.markerOptions[this.markerStyle])
      .setLngLat(coords)
      .setPopup(new mapboxgl.Popup().setHTML(html))
      .addTo(this.mappyBoi);

    if (openPopup) marker.togglePopup();
    return marker;
  }

  //
  // Add a flag map marker and open popup.
  //
  addFlagMarker(coords, html, openPopup = true) {
    const options = {
      element: $('<div class="marker flag-marker">').get()[0],
      anchor: 'center',
      offset: [21, -30],
    };
    const marker = new mapboxgl.Marker(options)
      .setLngLat(coords)
      .setPopup(new mapboxgl.Popup({ offset: [0, -61] }).setHTML(html))
      .addTo(this.mappyBoi);

    if (openPopup) marker.togglePopup();
    return marker;
  }

  //
  // Add a restaurant marker and fit bounds to user position and restaurant location.
  // Called only from index page.
  //
  addRestMarkerAndFitBounds(restCoords, name, id) {
    this.restCoords = restCoords;
    const html = `<span class="detailsBtn mr-2" data-id="${id}">
                    ${name}</span>`;
    if (this.restMarker) this.restMarker.remove();
    if (this.homeMarker) this.homeMarker.remove();
    this.restMarker = this.addMarker(restCoords, html);
    // If navigation active map route to this location.
    if (this.profile) {
      $('.map-routing .home').removeClass('homeActive');
      this.showDirectionsAndLine();
      if ($('#directions-panel').hasClass('directionsShow'))
        IndexButtonsLogicsObj.toggleDirectionsDiv();
    }
    // If new navigation profile fit-bounds.
    if (this.changedProfile) this.fitBounds();
    // Else skip fit-bounds for re-routing and reset changedProfile flag to true.
    else this.changedProfile = true;
  }

  //
  // Call fit bounds with proper options for screen size.
  //
  fitBounds(coords1, coords2) {
    coords1 = coords1 ? coords1 : [this.longitude, this.latitude];
    coords2 = coords2 ? coords2 : this.restCoords;

    let optIdx;
    if (this.isMobilePortrait()) optIdx = 0;
    else if (this.isMobileScreen()) optIdx = 1;
    else optIdx = 2;

    this.mappyBoi.fitBounds([coords1, coords2], this.fitBoundsOptions[optIdx]);
  }

  //
  // Map list of business and fit bounds for outliers.
  //
  mapArrayAndFitBounds(array) {
    this.fitBoundsArray(array);
    this.mapArray(array);
  }

  //
  // For list of businesses with lng/lat data
  // determine least and most lng/lat combo and fit bounds.
  // If only one coordinate pair in list fly to location.
  // Called only from mission-control page.
  //
  fitBoundsArray(array) {
    // If there are two or more points to map.
    if (this.longitude || array.length > 1) {
      const newArray = [...array];
      // Add user coords is user coords.
      if (this.longitude)
        newArray.push({ longitude: this.longitude, latitude: this.latitude });
      // Add home coords if home coords.
      if (this.restCoords)
        newArray.push({
          longitude: this.restCoords[0],
          latitude: this.restCoords[1],
        });
      const least = [Infinity, Infinity];
      const most = [-Infinity, -Infinity];
      newArray.forEach(el => {
        least[0] = Math.min(el.longitude, least[0]);
        least[1] = Math.min(el.latitude, least[1]);
        most[0] = Math.max(el.longitude, most[0]);
        most[1] = Math.max(el.latitude, most[1]);
      });
      this.fitBounds(least, most);
    } else
      this.mappyBoi.flyTo({
        center: [array[0].longitude, array[0].latitude],
        essential: true,
        zoom: 16.01,
        speed: 1,
      });
  }

  //
  // Map a list of businesses for mission-control.
  // Add a regular or flag marker depending if the goal is/isn't completed.
  //
  mapArray(array) {
    this.restMarkers = array.reduce((acc, el, idx) => {
      const coords = [el.longitude, el.latitude];
      // On mission load use first business for restCoords for navigation.
      const html = `<span class="detailsBtn mr-2" data-id="${el.id}">
      ${el.name}</span>`;

      const openPopup = this.isMobileScreen() ? false : true;
      if (el.completed)
        var marker = this.addFlagMarker(coords, html, openPopup);
      else var marker = this.addMarker(coords, html, openPopup);
      acc.push(marker);

      if (idx === 0) {
        this.restCoords = coords;
        this.restMarker = marker;
      }
      return acc;
    }, []);
    // If navigation active show directions and line on map.
    if (this.profile) this.showDirectionsAndLine();
  }

  //
  // Close all popups in marker array
  //
  closePopupsArray(array) {
    array = array ? array : this.restMarkers;
    array.forEach(marker => {
      if (marker.getPopup().isOpen()) marker.togglePopup();
    });
  }

  //
  // clear map of a list of points for mission-control.
  //
  clearMapArray() {
    this.restMarkers.forEach(el => el.remove());
    this.restMarkers = [];
  }

  //
  // Use Mapbox geocoding to find address and coords for address.
  // Return feature list of locations with coords.
  //
  async geocode(query) {
    // Get coords for proximity for geocoding. Use user coords or restCoords.
    const proximityCoords = this.longitude
      ? [this.longitude, this.latitude]
      : this.restCoords;
    // Cannot have ';' in query string for mapbox.
    query = query.replace(';', ',');
    try {
      var resp = await this.mapboxClient.geocoding
        .forwardGeocode({
          query,
          proximity: proximityCoords,
        })
        .send();
    } catch (error) {
      Sentry.captureException(error);
      return [];
    }

    if (resp.statusCode !== 200) return [];
    return resp.body.features;
  }

  //
  // Call mapbox directions API and show geoJson line for route and show directions text.
  //
  async showDirectionsAndLine() {
    // Make route key based on start and end location and navigation profile.
    const routeKey = this.makeRouteKey();

    if (this.routeCache.has(routeKey)) this.reloadRoute(routeKey);
    else {
      const directionsData = await this.getDirections();

      if (directionsData) {
        const [legs, coordinates] = directionsData;
        this.addDirectionsText(legs, routeKey);
        this.addGeoJsonLine(coordinates, routeKey);
        // Make sure camera zooms into user on new route
        // with next location watch update.
        setTimeout(() => {
          Geolocation_Obj.madeFirstUpdate = false;
        }, 1000);
      }
    }
  }

  //
  // Reload route (map source) to new layer.
  //
  reloadRoute(routeKey) {
    if (this.currentRoute === routeKey) return;
    if (this.currentRoute) this.mappyBoi.removeLayer(this.currentRoute);
    this.currentRoute = routeKey;
    this.mappyBoi.addLayer({
      id: routeKey,
      type: 'line',
      source: routeKey,
      layout: this.layout,
      paint: this.paint,
    });
    // Reload directions text for this route.
    $('#directions-text ol').html(this.directionsCache[routeKey]);
  }

  //
  // Add geoJson line to map for new route.
  //
  addGeoJsonLine(coordinates, routeKey) {
    if (this.currentRoute) this.mappyBoi.removeLayer(this.currentRoute);

    this.mappyBoi.addSource(routeKey, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    });
    this.mappyBoi.addLayer({
      id: routeKey,
      type: 'line',
      source: routeKey,
      layout: this.layout,
      paint: this.paint,
    });
    this.currentRoute = routeKey;
    this.routeCache.add(routeKey);
  }

  //
  // Add directions text to directions list.
  //
  addDirectionsText(legs, routeKey) {
    const olContents = legs[0].steps.reduce((acc, step) => {
      const {
        maneuver: { instruction },
      } = step;
      const li = `<li class="mb-2">${instruction}</li>`;
      return `${acc}${li}`;
    }, '');
    $('#directions-text ol').html(olContents);
    this.directionsCache[routeKey] = olContents;
  }

  //
  // Follow user during active follow navigation with heading alignment.
  // Only update on lng or lat change larger than precision to prevent heading
  // and coords jitter. Called by Geolocation_Obj.watchSuccess.
  //
  flyToUser(lng, lat, heading) {
    // Make first update right away to zoom into user at active following navigation start.
    if (!Geolocation_Obj.madeFirstUpdate || this.warrantsNewHeading(lng, lat)) {
      this.mappyBoi.flyTo({
        center: [this.longitude, this.latitude],
        essential: true,
        zoom: 16.5,
        speed: 0.4,
        bearing: heading,
        pitch: this.mappyBoi.getMaxPitch(),
      });
      this.latitude = lat;
      this.longitude = lng;
      this.heading = heading;
    }
  }

  //
  // Check if user has moved enough to warrant camera zoom
  // and heading adjust for flyToUser method.
  //
  warrantsNewHeading(lng, lat) {
    const precision = 0.000015;
    if (
      Math.abs(this.longitude - lng) >= precision ||
      Math.abs(this.latitude - lat) >= precision
    )
      return true;
    return false;
  }

  //
  // Add listener for home navigation button click.
  //
  addHomeButtonListener() {
    const this_ = this;
    $('main').on('click', '.map-routing .home.loggedIn', function () {
      const lng = $(this).data('lng');
      // If home button has home coords data begin navigation home.
      if (lng) {
        const lat = $(this).data('lat');
        this_.restCoords = [lng, lat];
        this_.markerStyle = 1;
        this_.addHomeMarkerRouteFitBounds($(this));
        // If on mission-control page set currentRestMarkerIdx to -1 to indicate home destination active.
        if (typeof MissionControlNavigationObj !== 'undefined')
          MissionControlNavigationObj.currentRestMarkerIdx = -1;
      } else {
        // If no home address show preferences modal to enter home address.
        $('#preferencesModal').modal('show');
      }
    });
  }

  //
  // Add a home marker, show directions, and fit bounds to user position and home location.
  //
  addHomeMarkerRouteFitBounds($el) {
    // Replace home marker in case home location has changed.
    if (this.homeMarker) this.homeMarker.remove();
    // If on index page remove previous restMarker
    if (typeof IndexSearchObj !== 'undefined' && this.restMarker)
      this.restMarker.remove();
    // If on mission control page turn last restMarker green again.
    if (typeof MissionControlNavigationObj !== 'undefined') {
      MissionControlObj.changeMarkerColor(
        MissionControlNavigationObj.lastRestMarkerIdx,
        null
      );
    }
    // Add marker for home.
    this.markerStyle = 1;
    const html = `<span class="mr-2 homeMarker">Home</span>`;
    // We may want to remove the last restMarker(now homeMarker) or the homeMarker
    // specifically so have both point to same marker
    this.restMarker = this.addMarker(this.restCoords, html);
    this.homeMarker = this.restMarker;
    // If initiating home routing make btn active and fit bounds.
    if (!$el.hasClass('homeActive')) {
      $el.addClass('homeActive');
      this.fitBounds();
    }
    this.showDirectionsAndLine();
    if ($('#directions-panel').hasClass('directionsShow'))
      IndexButtonsLogicsObj.toggleDirectionsDiv();
  }

  //
  // Clear navigation mode. Remove route from map, reset variables,
  // disable noSleep.
  clearRouting() {
    if (this.currentRoute) this.mappyBoi.removeLayer(this.currentRoute);
    this.currentRoute = null;
    this.profile = null;
    this.clearNavBtnsActive();
    if (this.homeMarker) this.homeMarker = null;
    if (Geolocation_Obj.locationWatcher) {
      // Disable frequent location updates.
      Geolocation_Obj.clearLocationWatching();
      // Re-enable location watching with infrequent updates.
      Geolocation_Obj.enableLocationWatcher(0);
    }
  }

  //
  // check if screen size is mobile.
  //
  isMobileScreen() {
    if (window.innerWidth <= 880) return true;
    return false;
  }

  //
  // check if screen size is mobile in portrait.
  //
  isMobilePortrait() {
    if (window.innerWidth <= 450) return true;
    return false;
  }

  //
  // Clear the active class flag from the map navigation buttons.
  //
  clearNavBtnsActive() {
    $('.map-routing')
      .children()
      .each(function () {
        $(this).removeClass('active');
      });
  }

  //
  // Make route key for caching routes.
  //
  makeRouteKey() {
    const t = this;
    const lng = t.longitude.toFixed(5);
    const lat = t.latitude.toFixed(5);
    return `${lng},${lat};${t.restCoords[0]},${t.restCoords[1]};${t.profile}`;
  }

  //
  // Get directions from Mapbox
  //
  async getDirections() {
    const options = this.makeDirectionsOptions();
    const resp = await this.mapboxClient.directions
      .getDirections(options)
      .send();

    if (!resp || !resp.body || !resp.body.routes || !resp.body.routes[0]) {
      alert('Navigation Error. Please try again.');
      return false;
    }
    const {
      geometry: { coordinates },
      legs,
    } = resp.body.routes[0];
    return [legs, coordinates];
  }

  //
  // Make directions options.
  //
  makeDirectionsOptions() {
    return {
      profile: this.profile,
      steps: true,
      geometries: 'geojson',
      overview: 'full',
      waypoints: [
        {
          coordinates: [this.longitude, this.latitude],
          approach: 'curb',
          bearing: this.heading ? [this.heading, 45] : null,
          radius: 30,
        },
        {
          coordinates: this.restCoords,
          approach: 'unrestricted',
          bearing: null,
          radius: 'unlimited',
        },
      ],
    };
  }
}

const Map_Obj = new MapObj();
