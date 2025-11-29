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
  RefreshControl,
  TextInput,
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

// Local asset images for bar menu items
import BuffaloTraceImg from '../assets/images/Buffalo_Trace.JPG';
import JamesonImg from '../assets/images/Jameson.JPG';
import JackDanielsImg from '../assets/images/Jack_Daniels.JPG';
import EspolonImg from '../assets/images/Espolon.JPG';
import TitosImg from '../assets/images/Titos.JPG';
import JoseCuervoImg from '../assets/images/Jose_Cuervo.JPG';
import SpriteImg from '../assets/images/Sprite.JPG';
import RedBullImg from '../assets/images/Red_Bull.JPG';
import CranberryImg from '../assets/images/64oz_OS_Cranberry_front_v2.webp';
import SeltzerImg from '../assets/images/Seltzer_Water.JPG';

// Fallback menu items - matches actual Merkaba Entertainment bar menu
// Reference: Bar menu image with categories: Specialty Drinks, Spirits, Wells, Beer, Mixers
const fallbackMenuItems = [
  // MIXED DRINKS
  {
    id: '1',
    name: 'Margarita',
    description: 'Classic margarita cocktail',
    price: 12,
    category: 'Mixed Drinks',
    image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&h=400&fit=crop&q=80',
    popular: true,
    available: true,
  },
  {
    id: '2',
    name: 'Green Tea Shot',
    description: 'Refreshing green tea shot',
    price: 6,
    category: 'Mixed Drinks',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop&q=80',
    available: true,
  },
  {
    id: '3',
    name: 'White Tea Shot',
    description: 'Smooth white tea shot',
    price: 6,
    category: 'Mixed Drinks',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop&q=80',
    available: true,
  },
  
  // SPIRITS
  {
    id: '4',
    name: 'Buffalo Trace Bourbon',
    description: 'Premium bourbon whiskey',
    price: 9,
    category: 'Spirits',
    image: BuffaloTraceImg,
    available: true,
  },
  {
    id: '5',
    name: 'Jameson',
    description: 'Irish whiskey',
    price: 9,
    category: 'Spirits',
    image: JamesonImg,
    available: true,
  },
  {
    id: '6',
    name: 'Jack Daniel\'s',
    description: 'Tennessee whiskey',
    price: 8,
    category: 'Spirits',
    image: JackDanielsImg,
    available: true,
  },
  {
    id: '7',
    name: 'Espolon',
    description: 'Premium tequila',
    price: 8,
    category: 'Spirits',
    image: EspolonImg,
    available: true,
  },
  {
    id: '8',
    name: 'Tito\'s',
    description: 'Handmade vodka',
    price: 7,
    category: 'Spirits',
    image: TitosImg,
    available: true,
  },
  {
    id: '9',
    name: 'Jose Cuervo',
    description: 'Classic tequila',
    price: 7,
    category: 'Spirits',
    image: JoseCuervoImg,
    available: true,
  },
  
  // WELLS (moved to Spirits category)
  {
    id: '10',
    name: 'Vodka / Whiskey / Tequila',
    description: 'House well spirits',
    price: 5,
    category: 'Spirits',
    image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop&q=80',
    available: true,
  },
  
  // BEER
  {
    id: '11',
    name: 'Dos Equis',
    description: 'Mexican lager',
    price: 6,
    category: 'Beer',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&q=80',
    available: true,
  },
  {
    id: '12',
    name: 'Michelob Ultra',
    description: 'Light beer',
    price: 7,
    category: 'Beer',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&q=80',
    available: true,
  },
  {
    id: '13',
    name: 'Modelo',
    description: 'Mexican beer',
    price: 7,
    category: 'Beer',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop&q=80',
    available: true,
  },
  
  // MIXERS (Additional charge)
  {
    id: '14',
    name: 'Coca Cola',
    description: 'Mixer - additional charge',
    price: 1,
    category: 'Mixers',
    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop&q=80',
    available: true,
    isMixer: true,
  },
  {
    id: '15',
    name: 'Sprite',
    description: 'Mixer - additional charge',
    price: 1,
    category: 'Mixers',
    image: SpriteImg,
    available: true,
    isMixer: true,
  },
  {
    id: '16',
    name: 'Redbull',
    description: 'Energy drink mixer - additional charge',
    price: 3,
    category: 'Mixers',
    image: RedBullImg,
    available: true,
    isMixer: true,
  },
  {
    id: '17',
    name: 'Orange Juice',
    description: 'Mixer - additional charge',
    price: 1,
    category: 'Mixers',
    image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop&q=80',
    available: true,
    isMixer: true,
  },
  {
    id: '18',
    name: 'Cranberry Juice',
    description: 'Mixer - additional charge',
    price: 1,
    category: 'Mixers',
    image: CranberryImg,
    available: true,
    isMixer: true,
  },
  {
    id: '19',
    name: 'Club Soda',
    description: 'Mixer - additional charge',
    price: 1,
    category: 'Mixers',
    image: SeltzerImg,
    available: true,
    isMixer: true,
  },
];

