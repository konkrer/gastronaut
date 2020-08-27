'use strict';

//
// Misson Control View interactive logic.
//
class MissionControl {
  constructor() {
    this.missionCache = {}; // Data cache for missions.
    this.sidebarOpen = true;
    this.$infoCol = $('#info-col');
    this.feedbackTimer = null;
    this.htmFactory = new MissionControlHtmFactory();
    Map_Obj.userMarkerStyle = 1; // Set user marker to alternate style.

    this.addEventListeners();

    // Delay mission loading to allow time for map to load.
    setTimeout(() => {
      this.checkLocalStorage();
    }, 2000);
  }

  //
  // Event listeners for page actions.
  //
  addEventListeners() {
    this.addLoadMissionListener();
    this.addCreateMissionListener();
    this.addCancelCreateMissionListener();
    this.addUpdateListener();
    this.addDeleteMissionListener();
    this.addRemoveMissionListener();
    this.addBusinessClickListener();
    this.addBusinessDblclickListener();
    this.addBusinessMapListener();
    this.addDetailsListenerBlocker();
    this.addGoalCompletedListener();
    this.addRemoveBusinessListener();
    this.addSidebarListeners();
    this.addMapAllListener();
  }

  //
  // Load previous mission user had loaded.
  //
  checkLocalStorage() {
    // get list of user's missions ids from html <option> values.
    const currMissions = $('#mission-load-select')
      .children()
      .map(function () {
        return $(this).val();
      })
      .get();

    let lastMissionId = localStorage.getItem('currMissionId');

    // If the last mission loaded is still in user missions.
    if (currMissions.includes(lastMissionId)) {
      // Select <option> that matches lastMissionId in mission-load-select input.
      const currOption = currMissions.indexOf(lastMissionId);
      $('#mission-load-select')
        .children()
        .eq(currOption)
        .prop('selected', true);
      // If no missions make mission report button point nowhere and return.
    } else if (currMissions.length == 0) {
      $('#write-mission-report').prop('href', '#');
      // If in navigation mode end navigation mode.
      if (Map_Obj.profile) MissionControlNavigationObj.endNavigation();
      // Reset mission cache in case all missions just got deleted.
      this.missionCache = {};
      this.checkForCreateIdOnLoad();
      return;
    } else {
      // Make lastMissionId the first option of current missions.
      lastMissionId = currMissions[0];
      localStorage.setItem('currMissionId', lastMissionId);
    }
    // Load last mission loaded or the first mission in missions options.
    this.loadMission(lastMissionId);
    // Show businesses list for non phone screen sizes.
    if (!Map_Obj.isMobileScreen()) $('#businesses-list').addClass('show');
    // If create_id passed in open create form.
    this.checkForCreateIdOnLoad();
  }

  //
  // Check if a create_id parameter was pased in.
  //
  checkForCreateIdOnLoad() {
    if (
      window.location.search &&
      /^\?create_id=.+[^&]$/.test(window.location.search)
    )
      // Wait for mission details to be populated then show create form.
      setTimeout(() => {
        this.htmFactory.showCreateForm();
      }, 500);
  }

  //
  // Add load new mission listener.
  //
  addLoadMissionListener() {
    $('#mission-load-select').change(
      function (e) {
        localStorage.setItem('currMissionId', e.target.value);
        // Loading mission when navi active will show navi to first business,
        // remove home button from being active.
        $('.map-routing .home').removeClass('homeActive');
        this.loadMission(e.target.value);
      }.bind(this)
    );
  }

