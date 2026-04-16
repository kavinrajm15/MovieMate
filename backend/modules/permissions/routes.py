from flask import Blueprint, jsonify, request, session
from core.database import get_db
from core.security import check_perm
import json

permissions_bp = Blueprint('permissions', __name__)

ALL_MODULES = [
    {"key": "dashboard"},
    {"key": "cities"},
    {"key": "theatres"},
    {"key": "movies"},
    {"key": "staff"},
    {"key": "partners"},
    {"key": "profile_requests"},
    {"key": "partner_requests"},
    {"key": "movie_requests"},
    {"key": "permissions"},
]

ALL_ACTIONS = ["view", "add", "edit", "delete"]
BUILTIN_ROLES = ["superadmin", "manager", "supervisor"]


def default_permissions():
    p = {m["key"]: {a: False for a in ALL_ACTIONS} for m in ALL_MODULES}
    p["staff"]["assign"] = False
    for stat in ["total_movies", "total_theatres", "top_cities", "top_showtimes",
                 "total_income", "ticket_sales_count", "ticket_sales_graph", "transactions"]:
        p["dashboard"][stat] = False
    return p

def default_visible_modules():
    """All modules visible by default."""
    return {m["key"]: True for m in ALL_MODULES}


def _has_perm_access():
    if session.get("role") == "superadmin":
        return True
    current_id = session.get("staff_id")
    db = get_db()
    row = db.staff_permissions.find_one({"_id": current_id})
    if row:
        try:
            p = json.loads(row["permissions"]) if isinstance(row["permissions"], str) else row["permissions"]
            return bool(p.get("permissions", {}).get("view", False))
        except Exception:
            pass
    return False


# ─── Individual staff permissions ─────────────────────────────────────────────

@permissions_bp.route("/admin/permissions/<int:staff_id>", methods=["GET"])
def get_permissions(staff_id):
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()

    staff_row = db.staff.find_one({"_id": staff_id})
    perm_row  = db.staff_permissions.find_one({"_id": staff_id})

    role_default = None
    if staff_row:
        rp = db.role_permissions.find_one({"role_name": staff_row.get("role")})
        if rp:
            try:
                raw = rp["permissions"]
                role_default = json.loads(raw) if isinstance(raw, str) else raw
            except Exception:
                role_default = default_permissions()

    try:
        raw = perm_row["permissions"] if perm_row else None
        perms = (json.loads(raw) if isinstance(raw, str) else raw) if raw else default_permissions()
    except Exception:
        perms = default_permissions()

    has_custom = False
    if role_default is not None and perm_row is not None:
        has_custom = (json.dumps(perms, sort_keys=True) != json.dumps(role_default, sort_keys=True))

    return jsonify({"status": "success", "permissions": perms, "has_custom": has_custom})


@permissions_bp.route("/admin/permissions/<int:staff_id>", methods=["POST"])
def save_permissions(staff_id):
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    perms = data.get("permissions", default_permissions())
    perms_json = json.dumps(perms)
    db = get_db()
    db.staff_permissions.update_one(
        {"_id": staff_id},
        {"$set": {"staff_id": staff_id, "permissions": perms_json}},
        upsert=True
    )
    return jsonify({"status": "success", "message": "Permissions saved."})


@permissions_bp.route("/admin/my-permissions", methods=["GET"])
def my_permissions():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 403
    role = session.get("role")
    if role == "superadmin":
        full = {m["key"]: {a: True for a in ALL_ACTIONS} for m in ALL_MODULES}
        full["staff"]["assign"] = True
        for stat in ["total_movies", "total_theatres", "top_cities", "top_showtimes",
                     "total_income", "ticket_sales_count", "ticket_sales_graph", "transactions"]:
            full["dashboard"][stat] = True
        return jsonify({"status": "success", "permissions": full, "is_superadmin": True})
    staff_id = session.get("staff_id")
    db = get_db()
    row = db.staff_permissions.find_one({"_id": staff_id})
    try:
        raw = row["permissions"] if row else None
        perms = (json.loads(raw) if isinstance(raw, str) else raw) if raw else default_permissions()
    except Exception:
        perms = default_permissions()
    return jsonify({"status": "success", "permissions": perms, "is_superadmin": False})


# ─── Staff list for permissions page ──────────────────────────────────────────

@permissions_bp.route("/admin/permissions-staff-list", methods=["GET"])
def permissions_staff_list():
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    current_id = session.get("staff_id")
    role = session.get("role")
    db = get_db()
    if role == "superadmin":
        staff = list(db.staff.find({"role": {"$ne": "superadmin"}}).sort("name", 1))
    elif role == "manager":
        staff = list(db.staff.find({
            "manager_id": current_id,
            "role": {"$nin": ["superadmin", "manager"]}
        }).sort("name", 1))
    else:
        staff = list(db.staff.find({"manager_id": current_id}).sort("name", 1))

    for s in staff:
        s["staff_id"] = s["_id"]
    result = [s for s in staff if s["_id"] != current_id]
    return jsonify({"status": "success", "staff": result})


# ─── Reset a user to their role's default permissions ─────────────────────────

@permissions_bp.route("/admin/permissions/<int:staff_id>/reset-to-role", methods=["POST"])
def reset_to_role_defaults(staff_id):
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    staff = db.staff.find_one({"_id": staff_id})
    if not staff:
        return jsonify({"error": "Staff not found"}), 404
    rp = db.role_permissions.find_one({"role_name": staff.get("role")})
    perms_json = rp["permissions"] if rp else json.dumps(default_permissions())
    db.staff_permissions.update_one(
        {"_id": staff_id},
        {"$set": {"staff_id": staff_id, "permissions": perms_json}},
        upsert=True
    )
    return jsonify({"status": "success", "message": "Reset to role defaults."})


