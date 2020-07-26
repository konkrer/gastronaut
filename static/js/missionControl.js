'use strict';

/*
/* Misson Control View interactive logic.
*/
class MissionControl {
  constructor() {
    this.mission_cache = {};
    this.restMarkers = [];
    this.likeListener = null;
    this.checkLocalStorage();
    this.updateListener();

    $('#mission-select').change(this.loadMissionEventRelay.bind(this));
  }

  /*
    /* Load previous mission user had loaded. 
    */
  checkLocalStorage() {
    // get list of mission ids of user's missions from html
    const missions = $('#mission-select')
      .children()
      .map(function () {
        return $(this).val();
      })
      .get();

    let lastMission = localStorage.getItem('currMission');
    // if last mission not in current missions and user has missions
    // select the first mission as current mission.
    if (!missions.includes(lastMission) && missions.length > 0) {
      lastMission = missions[0];
      localStorage.setItem('currMission', lastMission);
    } else if (missions.length == 0) return;
    else {
      // Select current mission option in mission-select input.
      const currOption = missions.indexOf(lastMission);
      $('#mission-select').children().eq(currOption).prop('selected', true);
    }
    // Delay to allow map to hopefully fully load.
    setTimeout(() => {
      this.loadMission(lastMission);
    }, 2500);
  }

  loadMissionEventRelay(e) {
    localStorage.setItem('currMission', e.target.value);
    this.loadMission(e.target.value);
  }

  async loadMission(mission_id) {
    let missionData;
    if (this.mission_cache[mission_id])
      missionData = this.mission_cache[mission_id];
    else {
      const resp = await axios.get(`/v1/mission/${mission_id}`);
      this.mission_cache[mission_id] = resp.data;
      missionData = resp.data;
    }
    this.fillForm(missionData.mission);
    this.showLikes(missionData.mission);
    this.mapBusinesses(missionData.businesses);
  }

  fillForm(missionData) {
    const {
      id,
      editor,
      name,
      description,
      is_public,
      city,
      state,
      country,
    } = missionData;
    const html = `
    <a class="txt-orange" data-toggle="collapse" href="#mission-form" 
      role="button" aria-expanded="false" aria-controls="mission-form">
      ${editor ? 'Edit Details ' : 'Details '} 
      <i class="fas fa-caret-down fa-xs text-dark ml-2"></i>
    </a>
    <form id="mission-form" class="collapse bg-dark p-4">
      <input type="hidden" value="${id}" name="id" >
      ${this.makeName(editor, name)}          
      ${this.makeDescription(editor, description)}
      ${this.makePublic(editor, is_public)}
      ${this.makeCity(editor, city)}
      ${this.makeState(editor, state)}
      ${this.makeCountry(editor, country)}
      ${this.makeButton(editor)}
    </form>
    `;
    $('#mission-panel').html(html);
  }

  makeName(editor, name) {
    if (editor)
      return `<div class="form-group">
                <input type="text" value="${name}" minlength="2"
                maxlength="50" name="name" id="name" placeholder="Name *"
                class="form-control form-control-sm" required>
              </div>`;
    return `<p class="txt-lg txt-purp font-weight-bold underline">${
      name ? name : ''
    }</p>`;
  }

  makeDescription(editor, description) {
    if (editor)
      return `
      <div class="form-group">
        <textarea name="description" id="description" rows="2" class="form-control form-control-sm"
        maxlength="100">${
          description ? description : 'Add a Description'
        }</textarea>
      </div>`;
    return `<p>${description ? description : ''}</p>`;
  }

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

  makeCity(editor, city) {
    if (editor)
      return `
        <div class="form-group">
          <input type="text" value="${city ? city : ''}" 
          maxlength="50" name="city" id="city" placeholder="City"
          class="form-control form-control-sm">
      </div>`;
    return city ? `<span>${city}, </span>` : '';
  }

  makeState(editor, state) {
    if (editor)
      return `
        <div class="form-group">
          <input type="text" value="${state ? state : ''}" minlength="2"
          maxlength="2" name="state" id="state" placeholder="State"
          class="form-control form-control-sm">
      </div>`;
    return state ? `<span>${state} </span>` : '';
  }

  makeCountry(editor, country) {
    if (editor)
      return `
        <div class="form-group">
          <input type="text" value="${country ? country : ''}"  minlength="2"
          maxlength="2" name="country" id="country" placeholder="Country *"
          class="form-control form-control-sm" required>
      </div>`;
    return country ? `<span class="ml-1">${country}</span>` : '';
  }

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
    return '';
  }

  showLikes(data) {
    const icon = data.user_liked
      ? '<i class="fas fa-thumbs-up mr-1"></i><i class="far fa-thumbs-up mr-1" style="display: none;"></i>'
      : '<i class="far fa-thumbs-up mr-1"></i><i class="fas fa-thumbs-up mr-1" style="display: none;"></i>';
    $('#likes-zone').html(`<span>${icon}</span>`);
    $('#likes-zone').next().text(data.likes);
    // if user is not editor allow liking/unliking.
    if (!data.editor) {
      $('#likes-zone').data('mission_id', data.id);

      this.likeListener = $('#likes-zone').on(
        'click',
        ApiFunctsObj.likeMission
      );
    } else if (this.likeListener) this.likeListener.off();
  }

  mapBusinesses(businesses) {
    if (businesses.length == 0) return;
    clearMapArray(this.restMarkers);
    this.restMarkers = mapArrayAndFitBounds(businesses);
  }

  // Listen for mission-form being submitted.
  // Call mission update endpoint.
  // Provide feedback and update mission-select <option> text.
  updateListener() {
    $('.info-col').on(
      'submit',
      '#mission-form',
      async function (e) {
        e.preventDefault();

        const formData = $('#mission-form').serializeArray();
        const f_d = convertDataArrayToObj(formData);

        // Don't pass default textarea content 'Add a Description' to backend.
        f_d.description =
          f_d.description == 'Add a Description' ? '' : f_d.description;

        try {
          var resp = await axios.post(`/mission`, f_d);
        } catch (error) {
          // TODO: sentry log error
          $('#mission-form .feedback').html(
            '<span class="text-danger">Error</span>'
          );
          return;
        }
        if (!resp || resp.data.error) {
          // TODO: sentry log error
          $('#mission-form .feedback').html(
            '<span class="text-danger">Error</span>'
          );
          return;
        }
        if (resp.data.success) {
          $('#mission-form .feedback').html(
            '<span class="text-success bg-light p-2 rounded">Updated!</span>'
          );
          this.mission_cache[f_d.id].mission = resp.data.obj;
          // update mission-select text.
          $('#mission-select-form #mission-select option').each(function (idx) {
            // if <option> is for edited mission update name text.
            if ($(this).val() === f_d.id) $(this).text(f_d.name);
          });
        }

        setTimeout(() => $('#mission-form .feedback').html(''), 4000);
      }.bind(this)
    );
  }
}

const M_C = new MissionControl();
