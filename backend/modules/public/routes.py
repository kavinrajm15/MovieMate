from flask import Blueprint, jsonify, request, redirect, url_for, session
from core.database import get_db, get_next_id
from core.security import normalize_date, get_next_dates, TODAY
import requests as req_lib
from datetime import datetime, timedelta
from decouple import config
from typing import Any

public_bp = Blueprint('public', __name__)

def parse_time_to_minutes(time_str):
    if not time_str: return 0
    try:
        parts = time_str.strip().split()
        time_part = parts[0]
        meridiem = parts[1].upper() if len(parts) > 1 else ""
        h, m = map(int, time_part.split(':'))
        if meridiem == 'PM' and h != 12: h += 12
        if meridiem == 'AM' and h == 12: h = 0
        return h * 60 + m
    except Exception:
        return 0

@public_bp.route("/")
def home():
    date = normalize_date(request.args.get("date"))
    db = get_db()
    movie_ids = db.showtimes.distinct("movie_id", {"date": date})
    movies = list(db.movies.find({"_id": {"$in": movie_ids}}).sort("title", 1).limit(10))
    return jsonify({"status": "success", "movies": movies})

@public_bp.route("/load_movies")
def load_movies():
    offset = int(request.args.get("offset", 0))
    limit  = int(request.args.get("limit", 4))
    date   = normalize_date(request.args.get("date"))
    db = get_db()
    movie_ids = db.showtimes.distinct("movie_id", {"date": date})
    movies = list(db.movies.find({"_id": {"$in": movie_ids}}, {"title": 1, "image": 1}).sort("title", 1).skip(offset).limit(limit))
    return jsonify({"movies": movies})

@public_bp.route("/movies")
def movies():
    city  = request.args.get("city")
    date  = normalize_date(request.args.get("date"))
    dates = get_next_dates(3)
    if not city:
        return jsonify({"movies": [], "city": None, "date": date, "dates": dates})
    db = get_db()
    t_ids = db.theatres.distinct("_id", {"city": city.lower()})
    movie_ids = db.showtimes.distinct("movie_id", {"theatre_id": {"$in": t_ids}, "date": date})
    movies_list = list(db.movies.find({"_id": {"$in": movie_ids}}).sort("title", 1).limit(12))
    return jsonify({"movies": movies_list, "city": city, "date": date, "dates": dates})

@public_bp.route("/load_movies_by_city")
def load_movies_by_city():
    city   = request.args.get("city")
    offset = int(request.args.get("offset", 0))
    limit  = int(request.args.get("limit", 6))
    date   = normalize_date(request.args.get("date"))
    if not city:
        return jsonify({"movies": []})
    db = get_db()
    t_ids = db.theatres.distinct("_id", {"city": city.lower()})
    movie_ids = db.showtimes.distinct("movie_id", {"theatre_id": {"$in": t_ids}, "date": date})
    movies_list = list(db.movies.find({"_id": {"$in": movie_ids}}).sort("title", 1).skip(offset).limit(limit))
    return jsonify({"movies": movies_list})

