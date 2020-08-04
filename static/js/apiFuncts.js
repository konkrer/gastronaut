'use strict';

/*
/* Class to hold functions for interacting with backend API endpoints.
*/

class ApiFuncts {
  constructor() {
    // Cache all  business results from user clicking details buttons.
    this.business_results_cache = {};

    // Current business data for adding business to mission.
    // This data gets updated with each press of add to mission button.
    this.mission_btn_business_data = null;

    this.addLikeMissionListener();
    this.addLikeReportListener();
    this.addMissionListener();
    this.addDetailsListener();
    this.addBusinessToMisionListener();
    this.missionBtnDataCacheListener();
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
        var resp = await axios.post(`/v1/mission/like${mission_id}`);
      } catch (err) {
        Sentry.captureException(err);
        return;
      }
      if (!resp || resp.data.error) {
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
        var resp = await axios.post(`/v1/report/like${report_id}`);
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
        // toggle solid/outline thumbs up icons.
        $(this)
          .children()
          .children()
          .each(function (idx) {
            $(this).toggle();
          });
        $(this).next().text(resp.data.likes);
        // For modal like button.
        // There will only be business_id data from modal like-button.
        // If there's cache data update liked attribute.
        if (business_id && this_.business_results_cache[business_id]) {
          this_.business_results_cache[business_id].reports.forEach(report => {
            if (report_id === report.report_id) report.liked = !report.liked;
          });
        }
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

    if (this.business_results_cache[business_id])
      business_result_data = this.business_results_cache[business_id];
    else {
      try {
        var resp = await axios.get(`/v1/business_detail/${business_id}`);
      } catch (err) {
        Sentry.captureException(err);
        $('.spinner-zone').hide();
        return;
      }
      if (!resp || resp.data.error) {
        Sentry.captureMessage(
          'Something went wrong: api_functs.getShowBusinessDetails'
        );
        $('.spinner-zone').hide();
        return;
      }
      business_result_data = resp.data;
      this.business_results_cache[business_id] = business_result_data;
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
  /* Add-to-mission button sets card business_data to variable.
  */
  missionBtnDataCacheListener() {
    const this_ = this;
    $('main').on('click', '.mission-btn', function (e) {
      let data = {};

      data.id = $(this).data('id');
      data.name = $(this).data('name');
      data.city = $(this).data('city');
      data.state = $(this).data('state');
      data.country = $(this).data('country');
      data.longitude = $(this).data('lng');
      data.latitude = $(this).data('lat');

      this_.mission_btn_business_data = data;
    });
  }

  /*
  /* Add business to mission fuctionality.
  */
  addBusinessToMisionListener() {
    const this_ = this;
    $('#mission-choices-form').submit(async function (e) {
      e.preventDefault();

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
          this_.mission_btn_business_data
        );
      } catch (err) {
        $('#mission-choices .feedback').text('Error');
        Sentry.captureException(err);
        $('.spinner-zone').hide();
        return;
      }
      if (!resp || resp.data.error) {
        $('#mission-choices .feedback').text('Error');
        Sentry.captureMessage(
          'Something went wrong: api_functs.addBusinessToMisionListener'
        );
        $('.spinner-zone').hide();
        return;
      }
      const {
        data: { success },
      } = resp;

      if (success) {
        $('#mission-choices .feedback').text(success);
        setTimeout(() => {
          $('#mission-choices .feedback').text('');
        }, 2000);
        // MissionControlObj  needs to know when businesses ared added to missions.
        if (success === 'Added!' && typeof MissionControlObj !== 'undefined')
          MissionControlObj.businessAddedToMission(mission_id);
      }
    });
  }

  // Show toast message fuctionality.
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
