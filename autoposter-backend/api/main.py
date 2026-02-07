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
import uuid
import base64
import asyncio
import time

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
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, APIRouter, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(
    title="M1Autoposter API",
    description="Instagram automation API for M1A platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

MAX_REQUEST_BYTES = int(os.getenv("M1A_MAX_REQUEST_BYTES", "10485760"))  # 10 MB default
RATE_LIMIT_PER_MIN = int(os.getenv("M1A_RATE_LIMIT_PER_MIN", "120"))
_rate_limit_buckets: Dict[str, List[float]] = {}

@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request too large."}
                )
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid Content-Length header."}
            )
    return await call_next(request)

def _check_rate_limit(key: str) -> None:
    now = time.time()
    window_start = now - 60
    hits = _rate_limit_buckets.get(key, [])
    hits = [hit for hit in hits if hit >= window_start]
    if len(hits) >= RATE_LIMIT_PER_MIN:
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")
    hits.append(now)
    _rate_limit_buckets[key] = hits

# Add simple health check endpoint FIRST (before any other imports)
@app.get("/api/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "message": "API is running"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "M1Autoposter API", "version": "1.0.0"}

@app.on_event("startup")
async def start_post_scheduler():
    if not AUTOPOSTER_SERVICES_AVAILABLE:
        return
    if os.getenv("AUTOPOSTER_SCHEDULER_DISABLED") == "1":
        print("[INFO] AutoPoster scheduler disabled via AUTOPOSTER_SCHEDULER_DISABLED.")
        return
    global _scheduler_task
    try:
        scheduler = get_scheduler()
        loop = asyncio.get_event_loop()
        _scheduler_task = loop.create_task(scheduler.run_loop())
        print("[OK] AutoPoster scheduler started")
    except Exception as e:
        print(f"[WARN] Failed to start AutoPoster scheduler: {e}")

@app.on_event("shutdown")
async def stop_post_scheduler():
    if not AUTOPOSTER_SERVICES_AVAILABLE:
        return
    try:
        scheduler = get_scheduler()
        scheduler.stop()
    except Exception:
        pass

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
SECRET_KEY = os.getenv("M1AUTOPOSTER_JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("M1AUTOPOSTER_JWT_SECRET is required for authentication.")
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

# AutoPoster services
try:
    from services.ai_content_generator import get_ai_generator
    from services.post_scheduler import get_scheduler
    from services.post_executor import get_post_executor
    AUTOPOSTER_SERVICES_AVAILABLE = True
except Exception as e:
    print(f"[WARN] AutoPoster services not available: {e}")
    AUTOPOSTER_SERVICES_AVAILABLE = False
    get_ai_generator = None
    get_scheduler = None
    get_post_executor = None

try:
    from scripts.platform_abstraction import (
        create_poster,
        PlatformError,
        AuthenticationError,
        PlatformNotSupportedError,
        INSTAGRAM_AVAILABLE,
        TWITTER_AVAILABLE,
        FACEBOOK_AVAILABLE,
        LINKEDIN_AVAILABLE,
        TIKTOK_AVAILABLE,
        YOUTUBE_AVAILABLE
    )
    PLATFORM_ABSTRACTION_AVAILABLE = True
except Exception as e:
    print(f"[WARN] Platform abstraction not available: {e}")
    PLATFORM_ABSTRACTION_AVAILABLE = False
    create_poster = None
    PlatformError = None
    AuthenticationError = None
    PlatformNotSupportedError = None
    INSTAGRAM_AVAILABLE = False
    TWITTER_AVAILABLE = False
    FACEBOOK_AVAILABLE = False
    LINKEDIN_AVAILABLE = False
    TIKTOK_AVAILABLE = False
    YOUTUBE_AVAILABLE = False

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

class ContentGenerationRequest(BaseModel):
    prompt: str
    content_type: str
    platform: str
    brand_voice: str = "professional"
    target_audience: str = "general"

class PostScheduleRequest(BaseModel):
    uid: str
    content: str
    imageUrl: Optional[str] = None
    platforms: Dict[str, bool]
    scheduledTime: str
    status: str
    autoGenerated: bool
    createdAt: str

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

# In-memory media library fallback
media_library = []

# Scheduler state
_scheduler_task = None

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

# AutoPoster API routes
@app.post("/api/generate-content")
async def generate_content(request: ContentGenerationRequest, user: dict = Depends(verify_token)):
    user_key = user.get("uid") or user.get("sub") or "unknown"
    _check_rate_limit(f"generate-content:{user_key}")
    if not AUTOPOSTER_SERVICES_AVAILABLE or not get_ai_generator:
        return {"success": False, "message": "AI content generator not available"}
    try:
        generator = get_ai_generator()
        result = await generator.generate_content(
            prompt=request.prompt,
            content_type=request.content_type,
            platform=request.platform,
            brand_voice=request.brand_voice,
            target_audience=request.target_audience
        )
        if result.get("success"):
            return {
                "success": True,
                "content": result.get("content"),
                "message": result.get("message", "Content generated successfully")
            }
        return {"success": False, "message": result.get("message", "Unable to generate content.")}
    except Exception as e:
        return {"success": False, "message": f"Unable to generate content. {str(e)}"}

@app.post("/api/schedule-post")
async def schedule_post(post_data: PostScheduleRequest, user: dict = Depends(verify_token)):
    user_key = user.get("uid") or user.get("sub") or "unknown"
    _check_rate_limit(f"schedule-post:{user_key}")
    if not AUTOPOSTER_SERVICES_AVAILABLE or not get_scheduler:
        return {"success": False, "message": "AutoPoster scheduler not available"}
    try:
        scheduler = get_scheduler()
        post_id = str(uuid.uuid4())
        post = {
            "id": post_id,
            "uid": post_data.uid,
            "content": post_data.content,
            "imageUrl": post_data.imageUrl,
            "platforms": post_data.platforms,
            "scheduledTime": post_data.scheduledTime,
            "status": post_data.status,
            "autoGenerated": post_data.autoGenerated,
            "createdAt": post_data.createdAt,
        }
        scheduler.add_post(post)
        return {"success": True, "postId": post_id, "message": "Post scheduled successfully"}
    except Exception as e:
        return {"success": False, "message": f"Error scheduling post: {str(e)}"}

@app.get("/api/scheduled-posts")
async def get_scheduled_posts(userId: Optional[str] = None, user: dict = Depends(verify_token)):
    if not AUTOPOSTER_SERVICES_AVAILABLE or not get_scheduler:
        return {"success": False, "message": "AutoPoster scheduler not available"}
    try:
        scheduler = get_scheduler()
        posts = scheduler.get_all_posts()
        if userId:
            posts = [p for p in posts if p.get("uid") == userId]
        return {"success": True, "posts": posts, "message": "Scheduled posts retrieved successfully"}
    except Exception as e:
        return {"success": False, "message": f"Error retrieving scheduled posts: {str(e)}"}

@app.get("/api/media-library")
async def get_media_library(userId: Optional[str] = None):
    try:
        if userId:
            filtered = [m for m in media_library if m.get("userId") == userId]
        else:
            filtered = media_library
        return {"success": True, "media": filtered, "message": "Media library retrieved successfully"}
    except Exception as e:
        return {"success": False, "message": f"Error retrieving media library: {str(e)}"}

@app.post("/api/upload-media")
async def upload_media(
    media: UploadFile = File(...),
    userId: str = Form(...),
    title: str = Form("Untitled Media")
):
    try:
        contents = await media.read()
        media_id = str(uuid.uuid4())
        media_entry = {
            "id": media_id,
            "title": title,
            "uri": f"data:{media.content_type};base64,{base64.b64encode(contents).decode()}",
            "type": media.content_type.split('/')[0] if '/' in media.content_type else "image",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "userId": userId,
        }
        media_library.append(media_entry)
        return {
            "success": True,
            "status": "success",
            "media": media_entry,
            "message": "Media uploaded successfully"
        }
    except Exception as e:
        return {"success": False, "status": "error", "message": f"Error uploading media: {str(e)}"}

@app.post("/api/post-now/{post_id}")
async def post_now(post_id: str):
    if not AUTOPOSTER_SERVICES_AVAILABLE or not get_scheduler or not get_post_executor:
        return {"success": False, "message": "AutoPoster services not available"}
    try:
        scheduler = get_scheduler()
        posts = scheduler.get_all_posts()
        post = next((p for p in posts if p.get("id") == post_id), None)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        executor = get_post_executor()
        results = await executor.execute_post(post)
        if results.get("success"):
            scheduler.update_post(post_id, {
                "status": "posted",
                "postedAt": datetime.now(timezone.utc).isoformat(),
                "postResults": results
            })
            return {"success": True, "results": results, "message": "Post published successfully"}

        scheduler.update_post(post_id, {
            "status": "failed",
            "failedAt": datetime.now(timezone.utc).isoformat(),
            "error": results.get("errors", ["Unknown error"])
        })
        return {"success": False, "results": results, "message": "Post failed to publish"}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "message": f"Error posting now: {str(e)}"}

@app.get("/api/platform-settings")
async def get_platform_settings():
    config = {
        "instagram": {
            "enabled": bool(os.getenv("IG_USERNAME") and os.getenv("IG_PASSWORD") and INSTAGRAM_AVAILABLE),
        },
        "twitter": {
            "enabled": bool(
                os.getenv("TWITTER_API_KEY") and os.getenv("TWITTER_API_SECRET")
                and os.getenv("TWITTER_ACCESS_TOKEN") and os.getenv("TWITTER_ACCESS_SECRET")
                and TWITTER_AVAILABLE
            ),
        },
        "facebook": {
            "enabled": bool(os.getenv("FACEBOOK_ACCESS_TOKEN") and os.getenv("FACEBOOK_PAGE_ID") and FACEBOOK_AVAILABLE),
        },
        "linkedin": {
            "enabled": bool(os.getenv("LINKEDIN_USERNAME") and os.getenv("LINKEDIN_PASSWORD") and LINKEDIN_AVAILABLE),
        },
        "tiktok": {
            "enabled": bool(os.getenv("TIKTOK_USERNAME") and os.getenv("TIKTOK_PASSWORD") and TIKTOK_AVAILABLE),
        },
        "youtube": {
            "enabled": bool(os.getenv("YOUTUBE_CREDENTIALS_FILE") and os.getenv("YOUTUBE_CHANNEL_ID") and YOUTUBE_AVAILABLE),
        },
    }
    return {"success": True, "settings": config}

@app.post("/api/test-connection/{platform}")
async def test_platform_connection(platform: str):
    if not PLATFORM_ABSTRACTION_AVAILABLE or not create_poster:
        return {
            "success": False,
            "connected": False,
            "message": "Platform integration not available on this server."
        }

    config = {
        "IG_USERNAME": os.getenv("IG_USERNAME"),
        "IG_PASSWORD": os.getenv("IG_PASSWORD"),
        "IG_2FA_CODE": os.getenv("IG_2FA_CODE"),
        "TWITTER_API_KEY": os.getenv("TWITTER_API_KEY"),
        "TWITTER_API_SECRET": os.getenv("TWITTER_API_SECRET"),
        "TWITTER_ACCESS_TOKEN": os.getenv("TWITTER_ACCESS_TOKEN"),
        "TWITTER_ACCESS_SECRET": os.getenv("TWITTER_ACCESS_SECRET"),
        "FACEBOOK_ACCESS_TOKEN": os.getenv("FACEBOOK_ACCESS_TOKEN"),
        "FACEBOOK_PAGE_ID": os.getenv("FACEBOOK_PAGE_ID"),
        "LINKEDIN_USERNAME": os.getenv("LINKEDIN_USERNAME"),
        "LINKEDIN_PASSWORD": os.getenv("LINKEDIN_PASSWORD"),
        "YOUTUBE_CREDENTIALS_FILE": os.getenv("YOUTUBE_CREDENTIALS_FILE"),
        "YOUTUBE_CHANNEL_ID": os.getenv("YOUTUBE_CHANNEL_ID"),
        "TIKTOK_USERNAME": os.getenv("TIKTOK_USERNAME"),
        "TIKTOK_PASSWORD": os.getenv("TIKTOK_PASSWORD"),
    }

    try:
        poster = create_poster(platform, "default", config)
        await poster.authenticate()
        return {
            "success": True,
            "connected": True,
            "message": f"{platform} connection successful"
        }
    except PlatformNotSupportedError as e:
        return {"success": False, "connected": False, "message": str(e)}
    except AuthenticationError as e:
        return {"success": False, "connected": False, "message": str(e)}
    except PlatformError as e:
        return {"success": False, "connected": False, "message": str(e)}
    except Exception as e:
        return {"success": False, "connected": False, "message": f"Connection failed: {str(e)}"}

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
