# scripts/db_multi_platform.py
"""
Multi-platform database schema and operations
Extends the existing database to support multiple social media platforms
"""
import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Import existing database module
from db import _conn, _now_iso, init_db

# Multi-platform schema extensions
MULTI_PLATFORM_SCHEMA = {
    "platforms": {
        "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
        "name": "TEXT NOT NULL UNIQUE",
        "display_name": "TEXT NOT NULL",
        "enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "created_at": "TEXT NOT NULL",
        "updated_at": "TEXT NOT NULL"
    },
    "client_platforms": {
        "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
        "client": "TEXT NOT NULL",
        "platform": "TEXT NOT NULL",
        "enabled": "BOOLEAN NOT NULL DEFAULT 1",
        "credentials": "TEXT NOT NULL DEFAULT '{}'",
        "settings": "TEXT NOT NULL DEFAULT '{}'",
        "created_at": "TEXT NOT NULL",
        "updated_at": "TEXT NOT NULL",
        "UNIQUE(client, platform)": ""
    },
    "platform_posts": {
        "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
        "job_id": "INTEGER NOT NULL",
        "platform": "TEXT NOT NULL",
        "platform_post_id": "TEXT",
        "platform_url": "TEXT",
        "status": "TEXT NOT NULL DEFAULT 'pending'",
        "error": "TEXT",
        "posted_at": "TEXT",
        "created_at": "TEXT NOT NULL",
        "FOREIGN KEY(job_id) REFERENCES jobs(id)": ""
    }
}

MULTI_PLATFORM_INDEXES = [
    ("idx_client_platforms_client_platform", 
     "CREATE INDEX IF NOT EXISTS idx_client_platforms_client_platform ON client_platforms(client, platform)"),
    ("idx_platform_posts_job_platform", 
     "CREATE INDEX IF NOT EXISTS idx_platform_posts_job_platform ON platform_posts(job_id, platform)"),
    ("idx_platform_posts_status", 
     "CREATE INDEX IF NOT EXISTS idx_platform_posts_status ON platform_posts(status)"),
    ("idx_platforms_enabled", 
     "CREATE INDEX IF NOT EXISTS idx_platforms_enabled ON platforms(enabled)")
]

