/**
 * Class to hold methods related to checking if the search parameters
 * for performing a yelp search have channged.
 */

class ParamsChange {
  constructor() {}
  //
  // Check for changes that warrant a new Yelp API call.
  // Form, category, significant GPS change, or no stored data warrant API call.
  // Called functions update local storage if they detect changes.
  //
  checkParameterChange(lastData, currFormState) {
    // set change to true if a new API call is warranted.
    let change = false;
    // Coordinate precision used to look for lng/lat changes
    // which would warrant new Yelp API call for fresh data.
    this.coordsPercision = 3;

    change = this.checkFormChanges(change, currFormState);

    change = this.checkCoordsChange(change);

    change = this.checkCategoryChange(change);

    if (!change) change = this.checkLastData(lastData);

    return change;
  }

  //
  // Check if control panel form data has changed.
  //
  checkFormChanges(change, currFormState) {
    const prevFormState = localStorage.getItem('formData');

    // if form data changed warrants API call
    if (JSON.stringify(currFormState) !== prevFormState) {
      FormFunctsObj.setFormDataArray(currFormState);
      return true;
    }
    // Else if open now selected always make a new api call
    else if ($('#open_now').prop('checked') === true) return true;

    // TODO: Add 30sec or greater data age then make new api call.
    // when open_now selected.

    // TODO: Add 1 day age or greater data age then make new api call
    // general search functionality.
    return change;
  }

  //
  // Check if user coordinates have changed.
  //
  checkCoordsChange(change) {
    const prevCoords = JSON.parse(localStorage.getItem('coords'));

    // if there is lng/lat data but no previous stored coordinates data
    if (Map_Obj.longitude && !prevCoords) {
      // Store coords.
      localStorage.setItem(
        'coords',
        JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
      );
      // if there is not a location given having coordinates warrants an API call
      if (!FormFunctsObj.$locationInput.val()) return true;
      // Else if no location given and new and old coordinates to compare:
    } else if (
      !FormFunctsObj.$locationInput.val() &&
      Map_Obj.longitude &&
      prevCoords
    ) {
      const [prevLng, prevLat] = prevCoords;
      // if coordinates have changed beyond precision threshold:
      if (
        Map_Obj.longitude.toFixed(this.coordsPercision) !==
          prevLng.toFixed(this.coordsPercision) ||
        Map_Obj.latitude.toFixed(this.coordsPercision) !==
          prevLat.toFixed(this.coordsPercision)
      ) {
        // Store coords.
        localStorage.setItem(
          'coords',
          JSON.stringify([Map_Obj.longitude, Map_Obj.latitude])
        );
        // Warrants an API call.
        return true;
      }
    }
    return change;
  }

  //
  // Check if the category has changed.
  //
  checkCategoryChange(change) {
    const prevCategory = localStorage.getItem('category');

    // category change warrants an API call
    if (prevCategory !== IndexAnimationsObj.category) {
      localStorage.setItem('category', IndexAnimationsObj.category);
      return true;
    }
    return change;
  }

  //
  // Check if their is previous data stored in local storage.
  //
  checkLastData(lastData) {
    // if there is no stored yelp data must make api call
    if (!lastData || ['undefined', 'false'].includes(lastData)) {
      return true;
    }
    return false;
  }
}

const ParamsChangeObj = new ParamsChange();
