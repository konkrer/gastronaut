'use strict';

function renderMiniMap(
  mapCenter = [-68, 27],
  zoom = 1.3,
  userCoords,
  restCoords
) {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoia29ua3JlciIsImEiOiJjanZwdjB5dnUwNWNrNDVteHJjNHhxNnpiIn0.aPtNXMoZYfLs09Jth-0jMw';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/konkrer/ckbo4owz330931in4cemh5xla/draft',
    center: mapCenter,
    zoom,
  });
  map.addControl(new mapboxgl.FullscreenControl());

  if (userCoords) {
    var marker = new mapboxgl.Marker().setLngLat(userCoords).addTo(map);
  }
  if (restCoords) {
    var marker = new mapboxgl.Marker().setLngLat(restCoords).addTo(map);
  }

  if (userCoords && restCoords) {
    var bbox = [userCoords, restCoords];
    map.fitBounds(bbox, {
      padding: { top: 40, bottom: 10, left: 15, right: 15 },
    });
  }
}