def init_multi_platform_db():
    """Initialize multi-platform database schema"""
    conn = _conn()
    
    with conn:
        # Create new tables
        for table_name, columns in MULTI_PLATFORM_SCHEMA.items():
            if table_name == "platforms":
                # Create platforms table
                cols_sql = ", ".join(f"{k} {v}" for k, v in columns.items() if not k.startswith("UNIQUE"))
                conn.execute(f"CREATE TABLE IF NOT EXISTS platforms ({cols_sql});")
                
                # Add unique constraint if specified
                unique_constraints = [k for k in columns.keys() if k.startswith("UNIQUE")]
                for constraint in unique_constraints:
                    constraint_name = constraint.replace("UNIQUE", "").strip()
                    if constraint_name:
                        conn.execute(f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{table_name}_{constraint_name} ON {table_name}({constraint_name});")
            
            elif table_name == "client_platforms":
                # Create client_platforms table
                cols_sql = ", ".join(f"{k} {v}" for k, v in columns.items() if not k.startswith("UNIQUE") and not k.startswith("FOREIGN"))
                conn.execute(f"CREATE TABLE IF NOT EXISTS client_platforms ({cols_sql});")
                
                # Add unique constraint
                conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_client_platforms_unique ON client_platforms(client, platform);")
            
            elif table_name == "platform_posts":
                # Create platform_posts table
                cols_sql = ", ".join(f"{k} {v}" for k, v in columns.items() if not k.startswith("FOREIGN"))
                conn.execute(f"CREATE TABLE IF NOT EXISTS platform_posts ({cols_sql});")
        
        # Create indexes
        for index_name, index_sql in MULTI_PLATFORM_INDEXES:
            conn.execute(index_sql)
        
        # Insert default platforms
        _insert_default_platforms(conn)
    
        print("Multi-platform database schema initialized")

def _insert_default_platforms(conn):
    """Insert default platform configurations"""
    default_platforms = [
        ("instagram", "Instagram", 1),
        ("twitter", "Twitter/X", 1),
        ("linkedin", "LinkedIn", 1),
        ("youtube", "YouTube", 1),
        ("tiktok", "TikTok", 1),
        ("facebook", "Facebook", 1)
    ]
    
    now = _now_iso()
    
    for platform_name, display_name, enabled in default_platforms:
        # Check if platform already exists
        cursor = conn.execute("SELECT id FROM platforms WHERE name = ?", (platform_name,))
        if cursor.fetchone():
            continue
        
        # Insert platform
        conn.execute("""
            INSERT INTO platforms (name, display_name, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, (platform_name, display_name, enabled, now, now))

def add_client_platform(client: str, platform: str, credentials: Dict[str, Any] = None, settings: Dict[str, Any] = None) -> int:
    """Add a platform for a client"""
    if credentials is None:
        credentials = {}
    if settings is None:
        settings = {}
    
    conn = _conn()
    now = _now_iso()
    
    with conn:
        cursor = conn.execute("""
            INSERT INTO client_platforms (client, platform, credentials, settings, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (client, platform, json.dumps(credentials), json.dumps(settings), now, now))
        
        return int(cursor.lastrowid)

def get_client_platforms(client: str) -> List[Dict[str, Any]]:
    """Get all platforms for a client"""
    conn = _conn()
    cursor = conn.execute("""
        SELECT cp.*, p.display_name, p.enabled as platform_enabled
        FROM client_platforms cp
        JOIN platforms p ON cp.platform = p.name
        WHERE cp.client = ? AND cp.enabled = 1
        ORDER BY p.display_name
    """, (client,))
    
    rows = cursor.fetchall()
    for row in rows:
        try:
            row["credentials"] = json.loads(row.get("credentials") or "{}")
            row["settings"] = json.loads(row.get("settings") or "{}")
        except:
            row["credentials"] = {}
            row["settings"] = {}
    
    return rows

def update_client_platform(client: str, platform: str, credentials: Dict[str, Any] = None, settings: Dict[str, Any] = None) -> bool:
    """Update client platform configuration"""
    conn = _conn()
    now = _now_iso()
    
    updates = []
    params = []
    
    if credentials is not None:
        updates.append("credentials = ?")
        params.append(json.dumps(credentials))
    
    if settings is not None:
        updates.append("settings = ?")
        params.append(json.dumps(settings))
    
    if not updates:
        return False
    
    updates.append("updated_at = ?")
    params.extend([now, client, platform])
    
    with conn:
        cursor = conn.execute(f"""
            UPDATE client_platforms 
            SET {', '.join(updates)}
            WHERE client = ? AND platform = ?
        """, params)
        
        return cursor.rowcount > 0

def add_platform_post(job_id: int, platform: str, platform_post_id: str = None, platform_url: str = None, status: str = "pending") -> int:
    """Add a platform post record"""
    conn = _conn()
    now = _now_iso()
    
    with conn:
        cursor = conn.execute("""
            INSERT INTO platform_posts (job_id, platform, platform_post_id, platform_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (job_id, platform, platform_post_id, platform_url, status, now))
        
        return int(cursor.lastrowid)

def update_platform_post(platform_post_id: int, status: str, platform_post_id_value: str = None, platform_url: str = None, error: str = None) -> bool:
    """Update a platform post record"""
    conn = _conn()
    now = _now_iso()
    
    updates = ["status = ?"]
    params = [status]
    
    if platform_post_id_value is not None:
        updates.append("platform_post_id = ?")
        params.append(platform_post_id_value)
    
    if platform_url is not None:
        updates.append("platform_url = ?")
        params.append(platform_url)
    
    if error is not None:
        updates.append("error = ?")
        params.append(error)
    
    if status == "posted":
        updates.append("posted_at = ?")
        params.append(now)
    
    params.append(platform_post_id)
    
    with conn:
        cursor = conn.execute(f"""
            UPDATE platform_posts 
            SET {', '.join(updates)}
            WHERE id = ?
        """, params)
        
        return cursor.rowcount > 0

def get_job_platform_posts(job_id: int) -> List[Dict[str, Any]]:
    """Get all platform posts for a job"""
    conn = _conn()
    cursor = conn.execute("""
        SELECT * FROM platform_posts 
        WHERE job_id = ?
        ORDER BY created_at
    """, (job_id,))
    
    return cursor.fetchall()

def get_platform_post_stats(platform: str = None, status: str = None) -> Dict[str, Any]:
    """Get platform posting statistics"""
    conn = _conn()
    
    where_conditions = []
    params = []
    
    if platform:
        where_conditions.append("platform = ?")
        params.append(platform)
    
    if status:
        where_conditions.append("status = ?")
        params.append(status)
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    # Get total posts
    cursor = conn.execute(f"""
        SELECT COUNT(*) as total FROM platform_posts {where_clause}
    """, params)
    total = cursor.fetchone()["total"]
    
    # Get status breakdown
    cursor = conn.execute(f"""
        SELECT status, COUNT(*) as count 
        FROM platform_posts {where_clause}
        GROUP BY status
    """, params)
    status_breakdown = {row["status"]: row["count"] for row in cursor.fetchall()}
    
    # Get platform breakdown
    cursor = conn.execute(f"""
        SELECT platform, COUNT(*) as count 
        FROM platform_posts {where_clause}
        GROUP BY platform
    """, params)
    platform_breakdown = {row["platform"]: row["count"] for row in cursor.fetchall()}
    
    return {
        "total": total,
        "status_breakdown": status_breakdown,
        "platform_breakdown": platform_breakdown
    }

def get_failed_platform_posts(limit: int = 50) -> List[Dict[str, Any]]:
    """Get failed platform posts for retry"""
    conn = _conn()
    cursor = conn.execute("""
        SELECT pp.*, j.client, j.path, j.content_type, j.caption
        FROM platform_posts pp
        JOIN jobs j ON pp.job_id = j.id
        WHERE pp.status = 'failed'
        ORDER BY pp.created_at DESC
        LIMIT ?
    """, (limit,))
    
    return cursor.fetchall()

def retry_failed_platform_post(platform_post_id: int) -> bool:
    """Mark a failed platform post for retry"""
    conn = _conn()
    
    with conn:
        cursor = conn.execute("""
            UPDATE platform_posts 
            SET status = 'pending', error = NULL
            WHERE id = ?
        """, (platform_post_id,))
        
        return cursor.rowcount > 0

# Initialize multi-platform database on import
if __name__ == "__main__":
    init_multi_platform_db()
    print("Multi-platform database initialized successfully")
