'use strict';

/*
/* Gastronaut home page main search form related functions.
*/
class FormFuncts {
  constructor() {
    this.$locationInput = $('#location');
    this.$searchTerm = $('#keywords');
    this.$mainForm = $('#main-form');
    this.$categoryButtons = $('#cat-btns');

    // Keyup timer for autosearch and keyup autosearch delay.
    this.keyupTimer = null;
    this.autoSearchDelay = 1000;
    // Used to reset form when passed into setForm method.
    this.defaultFormState = [
      { name: 'location', value: '' },
      { name: 'term', value: '' },
      { name: 'price-1', value: '1' },
      { name: 'price-2', value: '2' },
      { name: 'price-3', value: '3' },
      { name: 'price-4', value: '4' },
      { name: 'sort_by', value: 'best_match' },
    ];

    this.addAutocompleteLocation();
    this.addLocationSubmitListener();
    this.addDetectLocationListener();
    this.addKeywordKeyupListener();
    this.addFormChangeListener();
    this.addCategoryClickListener();
    this.initOpenNowAtToggleLogic();
    this.addClearFiltersListener();
    this.addMakeDollarsGreenListener();
    this.initRadiusInputToggleLogic();
    this.initRadiusDisplayLogic();
  }

  /*
  /* Set Lng/lat data from hidden inputs then remove hidden inputs.
  */
  setLngLatFromHiddenInputs() {
    Map_Obj.latitude = +$('#main-form input[name=lat]').val();
    Map_Obj.longitude = +$('#main-form input[name=lng]').val();
    $('#main-form input[name=lat]').remove();
    $('#main-form input[name=lng]').remove();
  }

  /*
  /* Check localStorage for last choosen category and set active
  */
  setCategoryFromStorage() {
    // check for category. if none set to all.
    let currCat = localStorage.getItem('category');
    if (!currCat) {
      // set default.
      localStorage.setItem('category', 'restaurants');
      currCat = 'restaurants';
    }
    Animations_Obj.category = currCat;
    // set list-group button to active for current category
    this.$categoryButtons.children().each(function (index) {
      if ($(this).val() === currCat) {
        $(this).addClass('active');
        // set card-map-zone filter display to category name
        $('.cat-display').text($(this).text());
      }
    });
  }

  /*
  /* Check localStorage for data to bring form to last state.
  */
  updateFormFromStorage() {
    // check for data if none return
    let data = localStorage.getItem('formData');
    if (!data) {
      this.setTransactions([]);
      // Looks like new user without data show tips modal.
      setTimeout(() => $('#tips-modal').modal(), 10000);
      return;
    }
    this.setForm(JSON.parse(data));
    // set the interface (transactions) options on the form
    this.setFormTransactions(JSON.parse(localStorage.getItem('transactions')));
  }

  /*
  /* Set form interface (transactions) checkboxes.
  */
  setFormTransactions(transactions) {
    if (!transactions) return;
    ['delivery', 'pickup', 'restaurant_reservation'].forEach(id => {
      if (transactions.includes(id)) $(`#${id}`).prop('checked', true);
      else $(`#${id}`).prop('checked', false);
    });
  }

  /*
  /* Set form data for yelp parameters from local storage or reset to default.
  */
  setForm(data) {
    if (data === 'default') data = this.defaultFormState;
    data = Base.convertDataArrayToObj(data);

    // set location
    if (data.location) this.$locationInput.val(data.location);
    this.keywordDisplayLogic(data.term);
    this.setOpenAt(data.open_at);
    this.setCheckboxes(data);
    this.setSortBy(data.sort_by);
    this.setPriceGroupGreen();
    this.setRadius(data.radius);
  }

  /*
  /* Turn keyword input orange or not with keyword input
  /* and display keyword in keyword display.
  */
  keywordDisplayLogic(term) {
    if (term) {
      $('.keyword-display').text(` - ${term}`);
      this.$searchTerm.val(term).addClass('bg-orange');
    } else {
      $('.keyword-display').text(``);
      this.$searchTerm.val('').removeClass('bg-orange');
    }
  }

