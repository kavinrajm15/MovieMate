from flask import Blueprint, jsonify, request, redirect, url_for, session, current_app
from core.database import get_db
from services.upload_service import allowed_file
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import sqlite3

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/admin/signup", methods=["GET", "POST"])
def admin_signup():
    if request.method == "POST":
        name = request.form["name"]
        phone = request.form["phone"]
        password = request.form["password"]
        theatre_name = request.form["theatre_name"].strip()
        city = request.form["city"].lower().strip()
        
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT theatre_id FROM theatres WHERE name=? AND city=?", (theatre_name, city))
        theatre = cur.fetchone()
        t_id = theatre["theatre_id"] if theatre else cur.execute("INSERT INTO theatres (name, city) VALUES (?, ?)", (theatre_name, city)).lastrowid
            
        try:
            now = datetime.now().strftime("%Y-%m-%d %I:%M %p")
            cur.execute("INSERT INTO admins (name, phone, password, theatre_id, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)", (name, phone, password, t_id, now))
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({"status": "error", "message": "Phone number already registered."}), 400
        conn.close()
        return jsonify({"status": "success", "message": "Signup successful!"}), 201
        
    return jsonify({"status": "success"})

@auth_bp.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form["username"] 
        password = request.form["password"]
        conn = get_db()
        
        staff = conn.execute("SELECT * FROM staff WHERE username=? AND password=?", (username, password)).fetchone()
        if staff:
            session.update({"admin": True, "role": staff["role"], "admin_name": staff["name"], "staff_id": staff["staff_id"], "profile_pic": staff["profile_pic"]})
            conn.close()
            return jsonify({"status": "success", "role": staff["role"], "user": {"name": staff["name"], "role": staff["role"], "staff_id": staff["staff_id"], "profile_pic": staff["profile_pic"], "theatre_id": None}}), 200
            
        admin = conn.execute("SELECT * FROM admins WHERE phone=? AND password=?", (username, password)).fetchone()
        conn.close()
        
        if admin:
            if admin["status"] == "pending":
                return jsonify({"status": "error", "message": "Your account is currently pending approval by the administrators."}), 403
            
            session.update({"admin": True, "role": "theatre_admin", "theatre_id": admin["theatre_id"], "admin_name": admin["name"], "admin_id": admin["admin_id"], "profile_pic": admin["profile_pic"]})
            return jsonify({"status": "success", "role": "theatre_admin", "theatre_id": admin["theatre_id"], "user": {"name": admin["name"], "role": "theatre_admin", "admin_id": admin["admin_id"], "theatre_id": admin["theatre_id"], "profile_pic": admin["profile_pic"]}}), 200
            
        return jsonify({"status": "error", "message": "Incorrect username or password. Please try again."}), 401
            
    if session.get("admin"): return jsonify({"isLoggedIn": True, "user": {"name": session.get("admin_name"), "role": session.get("role"), "staff_id": session.get("staff_id"), "theatre_id": session.get("theatre_id"), "profile_pic": session.get("profile_pic")}}), 200
    return jsonify({"isLoggedIn": False}), 401

@auth_bp.route("/admin/logout")
def admin_logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out"}), 200

