import os
from pathlib import Path
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user
from sqlalchemy import inspect, text
from sqlalchemy.pool import NullPool
from flask_migrate import Migrate

db = SQLAlchemy()


def _ensure_task_schema_columns():
    """Backfill schema drift in environments where migrations were not applied."""
    inspector = inspect(db.engine)

    if not inspector.has_table("task"):
        return

    task_columns = {column["name"] for column in inspector.get_columns("task")}
    statements = []

    if "priority" not in task_columns:
        statements.append(
            "ALTER TABLE task ADD COLUMN priority VARCHAR(20) DEFAULT 'normal'"
        )

    if "last_edited_by" not in task_columns:
        statements.append("ALTER TABLE task ADD COLUMN last_edited_by INTEGER")

    if "last_edited_at" not in task_columns:
        statements.append(
            "ALTER TABLE task ADD COLUMN last_edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        )

    if "created_at" not in task_columns:
        statements.append(
            "ALTER TABLE task ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        )

    for statement in statements:
        db.session.execute(text(statement))

    if statements:
        db.session.commit()

def create_app():
    app = Flask(__name__)

    # dotenv only needed locally; optional
    if os.getenv("VERCEL") != "1":
        try:
            from dotenv import load_dotenv
            load_dotenv()
        except ModuleNotFoundError:
            pass

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

    # Prefer Postgres on Vercel
    database_url = None
    if os.getenv("VERCEL") == "1":
        database_url = (
            os.getenv("POSTGRES_URL_NON_POOLING")
            or os.getenv("DATABASE_URL_UNPOOLED")
            or os.getenv("POSTGRES_URL")
            or os.getenv("DATABASE_URL")
        )

    if database_url:
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "poolclass": NullPool,
            "pool_pre_ping": True,
        }
    else:
        base_dir = Path(__file__).resolve().parent
        sqlite_path = base_dir / "database.db"
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{sqlite_path.as_posix()}"

    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = "website/static/uploads"

    # Init DB
    db.init_app(app)

    # Init Migrations (this enables: flask db ...)
    Migrate(app, db)

    with app.app_context():
        _ensure_task_schema_columns()



    # Blueprints
    from .views import views
    from .auth import auth
    app.register_blueprint(views, url_prefix="/")
    app.register_blueprint(auth, url_prefix="/")

    # IMPORTANT: import models so Flask-Migrate can detect them
    from .models import User, Task, Notification, Note  # add/remove based on your models.py

    # Login manager
    login_manager = LoginManager()
    login_manager.login_view = "auth.login"
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Global template vars (sidebar badge, current user)
    @app.context_processor
    def inject_globals():
        unread_count = 0
        if current_user.is_authenticated:
            unread_count = Notification.query.filter_by(
                user_id=current_user.id,
                is_read=False
            ).count()
        return dict(user=current_user, unread_count=unread_count)

    return app