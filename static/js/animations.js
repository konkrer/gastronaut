'use strict';

/*
/* Make side bar arrows pulse 
/* to show user to close sidebar on mobile.
*/
function makeArrowPulse() {
  $('.arrow-wrapper').removeClass('black-outline-mobile');
  setTimeout(() => $('.arrow-wrapper').addClass('black-outline-mobile'), 10);
}
