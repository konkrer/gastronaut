'use strict';

// Basic logic common to all pages.
class BaseLogic {
  constructor() {
    this.preferencesTimer;
    this.feedbackClearTimer;
    this.addPreloaderRemover();
    this.addPreferencesListener();
    this.addAlertCloseListener();
    this.addReportsDblclickListeners();
    this.addFeedbackListener();
  }

  // Remove preloader overlay when page animations fully loaded.
  addPreloaderRemover() {
    window.onload = () => {
      $('.preloader-div').fadeOut(500);
    };
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

  /*
  /* Close Alert (flash) function.
  */
  addAlertCloseListener() {
    $('.alert-close').click(() => {
      $('.alert').remove();
    });
  }

  /*
  /* Allow double clicking reports cards to open report detail page.
  */
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

  /*
  /* Call /feedback endpoint when user submits feedback.
  */
  addFeedbackListener() {
    $('#user-feedback').submit(async function (e) {
      e.preventDefault();

      const feedback_data = {
        feedback: $(this).find('textarea[name="feedback"]').val(),
        email: $(this).find('input[type="email"]').val(),
      };
      try {
        var resp = await axios.post('/feedback', feedback_data);
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
