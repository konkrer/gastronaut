"""Restaurant discovery, food exploration web app."""

import logging
import os
import boto3
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration  # noqa F401
from sentry_sdk import init as sentry_init
from flask import (
    Flask, request, flash, session,
    redirect, url_for, g)
from werkzeug.exceptions import Unauthorized, BadRequest
from models import (db, connect_db, User, Mission,
                    Business, Report)
from forms import (
    AddUserForm, LoginForm, EditUserForm, AddReportForm, EditReportForm)
from static.py_modules.decorators import add_user_to_g, login_required
from static.py_modules.yelp_helper import (
    first_letters, get_yelp_categories)
from static.py_modules.helper_functions import HelperFunctions as H
# Blueprints
from api.api import api_b_p


app = Flask(__name__)
app.register_blueprint(api_b_p, url_prefix='/v1')

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'postgresql:///gastronaut')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

S3_CLIENT = boto3.client('s3')


# Dev / Production setup differentiation:
#
# if development server enable debugging and load local keys.
if not os.environ.get('SECRET_KEY'):
    from flask_debugtoolbar import DebugToolbarExtension
    from development_local.local_settings import (
        SECRET_KEY, S3_BUCKET_NAME)

    app.config["SECRET_KEY"] = SECRET_KEY
    app.config['SQLALCHEMY_ECHO'] = True
    app.config["DEBUG_TB_INTERCEPT_REDIRECTS"] = False
    DEBUG = DebugToolbarExtension(app)
    logging.basicConfig(filename='gastronaut.log', level=logging.WARNING,
                        format='%(levelname)s:%(asctime)s:%(message)s')
#
# if production server enable sentry and load environ variables.
else:
    sentry_init(
        dsn="https://1faae11aaacf4e749bf6d9cc1ae5286a@o415488.ingest.sentry.io/5319947",  # NOQA E 501
        integrations=[FlaskIntegration(), SqlalchemyIntegration()]
    )
    app.config["SECRET_KEY"] = os.environ.get('SECRET_KEY')
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')

    DEBUG = False


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

    lat, lng = H.get_coords_from_IP_address(request)

    return H.render_template(
        'index.html',
        YELP_CATEGORIES=get_yelp_categories(),
        first_letters=first_letters,
        lat=lat,
        lng=lng,
        search_term=search_term
    )


@app.route('/navbar-search')
def navbar_search():
    """View to route navbar searches. If normal term search on index page.
       If @username check for user and route to user detail if found.
       If username not found return to page user searched from."""

    search_term = request.args.get('q')

    if search_term and search_term.startswith('@'):
        search_user = User.query.filter_by(username=search_term[1:]).first()
        if not search_user:
            search_user = User.query.filter(
                User.username.ilike(f'%{search_term[1:]}%')).first()
        if search_user:
            return redirect(
                url_for('user_detail', username=search_user.username))

        flash(f'Gastronaut {search_term} not found', 'warning')

        return H.next_page_logic(request)

    return redirect(url_for('index', q=search_term))


@app.route("/mission-control")
@add_user_to_g
@login_required
def mission_control():
    """Missions control view."""

    missions = g.user.missions

    missions.sort(key=lambda x: x.name.lower())

    return H.render_template('mission_control.html', missions=missions)


@app.route('/missions')
@add_user_to_g
def missions():
    """Missions view."""

    query_params = request.args.to_dict()

    if not query_params:
        missions = Mission.get_by_recent()
    else:
        missions = Mission.search(query_params)

    return H.render_template('missions.html', missions=missions,
                             form_data=query_params)


