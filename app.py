"""Restaurant discovery, food exploration web app."""

from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk import (capture_message, capture_exception,
                        init as sentry_init)
from flask import (  # noqa F401
    Flask, request, flash, make_response, Response, session,
    redirect, jsonify, abort, url_for, g, render_template as r_t)
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename
# from werkzeug.exceptions import Unauthorized
import requests
import logging
import os
from models import (db, connect_db, User, Mission, UserMission,  # noqa F401
                    Business, Report, MissionBusiness)  # noqa F401
from forms import AddUserForm, LoginForm, EditUserForm
from static.py_modules.decorators import add_user_to_g, login_required
from static.py_modules.yelp_helper import (yelp_categories, first_letters,
                                           parse_query_params, YELP_URL)

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
    logging.basicConfig(filename='gastronaut.log', level=logging.DEBUG,
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


@app.route("/")
@add_user_to_g
def index():
    """Home view."""

    search_term = request.args.get('q')

    lat, lng = get_coords_from_IP_address(request)

    return render_template(
        'index.html',
        yelp_categories=yelp_categories,
        first_letters=first_letters,
        lat=lat,
        lng=lng,
        search_term=search_term
    )


@app.route("/mission-control")
@add_user_to_g
@login_required
def mission_control():
    """Missions control view."""

    return render_template('base.html')


@app.route("/navtest")
def navtest():
    """Navber search testing view."""

    return render_template('base.html')


#
#   $$    $$    $$$.   $$$$$$$$  $$$$$<
#   $$    $$  $$$ $$$  $$$$$$$$  $$$$$$$$
#   $$    $$  $$       $$+       $$    $$
#   $$    $$   $$$$$   $$$$$$$Y  $$$$$$$O
#   $$    $$      ^$$o $$+       $$ '$$
#   $$    $$  $$    $$ $$+       $$   $$
#    $$$$$$   d$$$$$$  $$$$$$$$  $$    $$

# User CRUD, login, logout
#

@app.route("/signup", methods=['GET', 'POST'])
@add_user_to_g
def signup():
    """Sign up view."""

    if g.user:
        return redirect(url_for('user_detail'))

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
            return redirect(url_for('index'))

        except Exception as e:
            db.session.rollback()
            flash("Error Creating User", 'danger')
            errorLogging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")
    return render_template('user/signup.html', form=form)


@app.route("/login", methods=['GET', 'POST'])
@add_user_to_g
def login():
    """Login view."""

    if g.user:
        return redirect(url_for('user_detail'))

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
            return redirect(url_for('index'))

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return render_template('user/login.html', form=form)


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
            errorLogging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "danger")

    return render_template('user/edit_user.html', form=form)


@app.route("/user/profile/<user_id>")
@add_user_to_g
@login_required
def user_detail(user_id):
    """User detail view."""

    user = User.query.get_or_404(user_id)

    return render_template("user/detail_user.html", user=user)


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


@app.route("/product/add", methods=['GET', 'POST'])
def add_product():
    """Product add view."""
    form = AddProductForm()
    form.category_code.choices = db.session.query(Category.code,
                                                  Category.name).all()

    if form.validate_on_submit():
        # name = form.name.data
        # c_c = form.category_code.data
        # price = form.price.data
        # db.session.add(Product(name=name, category_code=c_c, price=price))
        data = form.data
        relevant_data = {
            k: v
            for k, v in data.items() if k in Product.set_get()
        }

        if form.photo_file.data:
            f = form.photo_file.data
            filename = secure_filename(f.filename)
            path = os.path.join('static\\uploads', filename)
            f.save(path)

            relevant_data['photo_file'] = path

        try:
            db.session.add(Product(**relevant_data))
            db.session.commit()
            flash("Product added!")
        except IntegrityError:
            flash("Name already exists!")
            return redirect(url_for('add_product'))

        return redirect(url_for('index'))

    return render_template("add_product.html", form=form)


@app.route("/product/<int:id_>/edit", methods=['GET', 'POST'])
def edit_product(id_):
    """Product edit view."""
    prod = Product.query.get_or_404(id_)
    form = AddProductForm(obj=prod)
    form.category_code.choices = db.session.query(Category.code, Category.name)

    if form.validate_on_submit():
        # prod.name = form.name.data
        # prod.category_code = form.category_code.data
        # prod.price = form.price.data

        form.populate_obj(prod)

        db.session.commit()
        return redirect(url_for('index'))

    return render_template("edit_product.html", form=form)


#      $$     $$$$$$   $$
#     $$$$    $$   $$  $$
#     $$$$    $$   q$m $$
#    $$  $$   $$$$$$$  $$
#   $$$$$$$-  $$       $$
#   $$    $$  $$       $$
#  $$     i$$ $$       $$


@app.route('/v1/search')
def search_yelp():
    """API endpoint to relay search to Yelp search."""
    headers = {'Authorization': f'Bearer {API_KEY}'}
    params = parse_query_params(request.args)

    try:
        res = requests.get(f'{YELP_URL}/businesses/search',
                           params=params,
                           headers=headers)
    except Exception as e:
        errorLogging(e)
        return jsonify({'error': repr(e)})

    return res.json()


@app.route('/api/products')
def get_products_api():
    """Api endpoint to see all products"""
    prods = Product.query.all()
    serialized = [prod.serialize() for prod in prods]
    return jsonify(products=serialized)


@app.route('/api/products', methods=['POST'])
def add_product_api():
    """Api endpoint to add new product"""
    data = request.json
    relevant_data = {k: v for k, v in data.items() if k in Product.set_get()}
    prod = Product(**relevant_data)
    db.session.add(prod)
    db.session.commit()

    res = jsonify(product=prod.serialize())
    return (res, 201)


@app.route('/api/products/<int:id_>')
def detail_product_api(id_):
    """Api endpoint for individual product"""
    prod = Product.query.get_or_404(id_)
    return jsonify(product=prod.serialize())


@app.route('/api/products/<int:id_>', methods=['PATCH'])
def patch_product_api(id_):
    """Api endpoint for patching product"""
    data = request.json
    relevant_data = {k: v for k, v in data.items() if k in Product.set_get()}
    p = Product.query.filter_by(id=id_)
    p.update(relevant_data)
    db.session.commit()

    return jsonify(product=p.one().serialize())


@app.route('/api/products/<int:id_>', methods=["DELETE"])
def delete_product_api(id_):
    """Api endpoint for individual product"""
    prod = Product.query.get_or_404(id_)
    db.session.delete(prod)
    db.session.commit()

    return jsonify({"message": "Product Deleted", "deleted": prod.serialize()})


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
        errorLogging(e)
        return '', ''

    lat = data.get('latitude', '')
    lng = data.get('longitude', '')

    # if API limit message.
    if data.get('message'):
        messageLogging(data['message'])

    return lat, lng


def errorLogging(e):
    """Log error when dev environment, sentry capture when production."""
    if debug:
        logging.error(repr(e))
    else:
        capture_exception(e)


def messageLogging(message):
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
