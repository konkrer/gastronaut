"""Restaurant discovery, food exploration web app."""

import requests
import logging
from types import SimpleNamespace
import os

from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk import (capture_message, capture_exception,
                        init as sentry_init)

from flask import (  # noqa F401
    Flask, request, flash, make_response, Response, session,
    redirect, jsonify, abort, url_for, g, render_template as r_t)
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename
# from werkzeug.exceptions import Unauthorized

from models import (db, connect_db, User, Mission, UserMission,  # noqa F401
                    Business, Report, MissionBusiness, DEFAULT_PREFERENCES)  # noqa F401
from forms import AddUserForm, LoginForm, EditUserForm
from static.py_modules.decorators import add_user_to_g, login_required
from static.py_modules.yelp_helper import (
    YELP_CATEGORIES, no_alcohol, first_letters, parse_query_params,
    YELP_URL)

Product, Category, AddProductForm = None, None, None  # remove me


app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'postgresql:///gastronaut')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


# Dev / Production setup differentiation:
#
# if development server enable debugging and load local keys.
if not os.environ.get('SECRET_KEY'):
    from flask_debugtoolbar import DebugToolbarExtension
    from development_local.local_settings import API_KEY, SECRET_KEY

    app.config["SECRET_KEY"] = SECRET_KEY
    app.config['SQLALCHEMY_ECHO'] = True
    app.config["DEBUG_TB_INTERCEPT_REDIRECTS"] = False
    debug = DebugToolbarExtension(app)
    logging.basicConfig(filename='gastronaut.log', level=logging.WARNING,
                        format='%(levelname)s:%(asctime)s:%(message)s')
#
# if production server enable sentry and load environ variables.
else:
    sentry_init(
        dsn="https://1faae11aaacf4e749bf6d9cc1ae5286a@o415488.ingest.sentry.io/5319947",  # NOQA E 501
        integrations=[FlaskIntegration()]
    )
    app.config["SECRET_KEY"] = os.environ.get('SECRET_KEY')
    API_KEY = os.environ.get('YELP_API_KEY')
    debug = False


connect_db(app)

#
#    $$$   x$$$     $$~     $$$  $$U   $$
#    $$$!  $$$$     $$$     $$$  $$$   $$
#    $$$$  $ $$    $$ $$    $$$  $$$$  $$
#    $L!$ $$ $$    $$ $$    $$$  $$ $$ $$
#    $L $$$$ $$   $$$$$$$   $$$  $$  $$$$
#    $L $$$  $$  $$~   a$$  $$$  $$   $$$
#    $L  $$  $$  $$     $$  $$$  $$    $$


@app.route("/")
@add_user_to_g
def index():
    """Home view."""

    search_term = request.args.get('q')

    lat, lng = get_coords_from_IP_address(request)

    return render_template(
        'index.html',
        YELP_CATEGORIES=get_yelp_categories(),
        first_letters=first_letters,
        lat=lat,
        lng=lng,
        search_term=search_term
    )


@app.route("/navtest")
def navtest():
    """Navber search testing view."""
    # TODO: FIX navbar search from disappearing
    #      on text entry on mobile chrome/edge.
    return render_template('base.html')


@app.route("/mission-control")
@add_user_to_g
@login_required
def mission_control():
    """Missions control view."""

    missions = g.user.missions

    return render_template('mission_control.html', missions=missions)


@app.route('/missions')
@add_user_to_g
def missions():
    """Missions view."""

    query_params = request.args.to_dict()

    if not query_params:
        missions = Mission.get_by_recent()
    else:
        missions = Mission.search(query_params)

    return render_template('missions.html', missions=missions,
                           form_data=query_params)


@app.route('/missions/<mission_id>')
@add_user_to_g
def mission_detail(mission_id):
    """Mission detail view."""

    mission = Mission.query.get_or_404(mission_id)
    user = mission.user

    return render_template('mission.html', missions=[mission],
                           user=user)


