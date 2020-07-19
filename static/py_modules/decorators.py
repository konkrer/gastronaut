from flask import g, session, redirect, url_for, request
from functools import wraps
from models import User


def add_user_to_g(func):
    """If we're logged in, add curr user to Flask global
       as g.user else set g.user to None.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        """Wrap view functions."""
        if 'user_id' in session:
            g.user = User.query.get(session['user_id'])
        else:
            g.user = None

        return func(*args, **kwargs)
    return wrapper


def login_required(func):
    """If user is not logged in redirect to signup page
       else return output of the called view function.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        """Wrap view functions."""
        if not g.user:
            next_page = request.endpoint

            return redirect(url_for('signup', next=next_page))

        return func(*args, **kwargs)
    return wrapper
