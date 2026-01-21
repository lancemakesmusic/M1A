# api/main.py
"""
M1Autoposter REST API
FastAPI wrapper around existing functionality for M1A integration
"""
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # python-dotenv not available
except Exception:
    pass  # Error loading .env, continue anyway

# Initialize FastAPI app FIRST (before any imports that might fail)
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="M1Autoposter API",
    description="Instagram automation API for M1A platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add simple health check endpoint FIRST (before any other imports)
@app.get("/api/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "message": "API is running"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "M1Autoposter API", "version": "1.0.0"}

# Now try to import optional dependencies
try:
    import jwt
    import httpx
    JWT_AVAILABLE = True
except ImportError as e:
    print(f"WARNING: JWT/httpx not available: {e}")
    JWT_AVAILABLE = False
    jwt = None
    httpx = None

# Try to import scripts (these might fail, but that's OK)
try:
    from scripts import db
    from scripts.secure_config_loader import load_client_config, save_client_config
    SCRIPTS_AVAILABLE = True
except (ImportError, Exception) as e:
    print(f"WARNING: Scripts not available: {e}")
    SCRIPTS_AVAILABLE = False
    db = None
    load_client_config = None
    save_client_config = None

# CORS middleware for M1A integration
# Get allowed origins from environment variable (comma-separated)
ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if os.getenv("CORS_ALLOWED_ORIGINS") else []
# Remove empty strings from list
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

# If no origins specified, use development defaults (NOT for production!)
if not ALLOWED_ORIGINS:
    # Check if running on Cloud Run (has K_SERVICE env var)
    if os.getenv("K_SERVICE") or os.getenv("ENVIRONMENT", "development").lower() == "production":
        # Cloud Run / Production: allow all origins (Cloud Run handles CORS at platform level)
        # For stricter control, set CORS_ALLOWED_ORIGINS environment variable
        print("INFO: Running on Cloud Run. Allowing all origins (Cloud Run handles CORS).")
        ALLOWED_ORIGINS = ["*"]
    else:
        # Development: allow all origins (with warning)
        print("WARNING: CORS_ALLOWED_ORIGINS not set. Allowing all origins (development only).")
        ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Now try to import optional dependencies
try:
    import jwt
    import httpx
    JWT_AVAILABLE = True
except ImportError as e:
    print(f"WARNING: JWT/httpx not available: {e}")
    JWT_AVAILABLE = False
    jwt = None
    httpx = None

# Try to import scripts (these might fail, but that's OK)
try:
    from scripts import db
    from scripts.secure_config_loader import load_client_config, save_client_config
    SCRIPTS_AVAILABLE = True
except ImportError as e:
    print(f"WARNING: Scripts not available: {e}")
    SCRIPTS_AVAILABLE = False
    db = None

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("M1AUTOPOSTER_JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

# Authentication dependency
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    if not JWT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT authentication not available"
        )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Import models and functions from robust_api for booking endpoints
try:
    import sys
    from pathlib import Path
    robust_api_path = Path(__file__).parent.parent / "robust_api.py"
    if robust_api_path.exists():
        # Import the entire module to access its models and functions
        import importlib.util
        spec = importlib.util.spec_from_file_location("robust_api", robust_api_path)
        robust_api = importlib.util.module_from_spec(spec)
        sys.modules["robust_api"] = robust_api
        spec.loader.exec_module(robust_api)
        ROBUST_API_AVAILABLE = True
    else:
        ROBUST_API_AVAILABLE = False
except Exception as e:
    print(f"[WARN] robust_api not available: {e}")
    ROBUST_API_AVAILABLE = False
    robust_api = None

# Pydantic models
class ClientCreate(BaseModel):
    name: str = Field(..., description="Client name")
    ig_username: Optional[str] = Field(None, description="Instagram username")
    ig_password: Optional[str] = Field(None, description="Instagram password")
    daily_quota: int = Field(1, ge=1, le=1000, description="Daily post quota")
    timezone: str = Field("America/New_York", description="Client timezone")
    preferred_hours: List[int] = Field(default=[11, 15, 19], description="Preferred posting hours")

class ClientResponse(BaseModel):
    name: str
    daily_quota: int
    timezone: str
    preferred_hours: List[int]
    created_at: str
    status: str

class PostCreate(BaseModel):
    client: str = Field(..., description="Client name")
    file_path: str = Field(..., description="Path to content file")
    caption: str = Field(default="", description="Post caption")
    content_type: str = Field(..., description="Content type: image or video")
    schedule_time: Optional[str] = Field(None, description="ISO format schedule time (optional)")

class PostResponse(BaseModel):
    job_id: int
    client: str
    content_type: str
    file_path: str
    caption: str
    status: str
    eta: str
    created_at: str

class StatusResponse(BaseModel):
    watcher_status: str
    runner_status: str
    total_jobs: int
    queued_jobs: int
    completed_jobs: int
    failed_jobs: int

# Authentication dependency
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    if not JWT_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT authentication not available"
        )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# API Routes
