"""
Stripe Products Sync Service
Fetches products from Stripe and maps them to app services/bar items
"""
import os
import stripe
from typing import List, Dict, Optional
from datetime import datetime

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


def get_stripe_products(active_only: bool = True) -> List[Dict]:
    """Fetch all products from Stripe"""
    try:
        if not STRIPE_SECRET_KEY:
            print("Warning: STRIPE_SECRET_KEY not set, cannot fetch Stripe products")
            return []
        
        products = []
        has_more = True
        starting_after = None
        
        while has_more:
            params = {
                'limit': 100,
                'expand': ['data.default_price']
            }
            if active_only:
                params['active'] = True
            if starting_after:
                params['starting_after'] = starting_after
            
            response = stripe.Product.list(**params)
            products.extend(response.data)
            
            has_more = response.has_more
            if has_more and response.data:
                starting_after = response.data[-1].id
        
        return products
    except Exception as e:
        print(f"Error fetching Stripe products: {e}")
        return []


def get_stripe_prices_for_product(product_id: str) -> List[Dict]:
    """Get all prices for a specific product"""
    try:
        if not STRIPE_SECRET_KEY:
            return []
        
        prices = stripe.Price.list(
            product=product_id,
            active=True,
            limit=100
        )
        return prices.data
    except Exception as e:
        print(f"Error fetching prices for product {product_id}: {e}")
        return []


def find_stripe_product_by_name(name: str) -> Optional[Dict]:
    """Find a Stripe product by name (case-insensitive partial match)"""
    try:
        products = get_stripe_products(active_only=True)
        name_lower = name.lower().strip()
        
        for product in products:
            product_name = product.get('name', '').lower().strip()
            if name_lower in product_name or product_name in name_lower:
                return product
        
        return None
    except Exception as e:
        print(f"Error finding Stripe product by name: {e}")
        return None


def get_price_id_for_product(product_name: str, amount: float, currency: str = 'usd') -> Optional[str]:
    """Get the Stripe Price ID for a product matching name and amount"""
    try:
        product = find_stripe_product_by_name(product_name)
        if not product:
            return None
        
        # Get prices for this product
        prices = get_stripe_prices_for_product(product['id'])
        
        # Find matching price (amount in cents)
        amount_cents = int(amount * 100)
        
        for price in prices:
            if price.get('currency', '').lower() == currency.lower():
                if price.get('unit_amount') == amount_cents:
                    return price['id']
                # Also check if it's a one-time payment
                if price.get('type') == 'one_time':
                    return price['id']
        
        # If no exact match, return first active price
        if prices:
            return prices[0]['id']
        
        return None
    except Exception as e:
        print(f"Error getting price ID for product: {e}")
        return None


def sync_stripe_products_to_firestore(db) -> Dict:
    """Sync Stripe products to Firestore for easy lookup"""
    try:
        products = get_stripe_products(active_only=True)
        
        synced_count = 0
        for product in products:
            try:
                # Get prices for this product
                prices = get_stripe_prices_for_product(product['id'])
                
                product_data = {
                    'stripeProductId': product['id'],
                    'name': product.get('name', ''),
                    'description': product.get('description', ''),
                    'active': product.get('active', True),
                    'metadata': product.get('metadata', {}),
                    'prices': [
                        {
                            'priceId': price['id'],
                            'amount': price.get('unit_amount', 0) / 100.0,
                            'currency': price.get('currency', 'usd'),
                            'type': price.get('type', 'one_time'),
                        }
                        for price in prices
                    ],
                    'taxCategory': product.get('metadata', {}).get('tax_category', ''),
                    'lastSynced': datetime.now().isoformat(),
                }
                
                # Save to Firestore
                product_ref = db.collection('stripeProducts').document(product['id'])
                product_ref.set(product_data, merge=True)
                synced_count += 1
                
            except Exception as e:
                print(f"Error syncing product {product.get('id')}: {e}")
                continue
        
        return {
            'success': True,
            'synced': synced_count,
            'total': len(products)
        }
    except Exception as e:
        print(f"Error syncing Stripe products: {e}")
        return {
            'success': False,
            'error': str(e)
        }




