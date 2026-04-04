from flask import Blueprint, jsonify, request
from core.database import get_db
from core.security import check_perm

partners_bp = Blueprint('partners', __name__)

@partners_bp.route("/admin/theatre_admins")
def manage_admins():
    if not check_perm("partners", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    admins = conn.execute("SELECT a.admin_id, a.name, a.phone, t.name as theatre_name, t.city FROM admins a JOIN theatres t ON a.theatre_id = t.theatre_id WHERE a.status = 'approved' ORDER BY a.admin_id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "admins": [dict(a) for a in admins]})

@partners_bp.route("/admin/theatre_admins/delete/<int:admin_id>", methods=["POST"])
def delete_admin(admin_id):
    if not check_perm("partners", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    admin = conn.execute("SELECT theatre_id FROM admins WHERE admin_id=?", (admin_id,)).fetchone()
    if admin:
        t_id = admin["theatre_id"]
        conn.execute("DELETE FROM profile_requests WHERE admin_id=? OR theatre_id=?", (admin_id, t_id))
        conn.execute("DELETE FROM movie_requests WHERE theatre_id=?", (t_id,))
        conn.execute("DELETE FROM showtimes WHERE theatre_id=?", (t_id,))
        conn.execute("DELETE FROM admins WHERE admin_id=?", (admin_id,))
        conn.execute("DELETE FROM theatres WHERE theatre_id=?", (t_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Partner and theatre data permanently deleted"})

@partners_bp.route("/admin/partner_requests")
def partner_requests():
    if not check_perm("partner_requests", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    requests_list = conn.execute("SELECT a.admin_id, a.name, a.phone, a.created_at, t.name as theatre_name, t.city FROM admins a JOIN theatres t ON a.theatre_id = t.theatre_id WHERE a.status = 'pending' ORDER BY a.admin_id DESC").fetchall()
    conn.close()
    return jsonify({"status": "success", "requests": [dict(r) for r in requests_list]})

@partners_bp.route("/admin/partner_requests/action/<int:admin_id>", methods=["POST"])
def action_partner_request(admin_id):
    if not check_perm("partner_requests", "edit"):
        return jsonify({"error": "Unauthorized"}), 403
    action = request.form.get("action")
    conn = get_db()
    if action == "approve":
        conn.execute("UPDATE admins SET status='approved' WHERE admin_id=?", (admin_id,))
    elif action == "decline":
        theatre = conn.execute("SELECT theatre_id FROM admins WHERE admin_id=?", (admin_id,)).fetchone()
        conn.execute("DELETE FROM admins WHERE admin_id=?", (admin_id,))
        if theatre and conn.execute("SELECT COUNT(*) FROM admins WHERE theatre_id=?", (theatre["theatre_id"],)).fetchone()[0] == 0:
            conn.execute("DELETE FROM theatres WHERE theatre_id=?", (theatre["theatre_id"],))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": f"Partner {action}d."})