from flask import Blueprint, render_template, abort, jsonify, request, redirect, url_for, flash, send_from_directory, current_app
from flask_login import login_required, current_user
from functools import wraps
from flask import abort
from .models import Notification, Task
from . import db
from datetime import datetime, date, timedelta
import os
from werkzeug.utils import secure_filename


views = Blueprint('views', __name__)

def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated or not getattr(current_user, "is_admin", False):
            abort(403)
        return func(*args, **kwargs)
    return wrapper

from flask import Blueprint, render_template, redirect, url_for, request
from flask_login import login_required, current_user

views = Blueprint('views', __name__)

@views.route('/')
def index():
    if current_user.is_authenticated:
        if getattr(current_user, "is_admin", False):
            return redirect(url_for('views.admin_dashboard'))
        return redirect(url_for('views.user_dashboard'))
    return redirect(url_for('auth.login'))

@views.route('/dashboard')
@login_required
def user_dashboard():
    notifications = Notification.query.filter_by(user_id=current_user.id)\
        .order_by(Notification.created_at.desc()).limit(30).all()

    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    # get tasks assigned to logged-in user (or adjust if admin)
    user_tasks = Task.query.filter_by(assigned_to=current_user.id).order_by(Task.deadline.asc()).all()

    tasks_data = []
    for t in user_tasks:
        if not t.deadline:
            continue

        tasks_data.append({
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "due_date": t.deadline.date(),                 # IMPORTANT: must be date()
            "due_time": t.deadline.strftime("%I:%M %p"),   # optional, for dashboard.html
        })

    meetings_data = []

    planned_days = build_planned_days(
        tasks=tasks_data,
        meetings=meetings_data,
        days_back=1,
        days_forward=7
    )
    meetings_data = []

    planned_days = build_planned_days(tasks=tasks_data, meetings=meetings_data, days_back=1, days_forward=7)

    return render_template(
        "dashboard.html",
        user=current_user,
        notifications=notifications,
        unread_count=unread_count,
        planned_days=planned_days,
        page="dashboard",
    )

    
def build_planned_days(tasks=None, meetings=None, days_back=1, days_forward=7):
    tasks = tasks or []
    meetings = meetings or []

    # Group by date
    by_day = {}

    def ensure_day(d):
        if d not in by_day:
            by_day[d] = {"tasks": [], "meetings": []}

    for t in tasks:
        d = t.get("due_date")
        if isinstance(d, date):
            ensure_day(d)
            by_day[d]["tasks"].append(t)

    for m in meetings:
        d = m.get("meeting_date")
        if isinstance(d, date):
            ensure_day(d)
            by_day[d]["meetings"].append(m)

    today = date.today()

    planned_days = []
    for offset in range(-days_back, days_forward + 1):
        d = today + timedelta(days=offset)

        if offset == -1:
            label = f"Yesterday, {d.strftime('%B %d')}"
            sub = None
        elif offset == 0:
            label = "Today"
            sub = d.strftime("%B %d")
        elif offset == 1:
            label = f"Tomorrow, {d.strftime('%B %d')}"
            sub = None
        else:
            # e.g. "Monday, February 24"
            label = f"{d.strftime('%A')}, {d.strftime('%B %d')}"
            sub = None

        planned_days.append({
            "date_label": label,
            "date_sub": sub,
            "tasks": by_day.get(d, {}).get("tasks", []),
            "meetings": by_day.get(d, {}).get("meetings", []),
        })

    return planned_days


@views.route('/notifications/read/<int:notif_id>', methods=['POST'])
@login_required
def mark_notification_read(notif_id):
    notif = Notification.query.filter_by(id=notif_id, user_id=current_user.id).first()
    if notif:
        notif.is_read = True
        db.session.commit()
        return jsonify({"ok": True})
    return jsonify({"ok": False}), 404

@views.route('/user_profile')
@login_required
def user_profile():
    return render_template("user_profile.html", user=current_user)

@views.route('/admin_profile')
@login_required
def admin_profile():
    if not current_user.is_admin:
        abort(403)
    return render_template("admin_profile.html", user=current_user)


@views.route('/shared-tasks')
@login_required
def shared_tasks():

    tasks = Task.query.filter_by(status="shared").all()

    return render_template(
        "shared_tasks.html",
        user=current_user,
        tasks=tasks
    )

