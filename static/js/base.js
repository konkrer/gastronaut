'use strict';

// Basic logic common to all pages.
class BaseLogic {
  constructor() {
    this.preferencesTimer;
    this.feedbackClearTimer;
    this.addPreferencesListener();
    this.addAlertCloseListener();
  }

  // User Preferences listener
  addPreferencesListener() {
    $('#preferences-form').on('change', 'input', () => {
      clearTimeout(this.preferencesTimer);
      this.preferencesTimer = setTimeout(
        this.updatePreferences.bind(this),
        400
      );
    });
  }

  // Call API set_preferences endpoint.

  async updatePreferences() {
    const data = this.convertDataArrayToObj(
      $('#preferences-form').serializeArray()
    );
    try {
      var resp = await axios.post('/v1/preferences', data);
    } catch (err) {
      Sentry.captureException(err);
      return;
    }
    if (!resp || resp.data.error) {
      Sentry.captureMessage('Something went wrong: base.updatePreferences');
      return;
    }

    $('#preferencesModal .feedback').text(resp.data.feedback);
    clearTimeout(this.feedbackClearTimer);
    this.feedbackClearTimer = setTimeout(() => {
      $('#preferencesModal .feedback').text('');
    }, 2000);
  }

  // Enable service worker for PWA.
  // Pulled from Google docs about service workers.
  enableServiceWorker() {
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
  }

  /*
  /* Close Alert (flash) function.
  */
  addAlertCloseListener() {
    $('.alert-close').click(() => {
      $('.alert').remove();
    });
  }

  /*
  /* Convert the array of objects that jQuery returns from serializeArray
  /* to a single object with key value pairs for all data.
  */
  convertDataArrayToObj(data) {
    // reduce data from array of objects to obj.
    return data.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {});
  }
}

const Base = new BaseLogic();

function sleep(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}