@app.get("/api/v1/status", response_model=StatusResponse)
async def get_status():
    """Get API status (no auth required for health checks)"""
    try:
        if not SCRIPTS_AVAILABLE or not db:
            return StatusResponse(
                watcher_status="unknown",
                runner_status="unknown",
                total_jobs=0,
                queued_jobs=0,
                completed_jobs=0,
                failed_jobs=0
            )
        
        conn = db._conn()
        
        cursor = conn.execute("""
            SELECT 
                status,
                COUNT(*) as count
            FROM jobs 
            GROUP BY status
        """)
        
        stats = {row['status']: row['count'] for row in cursor.fetchall()}
        
        # Check process status (simplified)
        watcher_pid = ""
        runner_pid = ""
        try:
            with open(PROJECT_ROOT / "logs" / "watcher.pid", "r") as f:
                watcher_pid = f.read().strip()
            with open(PROJECT_ROOT / "logs" / "runner.pid", "r") as f:
                runner_pid = f.read().strip()
        except:
            pass
        
        return StatusResponse(
            watcher_status="running" if watcher_pid else "stopped",
            runner_status="running" if runner_pid else "stopped",
            total_jobs=sum(stats.values()),
            queued_jobs=stats.get('queued', 0),
            completed_jobs=stats.get('done', 0),
            failed_jobs=stats.get('failed', 0)
        )
    except Exception as e:
        return StatusResponse(
            watcher_status="error",
            runner_status="error",
            total_jobs=0,
            queued_jobs=0,
            completed_jobs=0,
            failed_jobs=0
        )

# Include payment routes (with error handling)
try:
    from api.payments import router as payments_router
    app.include_router(payments_router)
    print("[OK] Payment routes loaded successfully")
except (ImportError, Exception) as e:
    print(f"[WARN] Payment routes not available: {e}")
    import traceback
    traceback.print_exc()

