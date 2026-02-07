"""
Email API endpoints for sending transactional emails
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from firebase_admin import auth

from .notification_utils import send_email_via_sendgrid

def _sanitize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    return value.replace("<", "").replace(">", "").strip()


router = APIRouter(prefix="/api", tags=["email"])

security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return {
            "userId": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
        )


class EmailRequest(BaseModel):
    to: List[str] = Field(..., description="Recipient emails")
    subject: str = Field(..., description="Email subject")
    html: str = Field(..., description="HTML email body")
    text: Optional[str] = Field(None, description="Plain text body")
    from_email: Optional[str] = Field(None, description="Override sender email")


@router.post("/send-email")
async def send_email(request: EmailRequest, user: dict = Depends(verify_token)):
    try:
        subject = _sanitize_text(request.subject)
        text = _sanitize_text(request.text)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email subject is required."
            )

        result = send_email_via_sendgrid(
            to_emails=request.to,
            subject=subject,
            html=request.html,
            text=text,
            from_email=request.from_email,
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=result.get("error", "Email service unavailable"),
            )

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}",
        )
