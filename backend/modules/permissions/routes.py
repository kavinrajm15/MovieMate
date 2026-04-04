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
    # dashboard granular actions
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
    conn = get_db()
    row = conn.execute(
        "SELECT permissions FROM staff_permissions WHERE staff_id=?", (current_id,)
    ).fetchone()
    conn.close()
    if row:
        try:
            p = json.loads(row["permissions"])
            return bool(p.get("permissions", {}).get("view", False))
        except Exception:
            pass
    return False


# ─── Individual staff permissions ─────────────────────────────────────────────

@permissions_bp.route("/admin/permissions/<int:staff_id>", methods=["GET"])
def get_permissions(staff_id):
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()

    # Get the staff member's role
    staff_row = conn.execute(
        "SELECT role FROM staff WHERE staff_id=?", (staff_id,)
    ).fetchone()

    # Get stored permissions
    perm_row = conn.execute(
        "SELECT permissions FROM staff_permissions WHERE staff_id=?", (staff_id,)
    ).fetchone()

    # Get the role's default permissions for comparison
    role_default = None
    if staff_row:
        rp = conn.execute(
            "SELECT permissions FROM role_permissions WHERE role_name=?", (staff_row["role"],)
        ).fetchone()
        if rp:
            try:
                role_default = json.loads(rp["permissions"])
            except Exception:
                role_default = default_permissions()

    conn.close()

    try:
        perms = json.loads(perm_row["permissions"]) if perm_row else default_permissions()
    except Exception:
        perms = default_permissions()

    # Compare stored perms vs role defaults to determine has_custom
    has_custom = False
    if role_default is not None and perm_row is not None:
        has_custom = (json.dumps(perms, sort_keys=True) != json.dumps(role_default, sort_keys=True))

    return jsonify({"status": "success", "permissions": perms, "has_custom": has_custom})


@permissions_bp.route("/admin/permissions/<int:staff_id>", methods=["POST"])
def save_permissions(staff_id):
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    perms_json = json.dumps(data.get("permissions", default_permissions()))
    conn = get_db()
    existing = conn.execute(
        "SELECT staff_id FROM staff_permissions WHERE staff_id=?", (staff_id,)
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE staff_permissions SET permissions=? WHERE staff_id=?",
            (perms_json, staff_id)
        )
    else:
        conn.execute(
            "INSERT INTO staff_permissions (staff_id, permissions) VALUES (?, ?)",
            (staff_id, perms_json)
        )
    conn.commit()
    conn.close()
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
    conn = get_db()
    row = conn.execute(
        "SELECT permissions FROM staff_permissions WHERE staff_id=?", (staff_id,)
    ).fetchone()
    conn.close()
    try:
        perms = json.loads(row["permissions"]) if row else default_permissions()
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
    conn = get_db()
    if role == "superadmin":
        # Superadmin sees everyone except superadmins, and not themselves
        staff = conn.execute(
            "SELECT staff_id, name, role, username FROM staff WHERE role != 'superadmin' ORDER BY name"
        ).fetchall()
    elif role == "manager":
        # Manager sees only supervisors assigned under them
        staff = conn.execute(
            """SELECT staff_id, name, role, username FROM staff
               WHERE manager_id = ? AND role != 'superadmin' AND role != 'manager'
               ORDER BY name""",
            (current_id,)
        ).fetchall()
    else:
        # Other roles: only see users directly assigned under them
        staff = conn.execute(
            "SELECT staff_id, name, role, username FROM staff WHERE manager_id = ? ORDER BY name",
            (current_id,)
        ).fetchall()
    conn.close()
    # Exclude the current user themselves
    result = [dict(s) for s in staff if s["staff_id"] != current_id]
    return jsonify({"status": "success", "staff": result})


# ─── Reset a user to their role's default permissions ─────────────────────────

@permissions_bp.route("/admin/permissions/<int:staff_id>/reset-to-role", methods=["POST"])
def reset_to_role_defaults(staff_id):
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    staff = conn.execute(
        "SELECT role FROM staff WHERE staff_id=?", (staff_id,)
    ).fetchone()
    if not staff:
        conn.close()
        return jsonify({"error": "Staff not found"}), 404
    rp = conn.execute(
        "SELECT permissions FROM role_permissions WHERE role_name=?", (staff["role"],)
    ).fetchone()
    perms_json = rp["permissions"] if rp else json.dumps(default_permissions())
    existing = conn.execute(
        "SELECT staff_id FROM staff_permissions WHERE staff_id=?", (staff_id,)
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE staff_permissions SET permissions=? WHERE staff_id=?",
            (perms_json, staff_id)
        )
    else:
        conn.execute(
            "INSERT INTO staff_permissions (staff_id, permissions) VALUES (?, ?)",
            (staff_id, perms_json)
        )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Reset to role defaults."})


# ─── Bulk sync role defaults to all staff missing permissions ─────────────────

