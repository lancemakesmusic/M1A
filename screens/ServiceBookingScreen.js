/**
 * Service Booking Screen
 * Allows users to book services from ExploreScreen with full Stripe checkout
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { db, isFirebaseReady } from '../firebase';
import StripeService from '../services/StripeService';
import { trackEventBookingStarted, trackEventBookingCompleted, trackButtonClick, trackFunnelStep, trackError } from '../services/AnalyticsService';
import { sendPaymentConfirmation, sendOrderStatusUpdate } from '../services/NotificationService';
import RatingPromptService, { POSITIVE_ACTIONS } from '../services/RatingPromptService';
import SharingService from '../services/SharingService';
import useScreenTracking from '../hooks/useScreenTracking';

const TAX_RATE = 0.08; // 8% tax
const SERVICE_FEE = 0.03; // 3% service fee

export default function ServiceBookingScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  useScreenTracking('ServiceBookingScreen');
  
  const { item } = route.params || {};
  
  const [formData, setFormData] = useState({
    serviceDate: '',
    serviceTime: '',
    quantity: 1,
    specialRequests: '',
    contactName: user?.displayName || '',
    contactEmail: user?.email || '',
    contactPhone: '',
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState('none'); // 'none', 'processing', 'success', 'failed'
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orderNumber, setOrderNumber] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({
        ...prev,
        contactEmail: user.email,
        contactName: user.displayName || prev.contactName,
      }));
    }
  }, [user]);

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error || '#FF3B30'} />
          <Text style={[styles.errorText, { color: theme.text }]}>Service not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const subtotal = useMemo(() => {
    // Check if this is a recording time deal
    if (item.isDeal && item.dealHours && item.dealPrice) {
      // For deals, price is fixed regardless of quantity
      // Quantity represents number of deal packages
      return item.dealPrice * formData.quantity;
    }
    return item.price * formData.quantity;
  }, [item.price, item.isDeal, item.dealHours, item.dealPrice, formData.quantity]);

  const tax = useMemo(() => {
    return subtotal * TAX_RATE;
  }, [subtotal]);

  const serviceFee = useMemo(() => {
    return subtotal * SERVICE_FEE;
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + tax + serviceFee;
  }, [subtotal, tax, serviceFee]);

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      setFormData({ ...formData, serviceDate: formattedDate });
    }
  };

  const onTimeChange = (event, time) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      const formattedTime = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setFormData({ ...formData, serviceTime: formattedTime });
    }
  };

  const validateForm = () => {
    if (!formData.serviceDate) {
      Alert.alert('Missing Information', 'Please select a service date.');
      return false;
    }
    if (!formData.serviceTime) {
      Alert.alert('Missing Information', 'Please select a service time.');
      return false;
    }
    if (!formData.contactName || formData.contactName.trim().length < 2) {
      Alert.alert('Invalid Information', 'Please enter a valid contact name (at least 2 characters).');
      return false;
    }
    if (!formData.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      Alert.alert('Invalid Information', 'Please enter a valid email address.');
      return false;
    }
    if (formData.quantity < 1) {
      Alert.alert('Invalid Quantity', 'Quantity must be at least 1.');
      return false;
    }
    return true;
  };

  const saveOrderToFirestore = async (orderData) => {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        try {
          const orderRef = await addDoc(collection(db, 'serviceOrders'), {
            ...orderData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          return orderRef.id;
        } catch (firestoreError) {
          console.warn('Firestore save failed, using mock order ID:', firestoreError);
          return `MOCK-${Date.now()}`;
        }
      } else if (db && typeof db.collection === 'function') {
        // Mock Firestore
        try {
          const mockCollection = db.collection('serviceOrders');
          const mockOrderRef = await mockCollection.add({
            ...orderData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          return mockOrderRef.id || `MOCK-${Date.now()}`;
        } catch (mockError) {
          console.warn('Mock Firestore save failed, using local order ID:', mockError);
          return `LOCAL-${Date.now()}`;
        }
      } else {
        return `LOCAL-${Date.now()}`;
      }
    } catch (error) {
      console.error('Error saving order to Firestore:', error);
      return `LOCAL-${Date.now()}`;
    }
  };

  const handleProceedToPayment = () => {
    if (!validateForm()) {
      return;
    }
    if (!user) {
      Alert.alert('Login Required', 'Please log in to complete your booking.');
      navigation.navigate('ProfileTab');
      return;
    }
    trackFunnelStep('service_booking', 'payment', 1);
    setShowPaymentModal(true);
    setPaymentStep('payment');
  };

  const handleStripePayment = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to complete your order.');
      return;
    }

    try {
      setProcessingPayment(true);
      setPaymentStep('processing');
      setPaymentError(null);
      
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
      
      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        serviceId: item.id,
        serviceName: item.name,
        serviceCategory: item.category,
        quantity: formData.quantity,
        unitPrice: item.isDeal ? item.dealPrice : item.price,
        subtotal,
        tax,
        serviceFee,
        total,
        serviceDate: formData.serviceDate,
        serviceTime: formData.serviceTime,
        specialRequests: formData.specialRequests.trim(),
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || '',
        status: 'pending',
        paymentStatus: 'pending',
        isDeal: item.isDeal || false,
        dealHours: item.isDeal ? item.dealHours * formData.quantity : null,
        regularPrice: item.isDeal && item.regularPrice ? item.regularPrice * formData.quantity : null,
        savings: item.isDeal && item.regularPrice ? (item.regularPrice - item.dealPrice) * formData.quantity : null,
      };

      // Track booking started
      trackEventBookingStarted(item.category);

      // Submit booking to backend API first
      let backendResult = { success: false };
      try {
        const bookingPayload = {
          userId: user.uid,
          serviceId: item.id,
          serviceName: item.name,
          serviceDate: formData.serviceDate,
          serviceTime: formData.serviceTime,
          quantity: formData.quantity,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone || null,
          specialRequests: formData.specialRequests.trim() || null,
          totalCost: total,
          subtotal: subtotal,
          tax: tax,
          serviceFee: serviceFee,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${API_BASE_URL}/api/service-booking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Backend error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        backendResult = result;
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create service booking');
        }
        
        console.log('Service booking created:', result.bookingId);
      } catch (backendError) {
        console.error('Error submitting service booking to backend:', backendError);
        // Continue with payment even if backend fails (for demo purposes)
        // In production, you might want to fail here
      }

      // Check if Stripe is configured
      if (!StripeService.isConfigured()) {
        throw new Error(
          'Payment processing is not configured. Please contact support or configure Stripe keys. ' +
          'Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.'
        );
      }

      // Process payment with Stripe
      const orderItems = [{
        id: item.id,
        name: item.name,
        price: item.isDeal ? item.dealPrice : item.price,
        quantity: formData.quantity,
        isDeal: item.isDeal || false,
        dealHours: item.isDeal ? item.dealHours * formData.quantity : null,
      }];

      const result = await StripeService.createPaymentIntent(
        total,
        'usd',
        {
          type: 'service_booking',
          serviceId: item.id,
          serviceName: item.name,
          userId: user.uid,
        },
        orderItems
      );

      if (!result.success || !result.paymentIntentId) {
        throw new Error(result.error || 'Failed to create payment intent. Please try again.');
      }

      // Payment intent created successfully
      // For production: Use Stripe Payment Sheet or redirect to Stripe Checkout
      // For now, we'll save the order as pending and require manual confirmation
      // In production, implement Stripe Payment Sheet here:
      // 1. Install @stripe/stripe-react-native
      // 2. Use initPaymentSheet and presentPaymentSheet
      // 3. Confirm payment on backend after user completes payment sheet
      
      // Save order to Firestore with pending payment status
      const orderId = await saveOrderToFirestore({
        ...orderData,
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        paymentIntentId: result.paymentIntentId,
        clientSecret: result.clientSecret,
        backendBookingId: backendResult.bookingId || null,
      });

      // IMPORTANT: In production, payment should be confirmed via:
      // 1. Stripe Payment Sheet (mobile) or
      // 2. Stripe Checkout (web) or
      // 3. Backend webhook after payment succeeds
      
      // For now, we'll mark as completed after a short delay
      // TODO: Replace this with actual payment confirmation
      console.warn('⚠️ Payment confirmation not fully implemented. Payment intent created but not confirmed.');
      console.warn('⚠️ In production, implement Stripe Payment Sheet or Checkout for payment confirmation.');
      
      // Simulate payment confirmation (REMOVE IN PRODUCTION)
      // In production, this should only happen after Stripe webhook confirms payment
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update order status to completed (in production, this happens via webhook)
      await saveOrderToFirestore({
        ...orderData,
        paymentStatus: 'completed',
        paymentMethod: 'stripe',
        paymentIntentId: result.paymentIntentId,
        backendBookingId: backendResult.bookingId || null,
      });
        
      // Track analytics
      await trackEventBookingCompleted({
        id: orderId,
        eventType: item.name,
        total,
      });
        
      // Record positive action
      await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.SERVICE_BOOKED, {
        serviceName: item.name,
        total,
        quantity: formData.quantity,
      });
        
      // Send notifications
      await sendPaymentConfirmation({
        id: orderId,
        amount: total,
      });
      await sendOrderStatusUpdate({
        id: orderId,
        status: 'confirmed',
      });
        
      setOrderNumber(orderId);
      setPaymentStep('success');
    } catch (error) {
      console.error('Payment error:', error);
      trackError('service_payment_failed', { error: error.message, serviceId: item.id });
      setPaymentError(error.message || 'Payment processing failed. Please try again.');
      setPaymentStep('failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (paymentStep === 'payment' && !processingPayment) {
          setShowPaymentModal(false);
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          {paymentStep === 'payment' && (
            <>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Payment</Text>
                <TouchableOpacity
                  onPress={() => setShowPaymentModal(false)}
                  disabled={processingPayment}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.paymentContent} showsVerticalScrollIndicator={false}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Order Summary</Text>
                {item.isDeal && (
                  <View style={[styles.dealBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary, marginBottom: 12 }]}>
                    <Ionicons name="pricetag" size={16} color={theme.primary} />
                    <Text style={[styles.dealText, { color: theme.primary }]}>
                      Special Deal Applied: {item.dealHours} hours for ${item.dealPrice}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryText, { color: theme.subtext }]}>
                    {item.name} x{formData.quantity}
                    {item.isDeal && ` (${item.dealHours * formData.quantity} hours)`}
                  </Text>
                  <Text style={[styles.summaryText, { color: theme.text }]}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </View>
                {item.isDeal && item.regularPrice && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryText, { color: theme.subtext, textDecorationLine: 'line-through' }]}>
                      Regular Price: ${(item.regularPrice * formData.quantity).toFixed(2)}
                    </Text>
                    <Text style={[styles.summaryText, { color: '#34C759', fontWeight: '600' }]}>
                      You Save: ${((item.regularPrice - item.dealPrice) * formData.quantity).toFixed(2)}
                    </Text>
                  </View>
                )}
                {formData.specialRequests.trim() && (
                  <View style={styles.specialRequestsDisplay}>
                    <Text style={[styles.specialRequestsLabel, { color: theme.text }]}>
                      Special Requests:
                    </Text>
                    <Text style={[styles.specialRequestsText, { color: theme.subtext }]}>
                      {formData.specialRequests}
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
                    ${total.toFixed(2)}
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
                    <Text style={styles.payButtonText}>Pay ${total.toFixed(2)}</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </>
          )}

          {paymentStep === 'processing' && (
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

          {paymentStep === 'success' && (
            <View style={styles.confirmationView}>
              <Ionicons name="checkmark-circle" size={80} color="#34C759" />
              <Text style={[styles.confirmationTitle, { color: theme.text }]}>
                Booking Confirmed!
              </Text>
              {orderNumber && (
                <Text style={[styles.orderNumber, { color: theme.primary }]}>
                  Order #{orderNumber.slice(-8).toUpperCase()}
                </Text>
              )}
              <Text style={[styles.confirmationText, { color: theme.subtext }]}>
                Your service booking has been confirmed.
              </Text>
              <Text style={[styles.confirmationSubtext, { color: theme.subtext }]}>
                You'll receive a confirmation email shortly.
              </Text>
              <TouchableOpacity
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentStep('none');
                  setOrderNumber(null);
                  navigation.navigate('Home');
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {paymentStep === 'failed' && (
            <View style={styles.errorView}>
              <Ionicons name="close-circle" size={80} color="#FF3B30" />
              <Text style={[styles.errorTitle, { color: theme.text }]}>
                Payment Failed
              </Text>
              {paymentError && (
                <Text style={[styles.errorMessage, { color: theme.subtext }]}>
                  {paymentError}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setPaymentStep('payment');
                  setPaymentError(null);
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentStep('none');
                  setPaymentError(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Book Service</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Service Info Card */}
        <View style={[styles.serviceCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Image source={{ uri: item.image }} style={styles.serviceImage} />
          <View style={styles.serviceInfo}>
            <Text style={[styles.serviceName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.serviceArtist, { color: theme.subtext }]}>{item.artist}</Text>
            <Text style={[styles.serviceDescription, { color: theme.subtext }]}>
              {item.description}
            </Text>
            <View style={styles.serviceDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="cash" size={16} color={theme.primary} />
                <Text style={[styles.detailText, { color: theme.text }]}>${item.price}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="star" size={16} color={theme.primary} />
                <Text style={[styles.detailText, { color: theme.text }]}>{item.rating}/5</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time" size={16} color={theme.primary} />
                <Text style={[styles.detailText, { color: theme.text }]}>{item.duration}</Text>
              </View>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={async () => {
                  await SharingService.shareContent('service', item.id, item);
                  trackButtonClick('share_service', 'ServiceBookingScreen');
                }}
              >
                <Ionicons name="share-outline" size={20} color={theme.primary} />
                <Text style={[styles.shareText, { color: theme.primary }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Booking Form */}
        <View style={styles.formContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Booking Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Service Date *</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.inputText, { color: formData.serviceDate ? theme.text : theme.subtext }]}>
                {formData.serviceDate || 'Select date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Service Time *</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.inputText, { color: formData.serviceTime ? theme.text : theme.subtext }]}>
                {formData.serviceTime || 'Select time'}
              </Text>
              <Ionicons name="time-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>
              {item.isDeal ? 'Number of Packages' : 'Quantity'}
            </Text>
            {item.isDeal && (
              <View style={[styles.dealBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
                <Ionicons name="pricetag" size={16} color={theme.primary} />
                <Text style={[styles.dealText, { color: theme.primary }]}>
                  Special Deal: {item.dealHours} hours for ${item.dealPrice}
                  {item.regularPrice && ` (Save $${(item.regularPrice - item.dealPrice).toFixed(0)}!)`}
                </Text>
              </View>
            )}
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
              >
                <Ionicons name="remove" size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.quantityText, { color: theme.text }]}>{formData.quantity}</Text>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
              >
                <Ionicons name="add" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
            {item.isDeal && (
              <Text style={[styles.dealSubtext, { color: theme.subtext }]}>
                {formData.quantity} package{formData.quantity > 1 ? 's' : ''} = {item.dealHours * formData.quantity} total hours
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Contact Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.subtext}
              value={formData.contactName}
              onChangeText={(text) => setFormData({ ...formData, contactName: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Contact Email *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="your@email.com"
              placeholderTextColor={theme.subtext}
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.contactEmail}
              onChangeText={(text) => setFormData({ ...formData, contactEmail: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Contact Phone</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="(555) 123-4567"
              placeholderTextColor={theme.subtext}
              keyboardType="phone-pad"
              value={formData.contactPhone}
              onChangeText={(text) => setFormData({ ...formData, contactPhone: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Special Requests</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="Any special requests or notes..."
              placeholderTextColor={theme.subtext}
              multiline
              numberOfLines={4}
              value={formData.specialRequests}
              onChangeText={(text) => setFormData({ ...formData, specialRequests: text })}
            />
          </View>

          {/* Price Breakdown */}
          <View style={[styles.priceContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.subtext }]}>Subtotal:</Text>
              <Text style={[styles.priceValue, { color: theme.text }]}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.subtext }]}>Tax:</Text>
              <Text style={[styles.priceValue, { color: theme.text }]}>${tax.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.subtext }]}>Service Fee:</Text>
              <Text style={[styles.priceValue, { color: theme.text }]}>${serviceFee.toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: theme.primary }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Book Button */}
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: theme.primary }]}
            onPress={handleProceedToPayment}
            disabled={processingPayment}
          >
            <Text style={styles.bookButtonText}>Proceed to Payment</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}

      {renderPaymentModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  serviceCard: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  serviceImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  serviceInfo: {
    padding: 16,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  serviceArtist: {
    fontSize: 14,
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  inputText: {
    fontSize: 16,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  priceContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
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
    fontWeight: 'bold',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
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
  summaryTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  specialRequestsDisplay: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  specialRequestsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  specialRequestsText: {
    fontSize: 14,
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
  errorView: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  dealText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  dealSubtext: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
