from flask import Blueprint, jsonify, request, current_app
from core.database import get_db
from core.security import check_perm
from services.upload_service import allowed_file
from werkzeug.utils import secure_filename
import os

movies_bp = Blueprint('movies', __name__)

@movies_bp.route("/admin/movies")
def admin_movies():
    if not check_perm("movies", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    movies = conn.execute("SELECT * FROM movies ORDER BY title").fetchall()
    conn.close()
    return jsonify({"status": "success", "movies": [dict(m) for m in movies]})

@movies_bp.route("/admin/movie/add_global", methods=["POST"])
def add_movie_global():
    if not check_perm("movies", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    title, duration, genres, certificate, file = request.form["title"].strip(), request.form["duration"], request.form["genres"], request.form["certificate"], request.files.get("image")
    image_path = None
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
        image_path = f"posters/{filename}"
    conn = get_db()
    conn.execute("INSERT INTO movies (title, image, duration, genres, certificate) VALUES (?, ?, ?, ?, ?)", (title, image_path, duration, genres, certificate))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Movie added"})

@movies_bp.route("/admin/movie/edit/<int:movie_id>", methods=["POST"])
def edit_movie(movie_id):
    if not check_perm("movies", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    title, duration, genres, certificate, file = request.form["title"].strip(), request.form["duration"], request.form["genres"], request.form["certificate"], request.files.get("image")
    conn = get_db()
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
        conn.execute("UPDATE movies SET title=?, duration=?, genres=?, certificate=?, image=? WHERE movie_id=?", (title, duration, genres, certificate, f"posters/{filename}", movie_id))
    else:
        conn.execute("UPDATE movies SET title=?, duration=?, genres=?, certificate=? WHERE movie_id=?", (title, duration, genres, certificate, movie_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Movie updated"})

@movies_bp.route("/admin/movie/delete_global/<int:movie_id>", methods=["POST"])
def delete_movie_global(movie_id):
    if not check_perm("movies", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    conn.execute("DELETE FROM showtimes WHERE movie_id = ?", (movie_id,))
    conn.execute("DELETE FROM movies WHERE movie_id = ?", (movie_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Movie deleted"})