@public_bp.route("/theatres")
def theatres():
    movie_id           = request.args.get("movie_id")
    city               = request.args.get("city")
    date               = normalize_date(request.args.get("date"))
    specific_theatre_id = request.args.get("theatre_id")
    db = get_db()

    if city and not movie_id:
        theatres_list = list(db.theatres.find({"city": city.lower()}).sort("name", 1))
        return jsonify({"theatres": theatres_list, "city": city})

    if not movie_id or not city:
        return redirect(url_for('public.home'))

    movie_id = int(movie_id)
    movie = db.movies.find_one({"_id": movie_id})

    # Build showtime query
    st_query: dict[str, Any] = {"movie_id": movie_id}
    if specific_theatre_id:
        specific_theatre_id = int(specific_theatre_id)
        st_query["theatre_id"] = specific_theatre_id
    else:
        t_ids = db.theatres.distinct("_id", {"city": city.lower()})
        st_query["theatre_id"] = {"$in": t_ids}

    # Get available dates
    date_vals = sorted(db.showtimes.distinct("date", {**st_query, "date": {"$gte": TODAY}}))
    dates = [{"raw": d, "day": datetime.strptime(d, "%Y%m%d").strftime("%a"),
              "date": datetime.strptime(d, "%Y%m%d").strftime("%d"),
              "month": datetime.strptime(d, "%Y%m%d").strftime("%b")} for d in date_vals]

    # Get showtimes for selected date
    st_query["date"] = date
    rows = list(db.showtimes.find(st_query, {"showtime_id": 1, "theatre_id": 1, "show_time": 1, "format": 1}))

    # Build theatre_name → shows dict
    theatres_dict = {}
    for r in rows:
        t = db.theatres.find_one({"_id": r.get("theatre_id")})
        t_name = t.get("name") if t else "Unknown"
        theatres_dict.setdefault(t_name, []).append({
            # Use showtime_id field if present; fall back to _id for docs migrated from SQLite
            "showtime_id": r.get("showtime_id") or r.get("_id"),
            "time": r.get("show_time"), "format": r.get("format")
        })

    for t_name in theatres_dict:
        theatres_dict[t_name].sort(key=lambda x: parse_time_to_minutes(x.get("time")))

    return jsonify({
        "theatres": theatres_dict, "city": city,
        "movie_title": movie.get("title") if movie else "",
        "movie": movie, "dates": dates, "selected_date": date, "movie_id": movie_id
    })

@public_bp.route("/theatre/<int:theatre_id>")
def theatre_view(theatre_id):
    date  = normalize_date(request.args.get("date"))
    dates = get_next_dates(3)
    db = get_db()
    theatre = db.theatres.find_one({"_id": theatre_id})
    if not theatre:
        return redirect(url_for("public.home"))

    rows = list(db.showtimes.find({"theatre_id": theatre_id, "date": date}))
    movies_dict = {}
    for r in rows:
        m_id = r.get("movie_id")
        if m_id not in movies_dict:
            m = db.movies.find_one({"_id": m_id})
            if m:
                movies_dict[m_id] = {
                    "movie_id": m_id, "title": m.get("title"), "image": m.get("image"),
                    "duration": m.get("duration"), "genres": m.get("genres"),
                    "certificate": m.get("certificate"), "shows": []
                }
        if m_id in movies_dict:
            movies_dict[m_id]["shows"].append({
                # Use showtime_id field if present; fall back to _id for docs migrated from SQLite
                "showtime_id": r.get("showtime_id") or r.get("_id"),
                "time": r.get("show_time"), "format": r.get("format")
            })

    for m_id in movies_dict:
        movies_dict[m_id]["shows"].sort(key=lambda x: parse_time_to_minutes(x.get("time")))

    return jsonify({"theatre": theatre, "movies": list(movies_dict.values()), "dates": dates, "selected_date": date})

@public_bp.route("/search")
def search():
    q            = request.args.get("q", "").strip()
    city_context = request.args.get("city", "").strip()
    if not q:
        return redirect(url_for("public.home"))

    db = get_db()
    city_check = db.theatres.find_one({"city": q.lower()})
    if city_check:
        return redirect(url_for("public.movies", city=q.lower()))

    movies_list  = list(db.movies.find({"title": {"$regex": q, "$options": "i"}}))
    t_query: dict[str, Any] = {"name": {"$regex": q, "$options": "i"}}
    if city_context:
        t_query["city"] = city_context.lower()
    theatres_list = list(db.theatres.find(t_query))

    return jsonify({"query": q, "movies": movies_list, "theatres": theatres_list})

@public_bp.route("/api/global-search")
def api_global_search():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify({"movies": [], "theatres": [], "cities": []})
    db = get_db()
    movies_list  = list(db.movies.find({"title": {"$regex": q, "$options": "i"}}, {"title": 1}).limit(5))
    theatres_list = list(db.theatres.find({"name": {"$regex": q, "$options": "i"}}, {"name": 1, "city": 1}).limit(5))
    for m in movies_list: m["movie_id"] = m["_id"]
    for t in theatres_list: t["theatre_id"] = t["_id"]
    cities = sorted(set(db.theatres.distinct("city", {"city": {"$regex": q, "$options": "i"}})))[:5]
    return jsonify({"movies": movies_list, "theatres": theatres_list, "cities": cities})

