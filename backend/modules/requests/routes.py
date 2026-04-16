from flask import Blueprint, jsonify, request, session, current_app
from core.database import get_db, get_next_id
from core.security import check_perm
from services.upload_service import allowed_file
from werkzeug.utils import secure_filename
from datetime import datetime
import os

requests_bp = Blueprint('requests', __name__)

@requests_bp.route("/admin/theatre_movie_requests", methods=["GET", "POST"])
def theatre_movie_requests():
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401
    db = get_db()
    if request.method == "POST":
        title, duration, genres, certificate, file = request.form["title"].strip(), request.form["duration"], request.form["genres"], request.form["certificate"], request.files.get("image")
        image_path, now = "", datetime.now().strftime("%Y-%m-%d %I:%M %p")
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
            image_path = f"posters/{filename}"
        new_id = get_next_id(db, "movie_requests")
        db.movie_requests.insert_one({
            "_id": new_id, "request_id": new_id, "theatre_id": session.get("theatre_id"),
            "title": title, "image": image_path, "duration": duration, "genres": genres,
            "certificate": certificate, "status": "pending", "feedback": "",
            "created_at": now, "admin_viewed": 0
        })
        return jsonify({"status": "success", "message": "Request submitted"})
    requests_list = list(db.movie_requests.find({"theatre_id": session.get("theatre_id")}).sort("request_id", -1))
    return jsonify({"status": "success", "requests": requests_list})

@requests_bp.route("/admin/theatre_movie_requests/edit/<int:request_id>", methods=["POST"])
def edit_theatre_movie_request(request_id):
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401
    title, duration, genres, certificate, file = request.form["title"].strip(), request.form["duration"], request.form["genres"], request.form["certificate"], request.files.get("image")
    db, now = get_db(), datetime.now().strftime("%Y-%m-%d %I:%M %p")
    req = db.movie_requests.find_one({"_id": request_id})
    if not req or req.get("theatre_id") != session.get("theatre_id"):
        return jsonify({"error": "Unauthorized"}), 403
    image_path = req.get("image", "")
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
        image_path = f"posters/{filename}"
    db.movie_requests.update_one({"_id": request_id}, {"$set": {
        "title": title, "image": image_path, "duration": duration, "genres": genres,
        "certificate": certificate, "status": "pending", "feedback": "",
        "created_at": now, "reviewed_by": None, "reviewed_role": None, "reviewed_at": None, "admin_viewed": 0
    }})
    return jsonify({"status": "success", "message": "Request updated"})

@requests_bp.route("/admin/movie_requests")
def admin_movie_requests():
    if not check_perm("movie_requests", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    requests_list = list(db.movie_requests.find().sort("request_id", -1))
    for r in requests_list:
        t = db.theatres.find_one({"_id": r.get("theatre_id")})
        r["theatre_name"] = t.get("name") if t else ""
        r["city"] = t.get("city") if t else ""
    return jsonify({"status": "success", "requests": requests_list})

@requests_bp.route("/admin/movie_requests/action/<int:request_id>", methods=["POST"])
def action_movie_request(request_id):
    if not check_perm("movie_requests", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    action, feedback = request.form.get("action"), request.form.get("feedback", "").strip()
    db, now = get_db(), datetime.now().strftime("%Y-%m-%d %I:%M %p")
    r_name, r_role = session.get("admin_name"), session.get("role")
    
    if action == "approve":
        req = db.movie_requests.find_one({"_id": request_id})
        if req:
            if not db.movies.find_one({"title": req.get("title")}):
                new_m_id = get_next_id(db, "movies")
                db.movies.insert_one({
                    "_id": new_m_id, "movie_id": new_m_id, "title": req.get("title"),
                    "image": req.get("image"), "duration": req.get("duration"),
                    "genres": req.get("genres"), "certificate": req.get("certificate")
                })
            db.movie_requests.update_one({"_id": request_id}, {"$set": {
                "status": "accepted", "feedback": "", "reviewed_by": r_name,
                "reviewed_role": r_role, "reviewed_at": now, "admin_viewed": 0
            }})
    elif action == "decline":
        db.movie_requests.update_one({"_id": request_id}, {"$set": {
            "status": "declined", "feedback": feedback, "reviewed_by": r_name,
            "reviewed_role": r_role, "reviewed_at": now, "admin_viewed": 0
        }})
    return jsonify({"status": "success", "message": "Action completed"})

@requests_bp.route("/admin/profile_requests")
def admin_profile_requests():
    if not check_perm("profile_requests", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    requests_list = list(db.profile_requests.find().sort("req_id", -1))
    for pr in requests_list:
        a = db.admins.find_one({"_id": pr.get("admin_id")})
        t = db.theatres.find_one({"_id": pr.get("theatre_id")})
        pr["current_admin_name"] = a.get("name") if a else ""
        pr["current_phone"] = a.get("phone") if a else ""
        pr["current_theatre_name"] = t.get("name") if t else ""
        pr["current_city"] = t.get("city") if t else ""
    return jsonify({"status": "success", "requests": requests_list})

@requests_bp.route("/admin/profile_requests/action/<int:req_id>", methods=["POST"])
def action_profile_request(req_id):
    if not check_perm("profile_requests", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    action = request.form.get("action")
    db, now = get_db(), datetime.now().strftime("%Y-%m-%d %I:%M %p")
    r_name, r_role = session.get("admin_name"), session.get("role")
    
    if action == "approve":
        req = db.profile_requests.find_one({"_id": req_id})
        if req:
            if req.get("request_type") == "profile details":
                if not db.admins.find_one({"phone": req.get("new_phone"), "_id": {"$ne": req.get("admin_id")}}):
                    db.admins.update_one({"_id": req.get("admin_id")}, {"$set": {"name": req.get("new_name"), "phone": req.get("new_phone")}})
                db.theatres.update_one({"_id": req.get("theatre_id")}, {"$set": {"name": req.get("new_theatre_name"), "city": req.get("new_city")}})
            elif req.get("request_type") == "password":
                db.admins.update_one({"_id": req.get("admin_id")}, {"$set": {"password": req.get("new_password")}})
            
            db.profile_requests.update_one({"_id": req_id}, {"$set": {
                "status": "approved", "reviewed_by": r_name, "reviewed_role": r_role, 
                "reviewed_at": now, "admin_viewed": 0
            }})
    elif action == "decline":
        db.profile_requests.update_one({"_id": req_id}, {"$set": {
            "status": "declined", "reviewed_by": r_name, "reviewed_role": r_role, 
            "reviewed_at": now, "admin_viewed": 0
        }})
    return jsonify({"status": "success", "message": f"Request {action}d."})