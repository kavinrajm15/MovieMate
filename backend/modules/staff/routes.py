from flask import Blueprint, jsonify, request, session
from core.database import get_db
from core.security import check_perm
import sqlite3
import re
import json

staff_bp = Blueprint('staff', __name__)

@staff_bp.route("/admin/staff")
def manage_staff():
    if not check_perm("staff", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    current_id = session.get("staff_id")
    role = session.get("role")
    if role == "superadmin":
        staff_members = conn.execute(
            "SELECT s.*, m.name as manager_name FROM staff s LEFT JOIN staff m ON s.manager_id = m.staff_id"
        ).fetchall()
    else:
        staff_members = conn.execute(
            """SELECT s.*, m.name as manager_name
               FROM staff s LEFT JOIN staff m ON s.manager_id = m.staff_id
               WHERE s.staff_id = ? OR s.manager_id = ?""",
            (current_id, current_id)
        ).fetchall()
    managers = conn.execute("SELECT staff_id, name FROM staff WHERE role='manager' ORDER BY name").fetchall()
    conn.close()
    staff_list = [dict(s) for s in staff_members]
    staff_list.sort(key=lambda item: (item["role"], [int(t) if t.isdigit() else t.lower() for t in re.split('([0-9]+)', item["name"])]))
    return jsonify({"status": "success", "staff": staff_list, "managers": [dict(m) for m in managers]})


@staff_bp.route("/admin/staff/add", methods=["POST"])
def add_staff():
    if not check_perm("staff", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    username = request.form.get("username").strip()
    password = request.form.get("password")
    role     = request.form.get("role")
    name     = request.form.get("name").strip()
    manager_id = request.form.get("manager_id") or None

    current_role = session.get("role")
    if current_role != "superadmin":
        manager_id = session.get("staff_id")
        if role in ["manager", "superadmin"]:
            role = "supervisor"

    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO staff (username, password, role, name, manager_id) VALUES (?, ?, ?, ?, ?)",
            (username, password, role, name, manager_id)
        )
        new_staff_id = cur.lastrowid
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Username taken"}), 400

    try:
        rp = conn.execute("SELECT permissions FROM role_permissions WHERE role_name=?", (role,)).fetchone()
        if rp:
            perms_json = rp["permissions"]
        else:
            modules = ["cities","theatres","movies","staff","partners","profile_requests","partner_requests","movie_requests","permissions"]
            perms_json = json.dumps({m: {"view":False,"add":False,"edit":False,"delete":False,"assign":False} for m in modules})
        conn.execute("INSERT OR REPLACE INTO staff_permissions (staff_id, permissions) VALUES (?, ?)", (new_staff_id, perms_json))
        conn.commit()
    except Exception:
        pass
    conn.close()
    return jsonify({"status": "success", "message": "Staff added."})


@staff_bp.route("/admin/staff/by-role/<role_name>")
def staff_by_role(role_name):
    """Return staff of a given role, filtered by the caller's hierarchy."""
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 403
    current_role = session.get("role")
    current_id   = session.get("staff_id")
    conn = get_db()
    if current_role == "superadmin":
        staff = conn.execute(
            "SELECT staff_id, name, role FROM staff WHERE role = ? ORDER BY name", (role_name,)
        ).fetchall()
    else:
        staff = list(conn.execute(
            "SELECT staff_id, name, role FROM staff WHERE role = ? AND manager_id = ? ORDER BY name",
            (role_name, current_id)
        ).fetchall())
        if current_role == role_name:
            me = conn.execute("SELECT staff_id, name, role FROM staff WHERE staff_id = ?", (current_id,)).fetchone()
            if me and not any(s["staff_id"] == me["staff_id"] for s in staff):
                staff.append(me)
    conn.close()
    return jsonify({"status": "success", "staff": [dict(s) for s in staff]})


@staff_bp.route("/admin/staff/assign/<int:staff_id>", methods=["POST"])
def assign_manager(staff_id):
    if not check_perm("staff", "assign"):
        return jsonify({"error": "Unauthorized"}), 403
    manager_id_val = request.form.get("manager_id")
    manager_id = int(manager_id_val) if manager_id_val and manager_id_val.strip() != "" else None
    if session.get("role") != "superadmin" and manager_id is not None:
        manager_id = session.get("staff_id")
    conn = get_db()
    conn.execute("UPDATE staff SET manager_id=? WHERE staff_id=?", (manager_id, staff_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Assignment updated."})


@staff_bp.route("/admin/staff/delete/<int:staff_id>", methods=["POST"])
def delete_staff(staff_id):
    if not check_perm("staff", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    if staff_id == session.get("staff_id"):
        return jsonify({"error": "Cannot delete your own account."}), 400
    conn = get_db()
    if session.get("role") != "superadmin":
        target = conn.execute("SELECT manager_id FROM staff WHERE staff_id=?", (staff_id,)).fetchone()
        if not target or target["manager_id"] != session.get("staff_id"):
            conn.close()
            return jsonify({"error": "Unauthorized"}), 403
    conn.execute("DELETE FROM staff WHERE staff_id=?", (staff_id,))
    conn.execute("UPDATE staff SET manager_id=NULL WHERE manager_id=?", (staff_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Staff deleted."})