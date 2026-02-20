from . import db
from flask_login import UserMixin
from sqlalchemy.sql import func

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.String(10000))
    date = db.Column(db.DateTime(timezone=True), default=func.now)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.String(2000), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=func.now)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True)
    password = db.Column(db.String(150))
    firstname = db.Column(db.String(150))
    is_admin = db.Column(db.Boolean, default=False)

    role = db.Column(db.String(20), default="user")

    notes = db.relationship('Note')
    notifications = db.relationship('Notification', lazy=True, cascade="all, delete-orphan")

    # ✅ Automatically capitalize before saving
    def __init__(self, **kwargs):
        if "firstname" in kwargs and kwargs["firstname"]:
            kwargs["firstname"] = kwargs["firstname"].strip().capitalize()
        super().__init__(**kwargs)

    
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'))
    assigned_user = db.relationship('User', foreign_keys=[assigned_to])

    status = db.Column(db.String(50), default="assigned")
    # in_progress | completed
    priority = db.Column(db.String(20), default="normal")

    deadline = db.Column(db.DateTime)
    file_path = db.Column(db.String(300))

    last_edited_by = db.Column(db.Integer, nullable=True)
    last_edited_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

