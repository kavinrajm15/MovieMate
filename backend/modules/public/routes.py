from flask import Blueprint, jsonify, request, redirect, url_for, session
from core.database import get_db
from core.security import normalize_date, get_next_dates, TODAY
import requests
from datetime import datetime, timedelta
from decouple import config

public_bp = Blueprint('public', __name__)

@public_bp.route("/")
def home():
    date = normalize_date(request.args.get("date"))
    conn = get_db()
    movies = conn.execute("SELECT DISTINCT m.movie_id, m.title, m.image, m.duration, m.genres, m.certificate FROM movies m JOIN showtimes s ON m.movie_id = s.movie_id WHERE s.date = ? ORDER BY m.title LIMIT 10", (date,)).fetchall()
    conn.close()
    return jsonify({"status": "success", "movies": [dict(m) for m in movies]})

@public_bp.route("/load_movies")
def load_movies():
    offset = int(request.args.get("offset", 0))
    limit = int(request.args.get("limit", 4))
    date = normalize_date(request.args.get("date"))
    conn = get_db()
    movies = conn.execute("SELECT DISTINCT m.title, m.image FROM movies m JOIN showtimes s ON m.movie_id = s.movie_id WHERE s.date = ? ORDER BY m.title LIMIT ? OFFSET ?", (date, limit, offset)).fetchall()
    conn.close()
    return jsonify({"movies": [dict(m) for m in movies]})

@public_bp.route("/movies")
def movies():
    city = request.args.get("city")
    date = normalize_date(request.args.get("date"))
    dates = get_next_dates(3)
    if not city:
        return jsonify({"movies": [], "city": None, "date": date, "dates": dates})
    conn = get_db()
    movies = conn.execute("""
        SELECT DISTINCT m.movie_id, m.title, m.image, m.duration, m.genres, m.certificate
        FROM movies m JOIN showtimes s ON m.movie_id = s.movie_id
        JOIN theatres t ON s.theatre_id = t.theatre_id
        WHERE t.city = ? AND s.date = ? ORDER BY m.title LIMIT 12 
    """, (city, date)).fetchall()
    conn.close()
    return jsonify({"movies": [dict(m) for m in movies], "city": city, "date": date, "dates": dates})

@public_bp.route("/load_movies_by_city")
def load_movies_by_city():
    city = request.args.get("city")
    offset = int(request.args.get("offset", 0))
    limit = int(request.args.get("limit", 6))
    date = normalize_date(request.args.get("date"))
    if not city:
        return jsonify({"movies": []})
    conn = get_db()
    movies = conn.execute("SELECT DISTINCT m.movie_id, m.title, m.image, m.duration, m.genres, m.certificate FROM movies m JOIN showtimes s ON m.movie_id = s.movie_id JOIN theatres t ON s.theatre_id = t.theatre_id WHERE t.city = ? AND s.date = ? ORDER BY m.title LIMIT ? OFFSET ?", (city, date, limit, offset)).fetchall()
    conn.close()
    return jsonify({"movies": [dict(m) for m in movies]})

