'use strict';

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
    var resp = await axios.post(`/like/mission/${mission_id}`);
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
    var resp = await axios.post(`/like/report/${report_id}`);
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
    var resp = await axios.post(`/add/mission/${mission_id}`);
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

// Turn on toasts.
$('.toast').toast();
