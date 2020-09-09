'use strict';

/**
 * Class for autocomplete display and choice functionality.
 *
 * Use: Set up the html in the advised manner. https://github.com/konkrer/simpleAutocomplete
 *      As you set the datalist or the datalistElements property updated contents will be
 *      displayed. As the user selects options they will entered
 *      as the value of the associated text input. An optional
 *      callback can be called upon option selection.
 *
 *      Create one autocomplete class instance per autocomplete display
 *      needed per page. Increment multiAutoCompID input and the
 *      corresponding HTML id appropriately. (i.e. datalist-autocomplete,
 *      datalist-autocomplete-1, datalist-autocomplete-2).
 *
 * Inputs: Callback --> Function. (default: null)
 *           Optional function to be called after user suggestion selection.
 *
 *         multiAutoCompID --> Number. (default: 0)
 *           Id differentiator for when there are multiple SimpleAutocomplete instances.
 *           Leave the first one default. Set the next one to one, then increment for each
 *           additional SimpleAutocomplete added to the next integer (i.e. - 1, 2, 3...).
 *
 *         fontAwesome --> Boolean. (default: false)
 *           If font awesome icons are available and desired for the close button.
 *
 *         marginTop --> String. (default: null)
 *           String setting for CSS margin-top to adjust datalist position to input.
 *
 *         fixed --> Boolean. (default: false)
 *           Set to true to make datalist have a position: fixed instead of absolute.
 *           Use as necessary to ensure the entirety of the datalist is visible when the
 *           containing div is too small to allow full datalist to be visible.
 */

class SimpleAutocomplete {
  constructor(
    callback = null,
    multiAutoCompID = 0,
    fontAwesome = false,
    marginTop = null,
    fixed = false
  ) {
    this.callback = callback;
    this.useFA = fontAwesome;
    this.marginTop = marginTop;
    this.fixed = fixed;
    // Id string for getting the datalist element for this class instance.
    this.idString = `datalist-autocomplete${
      multiAutoCompID ? '-' + multiAutoCompID : ''
    }`;
    // Datalist element for this class instance.
    this._datalistOuter = document.getElementById(this.idString);
    const ok = this.checkSetup(1);
    // Fail gracefully if there is no associated datalist on page.
    if (!ok) return;
    if (this.marginTop) this._datalistOuter.style.marginTop = this.marginTop;
    if (this.fixed) this._datalistOuter.style.position = 'fixed';
    this._datalist = null; // The div that will contain the <option> elements.
    this._value = null; // Last selected autocomplete value.
    this.associatedInput = this._datalistOuter.previousElementSibling;
    // Raise error if there is not an associatedInput.
    this.checkSetup(2);
    this.addDatalistInnerDivs(); // Add header and datalist to datalistOuter.
    this.addCloseDataListListener();
    this.addOptionSelectListener();
  }

  /**
   * @param {string} results
   *
   * Fill datalist with given HTML and show datalist.
   */
  set datalist(results) {
    if (!results) this._datalistOuter.style.display = 'none';
    else {
      this._datalist.innerHTML = results;
      this._datalistOuter.style.display = 'block';
    }
  }

  /**
   * @param {array} results
   *
   * Fill datalist with given DOM elements and show datalist.
   */
  set datalistElements(results) {
    if (results.length === 0) this._datalistOuter.style.display = 'none';
    else {
      this._datalist.append(...results);
      this._datalistOuter.style.display = 'block';
    }
  }

  /**
   * Get last selected value.
   */
  get value() {
    return this._value;
  }

  /**
   * Make sure HTML is setup correctly to use SimpleAutocomplete.
   */
  checkSetup(optionFlag) {
    // If option 1 check for datalist then return.
    if (optionFlag === 1) {
      // If no datalist element
      if (!this._datalistOuter) {
        console.error(
          `No ${this.idString} found. SimpleAutocomplete can not initalize.`
        );
        return false;
      }
      // If setup ok so far return true.
      return true;
    }
    // Option 2 check associated text input exists.
    if (this.associatedInput.type !== 'text')
      throw new TypeError(
        'No previous sibling input element found ! Please see setup instructions.'
      );
  }

  /**
   * Add head and body to datalist.
   */
  addDatalistInnerDivs() {
    this._datalistOuter.classList.add('datalist-outer');

    const header = this.makeDatalistHeader();
    const body = document.createElement('div');
    body.classList.add('datalist');
    this._datalist = body;

    this._datalistOuter.appendChild(header);
    this._datalistOuter.appendChild(body);
  }

  /**
   * Make header for datalist. Includes close button.
   */
  makeDatalistHeader() {
    const header = document.createElement('div');
    header.classList.add('datalist-header');

    // Close datalist button.
    let closeSpan;

    // Add X symbol using FontAwesome or not.
    if (this.useFA)
      closeSpan = '<i class="fas fa-window-close fa-lg close-datalist"></i>';
    else closeSpan = '<span class="close-datalist html-entity">&#x274E</span>';

    header.innerHTML = closeSpan;

    return header;
  }

  /**
   * Listener for closing the datalist.
   */
  addCloseDataListListener() {
    this._datalistOuter.addEventListener(
      'click',
      this.closeDatalist.bind(this)
    );
  }

  /**
   * Close Datalist.
   */
  closeDatalist(e) {
    // If there is an event object and the click was not the close datalist button return.
    if (e && ![...e.target.classList.values()].includes('close-datalist'))
      return;
    // Close datalist.
    this._datalistOuter.style.display = 'none';
  }

  /**
   * Listener for user selection one of the datlist options.
   */
  addOptionSelectListener() {
    this._datalist.addEventListener('click', this.optionSelected.bind(this));
  }

  /**
   * Actions to perform after user selects an autocomplete option.
   */
  optionSelected(e) {
    // Must click <option> with value set.
    if (!e.target.value) return;
    this.closeDatalist();
    this.associatedInput.value = e.target.value;
    this._value = e.target.value;
    if (this.callback) this.callback();
  }
}