@public_bp.route("/theatres")
def theatres():
    movie_id = request.args.get("movie_id")
    city = request.args.get("city")
    date = normalize_date(request.args.get("date"))
    specific_theatre_id = request.args.get("theatre_id") 
    conn = get_db()
    
    if city and not movie_id:
        theatres_list = conn.execute("SELECT theatre_id, name, city FROM theatres WHERE LOWER(city) = ? ORDER BY name", (city.lower(),)).fetchall()
        conn.close()
        return jsonify({"theatres": [dict(t) for t in theatres_list], "city": city})
        
    if not movie_id or not city:
        conn.close()
        return redirect(url_for('public.home'))

    movie = conn.execute("SELECT title, duration, genres, certificate, image FROM movies WHERE movie_id = ?", (movie_id,)).fetchone()
    
    if specific_theatre_id:
        date_rows = conn.execute("SELECT DISTINCT s.date FROM showtimes s JOIN theatres t ON s.theatre_id = t.theatre_id WHERE s.movie_id = ? AND t.theatre_id = ? AND s.date >= ? ORDER BY s.date", (movie_id, specific_theatre_id, TODAY)).fetchall()
        rows = conn.execute("SELECT s.showtime_id, t.name, s.show_time, s.format FROM showtimes s JOIN theatres t ON s.theatre_id = t.theatre_id WHERE s.movie_id = ? AND t.theatre_id = ? AND s.date = ? ORDER BY t.name, CASE WHEN s.show_time LIKE '%AM' THEN time(substr(s.show_time, 1, length(s.show_time)-3)) ELSE time(substr(s.show_time, 1, length(s.show_time)-3), '+12 hours') END", (movie_id, specific_theatre_id, date)).fetchall()
    else:
        date_rows = conn.execute("SELECT DISTINCT s.date FROM showtimes s JOIN theatres t ON s.theatre_id = t.theatre_id WHERE s.movie_id = ? AND t.city = ? AND s.date >= ? ORDER BY s.date", (movie_id, city, TODAY)).fetchall()
        rows = conn.execute("SELECT s.showtime_id, t.name, s.show_time, s.format FROM showtimes s JOIN theatres t ON s.theatre_id = t.theatre_id WHERE s.movie_id = ? AND t.city = ? AND s.date = ? ORDER BY t.name, CASE WHEN s.show_time LIKE '%AM' THEN time(substr(s.show_time, 1, length(s.show_time)-3)) ELSE time(substr(s.show_time, 1, length(s.show_time)-3), '+12 hours') END", (movie_id, city, date)).fetchall()

    conn.close()
    dates = [{"raw": r["date"], "day": datetime.strptime(r["date"], "%Y%m%d").strftime("%a"), "date": datetime.strptime(r["date"], "%Y%m%d").strftime("%d"), "month": datetime.strptime(r["date"], "%Y%m%d").strftime("%b")} for r in date_rows]
    theatres_dict = {}
    for r in rows: theatres_dict.setdefault(r["name"], []).append({"showtime_id": r["showtime_id"], "time": r["show_time"], "format": r["format"]})
    
    return jsonify({"theatres": theatres_dict, "city": city, "movie_title": movie["title"], "movie": dict(movie), "dates": dates, "selected_date": date, "movie_id": movie_id})

@public_bp.route("/theatre/<int:theatre_id>")
def theatre_view(theatre_id):
    date = normalize_date(request.args.get("date"))
    dates = get_next_dates(3)
    conn = get_db()
    theatre = conn.execute("SELECT * FROM theatres WHERE theatre_id = ?", (theatre_id,)).fetchone()
    if not theatre:
        conn.close()
        return redirect(url_for("public.home"))
        
    rows = conn.execute("""
        SELECT m.movie_id, m.title, m.image, m.duration, m.genres, m.certificate, s.showtime_id, s.show_time, s.format
        FROM showtimes s JOIN movies m ON s.movie_id = m.movie_id
        WHERE s.theatre_id = ? AND s.date = ?
        ORDER BY m.title, CASE WHEN s.show_time LIKE '%AM' THEN time(substr(s.show_time, 1, length(s.show_time)-3)) ELSE time(substr(s.show_time, 1, length(s.show_time)-3), '+12 hours') END
    """, (theatre_id, date)).fetchall()
    conn.close()

    movies_dict = {}
    for r in rows:
        m_id = r["movie_id"]
        if m_id not in movies_dict: movies_dict[m_id] = {"movie_id": m_id, "title": r["title"], "image": r["image"], "duration": r["duration"], "genres": r["genres"], "certificate": r["certificate"], "shows": []}
        movies_dict[m_id]["shows"].append({"showtime_id": r["showtime_id"], "time": r["show_time"], "format": r["format"]})

    return jsonify({"theatre": dict(theatre), "movies": list(movies_dict.values()), "dates": dates, "selected_date": date})

@public_bp.route("/search")
def search():
    q = request.args.get("q", "").strip()
    city_context = request.args.get("city", "").strip()
    if not q:
        return redirect(url_for("public.home"))
        
    conn = get_db()
    city_check = conn.execute("SELECT DISTINCT city FROM theatres WHERE LOWER(city) = ?", (q.lower(),)).fetchone()
    if city_check:
        conn.close()
        return redirect(url_for("public.movies", city=q.lower()))
        
    movies = conn.execute("SELECT movie_id, title, image, duration, genres FROM movies WHERE LOWER(title) LIKE ?", (f"%{q.lower()}%",)).fetchall()
    theatres_list = conn.execute("SELECT theatre_id, name, city FROM theatres WHERE LOWER(name) LIKE ? AND LOWER(city) = ?", (f"%{q.lower()}%", city_context.lower())).fetchall() if city_context else conn.execute("SELECT theatre_id, name, city FROM theatres WHERE LOWER(name) LIKE ?", (f"%{q.lower()}%",)).fetchall()
    conn.close()
    
    return jsonify({"query": q, "movies": [dict(m) for m in movies], "theatres": [dict(t) for t in theatres_list]})