@app.route('/reports')
@add_user_to_g
def mission_reports():
    """Mission reports view."""

    query_params = request.args.to_dict()

    if not query_params:
        reports = Report.get_by_recent()
    else:
        reports = Report.search(query_params)

    return render_template('reports.html', reports=reports,
                           form_data=query_params)


@app.route('/reports/<report_id>')
@add_user_to_g
def mission_report_detail(report_id):
    """Mission report detail view."""

    report = Report.query.get(report_id)
    user = report.user

    return render_template('report.html', reports=[report],
                           user=user)


@app.route('/reports/business/<business_id>')
@add_user_to_g
def business_reports_detail(business_id):
    """Business reports detail view. All reports for a
       particular business."""

    business = Business.query.get(business_id)
    reports = business.reports

    query_params = {'keywords': business.name, 'city': business.city,
                    'state': business.state, 'coutnry': business.country,
                    'sort_by': 'recent'}

    return render_template('reports.html', reports=reports,
                           form_data=query_params)


#
#     $$    $$    $$$.    $$$$$$$$  $$$$$<
#     $$    $$  $$$ $$$   $$^^^^^^  $$$$$$$$
#     $$    $$  $$        $$+       $$    $$
#     $$    $$   $$$$$    $$$$$$$Y  $$$$$$$O
#     $$    $$      ^$$o  $$+       $$ '$$
#     $$    $$  $$    $$  $$+       $$   $$
#      $$$$$$   d$$$$$$   $$$$$$$$  $$    $$

# User CRUD, login, logout
#

@app.route("/signup", methods=['GET', 'POST'])
@add_user_to_g
def signup():
    """Sign up view."""

    if g.user:
        return redirect(url_for('user_detail', user_id=g.user.id))

    form = AddUserForm()

    if form.validate_on_submit():
        password = form.password.data
        # Collect relevant form data items to a dictionary.
        relevant_data = {
            k: v
            for k, v in form.data.items() if k in User.set_get()
        }

        try:
            new_user = User.register(password=password, **relevant_data)
            session['user_id'] = new_user.id
            flash(f"Welcome {new_user.username}!", "success")

            return next_page_logic(request)

        except Exception as e:
            db.session.rollback()
            flash("Error Creating User", 'danger')
            error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")
    return render_template('user/signup.html', form=form,
                           next_page=request.args.get('next', ''))


@app.route("/login", methods=['GET', 'POST'])
@add_user_to_g
def login():
    """Login view."""

    if g.user:
        return redirect(url_for('user_detail', user_id=g.user.id))

    form = LoginForm()

    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data

        user = User.authenticate(email, password)

        if user is None:
            form.email.errors.append("Email not found.")
        elif user is False:
            form.password.errors.append("Password incorrect.")
        else:
            session['user_id'] = user.id
            flash(f"Welcome {user.username}!", 'success')

            return next_page_logic(request)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return render_template('user/login.html', form=form,
                           next_page=request.args.get('next', ''))


@app.route("/user/edit", methods=['GET', 'POST'])
@add_user_to_g
@login_required
def user_edit():
    """User detail view."""

    form = EditUserForm(obj=g.user)

    if form.validate_on_submit():

        form.populate_obj(g.user)

        try:
            db.session.commit()
            flash("Profile Updated!", "success")
            return redirect(url_for('user_detail', user_id=g.user.id))

        except Exception as e:
            db.session.rollback()
            flash("Error Updating User Profile", 'danger')
            error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "danger")

    return render_template('user/edit_user.html', form=form)


@app.route("/user/profile/<user_id>")
@add_user_to_g
def user_detail(user_id):
    """User detail view."""

    # if user was logged out and clicked profile user_id
    # will be 0. Lookup their ID and use that.
    if user_id == '0':
        user_id = g.user.id

    user = User.query.get_or_404(user_id)

    shared_missions = [m for m in user.my_missions if m.is_public]

    return render_template("user/detail_user.html",
                           user=user, missions=shared_missions,
                           reports=user.reports)


@app.route('/logout', methods=['POST'])
@add_user_to_g
def logout():
    """User logout view."""

    del session['user_id']
    flash(f"{g.user.username} logged out.", 'success')
    return redirect(url_for('index'))


