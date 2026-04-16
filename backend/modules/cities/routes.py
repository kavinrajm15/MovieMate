from flask import Blueprint, jsonify, request
from core.database import get_db, get_next_id
from core.security import check_perm

cities_bp = Blueprint('cities', __name__)

@cities_bp.route("/admin/cities")
def admin_cities():
    if not check_perm("cities", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db     = get_db()
    cities = sorted(db.theatres.distinct("city"))
    return jsonify({"status": "success", "cities": [{"city": c} for c in cities]})

@cities_bp.route("/admin/city/add", methods=["POST"])
def add_city():
    if not check_perm("cities", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    city_name = request.form.get("city_name", "").strip()
    if city_name:
        db = get_db()
        if not db.theatres.find_one({"city": city_name.lower()}):
            new_id = get_next_id(db, "theatres")
            db.theatres.insert_one({"_id": new_id, "theatre_id": new_id, "name": "Main Screen", "city": city_name.lower()})
    return jsonify({"status": "success", "message": "City added"})

@cities_bp.route("/admin/city/delete/<city>", methods=["POST"])
def delete_city(city):
    if not check_perm("cities", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    db    = get_db()
    t_ids = db.theatres.distinct("_id", {"city": city})

    if t_ids:
        st_ids = db.showtimes.distinct("_id", {"theatre_id": {"$in": t_ids}})
        if st_ids:
            db.bookings.delete_many({
                "showtime_id": {"$in": st_ids},
                "status": "locked"
            })

    db.showtimes.delete_many({"theatre_id": {"$in": t_ids}})
    db.theatres.delete_many({"city": city})
    return jsonify({"status": "success", "message": "City deleted"})

@cities_bp.route("/admin/city/<city>/theatres")
def admin_city_theatres(city):
    if not check_perm("cities", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db       = get_db()
    theatres = list(db.theatres.find({"city": city.lower()}).sort("name", 1))
    return jsonify({"status": "success", "theatres": theatres, "city": city})