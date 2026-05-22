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
    role = session.get("role")
    if role not in allowed_roles:
        return False
    if role != "theatre_admin":
        staff_id = session.get("staff_id")
        if staff_id:
            from core.database import get_db
            db = get_db()
            staff = db.staff.find_one({"_id": staff_id})
            if not staff or staff.get("status") == "inactive":
                return False
    return True

def check_perm(module, action):
    """
    Dynamic permission check against staff_permissions collection (MongoDB).
    - superadmin:     always True
    - theatre_admin:  always False (they have their own routes)
    - all other roles: check staff_permissions collection
    """
    if not session.get("admin"):
        return False
    role = session.get("role")
    if role == "superadmin":
        staff_id = session.get("staff_id")
        if staff_id:
            from core.database import get_db
            db = get_db()
            staff = db.staff.find_one({"_id": staff_id})
            if not staff or staff.get("status") == "inactive":
                return False
        return True
    if role == "theatre_admin":
        return False

    staff_id = session.get("staff_id")
    if not staff_id:
        return False

    from core.database import get_db
    db  = get_db()
    
    staff = db.staff.find_one({"_id": staff_id})
    if not staff or staff.get("status") == "inactive":
        return False

    row = db.staff_permissions.find_one({"_id": staff_id})
    if not row:
        return False

    try:
        raw   = row.get("permissions", {})
        perms = json.loads(raw) if isinstance(raw, str) else raw
        return bool(perms.get(module, {}).get(action, False))
    except Exception:
        return False