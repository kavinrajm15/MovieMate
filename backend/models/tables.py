import json
from core.database import get_db, get_next_id


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
    db = get_db()

    # Create basic indexes equivalent to SQLite constraints
    db.users.create_index("phone", unique=True, sparse=True)
    db.users.create_index("email", unique=True, sparse=True)
    db.staff.create_index("username", unique=True, sparse=True)
    db.admins.create_index("phone", unique=True, sparse=True)
    db.movie_pricing.create_index([("theatre_id", 1), ("movie_id", 1)], unique=True)
    db.bookings.create_index([("showtime_id", 1), ("seat_id", 1)], unique=True)

    # -- Backfill movie_id for legacy movies that were inserted without it
    # Old records only have _id; new records have both _id and movie_id.
    # This ensures the frontend can always rely on movie.movie_id being present.
    db.movies.update_many(
        {"movie_id": {"$exists": False}},
        [{"$set": {"movie_id": "$_id"}}]
    )

    db.bookings.create_index([("status", 1), ("date", 1)])
    db.bookings.create_index([("status", 1), ("theatre_id", 1), ("date", 1)])
    db.bookings.create_index([("status", 1), ("movie_id", 1), ("date", 1)])
    db.bookings.create_index([("user_id", 1), ("status", 1)])

    # ── Seed superadmin staff account ──────────────────────────────────────────
    if db.staff.count_documents({}) == 0:
        db.staff.insert_one({
            "_id": get_next_id(db, "staff"),
            "username": "superadmin",
            "password": "4321",
            "role": "superadmin",
            "name": "Owner (Superadmin)",
            "profile_pic": None,
            "manager_id": None
        })

    # ── Seed role_permissions with built-in defaults ────────────────────────────
    for role_name, perms in DEFAULT_ROLE_PERMS.items():
        existing = db.role_permissions.find_one({"_id": role_name})
        if not existing:
            db.role_permissions.insert_one({
                "_id": role_name,
                "role_name": role_name,
                "permissions": json.dumps(perms),
                "is_builtin": 1,
                "visible_modules": None
            })
        else:
            stored = json.loads(existing.get("permissions", "{}"))
            changed = False
            new_dashboard_keys = perms.get("dashboard", {})
            dashboard_stored   = stored.get("dashboard", {})
            for key, val in new_dashboard_keys.items():
                if key not in dashboard_stored:
                    dashboard_stored[key] = val
                    changed = True
            if changed:
                stored["dashboard"] = dashboard_stored
            if "showtime" not in stored:
                stored["showtime"] = perms.get("showtime", {"add": False, "edit": False, "delete": False})
                changed = True
            if changed:
                db.role_permissions.update_one({"_id": role_name}, {"$set": {"permissions": json.dumps(stored)}})

    # ── Migrate existing staff_permissions: inject missing showtime key ──────
    for sp in db.staff_permissions.find():
        sp_dict = json.loads(sp.get("permissions", "{}"))
        if "showtime" not in sp_dict:
            sp_dict["showtime"] = {"add": False, "edit": False, "delete": False}
            db.staff_permissions.update_one({"_id": sp["_id"]}, {"$set": {"permissions": json.dumps(sp_dict)}})

    # Fetch all staff that have no entry in staff_permissions
    staff_ids_with_perms = db.staff_permissions.distinct("_id")
    staff_without_perms = db.staff.find({"_id": {"$nin": staff_ids_with_perms}})

    for s in staff_without_perms:
        role = s.get("role")
        rp = db.role_permissions.find_one({"_id": role})
        if rp:
            perms_json = rp.get("permissions")
        else:
            perms_json = json.dumps(_empty_perms())
        
        db.staff_permissions.insert_one({
            "_id": s["_id"],
            "staff_id": s["_id"],
            "permissions": perms_json
        })