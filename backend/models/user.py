from core.database import get_db, get_next_id
def verify_staff(username, password):
    db = get_db()
    return db.staff.find_one({"username": username, "password": password})

def verify_admin(phone, password):
    db = get_db()
    return db.admins.find_one({"phone": phone, "password": password})

def create_admin(name, phone, password, theatre_id, timestamp):
    db = get_db()
    if db.admins.find_one({"phone": phone}):
        return False
        
    new_id = get_next_id(db, "admins")
    db.admins.insert_one({
        "_id": new_id,
        "admin_id": new_id,
        "name": name,
        "phone": phone,
        "password": password,
        "theatre_id": theatre_id,
        "status": "pending",
        "created_at": timestamp
    })
    return True

def get_all_approved_admins():
    db = get_db()
    admins = list(db.admins.find({"status": "approved"}).sort("admin_id", -1))
    for a in admins:
        t = db.theatres.find_one({"_id": a.get("theatre_id")})
        if t:
            a["theatre_name"] = t.get("name")
            a["city"] = t.get("city")
    return admins

def get_pending_admins():
    db = get_db()
    admins = list(db.admins.find({"status": "pending"}).sort("admin_id", -1))
    for a in admins:
        t = db.theatres.find_one({"_id": a.get("theatre_id")})
        if t:
            a["theatre_name"] = t.get("name")
            a["city"] = t.get("city")
    return admins

def get_staff_hierarchy(role, staff_id=None):
    db = get_db()
    if role == "superadmin":
        staff_list = list(db.staff.find())
    else:
        # For supervisor, show themselves or staff they manage
        staff_list = list(db.staff.find({
            "$or": [
                {"_id": staff_id},
                {"role": "supervisor", "manager_id": staff_id},
                {"role": "supervisor", "manager_id": None}
            ]
        }))
        
    for s in staff_list:
        if s.get("manager_id"):
            m = db.staff.find_one({"_id": s["manager_id"]})
            if m:
                s["manager_name"] = m.get("name")
    return staff_list