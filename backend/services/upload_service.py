import os
from werkzeug.utils import secure_filename
from datetime import datetime

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
UPLOAD_FOLDER = os.path.join("static", "posters")
PROFILE_PIC_FOLDER = os.path.join("static", "profile_pics")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROFILE_PIC_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_profile_pic(file):
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(f"user_{datetime.now().strftime('%H%M%S')}_{file.filename}")
        file.save(os.path.join(PROFILE_PIC_FOLDER, filename))
        return f"profile_pics/{filename}"
    return None

def save_poster(file):
    if file and file.filename and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        return f"posters/{filename}"
    return None