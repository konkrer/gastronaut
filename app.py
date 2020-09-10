"""Restaurant discovery, food exploration web app."""

import logging
import os
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk import init as sentry_init
from flask import Flask, request, redirect
from models import connect_db
from static.py_modules.helper_functions import HelperFunctions as H
# Blueprints
from api.api import api_b_p
from user_views.user_views import user_views_b_p
from main_views.main_views import main_views_b_p
from reports_crea_edit.reports_crea_edit import reports_crea_edit_b_p


app = Flask(__name__)
app.register_blueprint(main_views_b_p)
app.register_blueprint(api_b_p, url_prefix='/v1')
app.register_blueprint(user_views_b_p, url_prefix='/user')
app.register_blueprint(reports_crea_edit_b_p, url_prefix='/report')

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'postgresql:///gastronaut')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


# Dev / Production setup differentiation:
#
# if development server enable debugging and load local keys.
if not os.environ.get('SECRET_KEY'):
    from flask_debugtoolbar import DebugToolbarExtension
    from development_local.local_settings import SECRET_KEY
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
    DEBUG = False


connect_db(app)


#
# 404, 401
#


@app.errorhandler(404)
def page_not_found(e):
    return H.render_template("404.html"), 404


@app.errorhandler(401)
def unauthorized(e):
    return H.render_template("401.html"), 401


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
