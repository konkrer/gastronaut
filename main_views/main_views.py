"""Main Gastronaut views."""

from flask import request, flash, Blueprint, redirect, url_for, g
from werkzeug.exceptions import Unauthorized
from models import User, Mission, Business, Report
from static.py_modules.decorators import add_user_to_g, login_required
from static.py_modules.yelp_helper import first_letters, get_yelp_categories
from static.py_modules.helper_functions import HelperFunctions as H

render_template = H.render_template

main_views_b_p = Blueprint('main_views', __name__, template_folder='templates')


#
#    $$$   x$$$     $$~     $$$  $$U   $$
#    $$$!  $$$$     $$$     $$$  $$$   $$
#    $$$$  $ $$    $$ $$    $$$  $$$$  $$
#    $L!$ $$ $$    $$ $$    $$$  $$ $$ $$
#    $L $$$$ $$   $$$$$$$   $$$  $$  $$$$
#    $L $$$  $$  $$~   a$$  $$$  $$   $$$
#    $L  $$  $$  $$     $$  $$$  $$    $$


@main_views_b_p.route("/")
@add_user_to_g
def index():
    """Home view."""

    search_term = request.args.get('q')

    lat, lng = H.get_coords_from_IP_address(request)

    return render_template(
        'main_views/index.html',
        YELP_CATEGORIES=get_yelp_categories(),
        first_letters=first_letters,
        lat=lat,
        lng=lng,
        search_term=search_term
    )


@main_views_b_p.route('/navbar-search')
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
                url_for(
                    'user_views.user_detail', username=search_user.username))

        flash(f'Gastronaut {search_term} not found', 'warning')

        return H.next_page_logic(request)

    return redirect(url_for('.index', q=search_term))


@main_views_b_p.route("/mission-control")
@add_user_to_g
@login_required
def mission_control():
    """Missions control view."""

    missions = g.user.missions

    missions.sort(key=lambda x: x.name.lower())

    return render_template(
        'main_views/mission_control.html', missions=missions)


@main_views_b_p.route('/missions')
@add_user_to_g
def missions():
    """Missions view."""

    query_params = request.args.to_dict()

    if not query_params:
        missions = Mission.get_by_recent()
    else:
        missions = Mission.search(query_params)

    return render_template('main_views/missions.html', missions=missions,
                           form_data=query_params)


@main_views_b_p.route('/missions/<mission_id>')
@add_user_to_g
def mission_detail(mission_id):
    """Mission detail view."""

    mission = Mission.query.get_or_404(mission_id)

    if not mission.date_shared:
        return Unauthorized()

    user = mission.author

    return render_template('main_views/mission.html', missions=[mission],
                           user=user)


@main_views_b_p.route('/reports')
@add_user_to_g
def mission_reports():
    """Mission reports view."""

    query_params = request.args.to_dict()

    if not query_params:
        reports = Report.get_by_recent()
    else:
        reports = Report.search(query_params)

    return render_template('main_views/reports.html', reports=reports,
                           form_data=query_params)


@main_views_b_p.route('/reports/business/<business_id>')
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

    return render_template('main_views/reports.html', reports=reports,
                           form_data=query_params)
