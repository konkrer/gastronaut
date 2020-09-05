# <span style="color: #1b3044;">Gastronaut</span>

## <span style="color: #1b3044;">_Restaurant Discovery and Food Exploration Website_</span>

### [<span style="color: #03109b;">Gastronaut.life</span>](https://gastronaut.life 'gastronaut.life')

<br/>

#### Do you find yourself eating the same things you always eat? _Try something new, become a Gastronaut!_

<br/>

Gastronaut is a website to help you discover new and diverse restaurants in your area. Plan a mission, eat the food, plant a flag!

_Why Gastronaut?_

- Quickly see and search a wide swath of restaurant categories with additional filters available so you can find what you want when you want it.

- Come up with a great mission of restaurants to visit? Share it with the local area so other gastronauts can go on your mission too!

- Want to share your experience? Write a mission report and let the world know.

- Start a Gastronaut Group and share a mission with friends or family to invite them to join you as you complete your mission. Maybe you're going to visit all the restaurants and they can meet you when you go. Or maybe you’ll each visit or order food from the restaurants and have some gastronomical experiences to share.
  <br/>
  <br/>

![Gastronaut homepage image](https://repository-images.githubusercontent.com/273343895/72ed7000-c4a6-11ea-86d4-cc8412d6e11a)

Features:  

- Quick and easy browsing of restaurants, bars, and more in your location, or whatever location you enter.

- Prominent display of restaurant categories to encourage exploring new cuisine.

- Is a PWA (progressive web app) so you can install it to your phone’s home screen and enjoy a native app feel and look.

- Built-in navigation to take you to your destination. The built-in navigation is minimalistic at this point lacking turn-by-turn directions or auto-rerouting as you commute, but can be useful when you are familiar with the area you are in.

- For the built-in navigation, manual re-routing when you go off course is implemented. Click the navigation button (or the home button) you clicked to start navigation. This is less than ideal and not super easy to do while you are driving as the buttons are small, but it demonstrates the re-routing that will happen when automatic re-routing is implemented.

- You can launch Google Maps navigation by clicking the business address in the business detail modal for a more robust navigation solution (open with the details button, by double-clicking the card for the business, or clicking the business name on the mission or report card).

- Menu, website, and delivery links in the business detail modal when available. And always available is the magnifying glass icon to launch a google search for the business as well as a link to Yelp for the business.

- Create missions of businesses you want to visit so you can remember to experience the things you find interesting. Or create missions to share a curated list with others.

- Mission control page to see all the missions you created, the locations of the businesses on your missions, to launch navigation for those saved businesses, see the details of those businesses, and to manage your missions.

- Missions page with search options to find interesting missions in your location.

- Mission Reports page with search to see what businesses or missions other gastronauts have reviewed in your area.

- Customizable profile page to display your missions and mission reports.

Note: If the built-in navigation routes you in the wrong direction upon navigation start when you are stopped, begin driving then click the navigation button again to re-route. It should detect your heading and display a route starting in the direction you are traveling.

## Stack

JavaScript, Python/Flask, Flask-SQLAlchemy, Postgres, jQuery, API integration (internal and external), Mapbox, HTML, CSS, Flask-Bcrypt, WTForms, Heroku, Jinja, Bootstrap, Sentry, Modernizr, Unittest.

## APIs

This app uses the Yelp API for most business data [Yelp](https://www.yelp.com/fusion 'yelp.com/fusion'),  
Foursquare API for menu, delivery, and website links [Foursquare](https://foursquare.com 'foursquare.com'),  
IPWHOIS API for IP geocoding. [IPWHOIS](https://ipwhois.io/ 'ipwhois.io'),  
Google Maps Platform API for the Time Zone API and geocoding API. [Google Maps](https://cloud.google.com/maps-platform/ 'cloud.google.com/maps-platform/')

\*_This app was created as a capstone project for Springboard Software Engineering fellowship. This is capstone one of two._
