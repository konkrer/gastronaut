from flask_wtf import FlaskForm
from wtforms import (
    StringField, SelectField, TextAreaField,
    PasswordField, HiddenField)
from wtforms.fields.html5 import (
    DecimalField, IntegerField, URLField, EmailField)
from flask_wtf.file import FileField
from wtforms.validators import (
    InputRequired, Length, Email,
    Optional, URL, NumberRange, ValidationError)
from models import User
from flask import g


class AddUserForm(FlaskForm):
    email = EmailField("Email", validators=[
                       InputRequired(message="Email cannot be blank."),
                       Length(min=6, max=60),
                       Email(check_deliverability=True,
                             message="Invalid Email address")])

    username = StringField("Username", validators=[
        InputRequired(message="Username cannot be blank."),
        Length(min=2, max=30)])

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


class EditUserForm(FlaskForm):
    """Edit User Form."""

    username = StringField("Username", validators=[
        InputRequired(message="Username cannot be blank."),
        Length(min=2, max=30)])

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

    def validate_username(form, field):
        """Make sure username is not in use
           unless it's the currnt user's username.
        """

        user = User.query.filter_by(username=form.username.data).first()

        if user and not user == g.user:
            form.username.errors.append("Username already taken!")
            raise ValidationError


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


class AddProductForm(FlaskForm):
    """Form for adding new product"""

    name = StringField("Name", validators=[
        InputRequired(message="Name cannot be blank."),
        Length(min=2, max=50)])

    category_code = SelectField("Category", validators=[
        InputRequired(), Length(min=1, max=4)])

    price = DecimalField("Price", validators=[
        InputRequired(message="Price is required.")])

    email = EmailField("Email", validators=[Email(), Optional()])

    photo_url = URLField("Photo URL", validators=[URL(), Optional()])

    photo_file = FileField("Upload Photo", validators=[
        # FileRequired(),
        Optional(),
        # regexp(r'^[^/\\]\w+\.\w{3,5}$')
    ])

    age = IntegerField("Age", validators=[
        NumberRange(min=0, max=30), Optional()])
    #    message="Age must be in between 0 and 30.")

    notes = TextAreaField("Notes")

    # def validate_photo_file(form, field):
    #     """Allow URL or file info for photo not both"""
    #     if form.photo_url.data and form.photo_file.data:
    #         form.photo_url.errors.append(
    #             "Enter either photo URL or file to upload, not both.")
    #         form.photo_file.errors.append(
    #             "Enter either photo URL or file to upload, not both.")
    #         raise ValidationError()

    def validate(self):
        if not super().validate():
            return False
        if self.photo_url.data and self.photo_file.data:
            msg = 'Please specify Photo URL or upload a photo, not both'
            self.photo_url.errors.append(msg)
            self.photo_file.errors.append(msg)
            return False
        return True
