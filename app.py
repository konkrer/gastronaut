"""Restaurant discovery, food exploration web app."""

import requests
import logging
import os
import boto3
from uuid import uuid4
from types import SimpleNamespace
from google.oauth2 import id_token
from google.auth.transport import requests as requests_google
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration  # noqa F401
from sentry_sdk import (capture_message, capture_exception,
                        init as sentry_init)
from flask import (
    Flask, request, flash, session,
    redirect, jsonify, url_for, g, render_template as r_t)
from werkzeug.utils import secure_filename
from werkzeug.exceptions import Unauthorized, BadRequest
from models import (db, connect_db, User, Mission, UserMission,
                    Business, Report, BOOLEAN_PREFERENCES)
from forms import (
    AddUserForm, LoginForm, EditUserForm, AddReportForm, EditReportForm)
from static.py_modules.decorators import add_user_to_g, login_required
from static.py_modules.yelp_helper import (
    YELP_CATEGORIES, no_alcohol, first_letters, parse_query_params,
    YELP_URL)


app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'postgresql:///gastronaut')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

S3_CLIENT = boto3.client('s3')
S3_RESOURCE = boto3.resource('s3')
GOOGLE_O_AUTH_CLIENT_ID = '992789148520-btgg6dtlrk8rkght89rfvdbfgu2ljeut.apps.googleusercontent.com'  # noqa E501


