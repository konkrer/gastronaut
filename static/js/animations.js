'use strict';

let currCard = 0;
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

let sidebarOpen = true;

function sidebarToggleListener() {
  $('.sidebar-toggle-btn').on('click', sidebarToggle);
}

function sidebarToggle() {
  let margin;
  let $sL;
  let cardWidth;
  let cardsLeft;
  if ($('.my-card')[0]) {
    margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
    $sL = $cardTrack.scrollLeft();
    cardWidth = $('.my-card').width() + margin;
    cardsLeft = $sL / cardWidth;
  }

  // change arrow state, filter display,
  // and top padding of card-trak-inner to
  // accomadate filter display
  if (sidebarOpen === true) {
    sidebarOpen = false;
    $('.control-panel')
      .addClass('sidebarCollapse')
      .removeClass('sidebarExpand');
  } else {
    sidebarOpen = true;
    $('.control-panel')
      .addClass('sidebarExpand')
      .removeClass('sidebarCollapse');

    setTimeout(() => {
      scrollCategoriesToCurrent();
    }, 100);
  }
  $('.card-track-inner').toggleClass('padtop-card-filter-d');
  $('.filter-display').slideToggle();
  if (mapOpen) setTimeout(() => mappyBoi.resize(), 500);
  setTimeout(() => {
    cardWidth = $('.my-card').width() + margin;
    if (cardsLeft) $cardTrack.scrollLeft(cardWidth * cardsLeft);
    $('.arrow-wrapper')
      .removeClass('pulse-outline-mobile')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });
  }, 400);
}

sidebarToggleListener();
