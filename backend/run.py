from core import create_app
from models.tables import setup_tables

# Initialize the database tables before starting
setup_tables()

# Create the Flask app
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)