#!/usr/bin/env python3
"""
Simple Backend Startup - Uses robust_api.py directly
"""
import os
import sys
import uvicorn
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import robust_api directly
try:
    from robust_api import app
    print("[OK] Loaded robust_api.py")
except ImportError as e:
    print(f"[ERROR] Could not load robust_api: {e}")
    sys.exit(1)

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", "8001"))
    host = os.getenv("API_HOST", "0.0.0.0")
    
    print(f"\n{'='*60}")
    print(f"Starting M1A Backend API...")
    print(f"{'='*60}")
    print(f"Server: http://{host}:{port}")
    print(f"API Docs: http://{host}:{port}/docs")
    print(f"Health: http://{host}:{port}/api/health")
    print(f"Payments: http://{host}:{port}/api/payments/health")
    print(f"{'='*60}\n")
    
    try:
        uvicorn.run(
            app,
            host=host,
            port=port,
            reload=False,  # Disable reload for stability
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\nShutting down backend...")
    except Exception as e:
        print(f"\n[ERROR] Backend failed to start: {e}")
        sys.exit(1)

