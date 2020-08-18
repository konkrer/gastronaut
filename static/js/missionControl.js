'use strict';

/*
/* Misson Control View interactive logic.
*/
class MissionControl {
  constructor() {
    this.missionCache = {};
    this.sidebarOpen = true;
    this.$infoCol = $('#info-col');
    this.addLoadMissionListener();
    this.addCreateMissionListener();
    this.addCancelCreateMissionListener();
    this.addUpdateListener();
    this.addDeleteMissionListener();
    this.addRemoveMissionListener();
    this.addDetailsListenerBlocker();
    this.addBusinessMapListener();
    this.addBusinessClickListener();
    this.addBusinessDblclickListener();
    this.addGoalCompletedListener();
    this.addRemoveBusinessListener();
    this.addSidebarListener();
    this.addMapAllListener();
    // Delay for map load.
    setTimeout(() => {
      this.checkLocalStorage();
    }, 2000);
    // Set user marker to be purple for better visual differentiation.
    Map_Obj.userMarkerStyle = 1;
  }

  /*
  /* Load previous mission user had loaded. 
  */
  checkLocalStorage() {
    // get list of user's missions ids from html <option> values.
    const currMissions = $('#mission-load-select')
      .children()
      .map(function () {
        return $(this).val();
      })
      .get();

    let lastMissionId = localStorage.getItem('currMissionId');

    if (currMissions.includes(lastMissionId)) {
      // Select <option> that matches lastMissionId in mission-load-select input.
      const currOption = currMissions.indexOf(lastMissionId);
      $('#mission-load-select')
        .children()
        .eq(currOption)
        .prop('selected', true);
      //
    } else if (currMissions.length == 0) {
      $('#write-mission-report').prop('href', '#');
      return;
    } else {
      lastMissionId = currMissions[0];
      localStorage.setItem('currMissionId', lastMissionId);
    }
    this.loadMission(lastMissionId);
    if (!Map_Obj.isMobileScreen()) $('#businesses-list').addClass('show');
    // If create_id passed in and not ignore create_id - open create form.
    if (
      window.location.search &&
      /^\?create_id=.+[^&]$/.test(window.location.search)
    )
      // Wait for mission details to be populated then show create form.
      setTimeout(() => {
        this.showCreateForm();
      }, 500);
  }

  addLoadMissionListener() {
    $('#mission-load-select').change(
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
      `/report?mission_id=${mission_id}&cancel_url=${window.location.pathname}`
    );
    if (Map_Obj.isMobileScreen()) $('#businesses-list').removeClass('show');
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
    <a class="font-weight-bold " 
      data-toggle="collapse" href="#mission-form" 
      role="button" aria-expanded="false" aria-controls="mission-form">
      <div  class="txt-warning hoverBlue">
        <span class="panel-toggle pt-1 rounded-right">
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
    Map_Obj.clearMapArray();
    if (businesses.length == 0) return;
    Map_Obj.mapArrayAndFitBounds(businesses);
  }

