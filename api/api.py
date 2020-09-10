"""Basic API endpoints for Gastronaut."""

import requests
import os
from types import SimpleNamespace
from google.oauth2 import id_token
from google.auth.transport import requests as requests_google
from flask import request, flash, session, Blueprint, jsonify, g
from werkzeug.exceptions import Unauthorized
from models import db, User, Business, BOOLEAN_PREFERENCES
from static.py_modules.decorators import add_user_to_g
from static.py_modules.yelp_helper import (
    parse_query_params, YELP_URL, FOURSQUARE_URL, foursq_params,
    foursq_venue_params, add_reports_data, add_foursquare_data)
from static.py_modules.helper_functions import HelperFunctions as H


GOOGLE_O_AUTH_CLIENT_ID = '992789148520-btgg6dtlrk8rkght89rfvdbfgu2ljeut.apps.googleusercontent.com'  # noqa E501


# Dev / Production setup differentiation:
#
# if development server load local keys.
if not os.environ.get('SECRET_KEY'):
    from development_local.local_settings import (
        YELP_API_KEY, MAILGUN_API_KEY, MAILGUN_DOMAIN)
#
# if production server load environ variables.
else:
    YELP_API_KEY = os.environ.get('YELP_API_KEY')
    MAILGUN_API_KEY = os.environ.get('MAILGUN_API_KEY')
    MAILGUN_DOMAIN = os.environ.get('MAILGUN_DOMAIN')

api_b_p = Blueprint('API_blueprint', __name__,)


#        $$      $$$$$$    $$
#       $$$$     $$   $$   $$
#       $$$$     $$   q$m  $$
#      $$  $$    $$$$$$$   $$
#     $$$$$$$-   $$        $$
#     $$    $$   $$        $$
#    $$     i$$  $$        $$
############################
""" API Endpoints"""


@api_b_p.route('/search')
def search_yelp():
    """API endpoint to relay search to Yelp search."""

    headers = {'Authorization': f'Bearer {YELP_API_KEY}'}
    params = parse_query_params(request.args)

    try:
        res = requests.get(f'{YELP_URL}/businesses/search',
                           params=params, headers=headers)
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': repr(e)})

    return res.json()


@api_b_p.route('/business_detail/<business_id>')
@add_user_to_g
def business_details(business_id):
    """API endpoint to get Yelp business details, Yelp business reviews,
       Foursquare venue id, and Foursquare business details."""

    headers = {'Authorization': f'Bearer {YELP_API_KEY}'}

    try:
        # Get business details
        res = requests.get(
            f'{YELP_URL}/businesses/{business_id}', headers=headers)
        res.raise_for_status()
        # Get reviews for business
        res2 = requests.get(
            f'{YELP_URL}/businesses/{business_id}/reviews', headers=headers)
        res2.raise_for_status()
        # Get Foursquare venue id
        params_venue = foursq_venue_params(request)
        res3 = requests.get(
            f'{FOURSQUARE_URL}/venues/search', params=params_venue)
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': repr(e)})

    if res3.ok:
        # Try to get premium request.
        try:
            venue_id = res3.json()['response']['venues'][0]['id']
            # Get Foursquare business details
            res4 = requests.get(
                f'{FOURSQUARE_URL}/venues/{venue_id}', params=foursq_params())
        # If over limit our data response won't contain foursquare data.
        except Exception as e:
            H.error_logging(e)

    data = res.json()
    data['reviews'] = res2.json()['reviews']
    # Add gastronaut reports for this business if any.
    data = add_reports_data(business_id, data)
    # Add foursquare data if any.
    if res3.ok and res4.ok:
        data = add_foursquare_data(data, res4.json())

    return data


@api_b_p.route('/preferences', methods=['POST'])
@add_user_to_g
def set_prefrences():
    """Endpoint to change user preferences. This is called by two different
       forms by two different event handlers. The Boolean form has checkbox
       data and updates preferences on onChange events. The preferences-text
       form updates when user selects official address."""

    if not g.user:
        return Unauthorized()

    data = request.json

    preferences = g.user.preferences.__dict__.copy()

    # If onChange update of Boolean preferences
    if data.get('Boolean'):
        # set each setting to true if data is present else False
        for key in BOOLEAN_PREFERENCES:
            preferences[key] = bool(data.get(key, False))
    else:
        preferences['home_address'] = data.get('home_address_official')
        if data.get('home_coords'):
            preferences['home_coords'] = [
                float(x) for x in data['home_coords'].split(',')]

    g.user.preferences = SimpleNamespace(**preferences)

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'feedback': 'Error!'})

    return jsonify({'feedback': 'Updated'})


@api_b_p.route('/business', methods=['POST'])
def add_business():
    """Add business to database if it is not present."""

    data = request.json

    business = Business.query.get(data['id'])

    if business:
        return jsonify({'success': 'business already in database'})

    business = Business.create(
        id=data['id'], name=data['name'], city=data['city'],
        state=data['state'], country=data['country'],
        longitude=float(data['longitude'] or 0),
        latitude=float(data['latitude'] or 0))

    try:
        db.session.commit()
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Added!'})


@api_b_p.route('/feedback', methods=['POST'])
@add_user_to_g
def submit_feedback():
    """Endpoint for user to submit feedback to be emailed to developer."""

    data = request.json
    feedback = data['feedback']
    email = data.get('email', '')

    user = g.user.username if g.user else 'Anonymous'

    receiver = "richardiannucelli@gmail.com"
    body = f"<h5>Feedback:</h5>{feedback}<p>From: {user} --Email: {email}</p>"

    try:
        requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data={"from": f"Feedback <mailgun@{MAILGUN_DOMAIN}>",
                  "to": [receiver],
                  "subject": "Feedback",
                  "html": body})
    except Exception as e:
        H.error_logging(e)
        return jsonify({'error': 'Error sending message', 'color': 'warning'})

    return jsonify({'success': 'Feedback Received!', 'color': 'green'})


@api_b_p.route('/check-google-token', methods=['POST'])
def check_google_token():
    """Endpoint to check validity of google user token and sign user in,
       or create new account for user. Return success message for successful
       user creation or sign-in."""

    data = request.json

    user_token = data['idtoken']

    try:
        idinfo = id_token.verify_oauth2_token(
            user_token, requests_google.Request(), GOOGLE_O_AUTH_CLIENT_ID)

    except ValueError as e:
        H.error_logging(e)
        return jsonify({'error': f'Autorization error: {e}'})

    # ID token is valid. Get the user's Google Account ID.
    google_id = idinfo['sub']

    user = User.query.filter_by(password=google_id).first()

    # If not user with this google id try to create one.
    if not user:
        email = idinfo['email']
        username = idinfo['name']
        image_url = idinfo['picture']

        # If email already in use user should sign in using email and password.
        if User.query.filter_by(email=email).first():
            return jsonify({
                'error': 'Email already in use. Please log in using email and password.'  # noqa e501
                })

        # If username taken add nonce until valid username is formed.
        if User.query.filter_by(username=username).first():
            nonce = 1
            username = f'{username}{nonce}'
            while User.query.filter_by(username=username).first():
                nonce += 1
                username = f'{username}{nonce}'

        try:
            user = User(email=email, username=username,
                        password=google_id, avatar_url=image_url)
            db.session.add(user)
            db.session.commit()
            user.add_bookmarks()
        except Exception as e:
            H.error_logging(e)
            return jsonify({'error': f'Error creating new user: {e}'})

    session['user_id'] = user.id
    flash(f"Welcome {user.username}!", "success")
    return jsonify({'success': 'User logged in.'})
