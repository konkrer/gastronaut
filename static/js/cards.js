'use strict';

let cardsMade;

function makeCategoriesText(categories) {
  return categories.reduce((acc, obj, i) => {
    if (i === 0) return `${acc}${obj.title}`;
    return `${acc} - ${obj.title}`;
  }, '');
}

function makePriceDollars(price) {
  let dollars = '';
  for (let idx = 0; idx < price.length; idx++) {
    dollars = `${dollars}${'<i class="fas fa-dollar-sign fa-lg dark-green-outline txt-green mr-2"></i>'}`;
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
  // string to be added to create id for first element
  let idHtml = '';
  // map first business and add an id="1".
  if (cardsMade === false) {
    const { longitude: lng, latitude: lat } = business.coordinates;
    // fitbounds [user coords, restaurant coords]
    fitBounds([longitude, latitude], [lng, lat], business.name);
    // label first card id=1 for auto scrolling (href)
    idHtml = 'id="1"';
    cardsMade = true;
  }
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
      class="my-card d-inline-block mr-card bg-dark txt-black"
      data-id="${id}"
      ${idHtml}
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
        <button class="btn btn-primary font-weight-bold mr-2 mr-sm-1 mr-md-2 px-3 px-sm-2 px-md--3">Details</button>
        <button
          class="btn btn-primary font-weight-bold cardMapButton mr-2 mr-sm-1 mr-md-2 px-3 px-sm-2 px-md--3"
          data-lat="${lat}"
          data-lng="${lng}"
          data-name="${name}"
          data-toggle="tooltip"
          title="Show on Map"
        >
        <i class="fas fa-map-marked-alt fa-lg toggle-outline"></i>
        </button>
        <button
          class="btn btn-primary font-weight-bold px-3 px-sm-2 px-md--3" data-toggle="tooltip" title="Add to Mission"
        >
        <i class="fas fa-plus-square mr-2"></i>
        <i class="fas fa-rocket fa-lg txt-orange brand-outline"></i>
        </button>
      </div>
      <ul class="list-group list-group-flush bg-transparent">
        <li class="list-group-item bg-transparent text-secondary card-text-noHover">
          ${stars}
        </li>
        <li class="list-group-item bg-transparent">${dollars}</li>
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

function showNoResults() {
  restMarker?.remove();
  let html = `
  <div class="my-card flx-std no-results"
  >
    <div class="txt-orange brand-outline txt-xxl">
    No Results!
    </div>
  </div>
  `;
  $('.card-track-inner').html(html);
  $('.resultsCount').text('0');
}

function filterForTransactions(transactions, business) {
  // if no transactrions selected no filtering
  if (transactions.length === 0) return makeCard(business);
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

function makeArrowPulse() {
  // make arrows to close side bar pulse to show user to close sidebar (on mobile)
  $('.arrow-wrapper').removeClass('toggle-outline-mobile');
  setTimeout(() => $('.arrow-wrapper').addClass('toggle-outline-mobile'), 10);
}

function addCards(data) {
  if (data.data.businesses.length == 0) {
    showNoResults();
    return;
  }
  cardsMade = false;
  let cards = '';
  const transactions = getTransactions();
  data.data.businesses.forEach(business => {
    cards += filterForTransactions(transactions, business);
  });
  $('.card-track-inner').hide().html(cards).fadeIn(1000);
  $('.resultsCount').text(data.data.total);
  location.href = '#1';
  makeArrowPulse();
}