  listBusinesses(missionData) {
    let html = missionData.businesses.reduce((acc, el, idx) => {
      return `${acc}
        <li class="list-group-item px-2 px-lg-3 px-xl-4">
          ${el.name}
          <span class="float-right" data-id="${el.id}" data-idx="${idx}">
            <span class="mapBtn mr-2" data-toggle="tooltip" title="Show on Map" data-lng="${
              el.longitude
            }" data-lat="${el.latitude}">
              <i class="fas fa-map-marked-alt brand-outline txt-warning iconBtn"></i>
            </span>
            <span class="detailsBtn mr-2" data-toggle="tooltip" title="Show Details" data-id="${
              el.id
            }">
              <i class="fas fa-clipboard-list brand-outline txt-warning iconBtn"></i>
            </span>
            <span class="flagBtn mr-2" data-toggle="tooltip" title="Plant a Flag" data-name="${
              el.name
            }">
              <i class="fas fa-flag brand-outline txt-warning iconBtn"></i>
            </span>
            <span data-toggle="tooltip" title="Write Report">
              <a href="/report?business_id=${el.id}&cancel_url=${
        window.location.pathname
      }">
                <i class="fas fa-pen-alt brand-outline txt-warning iconBtn"></i>
              </a>
            </span>
            ${
              missionData.mission.editor
                ? `<span class = "removeBusinessBtn ml-2" data-toggle="tooltip" title="Remove from mission">
                    <i class="fas fa-trash-alt brand-outline txt-warning iconBtn"></i>
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
         <a href="/">Explore</a> and add some goals! Or check out some shared <a href="/missions">missions!</li>`;
    // insert into DOM.
    $('#businesses-list').html(html);
  }

  // Create new mission button listener
  addCreateMissionListener() {
    $('#create-mission-btn').on('click', this.showCreateForm);
    this.$infoCol.on('submit', '#create-form', this.createMission.bind(this));
  }

  showCreateForm(e) {
    if (e) e.preventDefault();
    const html = `
    <a class="font-weight-bold " data-toggle="collapse" href="#create-form" 
      role="button" aria-expanded="false" aria-controls="mission-form">
      <div class="hoverOpaque txt-warning hoverBlue">
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

  // Call create mission API endpoint.
  // Update DOM with new <option> for new mission.
  // Load new mission.
  async createMission(e) {
    e.preventDefault();

    const formData = $('#create-form').serializeArray();
    const f_d = Base_Obj.convertDataArrayToObj(formData);

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
      // update mission-load-select with new <option>.
      $('#mission-load-select').append(
        $(`<option value="${mission.id}">${mission.name}</option>`)
      );
      // update mission-select (add to mission) with new <option>.
      $('#mission-select').append(
        $(`<option value="${mission.id}">${mission.name}</option>`)
      );
      localStorage.setItem('currMissionId', mission.id);

      // if create_id passed in as query parameter.
      if (
        window.location.search &&
        /^\?create_id=.+[^&]$/.test(window.location.search)
      ) {
        // Add business to just created mission.
        const business_id = window.location.search.replace('?create_id=', '');
        try {
          var resp2 = await axios.post(
            `/v1/mission/add_business/${mission.id}`,
            {
              id: business_id,
            }
          );
        } catch (err) {
          Sentry.captureException(err);
        }
        if (!resp2 || resp2.data.error) {
          Sentry.captureMessage(
            'Something went wrong: missionControl.createMission'
          );
        }
        if (resp.data.success) {
          //https://www.aspsnippets.com/Articles/Change-Browser-URL-without-reloading-refreshing-page-using-HTML5-in-JavaScript-and-jQuery.aspx
          if (typeof history.pushState != 'undefined') {
            const obj = { Title: 'Mission Control', Url: '/mission-control' };
            history.pushState(obj, obj.Title, obj.Url);
          }
        }
      }

      Map_Obj.clearMapArray();
      this.checkLocalStorage();
      ApiFunctsObj.showToast(resp.data.success);
    }
  }

  addCancelCreateMissionListener() {
    $('main').on(
      'click',
      'button.cancelCreate',
      function () {
        const mission_id = localStorage.getItem('currMissionId');
        const missionData = this.missionCache[mission_id];
        this.fillForm(missionData.mission);
      }.bind(this)
    );
  }

  // Listen for mission-form being submitted.
  // Call mission update endpoint.
  // Provide feedback and update mission-load-select
  // and mission-select <option> text.
  addUpdateListener() {
    this.$infoCol.on(
      'submit',
      '#mission-form',
      async function (e) {
        e.preventDefault();

        const formData = $('#mission-form').serializeArray();
        const f_d = Base_Obj.convertDataArrayToObj(formData);

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
          // update mission-load-select text.
          $('#mission-select-form #mission-load-select option').each(
            function () {
              // if <option> is for edited mission update name text.
              if ($(this).val() === f_d.id) $(this).text(f_d.name);
            }
          );
          // update mission-select text.
          $('#mission-choices-form #mission-select option').each(function () {
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
  // Update mission-load-select and mission-select <option> text.
  addDeleteMissionListener() {
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
          $('#mission-load-select')
            .children()
            .each(function () {
              if ($(this).val() === mission_id) $(this).remove();
            });
          $('#mission-select')
            .children()
            .each(function () {
              if ($(this).val() === mission_id) $(this).remove();
            });
          $('#mission-detail-panel').html('');
          $('#businesses-list').html('');
          $('#deleteMissionModal').modal('hide');
          Map_Obj.clearMapArray();
          this.checkLocalStorage();
          ApiFunctsObj.showToast(resp.data.success);
        }
      }.bind(this)
    );
  }
  // Listen for remove mission button being clicked.
  // Call mission remove endpoint.
  // Update mission-load-select and mission-select <option> text.
  addRemoveMissionListener() {
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
          $('#mission-load-select')
            .children()
            .each(function () {
              if ($(this).val() === mission_id) $(this).remove();
            });
          $('#mission-select')
            .children()
            .each(function () {
              if ($(this).val() === mission_id) $(this).remove();
            });
          $('#mission-detail-panel').html('');
          $('#businesses-list').html('');
          $('#removeMissionModal').modal('hide');
          Map_Obj.clearMapArray();
          this.checkLocalStorage();
          ApiFunctsObj.showToast(resp.data.success);
        }
      }.bind(this)
    );
  }

  addDetailsListenerBlocker() {
    const this_ = this;
    $('#businesses-list').on('click', '.detailsBtn', function (e) {
      this_.setBusinessClickBlocker();
    });
  }

  addBusinessMapListener() {
    const this_ = this;
    this.$infoCol.on('click', '.mapBtn', function () {
      this_.businessMapper($(this));
      this_.setBusinessClickBlocker();
    });
  }

  businessMapper($el) {
    const lng = $el.data('lng');
    const lat = $el.data('lat');

    Map_Obj.mappyBoi.flyTo({
      center: [lng, lat],
      essential: true,
      zoom: 16.01,
      // speed: 1.2,
      // curve: 1.42,
      easing(t) {
        return t;
      },
    });

    if (Map_Obj.isMobileScreen()) {
      $('#businesses-list').removeClass('show');
      $('#mission-select-form').removeClass('show');
      $('#directions-text').removeClass('show');
    }
    const idx = $el.parent().data('idx');
    const marker = Map_Obj.restMarkers[idx];
    if (!marker.getPopup().isOpen()) marker.togglePopup();
  }

  // Toggle business marker popup and set restCoords
  // when business list-group-item is clicked.
  addBusinessClickListener() {
    const this_ = this;
    this.$infoCol.on('click', '.list-group-item', function () {
      if (this_.businessClickBlocker) return;
      this_.setBusinessClickBlocker();
      Map_Obj.closePopupsArray();
      // toggle popup
      const idx = $(this).children().data('idx');
      const marker = Map_Obj.restMarkers[idx];
      if (!marker.getPopup().isOpen()) marker.togglePopup();
      Map_Obj.restMarker = marker;
      // set restcoords
      const $mapBtn = $(this).find('.mapBtn');
      const lng = $mapBtn.data('lng');
      const lat = $mapBtn.data('lat');
      Map_Obj.restCoords = [lng, lat];
      if (Map_Obj.profile) {
        Map_Obj.showDirectionsAndLine();
        this_.changeMarkerColor(
          MissionControlNavigationObj.lastRestMarkerIdx,
          null
        );
        this_.changeMarkerColor(idx, $(this), 1);
        MissionControlNavigationObj.postDirectionsMapAdjustments();
        $('#businesses-list').removeClass('show');
        $('#directions-text').removeClass('show');
      }
      MissionControlNavigationObj.lastRestMarkerIdx = idx;
    });
  }

  // Block double clicks from activating businessClickListerner twice.
  setBusinessClickBlocker() {
    clearTimeout(this.businessClickBlockerTimer);
    this.businessClickBlocker = true;
    this.businessClickBlockerTimer = setTimeout(() => {
      this.businessClickBlocker = false;
    }, 1000);
  }

  addBusinessDblclickListener() {
    const this_ = this;
    this.$infoCol.on('dblclick', '.list-group-item', function () {
      const fake_e = { currentTarget: $(this).find('.detailsBtn').get()[0] };
      this_.businessMapper($(this).find('.mapBtn'));
      setTimeout(() => {
        ApiFunctsObj.getShowBusinessDetails(fake_e);
      }, 3000);
    });
  }

  addGoalCompletedListener() {
    const this_ = this;
    this.$infoCol.on('click', '.flagBtn', async function () {
      this_.setBusinessClickBlocker();
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
        const html = `<span class="detailsBtn" data-id="${id}">
                    ${name}</span>`;
        // get marker for this business
        const marker = Map_Obj.restMarkers[idx];
        const { lng, lat } = marker._lngLat;
        marker.remove();
        if (success === 'Goal Completed!') {
          // add flag marker
          newMarker = Map_Obj.addFlagMarker([lng, lat], html);
          completed = true;
        } else {
          // add regular marker
          newMarker = Map_Obj.addMarker([lng, lat], html);
          completed = false;
        }
        // newMarker.togglePopup();
        // put new marker in restMarkers array in spot of old marker
        Map_Obj.restMarkers.splice(idx, 1, newMarker);
        // update mission cache that this business was/wasn't completed
        this_.missionCache[mission_id].businesses[idx].completed = completed;

        ApiFunctsObj.showToast(`<div>${success}</div><div>- ${name}</div>`);
      }
    });
  }

