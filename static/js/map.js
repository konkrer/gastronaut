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
    // restaurant marker for index page.
    this.restMarker = null;
    // restaurant markers for mission-control page.
    this.restMarkers = [];
    this.mapboxClient = mapboxSdk({ accessToken: this.accessToken });
    this.currentRoute = null;
    this.routeCache = new Set();
    this.profile = null;
    // options
    this.userMarkerOptions = { color: '#3bdb53' };
    this.markerOptions = { color: '#3bdb53' };
    this.fitBoundsOptions = [
      {
        padding: { top: 80, bottom: 10, left: 80, right: 80 },
      },
      {
        padding: { top: 80, bottom: 40, left: 200, right: 200 },
      },
    ];
    this.addDirectionsListener();
    this.addCancelDirectionsListener();
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
    this.userMarker = new mapboxgl.Marker(this.userMarkerOptions)
      .setLngLat([this.longitude, this.latitude])
      .setPopup(
        new mapboxgl.Popup().setHTML(`<div class="mr-2"><em>You</em></div>`)
      )
      .addTo(this.mappyBoi);
  }

  // Add a business map marker and open popup.
  addMarker(coords, html, openPopupMobile = true) {
    const marker = new mapboxgl.Marker(this.markerOptions)
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
    this.fitBounds([this.longitude, this.latitude], restCoords);
    if (this.profile) this.showDirectionsLine();
  }

  // Call fit bounds with proper options for screen size.
  fitBounds(userCoords, restCoords) {
    const optIdx = this.isMobileScreen() ? 0 : 1;
    this.mappyBoi.fitBounds(
      [userCoords, restCoords],
      this.fitBoundsOptions[optIdx]
    );
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
    this.restMarkers = array.reduce((acc, el) => {
      const coords = [el.longitude, el.latitude];
      const html = `<span class="detailsBtn mr-2" data-id="${el.id}">
                    ${el.name}</span>`;

      if (el.completed) acc.push(this.addFlagMarker(coords, html, false));
      else acc.push(this.addMarker(coords, html, false));

      return acc;
    }, []);
  }

  // clear map of a list of points for mission-control.
  clearMapArray() {
    this.restMarkers.forEach(el => el.remove());
    this.restMarkers = [];
  }

  // When DOM content is loaded add directions buttons listener.
  addDirectionsListener() {
    const this_ = this;
    window.addEventListener('DOMContentLoaded', () => {
      $('div.map-directions').on('click', '.directionsBtn', function () {
        this_.profile = $(this).data('profile');
        this_.fitBounds([this_.longitude, this_.latitude], this_.restCoords);
        this_.showDirectionsLine();
        $('.walk').addClass('walkHorizontal');
        $('.bike').addClass('bikeHorizontal');
        $('div.reset').fadeIn().addClass('resetHorizontal');
      });
    });
  }

  async showDirectionsLine() {
    const t = this;
    const routeKey = `${t.longitude},${t.latitude};${t.restCoords[0]},${t.restCoords[1]};${t.profile}`;

    if (this.routeCache.has(routeKey)) {
      this.reloadRoute(routeKey);
      return;
    }

    const resp = await this.mapboxClient.directions
      .getDirections({
        profile: this.profile,
        geometries: 'geojson',
        waypoints: [
          {
            coordinates: [this.longitude, this.latitude],
            approach: 'unrestricted',
          },
          {
            coordinates: this.restCoords,
          },
        ],
      })
      .send();

    const coordinates = resp.body.routes[0].geometry.coordinates;
    this.addGeoJsonLine(coordinates, routeKey);
  }

  reloadRoute(routeKey) {
    this.mappyBoi.removeLayer(this.currentRoute);
    this.currentRoute = routeKey;
    this.mappyBoi.addLayer({
      id: routeKey,
      type: 'line',
      source: routeKey,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#26ff00',
        'line-width': 8,
      },
    });
  }

  addGeoJsonLine(coordinates, routeKey) {
    if (this.currentRoute) {
      this.mappyBoi.removeLayer(this.currentRoute);
      // this.mappyBoi.removeSource(this.currentRoute);
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
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#26ff00',
        'line-width': 8,
      },
    });
    this.currentRoute = routeKey;
    this.routeCache.add(routeKey);
  }

  addCancelDirectionsListener() {
    window.addEventListener('DOMContentLoaded', () => {
      $('.map-directions').on(
        'click',
        'div.reset',
        function () {
          this.clearRouting();
        }.bind(this)
      );
    });
  }

  clearRouting() {
    this.mappyBoi.removeLayer(this.currentRoute);
    this.currentRoute = null;
    this.profile = null;
    $('.walk').removeClass('walkHorizontal');
    $('.bike').removeClass('bikeHorizontal');
    $('div.reset').removeClass('resetHorizontal');
    setTimeout(() => {
      $('.reset').fadeOut();
    }, 600);
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
