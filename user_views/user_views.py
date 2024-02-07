"""User view functions for Gastronaut."""

from flask import (
    request, flash, session, Blueprint,
    redirect, url_for, g)
from models import (db, User)
from forms import (
    AddUserForm, LoginForm, EditUserForm)
from static.py_modules.decorators import add_user_to_g, login_required
from static.py_modules.helper_functions import HelperFunctions as H

render_template = H.render_template


user_views_b_p = Blueprint('user_views',
                           __name__, template_folder='templates')


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


@user_views_b_p.route("/signup", methods=['GET', 'POST'])
@add_user_to_g
def signup():
    """Sign up view."""

    if g.user:
        return redirect(url_for('.user_detail', username=g.user.username))

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
            session.permanent = True
            flash(f"Welcome {new_user.username}!", "success")

            return H.next_page_logic(request)

        except Exception as e:
            db.session.rollback()
            flash("Error Creating User", 'danger')
            H.error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    # Create URL for login button that passes all URL data.
    login_url = request.full_path.replace("/signup", "/login")
    return render_template(
        'user_views/signup.html', form=form, login_url=login_url)


@user_views_b_p.route("/login", methods=['GET', 'POST'])
@add_user_to_g
def login():
    """Login view."""

    if g.user:
        return redirect(url_for('.user_detail', username=g.user.username))

    form = LoginForm()

    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data

        user = User.authenticate(email, password)

        if user is None:
            form.email.errors.append("Email not found.")
        elif user == (False, "Google_ID"):
            form.email.errors.append(
                "Given email is associated with a Google Account. "
                'Please sign in using the "Sign in with Google" button.')
        elif user == (False, "Password"):
            form.password.errors.append("Password incorrect.")
        elif user == (False, "Bcrypt"):
            form.password.errors.append("Bcrypt Error.")
        elif isinstance(user, User):
            session['user_id'] = user.id
            session.permanent = True
            flash(f"Welcome {user.username}!", 'success')
            return H.next_page_logic(request)
        else:
            form.email.errors.append("Login Error!")

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    # Create URL for sign in button that passes all URL data.
    signup_url = request.full_path.replace('login', 'signup')
    return render_template('user_views/login.html', form=form,
                           signup_url=signup_url)


@user_views_b_p.route("/edit", methods=['GET', 'POST'])
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
            return redirect(url_for('.user_detail', username=g.user.username))

        except Exception as e:
            db.session.rollback()
            flash("Error Updating User Profile", 'danger')
            H.error_logging(e)

    if request.method == 'POST':
        flash("Please fix all form errors.", "warning")

    return render_template('user_views/edit_user.html', form=form)


@user_views_b_p.route("/profile/<username>")
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
                '.login', next_='user_views.user_detail', username='0'))
    # If user looking at their own profile use g.user.
    elif g.user and username == g.user.username:
        user = g.user
    else:
        user = User.query.filter_by(username=username).first()
        if not user:
            return render_template('404.html')

    shared_missions = [m for m in user.my_missions if m.is_public]

    return render_template("user_views/detail_user.html",
                           user=user, missions=shared_missions,
                           reports=user.reports)


@user_views_b_p.route('/logout', methods=['POST'])
@add_user_to_g
def logout():
    """User logout view."""

    del session['user_id']
    flash(f"{g.user.username} logged out.", 'success')
    return H.next_page_logic(request)


@user_views_b_p.route("/delete", methods=['POST'])
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

    return redirect(url_for('main_views.index'))
