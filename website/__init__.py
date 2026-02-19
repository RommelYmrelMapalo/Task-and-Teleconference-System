from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from os import path
from flask_login import LoginManager
import os
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
DB_NAME = "database.db"

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['UPLOAD_FOLDER'] = 'website/static/uploads'

    db.init_app(app)

    from .views import views
    from .auth import auth
    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(auth, url_prefix='/')

    from .models import User  # ✅ safe AFTER db.init_app()

    create_database(app)

    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(id):
        return User.query.get(int(id))

    # ✅ inject user + unread_count globally (NO circular import)
    from flask_login import current_user

    @app.context_processor
    def inject_globals():
        unread_count = 0
        if current_user.is_authenticated:
            from .models import Notification  # ✅ lazy import here avoids circular import
            unread_count = Notification.query.filter_by(
                user_id=current_user.id,
                is_read=False
            ).count()
        return dict(user=current_user, unread_count=unread_count)

    return app


def create_database(app):
    if not path.exists('website/' + DB_NAME):
        with app.app_context():
            db.create_all()
        print('Created Database!')
