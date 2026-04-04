from flask import session
from datetime import datetime, timedelta
import json

TODAY = datetime.now().strftime("%Y%m%d")

def normalize_date(d):
    if not d: return TODAY
    return d.replace("-", "").strip()

def get_next_dates(days=3):
    base = datetime.now()
    return [(base + timedelta(days=i)).strftime("%Y%m%d") for i in range(days)]

def check_staff_access(allowed_roles):
    """Legacy role-based check — kept for staff/permissions routes."""
    if not session.get("admin"):
        return False
    if session.get("role") not in allowed_roles:
        return False
    return True

def check_perm(module, action):
    """
    Dynamic permission check against staff_permissions table.
    - superadmin: always True
    - theatre_admin: always False (they have their own routes)
    - all other roles: check staff_permissions DB row
    """
    if not session.get("admin"):
        return False
    role = session.get("role")
    if role == "superadmin":
        return True
    if role == "theatre_admin":
        return False
    # Dynamic check from DB
    staff_id = session.get("staff_id")
    if not staff_id:
        return False
    from core.database import get_db
    conn = get_db()
    row = conn.execute(
        "SELECT permissions FROM staff_permissions WHERE staff_id=?", (staff_id,)
    ).fetchone()
    conn.close()
    if not row:
        return False
    try:
        perms = json.loads(row["permissions"])
        return bool(perms.get(module, {}).get(action, False))
    except Exception:
        return False