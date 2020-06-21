'use strict';

let sidebarState = true;

function sidebarToggleListener() {
  $('.sidebar-toggle-btn').on('click', sidebarToggle);
}

function sidebarToggle() {
  $('.control-panel').toggle();
  if (sidebarState === true) {
    $('.arrow-wrapper')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });
    sidebarState = false;
    $('.filter-display').show().toggleClass('opaque');
  } else {
    $('.arrow-wrapper')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });
    sidebarState = true;
    $('.filter-display').hide().toggleClass('opaque');
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
