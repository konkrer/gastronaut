'use strict';

let sidebarOpen = true;

function sidebarToggleListener() {
  $('.sidebar-toggle-btn').on('click', sidebarToggle);
}

function sidebarToggle() {
  // change arrow state, filter display,
  // and top padding of card-trak-inner to
  // accomadate filter display
  if (sidebarOpen === true) {
    $('.control-panel').toggleClass('sidebarCollapse');
    setTimeout(() => $('.control-panel').toggle(), 300);
    $('.arrow-wrapper')
      .removeClass('black-outline-mobile')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });
    sidebarOpen = false;
    $('.filter-display').slideDown();
    $('.card-track-inner').toggleClass('padtop-card-filter-d');
  } else {
    $('.control-panel').toggle();
    $('.control-panel').toggleClass('sidebarCollapse');
    $('.arrow-wrapper')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });
    sidebarOpen = true;
    $('.filter-display').slideUp();
    $('.card-track-inner').toggleClass('padtop-card-filter-d');
    setTimeout(() => {
      scrollCategoriesToCurrent();
    }, 100);
  }
  if (mapOpen) setTimeout(() => mappyBoi.resize(), 350);
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
