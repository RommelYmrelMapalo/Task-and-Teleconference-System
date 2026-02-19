from flask import Blueprint, render_template, request, flash, redirect, url_for
from .models import User
from . import db
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, login_required, logout_user, current_user


auth = Blueprint('auth', __name__)


# =========================
# USER LOGIN
# =========================
@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()

        if user:
            # Block admin from logging in via user login
            if getattr(user, "is_admin", False):
                flash("Admin accounts must login using Admin Login.", category="error")
                return render_template("login.html", user=current_user)

            if check_password_hash(user.password, password):
                login_user(user, remember=True)
                flash('Logged in Successfully', category='success')
                return redirect(url_for('views.user_dashboard'))
            else:
                flash('Incorrect Password, try again.', category='error')
        else:
            flash('Email does not exist.', category='error')

    return render_template("login.html", user=current_user)


# =========================
# LOGOUT
# =========================
@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))


# =========================
# USER SIGNUP
# =========================
@auth.route('/signup', methods=['GET', 'POST'])
def sign_up():
    if request.method == 'POST':
        email = request.form.get('email')
        firstname = request.form.get('firstname')
        password1 = request.form.get('password1')
        password2 = request.form.get('password2')

        if firstname:
            firstname = firstname.strip().capitalize()

        user = User.query.filter_by(email=email).first()

        if user:
            flash('Email already exists.', category='error')
        elif len(email) < 4:
            flash('Email must be greater than 4 characters.', category='error')
        elif not firstname or len(firstname) < 2:
            flash('First Name must be greater than 1 character.', category='error')
        elif password1 != password2:
            flash('Passwords do not match.', category='error')
        elif len(password1) < 7:
            flash('Password must be at least 7 characters.', category='error')
        else:
            new_user = User(
                email=email,
                firstname=firstname,
                password=generate_password_hash(password1, method='pbkdf2:sha256'),
                is_admin=False  # default user
            )

            db.session.add(new_user)
            db.session.commit()

            login_user(new_user, remember=True)
            flash('Account Created Successfully!', category='success')

            return redirect(url_for('auth.login'))

    return render_template("sign_up.html", user=current_user)


# =========================
# ADMIN LOGIN
# =========================
@auth.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        user = User.query.filter_by(email=email).first()

        if user and getattr(user, "is_admin", False):
            if check_password_hash(user.password, password):
                login_user(user, remember=True)
                flash('Admin login successful.', category='success')
                return redirect(url_for('views.admin_dashboard'))
            else:
                flash('Incorrect password.', category='error')
        else:
            flash('Admin account not found.', category='error')

    return render_template("admin_login.html", user=current_user)
