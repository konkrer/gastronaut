'use strict';

//
// Cards and Modals cards factory class.
//
class CardsModalsFactory {
  constructor() {
    this.funct = new CardModalTextHtmlFunctions();
  }

  //
  // Get cards for index page dragscroll card track. Filter for transactions.
  //
  getCardsHtml(businesses) {
    let cards = '';
    const transactions = FormFunctsObj.getTransactions();
    businesses.forEach(business => {
      cards += this.filterForTransactions(transactions, business);
    });
    return cards;
  }

  //
  // Post filtering for Yelp results for transaction type.
  //
  filterForTransactions(transactions, business) {
    // if no transactrions selected no filtering
    if (transactions.length === 0) return this.makeCard(business);
    // filter for transactions
    else if (
      // if transactions specified and business has one of specifed
      // transactions make card.
      transactions.length > 0 &&
      business.transactions.some(str => transactions.includes(str))
    ) {
      return this.makeCard(business);
    }
    return '';
  }

  //
  // Get card showing no results were found.
  //
  getNoResultsCard() {
    return `
    <div class="my-card flx-std no-results"
    >
      <div class="txt-warning brand-outline txt-xxl">
      No Results!
      </div>
    </div>
    `;
  }

  //
  // Get hidden card for spacing. Put in card track after last card.
  //
  addDummyCard() {
    const html = `
    <div class="my-card dummy-card d-inline-block">
      <div class="my-card-img-div"></div>
    </div>
    `;
    $('.card-track-inner').append(html);
  }

  //
  // Report error of api call to user.
  //
  errorCard(data) {
    alert(`${data.error.code}, ${data.error.description}`);
  }

  //
  // Make card html for index page dragscroll card track.
  //
  makeCard(business) {
    const {
      name,
      rating,
      price,
      categories,
      phone,
      display_phone,
      transactions,
      image_url,
      id,
      is_closed,
      distance,
      coordinates: { latitude, longitude },
      location: {
        city,
        state,
        country,
        display_address: [street, city_disp],
      },
    } = business;

    return `
    <div class="my-card mr-card bg-dark txt-black d-inline-block">
      <div
        style="
          background: url('${image_url}');
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
        "
        class="my-card-img-div"
      ></div>
      <div class="card-body">
        <h5 class="card-title txt-black"><b>${name}</b></h5>
        <p class="card-text">
          ${this.funct.makeCategoriesText(categories)} ${
      is_closed ? '- Closed' : ''
    }
        </p>
        <button
          class="btn btn-sm btn-primary-alt2 btn-my-card mr-2 mr-sm-1 mr-md-2 px-3 px-sm-2 px-md--3 brand-outline txt-warning detailsBtnCard"
          data-toggle="tooltip"
          title="Details"
        >
          <i class="fas fa-clipboard-list fa-lg"></i>
        </button>
        <button
          class="btn btn-sm btn-primary-alt2 btn-my-card cardMapButton brand-outline txt-warning mr-2 mr-sm-1 mr-md-2 px-3 px-sm-2 px-md--3"
          data-toggle="tooltip"
          title="Show on Map"
        >
          <i class="fas fa-map-marked-alt fa-lg"></i>
        </button>
        <span data-toggle="tooltip" title="Add to Mission">
          <button
            class="btn btn-sm btn-primary-alt2 btn-my-card mission-btn"
            data-toggle="modal"
            data-target="#mission-choices"
            data-city="${city}"
            data-state="${state}"
            data-country="${country}"
            data-name="${name}"
            data-lng="${longitude}"
            data-lat="${latitude}"
            data-id="${id}"
          >
            <i class="fas fa-plus-square mr-2"></i>
            <i class="fas fa-rocket fa-lg txt-warning brand-outline"></i>
          </button>
        </span>
      </div>
      <ul class="list-group list-group-flush bg-transparent">
        <li class="list-group-item bg-transparent text-secondary card-text-noHover">
          ${this.funct.makeReviewStars(rating)}
        </li>
        <li class="list-group-item bg-transparent card-text-noHover">
          ${this.funct.makePriceDollars(price)}
        </li>
        ${this.funct.makeTransactionsHtml(transactions)}  
        ${this.funct.makePhoneHtml(phone, display_phone)}  
        <li class="list-group-item bg-transparent card-text-noHover">
          <div>${street ? street : ''}</div>
          <div>${city_disp ? city_disp : ''}</div>
        </li>
        <li class="list-group-item bg-transparent card-text-noHover">
          ${this.funct.metersToMiles(distance)} mi
        </li>
      </ul>
    </div>`;
  }

