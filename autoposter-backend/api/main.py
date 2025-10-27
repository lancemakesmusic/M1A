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

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import jwt
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
