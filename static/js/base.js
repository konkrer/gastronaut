'use strict';

// Basic logic common to all pages.
class BaseLogic {
  constructor() {
    this.mapBoxaccessToken =
      'pk.eyJ1Ijoia29ua3JlciIsImEiOiJja2NiNnI3bjgyMjVnMnJvNmJ6dTF0enlmIn0.AH_5N70IYIX4_tslm49Kmw';
    this.mapboxClient = mapboxSdk({ accessToken: this.mapBoxaccessToken });
    this.preferencesTimer;
    this.feedbackClearTimer;
    this.locationsOptionsHtmlCache = {};
    this.locationAutocompleteCache = {};
    this.checkGoogleLogin = true;
    this.Autocomplete_Obj = new SimpleAutocomplete(
      this.officalHomeAddressSelector.bind(this),
      true
    );
    this.Autocomplete_Obj_1 = null;
    this.addPreloaderRemover();
    this.addPreferencesListeners();
    this.addHomeAddressAutocompleteListerner();
    this.addClearHomeAddressListener();
    this.addAlertCloseListener();
    this.addReportsDblclickListeners();
    this.addFeedbackListener();
    this.addSignupLoginListener();
    this.addLogoutGoogleListener();
    this.enableServiceWorker();
  }

  // Remove preloader overlay when page animations fully loaded.
  addPreloaderRemover() {
    window.addEventListener('load', () => $('.preloader-div').fadeOut(500));
  }

  // User Preferences listeners
  addPreferencesListeners() {
    // User Boolean Preferences listener
    $('#preferences-boolean').on('change', 'input', () => {
      clearTimeout(this.preferencesTimer);
      this.preferencesTimer = setTimeout(() => {
        this.updatePreferences(0);
      }, 400);
    });
    // User Text Preferences listener
    $('#preferences-text').on('submit', e => {
      e.preventDefault();
    });
  }

