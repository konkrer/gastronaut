'use strict';

class MissionControlHtmFactory {
  constructor() {}

  //
  // Create html for mission editing form or for mission information display
  // depending if user is editor of loaded mission.
  //
  fillForm(missionData) {
    const {
      id,
      editor,
      name,
      username,
      description,
      is_public,
      city,
      state,
      country,
    } = missionData;
    const html = `
      <a class="font-weight-bold " 
        data-toggle="collapse" href="#mission-form" 
        role="button" aria-expanded="false" aria-controls="mission-form">
        <div  class="text-warning hoverBlue">
          <span class="panel-toggle pt-1 rounded-right">
            ${editor ? 'Edit Details ' : 'Details '}
          <i class="fas fa-caret-down fa-xs text-dark ml-2"></i>
          </span>
        </div>
      </a>
      <form id="mission-form" class="collapse bg-dark p-4 m-2">
        <input type="hidden" value="${id}" name="id" >
        ${this.makeName(editor, name, username)}          
        ${this.makeDescription(editor, description)}
        ${this.makePublic(editor, is_public)}
        ${this.makeCity(editor, city)}
        ${this.makeState(editor, state)}
        ${this.makeCountry(editor, country)}
        ${this.makeButton(editor)}
      </form>
      `;
    $('#mission-detail-panel').html(html);
  }

  //
  // Make Html for mission name for use in form or info panel.
  // Html for info panel also includes username link to profile.
  //
  makeName(editor, name, username) {
    if (editor)
      return `<div class="form-group">
                  <input type="text" value="${name}" minlength="2"
                  maxlength="50" name="name" id="name" placeholder="Name *"
                  class="form-control form-control-sm font-weight-bold" required>
                </div>`;
    return `
        <div class="txt-xl text-light font-weight-bold underline">${name}</div>
        <p class="text-light font-italic">
          <a href="/user/profile/${username}" class="txt-medium text-light orange-outline font-weight-bold">
            by @${username}
          </a>
        </p>`;
  }

  //
  // Make Html for mission description for use in form or info panel.
  //
  makeDescription(editor, description) {
    if (editor)
      return `
        <div class="form-group">
          <textarea name="description" id="description" rows="2" class="form-control form-control-sm"
          maxlength="100">${
            description ? description : 'Add a Description'
          }</textarea>
        </div>`;
    return `<p class="txt-black txt-medium">${
      description ? description : ''
    }</p>`;
  }

  //
  // Make Html for share switch for use in form.
  //
  makePublic(editor, is_public) {
    if (editor)
      return `
        <div class="custom-control custom-switch mb-2">
          <input type="checkbox" class="custom-control-input" id="share-mission" name="is_public"
          ${is_public ? 'checked="true"' : ''}>
          <label for="share-mission" class="custom-control-label txt-black">
          Share Mission</label>
        </div>`;
    return '';
  }

  //
  // Make Html for mission city for use in form or info panel.
  //
  makeCity(editor, city) {
    if (editor)
      return `
          <div class="form-group">
            <input type="text" value="${city ? city : ''}" 
            maxlength="50" name="city" id="city" placeholder="City"
            class="form-control form-control-sm">
        </div>`;
    return city ? `<span class="txt-black">${city}, </span>` : '';
  }

  //
  // Make Html for mission state for use in form or info panel.
  //
  makeState(editor, state) {
    if (editor)
      return `
          <div class="form-group">
            <input type="text" value="${state ? state : ''}" minlength="2"
            maxlength="2" name="state" id="state" placeholder="State"
            class="form-control form-control-sm">
        </div>`;
    return state ? `<span class="txt-black">${state} </span>` : '';
  }

  //
  // Make Html for mission country for use in form or info panel.
  //
  makeCountry(editor, country) {
    if (editor)
      return `
          <div class="form-group">
            <input type="text" value="${
              country !== 'XX' ? country : ''
            }"  minlength="2"
            maxlength="2" name="country" id="country" placeholder="Country *"
            class="form-control form-control-sm" required>
        </div>`;
    return `<span class="ml-1 txt-black">${
      country !== 'XX' ? country : ''
    }</span>`;
  }

  //
  // Make Html for mission edit buttons for use in form
  // or for remove mission button in info panel.
  //
  makeButton(editor) {
    if (editor)
      return `
        <div class="mt-4 btn-div">
          <span class="feedback ml-5 font-weight-bold"></span>
          <button type="button" class="btn btn-sm btn-outline-danger float-right ml-2 border-0"
          data-toggle="modal" data-target="#deleteMissionModal">Delete</button>
          <button type="submit" class="btn btn-sm btn-primary float-right"
          >Update</button>
        </div>`;
    return `
        <button type="button" class="btn btn-sm btn-outline-danger float-right border-0"
        data-toggle="modal" data-target="#removeMissionModal">Remove</button>`;
  }