@public_bp.route("/api/city-autocomplete")
def city_autocomplete():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify([])
    url     = "https://api.olamaps.io/places/v1/autocomplete"
    headers: dict[str, str] = {"X-API-Key": str(config("OLA_MAPS_API_KEY"))}
    params  = {"input": query, "components": "country:IN"}
    try:
        r = req_lib.get(url, headers=headers, params=params, timeout=5)
        data = r.json()
        results = []
        for p in data.get("predictions", []):
            main = p.get("structured_formatting", {}).get("main_text", "")
            desc = p.get("description", "")
            if "Tamil Nadu" not in desc: continue
            text = (main + " " + desc).lower()
            if any(x in text for x in ["junction", "station", "airport", "market", "hospital", "terminal", "school", "district", "bus stand", "busstand", "street", "main", "govt", "road"]): continue
            if main: results.append(main.lower())
        return jsonify(list(dict.fromkeys(results)))
    except Exception as e:
        print("Autocomplete error:", e)
        return jsonify([])

# ── SHOWTIME & SEAT BOOKING PUBLIC ENDPOINTS ──────────────────────────────────

@public_bp.route("/api/showtime/<int:showtime_id>")
def get_showtime_details(showtime_id):
    """Get full showtime info including movie and theatre details."""
    db = get_db()
    # Try _id first (new docs), then showtime_id field (handles any id mismatches from migration)
    showtime = db.showtimes.find_one({"_id": showtime_id}) or \
               db.showtimes.find_one({"showtime_id": showtime_id})
    if not showtime:
        return jsonify({"error": "Showtime not found"}), 404
    movie   = db.movies.find_one({"_id": showtime.get("movie_id")})
    theatre = db.theatres.find_one({"_id": showtime.get("theatre_id")})
    result  = {**showtime}
    if movie:
        result.update({
            "title": movie.get("title"), "image": movie.get("image"),
            "duration": movie.get("duration"), "genres": movie.get("genres"),
            "certificate": movie.get("certificate")
        })
    if theatre:
        result.update({"theatre_name": theatre.get("name"), "city": theatre.get("city")})
    return jsonify({"showtime": result})


@public_bp.route("/api/showtime/<int:showtime_id>/seats")
def get_showtime_seats(showtime_id):
    """Get seat layout with booked status + pricing for a showtime."""
    db = get_db()
    # Try _id first (new docs), then showtime_id field (handles any id mismatches from migration)
    showtime = db.showtimes.find_one({"_id": showtime_id}) or \
               db.showtimes.find_one({"showtime_id": showtime_id})
    if not showtime:
        return jsonify({"error": "Showtime not found"}), 404

    theatre_id = showtime.get("theatre_id")
    movie_id   = showtime.get("movie_id")

    seats   = list(db.theatre_seats.find({"theatre_id": theatre_id}).sort([("row_name", 1), ("col_num", 1)]))
    pricing = db.movie_pricing.find_one({"theatre_id": theatre_id, "movie_id": movie_id})

    if not seats or not pricing:
        return jsonify({"not_for_sale": True}), 200

    cutoff = (datetime.now() - timedelta(minutes=3)).isoformat()
    booked_rows = list(db.bookings.find({
        "showtime_id": showtime_id,
        "$or": [{"status": "confirmed"}, {"status": "locked", "booked_at": {"$gt": cutoff}}]
    }, {"seat_id": 1}))
    booked_ids = {r.get("seat_id") for r in booked_rows}

    seats_list = []
    for s in seats:
        seat = dict(s)
        seat["seat_id"] = seat.get("_id")
        if seat.get("_id") in booked_ids:
            seat["status"] = "booked"
        seats_list.append(seat)

    return jsonify({"seats": seats_list, "pricing": pricing})


