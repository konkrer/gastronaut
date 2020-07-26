'use strict';

class ApiFuncts {
  constructor() {
    this.business_results_cache = {};

    $('.like-mission').on('click', this.likeMission);
    $('.like-report').on('click', this.likeReport);
    $('.add-mission').on('click', this.addMission);
    $('.card').on(
      'click',
      '.detailsBtn',
      this.getShowBusinessDetails.bind(this)
    );
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
        .each(function (idx) {
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

    const business_id = e.target.dataset.id;

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

  /* 
  /*  Update detail modal with business data and show.
  */
  showDetailModal(data) {
    $('#business-detail-modal').html(makeDetailModal(data));
    $('#business-detail-modal').modal().show();
    setTimeout(() => {
      $('.carousel').carousel();
    }, 100);
  }
}

const ApiFunctsObj = new ApiFuncts();
