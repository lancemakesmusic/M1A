# scripts/health_check.py
"""
Health check endpoint for monitoring
"""
import os
import json
from datetime import datetime
from pathlib import Path

def check_database():
    """Check database connectivity"""
    try:
        import sys
        from pathlib import Path
        
        # Add project root to path
        project_root = Path(__file__).parent.parent
        sys.path.insert(0, str(project_root))
        
        from scripts import db
        conn = db._conn()
        cursor = conn.execute("SELECT 1")
        cursor.fetchone()
        return True, "Database OK"
    except Exception as e:
        return False, f"Database error: {e}"

def check_file_system():
    """Check file system health"""
    try:
        content_dir = Path(__file__).parent.parent / "content"
        if not content_dir.exists():
            content_dir.mkdir(parents=True)
        
        # Test write access
        test_file = content_dir / ".health_check"
        test_file.write_text("health_check")
        test_file.unlink()
        
        return True, "File system OK"
    except Exception as e:
        return False, f"File system error: {e}"

def get_health_status():
    """Get overall health status"""
    checks = [
        ("database", check_database),
        ("filesystem", check_file_system)
    ]
    
    results = {}
    overall_healthy = True
    
    for name, check_func in checks:
        healthy, message = check_func()
        results[name] = {
            "healthy": healthy,
            "message": message
        }
        if not healthy:
            overall_healthy = False
    
    return {
        "healthy": overall_healthy,
        "timestamp": datetime.now().isoformat(),
        "checks": results
    }

if __name__ == "__main__":
    import sys
    status = get_health_status()
    print(json.dumps(status, indent=2))
    sys.exit(0 if status["healthy"] else 1)
