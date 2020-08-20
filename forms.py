from flask_wtf import FlaskForm
from wtforms import (
    StringField, TextAreaField, PasswordField, HiddenField)
from wtforms.fields.html5 import URLField, EmailField
from flask_wtf.file import FileField
from wtforms.validators import (
    InputRequired, Length, Email,
    Optional, URL, ValidationError)
from models import User
from flask import g


class UserBaseForm(FlaskForm):
    email = EmailField("Email", validators=[
                       InputRequired(message="Email cannot be blank."),
                       Length(min=6, max=320),
                       Email(check_deliverability=True,
                             message="Invalid Email address")])

    username = StringField("Username", validators=[
        InputRequired(message="Username cannot be blank."),
        Length(min=2, max=30)])


class AddUserForm(UserBaseForm):

    password = PasswordField("Password", validators=[
        InputRequired(message="Password cannot be blank."),
        Length(min=6, max=60)])

    def validate_username(form, field):
        """Make sure username not in use."""
        if User.query.filter_by(username=form.username.data).first():
            form.username.errors.append("Username already taken!")
            raise ValidationError

    def validate_email(form, field):
        """Make sure email not in use."""
        if User.query.filter_by(email=form.email.data).first():
            form.email.errors.append(
                "Email already associated with account!")
            raise ValidationError


class EditUserForm(UserBaseForm):
    """Edit User Form."""

    avatar_url = URLField("Avatar Image URL", validators=[
        Length(min=6, max=255), Optional()],
        description="Online image address")

    banner_url = URLField("Banner Image URL", validators=[
        Length(min=6, max=255), Optional()],
        description="Online image address")

    byline = StringField("User Byline", validators=[
        Length(min=2, max=200), Optional()],
        description="A short snippet shown under your username")

    bio = TextAreaField("User Bio", validators=[
        Length(min=2, max=500), Optional()],
        description="500 character max")

    city = StringField("City", validators=[Length(min=2, max=50), Optional()])

    state = StringField("State", validators=[
                        Length(min=2, max=50), Optional()])

    country = StringField("Country", validators=[
        Length(min=2, max=50), Optional()])

    def validate_email(form, field):
        """Make sure email is not in use
           unless it's the currnt user's email.
        """

        user = User.query.filter_by(email=form.email.data).first()

        if user and not user == g.user:
            form.username.errors.append(
                "Email already associated with account!")

    def validate_username(form, field):
        """Make sure username is not in use
           unless it's the currnt user's username.
        """

        user = User.query.filter_by(username=form.username.data).first()

        if user and not user == g.user:
            form.username.errors.append("Username already taken!")


class LoginForm(FlaskForm):
    email = EmailField("Email", validators=[
        InputRequired(message="Email cannot be blank."),
        Length(min=6, max=60),
        Email(check_deliverability=True,
              message="Invalid Email address")])

    password = PasswordField("Password", validators=[
        InputRequired(
            message="Password cannot be blank."),
        Length(min=6, max=60)])


class ReportBaseForm(FlaskForm):
    """Form for adding new report."""

    text = TextAreaField("Report", validators=[
        InputRequired(message="Report cannot be blank."),
        Length(min=2)])

    photo_url = URLField(
        "Photo URL", validators=[URL(), Optional()],
        description="""
            Either enter a photo URL or
            choose an image file to include an image.""")

    photo_file = FileField(
        "Upload Photo", validators=[Optional()],
        description="""
            Either enter a photo URL or
            choose an image file to include an image. 4MB max.""")

    def validate(self):
        if not super().validate():
            return False
        if self.photo_url.data and self.photo_file.data:
            msg = 'Please specify Photo URL or upload a photo, not both'
            self.photo_url.errors.append(msg)
            self.photo_file.errors.append(msg)
            return False
        return True


class AddReportForm(ReportBaseForm):
    """Form for adding new report."""

    pass


class EditReportForm(ReportBaseForm):
    """Form for editing a report."""

    cleared_file = HiddenField('cleared_file')
