from flask import Blueprint, render_template, abort, jsonify, request, redirect, url_for, flash, send_from_directory, Response, current_app, session
from flask_login import login_required, current_user
from functools import wraps
from flask import abort
from .models import Notification, Task, User
from . import db
from datetime import datetime, date, timedelta
import calendar
import os
import mimetypes
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from werkzeug.utils import secure_filename
from werkzeug.security import check_password_hash, generate_password_hash


views = Blueprint('views', __name__)


def _legacy_upload_dir():
    return os.path.join(current_app.root_path, "static", "uploads")


def _upload_dir(create=True):
    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    if not upload_dir:
        upload_dir = _legacy_upload_dir()
    if create:
        os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def _task_file_directory(filename):
    primary_dir = _upload_dir(create=False)
    if primary_dir and os.path.exists(os.path.join(primary_dir, filename)):
        return primary_dir

    legacy_dir = _legacy_upload_dir()
    if legacy_dir != primary_dir and os.path.exists(os.path.join(legacy_dir, filename)):
        return legacy_dir

    return None

def _guess_inline_mime(filename):
    ext = os.path.splitext(filename)[1].lower()
    explicit_mimes = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".json": "application/json",
    }
    if ext in explicit_mimes:
        return explicit_mimes[ext]

    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"

def _save_uploaded_file(uploaded_file):
    filename = secure_filename(uploaded_file.filename)
    save_dir = _upload_dir()
    saved_path = os.path.join(save_dir, filename)

    if os.path.exists(saved_path):
        base, ext = os.path.splitext(filename)
        filename = f"{base}_{int(datetime.now().timestamp())}{ext}"
        saved_path = os.path.join(save_dir, filename)

    uploaded_file.save(saved_path)
    return filename


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
    user_tasks = tasks = Task.query.all()

    now = datetime.now()
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
            "is_delayed": bool(t.status != "completed" and t.deadline < now),
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

@views.route('/user_profile', methods=['GET', 'POST'])
@login_required
def user_profile():
    if request.method == 'POST':
        _handle_password_change()
    return redirect(url_for('views.profile'))


def _handle_password_change():
    current_password = (request.form.get('current_password') or '').strip()
    new_password = (request.form.get('new_password') or '').strip()
    confirm_password = (request.form.get('confirm_password') or '').strip()

    if not current_password or not new_password or not confirm_password:
        flash('All password fields are required.', 'error')
    elif not check_password_hash(current_user.password, current_password):
        flash('Current password is incorrect.', 'error')
    elif new_password != confirm_password:
        flash('New password and confirmation do not match.', 'error')
    elif len(new_password) < 7:
        flash('New password must be at least 7 characters long.', 'error')
    else:
        current_user.password = generate_password_hash(new_password, method='pbkdf2:sha256')
        db.session.commit()
        flash('Password changed successfully.', 'success')

@views.route('/admin_profile', methods=['GET', 'POST'])
@login_required
def admin_profile():
    if not current_user.is_admin:
        abort(403)

    if request.method == 'POST':
        _handle_password_change()

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
        task.file_path = _save_uploaded_file(file)

    db.session.commit()

    target = request.referrer or url_for("views.task_dashboard")
    split_target = urlsplit(target)
    query_params = dict(parse_qsl(split_target.query, keep_blank_values=True))
    query_params["updated"] = "1"
    redirect_target = urlunsplit((
        split_target.scheme,
        split_target.netloc,
        split_target.path,
        urlencode(query_params),
        split_target.fragment,
    ))

    return redirect(redirect_target)

@views.route("/task/<int:task_id>/file/view", methods=["GET"])
@login_required
def task_file_view(task_id):
    task = Task.query.get_or_404(task_id)
    if not task.file_path:
        abort(404)

    file_dir = _task_file_directory(task.file_path)
    if not file_dir:
        abort(404)
    file_path = os.path.join(file_dir, task.file_path)
    mime_type = _guess_inline_mime(task.file_path)

    with open(file_path, "rb") as file_handle:
        file_data = file_handle.read()

    response = Response(file_data, mimetype=mime_type)
    response.headers["Content-Disposition"] = f'inline; filename="{task.file_path}"'
    return response

