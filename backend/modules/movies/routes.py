from flask import Blueprint, jsonify, request, current_app
from core.database import get_db, get_next_id
from core.security import check_perm
from services.upload_service import allowed_file
from werkzeug.utils import secure_filename
import os

movies_bp = Blueprint('movies', __name__)

@movies_bp.route("/admin/movies")
def admin_movies():
    if not check_perm("movies", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    movies = list(db.movies.find().sort("title", 1))
    for m in movies:
        m["movie_id"] = m.get("movie_id") or m["_id"]  # normalise legacy records
    return jsonify({"status": "success", "movies": movies})

@movies_bp.route("/admin/movie/add_global", methods=["POST"])
def add_movie_global():
    if not check_perm("movies", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    title       = request.form["title"].strip()
    duration    = request.form["duration"]
    genres      = request.form["genres"]
    certificate = request.form["certificate"]
    file        = request.files.get("image")
    image_path  = None
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
        image_path = f"posters/{filename}"
    db = get_db()
    new_id = get_next_id(db, "movies")
    db.movies.insert_one({
        "_id": new_id, "movie_id": new_id, "title": title, "image": image_path,
        "duration": duration, "genres": genres, "certificate": certificate
    })
    return jsonify({"status": "success", "message": "Movie added"})

@movies_bp.route("/admin/movie/edit/<int:movie_id>", methods=["POST"])
def edit_movie(movie_id):
    if not check_perm("movies", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    title       = request.form["title"].strip()
    duration    = request.form["duration"]
    genres      = request.form["genres"]
    certificate = request.form["certificate"]
    file        = request.files.get("image")
    db = get_db()
    update_data = {"title": title, "duration": duration, "genres": genres, "certificate": certificate}
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
        update_data["image"] = f"posters/{filename}"
    db.movies.update_one({"_id": movie_id}, {"$set": update_data})
    return jsonify({"status": "success", "message": "Movie updated"})

@movies_bp.route("/admin/movie/delete_global/<int:movie_id>", methods=["POST"])
def delete_movie_global(movie_id):
    if not check_perm("movies", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    st_ids = db.showtimes.distinct("_id", {"movie_id": movie_id})
    if st_ids:
        db.bookings.delete_many({
            "showtime_id": {"$in": st_ids},
            "status": "locked"
        })

    db.showtimes.delete_many({"movie_id": movie_id})
    db.movies.delete_one({"_id": movie_id})
    return jsonify({"status": "success", "message": "Movie deleted"})