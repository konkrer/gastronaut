'use strict';

// Enable service worker for PWA.
// Pulled from Google docs about service workers.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/static/js/sw.js').then(
      function (registration) {
        // Registration was successful
        console.log(
          'ServiceWorker registration successful with scope: ',
          registration.scope
        );
      },
      function (err) {
        // registration failed :(
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

// function navbarAnimation() {
//   document
//     .querySelector('.navbar-traverse')
//     .animate([{ right: '-56px' }, { right: '100vw' }], 20000);
// }

// function navbarAnimationTiming() {
//   setTimeout(() => {
//     navbarAnimation();
//     setInterval(() => {
//       navbarAnimation();
//     }, 300000);
//   }, 60000);
// }

// $(function () {
//   // navbarAnimationTiming();
// });
