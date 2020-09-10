"""Helper functions for Gastronaut app."""


import requests
import logging
import os
import boto3
from uuid import uuid4
from sentry_sdk import (capture_message, capture_exception)
from flask import (request, flash, redirect, url_for, g,
                   render_template as r_t)
from werkzeug.utils import secure_filename
from models import (db, Business, Report)


#  $$    $$   $$$$$$$$  x$Y       $$$$$$$   $$$$$$$$  $$$$$$$$
#  $$    $$   $$        x$Y       $$   $$0  $$        $$l   U$h
#  $$$$$$$$   $$$$$$$   x$Y       $$   $$   $$$$$$$   $$$$$$$$
#  $$    $$   $$        x$Y       $$$$$$    $$        $$$$$$
#  $$    $$   $$        x$Y       $$        $$        $$l  $$$
#  $$    $$   $$$$$$$$  x$$$$$$+  $$        $$$$$$$$  $$l   $$$
############################
""" Helper Functions"""


class HelperFunctions:
    """Class to hold helper methods for Gastronaut app.
    """

    S3_RESOURCE = boto3.resource('s3')

    # Dev / Production setup differentiation:
    #
    # if development import from local settings.
    if not os.environ.get('SECRET_KEY'):
        from development_local.local_settings import (
            S3_BUCKET_NAME, CLOUDFRONT_DOMAIN_NAME
        )
        DEBUG = True
    #
    # if production server import from environment variables.
    else:
        S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
        CLOUDFRONT_DOMAIN_NAME = os.environ.get('CLOUDFRONT_DOMAIN_NAME')
        DEBUG = False

    def __init__(self):
        pass

    @classmethod
    def get_coords_from_IP_address(self, request):
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
            self.error_logging(e)
            return '', ''

        lat = data.get('latitude', '')
        lng = data.get('longitude', '')

        # if API limit message.
        if data.get('message'):
            self.message_logging(data['message'])

        return lat, lng

    @classmethod
    def error_logging(self, e):
        """Log error when dev environment, sentry capture when production."""
        if self.DEBUG:
            logging.error(repr(e))
        else:
            capture_exception(e)

    @classmethod
    def message_logging(self, message):
        """Log message when dev environment, sentry capture when production."""
        if self.DEBUG:
            logging.warning(message)
        else:
            capture_message(message)

    @classmethod
    def render_template(self, *args, **kwargs):
        """Wrap render_template and add debug flag to allow JS Sentry
        initalizating only when debug is False (Production Environment).

        Add view args string for next functionality.
        """

        request_args = request.args.to_dict()

        # Encode a request_full_path variable for next_url functionality.
        # next_url must not contain &'s or all data will not be passed from the
        # request parameters query string.
        request_args['request_full_path'] = request.full_path.replace('&', ';')

        # Convert cancel_url back to string with &'s inline for href cancel btn
        request_args['cancel_url'] = request_args.get(
            'cancel_url', '/').replace(';', '&')

        return r_t(
            *args, debug=bool(self.DEBUG),
            cfdn=self.CLOUDFRONT_DOMAIN_NAME, **kwargs, **request_args)

    @classmethod
    def next_page_logic(self, request):
        """Next page redirect with proper URL from next data."""
        return redirect(self.next_page_url(request))

    @classmethod
    def next_page_url(self, request):
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

    @classmethod
    def check_for_existing_report(self, mission_id, business_id):
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

    @classmethod
    def add_new_business(self, business_id, data):
        """Add new business logic for add report."""

        model = Business.create(
            id=business_id, name=data['name'], city=data['city'],
            state=data['state'], country=data['country'],
            longitude=float(data['lng'] or 0),
            latitude=float(data['lat'] or 0))
        try:
            db.session.commit()
        except Exception as e:
            self.error_logging(e)
            return False

        return model

    @classmethod
    def check_file_upload_logic(self, form, relevant_data):
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
                    f'{self.CLOUDFRONT_DOMAIN_NAME}/{path}'
                f.seek(0)

        return form, relevant_data, f, path

    @classmethod
    def check_file_upload_logic_w_clear(self, form):
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
                form.photo_file.data = f'{self.CLOUDFRONT_DOMAIN_NAME}/{path}'
                f.seek(0)

                # If photo file was previously uploaded
                # note as old file to delete after db.session.commit.
                if form.photo_file.object_data:
                    old_file = form.photo_file.object_data

        return form, f, path, old_file

    @classmethod
    def s3_delete(self, url):
        """Delete resource at URL location."""

        s3_path = url.replace(f'{self.CLOUDFRONT_DOMAIN_NAME}/', '')
        resp = self.S3_RESOURCE.Object(self.S3_BUCKET_NAME, s3_path).delete()
        return resp