  //
  // Load a mission.
  //
  async loadMission(mission_id) {
    let missionData;
    // Reload cached data if cached data.
    if (this.missionCache[mission_id])
      missionData = this.missionCache[mission_id];
    else {
      try {
        var resp = await axios.get(`/v1/mission/${mission_id}`);
      } catch (error) {
        Sentry.captureException(error);
        console.error(`Mission Load error. ${error.message}`);
        return;
      }
      this.missionCache[mission_id] = resp.data;
      missionData = resp.data;
    }
    this.htmFactory.fillForm(missionData.mission);
    this.htmFactory.showLikes(missionData.mission);
    this.mapBusinesses(missionData.businesses);
    this.htmFactory.listBusinesses(missionData);
    // make mission report <a> element point to report with current mission id.
    $('#write-mission-report').prop(
      'href',
      `/report?mission_id=${mission_id}&cancel_url=javascript:Base_Obj.close_current_tab()`
    );
    // Don't show business list on phones.
    if (Map_Obj.isMobileScreen()) $('#businesses-list').removeClass('show');
    else $('#businesses-list').addClass('show');
    // Set currentRestMarkerIdx to be index for first business in list marker.
    MissionControlNavigationObj.currentRestMarkerIdx = 0;
    // If navigation mode active.
    if (Map_Obj.profile) {
      // If no businesses in this mission end navigation.
      if (this.missionCache[mission_id].businesses.length === 0)
        MissionControlNavigationObj.endNavigation();
      // Else change first marker that will be navi. destination to it alternate color.
      else
        this.changeMarkerColor(
          0,
          $('#businesses-list .list-group-item').eq(0),
          1
        );
      MissionControlNavigationObj.lastRestMarkerIdx = 0;
    }
  }

  //
  // Map all businesses on mission and filt bounds for all.
  //
  mapBusinesses(businesses) {
    Map_Obj.clearMapArray();
    if (businesses.length == 0) return;
    Map_Obj.mapArrayAndFitBounds(businesses);
  }

  //
  // Create new mission button listener.
  //
  addCreateMissionListener() {
    $('#create-mission-btn').on('click', this.htmFactory.showCreateForm);
    this.$infoCol.on('submit', '#create-form', this.createMission.bind(this));
  }

  //
  // Call create mission API endpoint.
  // Update DOM with new <option> for new mission.
  // Load new mission.
  //
  async createMission(e) {
    e.preventDefault();

    const formData = $('#create-form').serializeArray();
    const f_d = Base_Obj.convertDataArrayToObj(formData);

    // Don't pass default textarea content 'Add a Description' to backend.
    f_d.description =
      f_d.description === 'Add a Description' ? '' : f_d.description;

    try {
      var resp = await axios.post(`/v1/mission`, f_d);
    } catch (error) {
      Sentry.captureException(error);
      $('#mission-form .feedback').html(
        '<span class="text-danger">Error</span>'
      );
      return;
    }
    if (!resp || resp.data.error) {
      $('#mission-form .feedback').html(
        `<span class="text-danger">${resp.data.error}</span>`
      );
      return;
    }
    $('.toasts-zone').html('');
    if (resp.data.success) {
      this.createMissionSuccess(resp.data);
    }
  }

  async createMissionSuccess(data) {
    const mission = data.mission;
    // update mission-load-select with new <option>.
    $('#mission-load-select').append(
      $(`<option value="${mission.id}">${mission.name}</option>`)
    );
    // update mission-select (add to mission) with new <option>.
    $('#mission-select').append(
      $(`<option value="${mission.id}">${mission.name}</option>`)
    );

    // If create id passed in url add business to newly created mission.
    await this.checkForCreateIdAddToMission(mission);

    Map_Obj.clearMapArray();
    $('#mission-detail-panel').html('');
    localStorage.setItem('currMissionId', mission.id);
    this.checkLocalStorage();
    ApiFunctsObj.showToast(data.success);
  }

