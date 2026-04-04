from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from services.upload_service import allowed_file
from core.database import get_db
from datetime import datetime
import sqlite3
import os

user_auth_bp = Blueprint('user_auth', __name__)


@user_auth_bp.route('/api/user/signup', methods=['POST'])
def signup():
    data = request.json
    name     = data.get('name')
    email    = data.get('email')
    password = data.get('password')
    phone    = data.get('phone')

    if not name or not phone or not password:
        return jsonify({"error": "Name, phone number, and password are required"}), 400

    hashed_pw = generate_password_hash(password)
    conn = get_db()

    try:
        cursor = conn.execute(
            "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)",
            (name, email, hashed_pw, phone)
        )
        conn.commit()
        user_id = cursor.lastrowid

        session['user_id']   = user_id
        session['user_role'] = 'customer'
        session.permanent    = True   # persist across browser restarts

        return jsonify({
            "message": "Signup successful",
            "user": {"id": user_id, "name": name, "email": email, "phone": phone}
        }), 201

    except sqlite3.IntegrityError as e:
        if 'phone' in str(e):
            return jsonify({"error": "Phone number already registered"}), 409
        return jsonify({"error": "Account already exists"}), 409
    finally:
        conn.close()


@user_auth_bp.route('/api/user/login', methods=['POST'])
def login():
    data     = request.json
    phone    = data.get('phone')
    password = data.get('password')

    if not phone or not password:
        return jsonify({"error": "Phone number and password are required"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
    conn.close()

    if user and check_password_hash(user['password'], password):
        session['user_id']   = user['user_id']
        session['user_role'] = 'customer'
        session.permanent    = True   # persist across browser restarts
        return jsonify({
            "message": "Login successful",
            "user": {
                "id":          user['user_id'],
                "name":        user['name'],
                "email":       user['email'],
                "phone":       user['phone'],
                "profile_pic": user['profile_pic'] if user['profile_pic'] else None,
            }
        }), 200

    return jsonify({"error": "Invalid phone number or password"}), 401


@user_auth_bp.route('/api/user/me', methods=['GET'])
def get_me():
    if not session.get('user_id') or session.get('user_role') != 'customer':
        return jsonify({"error": "Not logged in"}), 401

    conn = get_db()
    user = conn.execute(
        "SELECT user_id, name, email, phone, profile_pic FROM users WHERE user_id = ?",
        (session['user_id'],)
    ).fetchone()
    conn.close()

    if user:
        return jsonify({"user": dict(user)}), 200
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

    conn = get_db()
    user = conn.execute(
        "SELECT user_id, name, email, phone, profile_pic FROM users WHERE user_id = ?",
        (session['user_id'],)
    ).fetchone()
    conn.close()

    if user:
        return jsonify({"user": dict(user)}), 200
    return jsonify({"error": "User not found"}), 404


@user_auth_bp.route('/api/user/profile', methods=['POST'])
def update_profile():
    if not session.get('user_id') or session.get('user_role') != 'customer':
        return jsonify({"error": "Unauthorized"}), 401

    action           = request.form.get('action')
    current_password = request.form.get('current_password', '')
    user_id          = session['user_id']

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    # ── Verify current password for all profile actions ──────────────────────
    if not check_password_hash(user['password'], current_password):
        conn.close()
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

        try:
            if pic_path:
                conn.execute(
                    "UPDATE users SET name=?, phone=?, email=?, profile_pic=? WHERE user_id=?",
                    (new_name, new_phone, new_email, pic_path, user_id)
                )
            else:
                conn.execute(
                    "UPDATE users SET name=?, phone=?, email=? WHERE user_id=?",
                    (new_name, new_phone, new_email, user_id)
                )
            conn.commit()
            conn.close()
            return jsonify({"status": "success", "message": "Profile updated successfully!"}), 200

        except sqlite3.IntegrityError as e:
            conn.close()
            error_str = str(e).lower()
            if 'email' in error_str:
                return jsonify({"error": "That email address is already taken."}), 409
            return jsonify({"error": "That phone number is already taken."}), 409

    elif action == 'change_password':
        new_password     = request.form.get('new_password', '')
        confirm_password = request.form.get('confirm_password', '')

        if new_password != confirm_password:
            conn.close()
            return jsonify({"error": "New passwords do not match."}), 400

        if not new_password:
            conn.close()
            return jsonify({"error": "New password cannot be empty."}), 400

        conn.execute(
            "UPDATE users SET password=? WHERE user_id=?",
            (generate_password_hash(new_password), user_id)
        )
        conn.commit()
        conn.close()
        return jsonify({"status": "success", "message": "Password changed successfully!"}), 200

    conn.close()
    return jsonify({"error": "Invalid action"}), 400