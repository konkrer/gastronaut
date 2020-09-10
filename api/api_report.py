"""API endpoints for reports."""


from flask import Blueprint, jsonify, g
from werkzeug.exceptions import Unauthorized
from models import db, Report
from static.py_modules.decorators import add_user_to_g
from static.py_modules.helper_functions import HelperFunctions as H


api_report_b_p = Blueprint('API_report_blueprint', __name__,)


#        $$      $$$$$$    $$
#       $$$$     $$   $$   $$
#       $$$$     $$   q$m  $$
#      $$  $$    $$$$$$$   $$
#     $$$$$$$-   $$        $$
#     $$    $$   $$        $$
#    $$     i$$  $$        $$
############################
"""API Endpoints."""


@api_report_b_p.route('/like/<report_id>', methods=['POST'])
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
        H.error_logging(e)
        return jsonify({'feedback': 'Error!'})

    return jsonify({'success': success, 'likes': len(report.likes)})