@public_bp.route("/api/booking/lock", methods=["POST"])
def lock_booking():
    """Temporarily lock seats for 3 minutes during payment."""
    if not session.get("user_id") or session.get("user_role") != "customer":
        return jsonify({"error": "Please log in to book tickets"}), 401

    data        = request.json or {}
    showtime_id = data.get("showtime_id")
    seat_ids    = data.get("seat_ids", [])

    if not showtime_id or not seat_ids:
        return jsonify({"error": "Missing showtime or seat selection"}), 400

    db     = get_db()
    cutoff = (datetime.now() - timedelta(minutes=3)).isoformat()

    # 1. Clear expired locks for these seats
    db.bookings.delete_many({
        "showtime_id": showtime_id,
        "seat_id":     {"$in": seat_ids},
        "status":      "locked",
        "booked_at":   {"$lte": cutoff}
    })

    # 2. Check for active conflicts
    conflicts = list(db.bookings.find({
        "showtime_id": showtime_id,
        "seat_id":     {"$in": seat_ids},
        "$or": [{"status": "confirmed"}, {"status": "locked", "booked_at": {"$gt": cutoff}}]
    }))
    if conflicts:
        return jsonify({"error": "One or more seats were just taken. Please re-select."}), 409

    user_id   = session["user_id"]
    booked_at = datetime.now().isoformat()

    showtime_row = db.showtimes.find_one({"_id": showtime_id})
    pricing_row  = None
    if showtime_row:
        pricing_row = db.movie_pricing.find_one({
            "theatre_id": showtime_row.get("theatre_id"),
            "movie_id":   showtime_row.get("movie_id")
        })
    prices = pricing_row if pricing_row else {"silver_price": 0, "gold_price": 0, "platinum_price": 0}

    seat_rows = list(db.theatre_seats.find({"_id": {"$in": seat_ids}}))
    seat_map = {r["_id"]: r for r in seat_rows}

    for seat_id in seat_ids:
        seat_doc = seat_map.get(seat_id, {})
        cat = (seat_doc.get("category") or "silver").lower()
        if cat in ("diamond", "platinum"):
            price = prices.get("platinum_price", 400)
        elif cat == "gold":
            price = prices.get("gold_price", 250)
        else:
            price = prices.get("silver_price", 150)

        b_id = get_next_id(db, "bookings")
        db.bookings.insert_one({
            "_id": b_id, "booking_id": b_id, "user_id": user_id,
            "showtime_id": showtime_id, "seat_id": seat_id,
            "status": "locked", "booked_at": booked_at, "price_paid": price,
            "row_name": seat_doc.get("row_name", ""),
            "col_num":  seat_doc.get("col_num", ""),
            "category": seat_doc.get("category", "Silver"),
        })

    return jsonify({"message": "Seats locked for 3 minutes!", "locked_at": booked_at}), 200


@public_bp.route("/api/booking/confirm", methods=["POST"])
def confirm_booking():
    """Finalize the booking explicitly from locked seats."""
    if not session.get("user_id") or session.get("user_role") != "customer":
        return jsonify({"error": "Please log in to book tickets"}), 401

    data        = request.json or {}
    showtime_id = data.get("showtime_id")
    seat_ids    = data.get("seat_ids", [])

    if not showtime_id or not seat_ids:
        return jsonify({"error": "Missing showtime or seat selection"}), 400

    db      = get_db()
    user_id = session["user_id"]
    now_ts  = datetime.now().isoformat()

    # Build a snapshot of showtime/movie/theatre so My Tickets AND admin
    # dashboards work even after merge.py removes showtimes older than 7 days.
    # movie_id and theatre_id are stored so dashboard revenue/sales queries
    # can filter bookings directly without going through the showtimes collection.
    snapshot: dict = {}
    showtime_snap = db.showtimes.find_one({"_id": showtime_id})
    if showtime_snap:
        snapshot["show_time"]  = showtime_snap.get("show_time", "")
        snapshot["format"]     = showtime_snap.get("format", "")
        snapshot["date"]       = showtime_snap.get("date", "")
        snapshot["movie_id"]   = showtime_snap.get("movie_id")    # ← kept for dashboard queries
        snapshot["theatre_id"] = showtime_snap.get("theatre_id")  # ← kept for dashboard queries
        movie_snap = db.movies.find_one({"_id": showtime_snap.get("movie_id")})
        if movie_snap:
            snapshot["title"] = movie_snap.get("title", "")
            snapshot["image"] = movie_snap.get("image", "")
        theatre_snap = db.theatres.find_one({"_id": showtime_snap.get("theatre_id")})
        if theatre_snap:
            snapshot["theatre_name"] = theatre_snap.get("name", "")
            snapshot["city"]         = theatre_snap.get("city", "")

    result = db.bookings.update_many(
        {"user_id": user_id, "showtime_id": showtime_id, "seat_id": {"$in": seat_ids}, "status": "locked"},
        {"$set": {"status": "confirmed", "booked_at": now_ts, **snapshot}}
    )

    if result.modified_count < len(seat_ids):
        # Rollback — put locked ones back to locked (since some weren't updated)
        return jsonify({"error": "Payment window timed out or invalid lock. Please try again."}), 400

    return jsonify({"message": "Booking confirmed!"}), 201


