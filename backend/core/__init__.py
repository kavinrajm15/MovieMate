from flask import Flask
from flask_cors import CORS
from datetime import timedelta
import os
from decouple import config

def create_app():
    CORE_DIR    = os.path.dirname(os.path.abspath(__file__))
    BACKEND_DIR = os.path.dirname(CORE_DIR)
    ROOT_DIR    = os.path.dirname(BACKEND_DIR)

    STATIC_DIR = os.path.join(ROOT_DIR, 'static')

    app = Flask(__name__, static_folder=STATIC_DIR)
    app.secret_key = config("SECRET_KEY")
    app.config["UPLOAD_FOLDER"]      = os.path.join(STATIC_DIR, "posters")
    app.config["PROFILE_PIC_FOLDER"] = os.path.join(STATIC_DIR, "profile_pics")

    app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=30)

    origins = config("CORS_ORIGINS").split(",")
    CORS(app, supports_credentials=True, origins=origins)
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        SESSION_COOKIE_SECURE=False,
        SESSION_PERMANENT=True,
    )


    from modules.public.routes       import public_bp
    from modules.auth.routes         import auth_bp
    from modules.admin_dashboard.routes import admin_dashboard_bp
    from modules.cities.routes       import cities_bp
    from modules.movies.routes       import movies_bp
    from modules.notifications.routes import notifications_bp
    from modules.partners.routes     import partners_bp
    from modules.requests.routes     import requests_bp
    from modules.showtimes.routes    import showtimes_bp
    from modules.staff.routes        import staff_bp
    from modules.theatres.routes     import theatres_bp
    from modules.permissions.routes  import permissions_bp 
    from modules.seats.routes        import seats_bp  
    from modules.user.auth_routes    import user_auth_bp

    app.register_blueprint(public_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_dashboard_bp)
    app.register_blueprint(cities_bp)
    app.register_blueprint(movies_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(partners_bp)
    app.register_blueprint(requests_bp)
    app.register_blueprint(showtimes_bp)
    app.register_blueprint(staff_bp)
    app.register_blueprint(theatres_bp)
    app.register_blueprint(permissions_bp)
    app.register_blueprint(seats_bp)          
    app.register_blueprint(user_auth_bp)       

    return app