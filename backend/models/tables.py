import sqlite3
import json
from core.database import get_db

# ── Default permissions per role ───────────────────────────────────────────────
ALL_MODULES = ["dashboard","cities","theatres","movies","staff","partners",
               "profile_requests","partner_requests","movie_requests","permissions","showtime"]
ALL_ACTIONS = ["view","add","edit","delete"]

DEFAULT_ROLE_PERMS = {
    "superadmin": {m: {a: True for a in ALL_ACTIONS} for m in ALL_MODULES},
    "manager": {
        "dashboard":       {"view":False, "add":False, "edit":False, "delete":False,
                            "total_movies":True,  "total_theatres":True, "total_cities":True,
                            "top_cities":True,    "top_showtimes":True,
                            "total_income":False,  "ticket_sales_count":False,
                            "ticket_sales_graph": False, "transactions":False},
        "cities":           {"view":True,  "add":True,  "edit":False, "delete":False},
        "theatres":         {"view":True,  "add":True,  "edit":False, "delete":False},
        "movies":           {"view":True,  "add":True,  "edit":True,  "delete":True },
        "staff":            {"view":True,  "add":True,  "edit":False, "delete":False, "assign":True},
        "partners":         {"view":True,  "add":False, "edit":False, "delete":False},
        "profile_requests": {"view":True,  "add":False, "edit":True,  "delete":False},
        "partner_requests": {"view":True,  "add":False, "edit":True,  "delete":False},
        "movie_requests":   {"view":True,  "add":False, "edit":True,  "delete":False},
        "permissions":      {"view":False, "add":False, "edit":False, "delete":False},
        "showtime":         {"add":False,  "edit":False, "delete":False},
    },
    "supervisor": {
        "dashboard":       {"view":False, "add":False, "edit":False, "delete":False,
                            "total_movies":True,  "total_theatres":True, "total_cities":True,
                            "top_cities":True,    "top_showtimes":True,
                            "total_income":False, "ticket_sales_count":False,
                            "ticket_sales_graph": False, "transactions":False},
        "cities":           {"view":True,  "add":False, "edit":False, "delete":False},
        "theatres":         {"view":True,  "add":False, "edit":False, "delete":False},
        "movies":           {"view":True,  "add":True,  "edit":True,  "delete":False},
        "staff":            {"view":False, "add":False, "edit":False, "delete":False, "assign":False},
        "partners":         {"view":False, "add":False, "edit":False, "delete":False},
        "profile_requests": {"view":True,  "add":False, "edit":True,  "delete":False},
        "partner_requests": {"view":False, "add":False, "edit":False, "delete":False},
        "movie_requests":   {"view":False, "add":False, "edit":False, "delete":False},
        "permissions":      {"view":False, "add":False, "edit":False, "delete":False},
        "showtime":         {"add":False,  "edit":False, "delete":False},
    },
}