  //
  // Make business deatils modal html.
  //
  makeDetailModal(business) {
    // unpack data items for card display
    const {
      name,
      rating,
      review_count,
      price,
      categories,
      phone,
      display_phone,
      transactions,
      is_closed,
      photos,
      hours,
      coordinates: { latitude: lat, longitude: lng },
      location: {
        display_address: [street, city_disp],
      },
    } = business;

    if (hours) var { open, is_open_now } = hours[0];

    const modalFooter = `${this.funct.makeModalFooter(business)}`;

    return `
      <div class="modal-dialog modal-dialog-centered modal-lg text-center museo" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <div></div>
            <h5 class="modal-title txt-warning" id="businessDetailTitle">
              ${name}
            </h5>
            <button
              type="button"
              class="close ssp"
              data-dismiss="modal"
              aria-label="Close"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="carousel slide border border-left-0 border-right-0"
          data-ride="carousel" id="report-carousel">
            <ol class="carousel-indicators">
              <li data-target="#report-carousel" data-slide-to="0" class="active"></li>
              <li data-target="#report-carousel" data-slide-to="1"></li>
              <li data-target="#report-carousel" data-slide-to="2"></li>
            </ol>
            <div class="carousel-inner">
              ${this.funct.makeCarouselItemsHtml(photos)}
            </div>
          </div>
          <div class="modal-body">
            <p class="card-text px-4 txt-lg">
              ${this.funct.makeCategoriesText(categories)} ${
      is_closed ? '- Closed' : ''
    }
            </p>
            <p class="txt-green dark-green-outline txt-lg">
              ${is_open_now ? 'Open Now <i class="far fa-clock ml-1"></i>' : ''}
            </p>
            <ul class="list-group list-group-flush bg-transparent">
              <li
                class="list-group-item bg-transparent text-secondary card-text-noHover"
              >
                ${this.funct.makeReviewStarsWithHalves(
                  rating
                )} <span style="position: absolute;" class="ml-1">(${review_count})</span>
              </li>
              <li class="list-group-item bg-transparent card-text-noHover">
                ${this.funct.makePriceDollars(price)}
              </li>
              ${this.funct.makeTransactionsHtml(transactions)}
              ${this.funct.makePhoneHtml(phone, display_phone)}
              <li class="list-group-item bg-transparent">
              <a target="_blank"
                 href="https://www.google.com/maps/dir/?api=1&origin=${this.funct.makeOriginString()}&destination=${lat},${lng}&dir_action=navigate"
                >
                  <div>${street ? street : ''}</div>
                  <div>${city_disp ? city_disp : ''}</div>
                </a>
              </li>
              <li class="list-group-item bg-transparent card-text-noHover">
                <div class="flx-std">
                  ${this.funct.makeHoursTable(open)}
                </div>
              </li>
            </ul>
          </div>
          ${modalFooter}       
          <div>${this.funct.makeReportsForDetailModal(business)}</div>
          <div>${this.funct.makeReviewsForDetailModal(business)}</div>
          ${modalFooter}       
        </div>
      </div>`;
  }
}

//
// Class to create text for business cards and modals. Some methods
// return html with text.
//
class CardModalTextHtmlFunctions {
  constructor() {}

  //
  // Make business categories text for cards and modals.
  //
  makeCategoriesText(categories) {
    return categories.reduce((acc, obj, i) => {
      if (i === 0) return `${acc}${obj.title}`;
      return `${acc} - ${obj.title}`;
    }, '');
  }

  //
  // Make price dollar text for cards and modals.
  //
  makePriceDollars(price) {
    if (!price) return 'UNKNOWN';
    let dollars = '';
    for (let idx = 0; idx < price.length; idx++) {
      dollars +=
        '<i class="fas fa-dollar-sign fa-lg dark-green-outline txt-green mr-2"></i>';
    }
    return dollars;
  }

