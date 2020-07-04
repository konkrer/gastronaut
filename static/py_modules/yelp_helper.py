'''Yelp helper functions, restaurant categories,
categories first letter list.'''

from datetime import datetime, timezone


def parse_query_params(multi_dict):
    """Function to convert request parameters into
        state ready to be passed to Yelp.

        Args:
            multi_dict (multi_dict): request.args data
        """
    out, price, attributes = {}, '', ''
    for key, value in multi_dict.items():
        # make price string
        if key.startswith('price'):
            price += f'{value},'
        # make attributes string
        elif key in [
                'hot_and_new', 'reservation', 'cashback', 'deals',
                'gender_neutral_restrooms', 'open_to_all',
                'wheelchair_accessible'
        ]:
            attributes += f'{key},'
        # convert open at datetime to utc timestamp
        elif key == 'open_at':
            date = datetime.fromisoformat(value)
            utc_timestamp = date.replace(tzinfo=timezone.utc).timestamp()
            out['open_at'] = str(int(utc_timestamp))
        else:
            if value:
                out[key] = value
    # if 5 prices levels given omit price data.
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


yelp_categories = [('All', 'restaurants'), ('Acai Bowls', 'acaibowls'),
                   ('Afghan', 'afghani'), ('African', 'african'),
                   ('American (New)', 'newamerican'),
                   ('American (Traditional)', 'tradamerican'),
                   ('Arabian', 'arabian'), ('Argentine', 'argentine'),
                   ('Armenian', 'armenian'), ('Asian Fusion', 'asianfusion'),
                   ('Australian', 'australian'), ('Austrian', 'austrian'),
                   ('Bagels', 'bagels'), ('Bakeries', 'bakeries'),
                   ('Bangladeshi', 'bangladeshi'), ('Barbeque', 'bbq'),
                   ('Basque', 'basque'), ('Brasseries', 'brasseries'),
                   ('Bars', 'bars'), ('Brazilian', 'brazilian'),
                   ('Breweries', 'breweries'),
                   ('Breakfast & Brunch', 'breakfast_brunch'),
                   ('British', 'british'), ('Bubble Tea', 'bubbletea'),
                   ('Buffets', 'buffets'), ('Bulgarian', 'bulgarian'),
                   ('Burgers', 'burgers'), ('Burmese', 'burmese'),
                   ('Cafes', 'cafes'), ('Cafeteria', 'cafeteria'),
                   ('Cajun/Creole', 'cajun'), ('Cambodian', 'cambodian'),
                   ('Caribbean', 'caribbean'), ('Catalan', 'catalan'),
                   ('Cheesesteaks', 'cheesesteaks'),
                   ('Chicken Shop', 'chickenshop'),
                   ('Chicken Wings', 'chicken_wings'), ('Chinese', 'chinese'),
                   ('Cocktail Bars', 'cocktailbars'),
                   ('Coffee & Tea', 'coffee'), ('Comfort Food', 'comfortfood'),
                   ('Creperies', 'creperies'), ('Cuban', 'cuban'),
                   ('Czech', 'czech'), ('Delis', 'delis'),
                   ('Desserts', 'desserts'), ('Diners', 'diners'),
                   ('Dinner Theater', 'dinnertheater'),
                   ('Eritrean', 'eritrean'), ('Ethiopian', 'ethiopian'),
                   ('Fast Food', 'hotdogs'), ('Filipino', 'filipino'),
                   ('Fish & Chips', 'fishnchips'), ('Fondue', 'fondue'),
                   ('Food Court', 'food_court'), ('Food Stands', 'foodstands'),
                   ('Food Trucks', 'foodtrucks'), ('French', 'french'),
                   ('Game Meat', 'gamemeat'), ('Gastropubs', 'gastropubs'),
                   ('Georgian', 'georgian'), ('German', 'german'),
                   ('Gluten-Free', 'gluten_free'), ('Greek', 'greek'),
                   ('Guamanian', 'guamanian'), ('Halal', 'halal'),
                   ('Hawaiian', 'hawaiian'),
                   ('Himalayan / Nepalese', 'himalayan'),
                   ('Honduran', 'honduran'),
                   ('Hong Kong Style Cafe', 'hkcafe'), ('Hot Dogs', 'hotdog'),
                   ('Hot Pot', 'hotpot'), ('Hungarian', 'hungarian'),
                   ('Iberian', 'iberian'), ('Indian', 'indpak'),
                   ('Indonesian', 'indonesian'), ('Irish', 'irish'),
                   ('Italian', 'italian'), ('Japanese', 'japanese'),
                   ('Kebab', 'kebab'), ('Korean', 'korean'),
                   ('Kosher', 'kosher'), ('Laotian', 'laotian'),
                   ('Latin American', 'latin'), ('Live/Raw Food', 'raw_food'),
                   ('Malaysian', 'malaysian'),
                   ('Mediterranean', 'mediterranean'), ('Mexican', 'mexican'),
                   ('Middle Eastern', 'mideastern'),
                   ('Modern European', 'modern_european'),
                   ('Mongolian', 'mongolian'), ('Moroccan', 'moroccan'),
                   ('New Mexican Cuisine', 'newmexican'),
                   ('Nicaraguan', 'nicaraguan'), ('Noodles', 'noodles'),
                   ('Pakistani', 'pakistani'), ('Pan Asian', 'panasian'),
                   ('Persian/Iranian', 'persian'), ('Peruvian', 'peruvian'),
                   ('Pizza', 'pizza'), ('Polish', 'polish'),
                   ('Polynesian', 'polynesian'),
                   ('Pop-Up Restaurants', 'popuprestaurants'),
                   ('Portuguese', 'portuguese'),
                   ('Poutineries', 'poutineries'), ('Russian', 'russian'),
                   ('Salad', 'salad'), ('Sandwiches', 'sandwiches'),
                   ('Scandinavian', 'scandinavian'), ('Scottish', 'scottish'),
                   ('Seafood', 'seafood'), ('Singaporean', 'singaporean'),
                   ('Slovakian', 'slovakian'), ('Somali', 'somali'),
                   ('Soul Food', 'soulfood'), ('Soup', 'soup'),
                   ('Southern', 'southern'), ('Spanish', 'spanish'),
                   ('Sri Lankan', 'srilankan'), ('Steakhouses', 'steak'),
                   ('Street Vendors', 'streetvendors'),
                   ('Supper Clubs', 'supperclubs'), ('Sushi Bars', 'sushi'),
                   ('Syrian', 'syrian'), ('Taiwanese', 'taiwanese'),
                   ('Tapas Bars', 'tapas'),
                   ('Tapas/Small Plates', 'tapasmallplates'),
                   ('Tex-Mex', 'tex-mex'), ('Thai', 'thai'),
                   ('Turkish', 'turkish'), ('Ukrainian', 'ukrainian'),
                   ('Uzbek', 'uzbek'), ('Vegan', 'vegan'),
                   ('Vegetarian', 'vegetarian'), ('Vietnamese', 'vietnamese'),
                   ('Waffles', 'waffles'), ('Wineries', 'wineries'),
                   ('Wraps', 'wraps')]

# get alphabetized first letter list of categories. [first_let, #id_to_call]
first_letters = [('A', 'All'), ('B', 'Ban'), ('C', 'Caf'), ('D', 'Del'),
                 ('E', 'Eri'), ('F', 'Fas'), ('G', 'Gam'), ('H', 'Hal'),
                 ('I', 'Ibe'), ('J', 'Jap'), ('K', 'Keb'), ('L', 'Lao'),
                 ('M', 'Mal'), ('N', 'New'), ('P', 'Pak'), ('R', 'Rus'),
                 ('S', 'Sal'), ('T', 'Tai'), ('U', 'Ukr'), ('V', 'Veg'),
                 ('W', 'Waf')]

# from csv:
# get yelp categories data in tuples as: (display name, category name)
# with open('yelp_restaurant_categories.txt') as f:
#     cat_data = f.read().splitlines()
# cat_data = [tuple(x.split(',')) for x in cat_data]
# print(cat_data)
