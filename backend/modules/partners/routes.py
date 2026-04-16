from flask import Blueprint, jsonify, request
from core.database import get_db
from core.security import check_perm

partners_bp = Blueprint('partners', __name__)

@partners_bp.route("/admin/theatre_admins")
def manage_admins():
    if not check_perm("partners", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    admins = list(db.admins.find({"status": "approved"}).sort("admin_id", -1))
    for a in admins:
        t = db.theatres.find_one({"_id": a.get("theatre_id")})
        a["theatre_name"] = t.get("name") if t else ""
        a["city"]         = t.get("city") if t else ""
    return jsonify({"status": "success", "admins": admins})

@partners_bp.route("/admin/theatre_admins/delete/<int:admin_id>", methods=["POST"])
def delete_admin(admin_id):
    if not check_perm("partners", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    db    = get_db()
    admin = db.admins.find_one({"_id": admin_id})
    if admin:
        t_id = admin.get("theatre_id")

        st_ids = db.showtimes.distinct("_id", {"theatre_id": t_id})
        if st_ids:
            db.bookings.delete_many({
                "showtime_id": {"$in": st_ids},
                "status": "locked"
            })

        db.profile_requests.delete_many({"$or": [{"admin_id": admin_id}, {"theatre_id": t_id}]})
        db.movie_requests.delete_many({"theatre_id": t_id})
        db.showtimes.delete_many({"theatre_id": t_id})
        db.admins.delete_one({"_id": admin_id})
        db.theatres.delete_one({"_id": t_id})
    return jsonify({"status": "success", "message": "Partner and theatre data permanently deleted"})

@partners_bp.route("/admin/partner_requests")
def partner_requests():
    if not check_perm("partner_requests", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    requests_list = list(db.admins.find({"status": "pending"}).sort("admin_id", -1))
    for r in requests_list:
        t = db.theatres.find_one({"_id": r.get("theatre_id")})
        r["theatre_name"] = t.get("name") if t else ""
        r["city"]         = t.get("city") if t else ""
    return jsonify({"status": "success", "requests": requests_list})

@partners_bp.route("/admin/partner_requests/action/<int:admin_id>", methods=["POST"])
def action_partner_request(admin_id):
    if not check_perm("partner_requests", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    action = request.form.get("action")
    db     = get_db()
    if action == "approve":
        db.admins.update_one({"_id": admin_id}, {"$set": {"status": "approved"}})
    elif action == "decline":
        theatre = db.admins.find_one({"_id": admin_id})
        db.admins.delete_one({"_id": admin_id})
        if theatre:
            if db.admins.count_documents({"theatre_id": theatre["theatre_id"]}) == 0:
                db.theatres.delete_one({"_id": theatre["theatre_id"]})
    return jsonify({"status": "success", "message": f"Partner {action}d."})