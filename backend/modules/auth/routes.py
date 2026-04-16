from flask import Blueprint, jsonify, request, redirect, url_for, session, current_app
from core.database import get_db, get_next_id
from services.upload_service import allowed_file
from werkzeug.utils import secure_filename
from datetime import datetime
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/admin/signup", methods=["GET", "POST"])
def admin_signup():
    if request.method == "POST":
        name = request.form["name"]
        phone = request.form["phone"]
        password = request.form["password"]
        theatre_name = request.form["theatre_name"].strip()
        city = request.form["city"].lower().strip()
        
        db = get_db()
        theatre = db.theatres.find_one({"name": theatre_name, "city": city})
        
        if theatre:
            t_id = theatre["_id"]
        else:
            t_id = get_next_id(db, "theatres")
            db.theatres.insert_one({"_id": t_id, "theatre_id": t_id, "name": theatre_name, "city": city})
            
        if db.admins.find_one({"phone": phone}):
            return jsonify({"status": "error", "message": "Phone number already registered."}), 400
            
        now = datetime.now().strftime("%Y-%m-%d %I:%M %p")
        a_id = get_next_id(db, "admins")
        db.admins.insert_one({
            "_id": a_id, "admin_id": a_id, "name": name, "phone": phone, 
            "password": password, "theatre_id": t_id, "status": "pending", 
            "created_at": now
        })
        return jsonify({"status": "success", "message": "Signup successful!"}), 201
        
    return jsonify({"status": "success"})

