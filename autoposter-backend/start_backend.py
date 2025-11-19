#!/usr/bin/env python3
"""
Backend Startup Script for M1A
Starts the FastAPI server with all required services
"""
import os
import sys
import uvicorn
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# Try to import from api.main (payment-enabled API)
try:
    from api.main import app
    print("[OK] Loaded api/main.py (with payments)")
except ImportError as e:
    print(f"[WARN] Could not load api/main.py: {e}")
    # Fallback to robust_api
    try:
        from robust_api import app
        print("[OK] Loaded robust_api.py (fallback)")
    except ImportError as e2:
        print(f"[ERROR] Could not load any API: {e2}")
        sys.exit(1)

if __name__ == "__main__":
    # Get port from environment or default to 8001
    port = int(os.getenv("API_PORT", "8001"))
    host = os.getenv("API_HOST", "0.0.0.0")
    
    print(f"\n{'='*60}")
    print(f"🚀 Starting M1A Backend API...")
    print(f"{'='*60}")
    print(f"📍 Server: http://{host}:{port}")
    print(f"📖 Docs: http://localhost:{port}/docs")
    print(f"💳 Payments Health: http://localhost:{port}/api/payments/health")
    print(f"🌐 Network Access: http://192.168.1.111:{port} (if on same network)")
    print(f"{'='*60}")
    print(f"\n✅ Backend is running! Keep this terminal open.")
    print(f"Press Ctrl+C to stop\n")
    
    try:
        uvicorn.run(
            app,
            host=host,
            port=port,
            reload=False,  # Disable reload to avoid import string warning
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n🛑 Backend stopped by user")
    except Exception as e:
        print(f"\n\n❌ Backend error: {e}")
        import traceback
        traceback.print_exc()