# Include Stripe products sync endpoint
try:
    from api.stripe_products import sync_stripe_products_to_firestore, get_stripe_products
    from api.payments import get_firestore_client
    
    stripe_products_router = APIRouter(prefix="/api/stripe", tags=["stripe"])
    
    @stripe_products_router.post("/sync-products")
    async def sync_products(user: dict = Depends(verify_token)):
        """Sync Stripe products to Firestore"""
        try:
            db = get_firestore_client()
            if not db:
                raise HTTPException(status_code=503, detail="Firestore not available")
            
            result = sync_stripe_products_to_firestore(db)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to sync products: {str(e)}")
    
    @stripe_products_router.get("/products")
    async def list_products(user: dict = Depends(verify_token)):
        """List all Stripe products"""
        try:
            products = get_stripe_products(active_only=True)
            return {
                "success": True,
                "products": [
                    {
                        "id": p["id"],
                        "name": p.get("name", ""),
                        "description": p.get("description", ""),
                        "active": p.get("active", True),
                        "metadata": p.get("metadata", {}),
                    }
                    for p in products
                ]
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to list products: {str(e)}")
    
    app.include_router(stripe_products_router)
    print("[OK] Stripe products sync routes loaded")
except (ImportError, Exception) as e:
    print(f"[WARN] Stripe products sync not available: {e}")
    import traceback
    traceback.print_exc()

# Calendar events router
try:
    from api.calendar_events import router as calendar_events_router
    app.include_router(calendar_events_router)
    print("[OK] Calendar events router loaded")
except Exception as e:
    print(f"[WARN] Calendar events router not loaded: {e}")
    import traceback
    traceback.print_exc()

# Include App Store notification routes
try:
    from api.app_store_notifications import router as app_store_router
    app.include_router(app_store_router)
    print("[OK] App Store notification routes loaded successfully")
except (ImportError, Exception) as e:
    print(f"[WARN] App Store notification routes not available: {e}")
    import traceback
    traceback.print_exc()

# Google Drive routes
try:
    from api.google_drive import router as google_drive_router
    app.include_router(google_drive_router)
    print("[OK] Google Drive routes loaded successfully")
except (ImportError, Exception) as e:
    print(f"[WARN] Google Drive routes not available: {e}")
    import traceback
    traceback.print_exc()

# Email routes
try:
    from api.email import router as email_router
    app.include_router(email_router)
    print("[OK] Email routes loaded successfully")
except (ImportError, Exception) as e:
    print(f"[WARN] Email routes not available: {e}")
    import traceback
    traceback.print_exc()

# SMS routes
try:
    from api.sms import router as sms_router
    app.include_router(sms_router)
    print("[OK] SMS routes loaded successfully")
except (ImportError, Exception) as e:
    print(f"[WARN] SMS routes not available: {e}")
    import traceback
    traceback.print_exc()

# Include booking and dashboard endpoints from robust_api
if ROBUST_API_AVAILABLE and robust_api:
    try:
        # Add service booking endpoint
        @app.post("/api/service-booking")
        async def create_service_booking(booking: robust_api.ServiceBookingRequest):
            return await robust_api.create_service_booking(booking)
        
        @app.get("/api/service-bookings")
        async def get_service_bookings(userId: Optional[str] = None):
            return await robust_api.get_service_bookings(userId)
        
        # Add bar order endpoint
        @app.post("/api/bar-order")
        async def create_bar_order(order: robust_api.BarOrderRequest):
            return await robust_api.create_bar_order(order)
        
        @app.get("/api/bar-orders")
        async def get_bar_orders(userId: Optional[str] = None):
            return await robust_api.get_bar_orders(userId)
        
        # Add dashboard stats endpoint
        @app.get("/api/dashboard/stats")
        async def get_dashboard_stats(userId: Optional[str] = None, persona: Optional[str] = None):
            return await robust_api.get_dashboard_stats(userId, persona)
        
        # Add event booking endpoint (if not already present)
        @app.post("/api/event-booking")
        async def create_event_booking(booking: robust_api.EventBookingRequest):
            return await robust_api.create_event_booking(booking)
        
        @app.get("/api/event-bookings")
        async def get_event_bookings(userId: Optional[str] = None):
            return await robust_api.get_event_bookings(userId)
        
        print("[OK] Robust API endpoints loaded")
    except Exception as e:
        print(f"[WARN] Failed to load robust_api endpoints: {e}")
        import traceback
        traceback.print_exc()

# Import admin verification utilities
try:
    from api.auth_utils import verify_admin
    ADMIN_VERIFICATION_AVAILABLE = True
except ImportError:
    ADMIN_VERIFICATION_AVAILABLE = False
    print("[WARN] Admin verification utilities not available")

# Example admin endpoint (for demonstration)
if ADMIN_VERIFICATION_AVAILABLE:
    @app.get("/api/admin/health")
    async def admin_health_check(admin_user: dict = Depends(verify_admin)):
        """
        Admin-only health check endpoint
        Demonstrates how to use verify_admin dependency
        """
        return {
            "status": "ok",
            "message": "Admin access verified",
            "admin_email": admin_user.get("email"),
            "admin_user_id": admin_user.get("userId")
        }

print("OK: FastAPI app initialized successfully")