const TAX_RATE = 0.08; // 8% tax
const SERVICE_FEE = 0.03; // 3% service fee

// Helper to support both local require() images and remote URLs
const getImageSource = (image) => {
  if (!image) return undefined;
  // In React Native, static images are numbers, remote images are strings
  return typeof image === 'number' ? image : { uri: image };
};

export default function BarMenuScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Handle item added from dashboard
  useEffect(() => {
    if (route?.params?.addItemToCart) {
      const item = route.params.addItemToCart;
      // Add item to cart
      setCart(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
          return prev.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
      // Clear the param to prevent re-adding
      navigation.setParams({ addItemToCart: undefined });
      // Show success message
      Alert.alert('Added to Cart', `${item.name} has been added to your cart!`);
    }
  }, [route?.params?.addItemToCart, navigation]);

  const categories = ['All', 'Mixed Drinks', 'Spirits', 'Beer'];

  // Load menu items from Firestore
  const loadMenuItems = useCallback(async () => {
    try {
      // Check if we have a real Firestore instance (real Firestore doesn't have .collection method)
      // Mock Firestore has .collection method
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore - use Firestore SDK functions
        try {
          const qref = query(collection(db, 'barMenuItems'), orderBy('name'));
          const snap = await getDocs(qref);
          const firebaseItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          
          if (firebaseItems.length > 0) {
            setMenuItems(firebaseItems);
            return;
          }
        } catch (firestoreError) {
          console.warn('Firestore query failed, using fallback:', firestoreError);
        }
      }
      // Fallback to static data (for mock Firestore or when Firestore fails)
      setMenuItems(fallbackMenuItems);
    } catch (error) {
      console.warn('Failed to load menu items from Firestore, using fallback:', error);
      setMenuItems(fallbackMenuItems);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMenuItems();
  }, [loadMenuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems.filter(item => item.available !== false);
    
    if (selectedCategory !== 'All') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item) => {
    if (!item.available) {
      Alert.alert('Item Unavailable', 'This item is currently not available.');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      );
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const tax = useMemo(() => {
    return subtotal * TAX_RATE;
  }, [subtotal]);

  const serviceFee = useMemo(() => {
    return subtotal * SERVICE_FEE;
  }, [subtotal]);

  const cartTotal = useMemo(() => {
    return subtotal + tax + serviceFee;
  }, [subtotal, tax, serviceFee]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart first.');
      return;
    }
    if (!user) {
      Alert.alert('Login Required', 'Please log in to place an order.');
      navigation.navigate('ProfileTab');
      return;
    }
    setCheckoutStep('payment');
    setShowCheckout(true);
  };

  const saveOrderToFirestore = async (orderData) => {
    try {
      // Check if we have a real Firestore instance
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore - use Firestore SDK functions
        try {
          const orderRef = await addDoc(collection(db, 'barOrders'), {
            ...orderData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          return orderRef.id;
        } catch (firestoreError) {
          console.warn('Firestore save failed, using mock order ID:', firestoreError);
          throw new Error('Firestore save failed');
        }
      } else {
        throw new Error('Firestore not ready');
      }
    } catch (error) {
      console.error('Error saving order to Firestore:', error);
      // Generate a local order number if Firestore fails
      return `LOCAL-${Date.now()}`;
    }
  };

  const handleStripePayment = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to complete your order.');
      return;
    }

    try {
      setProcessingPayment(true);
      setCheckoutStep('processing');
      
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        subtotal,
        tax,
        serviceFee,
        total: cartTotal,
        specialInstructions: specialInstructions.trim(),
        status: 'pending',
        paymentStatus: 'pending',
      };

      // Check if Stripe is configured
      if (!StripeService.isConfigured()) {
        // Fallback to mock payment for demo
        console.log('Stripe not configured, using mock payment');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Save order to Firestore
        const orderId = await saveOrderToFirestore({
          ...orderData,
          paymentStatus: 'completed',
          paymentMethod: 'mock',
        });
        
        // Track analytics
        await trackBarOrder({
          id: orderId,
          total: cartTotal,
          items: cart,
        });
        
        // Send notifications
        await sendPaymentConfirmation({
          id: orderId,
          amount: cartTotal,
        });
        await sendOrderStatusUpdate({
          id: orderId,
          status: 'confirmed',
        });
        
        setOrderNumber(orderId);
        setCheckoutStep('confirmation');
        
        setTimeout(() => {
          setCart([]);
          setSpecialInstructions('');
          setShowCheckout(false);
          setCheckoutStep('cart');
          setOrderNumber(null);
        }, 5000);
        return;
      }

      // Process payment with Stripe
      const result = await StripeService.processBarOrder(
        cart,
        cartTotal,
        {
          userId: user.uid,
          email: user.email,
        }
      );

      if (result.success) {
        // Save order to Firestore
        const orderId = await saveOrderToFirestore({
          ...orderData,
          paymentStatus: 'completed',
          paymentMethod: 'stripe',
          paymentIntentId: result.paymentIntentId,
        });
        
        // Track analytics
        await trackBarOrder({
          id: orderId,
          total: cartTotal,
          items: cart,
        });
        
        // Record positive action for rating prompt
        await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.ORDER_COMPLETED, {
          orderId,
          total: cartTotal,
          itemCount: cart.length,
        });
        
        // Send notifications
        await sendPaymentConfirmation({
          id: orderId,
          amount: cartTotal,
        });
        await sendOrderStatusUpdate({
          id: orderId,
          status: 'confirmed',
        });
        
        setOrderNumber(orderId);
        setCheckoutStep('confirmation');
        
        setTimeout(() => {
          setCart([]);
          setSpecialInstructions('');
          setShowCheckout(false);
          setCheckoutStep('cart');
          setOrderNumber(null);
        }, 5000);
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Please try again.');
      setCheckoutStep('payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderMenuItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: item.available === false ? 0.6 : 1,
        },
      ]}
      onPress={() => addToCart(item)}
      disabled={item.available === false}
    >
      <Image
        source={getImageSource(item.image)}
        style={styles.menuItemImage}
        onError={(error) => {
          console.log('Image load error for', item.name, ':', item.image, error.nativeEvent.error);
        }}
        resizeMode="cover"
      />
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemHeader}>
          <Text style={[styles.menuItemName, { color: theme.text }]}>{item.name}</Text>
          {item.popular && (
            <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
          {item.available === false && (
            <View style={[styles.unavailableBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.unavailableText}>Unavailable</Text>
            </View>
          )}
        </View>
        <Text style={[styles.menuItemDescription, { color: theme.subtext }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.menuItemFooter}>
          <Text style={[styles.menuItemPrice, { color: theme.primary }]}>
            {item.isMixer ? `+$${item.price.toFixed(2)}` : `$${item.price.toFixed(2)}`}
          </Text>
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: item.available === false ? theme.subtext : theme.primary,
              },
            ]}
            onPress={() => addToCart(item)}
            disabled={item.available === false}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCheckoutModal = () => (
    <Modal
      visible={showCheckout}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (checkoutStep === 'cart' && !processingPayment) {
          setShowCheckout(false);
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          {checkoutStep === 'cart' && (
            <>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Your Order</Text>
                <TouchableOpacity
                  onPress={() => setShowCheckout(false)}
                  disabled={processingPayment}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.cartItems} showsVerticalScrollIndicator={false}>
                {cart.length === 0 ? (
                  <View style={styles.emptyCart}>
                    <Ionicons name="cart-outline" size={64} color={theme.subtext} />
                    <Text style={[styles.emptyCartText, { color: theme.subtext }]}>
                      Your cart is empty
                    </Text>
                  </View>
                ) : (
                  <>
                    {cart.map(item => (
                      <View
                        key={item.id}
                        style={[styles.cartItem, { borderBottomColor: theme.border }]}
                      >
                        <View style={styles.cartItemInfo}>
                          <Text style={[styles.cartItemName, { color: theme.text }]}>
                            {item.name}
                          </Text>
                          <Text style={[styles.cartItemPrice, { color: theme.subtext }]}>
                            ${item.price.toFixed(2)} each
                          </Text>
                        </View>
                        <View style={styles.cartItemControls}>
                          <TouchableOpacity
                            style={[styles.quantityButton, { backgroundColor: theme.cardBackground }]}
                            onPress={() => updateQuantity(item.id, -1)}
                          >
                            <Ionicons name="remove" size={18} color={theme.text} />
                          </TouchableOpacity>
                          <Text style={[styles.quantityText, { color: theme.text }]}>
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            style={[styles.quantityButton, { backgroundColor: theme.cardBackground }]}
                            onPress={() => updateQuantity(item.id, 1)}
                          >
                            <Ionicons name="add" size={18} color={theme.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeFromCart(item.id)}
                          >
                            <Ionicons name="trash-outline" size={18} color={theme.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    <View style={styles.specialInstructionsContainer}>
                      <Text style={[styles.specialInstructionsLabel, { color: theme.text }]}>
                        Special Instructions (Optional)
                      </Text>
                      <TextInput
                        style={[
                          styles.specialInstructionsInput,
                          {
                            backgroundColor: theme.cardBackground,
                            borderColor: theme.border,
                            color: theme.text,
                          },
                        ]}
                        placeholder="Any special requests?"
                        placeholderTextColor={theme.subtext}
                        value={specialInstructions}
                        onChangeText={setSpecialInstructions}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </>
                )}
              </ScrollView>
              {cart.length > 0 && (
                <View style={[styles.cartFooter, { borderTopColor: theme.border }]}>
                  <View style={styles.priceBreakdown}>
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, { color: theme.subtext }]}>Subtotal:</Text>
                      <Text style={[styles.priceValue, { color: theme.text }]}>
                        ${subtotal.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, { color: theme.subtext }]}>Tax:</Text>
                      <Text style={[styles.priceValue, { color: theme.text }]}>
                        ${tax.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceLabel, { color: theme.subtext }]}>Service Fee:</Text>
                      <Text style={[styles.priceValue, { color: theme.text }]}>
                        ${serviceFee.toFixed(2)}
                      </Text>
                    </View>
                    <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                      <Text style={[styles.totalLabel, { color: theme.text }]}>Total:</Text>
                      <Text style={[styles.totalAmount, { color: theme.primary }]}>
                        ${cartTotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: theme.primary }]}
                    onPress={handleCheckout}
                    disabled={processingPayment}
                  >
                    <Text style={styles.checkoutButtonText}>Proceed to Payment</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {checkoutStep === 'payment' && (
            <>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                  onPress={() => setCheckoutStep('cart')}
                  disabled={processingPayment}
                >
                  <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Payment</Text>
                <View style={{ width: 24 }} />
              </View>
              <ScrollView
                style={styles.paymentContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Order Summary</Text>
                {cart.map(item => (
                  <View key={item.id} style={styles.summaryRow}>
                    <Text style={[styles.summaryText, { color: theme.subtext }]}>
                      {item.name} x{item.quantity}
                    </Text>
                    <Text style={[styles.summaryText, { color: theme.text }]}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                {specialInstructions.trim() && (
                  <View style={styles.specialInstructionsDisplay}>
                    <Text style={[styles.specialInstructionsLabel, { color: theme.text }]}>
                      Special Instructions:
                    </Text>
                    <Text style={[styles.specialInstructionsText, { color: theme.subtext }]}>
                      {specialInstructions}
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryText, { color: theme.subtext }]}>Subtotal:</Text>
                  <Text style={[styles.summaryText, { color: theme.text }]}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryText, { color: theme.subtext }]}>Tax:</Text>
                  <Text style={[styles.summaryText, { color: theme.text }]}>
                    ${tax.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryText, { color: theme.subtext }]}>Service Fee:</Text>
                  <Text style={[styles.summaryText, { color: theme.text }]}>
                    ${serviceFee.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryTotal, { color: theme.text }]}>Total</Text>
                  <Text style={[styles.summaryTotal, { color: theme.primary }]}>
                    ${cartTotal.toFixed(2)}
                  </Text>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>
                  Payment Method
                </Text>
                <View
                  style={[
                    styles.paymentMethodCard,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="card" size={24} color={theme.primary} />
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[styles.paymentMethodTitle, { color: theme.text }]}>
                      Stripe Payment
                    </Text>
                    <Text style={[styles.paymentMethodDesc, { color: theme.subtext }]}>
                      Secure payment processing
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
                </View>

                <TouchableOpacity
                  style={[
                    styles.payButton,
                    {
                      backgroundColor: processingPayment ? theme.subtext : theme.primary,
                      opacity: processingPayment ? 0.6 : 1,
                    },
                  ]}
                  onPress={handleStripePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payButtonText}>Pay ${cartTotal.toFixed(2)}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </>
          )}

          {checkoutStep === 'processing' && (
            <View style={styles.processingView}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.processingText, { color: theme.text }]}>
                Processing Payment...
              </Text>
              <Text style={[styles.processingSubtext, { color: theme.subtext }]}>
                Please wait while we process your order
              </Text>
            </View>
          )}

          {checkoutStep === 'confirmation' && (
            <View style={styles.confirmationView}>
              <Ionicons name="checkmark-circle" size={80} color="#34C759" />
              <Text style={[styles.confirmationTitle, { color: theme.text }]}>
                Order Confirmed!
              </Text>
              {orderNumber && (
                <Text style={[styles.orderNumber, { color: theme.primary }]}>
                  Order #{orderNumber.slice(-8).toUpperCase()}
                </Text>
              )}
              <Text style={[styles.confirmationText, { color: theme.subtext }]}>
                Your order has been placed and will be ready soon.
              </Text>
              <Text style={[styles.confirmationSubtext, { color: theme.subtext }]}>
                You'll receive a confirmation email shortly.
              </Text>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setCart([]);
                  setSpecialInstructions('');
                  setShowCheckout(false);
                  setCheckoutStep('cart');
                  setOrderNumber(null);
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Bar Menu</Text>
        <TouchableOpacity onPress={() => setShowCheckout(true)}>
          <View style={styles.cartIconContainer}>
            <Ionicons name="cart" size={24} color={theme.text} />
            {cartItemCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
        <Ionicons name="search" size={20} color={theme.subtext} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search menu items..."
          placeholderTextColor={theme.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              {
                backgroundColor: selectedCategory === category ? theme.primary : theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                { color: selectedCategory === category ? '#fff' : theme.text },
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu Items */}
      <ScrollView
        style={styles.menuList}
        contentContainerStyle={styles.menuListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color={theme.subtext} />
            <Text style={[styles.emptyStateText, { color: theme.text }]}>
              No items found
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: theme.subtext }]}>
              Try adjusting your search or filter
            </Text>
          </View>
        ) : (
          filteredItems.map(renderMenuItem)
        )}
      </ScrollView>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && (
        <TouchableOpacity
          style={[styles.floatingCartButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowCheckout(true)}
        >
          <View style={styles.floatingCartContent}>
            <View style={styles.floatingCartInfo}>
              <Text style={styles.floatingCartCount}>{cartItemCount} items</Text>
              <Text style={styles.floatingCartTotal}>${cartTotal.toFixed(2)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {renderCheckoutModal()}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  categoryFilter: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuList: {
    flex: 1,
  },
  menuListContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 16,
  },
  menuItemImage: {
    width: 120,
    height: 120,
    backgroundColor: '#E5E5E5',
  },
  menuItemContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  menuItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  unavailableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  menuItemDescription: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  menuItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    fontSize: 14,
    fontWeight: '500',
  },
  floatingCartTotal: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  cartItems: {
    maxHeight: 400,
    padding: 16,
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 16,
    marginTop: 12,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
    marginLeft: 4,
  },
  specialInstructionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  specialInstructionsLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  specialInstructionsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  cartFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  priceBreakdown: {
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  checkoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
  },
  specialInstructionsDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  specialInstructionsText: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 13,
  },
  payButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  processingView: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  processingText: {
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  processingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  confirmationView: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1,
  },
  confirmationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  doneButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
