'use strict';

/*
/* Class to hold functions for interacting with backend API endpoints.
*/

class ApiFuncts {
  constructor() {
    this.feedbackTimer = null;
    // Cache all  business results from user clicking details buttons.
    this.business_results_cache = {};

    // Current business data for adding business to mission.
    // This data gets updated with each press of add to mission button.
    this.missionBtnBusinessData = null;

    this.addLikeMissionListener();
    this.addLikeReportListener();
    this.addMissionListener();
    this.addDetailsListener();
    this.addMissionBtnDataCacheListener();
    this.addBusinessToMisionListener();
    this.addCreateNewMissionListener();
    // Turn on toasts.
    $('.toast').toast();
  }

  //
  // Like Mission functionality. Call API, upon success
  // toggle like icon.
  //
  addLikeMissionListener() {
    $('main').on('click', '.like-mission', async function (e) {
      e.preventDefault();
      const mission_id = $(this).data('mission_id');

      try {
        var resp = await axios.post(`/v1/mission/like/${mission_id}`);
      } catch (err) {
        // jcb - in many of my projects, I wrap the calls to Sentry (or other third party logging) in my own logging javascript file
        // This allows adding common data like "user" to every message logged or the ability to switch out third party loggers
        Sentry.captureException(err);
        return;
      }
      if (!resp || resp.data.error) {
        // jcb - Consider passing response error in Additional Data to Sentry
        Sentry.captureMessage(
          'Something went wrong: api_functs.addLikeMissionListener'
        );
        return;
      }

      if (resp.data.success) {
        // toggle solid/outline thumbs up icons.
        $(this)
          .children()
          .children()
          .each(function () {
            $(this).toggle();
          });
        $(this).next().text(resp.data.likes);
      }
    });
  }

  //
  // Like Report functionality. Call API, upon success
  // toggle like icon.
  //
  addLikeReportListener() {
    const this_ = this;
    $('main').on('click', '.like-report', async function (e) {
      e.preventDefault();
      const report_id = $(this).data('report_id');
      const business_id = $(this).data('business_id');

      try {
        var resp = await axios.post(`/v1/report/like/${report_id}`);
      } catch (err) {
        Sentry.captureException(err);
        return;
      }
      if (!resp || resp.data.error) {
        Sentry.captureMessage(
          'Something went wrong: api_functs.addLikeReportListener'
        );
        return;
      }
      if (resp.data.success) {
        // There will only be business_id data from business report like button.
        // If there's cached business data for the detail modal.
        if (business_id && this_.business_results_cache[business_id]) {
          //  Update the liked attribute for this report.
          this_.business_results_cache[business_id].data.reports.forEach(
            report => {
              if (report_id === report.report_id) {
                report.liked = !report.liked;
                report.likes = resp.data.likes;
              }
            }
          );
        }
        // Like buttons that will need their state updated.
        const like_btns = [$(this)];

        // If like button was in a business detail modal.
        if ($(this).hasClass('likeModal')) {
          // If there are any cards on the page for this report we need
          // to update their like button states as well. Add like button to like_btns.
          const $reportCard = $(`div.reportCard[data-id="${report_id}"]`);
          if ($reportCard) like_btns.push($reportCard.find('.like-report'));
        }
        like_btns.forEach($el => {
          // toggle solid/outline thumbs up icons.
          $el
            .children()
            .children()
            .each(function (idx) {
              $(this).toggle();
            });
          // Update number of likes.
          $el.next().text(resp.data.likes);
        });
      }
    });
  }

  //
  // Add mission to user missions functionality.
  //
  addMissionListener() {
    const this_ = this;
    $('.add-mission').on('click', async function (e) {
      e.preventDefault();
      const mission_id = $(this).data('mission_id');
      try {
        var resp = await axios.post(`/v1/add_mission/${mission_id}`);
      } catch (err) {
        Sentry.captureException(err);
        return;
      }
      if (!resp || resp.data.error) {
        Sentry.captureMessage(
          'Something went wrong: api_functs.addMissionListener'
        );
        return;
      }

      $('.toasts-zone').html('');

      if (resp.data.success) {
        this_.showToast(resp.data.success);
      }
    });
  }

