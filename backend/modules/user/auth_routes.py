from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from services.upload_service import allowed_file
from core.database import get_db, get_next_id
from datetime import datetime
import os

user_auth_bp = Blueprint('user_auth', __name__)

@user_auth_bp.route('/api/user/signup', methods=['POST'])
def signup():
    data = request.json
    name     = data.get('name')
    email    = data.get('email')
    password = data.get('password')
    phone    = data.get('phone')

    if not name or not phone or not password or not email:
        return jsonify({"error": "Name, email, phone number, and password are required"}), 400

    hashed_pw = generate_password_hash(password)
    db = get_db()

    if db.users.find_one({"phone": phone}):
        return jsonify({"error": "Phone number already registered"}), 409
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Account already exists"}), 409

    user_id = get_next_id(db, "users")
    db.users.insert_one({
        "_id": user_id,
        "user_id": user_id,
        "name": name,
        "email": email,
        "password": hashed_pw,
        "phone": phone,
        "created_at": datetime.now().strftime("%Y-%m-%d %I:%M %p")
    })

    session['user_id']   = user_id
    session['user_role'] = 'customer'
    session.permanent    = True

    return jsonify({
        "message": "Signup successful",
        "user": {"id": user_id, "name": name, "email": email, "phone": phone}
    }), 201


@user_auth_bp.route('/api/user/login', methods=['POST'])
def login():
    data     = request.json
    phone    = data.get('phone')
    password = data.get('password')

    if not phone or not password:
        return jsonify({"error": "Phone number and password are required"}), 400

    db = get_db()
    user = db.users.find_one({"phone": phone})

    if user and check_password_hash(user['password'], password):
        session['user_id']   = user['_id']
        session['user_role'] = 'customer'
        session.permanent    = True
        return jsonify({
            "message": "Login successful",
            "user": {
                "id":          user['_id'],
                "name":        user.get('name'),
                "email":       user.get('email'),
                "phone":       user.get('phone'),
                "profile_pic": user.get('profile_pic')
            }
        }), 200

    return jsonify({"error": "Invalid phone number or password"}), 401


@user_auth_bp.route('/api/user/me', methods=['GET'])
def get_me():
    if not session.get('user_id') or session.get('user_role') != 'customer':
        return jsonify({"error": "Not logged in"}), 401

    db = get_db()
    user = db.users.find_one({"_id": session['user_id']})

    if user:
        u_dict = {
            "user_id": user["_id"],
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "profile_pic": user.get("profile_pic")
        }
        return jsonify({"user": u_dict}), 200
        
    return jsonify({"error": "User not found"}), 404


@user_auth_bp.route('/api/user/logout', methods=['POST'])
def logout():
    session.pop('user_id',   None)
    session.pop('user_role', None)
    return jsonify({"message": "Logged out"}), 200


# ── Profile endpoints ──────────────────────────────────────────────────────────

@user_auth_bp.route('/api/user/profile', methods=['GET'])
def get_profile():
    if not session.get('user_id') or session.get('user_role') != 'customer':
        return jsonify({"error": "Unauthorized"}), 401

    db = get_db()
    user = db.users.find_one({"_id": session['user_id']})

    if user:
        u_dict = {
            "user_id": user["_id"],
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "profile_pic": user.get("profile_pic")
        }
        return jsonify({"user": u_dict}), 200
        
    return jsonify({"error": "User not found"}), 404


@user_auth_bp.route('/api/user/profile', methods=['POST'])
def update_profile():
    if not session.get('user_id') or session.get('user_role') != 'customer':
        return jsonify({"error": "Unauthorized"}), 401

    action           = request.form.get('action')
    current_password = request.form.get('current_password', '')
    user_id          = session['user_id']

    db = get_db()
    user = db.users.find_one({"_id": user_id})

    if not user:
        return jsonify({"error": "User not found"}), 404

    # ── Verify current password for all profile actions ──────────────────────
    if not check_password_hash(user['password'], current_password):
        return jsonify({"error": "Incorrect current password. Changes were not saved."}), 400

    if action == 'update_profile':
        new_name  = request.form.get('name', '').strip()
        new_phone = request.form.get('phone', '').strip()
        new_email = request.form.get('email', '').strip()
        pic_path  = None

        # Handle profile pic upload
        file = request.files.get('profile_pic')
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(
                f"user_{user_id}_{datetime.now().strftime('%H%M%S')}_{file.filename}"
            )
            file.save(os.path.join(current_app.config['PROFILE_PIC_FOLDER'], filename))
            pic_path = f"profile_pics/{filename}"

        if db.users.find_one({"email": new_email, "_id": {"$ne": user_id}}):
            return jsonify({"error": "That email address is already taken."}), 409
        if db.users.find_one({"phone": new_phone, "_id": {"$ne": user_id}}):
            return jsonify({"error": "That phone number is already taken."}), 409

        update_data = {"name": new_name, "phone": new_phone, "email": new_email}
        if pic_path:
            update_data["profile_pic"] = pic_path

        db.users.update_one({"_id": user_id}, {"$set": update_data})
        return jsonify({"status": "success", "message": "Profile updated successfully!"}), 200

    elif action == 'change_password':
        new_password     = request.form.get('new_password', '')
        confirm_password = request.form.get('confirm_password', '')

        if new_password != confirm_password:
            return jsonify({"error": "New passwords do not match."}), 400

        if not new_password:
            return jsonify({"error": "New password cannot be empty."}), 400

        db.users.update_one({"_id": user_id}, {"$set": {"password": generate_password_hash(new_password)}})
        return jsonify({"status": "success", "message": "Password changed successfully!"}), 200

    return jsonify({"error": "Invalid action"}), 400