  /*
  /* if open_at data enable datetime input, add value, and check box.
  */
  setOpenAt(open_at) {
    if (open_at) {
      $('#open_at').val(open_at).prop('disabled', false);
      $('#open-at-checkbox').prop('checked', true);
    } else {
      $('#open_at').prop('disabled', true);
      $('#open-at-checkbox').prop('checked', false);
    }
  }

  /*
  /* Set checkboxes based on form data.
  */
  setCheckboxes(data) {
    // inputs to run through and check or uncheck
    const inputIds = [
      'open_now',
      'price-1',
      'price-2',
      'price-3',
      'price-4',
      'hot_and_new',
      'reservation',
      'cashback',
      'deals',
      'wheelchair_accessible',
      'open_to_all',
      'gender_neutral_restrooms',
    ];

    // For inputIds array if data object has the input id as a key
    // make that input checked, otherwise un-check.
    inputIds.forEach(id => {
      if (data[id]) $(`#${id}`).prop('checked', true);
      else $(`#${id}`).prop('checked', false);
    });
  }

  /*
  /* Set sort_by radio buttons,
  */
  setSortBy(sort_by) {
    // set sort_by radio to stored value, un-check other options.
    const sortByOptions = ['best_match', 'rating', 'review_count', 'distance'];
    sortByOptions.forEach(id => {
      if (sort_by === id) $(`#${id}`).prop('checked', true);
      else $(`#${id}`).prop('checked', false);
    });
  }

  /*
  /* For each price option if it is checked make icon green.
  */
  setPriceGroupGreen() {
    // make dollar signs green
    $('#price-group')
      .children()
      .each(function (index) {
        if ($(this).children().prop('checked')) $(this).addClass('txt-green');
        else $(this).removeClass('txt-green');
      });
  }

  /*
  /* Set sort_by radio buttons,
  */
  setRadius(radius) {
    // enable radius input and update value if radius data present
    if (radius) {
      $('#radius')
        .prop('disabled', false)
        .val(radius)
        .parent()
        .prev()
        .addClass('txt-green')
        .addClass('dark-green-outline')
        .children()
        .prop('checked');
      $('.radiusDisplay')
        .removeClass('bg-disabled')
        .text(CardsModalsFactoryObj.funct.metersToMiles(radius));
    } else {
      $('#radius')
        .prop('disabled', true)
        .val(16094)
        .parent()
        .prev()
        .removeClass('txt-green')
        .removeClass('dark-green-outline')
        .children()
        .prop('checked', false);
      $('.radiusDisplay').addClass('bg-disabled').text(10);
    }
  }

  /*
  /* Add autocomplete location suggestions.
  */
  addAutocompleteLocation() {
    this.$locationInput.on(
      'keyup',
      async function (e) {
        const key = e.which || e.keyCode;
        if (key === 13) return;
        // If location suggestion clicked search yelp.
        if (key === undefined) {
          this.locationSearch();
          return;
        }
        const query = this.$locationInput.val();
        if (query.length < 3) return;

        const features = await Map_Obj.geocode(query);
        let options = '';
        features.forEach(el => {
          options = `${options}<option value="${el.place_name}"></option>`;
        });
        $('#datalist-location').html(options);
      }.bind(this)
    );
  }

  /*
  /* When form is submitted check for location to make search.
  */
  addLocationSubmitListener() {
    this.$locationInput.on(
      'keydown',
      function (e) {
        const key = e.which || e.keyCode;
        if (key === 13) {
          this.locationSearch();
        }
      }.bind(this)
    );
  }

  locationSearch() {
    if (this.$locationInput.val()) {
      $('.spinner-zone').show();
      IndexSearchObj.searchYelp();
      this.$searchTerm.focus();
      this.$searchTerm.blur();
    }
  }

