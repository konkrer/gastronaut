'use strict';

/*
/* Make side bar arrows pulse 
/* to show user to close sidebar on mobile.
*/
function makeArrowPulse() {
  $('.arrow-wrapper').removeClass('toggle-outline-mobile');
  setTimeout(() => $('.arrow-wrapper').addClass('toggle-outline-mobile'), 10);
}
