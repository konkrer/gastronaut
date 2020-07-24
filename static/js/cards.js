'use strict';

function makeCategoriesText(categories) {
  return categories.reduce((acc, obj, i) => {
    if (i === 0) return `${acc}${obj.title}`;
    return `${acc} - ${obj.title}`;
  }, '');
}

function makePriceDollars(price) {
  if (!price) return 'UNKNOWN';
  let dollars = '';
  for (let idx = 0; idx < price.length; idx++) {
    dollars +=
      '<i class="fas fa-dollar-sign fa-lg dark-green-outline txt-green mr-2"></i>';
  }
  return dollars;
}

function makeReviewStars(rating) {
  //TODO: ADD half star icon.
  let stars = '';
  for (let idx = 0; idx < rating; idx++) {
    stars = `${stars}${'<i class="far fa-star fa-lg yellow-outline mr-2"></i>'}`;
  }
  return stars;
}

function makeTransactionsText(transactions) {
  if (transactions.length === 0) return '';
  return transactions.reduce((acc, str, i) => {
    str = str === 'restaurant_reservation' ? 'reservations' : str;
    if (i === 0) return `${str.toUpperCase()}`;
    return `${acc} - ${str.toUpperCase()}`;
  }, '');
}

function makeCard(business) {
  // unpack data items for card display
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

  const trans_text = makeTransactionsText(transactions);

  return `
    <div
      class="my-card mr-card bg-dark txt-black d-inline-block""
    >
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
          ${makeCategoriesText(categories)} ${is_closed ? '- Closed' : ''}
        </p>
        <button class="btn btn-sm btn-primary-alt2 btn-my-card font-weight-bold mr-2 mr-sm-1 
        mr-md-2 px-3 px-sm-2 px-md--3 brand-outline txt-orange detailsBtn"
        data-toggle="tooltip"
        title="Details"
        ><i class="fas fa-clipboard-list fa-lg"></i>
        </button>
        <button
          class="btn btn-sm btn-primary-alt2 btn-my-card font-weight-bold cardMapButton brand-outline
          txt-orange mr-2 mr-sm-1 mr-md-2 px-3 px-sm-2 px-md--3"
          data-toggle="tooltip"
          title="Show on Map"
        >
          <i class="fas fa-map-marked-alt fa-lg"></i>
        </button>
        <span data-toggle="tooltip" title="Add to Mission">
          <button
            class="btn btn-sm btn-primary-alt2 btn-my-card mission-btn font-weight-bold px-2" 
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
            <i class="fas fa-rocket fa-lg txt-orange brand-outline"></i>
          </button>
        </span>
      </div>
      <ul class="list-group list-group-flush bg-transparent">
        <li class="list-group-item bg-transparent text-secondary card-text-noHover">
          ${makeReviewStars(rating)}
        </li>
        <li class="list-group-item bg-transparent card-text-noHover">
          ${makePriceDollars(price)}
        </li>    
        ${
          trans_text
            ? '<li class="list-group-item bg-transparent card-text-noHover">'
            : ''
        } 
        ${trans_text}
        ${trans_text ? '</li>' : ''}
        ${phone ? `<li class="list-group-item bg-transparent">` : ''} 
        <a href="tel:${phone}">${display_phone}</a>
        ${phone ? '</li>' : ''}
        <li class="list-group-item bg-transparent card-text-noHover">
          <div>${street ? street : ''}</div>
          <div>${city_disp ? city_disp : ''}</div>
        </li>
        <li class="list-group-item bg-transparent card-text-noHover">
          ${metersToMiles(distance)} mi
        </li>
      </ul>
    </div>
    `;
}