  //
  // Make review stars text for cards and modals.
  //
  makeReviewStars(rating) {
    let stars = '';
    for (let idx = 0; idx < rating; idx++) {
      stars = `${stars}${'<i class="far fa-star fa-lg yellow-outline mr-2"></i>'}`;
    }
    return stars;
  }

  //
  // Make reviews stars text for cards and modals. Show half stars.
  //
  makeReviewStarsWithHalves(rating) {
    let stars = '';
    for (let idx = 0; idx < parseInt(rating); idx++) {
      stars = `${stars}${'<i class="far fa-star fa-lg yellow-outline mr-2"></i>'}`;
    }
    if (rating % 1)
      stars = `${stars}${'<i class="far fa-star-half fa-lg yellow-outline mr-2"></i>'}`;
    return stars;
  }

  //
  // Make transactions html for cards and modals.
  //
  makeTransactionsHtml(transactions) {
    if (transactions.length === 0) return '';
    const trans_text = transactions.reduce((acc, str, i) => {
      str = str === 'restaurant_reservation' ? 'reservations' : str;
      if (i === 0) return `${str.toUpperCase()}`;
      return `${acc} - ${str.toUpperCase()}`;
    }, '');

    return `<li class="list-group-item bg-transparent card-text-noHover">${trans_text}</li>`;
  }

  //
  // Make phone number html for cards and modals.
  //
  makePhoneHtml(phone, display_phone) {
    return phone
      ? `
      <li class="list-group-item bg-transparent"> 
        <a href="tel:${phone}">${display_phone}</a> 
      </li>`
      : '';
  }

  //
  // If there is user location data make origin string for google directions.
  //
  makeOriginString() {
    return typeof Map_Obj !== 'undefined' && Map_Obj.longitude
      ? `${Map_Obj.latitude},${Map_Obj.longitude}`
      : '';
  }

  //
  // Make image carousel html for cards and modals.
  //
  makeCarouselItemsHtml(photos) {
    return photos.reduce((acc, photo, idx) => {
      const html = `
        <div class="carousel-item ${idx == 0 ? 'active' : ''}">
          <div
            style="
              background: url('${photo}');
              background-size: cover;
              background-repeat: no-repeat;
              background-position: center;
            "
            class="detail-modal-img-div"
          ></div> 
        </div>`;
      return `${acc}${html}`;
    }, '');
  }

  //
  // Make business hours html table for cards and modals.
  //
  makeHoursTable(open) {
    if (!open) return '';

    const [mo, tu, we, th, fr, sa, su] = open;
    return `
      <table class="">
      <thead>
        <tr>
          <th>Mo</th>
          <th>Tu</th>
          <th>We</th>
          <th>Th</th>
          <th>Fr</th>
          <th>Sa</th>
          <th>Su</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            ${this.convertTime(mo ? mo.start : null)}
          </td>
          <td>
            ${this.convertTime(tu ? tu.start : null)}
          </td>
          <td>
            ${this.convertTime(we ? we.start : null)}
          </td>
          <td>
            ${this.convertTime(th ? th.start : null)}
          </td>
          <td>
            ${this.convertTime(fr ? fr.start : null)}
          </td>
          <td>
            ${this.convertTime(sa ? sa.start : null)}
          </td>
          <td>
            ${this.convertTime(su ? su.start : null)}
          </td>
        </tr>
        <tr>
          <td>
            ${this.convertTime(mo ? mo.end : null)}
          </td>
          <td>
            ${this.convertTime(tu ? tu.end : null)}
          </td>
          <td>
            ${this.convertTime(we ? we.end : null)}
          </td>
          <td>
            ${this.convertTime(th ? th.end : null)}
          </td>
          <td>
            ${this.convertTime(fr ? fr.end : null)}
          </td>
          <td>
            ${this.convertTime(sa ? sa.end : null)}
          </td>
          <td>
            ${this.convertTime(su ? su.end : null)}
          </td>
        </tr>
      </tbody>
    </table>`;
  }

