'use strict';

let currCard = 0; // TODO: reset on new cards
let cardScrollTimer;
const $cardTrack = $('#scrl4');

let cardScrollTrackerAndMapper;

function setTrackerMaper() {
  cardScrollTrackerAndMapper = $cardTrack.on('scroll', function () {
    clearTimeout(cardScrollTimer);
    if (!mapOpen || !$('.my-card')[0]) return;
    cardScrollTimer = setTimeout(function () {
      const margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
      const $sL = $cardTrack.scrollLeft();
      const $cardWidth = $('.my-card').width() + margin;
      const rawCardsLeft = $sL / $cardWidth;
      const focusCardIdx = Number.parseInt(rawCardsLeft + 0.5);

      if (focusCardIdx === currCard) return;
      currCard = focusCardIdx;
      const $focusCard = $('.my-card').eq(focusCardIdx);
      const $mapButton = $focusCard.find('.cardMapButton');
      const lat = $mapButton.data('lat');
      const lng = $mapButton.data('lng');
      const name = $mapButton.data('name');
      fitBounds([longitude, latitude], [lng, lat], name);
    }, 1500);
  });
}
