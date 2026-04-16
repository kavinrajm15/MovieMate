from core.database import get_db, get_next_id

def get_movie_requests_by_theatre(theatre_id):
    db = get_db()
    return list(db.movie_requests.find({"theatre_id": theatre_id}).sort("request_id", -1))

def get_all_movie_requests():
    db = get_db()
    reqs = list(db.movie_requests.find().sort("request_id", -1))
    for r in reqs:
        t = db.theatres.find_one({"_id": r.get("theatre_id")})
        if t:
            r["theatre_name"] = t.get("name")
            r["city"] = t.get("city")
    return reqs

def create_movie_request(theatre_id, title, image_path, duration, genres, certificate, timestamp):
    db = get_db()
    new_id = get_next_id(db, "movie_requests")
    db.movie_requests.insert_one({
        "_id": new_id,
        "request_id": new_id,
        "theatre_id": theatre_id,
        "title": title,
        "image": image_path,
        "duration": duration,
        "genres": genres,
        "certificate": certificate,
        "status": "pending",
        "feedback": "",
        "created_at": timestamp,
        "admin_viewed": 0
    })

def update_movie_request_status(request_id, status, feedback, reviewer_name, reviewer_role, timestamp):
    db = get_db()
    db.movie_requests.update_one(
        {"_id": request_id},
        {"$set": {
            "status": status,
            "feedback": feedback,
            "reviewed_by": reviewer_name,
            "reviewed_role": reviewer_role,
            "reviewed_at": timestamp
        }}
    )

def get_all_profile_requests():
    db = get_db()
    reqs = list(db.profile_requests.find().sort("req_id", -1))
    for r in reqs:
        a = db.admins.find_one({"_id": r.get("admin_id")})
        if a:
            r["current_admin_name"] = a.get("name")
            r["current_phone"] = a.get("phone")
        t = db.theatres.find_one({"_id": r.get("theatre_id")})
        if t:
            r["current_theatre_name"] = t.get("name")
            r["current_city"] = t.get("city")
    return reqs

def update_profile_request_status(request_id, status, reviewer_name, reviewer_role, timestamp):
    db = get_db()
    db.profile_requests.update_one(
        {"_id": request_id},
        {"$set": {
            "status": status,
            "reviewed_by": reviewer_name,
            "reviewed_role": reviewer_role,
            "reviewed_at": timestamp
        }}
    )