  //
  // Make footer for business detail modal.
  //
  makeModalFooter(business) {
    const {
      name,
      id,
      url,
      coordinates: { latitude: lat, longitude: lng },
      location: { city, state, country },
    } = business;

    return `
  <div class="modal-footer">
    <div>
      <a href="${url}" class="txt-yelp-red" target="_blank">
        <i class="fab fa-yelp fa-lg" ></i>
      </a>
    </div>
    <div>
      <span data-toggle="tooltip" title="Add to Mission">
        <button
          class="btn btn-primary-alt2 mission-btn mr-1"
          data-toggle="modal"
          data-target="#mission-choices"
          data-dismiss="modal"
          data-city="${city}"
          data-state="${state}"
          data-country="${country}"
          data-name="${name}"
          data-lng="${lng}"
          data-lat="${lat}"
          data-id="${id}"
        >
          <i class="fas fa-plus-square mr-2"></i>
          <i class="fas fa-rocket fa-lg txt-warning brand-outline"></i>
        </button>
      </span>
      <span data-toggle="tooltip" title="Write Report">
        <a href="/report?business_id=${id}&cancel_url=javascript:Base_Obj.close_current_tab()" target="_blank">
          <button type="button" class="btn btn-primary-alt2 mr-1 writeReport">      
            <i class="fas fa-pen-alt brand-outline txt-warning iconBtn fa-lg"></i>
          </button>
        </a>
      </span>
      <button
        type="button"
        class="btn btn-outline-secondary txt-white-k ssp detail-close-btn"
        data-dismiss="modal"
      >
        Close
      </button>
    </div>
  </div>`;
  }

  //
  // Make Report cards that go inside business details modal.
  //
  makeReportsForDetailModal(business) {
    const reportCards = business.reports.reduce((acc, report) => {
      const {
        report_id,
        submitted_on,
        text,
        photo_file,
        photo_url,
        likes,
        username,
        allowLikes,
        userLoggedIn,
        liked,
      } = report;

      const html = `
    <div class="card d-inline-block my-2 mx-1 text-left mb-4 mb-lg-5 detailReport card-shadow"
    data-id="${report_id}">
      <div class="card-header pt-3">
        <h5 class="mb-0">
          ${business.name}
        </h5>
        <h5 class="lead txt-green black-outline-1"><small>Business Report</small></h5>
        <div class="card-text">
          <a href="/user/profile/${username}" target="_blank">
            <em class="txt-warning black-outline-1"> by @${username}</em>
          </a>
          <div class="txt-smlr">
            ${submitted_on}
          </div>
        </div>
      </div>
      <div class="card-body">
        ${this.makeParagraphs(text)} 
        ${this.reportImageUrl(photo_file, photo_url)}
      </div>
  
      <div class="card-footer">
        ${this.addLikesButton(
          userLoggedIn,
          allowLikes,
          report_id,
          business.id,
          liked
        )}
        <span class="pl-1 pl-md-3 text-dark likes">
          ${likes}
        </span>
        ${this.addReadMoreText(text, report_id)}
      </div>
    </div>`;

      return `${acc}${html}`;
    }, '');
    const seeMoreBtn = business.more_results
      ? `<a href="/reports/business/${business.id}" target="_blank">
         <button class="btn btn-primary">See More Reports</button></a>`
      : '';
    // If there are report cards prepend with Reports header and add see more reports button.
    return reportCards
      ? `<h4 class="text-left text-info ml-3 ml-lg-5 mt-4 mb-4">Reports</h4>${reportCards}${seeMoreBtn}`
      : '';
  }

