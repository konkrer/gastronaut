'''Yelp helper functions, restaurant categories,
categories first letter list.'''

from datetime import datetime, timezone, timedelta
import requests
import logging
import os


YELP_URL = 'https://api.yelp.com/v3'

API_KEY = os.environ.get('GOOGLE_API_KEY')

if not API_KEY:
    from development_local.local_settings import GOOGLE_API_KEY as API_KEY


def parse_query_params(multi_dict):
    """Function to convert request parameters into
        dictionary state ready to be passed to Yelp.

        Args:
            multi_dict (multi_dict): request.args data
    """

    out, price, attributes = {}, '', ''

    for key, value in multi_dict.items():
        # make price string from any price parameters.
        if key.startswith('price'):
            price += f'{value},'
        # make attributes string from any attribute parameters.
        elif key in [
                'hot_and_new', 'reservation', 'cashback', 'deals',
                'gender_neutral_restrooms', 'open_to_all',
                'wheelchair_accessible'
        ]:
            attributes += f'{key},'
        # convert open at datetime to utc timestamp if present.
        elif key == 'open_at':
            utc_timestamp = get_timestamp(multi_dict, value)
            if not utc_timestamp:
                continue
            out['open_at'] = utc_timestamp
        else:
            if value:
                out[key] = value

    # if price, attribute strings - remove trailing comma and set key/ value.
    if price:
        out['price'] = price.strip(',')
    if attributes:
        out['attributes'] = attributes.strip(',')

    # if location given remove lng/lat for explict location use
    if out.get('location'):
        if out.get('latitude'):
            del out['latitude']
            del out['longitude']

    return out


def get_timestamp(multi_dict, value):
    """Get UTC timestamp offset for timezone of search location."""

    date_time = datetime.fromisoformat(value)
    # Datetime as UTC timestamp for google timezone endpoint.
    # Not accurate as date_time is naive but google needs a timestamp.
    timestamp = date_time.replace(tzinfo=timezone.utc).timestamp()
    # get timezone object for current location.
    tz = get_tz(multi_dict, timestamp)

    if not tz:
        return

    # Return integer as required by yelp.
    # ????? need str??????
    return str(int(date_time.replace(tzinfo=tz).timestamp()))


def get_tz(multi_dict, timestamp):
    """Use coords or location to get timezone information.
       Return timzone class object."""

    if multi_dict.get('location'):
        # geocode locaion
        geo_results = geocode(multi_dict['location'])

        if not geo_results or not geo_results.get('status') == 'OK':
            return None

        location = geo_results['results'][0]['geometry']['location']
        lat = location['lat']
        lng = location['lng']
    else:
        lat = multi_dict.get('latitude', 0)
        lng = multi_dict.get('longitude', 0)

    tz_data = get_tz_data(lat, lng, timestamp)

    if not tz_data or not tz_data.get('status') == 'OK':
        return None

    tz_offset = tz_data['rawOffset'] + tz_data['dstOffset']
    offset_time_delta = timedelta(seconds=tz_offset)

    return timezone(offset_time_delta)


def geocode(location):
    """Geocode a location string."""

    url = 'https://maps.googleapis.com/maps/api/geocode/json'

    location = location.split(' ')
    location = '+'.join(location)

    try:
        resp = requests.get(
            f'{url}?address={location}&key={API_KEY}'
        )
    except Exception as e:
        logging.error(repr(e))
        return

    return resp.json()


def get_tz_data(lat, lng, timestamp):
    """Call google timezone APi."""

    url = 'https://maps.googleapis.com/maps/api/timezone/json'

    coords = f'{lat},{lng}'

    try:
        resp = requests.get(
            f'{url}?location={coords}&timestamp={timestamp}&key={API_KEY}'
        )
    except Exception as e:
        logging.error(repr(e))
        return

    return resp.json()


