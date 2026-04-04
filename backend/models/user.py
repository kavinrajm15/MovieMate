from core.database import get_db
import sqlite3

def verify_staff(username, password):
    conn = get_db()
    staff = conn.execute("SELECT * FROM staff WHERE username=? AND password=?", (username, password)).fetchone()
    conn.close()
    return dict(staff) if staff else None

def verify_admin(phone, password):
    conn = get_db()
    admin = conn.execute("SELECT * FROM admins WHERE phone=? AND password=?", (phone, password)).fetchone()
    conn.close()
    return dict(admin) if admin else None

def create_admin(name, phone, password, theatre_id, timestamp):
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO admins (name, phone, password, theatre_id, status, created_at) 
            VALUES (?, ?, ?, ?, 'pending', ?)
        """, (name, phone, password, theatre_id, timestamp))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False # Phone number already exists
    conn.close()
    return success

def get_all_approved_admins():
    conn = get_db()
    admins = conn.execute("""
        SELECT a.admin_id, a.name, a.phone, t.name as theatre_name, t.city 
        FROM admins a JOIN theatres t ON a.theatre_id = t.theatre_id 
        WHERE a.status = 'approved' ORDER BY a.admin_id DESC
    """).fetchall()
    conn.close()
    return [dict(a) for a in admins]

def get_pending_admins():
    conn = get_db()
    admins = conn.execute("""
        SELECT a.admin_id, a.name, a.phone, a.created_at, t.name as theatre_name, t.city 
        FROM admins a JOIN theatres t ON a.theatre_id = t.theatre_id 
        WHERE a.status = 'pending' ORDER BY a.admin_id DESC
    """).fetchall()
    conn.close()
    return [dict(a) for a in admins]

def get_staff_hierarchy(role, staff_id=None):
    conn = get_db()
    if role == "superadmin":
        staff = conn.execute("""
            SELECT s.*, m.name as manager_name 
            FROM staff s LEFT JOIN staff m ON s.manager_id = m.staff_id
        """).fetchall()
    else: 
        staff = conn.execute("""
            SELECT s.*, m.name as manager_name 
            FROM staff s LEFT JOIN staff m ON s.manager_id = m.staff_id
            WHERE s.staff_id = ? OR (s.role = 'supervisor' AND (s.manager_id = ? OR s.manager_id IS NULL))
        """, (staff_id, staff_id)).fetchall()
    conn.close()
    return [dict(s) for s in staff]