  //
  // Make Yelp review cards that go inside business details modal.
  //
  makeReviewsForDetailModal(business) {
    const reportCards = business.reviews.reduce((acc, review) => {
      const {
        rating,
        user: { name },
        text,
        time_created,
        url,
      } = review;

      const html = `
    <div class="card d-inline-block my-2 mx-1 text-left mb-4 mb-lg-5 card-shadow">
      <div class="card-header pt-3">
        <h5 class="mb-0">
          ${business.name}
        </h5>
        <div class="my-2 txt-xs">${this.makeReviewStarsWithHalves(rating)}</div>
        <div class="card-text">
          <em class="txt-warning black-outline-1"> by ${name}</em>
          <div class="txt-smlr">
            ${time_created}
          </div>
        </div>
      </div>
      <div class="card-body">
        ${text}
      </div>
      <div class="card-footer text-right">
        <a href="${url}" target="_blank">Read More</a>
      </div>
    </div>`;

      return `${acc}${html}`;
    }, '');

    // Prepend header if there are Yelp review cards.
    return reportCards
      ? `<h4 class="text-left text-info ml-3 ml-lg-5 mt-4 mb-4">Yelps</h4>${reportCards}`
      : '';
  }

  //
  // Make report text paragraphs. Put each paragraph into a
  // seperate <p> element for cards and modals.
  //
  makeParagraphs(text) {
    // Only show first 500 chars.
    if (text.length > 500) {
      text = text.slice(0, 499);
      var sliced = true;
    }
    let paragraphs = text.split('\n');
    // Return the html string with the <p> elements and text.
    return paragraphs.reduce((acc, str, idx) => {
      if (!str) return acc;
      if (sliced && idx + 1 === paragraphs.length) str += '...';
      const html = `
        <p>${str}</p>`;
      return `${acc}${html}`;
    }, '');
  }

  //
  // Make html for image for business.
  //
  reportImageUrl(photo_file, photo_url) {
    if (!photo_file && !photo_url) return '';
    return `
      <div class="flx-std">
        <img src="${
          photo_file || photo_url
        }" alt="User Image" class="img-fluid" />
      </div>`;
  }

  //
  // Make html for like buttons on cards.
  //
  addLikesButton(userLoggedIn, allowLikes, report_id, business_id, liked) {
    if (!userLoggedIn) {
      // fullPath for next page functionality.
      const pathname = window.location.pathname;
      const searchString = window.location.search.replace(/&/g, ';');
      const fullPath = `${pathname}${searchString}`;
      return `
      <button
        type="button"
        class="like-button text-primary signLogBtn"
        data-toggle="modal"
        data-target="#signupModal"
        data-dismiss="modal"
        data-next_url="${fullPath}"
      >
        <i class="far fa-thumbs-up fa-lg"></i>
      </button>`;
    }
    if (allowLikes)
      return `
      <a href="#" class="card-link like-report likeModal" 
      data-report_id="${report_id}" data-business_id="${business_id}">
        <span>
          ${
            liked
              ? `<i class="fas fa-thumbs-up fa-lg"></i>
                 <i class="far fa-thumbs-up fa-lg" style="display: none;"></i>`
              : `<i class="far fa-thumbs-up fa-lg"></i>
                 <i class="fas fa-thumbs-up fa-lg" style="display: none;"></i>`
          }
        </span>
      </a>
      `;
    return `
      <span>
        <i class="fas fa-thumbs-up fa-lg text-primary"></i>
      </span>`;
  }

  //
  // Make html for read more link when report is longer than 500 chars.
  //
  addReadMoreText(text, report_id) {
    if (text.length > 500)
      return `
      <a href="/report/${report_id}" class="float-right" target="_blank"
      >Read More</a>`;
    return '';
  }

  //
  // Convert meters to miles to one decimal place.
  //
  metersToMiles(num) {
    return (num * 0.00062137).toFixed(1);
  }

  //
  // Convert 24hr format time to AM/PM style time.
  //
  convertTime(time_in) {
    if (time_in === null) return '-:-';

    // If before 1200 (noon) it is AM.
    const am_pm = time_in / 1200 >= 1 ? 'PM' : 'AM';
    // Calculate hour.
    let hour = Math.floor((time_in % 1200) / 100);
    // If hour is 0 make it 12.
    hour = hour == 0 ? 12 : hour;
    // Calculate minutes.
    let minutes = time_in % 100;
    // Change 0 minutes to 00.
    minutes = minutes == 0 ? '00' : minutes;

    return `${hour}:${minutes} ${am_pm}`;
  }
}

const CardsModalsFactoryObj = new CardsModalsFactory();
