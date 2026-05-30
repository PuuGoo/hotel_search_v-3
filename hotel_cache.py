"""SQLite cache for hotel search results to avoid redundant searches."""

import sqlite3
import hashlib
import os
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "hotel_cache.db"


def _get_conn():
    """Get a connection to the cache database."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS search_cache (
            cache_key TEXT PRIMARY KEY,
            hotel_name TEXT NOT NULL,
            hotel_address TEXT NOT NULL,
            url TEXT,
            engine TEXT,
            score INTEGER DEFAULT 0,
            img_count INTEGER DEFAULT 0,
            status TEXT,
            created_at TEXT NOT NULL,
            last_used_at TEXT NOT NULL,
            hit_count INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_cache_key ON search_cache(cache_key)
    """)
    conn.commit()
    return conn


def _make_key(hotel_name: str, hotel_address: str) -> str:
    """Generate a normalized cache key from hotel name and address."""
    # Normalize: lowercase, strip whitespace, collapse multiple spaces
    name = " ".join(hotel_name.lower().split()).strip()
    addr = " ".join(hotel_address.lower().split()).strip()
    raw = f"{name}|{addr}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def get_cached(hotel_name: str, hotel_address: str) -> dict | None:
    """Look up a cached result. Returns dict with url, engine, score, etc. or None."""
    key = _make_key(hotel_name, hotel_address)
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT url, engine, score, img_count, status FROM search_cache WHERE cache_key = ?",
            (key,)
        ).fetchone()
        if row:
            # Update hit count and last used
            conn.execute(
                "UPDATE search_cache SET hit_count = hit_count + 1, last_used_at = ? WHERE cache_key = ?",
                (datetime.now().isoformat(), key)
            )
            conn.commit()
            return {
                "url": row[0] or "",
                "engine": row[1] or "",
                "score": row[2] or 0,
                "img_count": row[3] or 0,
                "status": row[4] or "",
                "cached": True,
            }
        return None
    finally:
        conn.close()


def store_result(hotel_name: str, hotel_address: str, url: str, engine: str,
                 score: int, img_count: int, status: str):
    """Store a search result in the cache."""
    key = _make_key(hotel_name, hotel_address)
    now = datetime.now().isoformat()
    conn = _get_conn()
    try:
        conn.execute("""
            INSERT OR REPLACE INTO search_cache
            (cache_key, hotel_name, hotel_address, url, engine, score, img_count, status, created_at, last_used_at, hit_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (key, hotel_name, hotel_address, url, engine, score, img_count, status, now, now))
        conn.commit()
    finally:
        conn.close()


def get_stats() -> dict:
    """Get cache statistics."""
    conn = _get_conn()
    try:
        total = conn.execute("SELECT COUNT(*) FROM search_cache").fetchone()[0]
        hits = conn.execute("SELECT SUM(hit_count) FROM search_cache").fetchone()[0] or 0
        matched = conn.execute("SELECT COUNT(*) FROM search_cache WHERE status = 'matched'").fetchone()[0]
        return {
            "total_entries": total,
            "total_hits": hits,
            "matched_entries": matched,
            "cache_size_kb": DB_PATH.stat().st_size // 1024 if DB_PATH.exists() else 0,
        }
    finally:
        conn.close()


def cleanup_old_entries(days: int = 30):
    """Remove entries older than specified days."""
    cutoff = (datetime.now() - timedelta(days=days)).isoformat()
    conn = _get_conn()
    try:
        deleted = conn.execute(
            "DELETE FROM search_cache WHERE last_used_at < ?", (cutoff,)
        ).rowcount
        conn.commit()
        return deleted
    finally:
        conn.close()


def get_successful_patterns(limit: int = 100) -> list[dict]:
    """Analyze successful searches to extract patterns."""
    conn = _get_conn()
    try:
        rows = conn.execute("""
            SELECT hotel_name, hotel_address, url, engine, score
            FROM search_cache
            WHERE status = 'matched' AND score >= 70
            ORDER BY score DESC
            LIMIT ?
        """, (limit,)).fetchall()

        patterns = []
        for name, addr, url, engine, score in rows:
            # Extract domain from URL
            domain = ""
            if url:
                try:
                    from urllib.parse import urlparse
                    domain = urlparse(url).netloc.replace("www.", "")
                except:
                    pass

            # Extract location pattern
            addr_parts = [p.strip() for p in (addr or "").split(",") if p.strip()]
            location = addr_parts[-1] if addr_parts else ""

            patterns.append({
                "name_length": len(name or ""),
                "has_location": bool(location),
                "location": location,
                "domain": domain,
                "engine": engine,
                "score": score,
            })

        return patterns
    finally:
        conn.close()


def suggest_query_format(hotel_name: str, hotel_address: str) -> str:
    """Suggest optimal query format based on cached patterns."""
    patterns = get_successful_patterns(50)
    if not patterns:
        return f"{hotel_name} {hotel_address}"

    # Analyze what works best
    with_location = [p for p in patterns if p["has_location"]]
    without_location = [p for p in patterns if not p["has_location"]]

    avg_score_with = sum(p["score"] for p in with_location) / len(with_location) if with_location else 0
    avg_score_without = sum(p["score"] for p in without_location) / len(without_location) if without_location else 0

    # Extract short location
    addr_parts = [p.strip() for p in hotel_address.split(",") if p.strip()]
    short_location = addr_parts[-1] if addr_parts else ""

    if avg_score_with > avg_score_without and short_location:
        return f"{hotel_name} {short_location}"
    return hotel_name


def detect_duplicates(rows: list[tuple[str, str]]) -> dict[str, list[int]]:
    """Detect duplicate hotel entries in a list of (name, address) tuples.
    Returns dict mapping cache_key to list of row indices that are duplicates."""
    seen = {}
    duplicates = {}
    for i, (name, addr) in enumerate(rows):
        key = _make_key(name, addr)
        if key in seen:
            if key not in duplicates:
                duplicates[key] = [seen[key]]
            duplicates[key].append(i)
        else:
            seen[key] = i
    return duplicates
