'use strict';

const bussiness_results_cache = {};

$('.like-mission').on('click', function (e) {
  e.preventDefault();
  likeMission($(this));
});

//
// Like Mission functionality. Call API, upon success
// toggle like icon.
//
async function likeMission($el) {
  const mission_id = $el.data('mission_id');

  try {
    var resp = await axios.post(`/v1/mission/like${mission_id}`);
  } catch (error) {
    return;
  }

  if (resp.data.success) {
    $el
      .children()
      .children()
      .each(function (idx) {
        $(this).toggle();
      });
    $el.next().text(resp.data.likes);
  }
}

$('.like-report').on('click', function (e) {
  e.preventDefault();
  likeReport($(this));
});

//
// Like Report functionality. Call API, upon success
// toggle like icon.
//
async function likeReport($el) {
  const report_id = $el.data('report_id');

  try {
    var resp = await axios.post(`/v1/report/like${report_id}`);
  } catch (error) {
    return;
  }

  if (resp.data.success) {
    $el
      .children()
      .children()
      .each(function (idx) {
        $(this).toggle();
      });
    $el.next().text(resp.data.likes);
  }
}

$('.add-mission').on('click', function (e) {
  e.preventDefault();
  addMission($(this));
});

//
// Like Report functionality. Call API, upon success
// toggle like icon.
//
async function addMission($el) {
  const mission_id = $el.data('mission_id');

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
  }
  $('.toast').toast('show');
}

/*
/* Bussiness detail functionality
*/
$('.card').on('click', '.detailsBtn', getShowBusinessDetails);

/*
/* Get business details from yelp and show details modal.
*/
async function getShowBusinessDetails() {
  $('.spinner-zone').show();
  let business_result_data;

  const business_id = $(this).data('id');

  if (bussiness_results_cache[business_id])
    business_result_data = bussiness_results_cache[business_id];
  else {
    try {
      var resp = await axios.get(`/v1/business_detail/${business_id}`);
    } catch (error) {
      // TODO: sentry log error
    }
    if (!resp || resp.data.error) {
      // TODO: sentry log error
      return;
    }
    business_result_data = resp.data;
    bussiness_results_cache[business_id] = business_result_data;
  }
  $('.spinner-zone').hide();
  showDetailModal(business_result_data);
}

/* 
/*  Update detail modal with business data and show.
*/
function showDetailModal(data) {
  $('#business-detail-modal').html(makeDetailModal(data));
  $('#business-detail-modal').modal().show();
  setTimeout(() => {
    $('.carousel').carousel();
  }, 100);
}

// Turn on toasts.
$('.toast').toast();
