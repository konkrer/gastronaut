'use strict';

class ApiFuncts {
  constructor() {
    this.business_results_cache = {};
    this.mission_btn_business_data = null;

    $('.like-mission').on('click', this.likeMission);
    $('.like-report').on('click', this.likeReport);
    $('.add-mission').on('click', this.addMission);
    $('.card').on(
      'click',
      '.detailsBtn',
      this.getShowBusinessDetails.bind(this)
    );
    this.addBusinessToMisionListener();
    this.missionBtnDataCacheListener();
    // Turn on toasts.
    $('.toast').toast();
  }

  //
  // Like Mission functionality. Call API, upon success
  // toggle like icon.
  //
  async likeMission(e) {
    e.preventDefault();

    const mission_id = $(this).data('mission_id');

    try {
      var resp = await axios.post(`/v1/mission/like${mission_id}`);
    } catch (error) {
      return;
    }

    if (resp.data.success) {
      $(this)
        .children()
        .children()
        .each(function () {
          $(this).toggle();
        });
      $(this).next().text(resp.data.likes);
    }
  }

  //
  // Like Report functionality. Call API, upon success
  // toggle like icon.
  //
  async likeReport(e) {
    e.preventDefault();
    const report_id = $(this).data('report_id');

    try {
      var resp = await axios.post(`/v1/report/like${report_id}`);
    } catch (error) {
      return;
    }

    if (resp.data.success) {
      $(this)
        .children()
        .children()
        .each(function (idx) {
          $(this).toggle();
        });
      $(this).next().text(resp.data.likes);
    }
  }

  //
  // Add mission to user missions functionality.
  //
  async addMission(e) {
    e.preventDefault();
    const mission_id = $(this).data('mission_id');

    try {
      var resp = await axios.post(`/v1/add_mission/${mission_id}`);
    } catch (error) {
      return;
    }

    $('.toasts-zone').html('');

    if (resp.data.success) {
      $('.toasts-zone').prepend(
        `<div class="toast bg-dark text-light" role="alert" aria-live="assertive" aria-atomic="true"
        data-delay="4000" >
          <div class="toast-header bg-dark text-light">
            <strong class="mr-auto">Updated!</strong>
            <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="toast-body">
          ${resp.data.success}
          </div>
        </div>`
      );
      $('.toast').toast('show');
    }
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
      } catch (error) {
        // TODO: sentry log error
        $('.spinner-zone').hide();
        return;
      }
      if (!resp || resp.data.error) {
        // TODO: sentry log error
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
  showDetailModal(data, longitude, latitude) {
    $('#business-detail-modal').html(
      makeDetailModal(data, longitude, latitude)
    );
    $('#business-detail-modal').modal().show();
    setTimeout(() => {
      $('.carousel').carousel();
    }, 100);
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
          `v1/mission/add_business/${mission_id}`,
          this_.mission_btn_business_data
        );
      } catch (error) {
        // TODO: sentry log error
        $('#mission-choices .feedback').text('Error');
        return;
      }

      if (resp.data.success) {
        $('#mission-choices .feedback').text(resp.data.success);
        setTimeout(() => {
          $('#mission-choices .feedback').text('');
        }, 2000);
      }
    });
  }
}

const ApiFunctsObj = new ApiFuncts();
