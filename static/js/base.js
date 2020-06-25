'use strict';

let sidebarState = true;

function sidebarToggleListener() {
  $('.sidebar-toggle-btn').on('click', sidebarToggle);
}

function sidebarToggle() {
  // toggle display of sidebar
  $('.control-panel').toggle();
  // change arrow state, filter display,
  // and top padding of card-trak-inner to
  // accomadate filter display
  if (sidebarState === true) {
    $('.arrow-wrapper')
      .removeClass('toggle-outline-mobile')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });
    sidebarState = false;
    $('.filter-display').toggleClass('d-none');
    setTimeout(() => $('.filter-display').toggleClass('opaque'), 10);
    $('.card-track-inner').toggleClass('padtop-card-filter-d');
  } else {
    $('.arrow-wrapper')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });
    sidebarState = true;
    $('.filter-display').toggleClass(['opaque', 'd-none']);
    $('.card-track-inner').toggleClass('padtop-card-filter-d');
    scrollCategoriesToCurrent();
  }
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
  navbarAnimationTiming();
});
