"""
Google Calendar Events API
Creates calendar events in admin's calendar and user's calendar after booking confirmation
"""
import os
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Firebase Admin imports with lazy initialization
try:
    import firebase_admin
    from firebase_admin import firestore, auth, credentials
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    firebase_admin = None
    firestore = None
    auth = None
    print("⚠️ Firebase Admin SDK not available")

# Google Calendar API imports
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    GOOGLE_CALENDAR_AVAILABLE = True
except ImportError:
    GOOGLE_CALENDAR_AVAILABLE = False
    print("⚠️ Google Calendar API libraries not installed. Install with: pip install google-auth google-api-python-client")

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

# Security dependency
security = HTTPBearer()

def _ensure_firebase_initialized():
    """Ensure Firebase Admin is initialized"""
    if not FIREBASE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK not available"
        )
    
    if not firebase_admin._apps:
        # Try to initialize Firebase Admin
        try:
            # Try using service account file
            service_account_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.getenv("FIREBASE_SERVICE_ACCOUNT_FILE")
            if service_account_file and os.path.exists(service_account_file):
                cred = credentials.Certificate(service_account_file)
                firebase_admin.initialize_app(cred)
            else:
                # Try default credentials (for Cloud Run)
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"⚠️ Firebase initialization failed: {e}")
            # Continue anyway - some endpoints might work without Firebase

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Firebase Auth ID token"""
    _ensure_firebase_initialized()
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return {
            "userId": decoded_token['uid'],
            "email": decoded_token.get('email'),
            "email_verified": decoded_token.get('email_verified', False)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )

# Environment variables
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
ADMIN_CALENDAR_ID = os.getenv("GOOGLE_BUSINESS_CALENDAR_ID", os.getenv("EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID", ""))
ADMIN_EMAIL = "admin@merkabaent.com"

# Request models
class CalendarEventRequest(BaseModel):
    title: str = Field(..., description="Event title")
    description: str = Field(default="", description="Event description")
    startTime: str = Field(..., description="Event start time (ISO format)")
    endTime: str = Field(..., description="Event end time (ISO format)")
    location: str = Field(default="Merkaba Venue", description="Event location")
    attendees: List[Dict[str, str]] = Field(default_factory=list, description="Event attendees")
    bookingId: Optional[str] = Field(None, description="Booking ID for reference")
    bookingType: str = Field(..., description="Type of booking: 'event' or 'service'")
    userEmail: Optional[str] = Field(None, description="User's email (for user calendar if connected)")

class AvailabilityCheckRequest(BaseModel):
    startTime: str = Field(..., description="Start time (ISO format)")
    endTime: str = Field(..., description="End time (ISO format)")

def get_calendar_service():
    """Get Google Calendar service using service account"""
    if not GOOGLE_CALENDAR_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Calendar API libraries not installed"
        )
    
    # Try service account file first
    if GOOGLE_SERVICE_ACCOUNT_FILE and os.path.exists(GOOGLE_SERVICE_ACCOUNT_FILE):
        try:
            credentials = service_account.Credentials.from_service_account_file(
                GOOGLE_SERVICE_ACCOUNT_FILE,
                scopes=['https://www.googleapis.com/auth/calendar']
            )
            return build('calendar', 'v3', credentials=credentials)
        except Exception as e:
            print(f"Error loading service account from file: {e}")
    
    # Try GOOGLE_APPLICATION_CREDENTIALS
    if GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
        try:
            credentials = service_account.Credentials.from_service_account_file(
                GOOGLE_APPLICATION_CREDENTIALS,
                scopes=['https://www.googleapis.com/auth/calendar']
            )
            return build('calendar', 'v3', credentials=credentials)
        except Exception as e:
            print(f"Error loading service account from GOOGLE_APPLICATION_CREDENTIALS: {e}")
    
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Google Service Account not configured. Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_APPLICATION_CREDENTIALS"
    )

def get_user_calendar_token(userId: str) -> Optional[str]:
    """Get user's Google Calendar OAuth token from Firestore"""
    try:
        if not FIREBASE_AVAILABLE or not firestore:
            return None
        
        _ensure_firebase_initialized()
        db = firestore.client()
        user_ref = db.collection('users').document(userId)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return None
        
        user_data = user_doc.to_dict()
        # Check for stored Google Calendar token
        # This would be set when user connects their Google Calendar
        return user_data.get('googleCalendarAccessToken')
    except Exception as e:
        print(f"Error getting user calendar token: {e}")
        return None

