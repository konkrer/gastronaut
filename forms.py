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


class AddUserForm(FlaskForm):
    email = EmailField("Email", validators=[
                       InputRequired(message="Email cannot be blank."),
                       Length(min=6, max=60),
                       Email(check_deliverability=True,
                             message="Invalid Email address")])

    username = StringField("Username", validators=[
        InputRequired(message="Username cannot be blank."),
        Length(max=50)])

    password = PasswordField("Password", validators=[
        InputRequired(message="Password cannot be blank."),
        Length(min=6, max=60)])

    password2 = PasswordField("Password", validators=[
        InputRequired(message="Password 2 cannot be blank."),
        Length(min=6, max=60)])

    avatar_url = URLField("Avatar URL", validators=[
        Length(min=0, max=255)])

    avatar_id = HiddenField(id='avatar_id')

    avavatar_set = SelectField('Auto Avatar Style',
                               choices=[
                                   ('set1', 'Robot'), ('set2', 'Monster'),
                                   ('set3', 'Robot Head'), ('set4', 'Kitty'),
                                   ('set5', 'Human')])

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

    def validate_password2(form, field):
        """Make sure password and password2 match."""
        if not form.password.data == form.password2.data:
            form.password.errors.append("Both passwords must match.")
            form.password2.errors.append("Both passwords must match.")
            raise ValidationError


class EditUserForm(FlaskForm):
    username = StringField("Username", validators=[
        InputRequired(message="Username cannot be blank."),
        Length(min=6, max=50)])

    password = PasswordField("Password", validators=[
        InputRequired(message="Password cannot be blank."),
        Length(min=6, max=60)])


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