@views.route("/task/<int:task_id>/update", methods=["POST"])
@login_required
def update_task(task_id):
    task = Task.query.get_or_404(task_id)

    # ✅ Everyone can edit (no restriction)

    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()
    status = (request.form.get("status") or task.status).strip().lower()
    priority = (request.form.get("priority") or getattr(task, "priority", "normal")).strip().lower()

    due_date_raw = request.form.get("due_date")
    due_time_raw = (request.form.get("due_time") or "").strip()

    if not title:
        flash("Title is required.", "error")
        return redirect(request.referrer or url_for("views.task_dashboard"))

    task.title = title
    task.description = description if description else None
    task.status = status

    if hasattr(task, "priority"):
        task.priority = priority

    if due_date_raw:
        try:
            d = datetime.strptime(due_date_raw, "%Y-%m-%d").date()
            if due_time_raw:
                try:
                    t = datetime.strptime(due_time_raw, "%H:%M").time()
                except Exception:
                    t = datetime.strptime(due_time_raw, "%I:%M %p").time()
            else:
                t = datetime.strptime("09:00 AM", "%I:%M %p").time()

            task.deadline = datetime.combine(d, t)
        except Exception:
            flash("Invalid due date/time.", "error")

    file = request.files.get("file")
    if file and file.filename:
        os.makedirs("website/static/uploads", exist_ok=True)
        filename = secure_filename(file.filename)
        file.save(os.path.join("website/static/uploads", filename))
        task.file_path = filename

    db.session.commit()
    flash("Task updated!", "success")
    return redirect(request.referrer or url_for("views.task_dashboard"))

@views.route("/task/<int:task_id>/file/view", methods=["GET"])
@login_required
def task_file_view(task_id):
    task = Task.query.get_or_404(task_id)
    if not task.file_path:
        abort(404)

    upload_dir = os.path.join(current_app.root_path, "static", "uploads")
    return send_from_directory(upload_dir, task.file_path, as_attachment=False)

@views.route("/task/<int:task_id>/file/download", methods=["GET"])
@login_required
def task_file_download(task_id):
    task = Task.query.get_or_404(task_id)
    if not task.file_path:
        abort(404)

    upload_dir = os.path.join(current_app.root_path, "static", "uploads")
    return send_from_directory(
        upload_dir,
        task.file_path,
        as_attachment=True,
        download_name=task.file_path
    )

@views.route("/task/<int:task_id>/json", methods=["GET"])
@login_required
def task_json(task_id):
    task = Task.query.get_or_404(task_id)

    # deadline -> "YYYY-MM-DD HH:MM" (easy for your drawer JS)
    deadline_str = ""
    if task.deadline:
        deadline_str = task.deadline.strftime("%Y-%m-%d %H:%M")

    return jsonify({
        "id": task.id,
        "title": task.title,
        "description": task.description or "",
        "status": task.status or "",
        "priority": getattr(task, "priority", None) or "normal",
        "deadline": deadline_str,
        "file_path": task.file_path or ""
    })
    
@views.route("/task/<int:task_id>/complete", methods=["POST"])
@login_required
def complete_task(task_id):
    task = Task.query.get_or_404(task_id)

    # toggle behavior (optional)
    new_status = "completed" if task.status != "completed" else "in_progress"
    task.status = new_status

    db.session.commit()
    return jsonify({"ok": True, "status": task.status})
    
@views.route('/task/take/<int:task_id>')
@login_required
def take_task(task_id):

    task = Task.query.get(task_id)

    if task and task.status == "shared":
        task.assigned_to = current_user.id
        task.status = "in_progress"
        db.session.commit()

        flash("Task successfully taken over!", "success")

    return redirect(url_for('views.task_dashboard'))

@views.route('/task/finish/<int:task_id>', methods=['POST'])
@login_required
def finish_task(task_id):

    task = Task.query.get(task_id)

    if task and task.assigned_to == current_user.id:

        file = request.files.get("file")

        if file:
            filename = file.filename
            filepath = os.path.join(
                "website/static/uploads",
                filename
            )
            file.save(filepath)

            task.file_path = filename

        task.status = "completed"
        db.session.commit()

        flash("Task completed successfully!", "success")

    return redirect(url_for('views.task_dashboard'))


