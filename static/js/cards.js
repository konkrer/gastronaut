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
    display_phone,
    transactions,
    image_url,
    id,
    coordinates,
    is_closed,
  } = business;

  const is_closed_text = is_closed ? '- Closed' : '';
  const stars = makeReviewStars(rating);
  const dollars = makePriceDollars(price);
  const trans_text = makeTransactionsText(transactions);

  return `
    <div class="my-card d-inline-block mx-5 bg-light"
     data-id="${id}" data-coords="${coordinates}" ${idHtml}>
    <div 
    style="background: url('${image_url}'); background-size: cover; background-repeat: no-repeat; background-position: center;" 
    class="my-card-img-div"></div>
    <div class="card-body">
      <h5 class="card-title">${name}</h5>
      <p class="card-text">
        ${makeCategoriesText(categories)} ${is_closed_text}
      </p>
    </div>
    <ul class="list-group list-group-flush bg-transparent">
      <li class="list-group-item bg-transparent">${stars}</li>
      <li class="list-group-item bg-transparent">${dollars}</li>
      <li class="list-group-item bg-transparent">${trans_text}</li>
      <li class="list-group-item bg-transparent">${display_phone}</li>
    </ul>
    <div class="card-body">
      <a href="#" class="card-link">Add to Mission</a>
    </div>
    </div>`;
}

function addCards(data) {
  let cards = '';
  data.data.businesses.forEach((business, i) => {
    cards += makeCard(business, i);
    // map first business
    if (i === 0) {
      // debugger;
      const { longitude: lng, latitude: lat } = business.coordinates;
      // fitbounds [user coords, restaurant coords]
      fitBounds([longitude, latitude], [lng, lat], business.name);
    }
  });
  $('.card-track-inner').html(cards);
}
