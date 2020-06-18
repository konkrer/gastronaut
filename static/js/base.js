'use strict';

let sidebarState = true;

function sidebarToggle() {
  const $sidebar = $('.sidebar-toggle-btn');
  $sidebar.on('click', function (e) {
    $('.control-panel').toggle();
    $('.filter-display').toggleClass('opaque');
    if (sidebarState === true) {
      $sidebar.html(
        '<i class="fas fa-angle-double-right" aria-hidden="true"></i>'
      );
      sidebarState = false;
    } else {
      $sidebar.html(
        '<i class="fas fa-angle-double-left" aria-hidden="true"></i>'
      );
      sidebarState = true;
    }
  });
}

$(function () {
  sidebarToggle();
});
