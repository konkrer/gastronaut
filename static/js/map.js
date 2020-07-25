'use strict';

let mapOpen = true;
let mappyBoi;
let userMarker;
let restMarker;
const markerOptions = { color: '#3bdb53' };
const fitBoundsOptions = [
  {
    padding: { top: 80, bottom: 10, left: 80, right: 80 },
  },
  {
    padding: { top: 80, bottom: 40, left: 200, right: 200 },
  },
];

function renderMiniMap(mapCenter = [-85, 26.8], zoom = 1.3) {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoia29ua3JlciIsImEiOiJja2NiNnI3bjgyMjVnMnJvNmJ6dTF0enlmIn0.AH_5N70IYIX4_tslm49Kmw';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/konkrer/ckbslmn3x00y31hp7vh351zxb', // <<<<< remove /draft in production
    center: mapCenter,
    pitch: 34,
    zoom,
  });
  map.addControl(new mapboxgl.FullscreenControl());
  // map.addControl(new mapboxgl.NavigationControl());

  return map;
}

function addUserMarker(coords) {
  userMarker = new mapboxgl.Marker(markerOptions)
    .setLngLat(coords)
    .setPopup(new mapboxgl.Popup().setHTML(`<b><em>You</em></b>`))
    .addTo(mappyBoi);
  return userMarker;
}

// Add a map marker and open popup.
function addMarker(coords, html) {
  restMarker = new mapboxgl.Marker(markerOptions)
    .setLngLat(coords)
    .setPopup(new mapboxgl.Popup().setHTML(html))
    .addTo(mappyBoi);
  restMarker.togglePopup();
  return restMarker;
}

function addRestMarkerAndFitBounds(userCoords, restCoords, name) {
  const html = `<b><em>${name}</em></b>`;
  if (restMarker) restMarker.remove();
  restMarker = addMarker(restCoords, html);
  fitBounds(userCoords, restCoords);
}

function fitBounds(userCoords, restCoords) {
  let optIdx = isMobileScreen() ? 0 : 1;
  mappyBoi.fitBounds([userCoords, restCoords], fitBoundsOptions[optIdx]);
}

// Map list of bussiness and fit bounds for ouliers.
function mapArrayAndFitBounds(array) {
  fitBoundsList(array);
  return mapArray(array);
}

// Determine least and most lng/lat combo and fit bounds
function fitBoundsList(array) {
  const least = [Infinity, Infinity];
  const most = [-Infinity, -Infinity];
  array.forEach(el => {
    least[0] = Math.min(el.longitude, least[0]);
    least[1] = Math.min(el.latitude, least[1]);
    most[0] = Math.max(el.longitude, most[0]);
    most[1] = Math.max(el.latitude, most[1]);
  });
  fitBounds(least, most);
}

// map a list of businesses for mission-control.
function mapArray(array) {
  return array.reduce((acc, el) => {
    acc.push(
      addMarker([el.longitude, el.latitude], `<b><em>${el.name}</em></b>`)
    );
    return acc;
  }, []);
}

// clear map of a list of points for mission-control.
function clearMapArray(array) {
  array.forEach(el => el.remove());
}

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
