from flask import Blueprint, request, jsonify, session
from core.database import get_db

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

# ── SEAT MANAGEMENT ENDPOINTS ───────────────────────────────────────────

@seats_bp.route('/admin/theatre/<int:theatre_id>/seats', methods=['GET'])
def get_seats(theatre_id):
    if not can_manage_theatre(theatre_id): 
        return jsonify({"error": "Unauthorized"}), 403
    
    conn = get_db()
    seats = conn.execute(
        "SELECT * FROM theatre_seats WHERE theatre_id=? ORDER BY row_name, col_num", 
        (theatre_id,)
    ).fetchall()
    conn.close()
    
    return jsonify({"seats": [dict(s) for s in seats]})

@seats_bp.route('/admin/theatre/<int:theatre_id>/seats', methods=['POST'])
def save_seats(theatre_id):
    """Bulk save or overwrite the entire seat layout for a theatre."""
    if not can_manage_theatre(theatre_id): 
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.json.get('seats', [])
    conn = get_db()
    
    # Remove old layout
    conn.execute("DELETE FROM theatre_seats WHERE theatre_id=?", (theatre_id,))
    
    # Insert new layout
    for seat in data:
        conn.execute("""
            INSERT INTO theatre_seats (theatre_id, row_name, col_num, category, status)
            VALUES (?, ?, ?, ?, ?)
        """, (
            theatre_id, 
            seat.get('row_name'), 
            seat.get('col_num'), 
            seat.get('category', 'Silver'), 
            seat.get('status', 'available')
        ))
        
    conn.commit()
    conn.close()
    return jsonify({"message": "Seat layout saved successfully"})

@seats_bp.route('/admin/theatre/<int:theatre_id>/seats/<int:seat_id>', methods=['PUT'])
def update_seat_status(theatre_id, seat_id):
    """Update a specific seat (e.g., mark it as 'damaged' or change category)."""
    if not can_manage_theatre(theatre_id): 
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    status = data.get('status')
    category = data.get('category')
    
    conn = get_db()
    if status:
        conn.execute("UPDATE theatre_seats SET status=? WHERE seat_id=? AND theatre_id=?", 
                     (status, seat_id, theatre_id))
    if category:
        conn.execute("UPDATE theatre_seats SET category=? WHERE seat_id=? AND theatre_id=?", 
                     (category, seat_id, theatre_id))
                     
    conn.commit()
    conn.close()
    return jsonify({"message": "Seat updated"})

# ── MOVIE PRICING ENDPOINTS ─────────────────────────────────────────────

@seats_bp.route('/admin/theatre/<int:theatre_id>/pricing', methods=['GET'])
def get_pricing(theatre_id):
    """Fetch all movies playing at this theatre and their assigned pricing."""
    if not can_manage_theatre(theatre_id): 
        return jsonify({"error": "Unauthorized"}), 403
        
    conn = get_db()
    query = """
        SELECT DISTINCT m.movie_id, m.title, m.image, 
               IFNULL(p.silver_price, 0) as silver_price, 
               IFNULL(p.gold_price, 0) as gold_price, 
               IFNULL(p.platinum_price, 0) as platinum_price
        FROM movies m
        JOIN showtimes s ON m.movie_id = s.movie_id
        LEFT JOIN movie_pricing p ON m.movie_id = p.movie_id AND p.theatre_id = ?
        WHERE s.theatre_id = ?
    """
    movies = conn.execute(query, (theatre_id, theatre_id)).fetchall()
    conn.close()
    
    return jsonify({"pricing": [dict(m) for m in movies]})

@seats_bp.route('/admin/theatre/<int:theatre_id>/pricing/<int:movie_id>', methods=['POST'])
def set_pricing(theatre_id, movie_id):
    """Update the category prices for a specific movie in this theatre."""
    if not can_manage_theatre(theatre_id): 
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    silver = float(data.get('silver_price', 0.0))
    gold = float(data.get('gold_price', 0.0))
    platinum = float(data.get('platinum_price', 0.0))
    
    conn = get_db()
    existing = conn.execute(
        "SELECT pricing_id FROM movie_pricing WHERE theatre_id=? AND movie_id=?", 
        (theatre_id, movie_id)
    ).fetchone()
    
    if existing:
        conn.execute("""
            UPDATE movie_pricing 
            SET silver_price=?, gold_price=?, platinum_price=? 
            WHERE theatre_id=? AND movie_id=?
        """, (silver, gold, platinum, theatre_id, movie_id))
    else:
        conn.execute("""
            INSERT INTO movie_pricing (theatre_id, movie_id, silver_price, gold_price, platinum_price)
            VALUES (?, ?, ?, ?, ?)
        """, (theatre_id, movie_id, silver, gold, platinum))
        
    conn.commit()
    conn.close()
    return jsonify({"message": "Pricing updated successfully"})