from flask import Blueprint, jsonify, request, session
from core.database import get_db, get_next_id
from core.security import check_perm

showtimes_bp = Blueprint('showtimes', __name__)

@showtimes_bp.route("/admin/showtime/add", methods=["POST"])
def add_showtime():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    t_id = int(request.form["theatre_id"])
    if session.get("role") == "theatre_admin":
        if session.get("theatre_id") != t_id:
            return jsonify({"error": "Unauthorized"}), 403
    else:
        if not check_perm("theatres", "add"):
            return jsonify({"error": "Unauthorized"}), 403

    m_id    = int(request.form["movie_id"])
    time    = request.form["show_time"]
    format_ = request.form["format"]
    date    = request.form["date"].replace("-", "")

    db     = get_db()
    new_id = get_next_id(db, "showtimes")
    db.showtimes.insert_one({
        "_id":         new_id,
        "showtime_id": new_id,
        "movie_id":    m_id,
        "theatre_id":  t_id,
        "show_time":   time,
        "format":      format_,
        "date":        date,
    })
    return jsonify({"status": "success", "message": "Showtime added"})


@showtimes_bp.route("/admin/showtime/edit/<int:showtime_id>", methods=["POST"])
def edit_showtime(showtime_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    db = get_db()

    if session.get("role") == "theatre_admin":
        st = db.showtimes.find_one({"_id": showtime_id})
        if not st or st.get("theatre_id") != session.get("theatre_id"):
            return jsonify({"error": "Unauthorized"}), 403
    else:
        if not check_perm("theatres", "edit"):
            return jsonify({"error": "Unauthorized"}), 403

    time    = request.form["show_time"]
    format_ = request.form["format"]
    date    = request.form["date"].replace("-", "")

    db.showtimes.update_one(
        {"_id": showtime_id},
        {"$set": {"show_time": time, "format": format_, "date": date}}
    )
    return jsonify({"status": "success", "message": "Showtime updated"})


@showtimes_bp.route("/admin/showtime/delete/<int:id>")
def delete_showtime(id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    db = get_db()

    if session.get("role") == "theatre_admin":
        st = db.showtimes.find_one({"_id": id})
        if not st or st.get("theatre_id") != session.get("theatre_id"):
            return jsonify({"error": "Unauthorized"}), 403
    else:
        if not check_perm("theatres", "delete"):
            return jsonify({"error": "Unauthorized"}), 403

    db.showtimes.delete_one({"_id": id})
    return jsonify({"status": "success", "message": "Showtime deleted"})