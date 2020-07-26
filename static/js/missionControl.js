'use strict';

/*
/* Misson Control View interactive logic.
*/
class MissionControl {
  constructor() {
    this.mission_cache = {};
    this.restMarkers = [];
    this.checkLocalStorage();
    this.likeListener = null;

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
    <form id="mission-form" class="collapse bg-trans-b3 p-2">
      <input type="hidden" value="${id}" name="id" >
      ${this.makeName(editor, name)}          
      ${this.makeDescription(editor, description)}
      ${this.makePublic(editor, is_public)}
      ${this.makeCity(editor, city)}
      ${this.makeState(editor, state)}
      ${this.makeCountry(editor, country)}
    </form>
    `;
    $('#mission-panel').html(html);
  }

  makeName(editor, name) {
    if (editor)
      return `<div class="form-group">
                <input type="text" value="${name}" 
                maxlength="50" name="name" id="name" placeholder="Name"
                class="form-control form-control-sm">
              </div>`;
    return `<p>${name ? name : ''}</p>`;
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
        <input type="checkbox" class="custom-control-input" id="share-mission" ${
          is_public ? 'checked="true"' : ''
        }>
        <label for="share-mission" class="custom-control-label">Share Mission</label>
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
    return `<p>${city ? city : ''}</p>`;
  }

  makeState(editor, state) {
    if (editor)
      return `
        <div class="form-group">
          <input type="text" value="${state ? state : ''}" 
          maxlength="2" name="state" id="state" placeholder="State"
          class="form-control form-control-sm">
      </div>`;
    return `<p>${state ? state : ''}</p>`;
  }

  makeCountry(editor, country) {
    if (editor)
      return `
        <div class="form-group">
          <input type="text" value="${country ? country : ''}" 
          maxlength="2" name="country" id="country" placeholder="Country"
          class="form-control form-control-sm">
      </div>`;
    return `<p>${country ? country : ''}</p>`;
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
}

const M_C = new MissionControl();