  /*
  /* Detect location button fuctionality. Call detectLocation.
  */
  addDetectLocationListener() {
    $('#detect-location').on('click', function (e) {
      $(this).children().removeClass('pulse-5');
      Geolocation_Obj.detectLocation(e);
    });
  }

  /*
  /* Auto search with search term input change.
  */
  addKeywordKeyupListener() {
    const this_ = this;
    this.$searchTerm.on('keyup', function (e) {
      clearTimeout(this_.keyupTimer);
      $('.spinner-zone').show();
      const term = this_.$searchTerm.val();
      this_.keyupTimer = setTimeout(function () {
        IndexSearchObj.searchYelp();
        this_.keywordDisplayLogic(term);
      }, this_.autoSearchDelay);
    });
  }

  /*
  /* Auto search with other form input changes.
  */
  addFormChangeListener() {
    const this_ = this;
    this.$mainForm.on('change', '.onChange', function (e) {
      clearTimeout(this_.keyupTimer);
      // if the form change is the checking of "open at"
      // but no datetime entered yet return.
      if (
        $(this).prop('id') === 'open-at-checkbox' &&
        $(this).prop('checked') === true &&
        $('#open_at').val() === ''
      )
        return;
      $('.spinner-zone').show();
      this_.keyupTimer = setTimeout(function () {
        IndexSearchObj.searchYelp();
      }, this_.autoSearchDelay);
    });
  }

  /*
  /* Auto search with category input change.
  /* Set clicked category to active.
  /* Set category in local storage and display in filter display.
  */
  addCategoryClickListener() {
    const this_ = this;
    this.$categoryButtons.on('click', 'button', function (e) {
      clearTimeout(this_.keyupTimer);
      $('.spinner-zone').show();
      Animations_Obj.category = e.target.value;
      $('.cat-display').text(e.target.textContent);
      this_.turnActiveOffCatBtns();
      $(this).addClass('active');
      this_.keyupTimer = setTimeout(function () {
        IndexSearchObj.searchYelp();
      }, this_.autoSearchDelay);
    });
  }

  /*
  /* Exclusive checkbox inputs "open now" and "open at" logic.
  */
  initOpenNowAtToggleLogic() {
    // When "open now" checked uncheck "open at".
    $('#open_now').on('click', function (e) {
      // uncheck "open at" and disable datetime input
      $('#open-at-checkbox').prop('checked', false);
      $('#open_at').prop('disabled', true);
    });
    // When "open at" checked uncheck "open now".
    // Additionaly, "open at" needs a datetime input enabled
    // and disabled when it is checked and unchecked.
    $('#open-at-checkbox').on('click', function (e) {
      // uncheck "open now"
      $('#open_now').prop('checked', false);
      // enable or disable datetime input as input is checked or unchecked
      if ($('#open-at-checkbox').prop('checked')) {
        $('#open_at').prop('disabled', false);
      } else {
        $('#open_at').prop('disabled', true);
      }
    });
  }

  /*
  /* Clear All Filters button fuctionality.
  */
  addClearFiltersListener() {
    const this_ = this;
    $('#clear-filters').on('click', function (e) {
      $('.spinner-zone').show();
      this_.setForm('default');
      this_.setFormTransactions([]);
      IndexSearchObj.searchYelp();
    });
  }

  /*
  /* Turn dollar signs green when checkbox is checked by user.
  */
  addMakeDollarsGreenListener() {
    $('#price-group').on('change', function (e) {
      const parent = e.target.parentElement;
      parent.classList.toggle('txt-green');
    });
  }

  /*
  /* Enable and disable radius range input with power button
  /* that is located under Search Radius header.
  /* Turn button green when radius input is enabled.
  /* Turn display background muted or white.
  */
  initRadiusInputToggleLogic() {
    const this_ = this;
    $('#radius-check').on('click', function () {
      const $radius = $('#radius');
      if ($radius.prop('disabled') === true) {
        $radius.prop('disabled', false);
      } else {
        $radius.prop('disabled', true);
      }
      $('.radiusDisplay').toggleClass('bg-disabled');
      $radius.parent().prev().toggleClass(['txt-green', 'dark-green-outline']);
    });
  }