@app.route("/user/delete", methods=['POST'])
@add_user_to_g
@login_required
def delete_user():
    """Delete User view"""

    db.session.delete(g.user)
    db.session.commit()
    del session['user_id']
    flash('User Account Deleted', 'success')

    return redirect(url_for('index'))


#
#
#


# @app.route("/product/add", methods=['GET', 'POST'])
# def add_product():
#     """Product add view."""
#     form = AddProductForm()
#     form.category_code.choices = db.session.query(Category.code,
#                                                   Category.name).all()

#     if form.validate_on_submit():
#         # name = form.name.data
#         # c_c = form.category_code.data
#         # price = form.price.data
#         # db.session.add(Product(name=name, category_code=c_c, price=price))
#         data = form.data
#         relevant_data = {
#             k: v
#             for k, v in data.items() if k in Product.set_get()
#         }

#         if form.photo_file.data:
#             f = form.photo_file.data
#             filename = secure_filename(f.filename)
#             path = os.path.join('static\\uploads', filename)
#             f.save(path)

#             relevant_data['photo_file'] = path

#         try:
#             db.session.add(Product(**relevant_data))
#             db.session.commit()
#             flash("Product added!")
#         except IntegrityError:
#             flash("Name already exists!")
#             return redirect(url_for('add_product'))

#         return redirect(url_for('index'))

#     return render_template("add_product.html", form=form)


# @app.route("/product/<int:id_>/edit", methods=['GET', 'POST'])
# def edit_product(id_):
#     """Product edit view."""
#     prod = Product.query.get_or_404(id_)
#     form = AddProductForm(obj=prod)
# form.category_code.choices = db.session.query(Category.code, Category.name)

#     if form.validate_on_submit():
#         # prod.name = form.name.data
#         # prod.category_code = form.category_code.data
#         # prod.price = form.price.data

#         form.populate_obj(prod)

#         db.session.commit()
#         return redirect(url_for('index'))

#     return render_template("edit_product.html", form=form)


#        $$      $$$$$$    $$
#       $$$$     $$   $$   $$
#       $$$$     $$   q$m  $$
#      $$  $$    $$$$$$$   $$
#     $$$$$$$-   $$        $$
#     $$    $$   $$        $$
#    $$     i$$  $$        $$


@app.route('/v1/search')
def search_yelp():
    """API endpoint to relay search to Yelp search."""

    headers = {'Authorization': f'Bearer {API_KEY}'}
    params = parse_query_params(request.args)

    try:
        res = requests.get(f'{YELP_URL}/businesses/search',
                           params=params, headers=headers)
    except Exception as e:
        error_logging(e)
        return jsonify({'error': repr(e)})

    return res.json()


@app.route('/v1/business_detail/<business_id>')
def business_detail_yelp(business_id):
    """API endpoint to relay business search to Yelp business search."""

    headers = {'Authorization': f'Bearer {API_KEY}'}

    try:
        res = requests.get(f'{YELP_URL}/businesses/{business_id}',
                           headers=headers)
    except Exception as e:
        error_logging(e)
        return jsonify({'error': repr(e)})

    data = res.json()

    # Make a reports boolean flag attribute on data and set
    # true if there are reports about this businesss.
    business = Business.query.get(business_id)
    data['reports'] = bool(business.reports if business else False)

    return data


@app.route('/v1/preferences', methods=['POST'])
@add_user_to_g
def set_prefrences():
    """Endpoint to change user preferences."""

    if not g.user:
        return jsonify({'feedback': 'Error'})

    data = request.json

    preferences = dict()

    # set each setting to true if data is present else False
    for key in DEFAULT_PREFERENCES.__dict__:
        preferences[key] = bool(data.get(key, False))

    g.user.preferences = SimpleNamespace(**preferences)

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'feedback': 'Error!'})

    return jsonify({'feedback': 'Updated'})


