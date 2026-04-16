from core.database import get_db, get_next_id
# ── Read ──

def get_all_theatres(sort_by=None):
    """Return all theatres, optionally sorted. Default: city → name."""
    db = get_db()
    sort = sort_by or [("city", 1), ("name", 1)]
    return list(db.theatres.find().sort(sort))


def get_theatre_by_id(theatre_id: int):
    """Return a single theatre document by its integer _id."""
    db = get_db()
    return db.theatres.find_one({"_id": theatre_id})


def get_theatres_by_city(city: str):
    """Return all theatres in a given city (case-insensitive)."""
    db = get_db()
    return list(db.theatres.find({"city": city.lower()}).sort("name", 1))


def get_theatre_city(theatre_id: int) -> str | None:
    """Return the city string for a theatre, or None if not found."""
    t = get_theatre_by_id(theatre_id)
    return t.get("city") if t else None


def get_distinct_cities() -> list[str]:
    """Return a sorted list of all unique cities that have theatres."""
    db = get_db()
    return sorted(db.theatres.distinct("city"))


def theatre_exists(theatre_id: int) -> bool:
    """Quick existence check."""
    db = get_db()
    return db.theatres.count_documents({"_id": theatre_id}, limit=1) > 0


# ── Write ──────────────────────────────────────────────────────────────────────

def create_theatre(name: str, city: str) -> int:
    """Insert a new theatre and return its new integer ID."""
    db = get_db()
    new_id = get_next_id(db, "theatres")
    db.theatres.insert_one({
        "_id":        new_id,
        "theatre_id": new_id,
        "name":       name.strip(),
        "city":       city.lower(),
    })
    return new_id


def update_theatre(theatre_id: int, name: str, city: str) -> bool:
    """Update name and city for an existing theatre. Returns True if updated."""
    db = get_db()
    result = db.theatres.update_one(
        {"_id": theatre_id},
        {"$set": {"name": name.strip(), "city": city.lower()}}
    )
    return result.modified_count > 0


def delete_theatre(theatre_id: int):
    """
    Delete a theatre and cascade-delete all its showtimes.
    Returns the number of showtimes deleted.
    """
    db = get_db()
    deleted_st = db.showtimes.delete_many({"theatre_id": theatre_id}).deleted_count
    db.theatres.delete_one({"_id": theatre_id})
    return deleted_st


# ── Showtime helpers ───────────────────────────────────────────────────────────

def get_movies_for_theatre(theatre_id: int) -> list:
    """Return all movie documents that have at least one showtime at this theatre."""
    db = get_db()
    movie_ids = db.showtimes.distinct("movie_id", {"theatre_id": theatre_id})
    return list(db.movies.find({"_id": {"$in": movie_ids}}))


def get_schedule_for_theatre_movie(theatre_id: int, movie_id: int) -> dict:
    """
    Return a date-keyed schedule dict for a specific theatre/movie combo.
    Example: {"20250415": [{"showtime_id": 1, "show_time": "10:00 AM", ...}]}
    """
    db = get_db()
    rows = list(db.showtimes.find(
        {"theatre_id": theatre_id, "movie_id": movie_id},
        {"showtime_id": 1, "date": 1, "show_time": 1, "format": 1, "_id": 1}
    ).sort([("date", 1), ("show_time", 1)]))

    schedule: dict = {}
    for s in rows:
        dt = s.get("date")
        if dt not in schedule:
            schedule[dt] = []
        schedule[dt].append(s)
    return schedule