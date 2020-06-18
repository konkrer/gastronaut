from flask import (   # noqa F401
    Flask, request, flash, make_response, Response,
    render_template, session, redirect, jsonify, abort,
    url_for
)
from flask_debugtoolbar import DebugToolbarExtension
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename
from werkzeug.exceptions import Unauthorized
import os
from models import (
    db, connect_db, Product, Category, User
)
from forms import AddProductForm, AddUserForm, EditUserForm, LoginForm

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///database_name'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True
app.config["SECRET_KEY"] = "L0;kla02j08sd39020-3kdsh_(082"
app.config["DEBUG_TB_INTERCEPT_REDIRECTS"] = False
debug = DebugToolbarExtension(app)

connect_db(app)


@app.route("/")
def index():
    """Home view."""
    # better way to hard code data than reading from file each time??
    # get yelp categories data in tuples as: (display name, category name)
    with open('yelp_restaurant_categories.txt') as f:
        cat_data = f.read().splitlines()  
    cat_data = [tuple(x.split(',')) for x in cat_data]
    # get alphabetized first letter list of categories
    first_set = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V', 'W']
        
    return render_template('index.html', cat_data=cat_data, first_set=first_set)

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
        relevant_data = {k: v for k, v in form.data.items()
                         if k in Product.set_get()}

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

@app.route("/<int:id_>", methods=['GET', 'POST'])
def index_id(id_):
    """Home view."""

    if request.method == "GET":
        session['var'] = var = request.args.get(
            'var')  # grab var from query string
        info = some_function(var, id_)
        return render_template("index.html", info=info)

    if request.method == "POST":
        form_val = request.form['expected_field']
        some_function(form_val, id_)
        return redirect(url_for('index'))


@app.route("/product/add", methods=['GET', 'POST'])
def add_product():
    """Product add view."""
    form = AddProductForm()
    form.category_code.choices = db.session.query(
        Category.code, Category.name).all()

    if form.validate_on_submit():
        # name = form.name.data
        # c_c = form.category_code.data
        # price = form.price.data
        # db.session.add(Product(name=name, category_code=c_c, price=price))
        data = form.data
        relevant_data = {k: v for k, v in data.items()
                         if k in Product.set_get()}

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

#
# Api
#


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
    relevant_data = {k: v for k, v in data.items()
                     if k in Product.set_get()}
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


@ app.route('/api/products/<int:id_>', methods=['PATCH'])
def patch_product_api(id_):
    """Api endpoint for patching product"""
    data = request.json
    relevant_data = {k: v for k, v in data.items()
                     if k in Product.set_get()}
    p = Product.query.filter_by(id=id_)
    p.update(relevant_data)
    db.session.commit()

    return jsonify(product=p.one().serialize())


@ app.route('/api/products/<int:id_>', methods=["DELETE"])
def delete_product_api(id_):
    """Api endpoint for individual product"""
    prod = Product.query.get_or_404(id_)
    db.session.delete(prod)
    db.session.commit()

    return jsonify({"message": "Product Deleted", "deleted": prod.serialize()})


#
# 404, 401
#


@ app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@ app.errorhandler(401)
def unauthorized(e):
    return render_template("401.html"), 401


############################
""" Hypothetical Funtion """


def some_function(*args, **kwargs):
    return False