@app.route('/v1/mission/<mission_id>')
@add_user_to_g
def load_mission(mission_id):
    """Endpoint to return a mission and all business on that mission."""

    mission = Mission.query.get_or_404(mission_id)

    businesses = [b.serialize() for b in mission.businesses]
    mission_dict = mission.serialize()

    # Set flags on missin dict for JavaScript use.
    # If user liked this mission set user_liked flag.
    if g.user.id == mission.editor or g.user.id in mission.likes:
        mission_dict['user_liked'] = True
    # If this mission is a creation of this user set editor to True.
    if g.user.id == mission.editor:
        mission_dict['editor'] = True
    else:
        mission_dict['editor'] = False

    return jsonify({'mission': mission_dict, 'businesses': businesses})


@app.route('/v1/add_business/mission/<mission_id>', methods=['POST'])
@add_user_to_g
def add_to_mission(mission_id):
    """Add business to mission endpoint."""

    if not g.user:
        return jsonify({'error': 'No user session data.'})

    mission = Mission.query.get_or_404(mission_id)

    data = request.json

    business = Business.query.get(data['id'])

    if business:
        if business in mission.businesses:
            return jsonify({'success': 'Already Added.'})
    else:
        business = Business.create(
            id=data['id'], name=data['name'], city=data['city'],
            state=data['state'], country=data['country'],
            longitude=float(data['longitude']),
            latitude=float(data['latitude']))
        try:
            db.session.commit()
        except Exception as e:
            error_logging(e)
            return jsonify({'error': 'Error!'})

    mission.businesses.append(business)

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Added!'})


@app.route('/v1/remove_business/mission/<mission_id>', methods=['POST'])
@add_user_to_g
def remove_from_mission(mission_id):
    """Remove business from mission endpoint."""

    if not g.user:
        return jsonify({'error': 'No user session data.'})

    mission = Mission.query.get_or_404(mission_id)

    data = request.json

    business = Business.query.get_or_404(data['id'])

    if business not in mission.businesses:
        return jsonify({'success': 'Business not in mission.'})

    mission.businesses.remove(business)

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Business Removed from Mission!'})


@app.route('/v1/mission/like<mission_id>', methods=['POST'])
@add_user_to_g
def like_mission(mission_id):
    """Endpoint to like and un-like missions."""

    if not g.user:
        return jsonify({'error': 'No user session data.'})

    mission = Mission.query.get_or_404(mission_id)

    likes = mission.likes.copy()

    if g.user.id in likes:
        likes.remove(g.user.id)
        success = 'removed'
    else:
        likes.add(g.user.id)
        success = 'added'

    mission.likes = likes

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'feedback': 'Error!'})

    return jsonify({'success': success, 'likes': len(mission.likes)})


@app.route('/v1/add_mission/<mission_id>', methods=['POST'])
@add_user_to_g
def add_mission(mission_id):
    """Add mission to user's missions endpoint."""

    if not g.user:
        return jsonify({'error': 'No user session data.'})

    mission = Mission.query.get_or_404(mission_id)

    if mission in g.user.missions:
        return jsonify({'success': 'Mission Already Added.'})

    g.user.missions.append(mission)

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Mission Added!'})


@app.route('/v1/remove_mission/<mission_id>', methods=['POST'])
@add_user_to_g
def remove_mission(mission_id):
    """Remove mission from user's missions endpoint."""

    if not g.user:
        return jsonify({'error': 'No user session data.'})

    mission = Mission.query.get_or_404(mission_id)

    if mission not in g.user.missions:
        return jsonify({'success': 'Mission Already Removed.'})

    g.user.missions.remove(mission)

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Mission Removed!'})


@app.route('/v1/report/like<report_id>', methods=['POST'])
@add_user_to_g
def like_report(report_id):
    """Endpoint to like and un-like reports."""

    if not g.user:
        return jsonify({'error': 'No user session data.'})

    report = Report.query.get_or_404(report_id)

    likes = report.likes.copy()

    if g.user.id in likes:
        likes.remove(g.user.id)
        success = 'removed'
    else:
        likes.add(g.user.id)
        success = 'added'

    report.likes = likes

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'feedback': 'Error!'})

    return jsonify({'success': success, 'likes': len(report.likes)})