@router.post("/check-availability")
async def check_availability(
    request: AvailabilityCheckRequest,
    user: dict = Depends(verify_token)
):
    """
    Check if a time slot is available in admin's calendar
    Uses admin's service account to check for conflicts
    """
    if not ADMIN_CALENDAR_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin calendar ID not configured"
        )
    
    try:
        start_time = request.startTime
        end_time = request.endTime
        
        # Get calendar service (uses admin's service account)
        calendar_service = get_calendar_service()
        
        # Check for conflicts using freebusy API
        freebusy_request = {
            'timeMin': start_time,
            'timeMax': end_time,
            'items': [{'id': ADMIN_CALENDAR_ID}]
        }
        
        freebusy_result = calendar_service.freebusy().query(body=freebusy_request).execute()
        
        # Check if calendar is busy during this time
        calendar_busy = freebusy_result.get('calendars', {}).get(ADMIN_CALENDAR_ID, {}).get('busy', [])
        
        if calendar_busy:
            # Time slot is busy - find conflicting events
            conflicts = []
            for busy_period in calendar_busy:
                conflicts.append({
                    'start': busy_period.get('start'),
                    'end': busy_period.get('end')
                })
            
            return {
                "available": False,
                "reason": f"Time slot is already booked. Conflicts: {len(conflicts)} existing event(s).",
                "conflicts": conflicts
            }
        
        return {
            "available": True,
            "reason": "Time slot is available"
        }
        
    except HttpError as e:
        error_msg = e.content.decode() if hasattr(e, 'content') else str(e)
        print(f"Error checking availability: {error_msg}")
        # Return available on error (backend will check again before creating)
        return {
            "available": True,
            "reason": "Unable to verify availability, but proceeding",
            "warning": True
        }
    except Exception as e:
        print(f"Error checking availability: {e}")
        # Return available on error (backend will check again before creating)
        return {
            "available": True,
            "reason": "Unable to verify availability, but proceeding",
            "warning": True
        }

