from flask import Blueprint, request, jsonify, session
from core.database import get_db, get_next_id

seats_bp = Blueprint('seats', __name__)

def can_manage_theatre(theatre_id):
    """Ensure only Superadmins or the assigned Theatre Admin can manage these settings."""
    if not session.get("admin"):
        return False
    role = session.get("role")
    if role == "superadmin":
        return True
    if role == "theatre_admin" and session.get("theatre_id") == theatre_id:
        return True
    return False

# ── SEAT MANAGEMENT ENDPOINTS ────────────────────────────────────────────────

@seats_bp.route('/admin/theatre/<int:theatre_id>/seats', methods=['GET'])
def get_seats(theatre_id):
    if not can_manage_theatre(theatre_id):
        return jsonify({"error": "Unauthorized"}), 403
    db    = get_db()
    seats = list(db.theatre_seats.find({"theatre_id": theatre_id}).sort([("row_name", 1), ("col_num", 1)]))
    return jsonify({"seats": seats})

@seats_bp.route('/admin/theatre/<int:theatre_id>/seats', methods=['POST'])
def save_seats(theatre_id):
    """Bulk save or overwrite the entire seat layout for a theatre."""
    if not can_manage_theatre(theatre_id):
        return jsonify({"error": "Unauthorized"}), 403
    data = request.json.get('seats', [])
    db   = get_db()
    db.theatre_seats.delete_many({"theatre_id": theatre_id})
    if data:
        for seat in data:
            s_id               = get_next_id(db, "theatre_seats")
            seat["_id"]        = s_id
            seat["seat_id"]    = s_id
            seat["theatre_id"] = theatre_id
            if "category" not in seat: seat["category"] = "Silver"
            if "status"   not in seat: seat["status"]   = "available"
        db.theatre_seats.insert_many(data)
    return jsonify({"message": "Seat layout saved successfully"})

@seats_bp.route('/admin/theatre/<int:theatre_id>/seats/<int:seat_id>', methods=['PUT'])
def update_seat_status(theatre_id, seat_id):
    """Update a specific seat (e.g., mark it as 'damaged' or change category)."""
    if not can_manage_theatre(theatre_id):
        return jsonify({"error": "Unauthorized"}), 403
    data        = request.json
    status      = data.get('status')
    category    = data.get('category')
    db          = get_db()
    update_data = {}
    if status:   update_data["status"]   = status
    if category: update_data["category"] = category
    if update_data:
        db.theatre_seats.update_one({"_id": seat_id, "theatre_id": theatre_id}, {"$set": update_data})
    return jsonify({"message": "Seat updated"})

# ── MOVIE PRICING ENDPOINTS ─────────────────────────────────────────────────

@seats_bp.route('/admin/theatre/<int:theatre_id>/pricing', methods=['GET'])
def get_pricing(theatre_id):
    """Fetch all movies playing at this theatre (live or historical) with pricing.

    Includes movies from live showtimes AND from confirmed booking snapshots so
    the pricing panel remains populated after merge.py removes old showtimes.
    This is useful for reporting — admins can still see what prices were charged
    for past shows.
    """
    if not can_manage_theatre(theatre_id):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()

    live_m_ids = db.showtimes.distinct("movie_id", {"theatre_id": theatre_id})
    hist_m_ids = [mid for mid in
                  db.bookings.distinct("movie_id", {"theatre_id": theatre_id, "status": "confirmed"})
                  if mid is not None]
    all_m_ids  = list(set(live_m_ids) | set(hist_m_ids))

    movies = list(db.movies.find({"_id": {"$in": all_m_ids}}))
    for m in movies:
        m["movie_id"] = m.get("movie_id") or m["_id"]  # normalise legacy records
        pricing          = db.movie_pricing.find_one({"theatre_id": theatre_id, "movie_id": m["_id"]})
        m["silver_price"]   = pricing.get("silver_price",   0) if pricing else 0
        m["gold_price"]     = pricing.get("gold_price",     0) if pricing else 0
        m["platinum_price"] = pricing.get("platinum_price", 0) if pricing else 0

    return jsonify({"pricing": movies})

@seats_bp.route('/admin/theatre/<int:theatre_id>/pricing/<int:movie_id>', methods=['POST'])
def set_pricing(theatre_id, movie_id):
    """Update the category prices for a specific movie in this theatre."""
    if not can_manage_theatre(theatre_id):
        return jsonify({"error": "Unauthorized"}), 403
    data     = request.json
    silver   = float(data.get('silver_price',   0.0))
    gold     = float(data.get('gold_price',     0.0))
    platinum = float(data.get('platinum_price', 0.0))
    db       = get_db()
    existing = db.movie_pricing.find_one({"theatre_id": theatre_id, "movie_id": movie_id})
    if existing:
        db.movie_pricing.update_one(
            {"_id": existing["_id"]},
            {"$set": {"silver_price": silver, "gold_price": gold, "platinum_price": platinum}}
        )
    else:
        p_id = get_next_id(db, "movie_pricing")
        db.movie_pricing.insert_one({
            "_id": p_id, "pricing_id": p_id, "theatre_id": theatre_id, "movie_id": movie_id,
            "silver_price": silver, "gold_price": gold, "platinum_price": platinum
        })
    return jsonify({"message": "Pricing updated successfully"})