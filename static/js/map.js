'use strict';

//
// Class to hold map objects and functions.
//
class MapObj {
  constructor() {
    this.accessToken =
      'pk.eyJ1Ijoia29ua3JlciIsImEiOiJja2NiNnI3bjgyMjVnMnJvNmJ6dTF0enlmIn0.AH_5N70IYIX4_tslm49Kmw';
    this.mapOpen = true;
    // rendered map object
    this.mappyBoi = null;
    // user data
    this.longitude = null;
    this.latitude = null;
    this.restCoords = null;
    this.userMarker = null;
    this.userMarkerStyle = 0;
    this.markerStyle = 0;
    // restaurant marker for index page.
    this.restMarker = null;
    // restaurant markers for mission-control page.
    this.restMarkers = [];
    this.mapboxClient = mapboxSdk({ accessToken: this.accessToken });
    this.currentRoute = null;
    this.routeCache = new Set();
    this.directionsCache = {};
    this.profile = null;
    // options
    this.markerOptions = [
      { color: '#00ff26' },
      { color: 'var(--my-info-alt)' },
    ];
    this.fitBoundsOptions = [
      {
        padding: { top: 120, bottom: 10, left: 80, right: 80 },
      },
      {
        padding: { top: 80, bottom: 10, left: 80, right: 80 },
      },
      {
        padding: { top: 80, bottom: 40, left: 200, right: 200 },
      },
    ];
    this.profileDict = {
      'driving-traffic': '- Driving',
      walking: '- Walking',
      cycling: '- Cycling',
    };
    this.layout = {
      'line-join': 'round',
      'line-cap': 'round',
    };
    this.paint = {
      'line-color': '#26ff00',
      'line-width': 8,
    };
  }

  // Render Map.
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

  // Add a user marker and open popup.
  addUserMarker() {
    if (!this.longitude) return;
    if (this.userMarker) this.userMarker.remove();
    this.userMarker = new mapboxgl.Marker(
      this.markerOptions[this.userMarkerStyle]
    )
      .setLngLat([this.longitude, this.latitude])
      .setPopup(
        new mapboxgl.Popup().setHTML(`<div class="mr-2"><em>You</em></div>`)
      )
      .addTo(this.mappyBoi)
      .togglePopup();
  }

  // Add a business map marker and open popup.
  addMarker(coords, html, openPopupMobile = true) {
    const marker = new mapboxgl.Marker(this.markerOptions[this.markerStyle])
      .setLngLat(coords)
      .setPopup(new mapboxgl.Popup().setHTML(html))
      .addTo(this.mappyBoi)
      .togglePopup();
    // Close popup if not openPopupMobile and screen size is mobile size screen.
    if (!openPopupMobile && this.isMobileScreen()) marker.togglePopup();
    return marker;
  }

  // Add a flag map marker and open popup.
  addFlagMarker(coords, html, openPopupMobile = true) {
    const options = {
      element: $('<div class="marker flag-marker">').get()[0],
      anchor: 'center',
      offset: [21, -30],
    };
    const marker = new mapboxgl.Marker(options)
      .setLngLat(coords)
      .setPopup(new mapboxgl.Popup({ offset: [0, -61] }).setHTML(html))
      .addTo(this.mappyBoi)
      .togglePopup();
    // Close popup if not openPopupMobile and screen size is mobile size screen.
    if (!openPopupMobile && this.isMobileScreen()) marker.togglePopup();
    return marker;
  }

  // Add a restaurant marker and fit bounds to user position and restaurant location.
  addRestMarkerAndFitBounds(restCoords, name, id) {
    this.restCoords = restCoords;
    const html = `<span class="detailsBtn mr-2" data-id="${id}">
                    ${name}</span>`;
    if (this.restMarker) this.restMarker.remove();
    this.restMarker = this.addMarker(restCoords, html);
    if (this.profile) {
      this.showDirectionsAndLine();
      if ($('#map-panel').hasClass('directionsShow'))
        ButtonsLogicsObj.toggleDirectionsDiv();
    }
    this.fitBounds();
  }