@permissions_bp.route("/admin/permissions/sync-role-defaults", methods=["POST"])
def sync_role_defaults():
    if not session.get("admin") or session.get("role") != "superadmin":
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    staff_without = conn.execute("""
        SELECT s.staff_id, s.role
        FROM staff s
        LEFT JOIN staff_permissions sp ON s.staff_id = sp.staff_id
        WHERE sp.staff_id IS NULL
    """).fetchall()
    count = 0
    for row in staff_without:
        rp = conn.execute(
            "SELECT permissions FROM role_permissions WHERE role_name=?", (row["role"],)
        ).fetchone()
        perms_json = rp["permissions"] if rp else json.dumps(default_permissions())
        conn.execute(
            "INSERT OR IGNORE INTO staff_permissions (staff_id, permissions) VALUES (?, ?)",
            (row["staff_id"], perms_json)
        )
        count += 1
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "synced": count, "message": f"{count} staff synced."})


# ─── Roles management ─────────────────────────────────────────────────────────

@permissions_bp.route("/admin/roles", methods=["GET"])
def list_roles():
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    roles = conn.execute(
        "SELECT role_name, permissions, is_builtin, visible_modules FROM role_permissions ORDER BY is_builtin DESC, role_name"
    ).fetchall()
    staff_rows = conn.execute(
        "SELECT role, COUNT(*) as cnt FROM staff GROUP BY role"
    ).fetchall()
    conn.close()
    user_counts = {r["role"]: r["cnt"] for r in staff_rows}
    result = []
    for r in roles:
        try:
            perms = json.loads(r["permissions"])
        except Exception:
            perms = default_permissions()
        try:
            vis = json.loads(r["visible_modules"]) if r["visible_modules"] else default_visible_modules()
        except Exception:
            vis = default_visible_modules()
        result.append({
            "role_name":      r["role_name"],
            "permissions":    perms,
            "visible_modules": vis,
            "is_builtin":     bool(r["is_builtin"]),
            "user_count":     user_counts.get(r["role_name"], 0),
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
    conn = get_db()
    if conn.execute(
        "SELECT role_name FROM role_permissions WHERE role_name=?", (role_name,)
    ).fetchone():
        conn.close()
        return jsonify({"error": "Role already exists"}), 400
    conn.execute(
        "INSERT INTO role_permissions (role_name, permissions, is_builtin) VALUES (?, ?, 0)",
        (role_name, json.dumps(data.get("permissions", default_permissions())))
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": f"Role '{role_name}' created."})



@permissions_bp.route("/admin/roles/<role_name>/visible-modules", methods=["GET"])
def get_role_visible_modules(role_name):
    """Return which modules are visible for a role's permission editor."""
    if not session.get("admin") or not _has_perm_access():
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    row = conn.execute(
        "SELECT visible_modules FROM role_permissions WHERE role_name=?", (role_name,)
    ).fetchone()
    conn.close()
    try:
        vis = json.loads(row["visible_modules"]) if row and row["visible_modules"] else default_visible_modules()
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
    conn = get_db()

    # 1. Update the role default permissions + visible_modules
    conn.execute(
        "UPDATE role_permissions SET permissions=?, visible_modules=? WHERE role_name=?",
        (perms_json, vis_json, role_name)
    )

    # 2. Apply to ALL existing staff with this role
    staff_with_role = conn.execute(
        "SELECT staff_id FROM staff WHERE role=?", (role_name,)
    ).fetchall()

    for row in staff_with_role:
        existing = conn.execute(
            "SELECT staff_id FROM staff_permissions WHERE staff_id=?", (row["staff_id"],)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE staff_permissions SET permissions=? WHERE staff_id=?",
                (perms_json, row["staff_id"])
            )
        else:
            conn.execute(
                "INSERT INTO staff_permissions (staff_id, permissions) VALUES (?, ?)",
                (row["staff_id"], perms_json)
            )

    conn.commit()
    conn.close()
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
    conn = get_db()
    count = conn.execute(
        "SELECT COUNT(*) FROM staff WHERE role=?", (role_name,)
    ).fetchone()[0]
    if count > 0:
        conn.close()
        return jsonify({"error": f"Cannot delete — {count} staff member(s) use this role"}), 400
    conn.execute("DELETE FROM role_permissions WHERE role_name=?", (role_name,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": f"Role '{role_name}' deleted."})



@permissions_bp.route("/admin/roles/list-all", methods=["GET"])
def list_all_roles_simple():
    if not session.get("admin"):
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    roles = conn.execute(
        "SELECT role_name, is_builtin FROM role_permissions WHERE role_name != 'superadmin' ORDER BY is_builtin DESC, role_name"
    ).fetchall()
    conn.close()
    return jsonify({
        "status": "success",
        "roles": [{"role_name": r["role_name"], "is_builtin": bool(r["is_builtin"])} for r in roles]
    })