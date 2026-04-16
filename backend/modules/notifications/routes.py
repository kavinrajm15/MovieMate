from flask import Blueprint, jsonify, session
from core.database import get_db
from core.security import check_perm

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route("/admin/notifications/count")
def notification_count():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db()
    role = session.get("role")
    notifications, total = [], 0

    if role == "theatre_admin":
        theatre_id = session.get("theatre_id")
        admin_id   = session.get("admin_id")
        
        movies_cursor = db.movie_requests.find({"theatre_id": theatre_id, "status": {"$ne": "pending"}, "admin_viewed": 0})
        profiles_cursor = db.profile_requests.find({"admin_id": admin_id, "status": {"$ne": "pending"}, "admin_viewed": 0})
        
        for m in movies_cursor:   
            notifications.append({"id": m.get("request_id"), "title": m.get("title"), "status": m.get("status"), "type": "movie", "time": m.get("reviewed_at")})
        for p in profiles_cursor: 
            notifications.append({"id": p.get("req_id"), "request_type": p.get("request_type"), "status": p.get("status"), "type": "profile", "time": p.get("reviewed_at")})
        total = len(notifications)

    else:
        # Staff roles
        if check_perm("movie_requests", "view"):
            movies = list(db.movie_requests.find({"status": "pending"}).sort("request_id", -1).limit(10))
            for m in movies: 
                t = db.theatres.find_one({"_id": m.get("theatre_id")})
                notifications.append({"id": m.get("request_id"), "theatre": t.get("name") if t else "", "type": "movie", "time": m.get("created_at")})
            total += db.movie_requests.count_documents({"status": "pending"})

        if check_perm("profile_requests", "view"):
            profiles = list(db.profile_requests.find({"status": "pending"}).sort("req_id", -1).limit(10))
            for p in profiles: 
                t = db.theatres.find_one({"_id": p.get("theatre_id")})
                notifications.append({"id": p.get("req_id"), "theatre": t.get("name") if t else "", "type": "profile", "time": p.get("requested_at")})
            total += db.profile_requests.count_documents({"status": "pending"})

        if check_perm("partner_requests", "view"):
            partner_reqs = list(db.admins.find({"status": "pending"}).sort("admin_id", -1).limit(10))
            for pa in partner_reqs: 
                t = db.theatres.find_one({"_id": pa.get("theatre_id")})
                notifications.append({"id": pa.get("admin_id"), "theatre": t.get("name") if t else "", "type": "partner signup", "time": pa.get("created_at")})
            total += db.admins.count_documents({"status": "pending"})

    notifications.sort(key=lambda x: x.get("time") or "", reverse=True)
    return jsonify({"status": "success", "total": total, "items": notifications[:10]})


@notifications_bp.route("/admin/notifications/mark_viewed", methods=["POST"])
def mark_notifications_viewed():
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401
    db = get_db()
    db.movie_requests.update_many({"theatre_id": session.get("theatre_id"), "status": {"$ne": "pending"}}, {"$set": {"admin_viewed": 1}})
    db.profile_requests.update_many({"admin_id": session.get("admin_id"), "status": {"$ne": "pending"}}, {"$set": {"admin_viewed": 1}})
    return jsonify({"status": "success", "message": "Notifications cleared"})