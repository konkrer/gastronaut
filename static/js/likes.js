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