  addDetailsListener() {
    $('main').on(
      'click',
      '.detailsBtn',
      this.getShowBusinessDetails.bind(this)
    );
  }
  /*
  /* Get business details from yelp and show details modal.
  */
  async getShowBusinessDetails(e) {
    $('.spinner-zone').show();
    let business_result_data;

    const business_id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const latlng = e.currentTarget.dataset.latlng;

    const cachedData = this.business_results_cache[business_id];
    // Use cached data if data and data is less than 10 minutes old.
    if (cachedData && new Date().getTime() - cachedData.timestamp < 600000)
      business_result_data = cachedData.data;
    else {
      try {
        var resp = await axios.get(`/v1/business_detail/${business_id}`, {
          params: { name, latlng },
        });
      } catch (err) {
        Sentry.captureException(err);
        $('.spinner-zone').hide();
        alert('Yelp Api Error. Please try again. E1');
        return;
      }
      if (!resp || resp.data.error) {
        Sentry.captureMessage(
          `Something went wrong: api_functs.getShowBusinessDetails. ${
            resp ? resp.data.error : ''
          }`
        );
        $('.spinner-zone').hide();
        alert('Yelp Api Error. Please try again. E2');
        return;
      }
      business_result_data = resp.data;
      this.business_results_cache[business_id] = {
        data: business_result_data,
        timestamp: new Date().getTime(),
      };
    }
    $('.spinner-zone').hide();
    this.showDetailModal(business_result_data);
  }

  //*
  /*  Update detail modal with business data and show.
   */
  showDetailModal(data) {
    $('#business-detail-modal').html(
      CardsModalsFactoryObj.makeDetailModal(data)
    );
    $('#business-detail-modal').modal().show();
    $('.carousel').carousel();
  }

  /*
  /* Add-to-mission button sets card business_data to obj which
  /* may be needed to create a new business in the database.
  */
  addMissionBtnDataCacheListener() {
    const this_ = this;
    $('main').on('click', '.mission-btn', function () {
      this_.cacheMissionBtnData($(this));
    });
  }

  cacheMissionBtnData(missionBtn) {
    let data = {};

    data.id = missionBtn.data('id');
    data.name = missionBtn.data('name');
    data.city = missionBtn.data('city');
    data.state = missionBtn.data('state');
    data.country = missionBtn.data('country');
    data.longitude = missionBtn.data('lng');
    data.latitude = missionBtn.data('lat');

    this.missionBtnBusinessData = data;
  }

  /*
  /* Add business to mission fuctionality.
  */
  addBusinessToMisionListener() {
    const this_ = this;
    $('#mission-choices-form').submit(async function (e) {
      e.preventDefault();
      clearTimeout(this.feedbackTimer);

      const mission_id = $('#mission-choices-form #mission-select').val();
      if (!mission_id) {
        $('#mission-choices .feedback').html(
          `Create New Mission <i class="fas fa-hand-point-right fa-lg ml-1"></i>`
        );
        return;
      }
      try {
        var resp = await axios.post(
          `/v1/mission/add_business/${mission_id}`,
          this_.missionBtnBusinessData
        );
      } catch (err) {
        $('#mission-choices .feedback').html(
          '<p class="text-danger">Error</p>'
        );
        Sentry.captureException(err);
        return;
      }
      if (!resp || resp.data.error) {
        $('#mission-choices .feedback').html(
          '<p class="text-warning">Error</p>'
        );
        Sentry.captureMessage(
          'Something went wrong: api_functs.addBusinessToMisionListener'
        );
        return;
      }
      const {
        data: { success, color },
      } = resp;

      if (success) {
        $('#mission-choices .feedback').html(
          `<p class="txt-${color}">${success}</p>`
        );
        this.feedbackTimer = setTimeout(() => {
          $('#mission-choices .feedback').html('');
        }, 2000);
        // MissionControlObj  needs to know when businesses ared added to missions.
        if (success === 'Added!' && typeof MissionControlObj !== 'undefined')
          MissionControlObj.businessAddedToMission(mission_id);
      }
    });
  }

  /*
  /* When user clicks create new mission in add to mission modal 
  /* make a new business record in database if necesarry.
  /* Then redirect to mission-control with create parameter to initiate
  /* creating a new mission and adding current business to that mission.
  */
  addCreateNewMissionListener() {
    $('.createMission').click(
      async function (e) {
        e.preventDefault();

        try {
          var resp = await axios.post(
            `/v1/business`,
            this.missionBtnBusinessData
          );
        } catch (err) {
          $('#mission-choices .feedback').html(
            '<p class="text-danger">Error</p>'
          );
          Sentry.captureException(err);
          return;
        }
        if (!resp || resp.data.error) {
          $('#mission-choices .feedback').html(
            '<p class="text-warning">Error</p>'
          );
          Sentry.captureMessage(
            'Something went wrong: api_functs.addBusinessToMisionListener'
          );
          return;
        }

        window.location.href = `/mission-control?create_id=${this.missionBtnBusinessData.id}`;
      }.bind(this)
    );
  }

  // Show toast message functionality.
  showToast(message) {
    $('.toasts-zone').prepend(
      `<div class="toast bg-dark text-light" role="alert" aria-live="assertive" aria-atomic="true"
      data-delay="5000" >
        <div class="toast-header bg-dark text-light">
          <strong class="mr-auto">Updated!</strong>
          <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="toast-body">
        ${message}
        </div>
      </div>`
    );
    $('.toast').toast('show');
  }
}

const ApiFunctsObj = new ApiFuncts();
