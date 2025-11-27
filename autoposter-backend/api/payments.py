"""
Payment API endpoints for bar orders and Stripe integration
"""
import os
import stripe
import hmac
import hashlib
from fastapi import APIRouter, HTTPException, Depends, status, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, auth

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Initialize Stripe
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Security dependency for Firebase Auth token verification
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verify Firebase Auth ID token from Authorization header
    
    This function verifies that the request includes a valid Firebase Auth ID token
    and returns the authenticated user's information.
    
    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
    """
    try:
        token = credentials.credentials
        
        # Verify token with Firebase Admin SDK
        # This validates the token signature, expiration, and issuer
        decoded_token = auth.verify_id_token(token)
        
        # Return user information from decoded token
        return {
            "userId": decoded_token['uid'],
            "email": decoded_token.get('email'),
            "email_verified": decoded_token.get('email_verified', False)
        }
    except ValueError as e:
        # Invalid token format
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_admin.exceptions.InvalidArgumentError as e:
        # Token verification failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Other errors (network, Firebase service unavailable, etc.)
        print(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class OrderItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int


class CreatePaymentIntentRequest(BaseModel):
    amount: float = Field(..., description="Amount in dollars")
    currency: str = Field(default="usd", description="Currency code")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    orderItems: List[OrderItem] = Field(default_factory=list, description="Order items")


class ConfirmPaymentRequest(BaseModel):
    paymentIntentId: str
    paymentMethodId: str


@router.post("/create-intent")
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    user: dict = Depends(verify_token)
):
    """Create a Stripe payment intent"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        # Create payment intent with Stripe
        intent = stripe.PaymentIntent.create(
            amount=int(request.amount * 100),  # Convert to cents
            currency=request.currency,
            metadata={
                "userId": user.get("userId", "unknown"),
                "orderType": request.metadata.get("orderType", "bar"),
                **request.metadata
            },
            automatic_payment_methods={
                "enabled": True,
            },
        )
        
        return {
            "id": intent.id,
            "client_secret": intent.client_secret,
            "amount": intent.amount,
            "currency": intent.currency,
            "status": intent.status
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment intent: {str(e)}"
        )


@router.post("/confirm")
async def confirm_payment(
    request: ConfirmPaymentRequest,
    user: dict = Depends(verify_token)
):
    """Confirm a payment intent"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        # Confirm payment intent
        intent = stripe.PaymentIntent.confirm(
            request.paymentIntentId,
            payment_method=request.paymentMethodId
        )
        
        return {
            "success": intent.status == "succeeded",
            "paymentIntentId": intent.id,
            "status": intent.status
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm payment: {str(e)}"
        )


@router.get("/health")
async def payment_health():
    """Check payment service health"""
    return {
        "status": "healthy",
        "stripe_configured": bool(STRIPE_SECRET_KEY),
        "timestamp": datetime.now().isoformat()
    }

@router.get("/payment-methods")
async def get_payment_methods(
    customerId: str,
    user: dict = Depends(verify_token)
):
    """Get payment methods for a customer"""
    try:
        if not STRIPE_SECRET_KEY:
            # Return empty array instead of error if Stripe is not configured
            return {
                "paymentMethods": []
            }
        
        import stripe
        
        # Get or create Stripe customer ID from Firestore
        # The customerId parameter is the Firebase user ID, not Stripe customer ID
        db = firestore.client()
        user_ref = db.collection('users').document(user.get("userId"))
        user_doc = user_ref.get()
        
        stripe_customer_id = None
        
        # Check if user already has a Stripe customer ID stored
        if user_doc.exists:
            user_data = user_doc.to_dict()
            stripe_customer_id = user_data.get('stripeCustomerId')
        
        # If no Stripe customer ID exists, create one
        if not stripe_customer_id:
            try:
                customer = stripe.Customer.create(
                    email=user.get("email"),
                    metadata={
                        "userId": user.get("userId"),
                        "firebaseUserId": user.get("userId"),
                        "created_from": "payment_methods_endpoint"
                    }
                )
                stripe_customer_id = customer.id
                # Store the Stripe customer ID in Firestore
                user_ref.set({
                    'stripeCustomerId': stripe_customer_id
                }, merge=True)
            except Exception as create_error:
                # If creation fails, return empty array
                print(f"Failed to create Stripe customer: {str(create_error)}")
                return {
                    "paymentMethods": []
                }
        else:
            # Verify the customer still exists in Stripe
            try:
                customer = stripe.Customer.retrieve(stripe_customer_id)
            except stripe.error.InvalidRequestError as e:
                if "No such customer" in str(e):
                    # Customer was deleted in Stripe, create a new one
                    try:
                        customer = stripe.Customer.create(
                            email=user.get("email"),
                            metadata={
                                "userId": user.get("userId"),
                                "firebaseUserId": user.get("userId"),
                                "created_from": "payment_methods_endpoint_recreate"
                            }
                        )
                        stripe_customer_id = customer.id
                        # Update Firestore with new customer ID
                        user_ref.set({
                            'stripeCustomerId': stripe_customer_id
                        }, merge=True)
                    except Exception as create_error:
                        print(f"Failed to recreate Stripe customer: {str(create_error)}")
                        return {
                            "paymentMethods": []
                        }
                else:
                    # Other Stripe error, return empty array
                    print(f"Stripe error retrieving customer: {str(e)}")
                    return {
                        "paymentMethods": []
                    }
        
        # List payment methods for customer
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=stripe_customer_id,
                type="card"
            )
        except stripe.error.InvalidRequestError as e:
            # If listing fails (e.g., customer doesn't exist), return empty array
            print(f"Stripe error listing payment methods: {str(e)}")
            return {
                "paymentMethods": []
            }
        
        # Get customer's default payment method
        default_payment_method_id = None
        if hasattr(customer, 'invoice_settings') and customer.invoice_settings:
            default_payment_method_id = customer.invoice_settings.get('default_payment_method')
        
        # Format payment methods
        formatted_methods = []
        for pm in payment_methods.data:
            formatted_methods.append({
                "id": pm.id,
                "type": pm.type,
                "card": {
                    "brand": pm.card.brand if hasattr(pm, 'card') and pm.card else None,
                    "last4": pm.card.last4 if hasattr(pm, 'card') and pm.card else None,
                    "exp_month": pm.card.exp_month if hasattr(pm, 'card') and pm.card else None,
                    "exp_year": pm.card.exp_year if hasattr(pm, 'card') and pm.card else None,
                },
                "isDefault": pm.id == default_payment_method_id,
            })
        
        return {
            "paymentMethods": formatted_methods
        }
    except stripe.error.StripeError as e:
        # Return empty array instead of error for Stripe errors
        print(f"Stripe error in get_payment_methods: {str(e)}")
        return {
            "paymentMethods": []
        }
    except Exception as e:
        # Return empty array instead of error for unexpected errors
        print(f"Unexpected error in get_payment_methods: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "paymentMethods": []
        }

@router.post("/payment-methods")
async def add_payment_method(
    request: dict,
    user: dict = Depends(verify_token)
):
    """Attach a payment method to a customer"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        import stripe
        customer_id = request.get("customerId")
        payment_method_id = request.get("paymentMethodId")
        
        # Attach payment method to customer
        payment_method = stripe.PaymentMethod.attach(
            payment_method_id,
            customer=customer_id
        )
        
        return {
            "success": True,
            "paymentMethod": {
                "id": payment_method.id,
                "type": payment_method.type,
            }
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add payment method: {str(e)}"
        )