  // Call fit bounds with proper options for screen size.
  fitBounds(coords1, coords2) {
    coords1 = coords1 ? coords1 : [this.longitude, this.latitude];
    coords2 = coords2 ? coords2 : this.restCoords;

    let optIdx;
    if (this.isMobilePortrait()) optIdx = 0;
    else if (this.isMobileScreen()) optIdx = 1;
    else optIdx = 2;

    this.mappyBoi.fitBounds([coords1, coords2], this.fitBoundsOptions[optIdx]);
  }

  // Map list of bussiness and fit bounds for outliers.
  mapArrayAndFitBounds(array) {
    this.fitBoundsArray(array);
    this.mapArray(array);
  }

  // For list of businesses with lng/lat data
  // determine least and most lng/lat combo and fit bounds.
  // If only one coordinate set in list fly to location.
  fitBoundsArray(array) {
    if (array.length > 1) {
      const least = [Infinity, Infinity];
      const most = [-Infinity, -Infinity];
      array.forEach(el => {
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

  // Map a list of businesses for mission-control.
  // Add a regular or flag marker depending if the goal is/isn't completed.
  // Return array of the marker objects.
  mapArray(array) {
    this.restMarkers = array.reduce((acc, el, idx) => {
      const coords = [el.longitude, el.latitude];
      // On mission load use first business for restCoords for navigation.
      const html = `<span class="detailsBtn mr-2" data-id="${el.id}">
      ${el.name}</span>`;

      if (el.completed) var marker = this.addFlagMarker(coords, html, false);
      else var marker = this.addMarker(coords, html, false);
      acc.push(marker);

      if (idx === 0) {
        this.restCoords = coords;
        this.restMarker = marker;
      }
      return acc;
    }, []);

    if (this.profile) this.showDirectionsAndLine();
  }

  // Close all popups in marker array
  closePopupsArray(array) {
    array = array ? array : this.restMarkers;
    array.forEach(marker => {
      if (marker.getPopup().isOpen()) marker.togglePopup();
    });
  }

  // clear map of a list of points for mission-control.
  clearMapArray() {
    this.restMarkers.forEach(el => el.remove());
    this.restMarkers = [];
  }

  async geocode(query) {
    query = query.replace(';', ',');
    try {
      var resp = await this.mapboxClient.geocoding
        .forwardGeocode({
          query,
          proximity: this.restCoords,
        })
        .send();
    } catch (error) {
      return [];
    }

    if (resp.statusCode !== 200) return [];
    return resp.body.features;
  }

  async showDirectionsAndLine() {
    const t = this;
    const routeKey = `${t.longitude},${t.latitude};${t.restCoords[0]},${t.restCoords[1]};${t.profile}`;
    if (t.routeCache.has(routeKey)) {
      t.reloadRoute(routeKey);
    } else {
      const resp = await t.mapboxClient.directions
        .getDirections({
          profile: t.profile,
          steps: true,
          geometries: 'geojson',
          overview: 'full',
          waypoints: [
            {
              coordinates: [t.longitude, t.latitude],
              approach: 'unrestricted',
            },
            {
              coordinates: t.restCoords,
            },
          ],
        })
        .send();

      const route = resp.body.routes[0];
      const {
        geometry: { coordinates },
        legs,
      } = route;
      t.addDirectionsText(legs, routeKey);
      t.addGeoJsonLine(coordinates, routeKey);
    }
  }

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
    $('#directions-text ol').html(this.directionsCache[routeKey]);
  }

  addGeoJsonLine(coordinates, routeKey) {
    if (this.currentRoute) {
      this.mappyBoi.removeLayer(this.currentRoute);
    }
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

  flyToUser() {
    this.mappyBoi.flyTo({
      center: [this.longitude, this.latitude],
      essential: true,
      zoom: 18,
      speed: 0.2,
    });
  }

  clearRouting() {
    this.mappyBoi.removeLayer(this.currentRoute);
    this.currentRoute = null;
    this.profile = null;
  }

  // check if screen size is mobile.
  isMobileScreen() {
    if (window.innerWidth <= 880) return true;
    return false;
  }

  // check if screen size is mobile in portrait.
  isMobilePortrait() {
    if (window.innerWidth <= 450) return true;
    return false;
  }
}

const Map_Obj = new MapObj();
