import sqlite3
from core.database import get_db

def setup_tables():
    conn = get_db()
    
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS movies (
        movie_id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, image TEXT, duration TEXT, genres TEXT, certificate TEXT
    );
    CREATE TABLE IF NOT EXISTS theatres (
        theatre_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, city TEXT
    );
    CREATE TABLE IF NOT EXISTS showtimes (
        showtime_id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER, theatre_id INTEGER, show_time TEXT, format TEXT, date TEXT,
        FOREIGN KEY(movie_id) REFERENCES movies(movie_id),
        FOREIGN KEY(theatre_id) REFERENCES theatres(theatre_id)
    );
    CREATE TABLE IF NOT EXISTS admins (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, phone TEXT UNIQUE, password TEXT, theatre_id INTEGER, profile_pic TEXT,
        status TEXT DEFAULT 'approved', created_at TEXT,
        FOREIGN KEY(theatre_id) REFERENCES theatres(theatre_id)
    );
    CREATE TABLE IF NOT EXISTS staff (
        staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE, password TEXT, role TEXT, name TEXT, profile_pic TEXT, manager_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS staff_permissions (
        staff_id INTEGER PRIMARY KEY,
        permissions TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY(staff_id) REFERENCES staff(staff_id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS movie_requests (
        request_id INTEGER PRIMARY KEY AUTOINCREMENT,
        theatre_id INTEGER, title TEXT, image TEXT, duration TEXT, genres TEXT, certificate TEXT,
        status TEXT DEFAULT 'pending', feedback TEXT, created_at TEXT, reviewed_by TEXT,
        reviewed_role TEXT, reviewed_at TEXT, admin_viewed INTEGER DEFAULT 0,
        FOREIGN KEY(theatre_id) REFERENCES theatres(theatre_id)
    );
    CREATE TABLE IF NOT EXISTS profile_requests (
        req_id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER, theatre_id INTEGER, request_type TEXT, new_name TEXT, new_phone TEXT,
        new_theatre_name TEXT, new_city TEXT, new_password TEXT, status TEXT DEFAULT 'pending',
        requested_at TEXT, reviewed_by TEXT, reviewed_role TEXT, reviewed_at TEXT, admin_viewed INTEGER DEFAULT 0,
        FOREIGN KEY(admin_id) REFERENCES admins(admin_id)
    );
    """)

    alterations = [
        "ALTER TABLE movie_requests ADD COLUMN feedback TEXT",
        "ALTER TABLE movie_requests ADD COLUMN created_at TEXT",
        "ALTER TABLE movie_requests ADD COLUMN reviewed_by TEXT",
        "ALTER TABLE movie_requests ADD COLUMN reviewed_role TEXT",
        "ALTER TABLE movie_requests ADD COLUMN reviewed_at TEXT",
        "ALTER TABLE admins ADD COLUMN profile_pic TEXT",
        "ALTER TABLE staff ADD COLUMN profile_pic TEXT",
        "ALTER TABLE staff ADD COLUMN manager_id INTEGER",
        "ALTER TABLE movie_requests ADD COLUMN admin_viewed INTEGER DEFAULT 0",
        "ALTER TABLE profile_requests ADD COLUMN admin_viewed INTEGER DEFAULT 0",
        "ALTER TABLE admins ADD COLUMN status TEXT DEFAULT 'approved'",
        "ALTER TABLE admins ADD COLUMN created_at TEXT",
    ]
    for query in alterations:
        try:
            conn.execute(query)
        except sqlite3.OperationalError:
            pass

    staff_count = conn.execute("SELECT COUNT(*) FROM staff").fetchone()[0]
    if staff_count == 0:
        conn.execute("INSERT INTO staff (username, password, role, name) VALUES ('superadmin', '4321', 'superadmin', 'Owner (Superadmin)')")

    conn.commit()
    conn.close()