@app.route('/missions/<mission_id>')
@add_user_to_g
def mission_detail(mission_id):
    """Mission detail view."""

    mission = Mission.query.get_or_404(mission_id)

    if not mission.date_shared:
        return Unauthorized()

    user = mission.author

    return H.render_template('mission.html', missions=[mission],
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

    return H.render_template('reports.html', reports=reports,
                             form_data=query_params)


@app.route('/reports/business/<business_id>')
@add_user_to_g
def business_reports_detail(business_id):
    """Business reports detail view.
       All reports for a particular business.
       Accessed through business detail modal 'See More Reports' Button"""

    business = Business.query.get(business_id)
    reports = business.reports

    # Fill in form on page with business data by supplying query parameters.
    query_params = {'keywords': business.name, 'city': business.city,
                    'state': business.state, 'country': business.country,
                    'sort_by': 'recent'}

    return H.render_template('reports.html', reports=reports,
                             form_data=query_params)

#
# 404, 401
#


@app.errorhandler(404)
def page_not_found(e):
    return H.render_template("404.html"), 404


@app.errorhandler(401)
def unauthorized(e):
    return H.render_template("401.html"), 401


#
#     $$    $$    $$$.    $$$$$$$$  $$$$$<
#     $$    $$  $$$ $$$   $$^^^^^^  $$$$$$$$
#     $$    $$  $$        $$+       $$    $$
#     $$    $$   $$$$$    $$$$$$$Y  $$$$$$$O
#     $$    $$      ^$$o  $$+       $$ '$$
#     $$    $$  $$    $$  $$+       $$   $$
#      $$$$$$   d$$$$$$   $$$$$$$$  $$    $$
############################
"""User CRUD, login, logout"""


@app.route("/signup", methods=['GET', 'POST'])
@add_user_to_g
def signup():
    """Sign up view."""

    if g.user:
        return redirect(url_for('user_detail', username=g.user.username))

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

            return H.next_page_logic(request)

        except Exception as e:
            db.session.rollback()
            flash("Error Creating User", 'danger')
            H.error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    # Create URL for login button that passes all URL data.
    login_url = request.full_path.replace('/signup', '/login')
    return H.render_template(
        'user/signup.html', form=form, login_url=login_url)


@app.route("/login", methods=['GET', 'POST'])
@add_user_to_g
def login():
    """Login view."""

    if g.user:
        return redirect(url_for('user_detail', username=g.user.username))

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

            return H.next_page_logic(request)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    # Create URL for signin button that passes all URL data.
    signup_url = request.full_path.replace('login', 'signup')
    return H.render_template('user/login.html', form=form,
                             signup_url=signup_url)


@app.route("/user/edit", methods=['GET', 'POST'])
@add_user_to_g
@login_required
def user_edit():
    """User edit profile view."""

    form = EditUserForm(obj=g.user)

    if form.validate_on_submit():

        form.populate_obj(g.user)

        try:
            db.session.commit()
            flash("Profile Updated!", "success")
            return redirect(url_for('user_detail', username=g.user.username))

        except Exception as e:
            db.session.rollback()
            flash("Error Updating User Profile", 'danger')
            H.error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return H.render_template('user/edit_user.html', form=form)


@app.route("/user/profile/<username>")
@add_user_to_g
def user_detail(username):
    """User detail view."""

    # If user was logged out and clicked "Profile" username will be 0.
    # Lookup their ID and use that.
    # Don't show Former User's profile - #2. Lookup their ID and use that.
    if username == '0' or username == 'Former User':
        if g.user:
            user = g.user
        else:
            return redirect(url_for(
                'login', next_='user_detail', username='0'))
    # If user looking at their own profile use g.user.
    elif g.user and username == g.user.username:
        user = g.user
    else:
        user = User.query.filter_by(username=username).first()
        if not user:
            return H.render_template('404.html')

    shared_missions = [m for m in user.my_missions if m.is_public]

    return H.render_template("user/detail_user.html",
                             user=user, missions=shared_missions,
                             reports=user.reports)


@app.route('/logout', methods=['POST'])
@add_user_to_g
def logout():
    """User logout view."""

    del session['user_id']
    flash(f"{g.user.username} logged out.", 'success')
    return H.next_page_logic(request)


@app.route("/user/delete", methods=['POST'])
@add_user_to_g
@login_required
def delete_user():
    """Delete User view"""

    # delete user_missions related to this user
    g.user.user_missions = []
    db.session.commit()

    missions = g.user.my_missions
    to_delete = [m for m in missions if not m.date_shared]
    to_sort = [m for m in missions if m.date_shared]
    to_keep = []

    # If no one else is linked to mission ok to delete.
    [to_delete.append(m) if len(m.user_missions) == 0
     and len([r for r in m.reports if r.user_id != g.user.id]) == 0
     else to_keep.append(m) for m in to_sort]

    # Add user reports to be deleted.
    to_delete.extend(g.user.reports)
    # Delete
    [db.session.delete(d) for d in to_delete]

    # set to keep missions to no longer be public.
    [k.__setattr__('is_public', False) for k in to_keep]

    db.session.commit()

    db.session.delete(g.user)
    db.session.commit()
    del session['user_id']
    flash('User Account Deleted', 'success')

    return redirect(url_for('index'))


#  $$$$$$$$   $$$$$$$   $$$$$$$     $$$$$$'   x$$$$$$$   $$$$$$$$
#  $$    $$   $$        $$    $$   $$    $$:  x$Y   \$$     $$
#  $$   C$$   $$$$$$$   $$    $$  $$      $$  x$Y   $$      $$
#  $$$$$$     $$$$$$$   $$$$$$$   $$      $$  x$$$$$?       $$
#  $$  `$$    $$        $$        z$$    h$$  x$Y  $$j      $$
#  $$   .$$   $$$$$$$$  $$         $$$n+$$$   x$Y   $$?     $$
#  $$    .$$  $$$$$$$$  $$           d$$$     x$Y    $$ '   $$
############################
""" Report CRUD"""


@app.route('/report/<report_id>')
@add_user_to_g
def report_detail(report_id):
    """Report detail view."""

    report = Report.query.get_or_404(report_id)
    user = report.user

    return H.render_template('report.html', reports=[report],
                             user=user)


@app.route("/report", methods=['GET', 'POST'])
@add_user_to_g
@login_required
def add_report():
    """Write Report View."""

    mission_id = request.args.get('mission_id')
    business_id = request.args.get('business_id')

    if mission_id and business_id:
        return BadRequest

    form = AddReportForm()

    if form.validate_on_submit():

        relevant_data = {
            k: v
            for k, v in form.data.items() if k in Report.set_get()
        }

        form, relevant_data, f, path = H.check_file_upload_logic(
            form, relevant_data)

        report = Report.create(user_id=g.user.id, mission_id=mission_id,
                               business_id=business_id, **relevant_data)

        try:
            db.session.commit()
            if f:
                S3_CLIENT.upload_fileobj(f, S3_BUCKET_NAME, path)
            flash("Report added!", 'success')
            return redirect(url_for('report_detail', report_id=report.id))

        except Exception as e:
            db.session.rollback()
            flash("Error Creating Report!", 'danger')
            H.error_logging(e)

    existing_report = H.check_for_existing_report(mission_id, business_id)
    if existing_report:
        # redirect to edit_report view for this report and relay request args.
        request_ars = request.args.to_dict()
        return redirect(
            url_for('edit_report', report_id=existing_report.id, **request_ars)
        )

    if mission_id:
        kind = 'Mission'
        model = Mission.query.get_or_404(mission_id)
    else:
        kind = 'Business'
        model = Business.query.get(business_id)
        if not model:
            model = H.add_new_business(business_id, request.args)
            if model is False:
                return BadRequest

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return H.render_template(
        "add_report.html", form=form, model=model,
        kind=kind)


@app.route("/report/<report_id>/edit", methods=['GET', 'POST'])
@add_user_to_g
@login_required
def edit_report(report_id):
    """Report edit view."""

    report = Report.query.get_or_404(report_id)
    form = EditReportForm(obj=report)

    if form.validate_on_submit():

        form, f, path, old_file = H.check_file_upload_logic_w_clear(form)

        form.populate_obj(report)

        try:
            db.session.commit()
            if f:
                S3_CLIENT.upload_fileobj(f, S3_BUCKET_NAME, path)
            if old_file:
                H.s3_delete(old_file)
            flash("Report Edited!", 'success')
            return redirect(url_for('report_detail', report_id=report.id))

        except Exception as e:
            db.session.rollback()
            flash("Error Editing Report!", 'danger')
            H.error_logging(e)

    if report.mission_id:
        model = Mission.query.get_or_404(report.mission_id)
        kind = 'Mission'
    else:
        model = Business.query.get_or_404(report.business_id)
        kind = 'Business'

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return H.render_template(
        "edit_report.html", form=form, model=model,
        kind=kind, report_id=report_id)


@app.route('/report/<report_id>/delete', methods=['POST'])
@add_user_to_g
@login_required
def delete_report(report_id):
    """Delete report view."""

    report = Report.query.get_or_404(report_id)

    if not report.user_id == g.user.id:
        return Unauthorized()

    old_file = report.photo_file if report.photo_file else None

    db.session.delete(report)

    try:
        db.session.commit()
        if old_file:
            H.s3_delete(old_file)
        flash("Report Deleted!", 'success')

    except Exception as e:
        db.session.rollback()
        flash("Error Deleting Report!", 'danger')
        H.error_logging(e)

    return redirect(url_for('user_detail', username=g.user.username))


############################
"""Force HTTPS."""


@app.before_request
def before_request():
    """Force Https on Heroku.

    https://stackoverflow.com/a/29026676/11164558"""

    if (
        not DEBUG
        and not request.headers.get("HTTP_X_FORWARDED_PROTO") == 'https'
        and request.url.startswith('http://')
    ):
        secure_url = request.url.replace("http://", "https://", 1)
        return redirect(secure_url)


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
