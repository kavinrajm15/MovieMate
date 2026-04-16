from core.database import get_db, get_next_id

def get_home_movies(date, limit=10):
    db = get_db()
    active_movie_ids = db.showtimes.distinct("movie_id", {"date": date})
    movies = list(db.movies.find({"_id": {"$in": active_movie_ids}}).sort("title", 1).limit(limit))
    return movies

def get_movies_by_city(city, date, limit=12, offset=0):
    db = get_db()
    theatre_ids = db.theatres.distinct("_id", {"city": city})
    active_movie_ids = db.showtimes.distinct("movie_id", {"theatre_id": {"$in": theatre_ids}, "date": date})
    movies = list(db.movies.find({"_id": {"$in": active_movie_ids}}).sort("title", 1).skip(offset).limit(limit))
    return movies

def search_movies(query):
    db = get_db()
    return list(db.movies.find({"title": {"$regex": query, "$options": "i"}}))

def get_all_movies():
    db = get_db()
    return list(db.movies.find().sort("title", 1))

def get_movie_by_id(movie_id):
    db = get_db()
    return db.movies.find_one({"_id": movie_id})

def add_movie(title, image_path, duration, genres, certificate):
    db = get_db()
    new_id = get_next_id(db, "movies")
    db.movies.insert_one({
        "_id": new_id,
        "movie_id": new_id,
        "title": title,
        "image": image_path,
        "duration": duration,
        "genres": genres,
        "certificate": certificate
    })

def update_movie(movie_id, title, duration, genres, certificate, image_path=None):
    db = get_db()
    update_data = {
        "title": title,
        "duration": duration,
        "genres": genres,
        "certificate": certificate
    }
    if image_path:
        update_data["image"] = image_path
    db.movies.update_one({"_id": movie_id}, {"$set": update_data})

def delete_movie(movie_id):
    db = get_db()
    db.showtimes.delete_many({"movie_id": movie_id})
    db.movies.delete_one({"_id": movie_id})