@auth_bp.route("/admin", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form["username"] 
        password = request.form["password"]
        db = get_db()
        
        staff = db.staff.find_one({"username": username, "password": password})
        if staff:
            session.update({"admin": True, "role": staff["role"], "admin_name": staff["name"], "staff_id": staff["_id"], "profile_pic": staff.get("profile_pic")})
            return jsonify({"status": "success", "role": staff["role"], "user": {"name": staff["name"], "role": staff["role"], "staff_id": staff["_id"], "profile_pic": staff.get("profile_pic"), "theatre_id": None}}), 200
            
        admin = db.admins.find_one({"phone": username, "password": password})
        
        if admin:
            if admin["status"] == "pending":
                return jsonify({"status": "error", "message": "Your account is currently pending approval by the administrators."}), 403
            
            session.update({"admin": True, "role": "theatre_admin", "theatre_id": admin["theatre_id"], "admin_name": admin["name"], "admin_id": admin["_id"], "profile_pic": admin.get("profile_pic")})
            return jsonify({"status": "success", "role": "theatre_admin", "theatre_id": admin["theatre_id"], "user": {"name": admin["name"], "role": "theatre_admin", "admin_id": admin["_id"], "theatre_id": admin["theatre_id"], "profile_pic": admin.get("profile_pic")}}), 200
            
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
    db = get_db()
    role, error, success = session.get("role"), None, None
    now = datetime.now().strftime("%Y-%m-%d %I:%M %p")
    
    if request.method == "POST":
        action, current_password = request.form.get("action"), request.form.get("current_password")
        is_valid = False
        
        if role != "theatre_admin":
            user = db.staff.find_one({"_id": session.get("staff_id")}) if session.get("staff_id") else db.staff.find_one({"role": role})
            if user and user.get("password") == current_password: is_valid = True
        else: 
            user = db.admins.find_one({"_id": session.get("admin_id")}) if session.get("admin_id") else db.admins.find_one({"theatre_id": session.get("theatre_id")})
            if user and user.get("password") == current_password: is_valid = True
                
        if not is_valid:
            error = "Incorrect current password. Changes were not saved."
            return jsonify({"status": "error", "message": error}), 400
        else:
            if action == "update_profile":
                new_name = (request.form.get("name") or "").strip()
                file = request.files.get("profile_pic")
                pic_path = None
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(f"user_{datetime.now().strftime('%H%M%S')}_{file.filename}")
                    file.save(os.path.join(current_app.config["PROFILE_PIC_FOLDER"], filename))
                    pic_path, session["profile_pic"] = f"profile_pics/{filename}", f"profile_pics/{filename}"

                if role != "theatre_admin":
                    new_username, staff_id = (request.form.get("username") or "").strip(), session.get("staff_id")
                    
                    if staff_id:
                        if db.staff.find_one({"username": new_username, "_id": {"$ne": staff_id}}):
                            return jsonify({"status": "error", "message": "That username is already taken. Please choose another one."}), 400
                        update_fields = {"name": new_name, "username": new_username}
                        if pic_path: update_fields["profile_pic"] = pic_path
                        db.staff.update_one({"_id": staff_id}, {"$set": update_fields})
                    else:
                        if db.staff.find_one({"username": new_username}):
                            return jsonify({"status": "error", "message": "That username is already taken. Please choose another one."}), 400
                        update_fields = {"name": new_name, "username": new_username}
                        if pic_path: update_fields["profile_pic"] = pic_path
                        db.staff.update_many({"role": role}, {"$set": update_fields})

                    session["admin_name"], success = new_name, "Profile details updated successfully!"
                else:
                    new_phone, new_theatre_name, new_city = (request.form.get("phone") or "").strip(), (request.form.get("theatre_name") or "").strip(), (request.form.get("city") or "").strip().lower()
                    if pic_path: db.admins.update_one({"_id": session.get("admin_id")}, {"$set": {"profile_pic": pic_path}})
                    
                    req_id = get_next_id(db, "profile_requests")
                    db.profile_requests.insert_one({
                        "_id": req_id, "req_id": req_id, "admin_id": session.get("admin_id"),
                        "theatre_id": session.get("theatre_id"), "request_type": "profile details",
                        "new_name": new_name, "new_phone": new_phone, "new_theatre_name": new_theatre_name,
                        "new_city": new_city, "requested_at": now, "status": "pending", "admin_viewed": 0
                    })
                    success = "Picture updated (if uploaded). Text details sent to Staff for approval!"
            
            elif action == "change_password":
                new_password = request.form.get("new_password")
                if role != "theatre_admin":
                    if session.get("staff_id"):
                        db.staff.update_one({"_id": session.get("staff_id")}, {"$set": {"password": new_password}})
                    else:
                        db.staff.update_many({"role": role}, {"$set": {"password": new_password}})
                    success = "Password changed successfully!"
                else:
                    req_id = get_next_id(db, "profile_requests")
                    db.profile_requests.insert_one({
                        "_id": req_id, "req_id": req_id, "admin_id": session.get("admin_id"),
                        "theatre_id": session.get("theatre_id"), "request_type": "password",
                        "new_password": new_password, "requested_at": now, "status": "pending", "admin_viewed": 0
                    })
                    success = "Password change request sent to Staff for approval!"
        return jsonify({"status": "success", "message": success if success else error})

    user_data = None
    if role != "theatre_admin":
        staff_id = session.get("staff_id")
        user = db.staff.find_one({"_id": staff_id}) if staff_id else db.staff.find_one({"role": role})
        if user: user_data = {"name": user.get("name"), "username": user.get("username"), "profile_pic": user.get("profile_pic")}
    else:
        admin_id = session.get("admin_id")
        user = db.admins.find_one({"_id": admin_id}) if admin_id else db.admins.find_one({"theatre_id": session.get("theatre_id")})
        if user:
            t = db.theatres.find_one({"_id": user.get("theatre_id")})
            user_data = {
                "name": user.get("name"), "phone": user.get("phone"), "profile_pic": user.get("profile_pic"),
                "theatre_name": t.get("name") if t else "", "city": t.get("city") if t else ""
            }
            
    recent_request = None
    if role == 'theatre_admin':
        rec = list(db.profile_requests.find({"admin_id": session.get("admin_id")}).sort("req_id", -1).limit(1))
        recent_request = rec[0] if rec else None
    
    return jsonify({"status": "success", "user_data": user_data or {}, "recent_request": recent_request, "error": error, "success": success})