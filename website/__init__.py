import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user
from dotenv import load_dotenv
from sqlalchemy.pool import NullPool

db = SQLAlchemy()
DB_NAME = "database.db"

def create_app():
    app = Flask(__name__)

    if os.getenv("VERCEL") != "1":
        load_dotenv()

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    # ✅ Prefer UNPOOLED/NON-POOLING on Vercel (serverless-safe)
    database_url = (
        os.getenv("POSTGRES_URL_NON_POOLING")
        or os.getenv("DATABASE_URL_UNPOOLED")
        or os.getenv("POSTGRES_URL")
        or os.getenv("DATABASE_URL")
    )

    if database_url:
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url

        # ✅ Critical for serverless: don't keep/reuse pooled conns
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "poolclass": NullPool,
            "pool_pre_ping": True,
        }
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

    # Only auto-create for local SQLite
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
            from .models import Notification
            unread_count = Notification.query.filter_by(
                user_id=current_user.id,
                is_read=False
            ).count()
        return dict(user=current_user, unread_count=unread_count)

    return app


def create_database(app):
    from os import path
    if not path.exists("website/" + DB_NAME):
        with app.app_context():
            db.create_all()
        print("Created Database!")
