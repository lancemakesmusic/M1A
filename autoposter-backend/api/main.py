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

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import jwt
import httpx
from scripts import db
from scripts.secure_config_loader import load_client_config, save_client_config

# Initialize FastAPI app
app = FastAPI(
    title="M1Autoposter API",
    description="Instagram automation API for M1A platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for M1A integration
# Get allowed origins from environment variable (comma-separated)
ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if os.getenv("CORS_ALLOWED_ORIGINS") else []
# Remove empty strings from list
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

# If no origins specified, use development defaults (NOT for production!)
if not ALLOWED_ORIGINS:
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        # Production: fail if no CORS origins configured
        raise ValueError("CORS_ALLOWED_ORIGINS must be set in production. Configure allowed origins in environment variables.")
    else:
        # Development: allow all origins (with warning)
        print("⚠️ WARNING: CORS_ALLOWED_ORIGINS not set. Allowing all origins (development only).")
        ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()
SECRET_KEY = os.getenv("M1AUTOPOSTER_JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

# Pydantic models
class ClientCreate(BaseModel):
    name: str = Field(..., description="Client name")
    ig_username: Optional[str] = Field(None, description="Instagram username")
    ig_password: Optional[str] = Field(None, description="Instagram password")
    daily_quota: int = Field(1, ge=1, le=1000, description="Daily post quota")
    timezone: str = Field("America/New_York", description="Client timezone")
    preferred_hours: List[int] = Field([11, 15, 19], description="Preferred posting hours (24h format)")

class ClientResponse(BaseModel):
    name: str
    daily_quota: int
    timezone: str
    preferred_hours: List[int]
    created_at: str
    status: str = "active"

class PostCreate(BaseModel):
    client: str = Field(..., description="Client name")
    content_type: str = Field(..., description="Content type: feed, reels, stories, weekly")
    file_path: str = Field(..., description="Path to content file")
    caption: Optional[str] = Field(None, description="Post caption")
    schedule_time: Optional[str] = Field(None, description="ISO datetime to schedule post")

class PostResponse(BaseModel):
    id: int
    client: str
    content_type: str
    file_path: str
    caption: Optional[str]
    status: str
    eta: Optional[str]
    created_at: str

class StatusResponse(BaseModel):
    watcher_status: str
    runner_status: str
    total_jobs: int
    queued_jobs: int
    completed_jobs: int
    failed_jobs: int

# Authentication
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# API Endpoints
@app.get("/", response_model=Dict[str, str])
async def root():
    """API health check"""
    return {
        "message": "M1Autoposter API",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/api/v1/status", response_model=StatusResponse)
async def get_status(user: dict = Depends(verify_token)):
    """Get system status"""
    try:
        # Get job statistics
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
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@app.get("/api/v1/clients", response_model=List[ClientResponse])
async def list_clients(user: dict = Depends(verify_token)):
    """List all clients"""
    try:
        clients_dir = PROJECT_ROOT / "config" / "clients"
        clients = []
        
        if clients_dir.exists():
            for client_dir in clients_dir.iterdir():
                if client_dir.is_dir():
                    config = load_client_config(client_dir.name)
                    if config:
                        clients.append(ClientResponse(
                            name=client_dir.name,
                            daily_quota=config.get('daily_quota', 1),
                            timezone=config.get('timezone', 'America/New_York'),
                            preferred_hours=config.get('preferred_hours', [11, 15, 19]),
                            created_at=config.get('created', datetime.now().isoformat()),
                            status="active"
                        ))
        
        return clients
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list clients: {str(e)}")

@app.post("/api/v1/clients", response_model=ClientResponse)
async def create_client(client_data: ClientCreate, user: dict = Depends(verify_token)):
    """Create a new client"""
    try:
        # Create client configuration
        config = {
            "name": client_data.name,
            "created": datetime.now().isoformat(),
            "daily_quota": client_data.daily_quota,
            "timezone": client_data.timezone,
            "preferred_hours": client_data.preferred_hours,
            "IG_USERNAME": client_data.ig_username or "",
            "IG_PASSWORD": client_data.ig_password or "",
            "live": False  # Start in safe mode
        }
        
        # Save client configuration
        if not save_client_config(client_data.name, config):
            raise HTTPException(status_code=500, detail="Failed to save client configuration")
        
        # Create content directory
        content_dir = PROJECT_ROOT / "content" / client_data.name
        content_dir.mkdir(parents=True, exist_ok=True)
        
        return ClientResponse(
            name=client_data.name,
            daily_quota=client_data.daily_quota,
            timezone=client_data.timezone,
            preferred_hours=client_data.preferred_hours,
            created_at=config["created"],
            status="active"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create client: {str(e)}")

@app.get("/api/v1/clients/{client_name}", response_model=ClientResponse)
async def get_client(client_name: str, user: dict = Depends(verify_token)):
    """Get specific client details"""
    try:
        config = load_client_config(client_name)
        if not config:
            raise HTTPException(status_code=404, detail="Client not found")
        
        return ClientResponse(
            name=client_name,
            daily_quota=config.get('daily_quota', 1),
            timezone=config.get('timezone', 'America/New_York'),
            preferred_hours=config.get('preferred_hours', [11, 15, 19]),
            created_at=config.get('created', datetime.now().isoformat()),
            status="active"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get client: {str(e)}")

@app.post("/api/v1/queue", response_model=PostResponse)
async def add_to_queue(post_data: PostCreate, user: dict = Depends(verify_token)):
    """Add content to posting queue"""
    try:
        # Validate client exists
        config = load_client_config(post_data.client)
        if not config:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Validate file exists
        file_path = Path(post_data.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=400, detail="File not found")
        
        # Calculate ETA
        eta = None
        if post_data.schedule_time:
            try:
                eta = datetime.fromisoformat(post_data.schedule_time.replace('Z', '+00:00')).isoformat()
            except:
                raise HTTPException(status_code=400, detail="Invalid schedule_time format")
        
        # Add job to database
        job_id = db.add_job(
            client=post_data.client,
            path=str(file_path.resolve()),
            content_type=post_data.content_type,
            caption=post_data.caption,
            eta=eta
        )
        
        # Get job details
        conn = db._conn()
        cursor = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        job = cursor.fetchone()
        
        return PostResponse(
            id=job['id'],
            client=job['client'],
            content_type=job['content_type'],
            file_path=job['path'],
            caption=job['caption'],
            status=job['status'],
            eta=job['eta'],
            created_at=job['created_at']
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add to queue: {str(e)}")

@app.get("/api/v1/queue", response_model=List[PostResponse])
async def list_queue(client: Optional[str] = None, user: dict = Depends(verify_token)):
    """List queued posts"""
    try:
        jobs = db.get_due_jobs(limit=100, client=client)
        
        return [
            PostResponse(
                id=job['id'],
                client=job['client'],
                content_type=job['content_type'],
                file_path=job['path'],
                caption=job['caption'],
                status=job['status'],
                eta=job['eta'],
                created_at=job['created_at']
            )
            for job in jobs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list queue: {str(e)}")

@app.delete("/api/v1/queue/{job_id}")
async def cancel_job(job_id: int, user: dict = Depends(verify_token)):
    """Cancel a queued job"""
    try:
        conn = db._conn()
        cursor = conn.execute("UPDATE jobs SET status = 'cancelled' WHERE id = ?", (job_id,))
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"message": "Job cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel job: {str(e)}")

# Include payment routes
try:
    from api.payments import router as payments_router
    app.include_router(payments_router)
    print("[OK] Payment routes loaded successfully")
except ImportError as e:
    # Payments module not available, skip
    print(f"[WARN] Payment routes not available: {e}")
    pass
except Exception as e:
    print(f"[ERROR] Failed to load payment routes: {e}")
    import traceback
    traceback.print_exc()
    pass

# Include App Store notification routes
try:
    from api.app_store_notifications import router as app_store_router
    app.include_router(app_store_router)
    print("[OK] App Store notification routes loaded successfully")
except ImportError as e:
    print(f"[WARN] App Store notification routes not available: {e}")

# Google Drive routes
try:
    from api.google_drive import router as google_drive_router
    app.include_router(google_drive_router)
    print("[OK] Google Drive routes loaded successfully")
except ImportError as e:
    print(f"[WARN] Google Drive routes not available: {e}")
    print(f"[WARN] App Store notification routes not available: {e}")
    pass
except Exception as e:
    print(f"[ERROR] Failed to load App Store notification routes: {e}")
    import traceback
    traceback.print_exc()
    pass

# Include booking and dashboard endpoints from robust_api
if ROBUST_API_AVAILABLE:
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
        
        print("[OK] Booking and dashboard endpoints loaded from robust_api")
    except Exception as e:
        print(f"[WARN] Failed to load booking endpoints: {e}")

# AutoPoster endpoints (for M1A app integration)
import uuid
import base64

# In-memory storage for AutoPoster (backed by persistent storage)
scheduled_posts = []
media_library = []
auto_poster_status = {"enabled": False}

# Initialize post scheduler
scheduler = None
try:
    from services.post_scheduler import get_scheduler
    scheduler = get_scheduler()
    # Load existing posts into memory
    existing_posts = scheduler.get_all_posts()
    scheduled_posts.extend(existing_posts)
    print(f"[OK] Loaded {len(existing_posts)} posts from persistent storage")
    
    # Start background worker
    import threading
    def run_scheduler():
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(scheduler.run_loop(interval_seconds=60))
    
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    print("[OK] Post scheduler background worker started")
    
except ImportError as e:
    print(f"[WARN] Post scheduler not available: {e}")
    scheduler = None
except Exception as e:
    print(f"[WARN] Error initializing scheduler: {e}")
    import traceback
    traceback.print_exc()
    scheduler = None

# AutoPoster Models
class ContentGenerationRequest(BaseModel):
    prompt: str
    content_type: str
    platform: str
    brand_voice: str = "professional"
    target_audience: str = "general"

class ContentGenerationResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    message: Optional[str] = None

class PostData(BaseModel):
    uid: str
    content: str
    imageUrl: Optional[str] = None
    platforms: Dict[str, bool]
    scheduledTime: str
    status: str
    autoGenerated: bool
    createdAt: str

# AutoPoster Endpoints
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "server": "operational",
        "posts_count": len(scheduled_posts),
        "auto_poster_enabled": auto_poster_status["enabled"]
    }

@app.post("/api/generate-content", response_model=ContentGenerationResponse)
async def generate_content(request: ContentGenerationRequest):
    """Generate content using AI"""
    try:
        # Import AI generator
        try:
            # Ensure .env is loaded before importing AI module
            from dotenv import load_dotenv
            env_path = PROJECT_ROOT / ".env"
            if env_path.exists():
                load_dotenv(env_path)
            
            # Try to import AI generator
            import importlib.util
            ai_generator_path = PROJECT_ROOT / "services" / "ai_content_generator.py"
            
            if ai_generator_path.exists():
                print(f"[AI] Loading AI module from {ai_generator_path}")
                spec = importlib.util.spec_from_file_location("ai_content_generator", ai_generator_path)
                ai_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(ai_module)
                print("[AI] AI module loaded successfully")
                
                ai_generator = ai_module.get_ai_generator()
                print(f"[AI] AI generator created, available: {ai_generator.is_available()}")
                
                # Check if AI is available
                if ai_generator.is_available():
                    print(f"[AI] Calling AI generate_content...")
                    # Generate content with AI
                    result = await ai_generator.generate_content(
                        prompt=request.prompt,
                        content_type=request.content_type,
                        platform=request.platform,
                        brand_voice=request.brand_voice,
                        target_audience=request.target_audience
                    )
                    print(f"[AI] AI generation result: success={result.get('success')}, model={result.get('model')}")
                    
                    if result.get("success"):
                        print(f"[AI] SUCCESS! Returning AI-generated content")
                        return ContentGenerationResponse(
                            success=True,
                            content=result["content"],
                            message=result.get("message", "Content generated successfully")
                        )
                    else:
                        # AI generation failed, fallback to template
                        print(f"[AI] Generation failed: {result.get('message', 'Unknown error')}")
                        raise Exception("AI generation returned failure")
                else:
                    print("[AI] AI service not available (no API key)")
                    raise Exception("AI not configured")
            else:
                # AI module not found, use template
                print("[AI] ❌ AI module file not found")
                raise ImportError("AI module not found")
                
        except ImportError as ie:
            # AI module not available, use template
            print(f"[AI] ❌ Import error: {ie}")
            import traceback
            traceback.print_exc()
        except Exception as ai_error:
            print(f"[AI] ❌ Generation error: {ai_error}")
            import traceback
            traceback.print_exc()
            # Continue to fallback template
        
        # Fallback template (if AI not available or fails)
        print("[AI] ⚠️ Using template fallback")
        hashtags = {
            "instagram": "#content #socialmedia #automation #m1a #creative",
            "facebook": "#content #socialmedia #community",
            "twitter": "#content #socialmedia",
            "linkedin": "#content #professional #networking",
            "tiktok": "#content #viral #trending #fyp"
        }
        
        platform_hashtags = hashtags.get(request.platform.lower(), "#content #socialmedia")
        
        generated_content = f"""🎯 {request.content_type.title()} for {request.platform.title()}

{request.prompt}

✨ Tailored for {request.target_audience} with a {request.brand_voice} tone

{platform_hashtags}

💡 Tip: Add your OpenAI API key to enable AI-powered content generation!"""
        
        return ContentGenerationResponse(
            success=True,
            content=generated_content,
            message="Template content generated. Add OPENAI_API_KEY to enable AI generation."
        )
        
    except Exception as e:
        return ContentGenerationResponse(
            success=False,
            message=f"Error generating content: {str(e)}"
        )

@app.post("/api/schedule-post")
async def schedule_post(post_data: PostData):
    """Schedule a new post"""
    try:
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
            "createdAt": post_data.createdAt
        }
        scheduled_posts.append(post)
        
        # Also save to persistent storage
        if scheduler:
            scheduler.add_post(post)
        
        return {"success": True, "postId": post_id, "message": "Post scheduled successfully"}
    except Exception as e:
        return {"success": False, "message": f"Error scheduling post: {str(e)}"}

@app.get("/api/scheduled-posts")
async def get_scheduled_posts():
    """Get all scheduled posts"""
    try:
        # Refresh from persistent storage
        if scheduler:
            scheduled_posts.clear()
            scheduled_posts.extend(scheduler.get_all_posts())
        
        return {
            "success": True,
            "posts": scheduled_posts,
            "message": "Scheduled posts retrieved successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error retrieving scheduled posts: {str(e)}"
        }

@app.post("/api/post-now/{post_id}")
async def post_now(post_id: str):
    """Execute a post immediately (bypasses scheduling)"""
    try:
        # Find the post
        post = None
        for p in scheduled_posts:
            if p.get("id") == post_id:
                post = p
                break
        
        if not post:
            # Try loading from scheduler
            if scheduler:
                all_posts = scheduler.get_all_posts()
                for p in all_posts:
                    if p.get("id") == post_id:
                        post = p
                        break
        
        if not post:
            return {"success": False, "message": f"Post {post_id} not found"}
        
        # Import executor
        try:
            from services.post_executor import get_post_executor
            executor = get_post_executor()
        except ImportError:
            return {"success": False, "message": "Post executor not available"}
        
        # Update status to "posting"
        if scheduler:
            scheduler.update_post(post_id, {"status": "posting", "postingAt": datetime.now().isoformat()})
        
        # Execute the post
        results = await executor.execute_post(post)
        
        if results.get("success"):
            # Update status
            if scheduler:
                scheduler.update_post(post_id, {
                    "status": "posted",
                    "postedAt": datetime.now().isoformat(),
                    "postResults": results
                })
            
            # Update in-memory copy
            for p in scheduled_posts:
                if p.get("id") == post_id:
                    p["status"] = "posted"
                    p["postedAt"] = datetime.now().isoformat()
                    p["postResults"] = results
                    break
            
            return {
                "success": True,
                "message": "Post executed successfully",
                "results": results
            }
        else:
            # Update status to failed
            if scheduler:
                scheduler.update_post(post_id, {
                    "status": "failed",
                    "failedAt": datetime.now().isoformat(),
                    "error": results.get("errors", ["Unknown error"])
                })
            
            return {
                "success": False,
                "message": "Post execution failed",
                "errors": results.get("errors", ["Unknown error"])
            }
            
    except Exception as e:
        return {"success": False, "message": f"Error executing post: {str(e)}"}

@app.get("/api/media-library")
async def get_media_library():
    """Get media library"""
    try:
        return {
            "success": True,
            "media": media_library,
            "message": "Media library retrieved successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error retrieving media library: {str(e)}"
        }

@app.post("/api/upload-media")
async def upload_media(
    media: UploadFile = File(...),
    userId: str = Form(...),
    title: str = Form("Untitled Media")
):
    """Upload media to the library"""
    try:
        # Read file content
        contents = await media.read()
        
        # Create media entry
        media_id = str(uuid.uuid4())
        media_entry = {
            "id": media_id,
            "name": title,
            "uri": f"data:{media.content_type};base64,{base64.b64encode(contents).decode()}",
            "type": media.content_type.split('/')[0] if '/' in media.content_type else "image",
            "createdAt": datetime.now().isoformat(),
            "userId": userId
        }
        
        media_library.append(media_entry)
        
        return {
            "success": True,
            "status": "success",
            "media": media_entry,
            "message": "Media uploaded successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "status": "error",
            "message": f"Error uploading media: {str(e)}"
        }

@app.get("/api/auto-poster-status")
async def get_auto_poster_status():
    """Get auto poster status"""
    try:
        return {
            "success": True,
            "enabled": auto_poster_status["enabled"],
            "message": "Auto poster status retrieved successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error retrieving auto poster status: {str(e)}"
        }

@app.post("/api/toggle-auto-poster")
async def toggle_auto_poster(request: Dict[str, Any]):
    """Toggle auto poster on/off"""
    try:
        enabled = request.get('enabled', False)
        auto_poster_status["enabled"] = enabled
        return {
            "success": True,
            "enabled": enabled,
            "message": f"Auto poster {'enabled' if enabled else 'disabled'} successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error toggling auto poster: {str(e)}"
        }

# Chat endpoint for M1A Assistant
class ChatRequest(BaseModel):
    message: str = Field(..., description="User's chat message")
    conversation_history: List[Dict[str, str]] = Field(default_factory=list, description="Previous conversation messages")
    system_prompt: Optional[str] = Field(None, description="System prompt for context")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context (persona, screen, etc.)")

class ChatResponse(BaseModel):
    message: str
    metadata: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None
    action: Optional[Dict[str, Any]] = None

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Generate AI chat response using OpenAI"""
    try:
        # Import AI generator
        ai_generator_path = PROJECT_ROOT / "services" / "ai_content_generator.py"
        if ai_generator_path.exists():
            import importlib.util
            spec = importlib.util.spec_from_file_location("ai_content_generator", ai_generator_path)
            ai_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(ai_module)
            ai_generator = ai_module.AIContentGenerator()
        else:
            raise Exception("AI content generator not found")
        
        if not ai_generator.is_available():
            # Fallback response if AI not configured
            return ChatResponse(
                message="I'm here to help! However, AI features are not currently configured. I can still help you navigate the app and answer questions about M1A features. What would you like to know?",
                metadata={"fallback": True, "ai_configured": False},
                suggestions=["How do I create an event?", "Show me the menu", "What can you help me with?"]
            )
        
        # Build messages for OpenAI
        messages = []
        
        # Add system prompt
        system_prompt = request.system_prompt or """You are M1A, an intelligent AI assistant for Merkaba Entertainment. Help users navigate the app, book events, order from the bar menu, and access services. Be conversational, helpful, and provide detailed responses."""
        messages.append({"role": "system", "content": system_prompt})
        
        # Add conversation history
        for msg in request.conversation_history[-10:]:  # Last 10 messages for context
            if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Add current user message
        messages.append({"role": "user", "content": request.message})
        
        # Generate response using OpenAI with shorter timeout for faster fallback
        timeout = httpx.Timeout(8.0, connect=3.0)  # 8s total, 3s connect
        async with httpx.AsyncClient(timeout=timeout) as client:
            openai_key = os.getenv("OPENAI_API_KEY")
            if not openai_key:
                raise Exception("OpenAI API key not configured")
            
            try:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",  # Cost-effective and capable
                        "messages": messages,
                        "max_tokens": 400,  # Reduced for faster responses
                        "temperature": 0.7,  # Balanced creativity
                    }
                )
            except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout) as e:
                raise Exception("Request timed out. Please try again.")
            except httpx.RequestError as e:
                raise Exception(f"Network error: {str(e)}")
            except Exception as e:
                raise Exception(f"API error: {str(e)}")
            
            if response.status_code == 200:
                data = response.json()
                ai_message = data["choices"][0]["message"]["content"]
                
                # Extract navigation intent if present
                action = None
                context = request.context or {}
                lower_message = request.message.lower()
                
                # Check for navigation keywords
                navigation_map = {
                    "event": "EventBooking",
                    "bar": "BarMenu",
                    "menu": "BarMenu",
                    "wallet": "Wallet",
                    "explore": "Explore",
                    "dashboard": "M1ADashboard",
                    "autoposter": "AutoPoster",
                    "profile": "ProfileMain",
                    "settings": "M1ASettings",
                    "help": "Help",
                }
                
                for keyword, screen in navigation_map.items():
                    if keyword in lower_message and ("go to" in lower_message or "take me" in lower_message or "show me" in lower_message or "open" in lower_message):
                        action = {"type": "navigate", "screen": screen}
                        break
                
                return ChatResponse(
                    message=ai_message,
                    metadata={
                        "model": "gpt-4o-mini",
                        "usage": data.get("usage", {}),
                        "ai_configured": True
                    },
                    suggestions=[
                        "Tell me more",
                        "How do I use this?",
                        "What else can you help with?"
                    ],
                    action=action
                )
            else:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                raise Exception(f"OpenAI API error: {response.status_code} - {error_data.get('error', {}).get('message', 'Unknown error')}")
                
    except (httpx.TimeoutException, httpx.ReadTimeout, httpx.ConnectTimeout) as e:
        print(f"Chat API timeout - returning fallback: {e}")
        return ChatResponse(
            message="I'm here to help! The AI service is taking longer than expected. I can still help you navigate the app and answer questions about M1A features. What would you like to know?",
            metadata={"error": "timeout", "fallback": True},
            suggestions=["How do I create an event?", "Show me the menu", "What can you help me with?"]
        )
    except Exception as e:
        print(f"Chat API error: {e}")
        # Return helpful fallback
        return ChatResponse(
            message="I'm here to help! I can assist with navigating the app, creating events, ordering from the bar menu, managing your wallet, and booking services. What would you like help with?",
            metadata={"error": str(e), "fallback": True},
            suggestions=["How do I create an event?", "Show me the menu", "What can you help me with?"]
        )

print("[OK] AutoPoster endpoints loaded")
print("[OK] Chat endpoint loaded")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