def _empty_perms():
    return {m: {a: False for a in ALL_ACTIONS} for m in ALL_MODULES}


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
    CREATE TABLE IF NOT EXISTS role_permissions (
        role_name TEXT PRIMARY KEY,
        permissions TEXT NOT NULL DEFAULT '{}',
        visible_modules TEXT DEFAULT NULL,
        is_builtin INTEGER NOT NULL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS theatre_seats (
        seat_id INTEGER PRIMARY KEY AUTOINCREMENT,
        theatre_id INTEGER,
        row_name TEXT,
        col_num INTEGER,
        category TEXT,
        status TEXT DEFAULT 'available',
        FOREIGN KEY(theatre_id) REFERENCES theatres(theatre_id)
    );

    CREATE TABLE IF NOT EXISTS movie_pricing (
        pricing_id INTEGER PRIMARY KEY AUTOINCREMENT,
        theatre_id INTEGER,
        movie_id INTEGER,
        silver_price REAL DEFAULT 0.0,
        gold_price REAL DEFAULT 0.0,
        platinum_price REAL DEFAULT 0.0,
        FOREIGN KEY(theatre_id) REFERENCES theatres(theatre_id),
        FOREIGN KEY(movie_id) REFERENCES movies(movie_id),
        UNIQUE(theatre_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
        booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        showtime_id INTEGER NOT NULL,
        seat_id INTEGER NOT NULL,
        status TEXT DEFAULT 'confirmed',
        booked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        price_paid REAL DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(user_id),
        FOREIGN KEY(showtime_id) REFERENCES showtimes(showtime_id),
        FOREIGN KEY(seat_id) REFERENCES theatre_seats(seat_id),
        UNIQUE(showtime_id, seat_id)
    );

    -- ✅ phone is UNIQUE NOT NULL — login key for users
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
        "ALTER TABLE users ADD COLUMN phone TEXT",
        "ALTER TABLE users ADD COLUMN profile_pic TEXT",
        "ALTER TABLE bookings ADD COLUMN price_paid REAL DEFAULT 0",
    ]

    alterations_extra = [
        "ALTER TABLE role_permissions ADD COLUMN visible_modules TEXT DEFAULT NULL",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)",
    ]

    for query in alterations_extra:
        try:
            conn.execute(query)
        except sqlite3.OperationalError:
            pass

    for query in alterations:
        try:
            conn.execute(query)
        except sqlite3.OperationalError:
            pass

    # ── Seed superadmin staff account ──────────────────────────────────────────
    staff_count = conn.execute("SELECT COUNT(*) FROM staff").fetchone()[0]
    if staff_count == 0:
        conn.execute("INSERT INTO staff (username, password, role, name) VALUES ('superadmin', '4321', 'superadmin', 'Owner (Superadmin)')")

    # ── Seed role_permissions with built-in defaults ────────────────────────────
    for role_name, perms in DEFAULT_ROLE_PERMS.items():
        existing = conn.execute(
            "SELECT role_name FROM role_permissions WHERE role_name=?", (role_name,)
        ).fetchone()
        if not existing:
            conn.execute(
                "INSERT INTO role_permissions (role_name, permissions, is_builtin) VALUES (?, ?, 1)",
                (role_name, json.dumps(perms))
            )
        else:
            # ── Migrate: patch any missing keys into existing rows ──
            row = conn.execute(
                "SELECT permissions FROM role_permissions WHERE role_name=?", (role_name,)
            ).fetchone()
            stored = json.loads(row["permissions"])
            changed = False
            # Patch missing dashboard keys
            new_dashboard_keys = perms.get("dashboard", {})
            dashboard_stored   = stored.get("dashboard", {})
            for key, val in new_dashboard_keys.items():
                if key not in dashboard_stored:
                    dashboard_stored[key] = val
                    changed = True
            if changed:
                stored["dashboard"] = dashboard_stored
            # Patch missing showtime module
            if "showtime" not in stored:
                stored["showtime"] = perms.get("showtime", {"add": False, "edit": False, "delete": False})
                changed = True
            if changed:
                conn.execute(
                    "UPDATE role_permissions SET permissions=? WHERE role_name=?",
                    (json.dumps(stored), role_name)
                )

    conn.commit()

    # ── Migrate existing staff_permissions: inject missing showtime key ──────
    all_staff_perms = conn.execute("SELECT staff_id, permissions FROM staff_permissions").fetchall()
    for sp in all_staff_perms:
        sp_dict = json.loads(sp["permissions"])
        if "showtime" not in sp_dict:
            sp_dict["showtime"] = {"add": False, "edit": False, "delete": False}
            conn.execute(
                "UPDATE staff_permissions SET permissions=? WHERE staff_id=?",
                (json.dumps(sp_dict), sp["staff_id"])
            )
    conn.commit()

    # Fetch all staff that have no entry in staff_permissions
    staff_without_perms = conn.execute("""
        SELECT s.staff_id, s.role
        FROM staff s
        LEFT JOIN staff_permissions sp ON s.staff_id = sp.staff_id
        WHERE sp.staff_id IS NULL
    """).fetchall()

    for row in staff_without_perms:
        role = row["role"]
        rp = conn.execute(
            "SELECT permissions FROM role_permissions WHERE role_name=?", (role,)
        ).fetchone()
        if rp:
            perms_json = rp["permissions"]
        else:
            perms_json = json.dumps(_empty_perms())
        conn.execute(
            "INSERT OR IGNORE INTO staff_permissions (staff_id, permissions) VALUES (?, ?)",
            (row["staff_id"], perms_json)
        )

    conn.commit()
    conn.close()