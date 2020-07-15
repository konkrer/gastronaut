"""Restaurant discovery, food exploration web app."""

from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk import (capture_message, capture_exception,
                        init as sentry_init)
from flask import (  # noqa F401
    Flask, request, flash, make_response, Response, render_template, session,
    redirect, jsonify, abort, url_for)
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename
from werkzeug.exceptions import Unauthorized
import requests
import logging
import os
from models import (db, connect_db, User, Mission, UserMission,  # noqa F401
                    Preferences, Business, Report, MissionBusiness)  # noqa F401
from forms import AddProductForm, AddUserForm, LoginForm
from static.py_modules.yelp_helper import (yelp_categories, first_letters,
                                           parse_query_params, YELP_URL)
Product, Category = None, None  # remove me


logging.basicConfig(filename='gastronaut.log', level=logging.DEBUG,
                    format='%(levelname)s:%(asctime)s:%(message)s')

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'postgresql:///gastronaut')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


# Dev / Production setup differentiation:
#
# if development server enable debugging and load local keys.
if not app.config["SECRET_KEY"]:
    from flask_debugtoolbar import DebugToolbarExtension
    from local_settings import API_KEY, SECRET_KEY

    app.config["SECRET_KEY"] = SECRET_KEY
    app.config['SQLALCHEMY_ECHO'] = True
    app.config["DEBUG_TB_INTERCEPT_REDIRECTS"] = False
    debug = DebugToolbarExtension(app)
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


@app.route('/capture-test')
def c_t():
    capture_message('herro from flask!!l')
    try:
        raise ValueError
    except ValueError as e:
        capture_exception(e)

    return 'testy mc tester nutz'


@app.route("/")
def index():
    """Home view."""

    lat, lng = get_coords_from_IP_address(request)

    return render_template(
        'index.html',
        yelp_categories=yelp_categories,
        first_letters=first_letters,
        lat=lat,
        lng=lng,
    )


#
#  8$$$$$$  $$$$$$$$  h$+   h$  +$$$$$$|
# $$+   $$q $$    o$d h$+   h$  +$h   $$a
# $$        $$$$$$$$  h$+   h$  +$h    $$
# $$        $$$$$$    h$+   h$  +$h    $$
# $$0   $$< $$   $$$  ;$$   $$  +$h   O$$
#   $$$$$   $$    $$$  $$$$$$$  +$$$$$$/
#
# User CRUD, login, logout
#


@app.route("/signup", methods=['GET', 'POST'])
def signup():
    """Sign up view."""
    if "user_id" in session:
        return redirect(url_for('user_detail', username=session['user_id']))

    form = AddUserForm()

    if form.validate_on_submit():
        password = form.password.data
        relevant_data = {
            k: v
            for k, v in form.data.items() if k in Product.set_get()
        }

        try:
            new_user = User.register(password, **relevant_data)
            db.session.add(new_user)
            db.session.commit()
            session['user_id'] = new_user.id
            flash("New User Created!", "success")
            return redirect(url_for('index'))

        except Exception as e:
            flash(f"Error: {e}")  # move to logging

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")
    return render_template('signup.html', form=form)


@app.route("/login", methods=['GET', 'POST'])
def login():
    """Sign up view."""
    if "user_id" in session:
        return redirect(f"users/{session['user_id']}")

    form = LoginForm()

    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data

        user = User.authenticate(email, password)
        if user:
            session['user_id'] = user.id
            return redirect(url_for('index'))

        if user is None:
            form.email.errors.append("Email not found.", "warning")
        if user is False:
            form.password.errors.append("Password incorrect.", "warning")

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")
    return render_template('login.html', form=form)


@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id')
    flash("Logged out.")
    return redirect(url_for('index'))


@app.route("/users/<username>")
def user_detail(username):
    """User detail view."""

    if 'user_id' not in session:
        return redirect(url_for('login'))

    if not session['user_id'] == username:
        raise Unauthorized

    user = User.query.filter_by(username=username).first()
    return render_template("detail_user.html", user=user)


@app.route("/users/<username>/delete", methods=['POST'])
def delete_user(username):
    """Delete User view"""
    if 'user_id' not in session or not session['user_id'] == username:
        raise Unauthorized

    user = User.query.get(username)
    db.session.delete(user)
    db.session.commit()
    del session['user_id']
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


#       $$$    $$$$$$%  $x
#      .$.$[   $$   $$  $x
#      $$ $$   $$$$$$$  $x
#     0$$$$$$  $$$$x    $x
#     $$   %$~ $$       $x
#    $$     $$ $$       $x


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
        # TODO: log errors
        return jsonify({'error': repr(e)})

    if res.status_code == 200:
        return res.json()

    # TODO: log bad status code.
    return jsonify({
        'error': f'There seems to be a problem - {res.status_code}'
    })


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
        if debug:
            logging.error(f'ipwhois API FAILURE: {e}')
        else:
            capture_exception(e)
        return '', ''

    lat = data.get('latitude', '')
    lng = data.get('longitude', '')

    if data.get('message'):
        if debug:
            logging.warning(data['message'])
        else:
            capture_message(data['message'])

    return lat, lng


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
