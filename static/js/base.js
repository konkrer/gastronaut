'use strict';

let preferencesTimer;
let feedbackClearTimer;
let navRocketTimer;

/*
/* Set Preferences listener
*/
$('#preferences-form').on('change', 'input', () => {
  clearTimeout(preferencesTimer);
  preferencesTimer = setTimeout(updatePreferences, 400);
});

/*
/* Call API set_preferences endpoint.
*/
async function updatePreferences() {
  const data = convertDataArrayToObj($('#preferences-form').serializeArray());
  const resp = await axios.post('/v1/preferences', data);

  $('#preferencesModal .feedback').text(resp.data.feedback);
  clearTimeout(feedbackClearTimer);
  feedbackClearTimer = setTimeout(() => {
    $('#preferencesModal .feedback').text('');
  }, 2000);
}

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

/*
/* Convert the array of objects that jQuery returns from serializeArray
/* to a single object with key value pairs for all data.
*/
function convertDataArrayToObj(data) {
  // reduce data from array of objects to obj.
  return data.reduce((acc, curr) => {
    acc[curr.name] = curr.value;
    return acc;
  }, {});
}

/*
/* Close Alert (flash) function.
*/
$('.alert-close').click(() => {
  $('.alert').remove();
});