@views.route("/task/<int:task_id>/file/download", methods=["GET"])
@login_required
def task_file_download(task_id):
    task = Task.query.get_or_404(task_id)
    if not task.file_path:
        abort(404)

    file_dir = _task_file_directory(task.file_path)
    if not file_dir:
        abort(404)

    return send_from_directory(
        file_dir,
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

    requested_status = (request.form.get("target_status") or "").strip().lower()
    fallback_status = (request.form.get("fallback_status") or "").strip().lower()
    allowed_status = {"assigned", "in_progress", "for_revision", "completed"}

    if requested_status in allowed_status:
        new_status = requested_status
    elif task.status != "completed":
        new_status = "completed"
    elif fallback_status in allowed_status and fallback_status != "completed":
        new_status = fallback_status
    else:
        new_status = "in_progress"

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

        if file and file.filename:
            task.file_path = _save_uploaded_file(file)

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
        saved_filename = _save_uploaded_file(uploaded)
    
    new_task = Task(
        title=title,
        description=description if description else None,
        assigned_to=current_user.id,
        status=status,
        priority=priority,          # ✅ save priority too (your model has this)
        deadline=deadline_dt
    )

    if saved_filename:
        new_task.file_path = saved_filename

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
        tasks = Task.query.all()

    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    return render_template(
        "task_dashboard.html",
        user=current_user,
        tasks=tasks,
        unread_count=unread_count,
        now_dt=datetime.now(),
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

@views.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        _handle_password_change()
    return render_template("user_profile.html", user=current_user)

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

def build_admin_calendar(tasks=None, meetings=None):
    tasks = tasks or []
    meetings = meetings or []

    today = date.today()
    month_matrix = calendar.Calendar(firstweekday=0).monthdatescalendar(today.year, today.month)

    event_by_day = {}
    for item in tasks:
        day = item.get("deadline_date")
        if isinstance(day, date):
            event_by_day.setdefault(day, {"tasks": [], "meetings": []})["tasks"].append(item)

    for item in meetings:
        day = item.get("meeting_date")
        if isinstance(day, date):
            event_by_day.setdefault(day, {"tasks": [], "meetings": []})["meetings"].append(item)

    weeks = []
    for week in month_matrix:
        week_cells = []
        for day in week:
            day_events = event_by_day.get(day, {"tasks": [], "meetings": []})
            week_cells.append({
                "date": day,
                "day_number": day.day,
                "is_current_month": day.month == today.month,
                "is_today": day == today,
                "tasks": day_events["tasks"],
                "meetings": day_events["meetings"],
            })
        weeks.append(week_cells)

    return {
        "month_label": today.strftime("%B %Y"),
        "week_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "weeks": weeks,
    }


@views.route('/admin')
@login_required
@admin_only
def admin_dashboard():
    tasks = Task.query.order_by(Task.deadline.asc()).all()
    notifications = Notification.query.order_by(Notification.created_at.desc()).all()
    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    tasks_data = []
    for task in tasks:
        if not task.deadline:
            continue
        tasks_data.append({
            "id": task.id,
            "title": task.title,
            "status": (task.status or "").strip().lower(),
            "deadline": task.deadline,
        })

    meetings_data = []
    for notif in notifications:
        title = (notif.title or "").strip()
        message = (notif.message or "").strip()
        label = f"{title} {message}".lower()
        if "meeting" not in label:
            continue

        meetings_data.append({
            "id": notif.id,
            "title": title or "Meeting",
            "description": message,
            "deadline": notif.created_at,
        })

    total_tasks = len(tasks_data)
    completed_tasks = sum(1 for task in tasks_data if task["status"] == "completed")
    pending_tasks = total_tasks - completed_tasks
    total_meetings = len(meetings_data)

    today = date.today()
    selected_month = request.args.get("month", type=int) or today.month
    selected_year = request.args.get("year", type=int) or today.year

    if selected_month < 1 or selected_month > 12:
        selected_month = today.month

    if selected_year < 1970 or selected_year > 2100:
        selected_year = today.year

    month_calendar = calendar.Calendar(firstweekday=6).monthdatescalendar(selected_year, selected_month)

    first_of_month = date(selected_year, selected_month, 1)

    if selected_month == 1:
        prev_month, prev_year = 12, selected_year - 1
    else:
        prev_month, prev_year = selected_month - 1, selected_year

    if selected_month == 12:
        next_month, next_year = 1, selected_year + 1
    else:
        next_month, next_year = selected_month + 1, selected_year

    events_by_day = {}
    now = datetime.now()

    for task in tasks_data:
        event_day = task["deadline"].date()
        task_status = task["status"]
        is_overdue = task["deadline"] < now

        if task_status in {"in_progress", "for_revision"} and is_overdue:
            event_kind = "delay"
        elif task_status == "completed":
            event_kind = "completed"
        elif task_status in {"in_progress", "for_revision"}:
            event_kind = "pending"
        else:
            event_kind = "task"

        events_by_day.setdefault(event_day, []).append({
            "type": "task",
            "kind": event_kind,
            "title": task["title"],
            "time": task["deadline"].strftime("%I:%M %p"),
        })

    for meeting in meetings_data:
        if not meeting["deadline"]:
            continue

        if hasattr(meeting["deadline"], "date"):
            event_day = meeting["deadline"].date()
            event_time = meeting["deadline"].strftime("%I:%M %p")
        else:
            event_day = meeting["deadline"]
            event_time = ""

        events_by_day.setdefault(event_day, []).append({
            "type": "meeting",
            "kind": "meeting",
            "title": meeting["title"],
            "time": event_time,
        })

    delayed_tasks = sorted(
        [
            task for task in tasks_data
            if task["status"] in {"in_progress", "for_revision"} and task["deadline"] < now
        ],
        key=lambda item: item["deadline"]
    )
    pending_task_list = sorted(
        [
            task for task in tasks_data
            if task["status"] in {"in_progress", "for_revision"} and task["deadline"] >= now
        ],
        key=lambda item: item["deadline"]
    )
    completed_task_list = sorted(
        [task for task in tasks_data if task["status"] == "completed"],
        key=lambda item: item["deadline"],
        reverse=True
    )
    upcoming_meetings = sorted(meetings_data, key=lambda item: item["deadline"] or datetime.min)

    return render_template(
        "admin_dashboard.html",
        user=current_user,
        unread_count=unread_count,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        total_meetings=total_meetings,
        month_name=first_of_month.strftime("%B %Y"),
        month_calendar=month_calendar,
        today=today,
        events_by_day=events_by_day,
        delayed_tasks=delayed_tasks,
        pending_task_list=pending_task_list,
        completed_task_list=completed_task_list,
        upcoming_meetings=upcoming_meetings,
        prev_month=prev_month,
        prev_year=prev_year,
        next_month=next_month,
        next_year=next_year,
        selected_month=selected_month,
        selected_year=selected_year,
    )

@views.route('/admin/manage-meetings')
@login_required
@admin_only
def manage_meetings():
    return render_template("manage_meetings.html")


@views.route('/admin/manage-tasks')
@login_required
@admin_only
def manage_tasks():
    users = User.query.filter_by(is_admin=False).order_by(User.firstname.asc()).all()
    tasks = Task.query.order_by(Task.created_at.desc()).all()
    selected_filter = (request.args.get("filter") or "all").strip().lower()
    allowed_filters = {"all", "delayed", "pending", "completed"}
    if selected_filter not in allowed_filters:
        selected_filter = "all"

    return render_template(
        "manage_tasks.html",
        user=current_user,
        users=users,
        tasks=tasks,
        selected_filter=selected_filter,
    )


@views.route('/admin/manage-tasks/create', methods=['POST'])
@login_required
@admin_only
def manage_tasks_create():
    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()
    due_date_raw = (request.form.get("due_date") or "").strip()
    due_time_raw = (request.form.get("due_time") or "").strip()
    priority = (request.form.get("priority") or "normal").strip().lower()
    status = (request.form.get("status") or "assigned").strip().lower()
    assigned_user_ids = request.form.getlist("assigned_users")

    if not title:
        flash("Title is required.", "error")
        return redirect(url_for("views.manage_tasks"))

    if not due_date_raw:
        flash("Due date is required.", "error")
        return redirect(url_for("views.manage_tasks"))

    try:
        due_date = datetime.strptime(due_date_raw, "%Y-%m-%d").date()
    except Exception:
        flash("Invalid due date.", "error")
        return redirect(url_for("views.manage_tasks"))

    if due_time_raw:
        try:
            due_time = datetime.strptime(due_time_raw, "%H:%M").time()
        except Exception:
            try:
                due_time = datetime.strptime(due_time_raw, "%I:%M %p").time()
            except Exception:
                flash("Invalid due time.", "error")
                return redirect(url_for("views.manage_tasks"))
    else:
        due_time = datetime.strptime("09:00", "%H:%M").time()

    deadline_dt = datetime.combine(due_date, due_time)

    selected_ids = []
    for raw_id in assigned_user_ids:
        try:
            selected_ids.append(int(raw_id))
        except (TypeError, ValueError):
            continue

    assigned_users = []
    if selected_ids:
        assigned_users = User.query.filter(User.id.in_(selected_ids), User.is_admin.is_(False)).all()

    uploaded = request.files.get("file")
    saved_filename = None
    if uploaded and uploaded.filename:
        saved_filename = _save_uploaded_file(uploaded)

    task = Task(
        title=title,
        description=description if description else None,
        assigned_to=assigned_users[0].id if assigned_users else None,
        status=status,
        priority=priority,
        deadline=deadline_dt,
        file_path=saved_filename
    )
    db.session.add(task)

    for assigned_user in assigned_users:
        db.session.add(Notification(
            title="New Task Assigned",
            message=f"You have been assigned to task: {title}",
            user_id=assigned_user.id
        ))

    db.session.commit()

    if assigned_users:
        flash(f"Task created and {len(assigned_users)} assigned user(s) notified.", "success")
    else:
        flash("Task created. No assigned users were selected.", "success")
    return redirect(url_for("views.manage_tasks"))



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
