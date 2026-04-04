from flask import Blueprint, jsonify, session, request
from core.database import get_db
from core.security import check_perm
from datetime import datetime

admin_dashboard_bp = Blueprint('admin_dashboard', __name__)

@admin_dashboard_bp.route("/admin/dashboard")
def admin_dashboard():
    if not session.get("admin") or session.get("role") == "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401

    role = session.get("role")
    is_superadmin = role == "superadmin"

    conn = get_db()
    current_today = datetime.now().strftime("%Y%m%d")
    resp = {"status": "success", "role": role}

    # dashboard.view = general allow; granular keys are fine-grained overrides
    has_view = is_superadmin or check_perm("dashboard", "view")

    if has_view or check_perm("dashboard", "total_movies"):
        resp["total_movies"] = conn.execute("SELECT COUNT(*) FROM movies").fetchone()[0]

    if has_view or check_perm("dashboard", "total_theatres"):
        resp["total_theatres"] = conn.execute("SELECT COUNT(*) FROM theatres").fetchone()[0]
        # total_cities is shown as subtitle of the Theatres card — always bundled with it
        resp["total_cities"] = conn.execute("SELECT COUNT(DISTINCT city) FROM theatres").fetchone()[0]

    if has_view or check_perm("dashboard", "top_cities"):
        top_cities = conn.execute("""
            SELECT t.city, COUNT(DISTINCT m.movie_id) as movie_count
            FROM theatres t JOIN showtimes s ON t.theatre_id = s.theatre_id
            JOIN movies m ON s.movie_id = m.movie_id
            WHERE s.date = ? GROUP BY t.city ORDER BY movie_count DESC LIMIT 5
        """, (current_today,)).fetchall()
        resp["top_cities"] = [dict(r) for r in top_cities]

    if has_view or check_perm("dashboard", "top_showtimes"):
        top_showtimes = conn.execute(
            "SELECT show_time, COUNT(*) as count FROM showtimes GROUP BY show_time ORDER BY count DESC LIMIT 4"
        ).fetchall()
        resp["top_showtimes"] = [dict(r) for r in top_showtimes]

    conn.close()
    return jsonify(resp)

