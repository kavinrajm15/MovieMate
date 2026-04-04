from flask import Blueprint, jsonify, request, session
from core.database import get_db
from core.security import check_perm

theatres_bp = Blueprint('theatres', __name__)

@theatres_bp.route("/admin/theatres")
def admin_theatres():
    if not check_perm("theatres", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    theatres = conn.execute("SELECT * FROM theatres ORDER BY city, name").fetchall()
    conn.close()
    return jsonify({"status": "success", "theatres": [dict(t) for t in theatres]})

@theatres_bp.route("/admin/theatre/add", methods=["POST"])
def add_theatre():
    if not check_perm("theatres", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    name, city = request.form.get("name"), request.form.get("city")
    if name and city:
        conn = get_db()
        conn.execute("INSERT INTO theatres (name, city) VALUES (?, ?)", (name.strip(), city.lower()))
        conn.commit()
        conn.close()
    return jsonify({"status": "success", "message": "Theatre added"})

@theatres_bp.route("/admin/theatre/delete/<int:theatre_id>", methods=["POST"])
def delete_theatre(theatre_id):
    if not check_perm("theatres", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    conn.execute("DELETE FROM showtimes WHERE theatre_id = ?", (theatre_id,))
    conn.execute("DELETE FROM theatres WHERE theatre_id = ?", (theatre_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Theatre deleted"})

@theatres_bp.route("/admin/theatre/view/<int:theatre_id>")
def admin_theatre_view(theatre_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    if session.get("role") == "theatre_admin" and session.get("theatre_id") != theatre_id:
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    theatre = conn.execute("SELECT * FROM theatres WHERE theatre_id = ?", (theatre_id,)).fetchone()
    all_movies = conn.execute("SELECT movie_id, title FROM movies ORDER BY title").fetchall()
    movies = conn.execute("SELECT DISTINCT m.* FROM showtimes s JOIN movies m ON s.movie_id = m.movie_id WHERE s.theatre_id = ?", (theatre_id,)).fetchall()
    conn.close()
    return jsonify({"status": "success", "theatre": dict(theatre) if theatre else None, "all_movies": [dict(m) for m in all_movies], "movies": [dict(m) for m in movies]})

@theatres_bp.route("/admin/theatre/<int:theatre_id>/movie/<int:movie_id>")
def admin_theatre_movie_showtimes(theatre_id, movie_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    if session.get("role") == "theatre_admin" and session.get("theatre_id") != theatre_id:
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    theatre = conn.execute("SELECT * FROM theatres WHERE theatre_id = ?", (theatre_id,)).fetchone()
    movie = conn.execute("SELECT * FROM movies WHERE movie_id = ?", (movie_id,)).fetchone()
    showtimes_raw = conn.execute("SELECT showtime_id, date, show_time, format FROM showtimes WHERE theatre_id = ? AND movie_id = ? ORDER BY date, show_time", (theatre_id, movie_id)).fetchall()
    conn.close()
    schedule = {}
    for s in showtimes_raw:
        dt = s["date"]
        if dt not in schedule: schedule[dt] = []
        schedule[dt].append(dict(s))
    return jsonify({"status": "success", "theatre": dict(theatre) if theatre else None, "movie": dict(movie) if movie else None, "schedule": schedule})