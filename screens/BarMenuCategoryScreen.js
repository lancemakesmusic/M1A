/**
 * Bar Menu Category Screen
 * Shows items for a specific category (Mixed Drinks, Spirits, or Beer)
 * Square/DoorDash style checkout with bottom cart sheet
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query, addDoc, serverTimestamp } from 'firebase/firestore';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { db, isFirebaseReady } from '../firebase';
import StripeService from '../services/StripeService';
import { trackBarOrder, trackButtonClick, trackFeatureUsage } from '../services/AnalyticsService';
import { sendOrderStatusUpdate, sendPaymentConfirmation } from '../services/NotificationService';
import RatingPromptService, { POSITIVE_ACTIONS } from '../services/RatingPromptService';
import useScreenTracking from '../hooks/useScreenTracking';
import EmptyState from '../components/EmptyState';

const { width, height } = Dimensions.get('window');

// Fallback menu items - same as BarMenuScreen
const fallbackMenuItems = [
  // MIXED DRINKS
  { id: '1', name: 'Margarita', description: 'Classic margarita cocktail', price: 12, category: 'Mixed Drinks', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop', popular: true, available: true },
  { id: '2', name: 'Green Tea Shot', description: 'Refreshing green tea shot', price: 6, category: 'Mixed Drinks', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop', available: true },
  { id: '3', name: 'White Tea Shot', description: 'Smooth white tea shot', price: 6, category: 'Mixed Drinks', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop', available: true },
  
  // SPIRITS
  { id: '4', name: 'Buffalo Trace Bourbon', description: 'Premium bourbon whiskey', price: 9, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { id: '5', name: 'Jameson', description: 'Irish whiskey', price: 9, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { id: '6', name: 'Jack Daniel\'s', description: 'Tennessee whiskey', price: 8, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { id: '7', name: 'Espolon', description: 'Premium tequila', price: 8, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { id: '8', name: 'Tito\'s', description: 'Handmade vodka', price: 7, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { id: '9', name: 'Jose Cuervo', description: 'Classic tequila', price: 7, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { id: '10', name: 'Vodka / Whiskey / Tequila', description: 'House well spirits', price: 5, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  
  // BEER
  { id: '11', name: 'Dos Equis', description: 'Mexican lager', price: 6, category: 'Beer', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', available: true },
  { id: '12', name: 'Michelob Ultra', description: 'Light beer', price: 7, category: 'Beer', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', available: true },
  { id: '13', name: 'Modelo', description: 'Mexican beer', price: 7, category: 'Beer', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', available: true },
];

const TAX_RATE = 0.08; // 8% tax
const SERVICE_FEE = 0.03; // 3% service fee

// Map category IDs to category names
const categoryMap = {
  'mixed-drinks': 'Mixed Drinks',
  'spirits': 'Spirits',
  'beer': 'Beer',
};

export default function BarMenuCategoryScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { categoryId, categoryName } = route.params || {};
  useScreenTracking('BarMenuCategoryScreen');

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'payment', 'confirmation'
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [slideAnim] = useState(new Animated.Value(height));

  const categoryDisplayName = categoryName || categoryMap[categoryId] || 'Bar';

  // Load menu items for this category
  const loadMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      const targetCategory = categoryMap[categoryId] || categoryName || 'Mixed Drinks';
      
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const qref = query(collection(db, 'barMenuItems'), orderBy('name'));
          const snap = await getDocs(qref);
          const firebaseItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          const filtered = firebaseItems.filter(item => item.category === targetCategory);
          if (filtered.length > 0) {
            setMenuItems(filtered);
            setLoading(false);
            return;
          }
        } catch (firestoreError) {
          console.warn('Firestore query failed, using fallback:', firestoreError);
        }
      }
      
      // Fallback to static data
      const filtered = fallbackMenuItems.filter(item => item.category === targetCategory);
      setMenuItems(filtered);
    } catch (error) {
      console.warn('Failed to load menu items:', error);
      const targetCategory = categoryMap[categoryId] || categoryName || 'Mixed Drinks';
      const filtered = fallbackMenuItems.filter(item => item.category === targetCategory);
      setMenuItems(filtered);
    } finally {
      setLoading(false);
    }
  }, [categoryId, categoryName]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // Animate cart sheet
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showCart ? 0 : height,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [showCart]);

  const addToCart = (item) => {
    trackButtonClick('add_to_cart', 'BarMenuCategoryScreen', { itemId: item.id });
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setShowCart(true);
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      const item = prev.find(c => c.id === itemId);
      if (!item) return prev;
      
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter(c => c.id !== itemId);
      }
      return prev.map(c => c.id === itemId ? { ...c, quantity: newQuantity } : c);
    });
  };

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * TAX_RATE;
    const serviceFee = subtotal * SERVICE_FEE;
    const total = subtotal + tax + serviceFee;
    return { subtotal, tax, serviceFee, total };
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }

    setCheckoutStep('payment');
    trackButtonClick('start_checkout', 'BarMenuCategoryScreen');
  };

  const handlePayment = async () => {
    try {
      setProcessingPayment(true);
      trackBarOrder(cartTotal.total, cart.length);

      // Use network IP for physical devices, localhost for web/simulator
      const getApiBaseUrl = () => {
        if (process.env.EXPO_PUBLIC_API_BASE_URL) {
          return process.env.EXPO_PUBLIC_API_BASE_URL;
        }
        if (Platform.OS === 'web') {
          return 'http://localhost:8001';
        }
        // Use the same network IP as Metro bundler
        return 'http://172.20.10.3:8001';
      };
      const API_BASE_URL = getApiBaseUrl();

      // Submit order to backend API first
      let backendResult = { success: false };
      try {
        const orderPayload = {
          userId: user?.uid || 'anonymous',
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          subtotal: cartTotal.subtotal,
          tax: cartTotal.tax,
          serviceFee: cartTotal.serviceFee,
          total: cartTotal.total,
          category: categoryDisplayName,
          specialInstructions: specialInstructions.trim() || null,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${API_BASE_URL}/api/bar-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        backendResult = result;
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create bar order');
        }
        
        console.log('Bar order created:', result.orderId);
      } catch (backendError) {
        console.error('Error submitting bar order to backend:', backendError);
        // Continue with payment even if backend fails (for demo purposes)
      }

      // Process payment with Stripe
      const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      // Check if Stripe is configured
      if (!StripeService.isConfigured()) {
        // Fallback to mock payment for demo
        console.log('Stripe not configured, using mock payment');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Create payment intent
        const result = await StripeService.createPaymentIntent(
          cartTotal.total,
          'usd',
          {
            type: 'bar_order',
            category: categoryDisplayName,
            userId: user?.uid || 'anonymous',
          },
          orderItems
        );

        if (!result.success || !result.paymentIntentId) {
          throw new Error(result.error || 'Payment processing failed');
        }

        // Payment intent created successfully
        // In production, you would use Stripe Payment Sheet here
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Save order to Firestore
      const orderData = {
        userId: user?.uid || 'anonymous',
        items: cart,
        subtotal: cartTotal.subtotal,
        tax: cartTotal.tax,
        serviceFee: cartTotal.serviceFee,
        total: cartTotal.total,
        category: categoryDisplayName,
        specialInstructions: specialInstructions.trim() || null,
        status: 'pending',
        paymentStatus: 'completed',
        paymentMethod: StripeService.isConfigured() ? 'stripe' : 'mock',
        backendOrderId: backendResult.orderId || null,
        createdAt: new Date(),
      };

      let orderId;
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const orderRef = await addDoc(collection(db, 'barOrders'), {
          ...orderData,
          createdAt: serverTimestamp(),
        });
        orderId = orderRef.id;
      } else {
        throw new Error('Firestore not ready');
      }
      setOrderNumber(orderId);

      // Send notifications
      await sendPaymentConfirmation(user?.email || 'customer@example.com', cartTotal.total, orderId);
      await sendOrderStatusUpdate(user?.email || 'customer@example.com', 'pending', orderId);

      // Record positive action
      RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.ORDER_COMPLETED);

      setCheckoutStep('confirmation');
      trackFeatureUsage('bar_order_completed', { orderTotal: cartTotal.total, itemCount: cart.length });
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Please try again.');
      setProcessingPayment(false);
    }
  };

  const handleComplete = () => {
    setCart([]);
    setShowCart(false);
    setCheckoutStep('cart');
    setSpecialInstructions('');
    setOrderNumber(null);
    navigation.goBack();
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.menuItemImage} />
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemHeader}>
          <View style={styles.menuItemInfo}>
            <Text style={[styles.menuItemName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.menuItemDescription, { color: theme.subtext }]} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          <Text style={[styles.menuItemPrice, { color: theme.primary }]}>
            ${item.price.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => addToCart(item)}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCartSheet = () => {
    if (!showCart && cart.length === 0) return null;

    return (
      <Modal
        visible={showCart}
        transparent
        animationType="none"
        onRequestClose={() => setShowCart(false)}
      >
        <TouchableOpacity
          style={styles.cartOverlay}
          activeOpacity={1}
          onPress={() => setShowCart(false)}
        >
          <Animated.View
            style={[
              styles.cartSheet,
              { backgroundColor: theme.background },
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.cartContent}
            >
              {/* Handle */}
              <View style={styles.cartHandle}>
                <View style={[styles.handleBar, { backgroundColor: theme.border }]} />
              </View>

              {/* Cart Header */}
              <View style={[styles.cartHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.cartTitle, { color: theme.text }]}>
                  {checkoutStep === 'cart' ? 'Your Order' : checkoutStep === 'payment' ? 'Checkout' : 'Order Confirmed!'}
                </Text>
                {checkoutStep === 'cart' && (
                  <TouchableOpacity onPress={() => setShowCart(false)}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
                {checkoutStep === 'cart' && (
                  <>
                    {cart.map((item) => (
                      <View key={item.id} style={[styles.cartItem, { borderBottomColor: theme.border }]}>
                        <View style={styles.cartItemInfo}>
                          <Text style={[styles.cartItemName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.cartItemPrice, { color: theme.subtext }]}>
                            ${item.price.toFixed(2)} each
                          </Text>
                        </View>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={[styles.quantityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                            onPress={() => updateQuantity(item.id, -1)}
                          >
                            <Ionicons name="remove" size={18} color={theme.text} />
                          </TouchableOpacity>
                          <Text style={[styles.quantityText, { color: theme.text }]}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={[styles.quantityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                            onPress={() => updateQuantity(item.id, 1)}
                          >
                            <Ionicons name="add" size={18} color={theme.text} />
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.cartItemTotal, { color: theme.text }]}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}

                    {/* Special Instructions */}
                    <View style={styles.instructionsContainer}>
                      <Text style={[styles.instructionsLabel, { color: theme.text }]}>Special Instructions</Text>
                      <TextInput
                        style={[styles.instructionsInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                        placeholder="Add any special requests..."
                        placeholderTextColor={theme.subtext}
                        multiline
                        numberOfLines={3}
                        value={specialInstructions}
                        onChangeText={setSpecialInstructions}
                      />
                    </View>

                    {/* Totals */}
                    <View style={styles.totalsContainer}>
                      <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: theme.subtext }]}>Subtotal</Text>
                        <Text style={[styles.totalValue, { color: theme.text }]}>
                          ${cartTotal.subtotal.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: theme.subtext }]}>Tax</Text>
                        <Text style={[styles.totalValue, { color: theme.text }]}>
                          ${cartTotal.tax.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, { color: theme.subtext }]}>Service Fee</Text>
                        <Text style={[styles.totalValue, { color: theme.text }]}>
                          ${cartTotal.serviceFee.toFixed(2)}
                        </Text>
                      </View>
                      <View style={[styles.totalRow, styles.totalRowFinal]}>
                        <Text style={[styles.totalLabelFinal, { color: theme.text }]}>Total</Text>
                        <Text style={[styles.totalValueFinal, { color: theme.primary }]}>
                          ${cartTotal.total.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {checkoutStep === 'payment' && (
                  <View style={styles.paymentContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.paymentText, { color: theme.text }]}>
                      Processing payment...
                    </Text>
                  </View>
                )}

                {checkoutStep === 'confirmation' && (
                  <View style={styles.confirmationContainer}>
                    <Ionicons name="checkmark-circle" size={64} color="#34C759" />
                    <Text style={[styles.confirmationTitle, { color: theme.text }]}>
                      Order Confirmed!
                    </Text>
                    <Text style={[styles.confirmationText, { color: theme.subtext }]}>
                      Order #{orderNumber}
                    </Text>
                    <Text style={[styles.confirmationSubtext, { color: theme.subtext }]}>
                      Your order is being prepared. You'll receive a notification when it's ready.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              {checkoutStep === 'cart' && (
                <View style={[styles.cartFooter, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: theme.primary }]}
                    onPress={handleCheckout}
                    disabled={cart.length === 0}
                  >
                    <Text style={styles.checkoutButtonText}>
                      Checkout • ${cartTotal.total.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {checkoutStep === 'payment' && !processingPayment && (
                <View style={[styles.cartFooter, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: theme.primary }]}
                    onPress={handlePayment}
                  >
                    <Text style={styles.checkoutButtonText}>
                      Pay ${cartTotal.total.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {checkoutStep === 'confirmation' && (
                <View style={[styles.cartFooter, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: theme.primary }]}
                    onPress={handleComplete}
                  >
                    <Text style={styles.checkoutButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </KeyboardAvoidingView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{categoryDisplayName}</Text>
        <TouchableOpacity
          onPress={() => setShowCart(true)}
          style={styles.cartButton}
        >
          {cart.length > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.cartBadgeText}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Text>
            </View>
          )}
          <Ionicons name="bag" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      {menuItems.length === 0 ? (
        <EmptyState
          icon="wine-outline"
          title={`No ${categoryDisplayName} available`}
          message={`There are no ${categoryDisplayName.toLowerCase()} items available at this time. Please check back later.`}
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
          {menuItems.map(renderMenuItem)}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Cart Button */}
      {cart.length > 0 && !showCart && (
        <TouchableOpacity
          style={[styles.floatingCartButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowCart(true)}
        >
          <View style={styles.floatingCartContent}>
            <View style={styles.floatingCartInfo}>
              <Text style={styles.floatingCartCount}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </Text>
              <Text style={styles.floatingCartTotal}>${cartTotal.total.toFixed(2)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Cart Sheet */}
      {renderCartSheet()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  cartButton: {
    padding: 4,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuList: {
    flex: 1,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItemImage: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E5E5',
  },
  menuItemContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  floatingCartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingCartCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingCartTotal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  cartSheet: {
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cartContent: {
    flex: 1,
  },
  cartHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartItems: {
    flex: 1,
    padding: 20,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'right',
  },
  instructionsContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totalsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRowFinal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 14,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  paymentText: {
    marginTop: 16,
    fontSize: 16,
  },
  confirmationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  confirmationSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  cartFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  checkoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

