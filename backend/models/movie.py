from core.database import get_db

def get_home_movies(date, limit=10):
    conn = get_db()
    movies = conn.execute("""
        SELECT DISTINCT m.movie_id, m.title, m.image, m.duration, m.genres, m.certificate 
        FROM movies m JOIN showtimes s ON m.movie_id = s.movie_id 
        WHERE s.date = ? ORDER BY m.title LIMIT ?
    """, (date, limit)).fetchall()
    conn.close()
    return [dict(m) for m in movies]

def get_movies_by_city(city, date, limit=12, offset=0):
    conn = get_db()
    movies = conn.execute("""
        SELECT DISTINCT m.movie_id, m.title, m.image, m.duration, m.genres, m.certificate
        FROM movies m JOIN showtimes s ON m.movie_id = s.movie_id
        JOIN theatres t ON s.theatre_id = t.theatre_id
        WHERE t.city = ? AND s.date = ? ORDER BY m.title LIMIT ? OFFSET ?
    """, (city, date, limit, offset)).fetchall()
    conn.close()
    return [dict(m) for m in movies]

def search_movies(query):
    conn = get_db()
    movies = conn.execute(
        "SELECT movie_id, title, image, duration, genres FROM movies WHERE LOWER(title) LIKE ?", 
        (f"%{query.lower()}%",)
    ).fetchall()
    conn.close()
    return [dict(m) for m in movies]

def get_all_movies():
    conn = get_db()
    movies = conn.execute("SELECT * FROM movies ORDER BY title").fetchall()
    conn.close()
    return [dict(m) for m in movies]

def get_movie_by_id(movie_id):
    conn = get_db()
    movie = conn.execute("SELECT * FROM movies WHERE movie_id = ?", (movie_id,)).fetchone()
    conn.close()
    return dict(movie) if movie else None

def add_movie(title, image_path, duration, genres, certificate):
    conn = get_db()
    conn.execute(
        "INSERT INTO movies (title, image, duration, genres, certificate) VALUES (?, ?, ?, ?, ?)", 
        (title, image_path, duration, genres, certificate)
    )
    conn.commit()
    conn.close()

def update_movie(movie_id, title, duration, genres, certificate, image_path=None):
    conn = get_db()
    if image_path:
        conn.execute(
            "UPDATE movies SET title=?, duration=?, genres=?, certificate=?, image=? WHERE movie_id=?", 
            (title, duration, genres, certificate, image_path, movie_id)
        )
    else:
        conn.execute(
            "UPDATE movies SET title=?, duration=?, genres=?, certificate=? WHERE movie_id=?", 
            (title, duration, genres, certificate, movie_id)
        )
    conn.commit()
    conn.close()

def delete_movie(movie_id):
    conn = get_db()
    conn.execute("DELETE FROM showtimes WHERE movie_id = ?", (movie_id,))
    conn.execute("DELETE FROM movies WHERE movie_id = ?", (movie_id,))
    conn.commit()
    conn.close()