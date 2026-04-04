from flask import Blueprint, jsonify, session
from core.database import get_db
from core.security import check_perm

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route("/admin/notifications/count")
def notification_count():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    role = session.get("role")
    notifications, total = [], 0

    if role == "theatre_admin":
        theatre_id = session.get("theatre_id")
        admin_id   = session.get("admin_id")
        movies   = conn.execute("SELECT request_id, title, status, 'movie' as type, reviewed_at as time FROM movie_requests WHERE theatre_id=? AND status != 'pending' AND admin_viewed=0", (theatre_id,)).fetchall()
        profiles = conn.execute("SELECT req_id as request_id, request_type, status, 'profile' as type, reviewed_at as time FROM profile_requests WHERE admin_id=? AND status != 'pending' AND admin_viewed=0", (admin_id,)).fetchall()
        for m in movies:   notifications.append({"id": m["request_id"], "title": m["title"],        "status": m["status"], "type": "movie",   "time": m["time"]})
        for p in profiles: notifications.append({"id": p["request_id"], "request_type": p["request_type"], "status": p["status"], "type": "profile", "time": p["time"]})
        total = len(movies) + len(profiles)

    else:
        # Staff roles — only include notification types they have permission to view
        if check_perm("movie_requests", "view"):
            movies = conn.execute("SELECT r.request_id, t.name as theatre_name, 'movie' as type, r.created_at as time FROM movie_requests r JOIN theatres t ON r.theatre_id = t.theatre_id WHERE r.status='pending' ORDER BY r.request_id DESC LIMIT 10").fetchall()
            for m in movies: notifications.append({"id": m["request_id"], "theatre": m["theatre_name"], "type": "movie", "time": m["time"]})
            total += conn.execute("SELECT COUNT(*) FROM movie_requests WHERE status='pending'").fetchone()[0]

        if check_perm("profile_requests", "view"):
            profiles = conn.execute("SELECT p.req_id as request_id, t.name as theatre_name, 'profile' as type, p.requested_at as time FROM profile_requests p JOIN theatres t ON p.theatre_id = t.theatre_id WHERE p.status='pending' ORDER BY p.req_id DESC LIMIT 10").fetchall()
            for p in profiles: notifications.append({"id": p["request_id"], "theatre": p["theatre_name"], "type": "profile", "time": p["time"]})
            total += conn.execute("SELECT COUNT(*) FROM profile_requests WHERE status='pending'").fetchone()[0]

        if check_perm("partner_requests", "view"):
            partner_reqs = conn.execute("SELECT a.admin_id as request_id, t.name as theatre_name, 'partner signup' as type, a.created_at as time FROM admins a JOIN theatres t ON a.theatre_id = t.theatre_id WHERE a.status='pending' ORDER BY a.admin_id DESC LIMIT 10").fetchall()
            for pa in partner_reqs: notifications.append({"id": pa["request_id"], "theatre": pa["theatre_name"], "type": "partner signup", "time": pa["time"]})
            total += conn.execute("SELECT COUNT(*) FROM admins WHERE status='pending'").fetchone()[0]

    conn.close()
    notifications.sort(key=lambda x: x.get("time") or "", reverse=True)
    return jsonify({"status": "success", "total": total, "items": notifications[:10]})


@notifications_bp.route("/admin/notifications/mark_viewed", methods=["POST"])
def mark_notifications_viewed():
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    conn.execute("UPDATE movie_requests SET admin_viewed=1 WHERE theatre_id=? AND status != 'pending'", (session.get("theatre_id"),))
    conn.execute("UPDATE profile_requests SET admin_viewed=1 WHERE admin_id=? AND status != 'pending'", (session.get("admin_id"),))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Notifications cleared"})