@public_bp.route("/api/booking/cancel", methods=["POST"])
def cancel_booking():
    """Cancel and release explicitly locked seats from payment window."""
    if not session.get("user_id") or session.get("user_role") != "customer":
        return jsonify({"error": "Unauthorized"}), 401

    data        = request.json or {}
    showtime_id = data.get("showtime_id")
    seat_ids    = data.get("seat_ids", [])

    if showtime_id and seat_ids:
        db = get_db()
        db.bookings.delete_many({
            "user_id":     session["user_id"],
            "showtime_id": showtime_id,
            "seat_id":     {"$in": seat_ids},
            "status":      "locked"
        })

    return jsonify({"message": "Booking cancelled"}), 200


@public_bp.route("/api/my-bookings")
def my_bookings():
    """Get all confirmed bookings for the currently logged-in customer.

    Uses snapshot data stored on the booking document at confirm-time so that
    tickets remain visible even after merge.py removes expired showtimes.
    Falls back to live collection lookups when the snapshot fields are absent
    (handles bookings made before this fix was deployed).
    """
    if not session.get("user_id") or session.get("user_role") != "customer":
        return jsonify({"error": "Unauthorized"}), 401

    db   = get_db()
    rows = list(db.bookings.find(
        {"user_id": session["user_id"], "status": "confirmed"}
    ).sort("booked_at", -1))

    result = []
    for b in rows:
        # ── Showtime / movie / theatre ────────────────────────────────────────
        # Prefer snapshot fields written at confirm time; fall back to live
        # collection lookups for older bookings that pre-date this fix.
        show_time    = b.get("show_time", "")
        fmt          = b.get("format", "")
        date         = b.get("date", "")
        title        = b.get("title", "")
        image        = b.get("image", "")
        theatre_name = b.get("theatre_name", "")
        city         = b.get("city", "")

        # If any key fields are missing, try live lookups (backward compat)
        if not show_time or not title or not theatre_name:
            showtime = db.showtimes.find_one({"_id": b.get("showtime_id")})
            if showtime:
                show_time = show_time or showtime.get("show_time", "")
                fmt       = fmt       or showtime.get("format", "")
                date      = date      or showtime.get("date", "")
                if not title or not image:
                    movie = db.movies.find_one({"_id": showtime.get("movie_id")})
                    if movie:
                        title = title or movie.get("title", "")
                        image = image or movie.get("image", "")
                if not theatre_name or not city:
                    theatre = db.theatres.find_one({"_id": showtime.get("theatre_id")})
                    if theatre:
                        theatre_name = theatre_name or theatre.get("name", "")
                        city         = city         or theatre.get("city", "")

        # Skip only if we truly have nothing useful to show
        if not title and not show_time:
            continue

        # ── Seat labels ───────────────────────────────────────────────────────
        # Prefer snapshot written at lock time; fall back to live seat lookup.
        row_name = b.get("row_name", "")
        col_num  = b.get("col_num", "")
        category = b.get("category", "Silver")
        if not row_name:
            seat = db.theatre_seats.find_one({"_id": b.get("seat_id")})
            if seat:
                row_name = seat.get("row_name", "")
                col_num  = seat.get("col_num", "")
                category = seat.get("category", "Silver")

        result.append({
            "booking_id":   b.get("_id"),
            "booked_at":    b.get("booked_at", ""),
            "status":       b.get("status", "confirmed"),
            "price_paid":   b.get("price_paid", 0),
            "row_name":     row_name,
            "col_num":      col_num,
            "category":     category,
            "showtime_id":  b.get("showtime_id"),
            "show_time":    show_time,
            "format":       fmt,
            "date":         date,
            "title":        title,
            "image":        image,
            "theatre_name": theatre_name,
            "city":         city,
        })

    return jsonify({"bookings": result})