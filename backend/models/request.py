from core.database import get_db

def get_movie_requests_by_theatre(theatre_id):
    conn = get_db()
    reqs = conn.execute("SELECT * FROM movie_requests WHERE theatre_id = ? ORDER BY request_id DESC", (theatre_id,)).fetchall()
    conn.close()
    return [dict(r) for r in reqs]

def get_all_movie_requests():
    conn = get_db()
    reqs = conn.execute("""
        SELECT r.*, t.name as theatre_name, t.city 
        FROM movie_requests r JOIN theatres t ON r.theatre_id = t.theatre_id 
        ORDER BY r.request_id DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in reqs]

def create_movie_request(theatre_id, title, image_path, duration, genres, certificate, timestamp):
    conn = get_db()
    conn.execute("""
        INSERT INTO movie_requests (theatre_id, title, image, duration, genres, certificate, status, feedback, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, 'pending', '', ?)
    """, (theatre_id, title, image_path, duration, genres, certificate, timestamp))
    conn.commit()
    conn.close()

def update_movie_request_status(request_id, status, feedback, reviewer_name, reviewer_role, timestamp):
    conn = get_db()
    conn.execute("""
        UPDATE movie_requests 
        SET status=?, feedback=?, reviewed_by=?, reviewed_role=?, reviewed_at=? 
        WHERE request_id=?
    """, (status, feedback, reviewer_name, reviewer_role, timestamp, request_id))
    conn.commit()
    conn.close()

def get_all_profile_requests():
    conn = get_db()
    reqs = conn.execute("""
        SELECT pr.*, a.name as current_admin_name, a.phone as current_phone, 
               t.name as current_theatre_name, t.city as current_city 
        FROM profile_requests pr 
        JOIN admins a ON pr.admin_id = a.admin_id 
        JOIN theatres t ON pr.theatre_id = t.theatre_id 
        ORDER BY pr.req_id DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in reqs]

def update_profile_request_status(request_id, status, reviewer_name, reviewer_role, timestamp):
    conn = get_db()
    conn.execute("""
        UPDATE profile_requests 
        SET status=?, reviewed_by=?, reviewed_role=?, reviewed_at=? WHERE req_id=?
    """, (status, reviewer_name, reviewer_role, timestamp, request_id))
    conn.commit()
    conn.close()