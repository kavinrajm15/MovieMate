import json
from pymongo import MongoClient
import os
from pathlib import Path
from datetime import datetime, timedelta

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "moviemate"
POSTER_FOLDER = os.path.join("static", "posters")

TODAY = datetime.now().strftime("%Y%m%d")
CUTOFF_DATE = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")

JSON_FILES = [
    "tamilnadu_bms.json",
    "tamilnadu_ticketnew.json"
]

def init_db():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    db.movies.create_index("title", unique=True)
    db.theatres.create_index([("name", 1), ("city", 1)], unique=True)
    db.showtimes.create_index([("movie_id", 1), ("theatre_id", 1), ("show_time", 1), ("format", 1), ("date", 1)], unique=True)
    return db

from pymongo import ReturnDocument

def get_next_id(db, name):
    ret = db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return ret["seq"]


import re

def normalize_title(title):
    t = title.lower()
    # Replace common isolated Roman numerals
    t = re.sub(r'\bii\b', '2', t)
    t = re.sub(r'\biii\b', '3', t)
    t = re.sub(r'\biv\b', '4', t)
    t = re.sub(r'\bv\b', '5', t)
    # Remove all spaces and punctuation
    t = re.sub(r'[^a-z0-9]', '', t)
    return t

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def upsert_movie(db, m):
    title = m["title"].strip()
    norm_title = normalize_title(title)

    update_data = {
        "image": m.get("image"),
        "duration": m.get("details", {}).get("duration"),
        "genres": ",".join(m.get("details", {}).get("genres", [])),
        "certificate": m.get("details", {}).get("certificate"),
        "normalized_title": norm_title
    }

    # Better Check: Search using the exact normalized match
    movie = db.movies.find_one({"normalized_title": norm_title})
    
    # Fallback to exact title just in case it's an old unnormalized record
    if not movie:
        movie = db.movies.find_one({"title": title})
    if not movie:
        new_id = get_next_id(db, "movies")
        update_data["_id"] = new_id
        update_data["title"] = title
        db.movies.insert_one(update_data)
        return new_id, title
    else:
        db.movies.update_one({"_id": movie["_id"]}, {"$set": update_data})
        return movie["_id"], title

def upsert_theatre(db, name, city):
    name = name.strip()
    city = city.lower().strip()

    theatre = db.theatres.find_one({"name": name, "city": city})
    if not theatre:
        new_id = get_next_id(db, "theatres")
        db.theatres.insert_one({"_id": new_id, "name": name, "city": city})
        return new_id
    else:
        return theatre["_id"]

def merge_json(db, data):
    for city, city_data in data.get("cities", {}).items():
        city = city.lower().strip()

        for movie in city_data.get("movies", []):
            
            has_valid_dates = False
            for theatre in movie.get("theatres", []):
                for show_date in theatre.get("dates", {}).keys():
                    if show_date >= CUTOFF_DATE:
                        has_valid_dates = True
                        break
                if has_valid_dates:
                    break
            
            if not has_valid_dates:
                continue

            movie_id, title = upsert_movie(db, movie)

            for theatre in movie.get("theatres", []):
                theatre_id = upsert_theatre(db, theatre["name"], city)

                for show_date, show_list in theatre.get("dates", {}).items():
                    if show_date < CUTOFF_DATE:
                        continue
                    
                    for st in show_list:
                        existing_st = db.showtimes.find_one({
                            "movie_id": movie_id,
                            "theatre_id": theatre_id,
                            "show_time": st["time"],
                            "format": st.get("format", "2D"),
                            "date": show_date
                        })
                        if not existing_st:
                            new_id = get_next_id(db, "showtimes")
                            db.showtimes.insert_one({
                                "_id": new_id,
                                "movie_id": movie_id,
                                "theatre_id": theatre_id,
                                "show_time": st["time"],
                                "format": st.get("format", "2D"),
                                "date": show_date
                            })

def remove_expired_showtimes(db):
    print(f"Deleting showtimes older than 7 days ({CUTOFF_DATE}) from database...")
    result = db.showtimes.delete_many({"date": {"$lt": CUTOFF_DATE}})
    print(f"Removed {result.deleted_count} expired showtimes.")

def remove_old_movies(db):
    print("Checking for orphaned movies (no showtimes left in last 7 days)...")

    active_movie_ids = db.showtimes.distinct("movie_id")
    orphaned_movies = db.movies.find({"_id": {"$nin": active_movie_ids}})
    
    for movie in orphaned_movies:
        print("Removing fully expired movie (inactive for >7 days):", movie.get("title"))
        db.movies.delete_one({"_id": movie["_id"]})

def cleanup_unused_images(db):
    print("Cleaning unused images...")

    if not os.path.exists(POSTER_FOLDER):
        return

    used_images = set()
    for movie in db.movies.find({}, {"image": 1}):
        if movie.get("image"):
            used_images.add(os.path.basename(movie["image"]))

    for filename in os.listdir(POSTER_FOLDER):
        path = os.path.join(POSTER_FOLDER, filename)

        if os.path.isfile(path) and filename not in used_images:
            os.remove(path)
            print("Deleted unused image:", filename)

    print("Image cleanup complete.")

if __name__ == "__main__":
    print("Updating MongoDB incrementally...")

    db = init_db()
    
    remove_expired_showtimes(db)
    
    for jf in JSON_FILES:
        if Path(jf).exists():
            print(f"Merging {jf}")
            merge_json(db, load_json(jf))
        else:
            print(f"Missing file: {jf}")
    remove_old_movies(db)
    cleanup_unused_images(db)

    print("Database update complete.")