# Dev / Production setup differentiation:
#
# if development server enable debugging and load local keys.
if not os.environ.get('SECRET_KEY'):
    from flask_debugtoolbar import DebugToolbarExtension
    from development_local.local_settings import (
        YELP_API_KEY, SECRET_KEY, MAILGUN_API_KEY, MAILGUN_DOMAIN,
        S3_BUCKET_NAME, CLOUDFRONT_DOMAIN_NAME)

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
    YELP_API_KEY = os.environ.get('YELP_API_KEY')
    MAILGUN_API_KEY = os.environ.get('MAILGUN_API_KEY')
    MAILGUN_DOMAIN = os.environ.get('MAILGUN_DOMAIN')
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
    CLOUDFRONT_DOMAIN_NAME = os.environ.get('CLOUDFRONT_DOMAIN_NAME')

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

    lat, lng = get_coords_from_IP_address(request)

    return render_template(
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

        return next_page_logic(request)

    return redirect(url_for('index', q=search_term))


@app.route("/mission-control")
@add_user_to_g
@login_required
def mission_control():
    """Missions control view."""

    missions = g.user.missions

    missions.sort(key=lambda x: x.name.lower())

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

    if not mission.date_shared:
        return Unauthorized()

    user = mission.author

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

    return render_template('reports.html', reports=reports,
                           form_data=query_params)

#
# 404, 401
#


@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404


@app.errorhandler(401)
def unauthorized(e):
    return render_template("401.html"), 401


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

            return next_page_logic(request)

        except Exception as e:
            db.session.rollback()
            flash("Error Creating User", 'danger')
            error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    # Create URL for login button that passes all URL data.
    login_url = request.full_path.replace('/signup', '/login')
    return render_template('user/signup.html', form=form, login_url=login_url)


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

            return next_page_logic(request)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    # Create URL for signin button that passes all URL data.
    signup_url = request.full_path.replace('login', 'signup')
    return render_template('user/login.html', form=form,
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
            error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return render_template('user/edit_user.html', form=form)


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
            return render_template('404.html')

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
    return next_page_logic(request)


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

    return render_template('report.html', reports=[report],
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

        form, relevant_data, f, path = check_file_upload_logic(
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
            error_logging(e)

    existing_report = check_for_existing_report(mission_id, business_id)
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
            model = add_new_business(business_id, request.args)
            if model is False:
                return BadRequest

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return render_template(
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

        form, f, path, old_file = check_file_upload_logic_w_clear(form)

        form.populate_obj(report)

        try:
            db.session.commit()
            if f:
                S3_CLIENT.upload_fileobj(f, S3_BUCKET_NAME, path)
            if old_file:
                s3_delete(old_file)
            flash("Report Edited!", 'success')
            return redirect(url_for('report_detail', report_id=report.id))

        except Exception as e:
            db.session.rollback()
            flash("Error Editing Report!", 'danger')
            error_logging(e)

    if report.mission_id:
        model = Mission.query.get_or_404(report.mission_id)
        kind = 'Mission'
    else:
        model = Business.query.get_or_404(report.business_id)
        kind = 'Business'

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return render_template(
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
            s3_delete(old_file)
        flash("Report Deleted!", 'success')

    except Exception as e:
        db.session.rollback()
        flash("Error Deleting Report!", 'danger')
        error_logging(e)

    return redirect(url_for('user_detail', username=g.user.username))


#        $$      $$$$$$    $$
#       $$$$     $$   $$   $$
#       $$$$     $$   q$m  $$
#      $$  $$    $$$$$$$   $$
#     $$$$$$$-   $$        $$
#     $$    $$   $$        $$
#    $$     i$$  $$        $$
############################
""" API Endpoints"""


@app.route('/v1/search')
def search_yelp():
    """API endpoint to relay search to Yelp search."""

    headers = {'Authorization': f'Bearer {YELP_API_KEY}'}
    params = parse_query_params(request.args)

    try:
        res = requests.get(f'{YELP_URL}/businesses/search',
                           params=params, headers=headers)
    except Exception as e:
        error_logging(e)
        return jsonify({'error': repr(e)})

    return res.json()


@app.route('/v1/business_detail/<business_id>')
@add_user_to_g
def business_detail_yelp(business_id):
    """API endpoint to relay business search to Yelp business search."""

    headers = {'Authorization': f'Bearer {YELP_API_KEY}'}

    try:
        # Get business details
        res = requests.get(
            f'{YELP_URL}/businesses/{business_id}', headers=headers)
        if not res.ok:
            res.raise_for_status()
        # Get reviews for business
        res2 = requests.get(
            f'{YELP_URL}/businesses/{business_id}/reviews', headers=headers)
        if not res2.ok:
            res2.raise_for_status()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': repr(e)})

    data = res.json()
    data['reviews'] = res2.json()['reviews']

    business = Business.query.get(business_id)

    if business:
        reports = Report.get_business_reports_users(business.id)
        # Max 3 reports. If there are more than 3 set 'more_results' to True.
        data['reports'] = reports[:3]
        data['more_results'] = len(reports) > 3
    else:
        data['reports'] = []

    return data


@app.route('/v1/preferences', methods=['POST'])
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
        error_logging(e)
        return jsonify({'feedback': 'Error!'})

    return jsonify({'feedback': 'Updated'})


@app.route('/v1/mission/<mission_id>')
@add_user_to_g
def load_mission(mission_id):
    """Endpoint to return a mission and all business on that mission.
       Used by mission-control."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)

    user_mission = UserMission.query.filter_by(
        user_id=g.user.id, mission_id=mission.id).one()

    businesses = [b.serialize() for b in mission.businesses]

    businesses.sort(key=lambda x: x['name'].lower())

    for b in businesses:
        if b['id'] in user_mission.goals_completed:
            b['completed'] = True

    mission_dict = mission.serialize()
    # If user liked this mission set user_liked flag.
    if g.user.id == mission.editor or g.user.id in mission.likes:
        mission_dict['user_liked'] = True
    # If this mission is a creation of this user set editor to True.
    if g.user.id == mission.editor:
        mission_dict['editor'] = True
    else:
        mission_dict['editor'] = False
        mission_dict['username'] = mission.author.username

    return jsonify({'mission': mission_dict, 'businesses': businesses})


@app.route('/v1/mission', methods=['POST'])
@add_user_to_g
def create_mission():
    """Endpoint to create a mission."""

    if not g.user:
        return Unauthorized()

    try:
        mission = Mission.create(editor=g.user.id, **request.json)
        db.session.commit()
        g.user.missions.append(mission)
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': repr(e)})

    return jsonify({'success': 'Mission Created!',
                    'mission': mission.serialize()})


@app.route('/v1/mission', methods=['PUT'])
@add_user_to_g
def update_mission():
    """Endpoint to update a mission."""

    note = {}

    data = request.json
    mission = Mission.query.get_or_404(data['id'])

    if not g.user.id == mission.editor:
        return Unauthorized()

    if data.get('is_public'):
        if len(mission.businesses):
            mission.share()
        else:
            note['note'] = 'You cannot share a mission without goals.'

        del data['is_public']
    else:
        data['is_public'] = False

    mission.update(**data)

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': repr(e)})

    return jsonify({
        'success': 'updated',
        'mission': mission.serialize(),
        **note
    })


@app.route('/v1/mission/<mission_id>', methods=['DELETE'])
@add_user_to_g
def delete_mission(mission_id):
    """Endpoint to delete a mission."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)
    g.user.missions.remove(mission)

    db.session.commit()

    # if mission was shared and is in use or a report was written don't delete.
    if (mission.date_shared and mission.user_missions) or mission.reports:
        mission.is_public = False
        mission.editor = 2
        db.session.commit()
        return jsonify({'success': 'Mission Deleted!'})

    try:
        db.session.delete(mission)
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': repr(e)})

    return jsonify({'success': 'Mission Deleted!'})


@app.route('/v1/mission/add_business/<mission_id>', methods=['POST'])
@add_user_to_g
def add_to_mission(mission_id):
    """Add business to mission endpoint."""

    if not g.user:
        return Unauthorized()

    mission = Mission.query.get_or_404(mission_id)

    data = request.json

    business = Business.query.get(data['id'])

    if business:
        if business in mission.businesses:
            return jsonify({'success': 'Already Added.', 'color': 'warning'})
    else:
        # Index page adds new businesses to DB.
        business = Business.create(
            id=data['id'], name=data['name'], city=data['city'],
            state=data['state'], country=data['country'],
            longitude=float(data['longitude'] or 0),
            latitude=float(data['latitude'] or 0))

    mission.businesses.append(business)

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Added!', 'color': 'green'})


@app.route('/v1/mission/remove_business/<mission_id>', methods=['POST'])
@add_user_to_g
def remove_from_mission(mission_id):
    """Endpoint to remove business from mission ."""

    mission = Mission.query.get_or_404(mission_id)

    if not g.user and g.user.id == mission.editor:
        return Unauthorized()

    data = request.json

    business = Business.query.get_or_404(data['business_id'])

    if business not in mission.businesses:
        return jsonify({'success': 'Business not in mission.'})

    mission.businesses.remove(business)
    # don't allow sharing when mission has no businesses.
    if len(mission.businesses) == 0:
        mission.is_public = False

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
        return Unauthorized()

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
    """Endpoint to add mission to user's missions."""

    if not g.user:
        return Unauthorized()

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
    """Endpoint to remove mission from user's missions."""

    if not g.user:
        return Unauthorized()

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


@app.route('/v1/mission/goal_completed/<mission_id>', methods=['POST'])
@add_user_to_g
def goal_completed(mission_id):
    """Endpoint to add/remove business from goals_completed."""

    if not g.user:
        return Unauthorized()

    user_mission = UserMission.query.filter_by(
        user_id=g.user.id, mission_id=mission_id).one()

    goals_completed = user_mission.goals_completed.copy()

    data = request.json

    if data['business_id'] in goals_completed:
        goals_completed.remove(data['business_id'])
        out = {'success': 'Goal Open!'}
    else:
        goals_completed.append(data['business_id'])
        out = {'success': 'Goal Completed!'}

    user_mission.goals_completed = goals_completed

    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify(out)


@app.route('/v1/report/like<report_id>', methods=['POST'])
@add_user_to_g
def like_report(report_id):
    """Endpoint to like and un-like reports."""

    if not g.user:
        return Unauthorized()

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


@app.route('/v1/business', methods=['POST'])
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
        error_logging(e)
        return jsonify({'error': 'Error!'})

    return jsonify({'success': 'Added!'})


@app.route('/v1/feedback', methods=['POST'])
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
        error_logging(e)
        return jsonify({'error': 'Error sending message', 'color': 'warning'})

    return jsonify({'success': 'Feedback Received!', 'color': 'green'})


@app.route('/v1/check-google-token', methods=['POST'])
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
        error_logging(e)
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
            error_logging(e)
            return jsonify({'error': f'Error creating new user: {e}'})

    session['user_id'] = user.id
    flash(f"Welcome {user.username}!", "success")
    return jsonify({'success': 'User logged in.'})


#  $$    $$   $$$$$$$$  x$Y       $$$$$$$   $$$$$$$$  $$$$$$$$
#  $$    $$   $$        x$Y       $$   $$0  $$        $$l   U$h
#  $$$$$$$$   $$$$$$$   x$Y       $$   $$   $$$$$$$   $$$$$$$$
#  $$    $$   $$        x$Y       $$$$$$    $$        $$$$$$
#  $$    $$   $$        x$Y       $$        $$        $$l  $$$
#  $$    $$   $$$$$$$$  x$$$$$$+  $$        $$$$$$$$  $$l   $$$
############################
""" Helper Functions"""


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


def get_coords_from_IP_address(request):
    """Call API and geolocate IP address."""

    # get IP address
    ip_address_raw = request.environ.get(
        'HTTP_X_FORWARDED_FOR', request.remote_addr)
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
    if DEBUG:
        logging.error(repr(e))
    else:
        capture_exception(e)


def message_logging(message):
    """Log message when dev environment, sentry capture when production."""
    if DEBUG:
        logging.warning(message)
    else:
        capture_message(message)


def render_template(*args, **kwargs):
    """Wrap render_template and add debug flag to allow JS Sentry
       initalizating only when debug is False (Production Environment).

       Add view args string for next functionality.
    """

    request_args = request.args.to_dict()

    # Encode a request_full_path variable for next_url functionality.
    # next_url must not contain &'s or all data will not be passed from the
    # request parameters query string.
    request_args['request_full_path'] = request.full_path.replace('&', ';')

    # Convert cancel_url back to string with &'s inline for href cancel btn.
    request_args['cancel_url'] = request_args.get(
        'cancel_url', '/').replace(';', '&')

    global DEBUG
    return r_t(
        *args, debug=bool(DEBUG),
        cfdn=CLOUDFRONT_DOMAIN_NAME, **kwargs, **request_args)


def next_page_logic(request):
    """Next page redirect with proper URL from next data."""
    return redirect(next_page_url(request))


def next_page_url(request):
    """Next page URL logic."""
    request_args = request.args.to_dict()

    if request_args.get('next_url'):
        # Return decoded next_url string.
        return request_args['next_url'].replace(';', '&')

    next_page = request_args.get('next_')
    if next_page:
        del request_args['next_']
    else:
        next_page = 'index'

    return url_for(next_page, **request_args)


def check_for_existing_report(mission_id, business_id):
    """Check for an existing report with matching mission_id
       or business_id."""

    existing_report = None

    if mission_id:
        existing_report = Report.query.filter_by(
            user_id=g.user.id, mission_id=mission_id).first()
    else:
        existing_report = Report.query.filter_by(
            user_id=g.user.id, business_id=business_id).first()

    return existing_report


def add_new_business(business_id, data):
    """Add new business logic for add report."""

    model = Business.create(
        id=business_id, name=data['name'], city=data['city'],
        state=data['state'], country=data['country'],
        longitude=float(data['lng'] or 0),
        latitude=float(data['lat'] or 0))
    try:
        db.session.commit()
    except Exception as e:
        error_logging(e)
        return False

    return model


def check_file_upload_logic(form, relevant_data):
    """File upload logic for storing files on S3."""

    f, path = None, ''
    if form.photo_file.data:
        f = form.photo_file.data

        size_mb = f.seek(0, os.SEEK_END) / 1024 / 1024

        if size_mb > 4:
            relevant_data['photo_file'] = None
            f = None
            flash("Image upload aborted file too large!", "danger")
        else:
            unique_prefix = uuid4().hex
            filename = secure_filename(f.filename)
            path = f'static/uploads/reports/{unique_prefix}_{filename}'
            relevant_data['photo_file'] = \
                f'{CLOUDFRONT_DOMAIN_NAME}/{path}'
            f.seek(0)

    return form, relevant_data, f, path


def check_file_upload_logic_w_clear(form):
    """File upload logic for storing files on S3
       with clear image functionality."""

    f, path, old_file = None, '', ''

    # In case user hit clear file button clear any
    # old data and note any old file for deletion.
    if form.cleared_file.data == 'true':
        old_file = form.photo_file.object_data
        form.photo_file.data = None
        form.photo_file.object_data = None

    # Else if photo file is a file object and not string URL set
    # form.photo_file.data to be an appropriate S3 url string.
    # Save file object as f.
    elif form.photo_file.data and not isinstance(
        form.photo_file.data, str
    ):
        f = form.photo_file.data
        # Get size in MB
        size_mb = f.seek(0, os.SEEK_END) / 1024 / 1024
        # Limit size to 4MB
        if size_mb > 4:
            form.photo_file.data = None
            f = None
            flash("Image upload aborted file too large!", "danger")
        else:
            unique_prefix = uuid4().hex
            filename = secure_filename(f.filename)
            path = f'static/uploads/reports/{unique_prefix}_{filename}'
            form.photo_file.data = f'{CLOUDFRONT_DOMAIN_NAME}/{path}'
            f.seek(0)

            # If photo file was previously uploaded
            # note as old file to delete after db.session.commit.
            if form.photo_file.object_data:
                old_file = form.photo_file.object_data

    return form, f, path, old_file


def s3_delete(url):
    """Delete resource at URL location."""

    s3_path = url.replace(f'{CLOUDFRONT_DOMAIN_NAME}/', '')
    resp = S3_RESOURCE.Object(S3_BUCKET_NAME, s3_path).delete()
    return resp


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
