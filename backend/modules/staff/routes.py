from flask import Blueprint, jsonify, request, session
from core.database import get_db, get_next_id
from core.security import check_perm
import re
import json

staff_bp = Blueprint('staff', __name__)

@staff_bp.route("/admin/staff")
def manage_staff():
    if not check_perm("staff", "view"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    current_id = session.get("staff_id")
    role = session.get("role")
    
    if role == "superadmin":
        staff_members = list(db.staff.find())
    else:
        staff_members = list(db.staff.find({"$or": [{"_id": current_id}, {"manager_id": current_id}]}))
        
    for s in staff_members:
        s["staff_id"] = s["_id"]
        if s.get("manager_id"):
            mgr = db.staff.find_one({"_id": s.get("manager_id")})
            s["manager_name"] = mgr.get("name") if mgr else ""
        else:
            s["manager_name"] = ""
            
    managers = list(db.staff.find({"role": "manager"}, {"_id": 1, "name": 1}))
    for m in managers: m["staff_id"] = m["_id"]
    
    staff_members.sort(key=lambda item: (item.get("role", ""), [int(t) if t.isdigit() else t.lower() for t in re.split('([0-9]+)', item.get("name", ""))]))
    return jsonify({"status": "success", "staff": staff_members, "managers": managers})


@staff_bp.route("/admin/staff/add", methods=["POST"])
def add_staff():
    if not check_perm("staff", "add"):
        return jsonify({"error": "Unauthorized"}), 403
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password")
    role     = request.form.get("role")
    name     = (request.form.get("name") or "").strip()
    manager_id = request.form.get("manager_id") or None
    if manager_id: manager_id = int(manager_id)

    current_role = session.get("role")
    if current_role != "superadmin":
        manager_id = session.get("staff_id")
        if role in ["manager", "superadmin"]:
            role = "supervisor"

    db = get_db()
    if db.staff.find_one({"username": username}):
        return jsonify({"error": "Username taken"}), 400

    new_staff_id = get_next_id(db, "staff")
    db.staff.insert_one({
        "_id": new_staff_id, "staff_id": new_staff_id, "username": username, 
        "password": password, "role": role, "name": name, "manager_id": manager_id
    })

    try:
        rp = db.role_permissions.find_one({"role_name": role})
        if rp:
            perms_json = rp.get("permissions")
        else:
            modules = ["cities","theatres","movies","staff","partners","profile_requests","partner_requests","movie_requests","permissions"]
            perms_json = json.dumps({m: {"view":False,"add":False,"edit":False,"delete":False,"assign":False} for m in modules})
        db.staff_permissions.update_one({"_id": new_staff_id}, {"$set": {"staff_id": new_staff_id, "permissions": perms_json}}, upsert=True)
    except Exception:
        pass
    
    return jsonify({"status": "success", "message": "Staff added."})


@staff_bp.route("/admin/staff/by-role/<role_name>")
def staff_by_role(role_name):
    """Return staff of a given role, filtered by the caller's hierarchy."""
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 403
    current_role = session.get("role")
    current_id   = session.get("staff_id")
    db = get_db()
    
    if current_role == "superadmin":
        staff = list(db.staff.find({"role": role_name}).sort("name", 1))
    else:
        staff = list(db.staff.find({"role": role_name, "manager_id": current_id}).sort("name", 1))
        if current_role == role_name:
            me = db.staff.find_one({"_id": current_id})
            if me and not any(s["_id"] == me["_id"] for s in staff):
                staff.append(me)
                
    for s in staff:
        s["staff_id"] = s["_id"]
        if "_id" in s: del s["_id"] # Optional, just making output cleaner
        
    return jsonify({"status": "success", "staff": staff})


@staff_bp.route("/admin/staff/assign/<int:staff_id>", methods=["POST"])
def assign_manager(staff_id):
    if not check_perm("staff", "assign"):
        return jsonify({"error": "Unauthorized"}), 403
    manager_id_val = request.form.get("manager_id")
    manager_id = int(manager_id_val) if manager_id_val and manager_id_val.strip() != "" else None
    if session.get("role") != "superadmin" and manager_id is not None:
        manager_id = session.get("staff_id")
        
    db = get_db()
    db.staff.update_one({"_id": staff_id}, {"$set": {"manager_id": manager_id}})
    return jsonify({"status": "success", "message": "Assignment updated."})


@staff_bp.route("/admin/staff/delete/<int:staff_id>", methods=["POST"])
def delete_staff(staff_id):
    if not check_perm("staff", "delete"):
        return jsonify({"error": "Unauthorized"}), 403
    if staff_id == session.get("staff_id"):
        return jsonify({"error": "Cannot delete your own account."}), 400
        
    db = get_db()
    if session.get("role") != "superadmin":
        target = db.staff.find_one({"_id": staff_id})
        if not target or target.get("manager_id") != session.get("staff_id"):
            return jsonify({"error": "Unauthorized"}), 403
            
    db.staff.delete_one({"_id": staff_id})
    db.staff.update_many({"manager_id": staff_id}, {"$set": {"manager_id": None}})
    return jsonify({"status": "success", "message": "Staff deleted."})