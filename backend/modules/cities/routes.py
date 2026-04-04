from flask import Blueprint, jsonify, request
from core.database import get_db
from core.security import check_perm

cities_bp = Blueprint('cities', __name__)

@cities_bp.route("/admin/cities")
def admin_cities():
    if not check_perm("cities", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    cities = conn.execute("SELECT DISTINCT city FROM theatres ORDER BY city").fetchall()
    conn.close()
    return jsonify({"status": "success", "cities": [dict(c) for c in cities]})

@cities_bp.route("/admin/city/add", methods=["POST"])
def add_city():
    if not check_perm("cities", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    city_name = request.form.get("city_name", "").strip()
    if city_name:
        conn = get_db()
        if not conn.execute("SELECT 1 FROM theatres WHERE city = ?", (city_name.lower(),)).fetchone():
            conn.execute("INSERT INTO theatres (name, city) VALUES (?, ?)", ("Main Screen", city_name.lower()))
            conn.commit()
        conn.close()
    return jsonify({"status": "success", "message": "City added"})

@cities_bp.route("/admin/city/delete/<city>", methods=["POST"])
def delete_city(city):
    if not check_perm("cities", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    conn.execute("DELETE FROM showtimes WHERE theatre_id IN (SELECT theatre_id FROM theatres WHERE city = ?)", (city,))
    conn.execute("DELETE FROM theatres WHERE city = ?", (city,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "City deleted"})

@cities_bp.route("/admin/city/<city>/theatres")
def admin_city_theatres(city):
    if not check_perm("cities", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    theatres = conn.execute("SELECT * FROM theatres WHERE city = ? ORDER BY name", (city.lower(),)).fetchall()
    conn.close()
    return jsonify({"status": "success", "theatres": [dict(t) for t in theatres], "city": city})