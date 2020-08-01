'use strict';

/*
/* Misson Control View interactive logic.
*/
class MissionControl {
  constructor() {
    this.missionCache = {};
    this.restMarkers = [];
    this.sidebarOpen = true;
    this.$infoCol = $('#info-col');
    this.ignoreTogglePopup = false;
    this.loadMissionListener();
    this.createMissionListener();
    this.updateListener();
    this.deleteMissionListener();
    this.removeMissionListener();
    this.businessMapListener();
    this.businessClickListener();
    this.businessDblclickListener();
    this.goalCompletedListener();
    this.removeBusinessListener();
    this.sidebarListener();
    this.mapAllListener();
    // Delay for map load.
    setTimeout(() => {
      this.checkLocalStorage();
    }, 2500);
  }

  /*
  /* Load previous mission user had loaded. 
  */
  checkLocalStorage() {
    // get list of user's missions ids from html <option> values.
    const currMissions = $('#mission-select')
      .children()
      .map(function () {
        return $(this).val();
      })
      .get();

    let lastMissionId = localStorage.getItem('currMissionId');

    if (currMissions.includes(lastMissionId)) {
      // Select <option> that matches lastMissionId in mission-select input.
      const currOption = currMissions.indexOf(lastMissionId);
      $('#mission-select').children().eq(currOption).prop('selected', true);
      //
    } else if (currMissions.length == 0) {
      $('#write-mission-report').prop('href', '#');
      return;
    } else {
      lastMissionId = currMissions[0];
      localStorage.setItem('currMissionId', lastMissionId);
    }
    this.loadMission(lastMissionId);
    if (!isMobileScreen()) $('#businesses-list').addClass('show');
  }

  loadMissionListener() {
    $('#mission-select').change(
      function (e) {
        localStorage.setItem('currMissionId', e.target.value);
        this.loadMission(e.target.value);
      }.bind(this)
    );
  }

  async loadMission(mission_id) {
    let missionData;
    if (this.missionCache[mission_id])
      missionData = this.missionCache[mission_id];
    else {
      const resp = await axios.get(`/v1/mission/${mission_id}`);
      this.missionCache[mission_id] = resp.data;
      missionData = resp.data;
    }
    this.fillForm(missionData.mission);
    this.showLikes(missionData.mission);
    this.mapBusinesses(missionData.businesses);
    this.listBusinesses(missionData);
    // make mission report <a> element point to report with current mission id.
    $('#write-mission-report').prop(
      'href',
      `/report?mission_id=${mission_id}&next=mission_control`
    );
    if (isMobileScreen()) $('#mission-select-form').removeClass('show');
  }