YELP_CATEGORIES = [
    ('All', 'restaurants,bars,food'), ('All Restaurants', 'restaurants'),
    ('Acai Bowls', 'acaibowls'), ('Afghan', 'afghani'),
    ('African', 'african'), ('American (New)', 'newamerican'),
    ('American (Traditional)', 'tradamerican'), ('Arabian', 'arabian'),
    ('Argentine', 'argentine'), ('Armenian', 'armenian'),
    ('Asian Fusion', 'asianfusion'), ('Australian', 'australian'),
    ('Austrian', 'austrian'), ('Bagels', 'bagels'), ('Bakeries', 'bakeries'),
    ('Bangladeshi', 'bangladeshi'), ('Barbeque', 'bbq'), ('Bars', 'bars'),
    ('Basque', 'basque'), ('Brasseries', 'brasseries'),
    ('Brazilian', 'brazilian'), ('Breweries', 'breweries'),
    ('Breakfast & Brunch', 'breakfast_brunch'), ('British', 'british'),
    ('Bubble Tea', 'bubbletea'), ('Buffets', 'buffets'),
    ('Bulgarian', 'bulgarian'), ('Burgers', 'burgers'), ('Burmese', 'burmese'),
    ('Cafes', 'cafes'), ('Cafeteria', 'cafeteria'), ('Cajun/Creole', 'cajun'),
    ('Cambodian', 'cambodian'), ('Caribbean', 'caribbean'),
    ('Catalan', 'catalan'), ('Cheesesteaks', 'cheesesteaks'),
    ('Chicken Shop', 'chickenshop'), ('Chicken Wings', 'chicken_wings'),
    ('Chinese', 'chinese'), ('Cocktail Bars', 'cocktailbars'),
    ('Coffee & Tea', 'coffee'), ('Comfort Food', 'comfortfood'),
    ('Creperies', 'creperies'), ('Cuban', 'cuban'), ('Czech', 'czech'),
    ('Delis', 'delis'), ('Desserts', 'desserts'), ('Diners', 'diners'),
    ('Dinner Theater', 'dinnertheater'), ('Dive Bars', 'divebars'),
    ('Eritrean', 'eritrean'), ('Ethiopian', 'ethiopian'),
    ('Fast Food', 'hotdogs'), ('Filipino', 'filipino'),
    ('Fish & Chips', 'fishnchips'), ('Fondue', 'fondue'),
    ('Food Court', 'food_court'), ('Food Stands', 'foodstands'),
    ('Food Trucks', 'foodtrucks'), ('French', 'french'),
    ('Game Meat', 'gamemeat'), ('Gastropubs', 'gastropubs'),
    ('Georgian', 'georgian'), ('German', 'german'),
    ('Gluten-Free', 'gluten_free'), ('Greek', 'greek'),
    ('Guamanian', 'guamanian'), ('Halal', 'halal'), ('Hawaiian', 'hawaiian'),
    ('Himalayan / Nepalese', 'himalayan'), ('Honduran', 'honduran'),
    ('Hong Kong Style Cafe', 'hkcafe'), ('Hot Dogs', 'hotdog'),
    ('Hot Pot', 'hotpot'), ('Hungarian', 'hungarian'), ('Iberian', 'iberian'),
    ('Indian', 'indpak'), ('Indonesian', 'indonesian'), ('Irish', 'irish'),
    ('Italian', 'italian'), ('Japanese', 'japanese'), ('Kebab', 'kebab'),
    ('Korean', 'korean'), ('Kosher', 'kosher'), ('Laotian', 'laotian'),
    ('Latin American', 'latin'), ('Live/Raw Food', 'raw_food'),
    ('Malaysian', 'malaysian'), ('Mediterranean', 'mediterranean'),
    ('Mexican', 'mexican'), ('Middle Eastern', 'mideastern'),
    ('Modern European', 'modern_european'), ('Mongolian', 'mongolian'),
    ('Moroccan', 'moroccan'), ('New Mexican Cuisine', 'newmexican'),
    ('Nicaraguan', 'nicaraguan'), ('Noodles', 'noodles'),
    ('Pakistani', 'pakistani'), ('Pan Asian', 'panasian'),
    ('Persian/Iranian', 'persian'), ('Peruvian', 'peruvian'),
    ('Pizza', 'pizza'), ('Polish', 'polish'), ('Polynesian', 'polynesian'),
    ('Pop-Up Restaurants', 'popuprestaurants'), ('Portuguese', 'portuguese'),
    ('Poutineries', 'poutineries'), ('Russian', 'russian'), ('Salad', 'salad'),
    ('Sandwiches', 'sandwiches'), ('Scandinavian', 'scandinavian'),
    ('Scottish', 'scottish'), ('Seafood', 'seafood'),
    ('Singaporean', 'singaporean'), ('Slovakian', 'slovakian'),
    ('Somali', 'somali'), ('Soul Food', 'soulfood'), ('Soup', 'soup'),
    ('Southern', 'southern'), ('Spanish', 'spanish'),
    ('Sri Lankan', 'srilankan'), ('Steakhouses', 'steak'),
    ('Street Vendors', 'streetvendors'), ('Supper Clubs', 'supperclubs'),
    ('Sushi Bars', 'sushi'), ('Syrian', 'syrian'), ('Taiwanese', 'taiwanese'),
    ('Tapas Bars', 'tapas'), ('Tapas/Small Plates', 'tapasmallplates'),
    ('Tex-Mex', 'tex-mex'), ('Thai', 'thai'), ('Turkish', 'turkish'),
    ('Ukrainian', 'ukrainian'), ('Uzbek', 'uzbek'), ('Vegan', 'vegan'),
    ('Vegetarian', 'vegetarian'), ('Vietnamese', 'vietnamese'),
    ('Waffles', 'waffles'), ('Wineries', 'wineries'), ('Wraps', 'wraps')
]

# get alphabetized first letter list of categories. [first_let, #id_to_call]
first_letters = [('A', 'All'), ('B', 'Bag'), ('C', 'Caf'), ('D', 'Del'),
                 ('E', 'Eri'), ('F', 'Fas'), ('G', 'Gam'), ('H', 'Hal'),
                 ('I', 'Ibe'), ('J', 'Jap'), ('K', 'Keb'), ('L', 'Lao'),
                 ('M', 'Mal'), ('N', 'New'), ('P', 'Pak'), ('R', 'Rus'),
                 ('S', 'Sal'), ('T', 'Tai'), ('U', 'Ukr'), ('V', 'Veg'),
                 ('W', 'Waf')]


def no_alcohol():
    """Function to return Yelp categories without alcohol offerings."""

    new_list = YELP_CATEGORIES.copy()

    new_list[0] = ('All', 'restaurants,food')

    bad_list = ['bars', 'breweries', 'cocktailbars', 'divebars', 'wineries']

    return [r for r in new_list if r[1] not in bad_list]


# from csv:
# get yelp categories data in tuples as: (display name, category name)
# with open('yelp_restaurant_categories.txt') as f:
#     cat_data = f.read().splitlines()
# cat_data = [tuple(x.split(',')) for x in cat_data]
# print(cat_data)
