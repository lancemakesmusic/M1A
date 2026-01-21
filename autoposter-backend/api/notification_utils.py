import os
import re
from typing import Optional, List
import requests


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    raw = phone.strip()
    if raw.startswith("+"):
        digits = re.sub(r"\D", "", raw)
        return f"+{digits}" if digits else None
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) > 10 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}"


def send_email_via_sendgrid(
    to_emails: List[str],
    subject: str,
    html: str,
    text: Optional[str] = None,
    from_email: Optional[str] = None,
):
    api_key = os.getenv("SENDGRID_API_KEY")
    sender = from_email or os.getenv("EMAIL_FROM", "noreply@merkabaent.com")

    if not api_key:
        return {"success": False, "error": "SENDGRID_API_KEY not configured"}

    if not to_emails:
        return {"success": False, "error": "No recipient emails provided"}

    content = [{"type": "text/html", "value": html}]
    if text:
        content.append({"type": "text/plain", "value": text})

    payload = {
        "personalizations": [{"to": [{"email": email} for email in to_emails]}],
        "from": {"email": sender},
        "subject": subject,
        "content": content,
    }

    response = requests.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )

    if response.status_code in (200, 202):
        return {"success": True}

    return {
        "success": False,
        "error": f"SendGrid error: {response.status_code} {response.text}",
    }


def send_sms_via_twilio(to_phone: str, message: str):
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_phone = os.getenv("TWILIO_PHONE_NUMBER")

    if not account_sid or not auth_token or not from_phone:
        return {"success": False, "error": "Twilio not configured"}

    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
        auth=(account_sid, auth_token),
        data={
            "From": from_phone,
            "To": to_phone,
            "Body": message,
        },
        timeout=15,
    )

    if 200 <= response.status_code < 300:
        return {"success": True}

    return {
        "success": False,
        "error": f"Twilio error: {response.status_code} {response.text}",
    }
