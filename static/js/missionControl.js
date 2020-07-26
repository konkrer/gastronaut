'use strict';

/*
/* Misson Control View interactive logic.
*/
class MissionControl {
  constructor() {
    this.mission_cache = {};
    this.restMarkers = [];
    this.checkLocalStorage();

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
    this.mapBusinesses(missionData.businesses);
  }

  fillForm(missionData) {}

  mapBusinesses(businesses) {
    if (businesses.length == 0) return;
    clearMapArray(this.restMarkers);
    this.restMarkers = mapArrayAndFitBounds(businesses);
  }
}

const M_C = new MissionControl();
