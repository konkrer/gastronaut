"""Views for creating and editing reports, detail report view."""


import os
import boto3
from flask import request, flash, redirect, url_for, g, Blueprint
from werkzeug.exceptions import Unauthorized, BadRequest
from models import db, Mission, Business, Report
from forms import AddReportForm, EditReportForm
from static.py_modules.decorators import add_user_to_g, login_required
from static.py_modules.helper_functions import HelperFunctions as H

render_template = H.render_template


S3_CLIENT = boto3.client('s3')


# Dev / Production variable setup:
#
# if development server load local keys.
if not os.environ.get('SECRET_KEY'):
    from development_local.local_settings import S3_BUCKET_NAME
#
# if production server load environ variables.
else:
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')

reports_crud_b_p = Blueprint(
    'reports_crud', __name__, template_folder='templates')


#  $$$$$$$$   $$$$$$$   $$$$$$$     $$$$$$'   x$$$$$$$   $$$$$$$$
#  $$    $$   $$        $$    $$   $$    $$:  x$Y   \$$     $$
#  $$   C$$   $$$$$$$   $$    $$  $$      $$  x$Y   $$      $$
#  $$$$$$     $$$$$$$   $$$$$$$   $$      $$  x$$$$$?       $$
#  $$  `$$    $$        $$        z$$    h$$  x$Y  $$j      $$
#  $$   .$$   $$$$$$$$  $$         $$$n+$$$   x$Y   $$?     $$
#  $$    .$$  $$$$$$$$  $$           d$$$     x$Y    $$ '   $$
############################
""" Report CRUD"""


@reports_crud_b_p.route('/<report_id>')
@add_user_to_g
def report_detail(report_id):
    """Report detail view."""

    report = Report.query.get_or_404(report_id)
    user = report.user

    return render_template('reports_crud/report.html', reports=[report],
                           user=user)


@reports_crud_b_p.route("/", methods=['GET', 'POST'])
@add_user_to_g
@login_required
def add_report():
    """Write Report View."""

    error_occured = False
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
            return redirect(url_for('.report_detail', report_id=report.id))

        except Exception as e:
            error_occured = True
            db.session.rollback()
            flash("Error Creating Report!", 'danger')
            H.error_logging(e)

    existing_report = H.check_for_existing_report(mission_id, business_id)
    if existing_report:
        # redirect to edit_report view for this report and relay request args.
        request_ars = request.args.to_dict()
        return redirect(
            url_for(
                '.edit_report', report_id=existing_report.id, **request_ars)
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

    if request.method == 'POST' and not error_occured:
        flash("Please fix all form errors.", "warning")

    return render_template(
        "reports_crud/add_report.html", form=form, model=model,
        kind=kind)


@reports_crud_b_p.route("/<report_id>/edit", methods=['GET', 'POST'])
@add_user_to_g
@login_required
def edit_report(report_id):
    """Report edit view."""

    error_occured = False
    report = Report.query.get_or_404(report_id)
    form = EditReportForm(obj=report)

    # Check if file was cleared and remove from form to pass validation.
    old_file = H.check_for_clear_file(form)

    if form.validate_on_submit():
        # File upload handling logic.
        form, f, path, old_file = H.check_file_upload_logic_w_clear(
            form, old_file)

        form.populate_obj(report)

        try:
            db.session.commit()
            if f:
                S3_CLIENT.upload_fileobj(f, S3_BUCKET_NAME, path)
            if old_file:
                H.s3_delete(old_file)
            flash("Report Edited!", 'success')
            return redirect(url_for('.report_detail', report_id=report.id))

        except Exception as e:
            error_occured = True
            db.session.rollback()
            flash("Error Editing Report!", 'danger')
            H.error_logging(e)

    if report.mission_id:
        model = Mission.query.get_or_404(report.mission_id)
        kind = 'Mission'
    else:
        model = Business.query.get_or_404(report.business_id)
        kind = 'Business'

    if request.method == 'POST' and not error_occured:
        flash("Please fix all form errors.", "warning")

    return render_template(
        "reports_crud/edit_report.html", form=form, model=model,
        kind=kind, report_id=report_id)


@reports_crud_b_p.route('/<report_id>/delete', methods=['POST'])
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

    return redirect(
        url_for('user_views.user_detail', username=g.user.username))
