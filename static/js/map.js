'use strict';

//
// Class to hold map objects and functions.
//
class MapObj {
  constructor() {
    this.mapOpen = true;
    // rendered map object
    this.mappyBoi = null;
    // user data
    this.longitude = null;
    this.latitude = null;
    this.userMarker = null;
    // restaurant marker for index page.
    this.restMarker = null;
    // restaurant markers for mission-control page.
    this.restMarkers = [];
    // options
    this.markerOptions = { color: '#3bdb53' };
    this.fitBoundsOptions = [
      {
        padding: { top: 80, bottom: 10, left: 80, right: 80 },
      },
      {
        padding: { top: 80, bottom: 40, left: 200, right: 200 },
      },
    ];
  }

  // Render Map.
  renderMiniMap(mapCenter = [-85, 26.8], zoom = 1.3, navControl = false) {
    mapboxgl.accessToken =
      'pk.eyJ1Ijoia29ua3JlciIsImEiOiJja2NiNnI3bjgyMjVnMnJvNmJ6dTF0enlmIn0.AH_5N70IYIX4_tslm49Kmw';
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
    this.userMarker = new mapboxgl.Marker(this.markerOptions)
      .setLngLat([this.longitude, this.latitude])
      .setPopup(new mapboxgl.Popup().setHTML(`<b><em>You</em></b>`))
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
    if (!openPopupMobile && isMobileScreen()) marker.togglePopup();
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
    if (!openPopupMobile && isMobileScreen()) marker.togglePopup();
    return marker;
  }

  // Add a restaurant marker and fit bounds to user position and restaurant location.
  addRestMarkerAndFitBounds(restCoords, name, id) {
    const html = `<span class="detailsBtn marker-html mr-2" data-id="${id}">
                    <b>${name}</b></span>`;
    if (this.restMarker) this.restMarker.remove();
    this.restMarker = this.addMarker(restCoords, html);
    this.fitBounds([this.longitude, this.latitude], restCoords);
  }

  // Call fit bounds with proper options for screen size.
  fitBounds(userCoords, restCoords) {
    const optIdx = isMobileScreen() ? 0 : 1;
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
        zoom: 16.1,
        speed: 1,
      });
  }

  // Map a list of businesses for mission-control.
  // Add a regular or flag marker depending if the goal is/isn't completed.
  // Return array of the marker objects.
  mapArray(array) {
    this.restMarkers = array.reduce((acc, el) => {
      const coords = [el.longitude, el.latitude];
      const html = `<span class="detailsBtn marker-html mr-2" data-id="${el.id}">
                    <b>${el.name}</b></span>`;

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
}

const Map_Obj = new MapObj();

// check if screen size is mobile.
function isMobileScreen() {
  if (window.innerWidth <= 880) return true;
  return false;
}

// check if screen size is mobile in portrait.
function isMobilePortrait() {
  if (window.innerWidth <= 450) return true;
  return false;
}