  /*
  /* Update radius display with range input change.
  */
  initRadiusDisplayLogic() {
    $('#radius').on('change', function () {
      $('.radiusDisplay').text(
        CardsModalsFactoryObj.funct.metersToMiles($(this).val())
      );
    });
  }

  /*
  /* Turn active off for all category buttons.
  */
  turnActiveOffCatBtns() {
    this.$categoryButtons.children().each(function (index) {
      $(this).removeClass('active');
    });
  }

  /*
  /* Set locaton value if there is a data object
  /* and there is locaton attribute on that object.
  /* Used by page-load navbar search to show results
  /* at last enterd location.
  */
  setLocationValue() {
    let data = localStorage.getItem('formData');
    // Set location from storage if there was location previously given.
    if (data) {
      data = JSON.parse(data);
      data = Base.convertDataArrayToObj(data);
      if (data.location) this.$locationInput.val(data.location);
    } else {
      // Looks like new user without data show tips modal.
      setTimeout(() => $('#tips-modal').modal(), 10000);
    }
  }

  /*
  /* If filters are on show filter indicator.
  */
  filterIndicatorCheck() {
    const formArray = this.$mainForm.serializeArray();
    // no need to show filter indicator for these inputs
    const notFilters = ['location', 'sort_by', 'lng', 'lat'];
    let initLength = formArray.length;
    const withoutPrices = formArray.filter(
      obj => obj.name.substring(0, 5) !== 'price'
    );
    // number of price options slected
    const numPrices = initLength - withoutPrices.length;
    if (
      // if prices filters in use
      numPrices === 1 ||
      numPrices === 2 ||
      numPrices === 3 ||
      // if transactions filters in use
      this.getTransactions().length > 0 ||
      // if any of the other filter inputs are n use
      withoutPrices.some(obj => {
        if (!notFilters.includes(obj.name) && obj.value !== '') return true;
      })
    )
      // turn filter indicator on
      $('.filter-icon-display').each(function () {
        $(this).show();
      });
    // turn filter indicator off
    else
      $('.filter-icon-display').each(function () {
        $(this).hide();
      });
  }

  /*
  /* Get current form data as obj array.
  /* Store in local storage as "formData".
  */
  setFormDataArray(data) {
    data = data ? data : this.$mainForm.serializeArray();
    localStorage.setItem('formData', JSON.stringify(data));
  }

  /*
  /* Save transactions data in local storage.
  */
  setTransactions(transactions) {
    transactions = transactions ? transactions : this.getTransactions();
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  /*
  /* Get current interface form data as array of strings.
  /* Used to filter results after api call.
  */
  getTransactions() {
    const transactions = [];
    $('.interface:checked').each(function (index) {
      transactions.push($(this).val());
    });
    if (transactions.length > 0) $('.resultsCount').addClass('bg-disabled');
    else $('.resultsCount').removeClass('bg-disabled');
    return transactions;
  }

  /*
  /* Check if transactions have changed.
  /* Compare form data to storage data.
  */
  checkTransactionsChange() {
    const transactions = JSON.stringify(this.getTransactions());
    const prevTransactions = localStorage.getItem('transactions');
    return transactions !== prevTransactions;
  }

  /*
  /* Get current form data plus lat, lng, and category
  /* as query string for search request api endpoint.
  */
  getFormData() {
    let data = this.$mainForm.serialize();
    data = `${data}&categories=${Animations_Obj.category}&limit=50`;
    if (Map_Obj.latitude)
      data += `&latitude=${Map_Obj.latitude.toFixed(
        3
      )}&longitude=${Map_Obj.longitude.toFixed(3)}`;
    return data;
  }

  focusBlur() {
    this.$locationInput.focus();
    this.$locationInput.blur();
  }
}

const FormFunctsObj = new FormFuncts();
