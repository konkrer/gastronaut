'use strict';

let userMarker;
let restMarker;
const markerOptions = { color: '#3fff5b' };
const fitBoundsOptions = {
  padding: { top: 70, bottom: 40, left: 145, right: 145 },
};

function renderMiniMap(mapCenter = [-85, 26.8], zoom = 1.3) {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoia29ua3JlciIsImEiOiJjanZwdjB5dnUwNWNrNDVteHJjNHhxNnpiIn0.aPtNXMoZYfLs09Jth-0jMw';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/konkrer/ckbo4owz330931in4cemh5xla',
    center: mapCenter,
    pitch: 34,
    zoom,
  });
  map.addControl(new mapboxgl.FullscreenControl());
  map.addControl(new mapboxgl.NavigationControl());

  return map;
}

function addUserMarker(coords) {
  userMarker = new mapboxgl.Marker(markerOptions)
    .setLngLat(coords)
    .addTo(mappyBoi);
  return userMarker;
}

function fitBounds(userCoords, restCoords, name) {
  if (restMarker) restMarker.remove();
  mappyBoi.fitBounds([userCoords, restCoords], fitBoundsOptions);
  restMarker = new mapboxgl.Marker(markerOptions)
    .setLngLat(restCoords)
    .setPopup(new mapboxgl.Popup().setHTML(`<b><em>${name}</em></b>`))
    .addTo(mappyBoi);
  restMarker.togglePopup();
}

let mappyBoi = renderMiniMap();
