import os
from pymongo import MongoClient, ReturnDocument

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "moviemate"

_client = None

def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client[DB_NAME]

def get_next_id(db, collection_name):
    ret = db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    return ret["seq"]