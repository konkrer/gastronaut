'use strict';

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

function navbarAnimation() {
  document
    .querySelector('.navbar-traverse')
    .animate([{ right: '-56px' }, { right: '100vw' }], 20000);
}

function navbarAnimationTiming() {
  setTimeout(() => {
    navbarAnimation();
    setInterval(() => {
      navbarAnimation();
    }, 300000);
  }, 60000);
}

$(function () {
  sidebarToggleListener();
  // navbarAnimationTiming();
});
