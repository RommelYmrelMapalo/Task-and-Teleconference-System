from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user
import os
from dotenv import load_dotenv

db = SQLAlchemy()
DB_NAME = "database.db"


def create_app():
    app = Flask(__name__)

    # Load .env locally only (Vercel already injects env vars)
    if os.getenv("VERCEL") != "1":
        load_dotenv()

    # Secret key (fallback for local dev)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    # Prefer Postgres on Vercel, fallback to SQLite locally
    database_url = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")

    if database_url:
        # Your Neon/Vercel URLs already include sslmode=require, so do NOT append again
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_NAME}"

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = "website/static/uploads"

    db.init_app(app)

    from .views import views
    from .auth import auth
    app.register_blueprint(views, url_prefix="/")
    app.register_blueprint(auth, url_prefix="/")

    from .models import User

    # Only auto-create for local SQLite (NOT for Postgres/Vercel)
    if not database_url:
        create_database(app)

    login_manager = LoginManager()
    login_manager.login_view = "auth.login"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(id):
        return User.query.get(int(id))

    @app.context_processor
    def inject_globals():
        unread_count = 0
        if current_user.is_authenticated:
            # lazy import avoids circular import
            from .models import Notification
            unread_count = Notification.query.filter_by(
                user_id=current_user.id,
                is_read=False
            ).count()
        return dict(user=current_user, unread_count=unread_count)

    return app


def create_database(app):
    # Only intended for local SQLite
    from os import path
    if not path.exists("website/" + DB_NAME):
        with app.app_context():
            db.create_all()
        print("Created Database!")
