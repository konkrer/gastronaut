'use strict';

/*
/* Misson Control View interactive logic.
*/
class MissionControl {
  constructor() {
    this.currMission = null;
    this.mission_cache = {};
    this.restMarkers = [];
    this.checkLocalStorage();
  }

  /*
    /* Load previous mission user had loaded. 
    */
  checkLocalStorage() {
    setTimeout(() => {
      let lastMission = JSON.parse(localStorage.getItem('currMission'));
      if (!lastMission) {
        if ($('#mission-select').children().length > 0) {
          lastMission = $('#mission-select').children().val();
          localStorage.setItem('currMission', lastMission);
        } else return;
      }
      this.loadMission(lastMission);
    }, 3000);
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
    clearMapArray(this.restMarkers);
    this.restMarkers = mapArrayAndFitBounds(businesses);
  }
}

const M_C = new MissionControl();