@public_bp.route("/api/global-search")
def api_global_search():
    q = request.args.get("q", "").strip()
    if len(q) < 2: return jsonify({"movies": [], "theatres": [], "cities": []})
    conn = get_db()
    movies = conn.execute("SELECT movie_id, title FROM movies WHERE LOWER(title) LIKE ? LIMIT 5", (f"%{q.lower()}%",)).fetchall()
    theatres = conn.execute("SELECT theatre_id, name, city FROM theatres WHERE LOWER(name) LIKE ? LIMIT 5", (f"%{q.lower()}%",)).fetchall()
    cities = conn.execute("SELECT DISTINCT city FROM theatres WHERE LOWER(city) LIKE ? LIMIT 5", (f"%{q.lower()}%",)).fetchall()
    conn.close()
    return jsonify({"movies": [dict(m) for m in movies], "theatres": [dict(t) for t in theatres], "cities": [c["city"] for c in cities]})

@public_bp.route("/api/city-autocomplete")
def city_autocomplete():
    query = request.args.get("q", "").strip()
    if len(query) < 2:
        return jsonify([])
    url = "https://api.olamaps.io/places/v1/autocomplete"
    headers = {"X-API-Key": config("OLA_MAPS_API_KEY")}
    params = {"input": query, "components": "country:IN"}
    try:
        r = requests.get(url, headers=headers, params=params, timeout=5)
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
    conn = get_db()
    showtime = conn.execute("""
        SELECT s.showtime_id, s.movie_id, s.theatre_id, s.show_time, s.format, s.date,
               m.title, m.image, m.duration, m.genres, m.certificate,
               t.name as theatre_name, t.city
        FROM showtimes s
        JOIN movies m ON s.movie_id = m.movie_id
        JOIN theatres t ON s.theatre_id = t.theatre_id
        WHERE s.showtime_id = ?
    """, (showtime_id,)).fetchone()
    conn.close()
    if not showtime:
        return jsonify({"error": "Showtime not found"}), 404
    return jsonify({"showtime": dict(showtime)})


