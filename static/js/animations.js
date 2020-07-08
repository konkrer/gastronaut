'use strict';

const $cardTrack = $('#scrl4');
let currCard = 0;
let cardScrollTimer;
let cardScrollTrackerAndMapper;
let sidebarOpen = true;
let justSearchedYelp = false;

function setCardScrollTrackerMapper() {
  cardScrollTrackerAndMapper = $cardTrack.on('scroll', function () {
    clearTimeout(cardScrollTimer);
    if (!mapOpen || !$('.my-card')[0]) return;
    cardScrollTimer = setTimeout(function () {
      const margin = window.innerWidth >= 1200 ? 62.7 : 52.8;
      const $sL = $cardTrack.scrollLeft();
      const $cardWidth = $('.my-card').width() + margin;
      const rawCardsLeft = $sL / $cardWidth;
      const focusCardIdx = Number.parseInt(rawCardsLeft + 0.5);

      if (focusCardIdx === currCard) return;
      currCard = focusCardIdx;
      mapCurrCard(currCard);
    }, 1000);
  });
}

function mapCurrCard() {
  const $focusCard = $('.my-card').eq(currCard);
  if ($focusCard.hasClass('dummy-card')) return;
  const $mapButton = $focusCard.find('.cardMapButton');
  const lat = $mapButton.data('lat');
  const lng = $mapButton.data('lng');
  const name = $mapButton.data('name');

  if (isFinite(lat)) fitBounds([longitude, latitude], [+lng, +lat], name);
}

function sidebarToggleListener() {
  $('.sidebar-toggle-btn').on('click', sidebarToggle);
}

function sidebarToggle() {
  if (cardScrollTrackerAndMapper) cardScrollTrackerAndMapper.off();
  // vars for reseting scroll position
  // as sidebar opens and closes changing
  // card width on non-phone devices.
  let margin;
  let $sL;
  let cardWidth;
  let cardsLeft;
  if ($('.my-card')[0]) {
    margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
    $sL = $cardTrack.scrollLeft();
    cardWidth = $('.my-card').width() + margin;
    // Count of card widths when mesuring scrollLeft
    // by card widths.
    cardsLeft = $sL / cardWidth;
  }
  const onMobile = isMobileScreen();
  if (!onMobile) {
    $('.card-track-inner').hide();
  }

  // change arrow state, filter display,
  // and top padding of card-trak-inner to
  // accomadate filter display
  if (sidebarOpen === true) {
    sidebarOpen = false;
    $('.control-panel')
      .addClass('sidebarCollapse')
      .removeClass('sidebarExpand');
  } else {
    sidebarOpen = true;
    $('.control-panel')
      .addClass('sidebarExpand')
      .removeClass('sidebarCollapse');
  }

  $('.card-track-inner').toggleClass('padtop-card-filter-d');
  $('.filter-display').slideToggle();
  if (mapOpen) setTimeout(() => mappyBoi.resize(), 500);
  setTimeout(() => {
    if (!onMobile) $('.card-track-inner').addClass('opaque').show();
    cardWidth = $('.my-card').width() + margin;
    if (cardsLeft) $cardTrack.scrollLeft(cardWidth * cardsLeft);
    $('.card-track-inner').removeClass('opaque');
    $('.arrow-wrapper')
      .removeClass('pulse-outline-mobile')
      .children()
      .each(function () {
        $(this).toggleClass('d-none');
      });

    setCardScrollTrackerMapper();
    addNextCardsListener();
    if (sidebarOpen) scrollCategoriesToCurrent();
    if (justSearchedYelp && isMobilePortrait()) mapCurrCard();
    justSearchedYelp = false;
  }, 500);
}

/*
/* Restaurant categories auto scroll to last choosen category.
/* Function to scroll last selected category into view.
*/
function scrollCategoriesToCurrent() {
  let currCat = localStorage.getItem('category');
  if (!currCat) return;
  const converter = {
    raw_food: 'Liv',
    restaurants: 'All',
    newamerican: 'Ame',
    tradamerican: 'Ame',
    hotdogs: 'Fas',
    bbq: 'Bar',
    hkcafe: 'Hon',
  };
  if (currCat in converter) currCat = converter[currCat];
  location.href = '#';
  location.href = `#${currCat[0].toUpperCase()}${currCat.substr(1, 2)}`;
  const $scrl3 = $('#scrl3');
  // move scrolled category a little lower for better visibility.
  const sT = $scrl3.scrollTop();
  if (sT >= 50) $scrl3.scrollTop(sT - 50);
  else $scrl3.scrollTop(0);

  $locationInput.focus();
  $locationInput.blur();
}

// check if screen size is mobile.
function isMobileScreen() {
  if (window.innerWidth <= 840) return true;
  return false;
}

// check if screen size is mobile.
function isMobilePortrait() {
  if (window.innerWidth <= 450) return true;
  return false;
}

sidebarToggleListener();