  //
  // If a create_id is passed in as URL parameter
  // (from create new mission btn in add to mission modal)
  // add business to new mission.
  //
  async checkForCreateIdAddToMission(mission) {
    // if create_id passed in as query parameter.
    if (
      window.location.search &&
      /^\?create_id=.+[^&]$/.test(window.location.search)
    ) {
      // Get business id from URL to add business to new mission.
      const business_id = window.location.search.replace('?create_id=', '');
      // Remove page with create_id from browser page history and make URL canonical URL.
      // https://www.aspsnippets.com/Articles/Change-Browser-URL-without-reloading-refreshing-page-using-HTML5-in-JavaScript-and-jQuery.aspx
      if (typeof history.pushState != 'undefined') {
        const obj = { Title: 'Mission Control', Url: '/mission-control' };
        history.pushState(obj, obj.Title, obj.Url);
      }

      // Add business to just created mission.
      try {
        var resp2 = await axios.post(`/v1/mission/add_business/${mission.id}`, {
          id: business_id,
        });
      } catch (err) {
        Sentry.captureException(err);
      }
      if (!resp2 || resp2.data.error) {
        Sentry.captureMessage(
          'Something went wrong: missionControl.createMission'
        );
      }
    }
  }

  //
  // Add listener to cancel creating a new mission.
  // Use mission data to replace create form with normal mission
  // editing form or information panel.
  //
  addCancelCreateMissionListener() {
    $('main').on(
      'click',
      'button.cancelCreate',
      function () {
        const mission_id = localStorage.getItem('currMissionId');
        const missionData = this.missionCache[mission_id];
        this.htmFactory.fillForm(missionData.mission);
      }.bind(this)
    );
  }

  //
  // Listen for mission-form being submitted. Call mission update endpoint.
  // Provide feedback and update mission-load-select and mission-select
  // <option> text. Update mission cache.
  //
  addUpdateListener() {
    this.$infoCol.on(
      'submit',
      '#mission-form',
      async function (e) {
        e.preventDefault();
        clearTimeout(this.feedbackTimer);

        const formData = $('#mission-form').serializeArray();
        const f_d = Base_Obj.convertDataArrayToObj(formData);

        // Don't pass default textarea content 'Add a Description' to backend.
        f_d.description =
          f_d.description == 'Add a Description' ? '' : f_d.description;

        try {
          var resp = await axios.put(`/v1/mission`, f_d);
        } catch (error) {
          Sentry.captureException(error);
          $('#mission-form .feedback').html(
            '<span class="text-danger">Error</span>'
          );
          return;
        }
        if (!resp || resp.data.error) {
          Sentry.captureMessage(resp.data.error);
          $('#mission-form .feedback').html(
            '<span class="text-danger">Error</span>'
          );
          return;
        }
        if (resp.data.success) {
          this.updateSuccess(resp.data);
        }
        // remove feedback text after delay.
        this.feedbackTimer = setTimeout(
          () => $('#mission-form .feedback').html(''),
          4000
        );
      }.bind(this)
    );
  }

  //
  // Update success actions. Feedback, cache, update <option> text.
  //
  updateSuccess(data) {
    const mission = data.mission;
    // Provide feedback
    $('#mission-form .feedback').html(
      `<span class="text-success bg-light p-2 rounded">Updated!</span>
      ${this.htmlFactory.makeNote(data.note)}`
    );
    // Update mission cache.
    this.missionCache[mission.id].mission = mission;
    // update mission-load-select text.
    $('#mission-select-form #mission-load-select option').each(function () {
      // if <option> is for this edited mission update name text.
      if ($(this).val() === mission.id) $(this).text(mission.name);
    });
    // update mission-select text.
    $('#mission-choices-form #mission-select option').each(function () {
      // if <option> is for this edited mission update name text.
      if ($(this).val() === mission.id) $(this).text(mission.name);
    });
  }