@public_bp.route("/api/showtime/<int:showtime_id>/seats")
def get_showtime_seats(showtime_id):
    """Get seat layout with booked status + pricing for a showtime."""
    conn = get_db()
    showtime = conn.execute(
        "SELECT theatre_id, movie_id FROM showtimes WHERE showtime_id=?",
        (showtime_id,)
    ).fetchone()
    if not showtime:
        conn.close()
        return jsonify({"error": "Showtime not found"}), 404

    theatre_id = showtime["theatre_id"]
    movie_id   = showtime["movie_id"]

    seats = conn.execute(
        "SELECT * FROM theatre_seats WHERE theatre_id=? ORDER BY row_name, col_num",
        (theatre_id,)
    ).fetchall()

    pricing = conn.execute(
        "SELECT silver_price, gold_price, platinum_price FROM movie_pricing WHERE theatre_id=? AND movie_id=?",
        (theatre_id, movie_id)
    ).fetchone()

    # If no seat layout OR no pricing set → not available for sale
    if not seats or not pricing:
        conn.close()
        return jsonify({"not_for_sale": True}), 200

    cutoff = (datetime.now() - timedelta(minutes=3)).isoformat()
    # Seats already booked or currently locked by someone else
    booked_rows = conn.execute(
        "SELECT seat_id FROM bookings WHERE showtime_id=? AND (status='confirmed' OR (status='locked' AND booked_at > ?))",
        (showtime_id, cutoff)
    ).fetchall()
    booked_ids = {r["seat_id"] for r in booked_rows}
    conn.close()

    seats_list = []
    for s in seats:
        seat = dict(s)
        if seat["seat_id"] in booked_ids:
            seat["status"] = "booked"
        seats_list.append(seat)

    return jsonify({
        "seats": seats_list,
        "pricing": dict(pricing)
    })


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

    conn = get_db()
    cutoff = (datetime.now() - timedelta(minutes=3)).isoformat()
    placeholders = ",".join("?" * len(seat_ids))
    
    # 1. Clear any EXPIRED locks for these exact seats so they can be re-locked
    conn.execute(
        f"DELETE FROM bookings WHERE showtime_id=? AND seat_id IN ({placeholders}) AND status='locked' AND booked_at <= ?",
        [showtime_id] + list(seat_ids) + [cutoff]
    )
    
    # 2. Check for active conflicts (confirmed, or still actively locked)
    conflicts = conn.execute(
        f"SELECT seat_id FROM bookings WHERE showtime_id=? AND seat_id IN ({placeholders}) AND (status='confirmed' OR (status='locked' AND booked_at > ?))",
        [showtime_id] + list(seat_ids) + [cutoff]
    ).fetchall()

    if conflicts:
        conn.close()
        return jsonify({"error": "One or more seats were just taken. Please re-select."}), 409

    user_id   = session["user_id"]
    booked_at = datetime.now().isoformat()

    # Lookup current pricing to snapshot at booking time
    showtime_row = conn.execute(
        "SELECT theatre_id, movie_id FROM showtimes WHERE showtime_id=?", (showtime_id,)
    ).fetchone()
    pricing_row = None
    if showtime_row:
        pricing_row = conn.execute(
            "SELECT silver_price, gold_price, platinum_price FROM movie_pricing WHERE theatre_id=? AND movie_id=?",
            (showtime_row["theatre_id"], showtime_row["movie_id"])
        ).fetchone()
    default_prices = {"silver_price": 0, "gold_price": 0, "platinum_price": 0}
    prices = dict(pricing_row) if pricing_row else default_prices

    # Fetch seat categories for the requested seats
    seat_placeholders = ",".join("?" * len(seat_ids))
    seat_rows = conn.execute(
        f"SELECT seat_id, category FROM theatre_seats WHERE seat_id IN ({seat_placeholders})",
        list(seat_ids)
    ).fetchall()
    seat_category_map = {r["seat_id"]: (r["category"] or "").lower() for r in seat_rows}

    # 3. Lock all requested seats with snapshotted price
    for seat_id in seat_ids:
        cat = seat_category_map.get(seat_id, "silver")
        if cat in ("diamond", "platinum"):
            price = prices.get("platinum_price", 400)
        elif cat == "gold":
            price = prices.get("gold_price", 250)
        else:
            price = prices.get("silver_price", 150)
        conn.execute(
            "INSERT INTO bookings (user_id, showtime_id, seat_id, status, booked_at, price_paid) VALUES (?, ?, ?, 'locked', ?, ?)",
            (user_id, showtime_id, seat_id, booked_at, price)
        )

    conn.commit()
    conn.close()
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

    conn = get_db()
    placeholders = ",".join("?" * len(seat_ids))
    user_id = session["user_id"]
    now_ts = datetime.now().isoformat()
    
    # Proceed to update all given seats to confirmed if they were locked by this user
    cursor = conn.execute(
        f"UPDATE bookings SET status='confirmed', booked_at=? WHERE user_id=? AND showtime_id=? AND seat_id IN ({placeholders}) AND status='locked'",
        [now_ts, user_id, showtime_id] + list(seat_ids)
    )
    
    if cursor.rowcount < len(seat_ids):
        conn.rollback()
        conn.close()
        return jsonify({"error": "Payment window timed out or invalid lock. Please try again."}), 400

    conn.commit()
    conn.close()
    return jsonify({"message": "Booking confirmed!"}), 201


@public_bp.route("/api/booking/cancel", methods=["POST"])
def cancel_booking():
    """Cancel and release explicitly locked seats from payment window."""
    if not session.get("user_id") or session.get("user_role") != "customer":
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json or {}
    showtime_id = data.get("showtime_id")
    seat_ids = data.get("seat_ids", [])
    
    if showtime_id and seat_ids:
        conn = get_db()
        placeholders = ",".join("?" * len(seat_ids))
        conn.execute(
            f"DELETE FROM bookings WHERE user_id=? AND showtime_id=? AND seat_id IN ({placeholders}) AND status='locked'",
            [session["user_id"], showtime_id] + list(seat_ids)
        )
        conn.commit()
        conn.close()
        
    return jsonify({"message": "Booking cancelled"}), 200


@public_bp.route("/api/my-bookings")
def my_bookings():
    """Get all bookings for the currently logged-in customer."""
    if not session.get("user_id") or session.get("user_role") != "customer":
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    rows = conn.execute("""
        SELECT b.booking_id, b.booked_at, b.status, b.price_paid,
               ts.row_name, ts.col_num, ts.category,
               s.showtime_id, s.show_time, s.format, s.date,
               m.title, m.image,
               t.name as theatre_name, t.city
        FROM bookings b
        JOIN theatre_seats ts ON b.seat_id = ts.seat_id
        JOIN showtimes s ON b.showtime_id = s.showtime_id
        JOIN movies m ON s.movie_id = m.movie_id
        JOIN theatres t ON s.theatre_id = t.theatre_id
        WHERE b.user_id = ?
        ORDER BY b.booked_at DESC
    """, (session["user_id"],)).fetchall()
    conn.close()
    return jsonify({"bookings": [dict(r) for r in rows]})