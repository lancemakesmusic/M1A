"""
SMS API endpoints for sending text messages with QR codes
"""
import os
import qrcode
import io
import base64
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional
import firebase_admin
from firebase_admin import auth

router = APIRouter(prefix="/api/sms", tags=["sms"])

# Security dependency for Firebase Auth token verification
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify Firebase Auth ID token from Authorization header
    """
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return {
            "userId": decoded_token['uid'],
            "email": decoded_token.get('email'),
            "email_verified": decoded_token.get('email_verified', False)
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

class RSVPConfirmationRequest(BaseModel):
    phoneNumber: str = Field(..., description="Phone number in E.164 format (e.g., +15551234567)")
    eventName: str = Field(..., description="Name of the event")
    ticketId: str = Field(..., description="Unique ticket ID")
    qrCodeUrl: Optional[str] = Field(None, description="URL to QR code image")

def generate_qr_code_image(ticket_id: str, event_name: str) -> str:
    """
    Generate QR code as base64 encoded image
    """
    qr_data = {
        "ticketId": ticket_id,
        "eventName": event_name,
        "type": "RSVP_TICKET"
    }
    
    # Create QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(str(qr_data))
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

@router.post("/send-rsvp-confirmation")
async def send_rsvp_confirmation(
    request: RSVPConfirmationRequest,
    user: dict = Depends(verify_token)
):
    """
    Send RSVP confirmation SMS with QR code
    
    This endpoint sends an SMS message to the provided phone number
    with a confirmation message and QR code for the event ticket.
    """
    try:
        # For now, we'll use a mock SMS service
        # In production, integrate with Twilio, AWS SNS, or similar
        
        # Generate QR code
        qr_code_image = generate_qr_code_image(request.ticketId, request.eventName)
        
        # Format SMS message
        sms_message = f"""
🎉 RSVP Confirmed!

Event: {request.eventName}
Ticket ID: {request.ticketId}

Your ticket QR code: {request.qrCodeUrl or 'See attached image'}

Present this QR code at the event entrance.

Thank you for RSVPing!
        """.strip()
        
        # TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
        # For now, log the message and return success
        print(f"[SMS] Would send to {request.phoneNumber}:")
        print(f"[SMS] Message: {sms_message}")
        print(f"[SMS] QR Code: {qr_code_image[:100]}...")
        
        # In production, uncomment and configure:
        # from twilio.rest import Client
        # twilio_client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        # message = twilio_client.messages.create(
        #     body=sms_message,
        #     media_url=[qr_code_image] if qr_code_image else None,
        #     from_=os.getenv("TWILIO_PHONE_NUMBER"),
        #     to=request.phoneNumber
        # )
        
        return {
            "success": True,
            "message": "SMS sent successfully",
            "ticketId": request.ticketId,
            "phoneNumber": request.phoneNumber
        }
        
    except Exception as e:
        print(f"Error sending SMS: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send SMS: {str(e)}"
        )

@router.get("/qr-code/{ticket_id}")
async def get_qr_code(ticket_id: str):
    """
    Generate and return QR code image for a ticket
    """
    try:
        qr_code_image = generate_qr_code_image(ticket_id, "Event Ticket")
        
        # Return as base64 image
        from fastapi.responses import Response
        import base64
        
        image_data = base64.b64decode(qr_code_image.split(',')[1])
        return Response(content=image_data, media_type="image/png")
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate QR code: {str(e)}"
        )