@auth_bp.route("/admin/profile", methods=["GET", "POST"])
def admin_profile():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    role, error, success = session.get("role"), None, None
    now = datetime.now().strftime("%Y-%m-%d %I:%M %p")
    
    if request.method == "POST":
        action, current_password = request.form.get("action"), request.form.get("current_password")
        is_valid = False
        
        if role != "theatre_admin":
            user = conn.execute("SELECT password FROM staff WHERE staff_id=?", (session.get("staff_id"),)).fetchone() if session.get("staff_id") else conn.execute("SELECT password FROM staff WHERE role=?", (role,)).fetchone()
            if user and user["password"] == current_password: is_valid = True
        else: 
            user = conn.execute("SELECT password FROM admins WHERE admin_id=?", (session.get("admin_id"),)).fetchone() if session.get("admin_id") else conn.execute("SELECT password FROM admins WHERE theatre_id=?", (session.get("theatre_id"),)).fetchone()
            if user and user["password"] == current_password: is_valid = True
                
        if not is_valid:
            error = "Incorrect current password. Changes were not saved."
            return jsonify({"status": "error", "message": error}), 400
        else:
            if action == "update_profile":
                new_name = request.form.get("name").strip()
                file = request.files.get("profile_pic")
                pic_path = None
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(f"user_{datetime.now().strftime('%H%M%S')}_{file.filename}")
                    file.save(os.path.join(current_app.config["PROFILE_PIC_FOLDER"], filename))
                    pic_path, session["profile_pic"] = f"profile_pics/{filename}", f"profile_pics/{filename}"

                if role != "theatre_admin":
                    new_username, staff_id = request.form.get("username").strip(), session.get("staff_id")
                    try:
                        if staff_id:
                            conn.execute("UPDATE staff SET name=?, username=?, profile_pic=? WHERE staff_id=?" if pic_path else "UPDATE staff SET name=?, username=? WHERE staff_id=?", (new_name, new_username, pic_path, staff_id) if pic_path else (new_name, new_username, staff_id))
                        else:
                            conn.execute("UPDATE staff SET name=?, username=?, profile_pic=? WHERE role=?" if pic_path else "UPDATE staff SET name=?, username=? WHERE role=?", (new_name, new_username, pic_path, role) if pic_path else (new_name, new_username, role))
                        session["admin_name"], success = new_name, "Profile details updated successfully!"
                    except sqlite3.IntegrityError:
                        error = "That username is already taken. Please choose another one."
                        return jsonify({"status": "error", "message": error}), 400
                else:
                    new_phone, new_theatre_name, new_city = request.form.get("phone").strip(), request.form.get("theatre_name").strip(), request.form.get("city").strip().lower()
                    if pic_path: conn.execute("UPDATE admins SET profile_pic=? WHERE admin_id=?", (pic_path, session.get("admin_id")))
                    conn.execute("INSERT INTO profile_requests (admin_id, theatre_id, request_type, new_name, new_phone, new_theatre_name, new_city, requested_at) VALUES (?, ?, 'profile details', ?, ?, ?, ?, ?)", (session.get("admin_id"), session.get("theatre_id"), new_name, new_phone, new_theatre_name, new_city, now))
                    success = "Picture updated (if uploaded). Text details sent to Staff for approval!"
            
            elif action == "change_password":
                new_password = request.form.get("new_password")
                if role != "theatre_admin":
                    conn.execute("UPDATE staff SET password=? WHERE staff_id=?", (new_password, session.get("staff_id"))) if session.get("staff_id") else conn.execute("UPDATE staff SET password=? WHERE role=?", (new_password, role))
                    success = "Password changed successfully!"
                else:
                    conn.execute("INSERT INTO profile_requests (admin_id, theatre_id, request_type, new_password, requested_at) VALUES (?, ?, 'password', ?, ?)", (session.get("admin_id"), session.get("theatre_id"), new_password, now))
                    success = "Password change request sent to Staff for approval!"
        conn.commit()
        return jsonify({"status": "success", "message": success if success else error})

    raw_data = None
    if role != "theatre_admin":
        raw_data = conn.execute("SELECT name, username, profile_pic FROM staff WHERE staff_id=?", (session.get("staff_id"),)).fetchone() if session.get("staff_id") else conn.execute("SELECT name, username, profile_pic FROM staff WHERE role=?", (role,)).fetchone()
    else:
        raw_data = conn.execute("SELECT a.name, a.phone, a.profile_pic, t.name as theatre_name, t.city FROM admins a JOIN theatres t ON a.theatre_id = t.theatre_id WHERE a.admin_id=?", (session.get("admin_id"),)).fetchone() if session.get("admin_id") else conn.execute("SELECT a.name, a.phone, a.profile_pic, t.name as theatre_name, t.city FROM admins a JOIN theatres t ON a.theatre_id = t.theatre_id WHERE a.theatre_id=?", (session.get("theatre_id"),)).fetchone()
            
    user_data = dict(raw_data) if raw_data else {}
    recent_request = None
    if role == 'theatre_admin':
        req_row = conn.execute("SELECT * FROM profile_requests WHERE admin_id=? ORDER BY req_id DESC LIMIT 1", (session.get("admin_id"),)).fetchone()
        recent_request = dict(req_row) if req_row else None
    
    conn.close()
    return jsonify({"status": "success", "user_data": user_data, "recent_request": recent_request, "error": error, "success": success})