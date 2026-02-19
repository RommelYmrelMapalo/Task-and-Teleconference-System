from functools import wraps
from flask import abort
from flask_login import current_user

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            # Let LoginManager handle redirect to login
            return abort(401)
        if getattr(current_user, "role", "user") != "admin":
            return abort(403)
        return f(*args, **kwargs)
    return decorated