  //
  // Show like button and allow liking for imported missions.
  //
  showLikes(data) {
    const icon = data.user_liked
      ? '<i class="fas fa-thumbs-up fa-lg mr-1"></i><i class="far fa-thumbs-up fa-lg mr-1" style="display: none;"></i>'
      : '<i class="far fa-thumbs-up fa-lg mr-1"></i><i class="fas fa-thumbs-up fa-lg mr-1" style="display: none;"></i>';
    $('#likes-zone').html(`<span>${icon}</span>`);
    $('#likes-zone').next().text(data.likes);
    // if user is not editor allow liking/un-liking.
    if (!data.editor) {
      // if not editor add data-mission_id to likes-zone with user id.
      $('#likes-zone').data('mission_id', data.id);
      $('#likes-zone').addClass('like-mission');
      $('#likes-zone').addClass('hover-primary-alt2');
    } else {
      $('#likes-zone').removeClass('like-mission');
      $('#likes-zone').removeClass('hover-primary-alt2');
    }
  }

  //
  // List all mission businesses in businesses list.
  //
  listBusinesses(missionData) {
    let html = missionData.businesses.reduce((acc, el, idx) => {
      return `${acc}
          <li class="list-group-item px-2 px-lg-3 px-xl-4">
            ${el.name}
            <span class="float-right" data-id="${el.id}" data-idx="${idx}">
              <span class="mapBtn mr-2" data-toggle="tooltip" title="Show on Map" data-lng="${
                el.longitude
              }" data-lat="${el.latitude}">
                <i class="fas fa-map-marked-alt brand-outline text-warning iconBtn"></i>
              </span>
              <span class="bussinessListdetailsBtn mr-2" data-toggle="tooltip" title="Show Details">
                <i class="fas fa-clipboard-list brand-outline text-warning iconBtn"></i>
              </span>
              <span class="flagBtn mr-2" data-toggle="tooltip" title="Plant a Flag" data-name="${
                el.name
              }">
                <i class="fas fa-flag brand-outline text-warning iconBtn"></i>
              </span>
              <span data-toggle="tooltip" title="Write Report">
                <a target="_blank" href="/report?business_id=${
                  el.id
                }&cancel_url=javascript:Base_Obj.close_current_tab()">
                  <i class="fas fa-pen-alt brand-outline text-warning iconBtn"></i>
                </a>
              </span>
              ${
                missionData.mission.editor
                  ? `<span class = "removeBusinessBtn ml-2" data-toggle="tooltip" title="Remove from mission">
                      <i class="fas fa-trash-alt brand-outline text-warning iconBtn"></i>
                     </span>`
                  : ''
              }
            </span>
          </li>`;
    }, '');
    // if no businesses html is empty string - show default text.
    html = html
      ? html
      : `<li class="list-group-item px-2 px-lg-3 px-xl-4">
           <a href="/">Explore</a> and add some goals! Or check out some shared <a href="/missions">Missions!</li>`;
    // insert into DOM.
    $('#businesses-list').html(html);
  }

  //
  // Create Html for create mission form and add to mission-detail-panel.
  //
  showCreateForm(e) {
    if (e) e.preventDefault();
    const html = `
      <a class="font-weight-bold " data-toggle="collapse" href="#create-form" 
        role="button" aria-expanded="false" aria-controls="mission-form">
        <div class="hoverOpaque text-warning hoverBlue">
          <span class="panel-toggle rounded-right"
            >Create Mission<i class="fas fa-caret-down fa-xs text-dark ml-2"></i
          ></span>
        </div>
      </a>
      <form id="create-form" class="collapse show bg-dark p-4 m-2">
        <div class="form-group">
          <input type="text" value="" minlength="2"
          maxlength="50" name="name" id="name" placeholder="Name *"
          class="form-control form-control-sm" required>
        </div>          
        <div class="form-group">
          <textarea name="description" id="description" rows="2"
          class="form-control form-control-sm" maxlength="100"
          >Add a Description</textarea>
        </div>
        <div class="form-group">
            <input type="text" value="" 
            maxlength="50" name="city" id="city" placeholder="City"
            class="form-control form-control-sm">
        </div>
        <div class="form-group">
            <input type="text" value="" minlength="2"
            maxlength="2" name="state" id="state" placeholder="State"
            class="form-control form-control-sm">
        </div>
        <div class="form-group">
            <input type="text" value=""  minlength="2"
            maxlength="2" name="country" id="country" placeholder="Country *"
            class="form-control form-control-sm" required>
        </div>
        <div class="mt-4 btn-div text-right">
          <span class="feedback ml-5 font-weight-bold float-left"></span>
          <button type="button" class="cancelCreate btn btn-sm btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-sm btn-primary"
          >Create Mission</button>
        </div>
      </form>
      `;
    $('#mission-detail-panel').html(html);
  }

  //
  // Make a note to add to create mission feedback div.
  //
  makeNote(note) {
    if (note)
      return `<span class="text-warning bg-light p-2 rounded">${note}</span>`;
    return '';
  }
}
