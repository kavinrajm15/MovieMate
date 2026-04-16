from flask import Blueprint, jsonify, request, session
from core.database import get_db, get_next_id
from core.security import check_perm

theatres_bp = Blueprint('theatres', __name__)

@theatres_bp.route("/admin/theatres")
def admin_theatres():
    if not check_perm("theatres", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    theatres = list(db.theatres.find().sort([("city", 1), ("name", 1)]))
    return jsonify({"status": "success", "theatres": theatres})

@theatres_bp.route("/admin/theatre/add", methods=["POST"])
def add_theatre():
    if not check_perm("theatres", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    name, city = request.form.get("name"), request.form.get("city")
    if name and city:
        db = get_db()
        new_id = get_next_id(db, "theatres")
        db.theatres.insert_one({
            "_id": new_id,
            "theatre_id": new_id,
            "name": name.strip(),
            "city": city.lower()
        })
    return jsonify({"status": "success", "message": "Theatre added"})

@theatres_bp.route("/admin/theatre/delete/<int:theatre_id>", methods=["POST"])
def delete_theatre(theatre_id):
    if not check_perm("theatres", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()

    st_ids = db.showtimes.distinct("_id", {"theatre_id": theatre_id})
    if st_ids:
        db.bookings.delete_many({
            "showtime_id": {"$in": st_ids},
            "status": "locked"   # only ghost locks — confirmed bookings stay
        })

    db.showtimes.delete_many({"theatre_id": theatre_id})
    db.theatres.delete_one({"_id": theatre_id})
    return jsonify({"status": "success", "message": "Theatre deleted"})

@theatres_bp.route("/admin/theatre/view/<int:theatre_id>")
def admin_theatre_view(theatre_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    if session.get("role") == "theatre_admin" and session.get("theatre_id") != theatre_id:
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()
    theatre    = db.theatres.find_one({"_id": theatre_id})
    all_movies = list(db.movies.find({}, {"movie_id": 1, "title": 1, "_id": 1}).sort("title", 1))

    # Include movies from live showtimes AND from historical booking snapshots
    # so the list stays correct after merge.py removes old showtimes.
    live_m_ids = db.showtimes.distinct("movie_id", {"theatre_id": theatre_id})
    hist_m_ids = [mid for mid in
                  db.bookings.distinct("movie_id", {"theatre_id": theatre_id, "status": "confirmed"})
                  if mid is not None]
    all_m_ids  = list(set(live_m_ids) | set(hist_m_ids))
    movies     = list(db.movies.find({"_id": {"$in": all_m_ids}}))

    # Normalise: guarantee movie_id is present for legacy records that only have _id
    for m in all_movies:
        m["movie_id"] = m.get("movie_id") or m["_id"]
    for m in movies:
        m["movie_id"] = m.get("movie_id") or m["_id"]

    return jsonify({"status": "success", "theatre": theatre, "all_movies": all_movies, "movies": movies})

@theatres_bp.route("/admin/theatre/<int:theatre_id>/movie/<int:movie_id>")
def admin_theatre_movie_showtimes(theatre_id, movie_id):
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 401
    if session.get("role") == "theatre_admin" and session.get("theatre_id") != theatre_id:
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    theatre      = db.theatres.find_one({"_id": theatre_id})
    movie        = db.movies.find_one({"_id": movie_id})
    showtimes_raw = list(db.showtimes.find(
        {"theatre_id": theatre_id, "movie_id": movie_id},
        {"showtime_id": 1, "date": 1, "show_time": 1, "format": 1, "_id": 1}
    ).sort([("date", 1), ("show_time", 1)]))

    schedule = {}
    for s in showtimes_raw:
        dt = s.get("date")
        if dt not in schedule:
            schedule[dt] = []
        schedule[dt].append(s)
    return jsonify({"status": "success", "theatre": theatre, "movie": movie, "schedule": schedule})