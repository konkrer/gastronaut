'use strict';

const $cardTrack = $('#scrl4');
let cardsLeftGlobal;
let currCard = 0;
let cardScrollTimer;
let cardScrollTrackerAndMapper;
let sidebarOpen = true;
let justSearchedYelp = false;
let windowResizeCardScrollResetTimer;

function setCardScrollTrackerMapper() {
  cardScrollTrackerAndMapper = $cardTrack.on('scroll', function () {
    countCards();
    clearTimeout(cardScrollTimer);

    if (!mapOpen || !$('.my-card')[0]) return;

    cardScrollTimer = setTimeout(function () {
      const focusCardIdx = Number.parseInt(cardsLeftGlobal + 0.5);

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

async function sidebarToggle() {
  // Prevent unnecessary scroll mapping events.
  if (cardScrollTrackerAndMapper) cardScrollTrackerAndMapper.off();

  // If not on mobile -
  // Fade cards out then hide cards.
  const onMobile = isMobileScreen();
  if (!onMobile) {
    $('.card-track-inner').addClass('opaque');
    await sleep(200);
    $('.card-track-inner').hide();
  }

  // Toggle sidebar.
  // Note: Sidebar does not start with sidebarExpand class to avoid animation on load.
  if (sidebarOpen === true) {
    $('.control-panel')
      .addClass('sidebarCollapse')
      .removeClass('sidebarExpand');
  } else {
    $('.control-panel').toggleClass(['sidebarExpand', 'sidebarCollapse']);
  }
  sidebarOpen = !sidebarOpen;

  // Toggle filter display.
  $('.filter-display').slideToggle();

  // Logic to run after sidebar has full expanded or collapsed.
  setTimeout(() => {
    sidebarFullyChangedLogic(onMobile);
  }, 500);
}

function countCards() {
  if ($('.my-card')[0]) {
    let margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
    let cardWidth = $('.my-card').width() + margin;
    let $sL = $cardTrack.scrollLeft();
    // Count cards by mesuring scrollLeft
    // divided by card widths.
    cardsLeftGlobal = $sL / cardWidth;
  }
}

function setCardsScrollLeft() {
  if (cardsLeftGlobal) {
    let margin = window.innerWidth >= 1200 ? 62.6 : 52.8;
    const cardWidth = $('.my-card').width() + margin;
    $cardTrack.scrollLeft(cardWidth * cardsLeftGlobal);
  }
}

function sidebarFullyChangedLogic(onMobile) {
  if (mapOpen) mappyBoi.resize();
  // Toggle class for width dependent additional padding.
  $('.card-track-inner').toggleClass('padtop-card-filter-d');
  // correct scroll and fade in on non mobile devices
  if (!onMobile) {
    $('.card-track-inner').show();
    setCardsScrollLeft();
    $('.card-track-inner').removeClass('opaque');
  }
  // Stop arrows pulsing green and toggle arrow direction
  $('.arrow-wrapper')
    .removeClass('pulse-outline-mobile')
    .children()
    .each(function () {
      $(this).toggleClass('d-none');
    });

  // Listeners, current category display.
  setCardScrollTrackerMapper();
  addNextCardsListener();
  if (sidebarOpen) scrollCategoriesToCurrent();

  // On mobile portrait zoom into first business when sidebar closed.
  if (justSearchedYelp && isMobilePortrait()) mapCurrCard();
  justSearchedYelp = false;
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

function sleep(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}

/* 
/* Reset card scroll position after resize events
/* to keep same card centered.
*/
window.addEventListener('resize', () => {
  clearTimeout(windowResizeCardScrollResetTimer);
  // delay necessary for proper function.
  // works correctly most of the time.
  windowResizeCardScrollResetTimer = setTimeout(() => {
    setCardsScrollLeft();
    mappyBoi.resize();
  }, 600);
});

sidebarToggleListener();
