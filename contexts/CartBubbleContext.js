// contexts/CartBubbleContext.js
import { createContext, useContext, useState } from 'react';

const CartBubbleContext = createContext();

export function CartBubbleProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [showCartBubble, setShowCartBubble] = useState(false);

  const addToCart = (item) => {
    setCartItems(prev => [...prev, item]);
    setShowCartBubble(true);
    // Auto-hide after 3 seconds
    setTimeout(() => setShowCartBubble(false), 3000);
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setShowCartBubble(false);
  };

  const getCartCount = () => cartItems.length;

  return (
    <CartBubbleContext.Provider 
      value={{ 
        cartItems, 
        showCartBubble, 
        addToCart, 
        removeFromCart, 
        clearCart, 
        getCartCount 
      }}
    >
      {children}
    </CartBubbleContext.Provider>
  );
}

export function useCartBubble() {
  return useContext(CartBubbleContext);
}