@router.post("/payment-methods/default")
async def set_default_payment_method(
    request: dict,
    user: dict = Depends(verify_token)
):
    """Set default payment method for a customer"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        import stripe
        customer_id = request.get("customerId")
        payment_method_id = request.get("paymentMethodId")
        
        # Update customer's default payment method
        customer = stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id}
        )
        
        return {
            "success": True,
            "paymentMethod": {
                "id": payment_method_id,
                "isDefault": True
            }
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set default payment method: {str(e)}"
        )

@router.delete("/payment-methods/{payment_method_id}")
async def delete_payment_method(
    payment_method_id: str,
    user: dict = Depends(verify_token)
):
    """Delete a payment method"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        import stripe
        # Detach payment method from customer
        stripe.PaymentMethod.detach(payment_method_id)
        
        return {"success": True}
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete payment method: {str(e)}"
        )


# Initialize Firebase Admin SDK for webhook operations
def get_firestore_client():
    """Get Firestore client for wallet updates"""
    try:
        if not firebase_admin._apps:
            # Initialize Firebase Admin if not already initialized
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                # Try default credentials
                firebase_admin.initialize_app()
        return firestore.client()
    except Exception as e:
        print(f"Warning: Firebase Admin not available: {e}")
        return None


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """
    Stripe webhook endpoint for payment events
    CRITICAL: This is the source of truth for payment status
    
    Note: We use request.body() to get raw bytes for signature verification.
    FastAPI's Request.body() returns the raw request body which Stripe needs.
    """
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured"
            )
        
        # Get webhook secret from environment
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        if not webhook_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET environment variable."
            )
        
        if not stripe_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing stripe-signature header"
            )
        
        # Get raw body (bytes) for signature verification
        body = await request.body()
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                body,
                stripe_signature,
                webhook_secret
            )
        except ValueError as e:
            # Invalid payload
            print(f"Webhook error - Invalid payload: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid payload: {str(e)}"
            )
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature - SECURITY ALERT
            print(f"SECURITY ALERT - Invalid webhook signature: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid signature: {str(e)}"
            )
        
        # Handle the event
        event_type = event['type']
        payment_intent = event['data']['object']
        
        if event_type == 'payment_intent.succeeded':
            # Payment succeeded - update wallet balance
            await handle_payment_succeeded(payment_intent)
            
        elif event_type == 'payment_intent.payment_failed':
            # Payment failed - update transaction status
            await handle_payment_failed(payment_intent)
            
        elif event_type == 'payment_intent.canceled':
            # Payment canceled - update transaction status
            await handle_payment_canceled(payment_intent)
        
        return {"status": "success", "event": event_type}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Webhook processing failed: {str(e)}"
        )