  fillForm(missionData) {
    const {
      id,
      editor,
      name,
      username,
      author_id,
      description,
      is_public,
      city,
      state,
      country,
    } = missionData;
    const html = `
    <a class="font-weight-bold hoverUnset" 
      data-toggle="collapse" href="#mission-form" 
      role="button" aria-expanded="false" aria-controls="mission-form">
      <div>
        <span class="panel-toggle pt-1">
          ${editor ? 'Edit Details ' : 'Details '}
        <i class="fas fa-caret-down fa-xs text-dark ml-2"></i>
        </span>
      </div>
    </a>
    <form id="mission-form" class="collapse bg-dark p-4 m-2">
      <input type="hidden" value="${id}" name="id" >
      ${this.makeName(editor, name, username, author_id)}          
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

  makeName(editor, name, username, author_id) {
    if (editor)
      return `<div class="form-group">
                <input type="text" value="${name}" minlength="2"
                maxlength="50" name="name" id="name" placeholder="Name *"
                class="form-control form-control-sm font-weight-bold" required>
              </div>`;
    return `
      <div class="txt-xl text-light font-weight-bold underline">${name}</div>
      <p class="text-light font-italic">
        <a href="/user/profile/${author_id}" class="txt-medium text-light orange-outline font-weight-bold">
          by @${username}
        </a>
      </p>`;
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
    return `<p class="txt-black txt-medium">${
      description ? description : ''
    }</p>`;
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
    return city ? `<span class="txt-black">${city}, </span>` : '';
  }

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

  showLikes(data) {
    const icon = data.user_liked
      ? '<i class="fas fa-thumbs-up fa-lg mr-1"></i><i class="far fa-thumbs-up fa-lg mr-1" style="display: none;"></i>'
      : '<i class="far fa-thumbs-up fa-lg mr-1"></i><i class="fas fa-thumbs-up fa-lg mr-1" style="display: none;"></i>';
    $('#likes-zone').html(`<span>${icon}</span>`);
    $('#likes-zone').next().text(data.likes);
    // if user is not editor allow liking/unliking.
    if (!data.editor) {
      // if not editor add data-mission_id to liks-zone with user id.
      $('#likes-zone').data('mission_id', data.id);
      $('#likes-zone').addClass('like-mission');
      $('#likes-zone').addClass('hover-primary-alt2');
    } else {
      $('#likes-zone').removeClass('like-mission');
      $('#likes-zone').removeClass('hover-primary-alt2');
    }
  }

  mapBusinesses(businesses) {
    clearMapArray(this.restMarkers);
    if (businesses.length == 0) return;
    this.restMarkers = mapArrayAndFitBounds(businesses);
  }

  listBusinesses(missionData) {
    let html = missionData.businesses.reduce((acc, el, idx) => {
      return `${acc}
        <li class="list-group-item px-2 px-lg-3 px-xl-4">
          ${el.name}
          <span class="float-right" data-id="${el.id}" data-idx="${idx}">
            <span class="detailsBtn mr-2" data-toggle="tooltip" title="Show Details" data-id="${
              el.id
            }">
              <i class="fas fa-clipboard-list brand-outline txt-orange iconBtn"></i>
            </span>
            <span class="mapBtn mr-2" data-toggle="tooltip" title="Show on Map" data-lng="${
              el.longitude
            }" data-lat="${el.latitude}">
              <i class="fas fa-map-marked-alt brand-outline txt-orange iconBtn"></i>
            </span>
            <span class="flagBtn mr-2" data-toggle="tooltip" title="Plant a Flag" data-name="${
              el.name
            }">
              <i class="fas fa-flag brand-outline txt-orange iconBtn"></i>
            </span>
            <span data-toggle="tooltip" title="Write Report">
              <a href="/report?business_id=${el.id}&next=mission_control">
                <i class="fas fa-pen-alt brand-outline txt-orange iconBtn"></i>
              </a>
            </span>
            ${
              missionData.mission.editor
                ? `<span class = "removeBusinessBtn ml-2" data-toggle="tooltip" title="Remove from mission">
                    <i class="fas fa-trash-alt brand-outline txt-orange iconBtn"></i>
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
         <a href="/">Explore</a> and add some goals!</li>`;
    // insert into DOM.
    $('#businesses-list').html(html);
  }

  // Create new mission button listener
  createMissionListener() {
    $('#create-mission-btn').on('click', this.showCreateForm);
    this.$infoCol.on('submit', '#create-form', this.createMission.bind(this));
  }

  showCreateForm(e) {
    e.preventDefault();
    const html = `
    <a class="text-success font-weight-bold hoverUnset" data-toggle="collapse" href="#create-form" 
      role="button" aria-expanded="false" aria-controls="mission-form">
      <div>
        <span class="panel-toggle"
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
      <div class="mt-4 btn-div">
        <span class="feedback ml-5 font-weight-bold"></span>
        <button type="submit" class="btn btn-sm btn-primary float-right"
        >Create Mission</button>
      </div>
    </form>
    `;
    $('#mission-detail-panel').html(html);
  }

  // Call create mission API endpoint.
  // Update DOM with new <option> for new mission.
  // Load new mission.
  async createMission(e) {
    e.preventDefault();

    const formData = $('#create-form').serializeArray();
    const f_d = convertDataArrayToObj(formData);

    // Don't pass default textarea content 'Add a Description' to backend.
    f_d.description =
      f_d.description == 'Add a Description' ? '' : f_d.description;

    try {
      var resp = await axios.post(`/v1/mission`, f_d);
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
        `<span class="text-danger">${resp.data.error}</span>`
      );
      return;
    }
    $('.toasts-zone').html('');
    if (resp.data.success) {
      $('#mission-detail-panel').html('');
      const mission = resp.data.mission;
      // update mission-select with new <option>.
      $('#mission-select').append(
        $(`<option value="${mission.id}">${mission.name}</option>`)
      );
      localStorage.setItem('currMissionId', mission.id);
      clearMapArray(this.restMarkers);
      this.restMarkers = [];
      this.checkLocalStorage();
      ApiFunctsObj.showToast(resp.data.success);
    }
  }

  // Listen for mission-form being submitted.
  // Call mission update endpoint.
  // Provide feedback and update mission-select <option> text.
  updateListener() {
    this.$infoCol.on(
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
          var resp = await axios.put(`/v1/mission`, f_d);
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
            `<span class="text-success bg-light p-2 rounded">Updated!</span>
            ${this.makeNote(resp.data.note)}`
          );
          this.missionCache[f_d.id].mission = resp.data.mission;
          // update mission-select text.
          $('#mission-select-form #mission-select option').each(function () {
            // if <option> is for edited mission update name text.
            if ($(this).val() === f_d.id) $(this).text(f_d.name);
          });
        }
        // remove feedback text.
        setTimeout(() => $('#mission-form .feedback').html(''), 4000);
      }.bind(this)
    );
  }

  makeNote(note) {
    if (note)
      return `<span class="text-warning bg-light p-2 rounded">${note}</span>`;
    return '';
  }

  // Listen for mission-form delete button being clicked.
  // Call mission delete endpoint.
  // Update mission-select <option> text.
  deleteMissionListener() {
    $('#deleteMissionModal').on(
      'submit',
      'form',
      async function (e) {
        e.preventDefault();

        const mission_id = $('#mission-form input[name="id"]').val();

        try {
          var resp = await axios.delete(`/v1/mission/${mission_id}`);
        } catch (error) {
          // TODO: sentry log error
          return;
        }
        if (!resp || resp.data.error) {
          // TODO: sentry log error
          return;
        }
        $('.toasts-zone').html('');
        if (resp.data.success) {
          $('#mission-select')
            .children()
            .each(function () {
              if ($(this).val() === mission_id) $(this).remove();
            });
          $('#mission-detail-panel').html('');
          $('#businesses-list').html('');
          $('#deleteMissionModal').modal('hide');
          clearMapArray(this.restMarkers);
          this.restMarkers = [];
          this.checkLocalStorage();
          ApiFunctsObj.showToast(resp.data.success);
        }
      }.bind(this)
    );
  }
  // Listen for remove mission button being clicked.
  // Call mission remove endpoint.
  // Update mission-select <option> text.
  removeMissionListener() {
    $('#removeMissionModal').on(
      'submit',
      'form',
      async function (e) {
        e.preventDefault();

        const mission_id = $('#mission-form input[name="id"]').val();

        try {
          var resp = await axios.post(`/v1/remove_mission/${mission_id}`);
        } catch (error) {
          // TODO: sentry log error
          return;
        }
        if (!resp || resp.data.error) {
          // TODO: sentry log error
          return;
        }
        $('.toasts-zone').html('');
        if (resp.data.success) {
          $('#mission-select')
            .children()
            .each(function () {
              if ($(this).val() === mission_id) $(this).remove();
            });
          $('#mission-detail-panel').html('');
          $('#businesses-list').html('');
          $('#removeMissionModal').modal('hide');
          clearMapArray(this.restMarkers);
          this.restMarkers = [];
          this.checkLocalStorage();
          ApiFunctsObj.showToast(resp.data.success);
        }
      }.bind(this)
    );
  }

  businessMapListener() {
    const this_ = this;
    this.$infoCol.on('click', '.mapBtn', function () {
      this_.businessMapper($(this));
    });
  }

  businessMapper($el) {
    const lng = $el.data('lng');
    const lat = $el.data('lat');
    const idx = $el.parent().data('idx');

    mappyBoi.flyTo({
      center: [lng, lat],
      essential: true, // this animation is considered essential with respect to prefers-reduced-motion
      zoom: 17,
    });

    const marker = this.restMarkers[idx];

    if (isMobileScreen()) $('#businesses-list').removeClass('show');
  }

  businessClickListener() {
    // Toggle business marker popup when business list-group-item is clicked.
    // Ignore if ignore flag is true.
    const this_ = this;
    this.$infoCol.on('click', '.list-group-item', function () {
      const idx = $(this).children().data('idx');
      const marker = this_.restMarkers[idx];
      if (!marker.getPopup().isOpen()) marker.togglePopup();
    });
  }

  businessDblclickListener() {
    const this_ = this;
    this.$infoCol.on('dblclick', '.list-group-item', function () {
      const fake_e = { currentTarget: $(this).find('.detailsBtn').get()[0] };
      ApiFunctsObj.getShowBusinessDetails(fake_e);
      this_.businessMapper($(this).find('.mapBtn'));
    });
  }

  goalCompletedListener() {
    const this_ = this;
    this.$infoCol.on('click', '.flagBtn', async function () {
      const data = { business_id: $(this).parent().data('id') };
      const mission_id = localStorage.getItem('currMissionId');

      try {
        var resp = await axios.post(
          `/v1/mission/goal_completed/${mission_id}`,
          data
        );
      } catch (error) {
        // TODO: sentry log error
        return;
      }
      if (!resp || resp.data.error) {
        // TODO: sentry log error
        return;
      }
      $('.toasts-zone').html('');

      const {
        data: { success },
      } = resp;

      if (success) {
        let newMarker, completed;
        const id = $(this).parent().data('id');
        const idx = $(this).parent().data('idx');
        const name = $(this).data('name');
        const html = `<span class="detailsBtn marker-html" data-id="${id}">
                    <b><em>${name}</em></b></span>`;
        // get marker for this business
        const marker = M_C.restMarkers[idx];
        const { lng, lat } = marker._lngLat;
        marker.remove();
        if (success === 'Goal Completed!') {
          // add flag marker
          newMarker = addFlagMarker([lng, lat], html);
          completed = true;
        } else {
          // add regular marker
          newMarker = addMarker([lng, lat], html);
          completed = false;
        }
        // newMarker.togglePopup();
        // put new marker in restMarkers array in spot of old marker
        this_.restMarkers.splice(idx, 1, newMarker);
        // update mission cache that this business was/wasn't completed
        this_.missionCache[mission_id].businesses[idx].completed = completed;

        ApiFunctsObj.showToast(`<div>${success}</div><div>- ${name}</div>`);
      }
    });
  }

  removeBusinessListener() {
    const this_ = this;
    this.$infoCol.on('click', '.removeBusinessBtn', async function () {
      const data = { business_id: $(this).parent().data('id') };
      const mission_id = localStorage.getItem('currMissionId');

      try {
        var resp = await axios.post(
          `/v1/mission/remove_business/${mission_id}`,
          data
        );
      } catch (error) {
        // TODO: sentry log error
        return;
      }
      if (!resp || resp.data.error) {
        // TODO: sentry log error
        return;
      }

      $('.toasts-zone').html('');

      if (resp.data.success) {
        const idx = $(this).parent().data('idx');
        const name = $(this).prevAll('.flagBtn').data('name');
        // remove business from cache and reload mission.
        this_.missionCache[mission_id].businesses.splice(idx, 1);
        this_.loadMission(mission_id);

        ApiFunctsObj.showToast(
          `<div>${resp.data.success}</div><div>- ${name}</div>`
        );
      }
    });
  }

  sidebarListener() {
    $('.sidebar-toggle-btn').click(
      function () {
        // Toggle sidebar.
        // Note: Sidebar does not start with sidebarExpand class to avoid animation on load.
        if (this.sidebarOpen === true) {
          this.$infoCol
            .addClass('sidebarCollapse')
            .removeClass('sidebarExpand');
        } else {
          this.$infoCol.toggleClass(['sidebarExpand', 'sidebarCollapse']);
        }
        this.sidebarOpen = !this.sidebarOpen;
        // Flip left/right arrows.
        $('.arrow-wrapper')
          .children()
          .each(function () {
            $(this).toggleClass('d-none');
          });
      }.bind(this)
    );
  }

  businessAddedToMission(mission_id) {
    // When user adds a business to another mission delete mission cache
    // for the altered mission to force API call for new data when needed.
    // The added business will then be present.
    delete this.missionCache[mission_id];
  }

  mapAllListener() {
    $('.mapAll').click(
      function () {
        const missionId = localStorage.getItem('currMissionId');
        const businesses = this.missionCache[missionId].businesses;
        if (businesses) fitBoundsList(businesses);
        $('#businesses-list').removeClass('show');
        if (isMobileScreen()) $('#mission-select-form').removeClass('show');
      }.bind(this)
    );
  }
}

const M_C = new MissionControl();
