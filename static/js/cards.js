'use strict';

function makeCategoriesText(categories) {
  return categories.reduce((acc, obj, i) => {
    if (i === 0) return `${acc}${obj.title}`;
    return `${acc} - ${obj.title}`;
  }, '');
}

function makePriceDollars(price) {
  let dollars = '';
  for (let idx = 0; idx < price.length; idx++) {
    dollars = `${dollars}${'<i class="fas fa-dollar-sign fa-lg txt-green mr-2"></i>'}`;
  }
  return dollars;
}

function makeReviewStars(rating) {
  let stars = '';
  for (let idx = 0; idx < rating; idx++) {
    stars = `${stars}${'<i class="far fa-star fa-lg yellow-glow mr-2"></i>'}`;
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

function makeCard(business, i) {
  // label first card id=1 for auto scrolling (href)
  const idHtml = i === 0 ? 'id="1"' : '';
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
    <div class="my-card d-inline-block mx-4 mx-lg-5 bg-purp"
     data-id="${id}" ${idHtml}>
    <div 
    style="background: url('${image_url}'); background-size: cover; background-repeat: no-repeat; background-position: center;" 
    class="my-card-img-div"></div>
    <div class="card-body">
      <h5 class="card-title">${name}</h5>
      <p class="card-text">
        ${makeCategoriesText(categories)} ${is_closed ? '- Closed' : ''}
      </p>
    </div>
    <ul class="list-group list-group-flush bg-transparent">
      <li class="list-group-item bg-transparent card-text-noHover">${stars}</li>
      <li class="list-group-item bg-transparent">${dollars}</li>
      <li class="list-group-item bg-transparent card-text-noHover">${trans_text}</li>
      <li class="list-group-item bg-transparent"><a href="tel:${phone}">${display_phone}</a></li>
      <a href="" class="cardAddress" data-lat="${lat}" data-lng="${lng}" data-name="${name}">
      <li class="list-group-item bg-transparent">
      <div>${street ? street : ''}</div><div>${city ? city : ''}</div>
      </li>
      </a>
    </ul>
    <a href="#" class="card-link">
    <div class="card-body">
      Add to Mission
    </div>
    </a>
    </div>`;
}

function showNoResults() {
  restMarker?.remove();
  let html = `
  <div class="my-card flx-std"
  style="background: url('https://media.giphy.com/media/Txh1UzI7d0aqs/giphy.gif'); background-size: cover; background-repeat: no-repeat; background-position: center;" 
  >
    <div class="txt-orange brand-outline txt-xxl bg-trans-p">
    No Results!
    </div>
  </div>
  `;
  $('.card-track-inner').html(html);
  $('.resultsCount').text('0');
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
  let cards = '';
  data.data.businesses.forEach((business, i) => {
    cards += makeCard(business, i);
    // map first business
    if (i === 0) {
      const { longitude: lng, latitude: lat } = business.coordinates;
      // fitbounds [user coords, restaurant coords]
      fitBounds([longitude, latitude], [lng, lat], business.name);
    }
  });
  $('.card-track-inner').hide().html(cards).fadeIn(1000);
  $('.resultsCount').text(data.data.total);
  location.href = '#1';
  makeArrowPulse();
}
