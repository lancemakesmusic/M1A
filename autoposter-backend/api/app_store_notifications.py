"""
App Store Server Notifications Handler
Handles App Store Server-to-Server notifications for in-app purchases and subscriptions
"""

import os
import json
import hmac
import hashlib
from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
from datetime import datetime
import firebase_admin
from firebase_admin import firestore
import httpx

router = APIRouter(prefix="/api/app-store", tags=["app-store"])

# Initialize Firestore
try:
    db = firestore.client()
except:
    db = None

# App Store configuration
APP_STORE_SHARED_SECRET = os.getenv("APP_STORE_SHARED_SECRET", "")
APP_STORE_PRODUCTION_URL = "https://api.storekit.itunes.apple.com"
APP_STORE_SANDBOX_URL = "https://api.storekit-sandbox.itunes.apple.com"


def verify_app_store_signature(payload: bytes, signature: str, shared_secret: str) -> bool:
    """
    Verify App Store Server Notification signature
    
    Args:
        payload: Raw request body
        signature: x-app-store-signature header value
        shared_secret: App-specific shared secret
        
    Returns:
        True if signature is valid
    """
    try:
        # App Store uses HMAC-SHA256
        expected_signature = hmac.new(
            shared_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        print(f"Error verifying signature: {e}")
        return False


async def verify_receipt(receipt_data: str, is_sandbox: bool = False) -> dict:
    """
    Verify receipt with App Store
    
    Note: This is a helper function. App Store Server Notifications
    already include verified receipt data, so this is mainly for
    client-side receipt validation if needed.
    
    Args:
        receipt_data: Base64-encoded receipt data
        is_sandbox: Whether to use sandbox environment
        
    Returns:
        Receipt verification response
    """
    # Note: App Store Server Notifications v2 uses JWT tokens
    # For receipt verification, use the receipt validation API
    # This function is kept for reference but notifications
    # already contain verified transaction data
    
    url = APP_STORE_SANDBOX_URL if is_sandbox else APP_STORE_PRODUCTION_URL
    url += "/inApps/v1/verifyReceipt"
    
    payload = {
        "receipt-data": receipt_data,
        "password": APP_STORE_SHARED_SECRET,
        "exclude-old-transactions": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            return response.json()
    except Exception as e:
        print(f"Error verifying receipt: {e}")
        return {"status": 21000, "error": str(e)}


@router.post("/notifications")
async def handle_app_store_notification(
    request: Request,
    x_app_store_signature: Optional[str] = Header(None, alias="x-app-store-signature"),
    x_app_store_original_transaction_id: Optional[str] = Header(None, alias="x-app-store-original-transaction-id"),
    x_app_store_notification_type: Optional[str] = Header(None, alias="x-app-store-notification-type")
):
    """
    Handle App Store Server-to-Server notifications
    
    This endpoint receives notifications from Apple about:
    - Subscription status changes
    - Purchase events
    - Refund events
    - Renewal events
    
    Documentation: https://developer.apple.com/documentation/appstoreservernotifications
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        
        # Verify signature
        if not x_app_store_signature or not APP_STORE_SHARED_SECRET:
            print("⚠️  Missing signature or shared secret")
            # In production, you should reject, but for development we'll log
            if os.getenv("ENVIRONMENT") == "production":
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        if x_app_store_signature and APP_STORE_SHARED_SECRET:
            if not verify_app_store_signature(body, x_app_store_signature, APP_STORE_SHARED_SECRET):
                print("❌ Invalid signature")
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Parse notification
        notification = json.loads(body.decode('utf-8'))
        notification_type = notification.get("notification_type")
        unified_receipt = notification.get("unified_receipt", {})
        
        print(f"📱 App Store Notification: {notification_type}")
        print(f"   Transaction ID: {x_app_store_original_transaction_id}")
        
        # Handle different notification types
        if notification_type == "INITIAL_BUY":
            await handle_initial_purchase(notification, unified_receipt)
        elif notification_type == "DID_RENEW":
            await handle_renewal(notification, unified_receipt)
        elif notification_type == "DID_FAIL_TO_RENEW":
            await handle_renewal_failure(notification, unified_receipt)
        elif notification_type == "DID_CHANGE_RENEWAL_PREF":
            await handle_renewal_preference_change(notification, unified_receipt)
        elif notification_type == "CANCEL":
            await handle_cancellation(notification, unified_receipt)
        elif notification_type == "REFUND":
            await handle_refund(notification, unified_receipt)
        elif notification_type == "REVOKE":
            await handle_revocation(notification, unified_receipt)
        else:
            print(f"⚠️  Unhandled notification type: {notification_type}")
        
        # Store notification for audit
        if db:
            try:
                db.collection("app_store_notifications").add({
                    "notification_type": notification_type,
                    "original_transaction_id": x_app_store_original_transaction_id,
                    "payload": notification,
                    "received_at": firestore.SERVER_TIMESTAMP,
                    "processed": True
                })
            except Exception as e:
                print(f"Error storing notification: {e}")
        
        return {"status": "success"}
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        print(f"Error handling notification: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def handle_initial_purchase(notification: dict, unified_receipt: dict):
    """Handle initial purchase/subscription"""
    print("✅ Initial purchase detected")
    
    # Extract transaction info
    latest_receipt_info = unified_receipt.get("latest_receipt_info", [])
    if latest_receipt_info:
        transaction = latest_receipt_info[0]
        original_transaction_id = transaction.get("original_transaction_id")
        product_id = transaction.get("product_id")
        
        # Update user subscription in Firestore
        if db:
            try:
                # Find user by transaction ID or product ID
                # You'll need to map this to your user system
                # For now, we'll store the transaction
                db.collection("subscriptions").document(original_transaction_id).set({
                    "status": "active",
                    "product_id": product_id,
                    "original_transaction_id": original_transaction_id,
                    "purchased_at": datetime.utcnow(),
                    "expires_at": datetime.fromtimestamp(int(transaction.get("expires_date_ms", 0)) / 1000),
                    "environment": unified_receipt.get("environment", "Production")
                }, merge=True)
            except Exception as e:
                print(f"Error updating subscription: {e}")


async def handle_renewal(notification: dict, unified_receipt: dict):
    """Handle subscription renewal"""
    print("🔄 Subscription renewed")
    
    latest_receipt_info = unified_receipt.get("latest_receipt_info", [])
    if latest_receipt_info:
        transaction = latest_receipt_info[0]
        original_transaction_id = transaction.get("original_transaction_id")
        
        if db:
            try:
                db.collection("subscriptions").document(original_transaction_id).update({
                    "status": "active",
                    "renewed_at": datetime.utcnow(),
                    "expires_at": datetime.fromtimestamp(int(transaction.get("expires_date_ms", 0)) / 1000)
                })
            except Exception as e:
                print(f"Error updating renewal: {e}")


async def handle_renewal_failure(notification: dict, unified_receipt: dict):
    """Handle subscription renewal failure"""
    print("❌ Subscription renewal failed")
    
    latest_receipt_info = unified_receipt.get("latest_receipt_info", [])
    if latest_receipt_info:
        transaction = latest_receipt_info[0]
        original_transaction_id = transaction.get("original_transaction_id")
        
        if db:
            try:
                db.collection("subscriptions").document(original_transaction_id).update({
                    "status": "failed",
                    "renewal_failed_at": datetime.utcnow()
                })
            except Exception as e:
                print(f"Error updating renewal failure: {e}")


async def handle_renewal_preference_change(notification: dict, unified_receipt: dict):
    """Handle renewal preference change (auto-renew on/off)"""
    print("⚙️  Renewal preference changed")
    
    # Update subscription settings
    # Implementation depends on your subscription model


async def handle_cancellation(notification: dict, unified_receipt: dict):
    """Handle subscription cancellation"""
    print("🚫 Subscription cancelled")
    
    latest_receipt_info = unified_receipt.get("latest_receipt_info", [])
    if latest_receipt_info:
        transaction = latest_receipt_info[0]
        original_transaction_id = transaction.get("original_transaction_id")
        
        if db:
            try:
                db.collection("subscriptions").document(original_transaction_id).update({
                    "status": "cancelled",
                    "cancelled_at": datetime.utcnow()
                })
            except Exception as e:
                print(f"Error updating cancellation: {e}")


async def handle_refund(notification: dict, unified_receipt: dict):
    """Handle refund"""
    print("💰 Refund processed")
    
    # Update subscription status
    # Revoke access if needed


async def handle_revocation(notification: dict, unified_receipt: dict):
    """Handle subscription revocation (family sharing)"""
    print("🔒 Subscription revoked")
    
    # Revoke access
    # Update subscription status


@router.get("/health")
async def app_store_health():
    """Health check for App Store notification endpoint"""
    return {
        "status": "healthy",
        "shared_secret_configured": bool(APP_STORE_SHARED_SECRET),
        "timestamp": datetime.utcnow().isoformat()
    }

