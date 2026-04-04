import json
import sqlite3
import os
from pathlib import Path
from datetime import datetime, timedelta

DB = "movies.db"
POSTER_FOLDER = os.path.join("static", "posters")

TODAY = datetime.now().strftime("%Y%m%d")
CUTOFF_DATE = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")

JSON_FILES = [
    "tamilnadu_bms.json",
    "tamilnadu_ticketnew.json"
]

def init_db():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS movies (
        movie_id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE,
        image TEXT,
        duration TEXT,
        genres TEXT,
        certificate TEXT
    );

    CREATE TABLE IF NOT EXISTS theatres (
        theatre_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        city TEXT,
        UNIQUE(name, city)
    );

    CREATE TABLE IF NOT EXISTS showtimes (
        showtime_id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER,
        theatre_id INTEGER,
        show_time TEXT,
        format TEXT,
        date TEXT,
        UNIQUE(movie_id, theatre_id, show_time, format, date)
    );
    """)

    conn.commit()
    return conn

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def upsert_movie(cur, m):
    title = m["title"].strip()

    cur.execute("""
        INSERT INTO movies (title, image, duration, genres, certificate)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(title) DO UPDATE SET
            image=excluded.image,
            duration=excluded.duration,
            genres=excluded.genres,
            certificate=excluded.certificate
    """, (
        title,
        m.get("image"),
        m.get("details", {}).get("duration"),
        ",".join(m.get("details", {}).get("genres", [])),
        m.get("details", {}).get("certificate")
    ))

    cur.execute("SELECT movie_id FROM movies WHERE title=?", (title,))
    return cur.fetchone()[0], title

def upsert_theatre(cur, name, city):
    name = name.strip()
    city = city.lower().strip()

    cur.execute("""
        INSERT INTO theatres (name, city)
        VALUES (?, ?)
        ON CONFLICT(name, city) DO NOTHING
    """, (name, city))

    cur.execute("""
        SELECT theatre_id FROM theatres
        WHERE name=? AND city=?
    """, (name, city))

    return cur.fetchone()[0]

def merge_json(conn, data):
    cur = conn.cursor()

    for city, city_data in data.get("cities", {}).items():
        city = city.lower().strip()

        for movie in city_data.get("movies", []):
            
            has_valid_dates = False
            for theatre in movie.get("theatres", []):
                for show_date in theatre.get("dates", {}).keys():
                    if show_date >= CUTOFF_DATE:
                        has_valid_dates = True
                        break
                if has_valid_dates:
                    break
            
            if not has_valid_dates:
                continue

            movie_id, title = upsert_movie(cur, movie)

            for theatre in movie.get("theatres", []):
                theatre_id = upsert_theatre(cur, theatre["name"], city)

                for show_date, show_list in theatre.get("dates", {}).items():
                    if show_date < CUTOFF_DATE:
                        continue
                    
                    for st in show_list:
                        cur.execute("""
                            INSERT OR IGNORE INTO showtimes
                            (movie_id, theatre_id, show_time, format, date)
                            VALUES (?, ?, ?, ?, ?)
                        """, (
                            movie_id,
                            theatre_id,
                            st["time"],
                            st.get("format"),
                            show_date
                        ))

    conn.commit()

def remove_expired_showtimes(conn):
    print(f"Deleting showtimes older than 7 days ({CUTOFF_DATE}) from database...")
    cur = conn.cursor()
    cur.execute("DELETE FROM showtimes WHERE date < ?", (CUTOFF_DATE,))
    deleted = cur.rowcount
    conn.commit()
    print(f"Removed {deleted} expired showtimes.")

def remove_old_movies(conn):
    print("Checking for orphaned movies (no showtimes left in last 7 days)...")

    cur = conn.cursor()
    
    cur.execute("""
        SELECT movie_id, title FROM movies 
        WHERE movie_id NOT IN (SELECT DISTINCT movie_id FROM showtimes)
    """)
    rows = cur.fetchall()

    for movie_id, title in rows:
        print("Removing fully expired movie (inactive for >7 days):", title)
        cur.execute("DELETE FROM movies WHERE movie_id=?", (movie_id,))

    conn.commit()

def cleanup_unused_images(conn):
    print("Cleaning unused images...")

    if not os.path.exists(POSTER_FOLDER):
        return

    cur = conn.cursor()
    cur.execute("SELECT image FROM movies")
    rows = cur.fetchall()

    used_images = set()
    for r in rows:
        if r[0]:
            used_images.add(os.path.basename(r[0]))

    for filename in os.listdir(POSTER_FOLDER):
        path = os.path.join(POSTER_FOLDER, filename)

        if os.path.isfile(path) and filename not in used_images:
            os.remove(path)
            print("Deleted unused image:", filename)

    print("Image cleanup complete.")

if __name__ == "__main__":
    print("Updating movies.db incrementally...")

    conn = init_db()
    
    remove_expired_showtimes(conn)
    
    for jf in JSON_FILES:
        if Path(jf).exists():
            print(f"Merging {jf}")
            merge_json(conn, load_json(jf))
        else:
            print(f"Missing file: {jf}")
    remove_old_movies(conn)
    cleanup_unused_images(conn)

    conn.close()
    print("Database update complete.")