# @app.route('/api/products')
# def get_products_api():
#     """Api endpoint to see all products"""
#     prods = Product.query.all()
#     serialized = [prod.serialize() for prod in prods]
#     return jsonify(products=serialized)


# @app.route('/api/products', methods=['POST'])
# def add_product_api():
#     """Api endpoint to add new product"""
#     data = request.json
#     relevant_data = {k: v for k, v in data.items() if k in Product.set_get()}
#     prod = Product(**relevant_data)
#     db.session.add(prod)
#     db.session.commit()

#     res = jsonify(product=prod.serialize())
#     return (res, 201)


# @app.route('/api/products/<int:id_>')
# def detail_product_api(id_):
#     """Api endpoint for individual product"""
#     prod = Product.query.get_or_404(id_)
#     return jsonify(product=prod.serialize())


# @app.route('/api/products/<int:id_>', methods=['PATCH'])
# def patch_product_api(id_):
#     """Api endpoint for patching product"""
#     data = request.json
#     relevant_data = {k: v for k, v in data.items() if k in Product.set_get()}
#     p = Product.query.filter_by(id=id_)
#     p.update(relevant_data)
#     db.session.commit()

#     return jsonify(product=p.one().serialize())


# @app.route('/api/products/<int:id_>', methods=["DELETE"])
# def delete_product_api(id_):
#     """Api endpoint for individual product"""
#     prod = Product.query.get_or_404(id_)
#     db.session.delete(prod)
#     db.session.commit()

# return jsonify({"message": "Product Deleted", "deleted": prod.serialize()})


#
# 404, 401
#


@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(401)
def unauthorized(e):
    return render_template("401.html"), 401


############################
""" Helper Functions"""


def get_coords_from_IP_address(request):
    """Call API and geolocate IP address."""

    # get IP address
    ip_address_raw = request.environ.get('HTTP_X_FORWARDED_FOR',
                                         request.remote_addr)
    # get first (leftmost) address for Heroku
    ip_address = ip_address_raw.split(',')[0].strip()
    # IP geolocation
    try:
        res = requests.get(f'http://ipwhois.app/json/{ip_address}')
        data = res.json()
    except Exception as e:
        error_logging(e)
        return '', ''

    lat = data.get('latitude', '')
    lng = data.get('longitude', '')

    # if API limit message.
    if data.get('message'):
        message_logging(data['message'])

    return lat, lng


def get_yelp_categories():
    """Return Yelp Categories.
       If user prefers not to see alcohol choices show no-alcohol list.
    """
    if (not g.user) or (g.user and g.user.preferences.show_alcohol):
        return YELP_CATEGORIES
    else:
        return no_alcohol()


def error_logging(e):
    """Log error when dev environment, sentry capture when production."""
    if debug:
        logging.error(repr(e))
    else:
        capture_exception(e)


def message_logging(message):
    """Log message when dev environment, sentry capture when production."""
    if debug:
        logging.warning(message)
    else:
        capture_message(message)


def render_template(*ars, **kwargs):
    """Wrap render_template and add debug flag to allow JS Sentry
       initalizatin only when debug is False (Production Environment).
    """

    global debug
    return r_t(*ars, debug=bool(debug), **kwargs)


def next_page_logic(request):
    """Next page login for signup and login."""

    next_page = request.args.get('next') or 'index'

    # Special case of clicking profile in navbar when not logged in.
    if next_page == 'user_detail':
        return redirect(url_for(f'{next_page}', user_id=0))

    return redirect(url_for(f'{next_page}'))


############################
""" Dev environment alter Headers"""

if not os.environ.get('SECRET_KEY'):
    ###########################################################################
    # Turn off all caching in Flask
    # https://stackoverflow.com/questions/34066804/disabling-caching-in-flask

    @app.after_request
    def add_header(req):
        """Add non-caching headers on every request."""

        req.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        req.headers["Pragma"] = "no-cache"
        req.headers["Expires"] = "0"
        req.headers['Cache-Control'] = 'public, max-age=0'
        return req
