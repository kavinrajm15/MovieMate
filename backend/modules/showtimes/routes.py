from flask import Blueprint, jsonify, request, session
from core.database import get_db
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

    m_id, time, format_, date = request.form["movie_id"], request.form["show_time"], request.form["format"], request.form["date"].replace("-", "")
    conn = get_db()
    conn.execute("INSERT INTO showtimes (movie_id, theatre_id, show_time, format, date) VALUES (?, ?, ?, ?, ?)", (m_id, t_id, time, format_, date))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Showtime added"})


@showtimes_bp.route("/admin/showtime/edit/<int:showtime_id>", methods=["POST"])
def edit_showtime(showtime_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    if session.get("role") == "theatre_admin":
        st = conn.execute("SELECT theatre_id FROM showtimes WHERE showtime_id=?", (showtime_id,)).fetchone()
        if not st or st["theatre_id"] != session.get("theatre_id"):
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403
    else:
        if not check_perm("theatres", "edit"):
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403

    time, format_, date = request.form["show_time"], request.form["format"], request.form["date"].replace("-", "")
    conn.execute("UPDATE showtimes SET show_time=?, format=?, date=? WHERE showtime_id=?", (time, format_, date, showtime_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Showtime updated"})


@showtimes_bp.route("/admin/showtime/delete/<int:id>")
def delete_showtime(id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    if session.get("role") == "theatre_admin":
        st = conn.execute("SELECT theatre_id FROM showtimes WHERE showtime_id=?", (id,)).fetchone()
        if not st or st["theatre_id"] != session.get("theatre_id"):
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403
    else:
        if not check_perm("theatres", "delete"):
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403

    conn.execute("DELETE FROM showtimes WHERE showtime_id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Showtime deleted"})