  // Call API set_preferences endpoint.
  async updatePreferences(formIdx) {
    const form = ['#preferences-boolean', '#preferences-text'][formIdx];
    const data = this.convertDataArrayToObj($(form).serializeArray());
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
    }, 5000);
  }

  //
  // Add Home Address autocomplete listener.
  //
  addHomeAddressAutocompleteListerner() {
    const this_ = this;
    $('#home_address').on('keyup', async function (e) {
      const key = e.which || e.keyCode;
      // If a location suggestion was clicked or
      // if user presses enter.
      if (key === 13) {
        return;
      }
      const query = $(this).val();
      const options = await this_.autocompleteLocation(query);

      this_.Autocomplete_Obj.datalist = options;
    });
  }

  //
  // Add official home address selection listener.
  //
  officalHomeAddressSelector() {
    const offical_address = this.Autocomplete_Obj.value;
    $('#home_address_official')
      .val(offical_address)
      .prop('placeholder', offical_address);
    $('#home_address').val('');
    const locationCoords = this.locationAutocompleteCache[offical_address];
    // Home coords hidden input to relay coords data to back-end.
    $('#home_coords').val(locationCoords);
    // Set/update coords data in home button for navigation purposes.
    $('.map-routing .home')
      .data('lng', locationCoords[0])
      .data('lat', locationCoords[1]);
    this.updatePreferences(1);
  }

  //
  // Add clear home address listener.
  //
  addClearHomeAddressListener() {
    $('#preferencesModal label[for="home_address_official"] a').click(
      function (e) {
        e.preventDefault();
        $('#home_address_official').val('').prop('placeholder', '');
        $('#home_coords').val('');
        this.updatePreferences(1);
        // Make home button open preferences modal by clearing coords.
        $('.map-routing .home').data('lng', '').data('lat', '');
      }.bind(this)
    );
  }

  //
  // Close Alert (flash) function.
  //
  addAlertCloseListener() {
    $('.alert-close').click(() => {
      $('.alert').remove();
    });
  }

  //
  // Allow double clicking reports cards to open report detail page.
  //
  addReportsDblclickListeners() {
    // Double clicking regular report card opens report detail page.
    $('.card.reportCard').dblclick(function () {
      window.location.href = `/report/${$(this).data('id')}`;
    });
    // Double clicking detail modal report card opens report detail page.
    $('#business-detail-modal').on(
      'dblclick',
      '.card.detailReport',
      function () {
        window.location.href = `/report/${$(this).data('id')}`;
      }
    );
  }

  //
  // Call /v1/feedback endpoint when user submits feedback.
  //
  addFeedbackListener() {
    $('#user-feedback').submit(async function (e) {
      e.preventDefault();

      const feedback_data = {
        feedback: $(this).find('textarea[name="feedback"]').val(),
        email: $(this).find('input[type="email"]').val(),
      };
      try {
        var resp = await axios.post('/v1/feedback', feedback_data);
      } catch (error) {
        Sentry.captureException(error);
        $('.feedback').text('Internal Error. Try again later.');
        return;
      }
      const data = resp.data;
      if (data.error) {
        $('.feedback').html(`<p class="txt-${data.color}">${data.error}</p>`);
      } else if (data.success) {
        $('#user-feedback-modal .feedback').html(
          `<p class="txt-${data.color}">${data.success}</p>`
        );
        $(this).find('textarea[name="feedback"]').val('');
      }
      setTimeout(() => {
        $('#user-feedback-modal').modal('hide');
        $('#user-feedback-modal .feedback').html('');
      }, 3000);
    });
  }

  //
  // Listen for buttons that will open the signup/ login modal.
  // Populate the next data so user will be redirected properly after authentication.
  //
  addSignupLoginListener() {
    $('body').on('click', '.signLogBtn', function () {
      const next_url = $(this).data('next_url');

      $('.signup').prop('href', `/signup?next_url=${next_url}`);
      $('.login').prop('href', `/login?next_url=${next_url}`);
    });
  }

  //
  // Listen for user logging out and call logoutGoogle.
  //
  addLogoutGoogleListener() {
    const this_ = this;
    $('#logout-form').submit(function (e) {
      this_.logoutGoogle(e, $(this), this_);
    });
  }

  //
  // log user out of this app with google if user signed in through google.
  //
  async logoutGoogle(e, $el, class_instance) {
    // The first time this function is called check for google login and logout from google.
    // Then trigger event again and do not preventDefault thereby calling Gastronaut logout endpoint.
    if (class_instance.checkGoogleLogin) {
      e.preventDefault();

      // Load and sign user out if signed in.
      gapi.load('auth2', function () {
        gapi.auth2
          .init({
            client_id:
              '992789148520-btgg6dtlrk8rkght89rfvdbfgu2ljeut.apps.googleusercontent.com',
          })
          .then(
            async () => {
              const auth2 = gapi.auth2.getAuthInstance();
              if (auth2) await auth2.signOut();
              // Set flag false and trigger event again.
              class_instance.checkGoogleLogin = false;
              $el.trigger(e.type);
            },
            err => {
              Sentry.captureException(err);
              // Set flag false and trigger event again.
              class_instance.checkGoogleLogin = false;
              $el.trigger(e.type);
            }
          );
      });
    }
  }

  //
  // Autocomplete location functionality for pages that call this function.
  //
  addLocationAutocompleteListener(callback) {
    this.Autocomplete_Obj_1 = new SimpleAutocomplete(
      callback,
      true,
      1,
      '30px',
      true
    );
    const this_ = this;
    $('#location').on('keyup', async function (e) {
      const key = e.which || e.keyCode;
      // If user presses enter locationSearch.
      if (key === 13) {
        this_.Autocomplete_Obj_1.closeDatalist();
        if (callback) callback();
        return;
      }
      const query = $(this).val();
      const options = await this_.autocompleteLocation(query);
      // Put suggestions in autocomplete datalist.
      this_.Autocomplete_Obj_1.datalist = options;
    });
  }

  //
  // Autocomplete location functionality
  //
  async autocompleteLocation(query) {
    // Autocomplete on queries 3 chars or longer.
    if (query.length < 3) return '';
    // If the current query value is was previously given return cached data.
    if (this.locationsOptionsHtmlCache[query])
      return this.locationsOptionsHtmlCache[query];
    // Get suggestions.
    const features = await this.geocode(query);
    // Make html <option> for each suggestion and cache coords associated with each suggestion.
    let options = features.reduce((acc, el) => {
      this.locationAutocompleteCache[el.place_name] = el.geometry.coordinates;
      return `${acc}<option value="${el.place_name}">${el.place_name}</option>`;
    }, '');
    this.locationsOptionsHtmlCache[query] = options;
    return options;
  }

  //
  // Use Mapbox geocoding to find address and coords for address.
  // Return feature list of locations with coords.
  //
  async geocode(query) {
    // Get coords for proximity for geocoding. Use user coords or restCoords if available.
    let proximityCoords;
    if (typeof Map_Obj !== 'undefined') {
      proximityCoords = Map_Obj.longitude
        ? [Map_Obj.longitude, Map_Obj.latitude]
        : Map_Obj.restCoords;
    } else {
      proximityCoords = null;
    }

    // Cannot have ';' in query string for mapbox.
    query = query.replace(';', ',');
    try {
      var resp = await this.mapboxClient.geocoding
        .forwardGeocode({
          query,
          proximity: proximityCoords,
        })
        .send();
    } catch (error) {
      Sentry.captureException(error);
      return [];
    }

    if (resp.statusCode !== 200) return [];
    return resp.body.features;
  }

  //
  // Convert the array of objects that jQuery returns from serializeArray
  // to a single object with key value pairs for all data.
  //
  convertDataArrayToObj(data) {
    // reduce data from array of objects to obj.
    return data.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {});
  }

  //
  // Method to close current browser tab. Used by
  // report cancel button.
  // https://stackoverflow.com/a/2076307/11164558
  //
  close_current_tab() {
    if (confirm('Close this browser tab?')) {
      close();
    }
  }

  //
  // Inline sleep timer function. Delay in ms.
  //
  sleep(delay) {
    return new Promise(resolve => {
      setTimeout(resolve, delay);
    });
  }

  //
  // Enable service worker for PWA.
  // Pulled from Google docs about service workers.
  //
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
}

const Base_Obj = new BaseLogic();
