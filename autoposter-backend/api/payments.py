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
import httpx

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


class CreateCheckoutSessionRequest(BaseModel):
    amount: float = Field(..., description="Amount in dollars")
    currency: str = Field(default="usd", description="Currency code")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    orderItems: List[OrderItem] = Field(default_factory=list, description="Order items")
    successUrl: str = Field(..., description="URL to redirect to on success")
    cancelUrl: str = Field(..., description="URL to redirect to on cancel")


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


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    user: dict = Depends(verify_token)
):
    """Create a Stripe Checkout Session for payment"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        # Build line items for checkout session
        # Try to use existing Stripe Products/Prices first, fallback to creating on-the-fly
        line_items = []
        if request.orderItems and len(request.orderItems) > 0:
            for item in request.orderItems:
                # Try to find matching Stripe product/price
                try:
                    from api.stripe_products import get_price_id_for_product
                    price_id = get_price_id_for_product(item.name, item.price, request.currency)
                    
                    if price_id:
                        # Use existing Stripe Price
                        line_items.append({
                            'price': price_id,
                            'quantity': item.quantity,
                        })
                        print(f"Using Stripe Price ID {price_id} for {item.name}")
                    else:
                        # Fallback: Create product on-the-fly
                        line_items.append({
                            'price_data': {
                                'currency': request.currency,
                                'product_data': {
                                    'name': item.name,
                                    'metadata': {
                                        'orderType': request.metadata.get('orderType', 'bar'),
                                        'appItemId': str(item.id) if hasattr(item, 'id') else '',
                                    }
                                },
                                'unit_amount': int(item.price * 100),  # Convert to cents
                            },
                            'quantity': item.quantity,
                        })
                        print(f"Creating product on-the-fly for {item.name}")
                except Exception as e:
                    print(f"Error finding Stripe product for {item.name}: {e}")
                    # Fallback: Create product on-the-fly
                    line_items.append({
                        'price_data': {
                            'currency': request.currency,
                            'product_data': {
                                'name': item.name,
                            },
                            'unit_amount': int(item.price * 100),  # Convert to cents
                        },
                        'quantity': item.quantity,
                    })
        else:
            # Single line item if no order items provided
            # Try to find matching Stripe product
            try:
                from api.stripe_products import get_price_id_for_product
                service_name = request.metadata.get('serviceName', 'Service')
                price_id = get_price_id_for_product(service_name, request.amount, request.currency)
                
                if price_id:
                    line_items.append({
                        'price': price_id,
                        'quantity': 1,
                    })
                else:
                    # Fallback: Create product on-the-fly
                    line_items.append({
                        'price_data': {
                            'currency': request.currency,
                            'product_data': {
                                'name': service_name,
                            },
                            'unit_amount': int(request.amount * 100),  # Convert to cents
                        },
                        'quantity': 1,
                    })
            except Exception as e:
                print(f"Error finding Stripe product: {e}")
                # Fallback: Create product on-the-fly
                line_items.append({
                    'price_data': {
                        'currency': request.currency,
                        'product_data': {
                            'name': request.metadata.get('serviceName', 'Service'),
                        },
                        'unit_amount': int(request.amount * 100),  # Convert to cents
                    },
                    'quantity': 1,
                })
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=request.successUrl + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.cancelUrl,
            metadata={
                "userId": user.get("userId", "unknown"),
                "orderType": request.metadata.get("orderType", "service_booking"),
                **request.metadata
            },
            customer_email=user.get("email"),
        )
        
        return {
            "sessionId": checkout_session.id,
            "url": checkout_session.url,
            "success": True
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
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
        event_data = event['data']['object']
        
        if event_type == 'payment_intent.succeeded':
            # Payment succeeded - update wallet balance
            await handle_payment_succeeded(event_data)
            
        elif event_type == 'payment_intent.payment_failed':
            # Payment failed - update transaction status
            await handle_payment_failed(event_data)
            
        elif event_type == 'payment_intent.canceled':
            # Payment canceled - update transaction status
            await handle_payment_canceled(event_data)
        
        elif event_type == 'checkout.session.completed':
            # Checkout session completed - handle payment
            # The checkout session contains payment_intent_id
            checkout_session_id = event_data.get('id')
            payment_intent_id = event_data.get('payment_intent')
            
            if payment_intent_id:
                # Retrieve the payment intent to get full details
                try:
                    payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
                    # Add checkout session ID to metadata for order lookup
                    if checkout_session_id:
                        payment_intent['metadata'] = payment_intent.get('metadata', {})
                        payment_intent['metadata']['checkoutSessionId'] = checkout_session_id
                    await handle_payment_succeeded(payment_intent)
                except Exception as e:
                    print(f"Error retrieving payment intent from checkout session: {e}")
                    import traceback
                    traceback.print_exc()
        
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
    """Handle successful payment - update wallet balance, order status, and create calendar events"""
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
        order_type = metadata.get('orderType', '')
        
        if not userId:
            print(f"Warning: No userId in payment intent metadata: {payment_intent_id}")
            return
        
        # Check if this is a purchase (service booking, bar order, etc.) vs adding funds
        # For purchases, we DEDUCT from wallet balance to reflect spending
        # For adding funds (wallet_add_funds), we ADD to balance
        is_purchase = order_type in ['service_booking', 'bar', 'event_booking']
        is_add_funds = order_type == 'wallet_add_funds'
        
        if is_purchase:
            # Update order status to 'completed' in Firestore
            # Find order by paymentIntentId or checkoutSessionId
            checkout_session_id = metadata.get('checkoutSessionId')
            
            order_data = None
            order_ref = None
            
            # Try to find order by checkoutSessionId first (for Checkout Sessions)
            if checkout_session_id:
                # Check barOrders collection
                if order_type == 'bar':
                    bar_orders_ref = db.collection('barOrders')
                    bar_orders_query = bar_orders_ref.where('checkoutSessionId', '==', checkout_session_id)
                    bar_orders = bar_orders_query.stream()
                    for order in bar_orders:
                        order_ref = order.reference
                        order_data = order.to_dict()
                        break
                
                # Check serviceOrders collection
                if not order_data:
                    service_orders_ref = db.collection('serviceOrders')
                    service_orders_query = service_orders_ref.where('checkoutSessionId', '==', checkout_session_id)
                    service_orders = service_orders_query.stream()
                    for order in service_orders:
                        order_ref = order.reference
                        order_data = order.to_dict()
                        break
                
                # Check eventOrders collection
                if not order_data:
                    event_orders_ref = db.collection('eventOrders')
                    event_orders_query = event_orders_ref.where('checkoutSessionId', '==', checkout_session_id)
                    event_orders = event_orders_query.stream()
                    for order in event_orders:
                        order_ref = order.reference
                        order_data = order.to_dict()
                        break
            
            # Fallback: Try to find by paymentIntentId
            if not order_data:
                # Check serviceOrders collection
                orders_ref = db.collection('serviceOrders')
                orders_query = orders_ref.where('paymentIntentId', '==', payment_intent_id)
                orders = orders_query.stream()
                for order in orders:
                    order_ref = order.reference
                    order_data = order.to_dict()
                    break
                
                # Check barOrders collection
                if not order_data:
                    bar_orders_ref = db.collection('barOrders')
                    bar_orders_query = bar_orders_ref.where('paymentIntentId', '==', payment_intent_id)
                    bar_orders = bar_orders_query.stream()
                    for order in bar_orders:
                        order_ref = order.reference
                        order_data = order.to_dict()
                        break
                
                # Check eventOrders collection
                if not order_data:
                    event_orders_ref = db.collection('eventOrders')
                    event_orders_query = event_orders_ref.where('paymentIntentId', '==', payment_intent_id)
                    event_orders = event_orders_query.stream()
                    for order in event_orders:
                        order_ref = order.reference
                        order_data = order.to_dict()
                        break
            
            # Update order status if found
            if order_ref and order_data:
                order_ref.update({
                    'paymentStatus': 'completed',
                    'status': 'confirmed',
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                    'paymentCompletedAt': firestore.SERVER_TIMESTAMP
                })
                print(f"✅ Updated order status to 'completed' for payment intent: {payment_intent_id}")
                
                # Create calendar event for service bookings
                if order_type == 'service_booking' and order_data.get('serviceDate') and order_data.get('serviceTime'):
                    await create_calendar_event_from_order(order_data, userId, payment_intent_id)
            else:
                print(f"⚠️ Order not found for payment intent: {payment_intent_id}")
            # Deduct from wallet balance for purchases
            wallet_ref = db.collection('wallets').document(userId)
            wallet_doc = wallet_ref.get()
            
            if wallet_doc.exists:
                current_balance = wallet_doc.to_dict().get('balance', 0)
                new_balance = current_balance - amount  # Deduct for purchase
                
                # Prevent negative balance (shouldn't happen if payment succeeded, but safety check)
                if new_balance < 0:
                    print(f"Warning: Wallet balance would go negative for user {userId}. Current: ${current_balance}, Purchase: ${amount}")
                    new_balance = 0  # Set to 0 instead of negative
                
                wallet_ref.update({
                    'balance': new_balance,
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                    'lastTransactionId': payment_intent_id
                })
            else:
                # Create wallet with 0 balance if it doesn't exist (purchase already processed)
                wallet_ref.set({
                    'balance': 0,
                    'currency': 'USD',
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'updatedAt': firestore.SERVER_TIMESTAMP,
                    'userId': userId,
                    'status': 'active',
                    'lastTransactionId': payment_intent_id
                })
            
            # Create transaction record for the purchase deduction
            transactions_ref = db.collection('walletTransactions')
            
            # Generate appropriate description based on order type
            if order_type == 'bar':
                # For bar orders, get item names from order data
                items = order_data.get('items', []) if order_data else []
                item_names = [item.get('name', 'Item') for item in items[:3]]  # First 3 items
                if len(items) > 3:
                    item_names.append(f'and {len(items) - 3} more')
                description = f'Bar Order: {", ".join(item_names)}'
            elif order_type == 'event_booking':
                event_name = order_data.get('eventType', 'Event') if order_data else 'Event'
                description = f'Event Booking: {event_name}'
            else:
                service_name = metadata.get('serviceName', 'Service')
                description = f'Service Booking: {service_name}'
            
            # Add order reference
            order_id = order_ref.id if order_ref else None
            
            transaction_data = {
                'userId': userId,
                'type': 'sent',
                'amount': -amount,  # Negative amount for deduction
                'description': description,
                'status': 'completed',
                'paymentMethod': 'Stripe',
                'paymentIntentId': payment_intent_id,
                'orderType': order_type,
                'orderId': order_id,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'createdAt': firestore.SERVER_TIMESTAMP
            }
            
            # Add order-specific fields
            if order_type == 'bar' and order_data:
                transaction_data['orderItems'] = order_data.get('items', [])
                transaction_data['orderTotal'] = order_data.get('total', amount)
            elif order_type == 'service_booking':
                transaction_data['serviceId'] = metadata.get('serviceId')
                transaction_data['serviceName'] = metadata.get('serviceName', 'Service')
            elif order_type == 'event_booking' and order_data:
                transaction_data['eventType'] = order_data.get('eventType')
                transaction_data['eventDate'] = order_data.get('eventDate')
            
            transactions_ref.add(transaction_data)
            
            print(f"✅ Purchase completed: Deducted ${amount} from wallet for user {userId}, order type: {order_type}, description: {description}")
            
        elif is_add_funds:
            # Add to wallet balance for fund additions
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
            
            # Update transaction status for fund additions
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
            
            print(f"✅ Funds added: Updated wallet for user {userId}, amount: ${amount}")
        
        # Update any existing transaction records
        transactions_ref = db.collection('walletTransactions')
        query = transactions_ref.where('paymentIntentId', '==', payment_intent_id)
        transactions = query.stream()
        
        for transaction in transactions:
            transaction.reference.update({
                'status': 'completed',
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
        
    except Exception as e:
        print(f"Error handling payment succeeded: {str(e)}")
        raise


async def create_calendar_event_from_order(order_data: dict, userId: str, payment_intent_id: str):
    """Create calendar event from order data after payment succeeds"""
    try:
        # Parse service date and time from order data
        service_date_str = order_data.get('serviceDate', '')
        service_time_str = order_data.get('serviceTime', '')
        
        if not service_date_str or not service_time_str:
            print(f"⚠️ Missing service date/time in order data, skipping calendar event creation")
            return
        
        # Parse date (format: "Monday, January 1, 2024")
        import re
        date_match = re.match(r'(\w+), (\w+) (\d+), (\d+)', service_date_str)
        if not date_match:
            print(f"⚠️ Invalid date format: {service_date_str}, skipping calendar event creation")
            return
        
        _, month_name, day, year = date_match.groups()
        month_map = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
            'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
        }
        month = month_map.get(month_name, 0)
        
        # Parse time (format: "6:00 PM" or "18:00")
        start_hour, start_minute = 0, 0
        if 'AM' in service_time_str.upper() or 'PM' in service_time_str.upper():
            time_parts = re.sub(r'[AP]M', '', service_time_str, flags=re.IGNORECASE).strip().split(':')
            start_hour = int(time_parts[0])
            start_minute = int(time_parts[1] if len(time_parts) > 1 else 0)
            if 'PM' in service_time_str.upper() and start_hour != 12:
                start_hour += 12
            elif 'AM' in service_time_str.upper() and start_hour == 12:
                start_hour = 0
        else:
            time_parts = service_time_str.split(':')
            start_hour = int(time_parts[0])
            start_minute = int(time_parts[1] if len(time_parts) > 1 else 0)
        
        start_date = datetime(int(year), month + 1, int(day), start_hour, start_minute)
        
        # Calculate end date based on service duration
        # Default to 1 hour if not specified
        duration_hours = order_data.get('dealHours', order_data.get('quantity', 1))
        end_date = datetime(int(year), month + 1, int(day), start_hour + duration_hours, start_minute)
        
        # Prepare calendar event data
        service_name = order_data.get('serviceName', 'Service')
        contact_name = order_data.get('contactName', '')
        contact_email = order_data.get('contactEmail', '')
        total_cost = order_data.get('total', 0)
        quantity = order_data.get('quantity', 1)
        special_requests = order_data.get('specialRequests', '')
        
        event_title = f"{service_name} - {contact_name}"
        event_description = f"Service: {service_name}\n" + \
            f"Quantity: {quantity}\n" + \
            (f"Hours: {duration_hours}\n" if order_data.get('dealHours') else '') + \
            f"Total Cost: ${total_cost:.2f}\n" + \
            f"Contact: {contact_email} | {order_data.get('contactPhone', 'N/A')}\n" + \
            (f"Special Requests: {special_requests}\n" if special_requests else '') + \
            f"Payment Intent: {payment_intent_id}"
        
        calendar_event_data = {
            "title": event_title,
            "description": event_description,
            "startTime": start_date.isoformat(),
            "endTime": end_date.isoformat(),
            "location": "Merkaba Venue",
            "attendees": [{"email": contact_email}] if contact_email else [],
            "bookingId": order_data.get('backendBookingId') or payment_intent_id[-8:],
            "bookingType": "service",
            "userEmail": contact_email
        }
        
        # Call calendar API endpoint to create event
        # Get API base URL from environment or use default
        api_base_url = os.getenv("API_BASE_URL", os.getenv("EXPO_PUBLIC_API_BASE_URL", "http://localhost:8001"))
        
        # For internal calls, we can directly import and call the calendar function
        # But since we're in payments.py, we'll make an HTTP call to the calendar endpoint
        # However, this requires authentication. Let's use a service account approach instead.
        
        # Import and call calendar service directly
        try:
            from .calendar_events import create_calendar_event_internal
            result = await create_calendar_event_internal(calendar_event_data, userId)
            if result.get('success'):
                admin_event_id = result.get('results', {}).get('admin_calendar', {}).get('eventId')
                print(f"✅ Calendar event created successfully: {admin_event_id}")
            else:
                error_msg = result.get('error', 'Unknown error')
                print(f"⚠️ Calendar event creation failed: {error_msg}")
        except ImportError as import_error:
            print(f"⚠️ Calendar event creation skipped - calendar_events module not available: {import_error}")
            print(f"   Event data: {event_title} on {start_date.isoformat()}")
        except Exception as calendar_error:
            print(f"⚠️ Error creating calendar event: {calendar_error}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"⚠️ Error creating calendar event from order: {str(e)}")
        import traceback
        traceback.print_exc()


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