  // Change marker color to purple when marker is a  navigation endpoint
  // and back to green when marker is not a navigation endpoint.
  changeMarkerColor(idx, $el, option = 0) {
    let html;
    // option 0 is green marker return to original color.
    if (option === 0) {
      // If no last restMarker return.
      if (MissionControlNavigationObj.lastRestMarkerHtml === null) return;
      html = MissionControlNavigationObj.lastRestMarkerHtml;
    } else {
      // Turn purple. Make new html for new marker
      const id = $el.children().data('id');
      const name = $el.text();
      html = `<span class="detailsBtn" data-id="${id}">
                      ${name}</span>`;
    }
    // get marker for this business
    const marker = Map_Obj.restMarkers[idx];
    const { lng, lat } = marker._lngLat;
    marker.remove();

    Map_Obj.markerStyle = option;
    const newMarker = Map_Obj.addMarker([lng, lat], html);
    Map_Obj.markerStyle = 0;
    // If marker changed to purple note marker and html.
    if (option === 1) {
      Map_Obj.restMarker = newMarker;
      MissionControlNavigationObj.lastRestMarkerHtml = html;
    }
    // put new marker in restMarkers array in spot of old marker
    Map_Obj.restMarkers.splice(idx, 1, newMarker);
  }

  addRemoveBusinessListener() {
    const this_ = this;
    this.$infoCol.on('click', '.removeBusinessBtn', async function () {
      this_.setBusinessClickBlocker();
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

  addSidebarListener() {
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

  addMapAllListener() {
    $('.mapAll').click(
      function () {
        const missionId = localStorage.getItem('currMissionId');
        const businesses = this.missionCache[missionId].businesses;
        if (businesses) Map_Obj.fitBoundsArray(businesses);
        $('#businesses-list').removeClass('show');
      }.bind(this)
    );
  }
}

// MissionControlNavigation  //
// MissionControlNavigation  //
// MissionControlNavigation  //
// MissionControlNavigation  //
// MissionControlNavigation  //
// MissionControlNavigation  //

class MissionControlNavigation {
  constructor() {
    this.lastRestMarkerIdx = 0;
    this.lastRestMarkerHtml = null;
    // nav buttons
    this.addNavProfileBtnsListener();
    this.addDetectLocationListener();
    // Add location autocomplete.
    Base_Obj.addLocationAutocompleteListener();
    // Location entry or restart navigation.
    this.addNavStartListener();
    this.addNavStartEnableNoSleepListener();
    // clear directions routing
    $('.map-routing .reset').click(this.endNavigation.bind(this));
  }

  /*
  /* Navigation Profile Buttons Listener (drive, walk, cycle). 
  /* Opens modal. Sets Map_Obj profile.
  */
  addNavProfileBtnsListener() {
    const this_ = this;
    $('.map-routing').on('click', '.directionsBtn', function () {
      const profile = $(this).data('profile');
      Map_Obj.profile = profile;
      $('.profileDisplay').text(Map_Obj.profileDict[profile]);
      if (Map_Obj.currentRoute) this_.startLocationSuccess();
      else $('#navigationModal').modal('show');
    });
  }

  addDetectLocationListener() {
    // detect location
    $('#detect-location').click(function () {
      Geolocation_Obj.enableNoSleep();
      Geolocation_Obj.detectLocation();
    });
  }

  /*
  /* Start/Restart Navigation Listener.
  */
  addNavStartListener() {
    const this_ = this;
    $('#nav-start-form').submit(async function (e) {
      e.preventDefault();

      const location = $(this).find('#location').val();

      if (location) {
        let coords = Base_Obj.locationAutocompleteCache[location];
        if (!coords) {
          const features = await Map_Obj.geocode(location);
          if (features.length === 0) {
            alert('No location found. Please fix location input.');
            return;
          }
          coords = features[0].geometry.coordinates;
        }
        Map_Obj.longitude = coords[0];
        Map_Obj.latitude = coords[1];
        Map_Obj.addUserMarker();
        Map_Obj.userMarker.togglePopup();
        navigator.geolocation.clearWatch(Geolocation_Obj.locationWatcher);
        $('#location').prop('placeholder', 'Starting Location');
      }
      if (Map_Obj.longitude) {
        this_.startLocationSuccess();
      } else alert('Enter a starting location or click the detect location button.');
    });
  }

  addNavStartEnableNoSleepListener() {
    $('#nav-start-form button').click(function () {
      if (!$('#location').val() && Map_Obj.longitude)
        Geolocation_Obj.enableNoSleep();
    });
  }

  startLocationSuccess() {
    Map_Obj.showDirectionsAndLine();
    MissionControlObj.changeMarkerColor(
      this.lastRestMarkerIdx,
      $('#businesses-list .list-group-item').eq(this.lastRestMarkerIdx),
      1
    );
    this.postDirectionsMapAdjustments();
    $('#navigationModal').modal('hide');
    $('#businesses-list').removeClass('show');
    $('#directions-panel').show();
    $('.map-routing .home').fadeIn();
    $('.map-routing .reset').fadeIn();
  }

  postDirectionsMapAdjustments() {
    Map_Obj.closePopupsArray();
    Map_Obj.restMarker.togglePopup();
    Map_Obj.fitBounds();
  }

  endNavigation() {
    Map_Obj.clearRouting();
    MissionControlObj.changeMarkerColor(this.lastRestMarkerIdx, null);
    $('#directions-panel').fadeOut();
    $('.map-routing .home').fadeOut();
    $('.map-routing .reset').fadeOut();
  }
}

const MissionControlNavigationObj = new MissionControlNavigation();
const MissionControlObj = new MissionControl();
