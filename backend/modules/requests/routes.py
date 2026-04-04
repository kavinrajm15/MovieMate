from flask import Blueprint, jsonify, request, session, current_app
from core.database import get_db
from core.security import check_perm
from services.upload_service import allowed_file
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import sqlite3

requests_bp = Blueprint('requests', __name__)

@requests_bp.route("/admin/theatre_movie_requests", methods=["GET", "POST"])
def theatre_movie_requests():
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    if request.method == "POST":
        title, duration, genres, certificate, file = request.form["title"].strip(), request.form["duration"], request.form["genres"], request.form["certificate"], request.files.get("image")
        image_path, now = "", datetime.now().strftime("%Y-%m-%d %I:%M %p")
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
            image_path = f"posters/{filename}"
        conn.execute("INSERT INTO movie_requests (theatre_id, title, image, duration, genres, certificate, status, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', '', ?)", (session.get("theatre_id"), title, image_path, duration, genres, certificate, now))
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Request submitted"})
    requests_list = conn.execute("SELECT * FROM movie_requests WHERE theatre_id = ? ORDER BY request_id DESC", (session.get("theatre_id"),)).fetchall()
    conn.close()
    return jsonify({"status": "success", "requests": [dict(r) for r in requests_list]})

@requests_bp.route("/admin/theatre_movie_requests/edit/<int:request_id>", methods=["POST"])
def edit_theatre_movie_request(request_id):
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401
    title, duration, genres, certificate, file = request.form["title"].strip(), request.form["duration"], request.form["genres"], request.form["certificate"], request.files.get("image")
    conn, now = get_db(), datetime.now().strftime("%Y-%m-%d %I:%M %p")
    req = conn.execute("SELECT theatre_id, image FROM movie_requests WHERE request_id=?", (request_id,)).fetchone()
    if not req or req["theatre_id"] != session.get("theatre_id"):
        conn.close()
        return jsonify({"error": "Unauthorized"}), 403
    image_path = req["image"]
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
        image_path = f"posters/{filename}"
    conn.execute("UPDATE movie_requests SET title=?, image=?, duration=?, genres=?, certificate=?, status='pending', feedback='', created_at=?, reviewed_by=NULL, reviewed_role=NULL, reviewed_at=NULL WHERE request_id=?", (title, image_path, duration, genres, certificate, now, request_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Request updated"})

@requests_bp.route("/admin/movie_requests")
def admin_movie_requests():
    if not check_perm("movie_requests", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    requests_list = conn.execute("SELECT r.*, t.name as theatre_name, t.city FROM movie_requests r JOIN theatres t ON r.theatre_id = t.theatre_id ORDER BY r.request_id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "requests": [dict(r) for r in requests_list]})

@requests_bp.route("/admin/movie_requests/action/<int:request_id>", methods=["POST"])
def action_movie_request(request_id):
    if not check_perm("movie_requests", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    action, feedback = request.form.get("action"), request.form.get("feedback", "").strip()
    conn, now = get_db(), datetime.now().strftime("%Y-%m-%d %I:%M %p")
    r_name, r_role = session.get("admin_name"), session.get("role")
    if action == "approve":
        req = conn.execute("SELECT * FROM movie_requests WHERE request_id=?", (request_id,)).fetchone()
        if req:
            conn.execute("INSERT OR IGNORE INTO movies (title, image, duration, genres, certificate) VALUES (?, ?, ?, ?, ?)", (req["title"], req["image"], req["duration"], req["genres"], req["certificate"]))
            conn.execute("UPDATE movie_requests SET status='accepted', feedback='', reviewed_by=?, reviewed_role=?, reviewed_at=? WHERE request_id=?", (r_name, r_role, now, request_id))
    elif action == "decline":
        conn.execute("UPDATE movie_requests SET status='declined', feedback=?, reviewed_by=?, reviewed_role=?, reviewed_at=? WHERE request_id=?", (feedback, r_name, r_role, now, request_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Action completed"})

@requests_bp.route("/admin/profile_requests")
def admin_profile_requests():
    if not check_perm("profile_requests", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    requests_list = conn.execute("SELECT pr.*, a.name as current_admin_name, a.phone as current_phone, t.name as current_theatre_name, t.city as current_city FROM profile_requests pr JOIN admins a ON pr.admin_id = a.admin_id JOIN theatres t ON pr.theatre_id = t.theatre_id ORDER BY pr.req_id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "requests": [dict(r) for r in requests_list]})


@requests_bp.route("/admin/profile_requests/action/<int:req_id>", methods=["POST"])
def action_profile_request(req_id):
    if not check_perm("profile_requests", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    action = request.form.get("action")
    conn, now = get_db(), datetime.now().strftime("%Y-%m-%d %I:%M %p")
    r_name, r_role = session.get("admin_name"), session.get("role")
    if action == "approve":
        req = conn.execute("SELECT * FROM profile_requests WHERE req_id=?", (req_id,)).fetchone()
        if req:
            if req["request_type"] == "profile details":
                try:
                    conn.execute("UPDATE admins SET name=?, phone=? WHERE admin_id=?", (req["new_name"], req["new_phone"], req["admin_id"]))
                    conn.execute("UPDATE theatres SET name=?, city=? WHERE theatre_id=?", (req["new_theatre_name"], req["new_city"], req["theatre_id"]))
                except sqlite3.IntegrityError: pass
            elif req["request_type"] == "password":
                conn.execute("UPDATE admins SET password=? WHERE admin_id=?", (req["new_password"], req["admin_id"]))
            conn.execute("UPDATE profile_requests SET status='approved', reviewed_by=?, reviewed_role=?, reviewed_at=? WHERE req_id=?", (r_name, r_role, now, req_id))
    elif action == "decline":
        conn.execute("UPDATE profile_requests SET status='declined', reviewed_by=?, reviewed_role=?, reviewed_at=? WHERE req_id=?", (r_name, r_role, now, req_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": f"Request {action}d."})