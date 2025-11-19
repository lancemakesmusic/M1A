"""
Payment API endpoints for bar orders and Stripe integration
"""
import os
import stripe
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Initialize Stripe
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Security dependency
def verify_token():
    """
    Verify authentication token
    TODO: Implement proper JWT verification in production
    For now, returns a default user object
    In production, verify JWT token from Authorization header
    """
    # TODO: Extract token from Authorization header
    # TODO: Verify JWT token with SECRET_KEY
    # TODO: Return decoded user payload
    # For now, return default user (replace with real auth in production)
    return {"userId": "user123"}


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
async def get_payment_methods(customerId: str):
    """Get payment methods for a customer"""
    try:
        if not STRIPE_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing is not configured. Please set STRIPE_SECRET_KEY environment variable."
            )
        
        import stripe
        # List payment methods for customer
        payment_methods = stripe.PaymentMethod.list(
            customer=customerId,
            type="card"
        )
        
        # Format payment methods
        formatted_methods = []
        for pm in payment_methods.data:
            formatted_methods.append({
                "id": pm.id,
                "type": pm.type,
                "card": {
                    "brand": pm.card.brand,
                    "last4": pm.card.last4,
                    "exp_month": pm.card.exp_month,
                    "exp_year": pm.card.exp_year,
                },
                "isDefault": False,  # TODO: Check if this is the default payment method
            })
        
        return {
            "paymentMethods": formatted_methods
        }
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment methods: {str(e)}"
        )

@router.post("/payment-methods")
async def add_payment_method(request: dict):
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
async def set_default_payment_method(request: dict):
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
async def delete_payment_method(payment_method_id: str):
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