# ─── Bulk sync role defaults to all staff missing permissions ─────────────────

@permissions_bp.route("/admin/permissions/sync-role-defaults", methods=["POST"])
def sync_role_defaults():
    if not session.get("admin") or session.get("role") != "superadmin":
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    all_staff = list(db.staff.find())
    existing_ids = set(db.staff_permissions.distinct("_id"))
    count = 0
    for s in all_staff:
        if s["_id"] not in existing_ids:
            rp = db.role_permissions.find_one({"role_name": s.get("role")})
            perms_json = rp["permissions"] if rp else json.dumps(default_permissions())
            db.staff_permissions.insert_one({"_id": s["_id"], "staff_id": s["_id"], "permissions": perms_json})
            count += 1
    return jsonify({"status": "success", "synced": count, "message": f"{count} staff synced."})


# ─── Roles management ─────────────────────────────────────────────────────────

@permissions_bp.route("/admin/roles", methods=["GET"])
def list_roles():
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    roles = list(db.role_permissions.find().sort([("is_builtin", -1), ("role_name", 1)]))
    
    # Count staff per role
    pipeline = [{"$group": {"_id": "$role", "cnt": {"$sum": 1}}}]
    user_counts = {r["_id"]: r["cnt"] for r in db.staff.aggregate(pipeline)}
    
    result = []
    for r in roles:
        try:
            raw = r["permissions"]
            perms = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            perms = default_permissions()
        try:
            raw_vis = r.get("visible_modules")
            vis = (json.loads(raw_vis) if isinstance(raw_vis, str) else raw_vis) if raw_vis else default_visible_modules()
        except Exception:
            vis = default_visible_modules()
        result.append({
            "role_name":       r["role_name"],
            "permissions":     perms,
            "visible_modules": vis,
            "is_builtin":      bool(r.get("is_builtin")),
            "user_count":      user_counts.get(r["role_name"], 0),
        })
    return jsonify({"status": "success", "roles": result})


@permissions_bp.route("/admin/roles/add", methods=["POST"])
def add_role():
    if not session.get("admin") or session.get("role") != "superadmin":
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    role_name = data.get("role_name", "").strip().lower().replace(" ", "_")
    if not role_name:
        return jsonify({"error": "Role name is required"}), 400
    if role_name in BUILTIN_ROLES:
        return jsonify({"error": "Cannot shadow a built-in role name"}), 400
    db = get_db()
    if db.role_permissions.find_one({"role_name": role_name}):
        return jsonify({"error": "Role already exists"}), 400
    perms = data.get("permissions", default_permissions())
    db.role_permissions.insert_one({
        "role_name": role_name,
        "permissions": json.dumps(perms),
        "is_builtin": 0
    })
    return jsonify({"status": "success", "message": f"Role '{role_name}' created."})


@permissions_bp.route("/admin/roles/<role_name>/visible-modules", methods=["GET"])
def get_role_visible_modules(role_name):
    """Return which modules are visible for a role's permission editor."""
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    row = db.role_permissions.find_one({"role_name": role_name})
    try:
        raw = row.get("visible_modules") if row else None
        vis = (json.loads(raw) if isinstance(raw, str) else raw) if raw else default_visible_modules()
    except Exception:
        vis = default_visible_modules()
    return jsonify({"status": "success", "visible_modules": vis})

@permissions_bp.route("/admin/roles/<role_name>", methods=["POST"])
def update_role_permissions(role_name):
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    perms = data.get("permissions", default_permissions())
    perms_json = json.dumps(perms)
    vis = data.get("visible_modules", default_visible_modules())
    vis_json = json.dumps(vis)
    db = get_db()

    db.role_permissions.update_one(
        {"role_name": role_name},
        {"$set": {"permissions": perms_json, "visible_modules": vis_json}}
    )

    staff_with_role = list(db.staff.find({"role": role_name}))
    for row in staff_with_role:
        db.staff_permissions.update_one(
            {"_id": row["_id"]},
            {"$set": {"staff_id": row["_id"], "permissions": perms_json}},
            upsert=True
        )

    return jsonify({
        "status": "success",
        "message": f"Role updated and applied to {len(staff_with_role)} staff member(s).",
        "updated_count": len(staff_with_role)
    })


@permissions_bp.route("/admin/roles/<role_name>/delete", methods=["POST"])
def delete_role(role_name):
    if not session.get("admin") or session.get("role") != "superadmin":
        return jsonify({"error": "Unauthorized"}), 403
    if role_name in BUILTIN_ROLES:
        return jsonify({"error": "Cannot delete a built-in role"}), 400
    db = get_db()
    count = db.staff.count_documents({"role": role_name})
    if count > 0:
        return jsonify({"error": f"Cannot delete — {count} staff member(s) use this role"}), 400
    db.role_permissions.delete_one({"role_name": role_name})
    return jsonify({"status": "success", "message": f"Role '{role_name}' deleted."})


@permissions_bp.route("/admin/roles/list-all", methods=["GET"])
def list_all_roles_simple():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 403
    db = get_db()
    roles = list(db.role_permissions.find(
        {"role_name": {"$ne": "superadmin"}},
        {"role_name": 1, "is_builtin": 1}
    ).sort([("is_builtin", -1), ("role_name", 1)]))
    return jsonify({
        "status": "success",
        "roles": [{"role_name": r["role_name"], "is_builtin": bool(r.get("is_builtin"))} for r in roles]
    })