  //
  // Listen for mission-form delete button being clicked,
  // call mission delete endpoint (for current user created missions).
  // Update mission-load-select and mission-select <option> text.
  //
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
          Sentry.captureException(error);
          return;
        }
        if (!resp || resp.data.error) {
          Sentry.captureMessage(resp.data.error);
          return;
        }
        $('.toasts-zone').html('');
        if (resp.data.success) {
          this.deleteMissionSuccess(mission_id, resp.data.success);
        }
      }.bind(this)
    );
  }

  //
  // Delete mission success actions. Remove <options>, clear map,
  // check local storage, show toast.
  //
  deleteMissionSuccess(mission_id, successMsg) {
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
    ApiFunctsObj.showToast(successMsg);
  }

  //
  // Listen for remove mission button being clicked.
  // Call mission remove endpoint.
  // Update mission-load-select and mission-select <option> text.
  //
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
          Sentry.captureException(error);
          return;
        }
        if (!resp || resp.data.error) {
          Sentry.captureMessage(resp.data.error);
          return;
        }
        $('.toasts-zone').html('');
        if (resp.data.success) {
          this.removeMissionSuccess(mission_id, resp.data.success);
        }
      }.bind(this)
    );
  }

  //
  // Remove mission success actions. Remove <options>, clear map,
  // check local storage, show toast.
  //
  removeMissionSuccess(mission_id, successMsg) {
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
    ApiFunctsObj.showToast(successMsg);
  }

  //
  // Prevent double clicks on details button from making two calls.
  //
  addDetailsListenerBlocker() {
    const this_ = this;
    $('#businesses-list').on('click', '.detailsBtn', function () {
      if (this_.businessClickBlocker) return;
    });
  }

  //
  // Zoom into business when map button clicked listener
  //
  addBusinessMapListener() {
    const this_ = this;
    this.$infoCol.on('click', '.mapBtn', function (e) {
      // Prevent double clicks on map button from making two calls.
      if (this_.businessClickBlocker) return;
      // Make sure zoom into business works when passive navigation is active
      // by stopping propagation which would negate zoom in with a fit bounds call.
      e.stopPropagation();
      // Set marker for this business as restMarker, set coords as restCoords, togglePopup.
      this_.setCurrentMarkerCoords($(this).parent().parent());
      this_.businessMapper($(this));
    });
  }

  //
  // Zoom into business.
  //
  businessMapper($el) {
    const lng = $el.data('lng');
    const lat = $el.data('lat');

    Map_Obj.mappyBoi.flyTo({
      center: [lng, lat],
      essential: true,
      zoom: 16.5,
      easing(t) {
        return t;
      },
    });
    // Make adjustments for small screens.
    if (Map_Obj.isMobileScreen()) {
      $('#businesses-list').removeClass('show');
      $('#mission-select-form').removeClass('show');
      $('#directions-text').removeClass('show');
    }
  }

  //
  // Toggle business marker popup and set restCoords
  // when business list-group-item is clicked.
  //
  addBusinessClickListener() {
    const this_ = this;
    this.$infoCol.on('click', '.list-group-item', function () {
      if (this_.businessClickBlocker) return;
      this_.setBusinessClickBlocker();
      Map_Obj.closePopupsArray();
      // Set marker for this business as restMarker, set coords as restCoords, togglePopup.
      this_.setCurrentMarkerCoords($(this));
      // If navigation mode active show route to this business.
      if (Map_Obj.profile) {
        Map_Obj.showDirectionsAndLine();
        // Change last restMarker back to main color.
        this_.changeMarkerColor(
          MissionControlNavigationObj.lastRestMarkerIdx,
          null
        );
        // Change this restMarker to alternate color for navigation endpoints.
        this_.changeMarkerColor(
          MissionControlNavigationObj.currentRestMarkerIdx,
          $(this),
          1
        );
        // Make lastRestMarkerIdx point to current index.
        MissionControlNavigationObj.lastRestMarkerIdx =
          MissionControlNavigationObj.currentRestMarkerIdx;
        MissionControlNavigationObj.postDirectionsMapAdjustments();
        // DOM adjustments.
        $('.map-routing .home').removeClass('homeActive');
        $('#directions-text').removeClass('show');
        // Set timer to hide businesses list. Allows time for double clicking event
        // to register before hiding list.
        setTimeout(() => {
          $('#businesses-list').removeClass('show');
        }, 500);
      }
    });
  }

  //
  // Block double clicks from activating businessClickListerner a second time.
  //
  setBusinessClickBlocker() {
    clearTimeout(this.businessClickBlockerTimer);
    this.businessClickBlocker = true;
    this.businessClickBlockerTimer = setTimeout(() => {
      this.businessClickBlocker = false;
    }, 1000);
  }

  //
  // Set current marker, restCoords, toggle popup.
  // $el is business list list-group-item.
  //
  setCurrentMarkerCoords($el) {
    const idx = $el.children().data('idx');
    // If no businesses in mission there will be no index - return.
    if (idx === undefined) return;
    MissionControlNavigationObj.currentRestMarkerIdx = idx;
    const marker = Map_Obj.restMarkers[idx];
    Map_Obj.restMarker = marker;
    // set restcoords
    const $mapBtn = $el.find('.mapBtn');
    const lng = $mapBtn.data('lng');
    const lat = $mapBtn.data('lat');
    Map_Obj.restCoords = [lng, lat];
    if (!marker.getPopup().isOpen()) marker.togglePopup();
  }

  //
  // Allow double clicks to zoom into businees then show
  // business detail modal after short delay.
  //
  addBusinessDblclickListener() {
    const this_ = this;
    this.$infoCol.on('dblclick', '.list-group-item', function () {
      const fake_e = { currentTarget: $(this).find('.detailsBtn').get()[0] };
      this_.businessMapper($(this).find('.mapBtn'));
      setTimeout(() => {
        ApiFunctsObj.getShowBusinessDetails(fake_e);
      }, 2000);
    });
  }

  //
  // Add listener for mission goal completion.
  // Note goal completed in data base, update cached data,
  // change restMarker to flag marker.
  //
  addGoalCompletedListener() {
    const this_ = this;
    this.$infoCol.on('click', '.flagBtn', async function (e) {
      if (this_.businessClickBlocker) return;
      e.stopPropagation();
      const data = { business_id: $(this).parent().data('id') };
      const mission_id = localStorage.getItem('currMissionId');

      try {
        var resp = await axios.post(
          `/v1/mission/goal_completed/${mission_id}`,
          data
        );
      } catch (error) {
        Sentry.captureException(error);
        return;
      }
      if (!resp || resp.data.error) {
        Sentry.captureMessage(resp.data.error);
        return;
      }
      $('.toasts-zone').html('');

      const {
        data: { success },
      } = resp;

      if (success) {
        this_.goalCompletedSuccess($(this), success, mission_id);
      }
    });
  }

  //
  // Goal completed success actions. Create new marker depending if goal
  // was completed or opened. Update mission cache.
  //
  goalCompletedSuccess($el, success, mission_id) {
    let newMarker, completed;
    const id = $el.parent().data('id');
    const idx = $el.parent().data('idx');
    const name = $el.data('name');
    const html = `<span class="detailsBtn" data-id="${id}">
                ${name}</span>`;
    // get marker for this business and extract coords, then remove.
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
    // put new marker in restMarkers array in spot of old marker
    Map_Obj.restMarkers.splice(idx, 1, newMarker);
    Map_Obj.restMarker = newMarker;
    Map_Obj.restCoords = [lng, lat];
    MissionControlNavigationObj.currentRestMarkerIdx = idx;
    // update mission cache that this business was/wasn't completed
    this.missionCache[mission_id].businesses[idx].completed = completed;

    ApiFunctsObj.showToast(`<div>${success}</div><div>- ${name}</div>`);
  }

  //
  // Change marker color to purple when marker is a navigation endpoint
  // and back to green when marker is not a navigation endpoint.
  // $el is business list list-group-item.
  //
  changeMarkerColor(idx, $el, option = 0) {
    // If last restMarker was homeMarker return.
    if (idx === -1) return;
    let html;
    // option 0 is green marker return to original color.
    if (option === 0) {
      // If no last restMarker return.
      if (MissionControlNavigationObj.lastRestMarkerHtml === null) return;
      html = MissionControlNavigationObj.lastRestMarkerHtml;
    } else {
      const mission_id = localStorage.getItem('currMissionId');
      // If goal was completed no need to chage marker or color.
      if (this.missionCache[mission_id].businesses[idx].completed) {
        MissionControlNavigationObj.lastRestMarkerHtml = null;
        return;
      }
      const id = $el.children().data('id');
      const name = $el.text();
      // Make new html for new marker
      html = `<span class="detailsBtn" data-id="${id}">
                      ${name}</span>`;
    }
    // Get marker for this business and extract coords, then remove.
    const marker = Map_Obj.restMarkers[idx];
    // Bug hunt!!
    if (!marker) {
      const msg = `No marker to change color (changeMarkerColor). idx=${idx}, lastR.M=${MissionControlNavigationObj.lastRestMarkerIdx}, currR.M.=${MissionControlNavigationObj.currentRestMarkerIdx} `;
      Sentry.captureMessage(msg);
      console.error(msg);
      return;
    }
    const { lng, lat } = marker._lngLat;
    marker.remove();
    // Create new marker in appropriate style. Then revert to default.
    Map_Obj.markerStyle = option;
    const newMarker = Map_Obj.addMarker([lng, lat], html);
    Map_Obj.markerStyle = 0;
    // If marker changed to alternate color note marker and html.
    if (option === 1) {
      Map_Obj.restMarker = newMarker;
      MissionControlNavigationObj.lastRestMarkerHtml = html;
    }
    // put new marker in restMarkers array in spot of old marker
    Map_Obj.restMarkers.splice(idx, 1, newMarker);
  }

  //
  // Add listener to remove business from mission.
  //
  addRemoveBusinessListener() {
    const this_ = this;
    this.$infoCol.on('click', '.removeBusinessBtn', async function (e) {
      e.stopPropagation();
      const data = { business_id: $(this).parent().data('id') };
      const mission_id = localStorage.getItem('currMissionId');

      try {
        var resp = await axios.post(
          `/v1/mission/remove_business/${mission_id}`,
          data
        );
      } catch (error) {
        Sentry.captureException(error);
        return;
      }
      if (!resp || resp.data.error) {
        Sentry.captureMessage(resp.data.error);
        return;
      }

      $('.toasts-zone').html('');

      if (resp.data.success) {
        this_.removeBusinessSuccess($(this), mission_id, resp.data.success);
      }
    });
  }

  //
  // Remove business sucess actions. Remove from mission cache. Reload mission.
  //
  removeBusinessSuccess($el, mission_id, success) {
    const idx = $el.parent().data('idx');
    const name = $el.prevAll('.flagBtn').data('name');
    // remove business from cache.
    this.missionCache[mission_id].businesses.splice(idx, 1);
    // If user deleted all businesses and in navigation mode end navigation.
    if (
      this.missionCache[mission_id].businesses.length === 0 &&
      Map_Obj.profile
    ) {
      MissionControlNavigationObj.endNavigation();
    }
    // Reload mission.
    this.loadMission(mission_id);

    ApiFunctsObj.showToast(`<div>${success}</div><div>- ${name}</div>`);
  }

  //
  // Add all listeners to toggle sidebar.
  //
  addSidebarListeners() {
    const boundToggleSidebar = this.toggleSidebar.bind(this);
    $('.sidebar-toggle-btn').click(boundToggleSidebar);
    $('.sidebar-toggle-btn').on('dragstart', boundToggleSidebar);
    this.$infoCol.on('dragstart', boundToggleSidebar);
    $('.sidebar-toggle-btn').on('touchstart', function (e) {
      e.preventDefault();
      boundToggleSidebar();
    });
  }

  //
  // Toggle the sidebar.
  //
  toggleSidebar() {
    // Toggle sidebar.
    // Note: Sidebar does not start with sidebarExpand class to avoid animation on load.
    if (this.sidebarOpen === true) {
      this.$infoCol.addClass('sidebarCollapse').removeClass('sidebarExpand');
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
  }

  //
  // When user adds a business to another mission from add to mission modal delete
  // mission cache for the altered mission to force API call for new data
  // when needed. The added business will then be present. Called by ApiFunctsObj.
  //
  businessAddedToMission(mission_id) {
    delete this.missionCache[mission_id];
  }

  //
  // Map all businesses on mission listener.
  //
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

const MissionControlNavigationObj = new MissionControlNavigation();
const MissionControlObj = new MissionControl();