@admin_dashboard_bp.route("/admin/theatre-dashboard")
def theatre_admin_dashboard():
    if not session.get("admin") or session.get("role") != "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401

    theatre_id = session.get("theatre_id")
    time_filter = request.args.get("time_filter", "all")  # today, week, month, year, all
    custom_date = request.args.get("date") # YYYYMMDD
    movie_id = request.args.get("movie_id")

    try:
        from datetime import timedelta
        conn = get_db()
        
        where_clauses = ["s.theatre_id = ?"]
        params = [theatre_id]

        if custom_date:
            where_clauses.append("s.date = ?")
            params.append(custom_date)
        else:
            if time_filter == "today":
                today = datetime.now().strftime("%Y%m%d")
                where_clauses.append("s.date = ?")
                params.append(today)
            elif time_filter == "week":
                week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y%m%d")
                where_clauses.append("s.date >= ?")
                params.append(week_ago)
            elif time_filter == "month":
                month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y%m%d")
                where_clauses.append("s.date >= ?")
                params.append(month_ago)
            elif time_filter == "year":
                year_ago = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")
                where_clauses.append("s.date >= ?")
                params.append(year_ago)

        if movie_id and movie_id != "all":
            where_clauses.append("s.movie_id = ?")
            params.append(movie_id)

        base_where = " AND ".join(where_clauses)
        
        sql = f"""
            SELECT 
                COUNT(b.booking_id) as total_tickets,
                SUM(b.price_paid) as total_income
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.showtime_id
            JOIN theatre_seats ts ON b.seat_id = ts.seat_id
            WHERE b.status = 'confirmed' AND {base_where}
        """
        stats_row = conn.execute(sql, params).fetchone()
        total_tickets = stats_row["total_tickets"] if stats_row and stats_row["total_tickets"] else 0
        total_income = stats_row["total_income"] if stats_row and stats_row["total_income"] else 0


        group_col = "s.show_time" if time_filter == "today" or custom_date else "s.date"
        
        top_movies_sql = f"""
            SELECT m.movie_id, m.title, COUNT(b.booking_id) as sales
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.showtime_id
            JOIN movies m ON s.movie_id = m.movie_id
            WHERE b.status = 'confirmed' AND {base_where}
            GROUP BY m.movie_id
            ORDER BY sales DESC
            LIMIT 4
        """
        top_movies = conn.execute(top_movies_sql, params).fetchall()
        
        chart_data = []
        if top_movies:
            movie_ids = [m["movie_id"] for m in top_movies]
            movie_titles = {m["movie_id"]: m["title"] for m in top_movies}
            placeholders = ",".join("?" * len(movie_ids))
            
            agg_sql = f"""
                SELECT {group_col} as period, s.movie_id, COUNT(b.booking_id) as sales
                FROM bookings b
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                WHERE b.status = 'confirmed' 
                  AND s.movie_id IN ({placeholders})
                  AND {base_where}
                GROUP BY period, s.movie_id
                ORDER BY period ASC
            """
            agg_params = list(movie_ids) + list(params)
            agg_rows = conn.execute(agg_sql, agg_params).fetchall()
            
            period_map = {}
            for r in agg_rows:
                p = r["period"]
                if group_col == "s.date":
                    try:
                        p = datetime.strptime(p, "%Y%m%d").strftime("%d %b")
                    except:
                        pass
                if p not in period_map:
                    period_map[p] = {"period": p}
                m_title = movie_titles[r["movie_id"]]
                period_map[p][m_title] = r["sales"]
                
            def parse_showtime(entry):
                p = entry.get("period", "")
                # Sort date-grouped periods as real dates (DD Mon → date object)
                if group_col == "s.date":
                    try:
                        from datetime import datetime as _dt
                        return _dt.strptime(p.strip(), "%d %b")
                    except:
                        return p
                # Only sort by time when grouping by show_time (today / custom_date view)
                if group_col != "s.show_time":
                    return p
                try:
                    from datetime import datetime as _dt
                    for fmt in ("%I:%M %p", "%I %p", "%H:%M"):
                        try:
                            t = _dt.strptime(p.strip().upper(), fmt)
                            return t.hour * 60 + t.minute
                        except:
                            pass
                except:
                    pass
                return p

            all_periods = list(period_map.keys())
            all_titles = list(movie_titles.values())
            for period_entry in period_map.values():
                for title in all_titles:
                    if title not in period_entry:
                        period_entry[title] = 0

            chart_data = sorted(period_map.values(), key=parse_showtime)

        transactions_sql = f"""
            SELECT
                b.booked_at, b.status, m.title, s.date as show_date, s.show_time,
                COUNT(b.booking_id) as seat_count,
                GROUP_CONCAT(ts.row_name || ts.col_num, ', ') as seats,
                SUM(b.price_paid) as total_price,
                (SELECT u.name FROM users u WHERE u.user_id = b.user_id) as user_name
            FROM bookings b
            JOIN showtimes s ON b.showtime_id = s.showtime_id
            JOIN movies m ON s.movie_id = m.movie_id
            JOIN theatre_seats ts ON b.seat_id = ts.seat_id
            WHERE {base_where}
            GROUP BY b.user_id, b.showtime_id, b.booked_at
            ORDER BY b.booked_at DESC
            LIMIT 10
        """
        recent_tx = conn.execute(transactions_sql, params).fetchall()

        movies_list = conn.execute(
            "SELECT DISTINCT m.movie_id, m.title FROM showtimes s JOIN movies m ON s.movie_id = m.movie_id WHERE s.theatre_id = ?",
            (theatre_id,)
        ).fetchall()

        conn.close()

        return jsonify({
            "status": "success",
            "total_income": total_income,
            "total_tickets": total_tickets,
            "chart_data": chart_data,
            "top_movie_titles": [m["title"] for m in top_movies],
            "recent_transactions": [dict(t) for t in recent_tx],
            "available_movies": [dict(m) for m in movies_list]
        })
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@admin_dashboard_bp.route("/admin/staff-sales-dashboard")
def staff_sales_dashboard():
    if not session.get("admin") or session.get("role") == "theatre_admin":
        return jsonify({"error": "Unauthorized"}), 401

    role = session.get("role")
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
        from datetime import timedelta
        conn = get_db()

        where_clauses = []
        params = []

        if custom_date:
            where_clauses.append("s.date = ?")
            params.append(custom_date)
        else:
            if time_filter == "today":
                where_clauses.append("s.date = ?")
                params.append(datetime.now().strftime("%Y%m%d"))
            elif time_filter == "week":
                where_clauses.append("s.date >= ?")
                params.append((datetime.now() - timedelta(days=7)).strftime("%Y%m%d"))
            elif time_filter == "month":
                where_clauses.append("s.date >= ?")
                params.append((datetime.now() - timedelta(days=30)).strftime("%Y%m%d"))
            elif time_filter == "year":
                where_clauses.append("s.date >= ?")
                params.append((datetime.now() - timedelta(days=365)).strftime("%Y%m%d"))

        if movie_id_f and movie_id_f != "all":
            where_clauses.append("s.movie_id = ?")
            params.append(movie_id_f)

        if theatre_id_f and theatre_id_f != "all":
            where_clauses.append("s.theatre_id = ?")
            params.append(theatre_id_f)

        base_where = " AND ".join(where_clauses) if where_clauses else "1=1"

        resp = {
            "status": "success",
            "permissions": {
                "total_income": has_income,
                "ticket_sales_count": has_count,
                "ticket_sales_graph": has_graph,
                "transactions": has_transactions,
            }
        }

        if has_income or has_count:
            stats = conn.execute(f"""
                SELECT COUNT(b.booking_id) as total_tickets,
                    SUM(b.price_paid) as total_income
                FROM bookings b
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                WHERE b.status = 'confirmed' AND {base_where}
            """, params).fetchone()
            if has_income:
                resp["total_income"] = stats["total_income"] or 0
            if has_count:
                resp["total_tickets"] = stats["total_tickets"] or 0

        if has_graph:
            group_col = "s.show_time" if time_filter == "today" or custom_date else "s.date"

            top_movies = conn.execute(f"""
                SELECT m.movie_id, m.title, COUNT(b.booking_id) as sales
                FROM bookings b
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
                WHERE b.status = 'confirmed' AND {base_where}
                GROUP BY m.movie_id ORDER BY sales DESC LIMIT 4
            """, params).fetchall()

            chart_data = []
            if top_movies:
                movie_ids    = [m["movie_id"] for m in top_movies]
                movie_titles = {m["movie_id"]: m["title"] for m in top_movies}
                placeholders = ",".join("?" * len(movie_ids))
                agg_rows = conn.execute(f"""
                    SELECT {group_col} as period, s.movie_id, COUNT(b.booking_id) as sales
                    FROM bookings b JOIN showtimes s ON b.showtime_id = s.showtime_id
                    WHERE b.status = 'confirmed' AND s.movie_id IN ({placeholders}) AND {base_where}
                    GROUP BY period, s.movie_id ORDER BY period ASC
                """, list(movie_ids) + list(params)).fetchall()

                period_map = {}
                for r in agg_rows:
                    p = r["period"]
                    if group_col == "s.date":
                        try: p = datetime.strptime(p, "%Y%m%d").strftime("%d %b")
                        except: pass
                    if p not in period_map:
                        period_map[p] = {"period": p}
                    period_map[p][movie_titles[r["movie_id"]]] = r["sales"]

                for entry in period_map.values():
                    for title in movie_titles.values():
                        if title not in entry:
                            entry[title] = 0

                def parse_showtime_s(entry):
                    p = entry.get("period", "")
                    # Sort date-grouped periods as real dates (DD Mon → date object)
                    if group_col == "s.date":
                        try:
                            from datetime import datetime as _dt
                            return _dt.strptime(p.strip(), "%d %b")
                        except:
                            return p
                    if group_col != "s.show_time":
                        return p
                    try:
                        from datetime import datetime as _dt
                        for fmt in ("%I:%M %p", "%I %p", "%H:%M"):
                            try:
                                t = _dt.strptime(p.strip().upper(), fmt)
                                return t.hour * 60 + t.minute
                            except: pass
                    except: pass
                    return p

                chart_data = sorted(period_map.values(), key=parse_showtime_s)

            resp["chart_data"]        = chart_data
            resp["top_movie_titles"]  = [m["title"] for m in top_movies] if top_movies else []

        if has_transactions:
            recent_tx = conn.execute(f"""
                SELECT b.booked_at, b.status, m.title, s.date as show_date, s.show_time,
                    t.name as theatre_name,
                    COUNT(b.booking_id) as seat_count,
                    GROUP_CONCAT(ts.row_name || ts.col_num, ', ') as seats,
                    SUM(b.price_paid) as total_price,
                    (SELECT u.name FROM users u WHERE u.user_id = b.user_id) as user_name
                FROM bookings b
                JOIN showtimes s ON b.showtime_id = s.showtime_id
                JOIN movies m ON s.movie_id = m.movie_id
                JOIN theatres t ON s.theatre_id = t.theatre_id
                JOIN theatre_seats ts ON b.seat_id = ts.seat_id
                WHERE b.status = 'confirmed' AND {base_where}
                GROUP BY b.user_id, b.showtime_id, b.booked_at
                ORDER BY b.booked_at DESC LIMIT 10
            """, params).fetchall()
            resp["recent_transactions"] = [dict(t) for t in recent_tx]

        resp["available_movies"] = [dict(m) for m in conn.execute(
            "SELECT DISTINCT m.movie_id, m.title FROM showtimes s JOIN movies m ON s.movie_id = m.movie_id ORDER BY m.title"
        ).fetchall()]
        resp["available_theatres"] = [dict(t) for t in conn.execute(
            "SELECT theatre_id, name, city FROM theatres ORDER BY name"
        ).fetchall()]

        conn.close()
        return jsonify(resp)

    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500