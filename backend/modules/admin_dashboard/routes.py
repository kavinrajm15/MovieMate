from flask import Blueprint, jsonify, session, request
from core.database import get_db
from core.security import check_perm
from datetime import datetime, timedelta
from collections import defaultdict

admin_dashboard_bp = Blueprint('admin_dashboard', __name__)


def _build_date_filter(time_filter, custom_date):
    """Return a MongoDB date filter dict.

    Works on both the ``showtimes`` collection and the ``bookings`` collection
    because both store the show date in a ``date`` field (YYYYMMDD string).
    """
    if custom_date:
        return {"date": custom_date}
    if time_filter == "today":
        return {"date": datetime.now().strftime("%Y%m%d")}
    if time_filter == "week":
        return {"date": {"$gte": (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")}}
    if time_filter == "month":
        return {"date": {"$gte": (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")}}
    if time_filter == "year":
        return {"date": {"$gte": (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")}}
    return {}


def _get_movie_id(booking, showtime_map):
    """Return movie_id from booking snapshot, falling back to showtime_map."""
    return (booking.get("movie_id") or
            showtime_map.get(booking.get("showtime_id"), {}).get("movie_id"))


def _get_show_time(booking, showtime_map):
    """Return show_time from booking snapshot, falling back to showtime_map."""
    return (booking.get("show_time") or
            showtime_map.get(booking.get("showtime_id"), {}).get("show_time", ""))


def _get_date(booking, showtime_map):
    """Return date (YYYYMMDD) from booking snapshot, falling back to showtime_map."""
    return (booking.get("date") or
            showtime_map.get(booking.get("showtime_id"), {}).get("date", ""))


def _build_chart_data(bookings, showtime_map, movie_titles, group_by_time=False):
    """Aggregate bookings into chart-friendly period -> movie sales data.

    Reads period/movie_id from each booking's own snapshot fields first, then
    falls back to showtime_map for older bookings that pre-date the snapshot.
    """
    period_map = {}
    for b in bookings:
        m_id = _get_movie_id(b, showtime_map)
        if m_id not in movie_titles:
            continue
        if group_by_time:
            period = _get_show_time(b, showtime_map)
        else:
            raw = _get_date(b, showtime_map)
            try:
                period = datetime.strptime(raw, "%Y%m%d").strftime("%d %b")
            except Exception:
                period = raw
        if period not in period_map:
            period_map[period] = {"period": period}
        title = movie_titles[m_id]
        period_map[period][title] = period_map[period].get(title, 0) + 1

    for entry in period_map.values():
        for title in movie_titles.values():
            if title not in entry:
                entry[title] = 0

    def sort_key(entry):
        p = entry.get("period", "")
        if not group_by_time:
            try:
                return datetime.strptime(p.strip(), "%d %b")
            except Exception:
                return p
        for fmt in ("%I:%M %p", "%I %p", "%H:%M"):
            try:
                t = datetime.strptime(p.strip().upper(), fmt)
                return t.hour * 60 + t.minute
            except Exception:
                pass
        return p

    return sorted(period_map.values(), key=sort_key)


def _fetch_bookings_with_fallback(db, b_query, theatre_id=None, live_st_filter=None):
    """Fetch confirmed bookings using a booking-first + showtime-fallback strategy.

    The bookings collection is NEVER touched by merge.py, so querying it
    directly (via snapshot fields date/movie_id/theatre_id stored at
    confirm time) gives complete historical data.  For older bookings that
    pre-date the snapshot fix, we fall back to matching via showtime_id
    against live showtimes that are still in the DB.

    Returns (bookings, showtime_map).
    """
    # Load live showtimes for fallback and chart lookups
    showtime_map = {}
    live_st_ids  = []
    if live_st_filter is not None:
        live_docs    = list(db.showtimes.find(live_st_filter))
        live_st_ids  = [s["_id"] for s in live_docs]
        showtime_map = {s["_id"]: s for s in live_docs}

    # Combine snapshot filter with showtime fallback
    final_query = dict(b_query)
    if live_st_ids or theatre_id is not None:
        or_clauses = []
        if theatre_id is not None:
            or_clauses.append({"theatre_id": theatre_id})
        if live_st_ids:
            or_clauses.append({"showtime_id": {"$in": live_st_ids}})
        if or_clauses:
            final_query["$or"] = or_clauses

    raw = list(db.bookings.find(final_query))

    # Deduplicate
    seen, bookings = set(), []
    for b in raw:
        if b["_id"] not in seen:
            seen.add(b["_id"])
            bookings.append(b)

    # Populate showtime_map for remaining live showtimes
    extra_ids = [b["showtime_id"] for b in bookings
                 if b.get("showtime_id") and b["showtime_id"] not in showtime_map]
    if extra_ids:
        for s in db.showtimes.find({"_id": {"$in": extra_ids}}):
            showtime_map[s["_id"]] = s

    return bookings, showtime_map


# ---------------------------------------------------------------------------

@admin_dashboard_bp.route("/admin/dashboard")
def admin_dashboard():
    if not session.get("admin") or session.get("role") == "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401

    role          = session.get("role")
    is_superadmin = role == "superadmin"
    has_view      = is_superadmin or check_perm("dashboard", "view")

    db            = get_db()
    current_today = datetime.now().strftime("%Y%m%d")
    resp          = {"status": "success", "role": role}

    if has_view or check_perm("dashboard", "total_movies"):
        resp["total_movies"] = db.movies.count_documents({})

    if has_view or check_perm("dashboard", "total_theatres"):
        resp["total_theatres"] = db.theatres.count_documents({})
        resp["total_cities"]   = len(db.theatres.distinct("city"))

    if has_view or check_perm("dashboard", "top_cities"):
        today_st_ids = db.showtimes.distinct("theatre_id", {"date": current_today})
        pipeline = [
            {"$match": {"_id": {"$in": today_st_ids}}},
            {"$group": {"_id": "$city", "theatres": {"$addToSet": "$_id"}}},
        ]
        city_theatre_map = {r["_id"]: r["theatres"] for r in db.theatres.aggregate(pipeline)}
        top_cities = []
        for city, t_ids in city_theatre_map.items():
            m_ids = db.showtimes.distinct("movie_id", {"theatre_id": {"$in": t_ids}, "date": current_today})
            top_cities.append({"city": city, "movie_count": len(m_ids)})
        top_cities.sort(key=lambda x: x["movie_count"], reverse=True)
        resp["top_cities"] = top_cities[:5]

    if has_view or check_perm("dashboard", "top_showtimes"):
        pipeline = [
            {"$group": {"_id": "$show_time", "count": {"$sum": 1}}},
            {"$sort":  {"count": -1}},
            {"$limit": 4},
        ]
        resp["top_showtimes"] = [
            {"show_time": r["_id"], "count": r["count"]}
            for r in db.showtimes.aggregate(pipeline)
        ]

    return jsonify(resp)


@admin_dashboard_bp.route("/admin/theatre-dashboard")
def theatre_admin_dashboard():
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401

    theatre_id  = session.get("theatre_id")
    time_filter = request.args.get("time_filter", "all")
    custom_date = request.args.get("date")
    movie_id_f  = request.args.get("movie_id")

    try:
        db = get_db()

        # -- Booking query (snapshot-first) ----------------------------------
        # bookings.date is stored at confirm time so we can filter historically.
        b_query = {"status": "confirmed"}
        b_query.update(_build_date_filter(time_filter, custom_date))
        if movie_id_f and movie_id_f != "all":
            b_query["movie_id"] = int(movie_id_f)

        # Live showtime filter for fallback (older bookings without snapshots)
        live_st_filter = {"theatre_id": theatre_id}
        live_st_filter.update(_build_date_filter(time_filter, custom_date))
        if movie_id_f and movie_id_f != "all":
            live_st_filter["movie_id"] = int(movie_id_f)

        bookings, showtime_map = _fetch_bookings_with_fallback(
            db, b_query,
            theatre_id=theatre_id,
            live_st_filter=live_st_filter,
        )

        total_tickets = len(bookings)
        total_income  = sum(b.get("price_paid", 0) for b in bookings)

        # -- Top movies by ticket sales ---------------------------------------
        movie_sales = {}
        for b in bookings:
            m_id = _get_movie_id(b, showtime_map)
            if m_id:
                movie_sales[m_id] = movie_sales.get(m_id, 0) + 1

        sorted_movies = sorted(movie_sales.items(), key=lambda x: x[1], reverse=True)[:4]
        top_movie_ids = [m[0] for m in sorted_movies]
        movies_docs   = {m["_id"]: m for m in db.movies.find({"_id": {"$in": top_movie_ids}})}
        movie_titles  = {m_id: movies_docs[m_id]["title"]
                         for m_id in top_movie_ids if m_id in movies_docs}

        group_by_time = (time_filter == "today" or bool(custom_date))
        chart_data    = _build_chart_data(bookings, showtime_map, movie_titles, group_by_time)

        # -- Recent transactions (last 10) ------------------------------------
        tx_groups = defaultdict(list)
        for b in bookings:
            key = (b.get("user_id"), b.get("showtime_id"), b.get("booked_at", "")[:16])
            tx_groups[key].append(b)

        recent_tx = []
        for (user_id, st_id, booked_at), group in sorted(
                tx_groups.items(), key=lambda x: x[0][2], reverse=True)[:10]:

            b0           = group[0]
            m_title      = (b0.get("title") or
                            movies_docs.get(_get_movie_id(b0, showtime_map), {}).get("title", ""))
            show_date    = _get_date(b0, showtime_map)
            show_time_v  = _get_show_time(b0, showtime_map)
            user         = db.users.find_one({"_id": user_id})
            seat_docs    = [db.theatre_seats.find_one({"_id": b.get("seat_id")}) for b in group]
            seats_str    = ", ".join(
                f"{s.get('row_name','')}{s.get('col_num','')}" for s in seat_docs if s)

            recent_tx.append({
                "booked_at":   booked_at,
                "status":      "confirmed",
                "title":       m_title,
                "show_date":   show_date,
                "show_time":   show_time_v,
                "seat_count":  len(group),
                "seats":       seats_str,
                "total_price": sum(b.get("price_paid", 0) for b in group),
                "user_name":   user.get("name", "") if user else "",
            })

        # -- Available movies dropdown ----------------------------------------
        live_m_ids  = db.showtimes.distinct("movie_id", {"theatre_id": theatre_id})
        hist_m_ids  = [mid for mid in
                       db.bookings.distinct("movie_id", {"theatre_id": theatre_id, "status": "confirmed"})
                       if mid is not None]
        all_m_ids   = list(set(live_m_ids) | set(hist_m_ids))
        movies_list = list(db.movies.find({"_id": {"$in": all_m_ids}}, {"title": 1}))
        for m in movies_list:
            m["movie_id"] = m["_id"]

        return jsonify({
            "status":              "success",
            "total_income":        total_income,
            "total_tickets":       total_tickets,
            "chart_data":          chart_data,
            "top_movie_titles":    list(movie_titles.values()),
            "recent_transactions": recent_tx,
            "available_movies":    movies_list,
        })

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@admin_dashboard_bp.route("/admin/staff-sales-dashboard")
def staff_sales_dashboard():
    if not session.get("admin") or session.get("role") == "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401

    role          = session.get("role")
    is_superadmin = role == "superadmin"

    has_income       = is_superadmin or check_perm("dashboard", "total_income")
    has_count        = is_superadmin or check_perm("dashboard", "ticket_sales_count")
    has_graph        = is_superadmin or check_perm("dashboard", "ticket_sales_graph")
    has_transactions = is_superadmin or check_perm("dashboard", "transactions")

    if not any([has_income, has_count, has_graph, has_transactions]):
        return jsonify({"status": "no_access"}), 200

    time_filter  = request.args.get("time_filter", "all")
    custom_date  = request.args.get("date")
    movie_id_f   = request.args.get("movie_id")
    theatre_id_f = request.args.get("theatre_id")

    try:
        db = get_db()

        # -- Booking query (snapshot-first) -----------------------------------
        b_query = {"status": "confirmed"}
        b_query.update(_build_date_filter(time_filter, custom_date))
        if movie_id_f and movie_id_f != "all":
            b_query["movie_id"] = int(movie_id_f)

        # Live showtime filter for fallback
        live_st_filter = {}
        live_st_filter.update(_build_date_filter(time_filter, custom_date))
        if movie_id_f and movie_id_f != "all":
            live_st_filter["movie_id"] = int(movie_id_f)

        t_id_int = None
        if theatre_id_f and theatre_id_f != "all":
            t_id_int = int(theatre_id_f)
            live_st_filter["theatre_id"] = t_id_int

        bookings, showtime_map = _fetch_bookings_with_fallback(
            db, b_query,
            theatre_id=t_id_int,
            live_st_filter=live_st_filter,
        )

        # -- Build response ---------------------------------------------------
        resp = {
            "status": "success",
            "permissions": {
                "total_income":       has_income,
                "ticket_sales_count": has_count,
                "ticket_sales_graph": has_graph,
                "transactions":       has_transactions,
            },
        }

        if has_income:
            resp["total_income"]  = sum(b.get("price_paid", 0) for b in bookings)
        if has_count:
            resp["total_tickets"] = len(bookings)

        if has_graph:
            movie_sales = {}
            for b in bookings:
                m_id = _get_movie_id(b, showtime_map)
                if m_id:
                    movie_sales[m_id] = movie_sales.get(m_id, 0) + 1

            sorted_movies = sorted(movie_sales.items(), key=lambda x: x[1], reverse=True)[:4]
            top_movie_ids = [m[0] for m in sorted_movies]
            movies_docs   = {m["_id"]: m for m in db.movies.find({"_id": {"$in": top_movie_ids}})}
            movie_titles  = {m_id: movies_docs[m_id]["title"]
                             for m_id in top_movie_ids if m_id in movies_docs}

            group_by_time          = (time_filter == "today" or bool(custom_date))
            resp["chart_data"]       = _build_chart_data(bookings, showtime_map, movie_titles, group_by_time)
            resp["top_movie_titles"] = list(movie_titles.values())

        if has_transactions:
            all_movies_docs   = {m["_id"]: m for m in db.movies.find({})}
            all_theatres_docs = {t["_id"]: t for t in db.theatres.find({})}

            tx_groups = defaultdict(list)
            for b in bookings:
                key = (b.get("user_id"), b.get("showtime_id"), b.get("booked_at", "")[:16])
                tx_groups[key].append(b)

            recent_tx = []
            for (user_id, st_id, booked_at), group in sorted(
                    tx_groups.items(), key=lambda x: x[0][2], reverse=True)[:10]:

                b0           = group[0]
                st           = showtime_map.get(st_id, {})
                m_id         = _get_movie_id(b0, showtime_map)
                m            = all_movies_docs.get(m_id, {})
                m_title      = b0.get("title") or m.get("title", "")
                show_date    = _get_date(b0, showtime_map)
                show_time_v  = _get_show_time(b0, showtime_map)
                t_id         = b0.get("theatre_id") or st.get("theatre_id")
                theatre      = all_theatres_docs.get(t_id, {})
                theatre_name = b0.get("theatre_name") or theatre.get("name", "")
                user         = db.users.find_one({"_id": user_id})
                seat_docs    = [db.theatre_seats.find_one({"_id": b.get("seat_id")}) for b in group]
                seats_str    = ", ".join(
                    f"{s.get('row_name','')}{s.get('col_num','')}" for s in seat_docs if s)

                recent_tx.append({
                    "booked_at":    booked_at,
                    "status":       "confirmed",
                    "title":        m_title,
                    "show_date":    show_date,
                    "show_time":    show_time_v,
                    "theatre_name": theatre_name,
                    "seat_count":   len(group),
                    "seats":        seats_str,
                    "total_price":  sum(b.get("price_paid", 0) for b in group),
                    "user_name":    user.get("name", "") if user else "",
                })
            resp["recent_transactions"] = recent_tx

        # -- Filter dropdowns -------------------------------------------------
        live_m_ids = db.showtimes.distinct("movie_id")
        hist_m_ids = [mid for mid in
                      db.bookings.distinct("movie_id", {"status": "confirmed"})
                      if mid is not None]
        all_m_ids  = list(set(live_m_ids) | set(hist_m_ids))
        resp["available_movies"] = [
            {"movie_id": m["_id"], "title": m.get("title")}
            for m in db.movies.find({"_id": {"$in": all_m_ids}}).sort("title", 1)
        ]
        resp["available_theatres"] = [
            {"theatre_id": t["_id"], "name": t.get("name"), "city": t.get("city")}
            for t in db.theatres.find().sort("name", 1)
        ]

        return jsonify(resp)

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500