@views.route('/task/create', methods=['POST'])
@login_required
def create_task():
    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()

    due_date_raw = request.form.get("due_date")
    due_time_raw = (request.form.get("due_time") or "").strip()

    priority = (request.form.get("priority") or "normal").strip().lower()
    status = (request.form.get("status") or "assigned").strip().lower()

    if not title:
        flash("Title is required.", "error")
        return redirect(url_for("views.task_dashboard"))

    try:
        d = datetime.strptime(due_date_raw, "%Y-%m-%d").date()
    except Exception:
        flash("Invalid due date.", "error")
        return redirect(url_for("views.task_dashboard"))

    if due_time_raw:
        try:
            t = datetime.strptime(due_time_raw, "%I:%M %p").time()
        except Exception:
            try:
                t = datetime.strptime(due_time_raw, "%H:%M").time()
            except Exception:
                flash("Invalid time format. Use like 09:50 AM.", "error")
                return redirect(url_for("views.task_dashboard"))
    else:
        t = datetime.strptime("09:00 AM", "%I:%M %p").time()

    deadline_dt = datetime.combine(d, t)

    uploaded = request.files.get("file")
    saved_filename = None

    if uploaded and uploaded.filename:
        os.makedirs(current_app.config["UPLOAD_FOLDER"], exist_ok=True)

        filename = secure_filename(uploaded.filename)
        saved_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)

        # avoid overwriting files with same name
        if os.path.exists(saved_path):
            base, ext = os.path.splitext(filename)
            filename = f"{base}_{int(datetime.now().timestamp())}{ext}"
            saved_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)

        uploaded.save(saved_path)
        saved_filename = filename
    
    new_task = Task(
        title=title,
        description=description if description else None,
        assigned_to=current_user.id,
        status=status,
        priority=priority,          # ✅ save priority too (your model has this)
        deadline=deadline_dt
    )

    # ✅ handle file upload (document attachment)
    file = request.files.get("file")
    if file and file.filename:
        os.makedirs("website/static/uploads", exist_ok=True)
        filename = secure_filename(file.filename)
        filepath = os.path.join("website/static/uploads", filename)
        file.save(filepath)
        new_task.file_path = filename

    db.session.add(new_task)
    db.session.commit()

    flash("Task created!", "success")
    return redirect(url_for("views.task_dashboard"))   # ✅ go back to planner overview

@views.route('/task-dashboard')
@login_required
def task_dashboard():
    if current_user.is_admin:
        tasks = Task.query.order_by(Task.created_at.desc()).all()
    else:
        tasks = Task.query.filter_by(assigned_to=current_user.id)\
            .order_by(Task.created_at.desc()).all()

    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    return render_template(
        "task_dashboard.html",
        user=current_user,
        tasks=tasks,
        unread_count=unread_count
    )


@views.route('/assigned-meetings')
@login_required
def assigned_meetings():
    return render_template("assigned_meetings.html", user=current_user)

@views.route('/time-in')
@login_required
def record_timein():
    return render_template("time_in.html", user=current_user)

@views.route('/time-out')
@login_required
def record_timeout():
    return render_template("time_out.html", user=current_user)

@views.route('/inbox')
@login_required
def inbox():
    notifications = Notification.query.filter_by(user_id=current_user.id)\
        .order_by(Notification.created_at.desc()).all()

    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    return render_template(
        "inbox.html",
        user=current_user,
        notifications=notifications,
        notification_count=unread_count
    )

@views.route('/profile')
@login_required
def profile():
    return render_template("user_profile.html")

def admin_only(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403)
        return func(*args, **kwargs)
    return wrapper

def is_admin_user():
    return current_user.is_authenticated and current_user.is_admin

def admin_required():
    return current_user.is_authenticated and getattr(current_user, "role", "") == "admin"

@views.route('/admin')
@login_required
@admin_only
def admin_dashboard():
    return render_template("admin_dashboard.html")

@views.route('/admin/manage-meetings')
@login_required
@admin_only
def manage_meetings():
    return render_template("manage_meetings.html")

@views.route('/admin/assign-meetings')
@login_required
def assign_meetings():
    return render_template("assign_meetings.html", user=current_user)

@views.route('/admin/monitoring')
@login_required
def monitoring_panel():
    return render_template("monitoring_panel.html", user=current_user)

@views.route('/inbox/admin')
@login_required
def inbox_admin():
    notifications = Notification.query.filter_by(user_id=current_user.id)\
        .order_by(Notification.created_at.desc()).all()

    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    return render_template(
        "admin_inbox.html",
        user=current_user,
        notifications=notifications,
        notification_count=unread_count
    )

@views.route('/admin/manage-users')
@login_required
def manage_users():
    return render_template("manage_users.html", user=current_user)

@views.route('/admin/reports')
@login_required
def reports():
    return render_template("reports.html", user=current_user)