@router.post("/create-event")
async def create_calendar_event(
    event_data: CalendarEventRequest,
    user: dict = Depends(verify_token)
):
    """
    Create calendar event in admin's calendar and optionally user's calendar
    
    This endpoint:
    1. Checks availability FIRST (prevents double booking)
    2. Always creates event in admin@merkabaent.com's calendar
    3. Also creates event in user's calendar if they have Google Calendar connected
    """
    if not ADMIN_CALENDAR_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin calendar ID not configured. Set GOOGLE_BUSINESS_CALENDAR_ID"
        )
    
    results = {
        "admin_calendar": {"success": False, "error": None},
        "user_calendar": {"success": False, "error": None, "skipped": True}
    }
    
    try:
        # Get calendar service
        calendar_service = get_calendar_service()
        
        # CRITICAL: Check availability BEFORE creating event (prevents double booking)
        try:
            freebusy_request = {
                'timeMin': event_data.startTime,
                'timeMax': event_data.endTime,
                'items': [{'id': ADMIN_CALENDAR_ID}]
            }
            
            freebusy_result = calendar_service.freebusy().query(body=freebusy_request).execute()
            calendar_busy = freebusy_result.get('calendars', {}).get(ADMIN_CALENDAR_ID, {}).get('busy', [])
            
            if calendar_busy:
                # Time slot is already booked - reject the booking
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Time slot is already booked. Please select another time. Conflicts: {len(calendar_busy)} existing event(s)."
                )
        except HTTPException:
            raise  # Re-raise HTTP exceptions (conflicts)
        except Exception as e:
            # Log but don't block on availability check errors (fail open for reliability)
            print(f"⚠️ Availability check error (proceeding): {e}")
        
        # Prepare event data
        event = {
            'summary': event_data.title,
            'description': event_data.description,
            'start': {
                'dateTime': event_data.startTime,
                'timeZone': 'America/New_York',
            },
            'end': {
                'dateTime': event_data.endTime,
                'timeZone': 'America/New_York',
            },
            'location': event_data.location,
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 24 hours before
                    {'method': 'popup', 'minutes': 10},  # 10 minutes before
                ],
            },
        }
        
        # Add attendees if provided
        if event_data.attendees:
            event['attendees'] = [
                {'email': attendee.get('email')} for attendee in event_data.attendees
            ]
        
        # 1. Create event in admin's calendar (ALWAYS)
        try:
            admin_event = calendar_service.events().insert(
                calendarId=ADMIN_CALENDAR_ID,
                body=event
            ).execute()
            
            results["admin_calendar"] = {
                "success": True,
                "eventId": admin_event.get('id'),
                "htmlLink": admin_event.get('htmlLink'),
                "message": "Event created in admin calendar"
            }
            print(f"✅ Created event in admin calendar: {admin_event.get('id')}")
        except HttpError as e:
            error_msg = e.content.decode() if hasattr(e, 'content') else str(e)
            results["admin_calendar"] = {
                "success": False,
                "error": f"Failed to create event in admin calendar: {error_msg}"
            }
            print(f"❌ Error creating event in admin calendar: {error_msg}")
        
        # 2. Create event in user's calendar (if they have Google Calendar connected)
        user_calendar_token = get_user_calendar_token(user["userId"])
        if user_calendar_token:
            try:
                # Use user's OAuth token to create event in their calendar
                from google.oauth2.credentials import Credentials
                user_credentials = Credentials(token=user_calendar_token)
                user_calendar_service = build('calendar', 'v3', credentials=user_credentials)
                
                # Create event in user's primary calendar
                user_event = user_calendar_service.events().insert(
                    calendarId='primary',
                    body=event
                ).execute()
                
                results["user_calendar"] = {
                    "success": True,
                    "eventId": user_event.get('id'),
                    "htmlLink": user_event.get('htmlLink'),
                    "message": "Event created in user calendar",
                    "skipped": False
                }
                print(f"✅ Created event in user calendar: {user_event.get('id')}")
            except Exception as e:
                results["user_calendar"] = {
                    "success": False,
                    "error": f"Failed to create event in user calendar: {str(e)}",
                    "skipped": False
                }
                print(f"⚠️ Error creating event in user calendar: {e}")
        else:
            results["user_calendar"]["skipped"] = True
            results["user_calendar"]["message"] = "User calendar not connected"
            print("ℹ️ User calendar not connected, skipping user calendar event")
        
        # Return success if at least admin calendar event was created
        if results["admin_calendar"]["success"]:
            return {
                "success": True,
                "results": results,
                "message": "Calendar events created successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create calendar events",
                results=results
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating calendar events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create calendar events: {str(e)}"
        )

@router.get("/health")
async def calendar_health():
    """Check calendar service health"""
    try:
        if not GOOGLE_CALENDAR_AVAILABLE:
            return {
                "status": "unavailable",
                "message": "Google Calendar API libraries not installed"
            }
        
        if not ADMIN_CALENDAR_ID:
            return {
                "status": "unconfigured",
                "message": "Admin calendar ID not configured"
            }
        
        # Try to get calendar service
        try:
            calendar_service = get_calendar_service()
            return {
                "status": "healthy",
                "admin_calendar_id": ADMIN_CALENDAR_ID,
                "service_account_configured": bool(GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_APPLICATION_CREDENTIALS)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Service account not configured: {str(e)}"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

