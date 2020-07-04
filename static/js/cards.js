'use strict';

// let firstCardMade;

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
  let stars = '';
  for (let idx = 0; idx < rating; idx++) {
    stars = `${stars}${'<i class="far fa-star fa-lg yellow-outline mr-2"></i>'}`;
  }
  return stars;
}

function makeTransactionsText(transactions) {
  if (transactions.length === 0) return 'UNKNOWN INTERFACE';
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
    coordinates,
    is_closed,
    location: {
      display_address: [street, city],
    },
  } = business;

  const stars = makeReviewStars(rating);
  const dollars = makePriceDollars(price);
  const trans_text = makeTransactionsText(transactions);
  const { latitude: lat, longitude: lng } = coordinates;

  return `
    <div
      class="my-card mr-card bg-dark txt-black d-inline-block"
      data-id="${id}"
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
        <button class="btn btn-primary font-weight-bold mr-2 mr-sm-1 
        mr-md-2 px-3 px-sm-2 px-md--3 black-outline-1"
        >Details</button>
        <button
          class="btn btn-primary font-weight-bold cardMapButton 
          mr-2 mr-sm-1 mr-md-2 px-3 px-sm-2 px-md--3"
          data-lat="${lat}"
          data-lng="${lng}"
          data-name="${name}"
          data-toggle="tooltip"
          title="Show on Map"
        >
        <i class="fas fa-map-marked-alt fa-lg black-outline-1"></i>
        </button>
        <button
          class="btn btn-primary mission-btn font-weight-bold px-3 px-sm-2 px-md--3" 
          data-toggle="tooltip" title="Add to Mission"
        >
        <i class="fas fa-plus-square mr-2"></i>
        <i class="fas fa-rocket fa-lg txt-orange brand-outline"></i>
        </button>
      </div>
      <ul class="list-group list-group-flush bg-transparent">
        <li class="list-group-item bg-transparent text-secondary card-text-noHover">
          ${stars}
        </li>
        <li class="list-group-item bg-transparent card-text-noHover">${dollars}</li>
        <li class="list-group-item bg-transparent card-text-noHover">
          ${trans_text}
        </li>
        <li class="list-group-item bg-transparent">
          <a href="tel:${phone}">${display_phone}</a>
        </li>
        <li class="list-group-item bg-transparent card-text-noHover">
          <div>${street ? street : ''}</div>
          <div>${city ? city : ''}</div>
        </li>
      </ul>
    </div>
    `;
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
