'use strict';

/**
 * Class for autocomplete display and choice functionality.
 *
 * Use: Set up the html in the advised manner. githublink
 *      As you set the datalist property updated contents will be
 *      displayed. As the user selects options they will entered
 *      as the value of the associated text input. An optional
 *      callback can be called upon option selection.
 *
 *      Create one autocomplete class instance per autocomplete display
 *      needed per page. Increment multiAutoCompID input and the
 *      corisponding HTML id appropriately. (i.e. datalist-autocomplete,
 *      datalist-autocomplete-1, datalist-autocomplete-2).
 *
 * Inputs: Callback --> Fuction. (default: null)
 *           Optional function to be called after suggestion selection.
 *
 *         FontAwsome --> Boolean. (default: false)
 *           If font awesome icons are available.
 *
 *         multiAutoCompID --> Number. (default: 0)
 *           Id diferentiation for autocomplete instance.
 *
 *         marginTop --> String. (default: null)
 *           String setting for css margin-top to adjust datalist postion to input.
 */

class SimpleAutocomplete {
  constructor(
    callback = null,
    fontAwsome = false,
    multiAutoCompID = 0,
    marginTop = null,
    fixed = false
  ) {
    this.callback = callback;
    this.useFA = fontAwsome;
    this.marginTop = marginTop;
    this.fixed = fixed;
    // Id string for getting the datalist element for this class instance to suggest/ fill value.
    this.idString = `datalist-autocomplete${
      multiAutoCompID ? '-' + multiAutoCompID : ''
    }`;
    this._datalistOuter = document.getElementById(this.idString);
    this.checkSetup(1);
    this._datalistOuter.classList.add('datalist-outer');
    if (this.marginTop) this._datalistOuter.style.marginTop = this.marginTop;
    if (this.fixed) this._datalistOuter.style.position = 'fixed';
    this._datalist = null;
    this._value = null; // Last selected autocomplete value.
    this.associatedInput = this._datalistOuter.previousElementSibling;
    this.checkSetup(2);
    this.addDatalistInnerDivs(); // Add head and datalist to datalistOuter.
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
   * Get last selected value.
   */
  get value() {
    return this._value;
  }

  /**s
   * Make sure HTML is setup correctly to use SimpleAutocomplete.
   */
  checkSetup(optionFlag) {
    // If option 1 check for datalist then return.
    if (optionFlag === 1) {
      // If no datalist element
      if (!this._datalistOuter) {
        throw new TypeError(
          `No ${this.idString} found. SimpleAutocomplete can not initalize.`
        );
      }
      // If setup ok so far return.
      return;
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
    // If there is an event object and the click was not the close datalist buton return.
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
    // Must click <option>.
    if (!e.target.value) return;
    this.closeDatalist();
    this.associatedInput.value = e.target.value;
    this._value = e.target.value;
    if (this.callback) this.callback();
  }
}