async def handle_payment_succeeded(payment_intent: dict):
    """Handle successful payment - update wallet balance"""
    try:
        db = get_firestore_client()
        if not db:
            print("Warning: Firestore not available, cannot update wallet")
            return
        
        # Get metadata
        metadata = payment_intent.get('metadata', {})
        userId = metadata.get('userId')
        amount = payment_intent.get('amount', 0) / 100.0  # Convert cents to dollars
        payment_intent_id = payment_intent.get('id')
        
        if not userId:
            print(f"Warning: No userId in payment intent metadata: {payment_intent_id}")
            return
        
        # Update wallet balance
        wallet_ref = db.collection('wallets').document(userId)
        wallet_doc = wallet_ref.get()
        
        if wallet_doc.exists:
            current_balance = wallet_doc.to_dict().get('balance', 0)
            new_balance = current_balance + amount
            wallet_ref.update({
                'balance': new_balance,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'lastTransactionId': payment_intent_id
            })
        else:
            # Create wallet if it doesn't exist
            wallet_ref.set({
                'balance': amount,
                'currency': 'USD',
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP,
                'userId': userId,
                'status': 'active',
                'lastTransactionId': payment_intent_id
            })
        
        # Update transaction status
        transactions_ref = db.collection('walletTransactions')
        query = transactions_ref.where('paymentIntentId', '==', payment_intent_id)
        transactions = query.stream()
        
        for transaction in transactions:
            transaction.reference.update({
                'status': 'completed',
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
        
        # If no transaction found, create one
        if not any(True for _ in transactions):
            transactions_ref.add({
                'userId': userId,
                'type': 'received',
                'amount': amount,
                'description': f'Added funds via payment',
                'status': 'completed',
                'paymentMethod': 'Stripe',
                'paymentIntentId': payment_intent_id,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'createdAt': firestore.SERVER_TIMESTAMP
            })
        
        print(f"✅ Payment succeeded: Updated wallet for user {userId}, amount: ${amount}")
        
    except Exception as e:
        print(f"Error handling payment succeeded: {str(e)}")
        raise


async def handle_payment_failed(payment_intent: dict):
    """Handle failed payment - update transaction status"""
    try:
        db = get_firestore_client()
        if not db:
            return
        
        payment_intent_id = payment_intent.get('id')
        error_message = payment_intent.get('last_payment_error', {}).get('message', 'Payment failed')
        
        # Update transaction status
        transactions_ref = db.collection('walletTransactions')
        query = transactions_ref.where('paymentIntentId', '==', payment_intent_id)
        transactions = query.stream()
        
        for transaction in transactions:
            transaction.reference.update({
                'status': 'failed',
                'error': error_message,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
        
        print(f"❌ Payment failed: {payment_intent_id}, error: {error_message}")
        
    except Exception as e:
        print(f"Error handling payment failed: {str(e)}")


async def handle_payment_canceled(payment_intent: dict):
    """Handle canceled payment - update transaction status"""
    try:
        db = get_firestore_client()
        if not db:
            return
        
        payment_intent_id = payment_intent.get('id')
        
        # Update transaction status
        transactions_ref = db.collection('walletTransactions')
        query = transactions_ref.where('paymentIntentId', '==', payment_intent_id)
        transactions = query.stream()
        
        for transaction in transactions:
            transaction.reference.update({
                'status': 'canceled',
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
        
        print(f"⚠️ Payment canceled: {payment_intent_id}")
        
    except Exception as e:
        print(f"Error handling payment canceled: {str(e)}")


@router.post("/payouts/create")
async def create_payout(
    request: dict,
    user: dict = Depends(verify_token)
):
    """Create a payout (cash out) to bank account"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured"
            )
        
        userId = request.get('userId')
        amount = request.get('amount')  # Amount in cents
        bankAccountId = request.get('bankAccountId')
        
        if not userId or not amount or not bankAccountId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required fields: userId, amount, bankAccountId"
            )
        
        # Create payout via Stripe
        # Note: This requires Stripe Connect for payouts
        # For now, return a mock response
        payout = stripe.Payout.create(
            amount=amount,
            currency='usd',
            destination=bankAccountId,
            metadata={
                'userId': userId,
                'transactionId': request.get('metadata', {}).get('transactionId', ''),
            }
        )
        
        return {
            'success': True,
            'id': payout.id,
            'status': payout.status,
            'amount': payout.amount,
        }
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payout: {str(e)}"
        )