function makeDetailModal(business) {
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
    image_url,
    id,
    is_closed,
    url,
    photos,
    hours,
    // special_hours,
    coordinates: { latitude, longitude },
    location: {
      city,
      state,
      country,
      display_address: [street, city_disp],
    },
  } = business;

  const { open, is_open_now } = hours[0];

  const trans_text = makeTransactionsText(transactions);

  return `
    <div class="modal-dialog modal-dialog-centered modal-lg text-center" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <div></div>
          <h5 class="modal-title txt-orange" id="businessDetailTitle">
            ${name}
          </h5>
          <button
            type="button"
            class="close"
            data-dismiss="modal"
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="carousel slide border border-left-0 border-right-0" data-ride="carousel">
          <div class="carousel-inner">
            <div class="carousel-item active">
              <div
                style="
                  background: url('${photos[0] || image_url}');
                  background-size: cover;
                  background-repeat: no-repeat;
                  background-position: center;
                "
                class="detail-modal-img-div"
              ></div> 
            </div>
            <div class="carousel-item">
              <div
                style="
                  background: url('${photos[1] || image_url}');
                  background-size: cover;
                  background-repeat: no-repeat;
                  background-position: center;
                "
                class="detail-modal-img-div"
              ></div>
            </div>
            <div class="carousel-item">
              <div
                style="
                  background: url('${photos[2] || image_url}');
                  background-size: cover;
                  background-repeat: no-repeat;
                  background-position: center;
                "
                class="detail-modal-img-div"
              ></div>
              </div>
          </div>
        </div>
        <div class="modal-body">
          <p class="card-text px-4 txt-lg">
            ${makeCategoriesText(categories)} ${is_closed ? '- Closed' : ''}
          </p>
          <p class="txt-green dark-green-outline txt-lg">
            ${is_open_now ? 'Open Now <i class="far fa-clock ml-1"></i>' : ''}
          </p>
          <ul class="list-group list-group-flush bg-transparent">
            <li
              class="list-group-item bg-transparent text-secondary card-text-noHover"
            >
              ${makeReviewStars(
                rating
              )} <span style="position: absolute;" class="ml-1">(${review_count})</span>
            </li>
            <li class="list-group-item bg-transparent card-text-noHover">
              ${makePriceDollars(price)}
            </li>
            ${
              trans_text
                ? '<li class="list-group-item bg-transparent card-text-noHover">'
                : ''
            } 
            ${trans_text} 
            ${trans_text ? '</li>' : ''} 
            ${phone ? '<li class="list-group-item bg-transparent">' : ''}
              <a href="tel:${phone}">${display_phone}</a>
            ${phone ? '</li>' : ''}
            <li class="list-group-item bg-transparent card-text-noHover">
              <div>${street ? street : ''}</div>
              <div>${city_disp ? city_disp : ''}</div>
            </li>
          </ul>
        </div>
        <div class="modal-footer">
          <div>
            <a href="${url}" target="blank">
              <i class="fab fa-yelp fa-lg txt-yelp-red" ></i>
            </a>
          </div>
          <div>
            <span data-toggle="tooltip" title="Add to Mission" class="">
              <button
                class="btn btn-sm btn-primary-alt2 btn-my-card mission-btn font-weight-bold px-2"
                data-toggle="modal"
                data-target="#mission-choices"
                data-dismiss="modal"
                data-city="${city}"
                data-state="${state}"
                data-country="${country}"
                data-name="${name}"
                data-lng="${longitude}"
                data-lat="${latitude}"
                data-id="${id}"
              >
                <i class="fas fa-plus-square mr-2"></i>
                <i class="fas fa-rocket fa-lg txt-orange brand-outline"></i>
              </button>
            </span>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary txt-white-k"
              data-dismiss="modal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function filterForTransactions(transactions, business) {
  // if no transactrions selected no filtering
  if (transactions.length === 0) return makeCard(business);
  // filter for transactions
  else if (
    // if transactions specified and business has one of specifed
    // transactions make card.
    transactions.length > 0 &&
    business.transactions.some(str => transactions.includes(str))
  ) {
    return makeCard(business);
  }
  return '';
}

/*
/* Add cards. Filter for transactions.
*/
function getCards(data) {
  let cards = '';
  const transactions = getTransactions();
  data.businesses.forEach(business => {
    cards += filterForTransactions(transactions, business);
  });
  return cards;
}

function getNoResultsCard() {
  return `
  <div class="my-card flx-std no-results"
  >
    <div class="txt-orange brand-outline txt-xxl">
    No Results!
    </div>
  </div>
  `;
}

function addDummyCard() {
  const html = `
  <div class="my-card dummy-card d-inline-block">
    <div class="my-card-img-div"></div>
  </div>
  `;
  $('.card-track-inner').append(html);
}

/*
/* Report error of api call.
*/
function errorCard(data) {
  alert(`${data.error.code}, ${data.error.description}`);
  console.error(data);
}

/*
/* Convert meters to miles to one decimal place.
*/
function metersToMiles(num) {
  return (num * 0.00062137).toFixed(1);
}
