/**
 * Service Booking Screen
 * Allows users to book services from ExploreScreen with full Stripe checkout
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { db, isFirebaseReady } from '../firebase';
import WalletService from '../services/WalletService';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackError, trackEventBookingCompleted, trackEventBookingStarted, trackFunnelStep } from '../services/AnalyticsService';
import GoogleCalendarService from '../services/GoogleCalendarService';
import { sendOrderStatusUpdate, sendPaymentConfirmation } from '../services/NotificationService';
import { sendBookingConfirmationEmail, sendPaymentConfirmationEmail, sendRSVPConfirmationEmail } from '../services/EmailService';
import RatingPromptService, { POSITIVE_ACTIONS } from '../services/RatingPromptService';
import SharingService from '../services/SharingService';
import StripeService from '../services/StripeService';
import { handleError, getUserFriendlyError } from '../utils/errorHandler';

const TAX_RATE = 0.08; // 8% tax
const SERVICE_FEE = 0.03; // 3% service fee

/**
 * Sync booking to Google Calendar (admin@merkabaent.com)
 * This function creates a calendar event for the booking
 */
const syncBookingToCalendar = async (orderId, item, formData, total, user) => {
  try {
    // Check if Google Calendar is connected
    const isConnected = await GoogleCalendarService.isConnected();
    if (!isConnected) {
      console.log('📅 Google Calendar not connected - skipping calendar sync');
      return { success: false, error: 'Calendar not connected' };
    }

    // Only sync if we have date/time information
    if (!formData.serviceDate || !formData.serviceTime) {
      console.log('📅 No date/time information - skipping calendar sync');
      return { success: false, error: 'No date/time information' };
    }

    // Parse service date (format: "Monday, January 1, 2024")
    const dateMatch = formData.serviceDate.match(/(\w+), (\w+) (\d+), (\d+)/);
    if (!dateMatch) {
      console.warn('📅 Invalid date format:', formData.serviceDate);
      return { success: false, error: 'Invalid date format' };
    }

    const [, , monthName, day, year] = dateMatch;
    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    const month = monthMap[monthName] ?? 0;

    // Parse time (format: "6:00 PM" or "18:00")
    let startHour, startMinute;
    if (formData.serviceTime.includes('AM') || formData.serviceTime.includes('PM')) {
      const timeParts = formData.serviceTime.replace(/[AP]M/i, '').trim().split(':');
      startHour = parseInt(timeParts[0] || 0);
      startMinute = parseInt(timeParts[1] || 0);
      if (formData.serviceTime.toUpperCase().includes('PM') && startHour !== 12) {
        startHour += 12;
      } else if (formData.serviceTime.toUpperCase().includes('AM') && startHour === 12) {
        startHour = 0;
      }
    } else {
      const timeParts = formData.serviceTime.split(':');
      startHour = parseInt(timeParts[0] || 0);
      startMinute = parseInt(timeParts[1] || 0);
    }

    const startDate = new Date(parseInt(year), month, parseInt(day), startHour, startMinute);

    // Calculate end date based on service duration
    // For deals, use dealHours; otherwise estimate 1 hour per service
    const durationHours = item.isDeal && item.dealHours 
      ? item.dealHours * (formData.quantity || 1) 
      : (formData.quantity || 1);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + durationHours);

    // Check availability (non-blocking - just log warnings)
    const availability = await GoogleCalendarService.checkAvailability(startDate, endDate);
    if (availability && !availability.available && !availability.warning) {
      console.warn('⚠️ Service time slot may have conflicts:', availability.reason);
    }

    // Create calendar event
    const eventTitle = `${item.name} - ${formData.contactName || user?.displayName || 'Customer'}`;
    const eventDescription = `Service: ${item.name}\n` +
      `Quantity: ${formData.quantity || 1}\n` +
      (item.isDeal && item.dealHours ? `Hours: ${item.dealHours * (formData.quantity || 1)}\n` : '') +
      `Total Cost: $${total.toFixed(2)}\n` +
      `Contact: ${formData.contactEmail || user?.email || 'N/A'} | ${formData.contactPhone || 'N/A'}\n` +
      (formData.specialRequests ? `Special Requests: ${formData.specialRequests}\n` : '') +
      `Order ID: ${orderId}`;

    // Include admin@merkabaent.com and customer email as attendees
    const attendees = [
      { email: 'admin@merkabaent.com' },
    ];
    if (formData.contactEmail || user?.email) {
      attendees.push({ email: formData.contactEmail || user.email });
    }

    const calendarResult = await GoogleCalendarService.createEvent({
      title: eventTitle,
      description: eventDescription,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      location: item.location || formData.location || 'Merkaba Venue',
      attendees: attendees,
      timeZone: 'America/New_York',
    });

    if (calendarResult.success) {
      console.log('✅ Booking synced to Google Calendar:', calendarResult.eventId);
      return { success: true, eventId: calendarResult.eventId };
    } else {
      console.warn('⚠️ Failed to sync booking to calendar:', calendarResult.message);
      return { success: false, error: calendarResult.message };
    }
  } catch (error) {
    console.error('❌ Error syncing booking to calendar:', error);
    // Don't throw - calendar sync failure shouldn't break booking
    return { success: false, error: error.message };
  }
};

export default function ServiceBookingScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { balance: walletBalance, refreshBalance } = useWallet();
  useScreenTracking('ServiceBookingScreen');
  
  const routeItem = route.params?.item;
  const [selectedItem, setSelectedItem] = useState(routeItem || null);
  
  // Update selectedItem when route params change
  useEffect(() => {
    if (routeItem) {
      setSelectedItem(routeItem);
    }
  }, [routeItem]);
  
  const item = selectedItem;
  
  const [formData, setFormData] = useState({
    serviceDate: '',
    serviceTime: '',
    quantity: 1,
    specialRequests: '',
    contactName: user?.displayName || '',
    contactEmail: user?.email || '',
    contactPhone: '',
    // Event-specific fields
    ticketType: 'regular', // 'regular', 'earlyBird', 'vip'
    discountCode: '',
    discountApplied: false,
  });

  // For events, auto-populate date from event data (admin-set date)
  useEffect(() => {
    if (item?.category === 'Events') {
      // Events can have eventDate or startDate (from publicEvents collection)
      // Handle both ISO strings (from navigation) and Date/Timestamp objects
      const eventDateValue = item.eventDate || item.startDate;
      if (eventDateValue) {
        let eventDate;
        if (typeof eventDateValue === 'string') {
          // ISO string from navigation params
          eventDate = new Date(eventDateValue);
        } else if (eventDateValue?.toDate) {
          // Firestore Timestamp
          eventDate = eventDateValue.toDate();
        } else if (eventDateValue instanceof Date) {
          // Date object
          eventDate = eventDateValue;
        } else {
          eventDate = new Date(eventDateValue);
        }
        
        const formattedDate = eventDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const formattedTime = eventDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        setFormData(prev => ({
          ...prev,
          serviceDate: formattedDate,
          serviceTime: formattedTime,
        }));
      }
    }
  }, [item]);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState('none'); // 'none', 'submitting', 'checking', 'processing', 'success', 'failed'
  const [processingPayment, setProcessingPayment] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
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

  // Available services for selection (when no item is provided)
  const availableServices = [
    {
      id: '6',
      name: 'Vocal Recording',
      description: 'Elevate your sound with our industry-quality vocal recording service, complete with final mix and mastering options.',
      price: 50,
      category: 'Services',
      subcategory: 'Audio Production',
      rating: 4.9,
      popularity: 95,
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=800&fit=crop&q=80',
      artist: 'Merkaba Entertainment',
      duration: '1 hr+',
    },
    {
      id: '20',
      name: 'Recording Time',
      description: 'Professional studio recording time. Special deal: 10 hours for $200 (save $300!).',
      price: 200,
      category: 'Services',
      subcategory: 'Audio Production',
      rating: 5.0,
      popularity: 98,
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=800&fit=crop&q=80',
      artist: 'Merkaba Entertainment',
      duration: '10 hours',
      isDeal: true,
      dealHours: 10,
      dealPrice: 200,
      regularPrice: 500,
    },
    {
      id: '7',
      name: 'Photography',
      description: 'Capture your most precious moments with our high-quality photography services tailored to meet your individual needs.',
      price: 150,
      category: 'Services',
      subcategory: 'Photography',
      rating: 4.8,
      popularity: 92,
      image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop&q=80',
      artist: 'Merkaba Entertainment',
      duration: '1 hr+',
    },
    {
      id: '8',
      name: 'Videography',
      description: 'Experience top-tier videography services tailored to your unique event needs.',
      price: 500,
      category: 'Services',
      subcategory: 'Video Production',
      rating: 4.9,
      popularity: 94,
      image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=800&fit=crop&q=80',
      artist: 'Merkaba Entertainment',
      duration: '3 hrs+',
    },
    {
      id: '9',
      name: 'Graphic Design',
      description: 'Elevate your brand with our high-quality custom graphic design service.',
      price: 50,
      category: 'Services',
      subcategory: 'Design',
      rating: 4.8,
      popularity: 88,
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop&q=80',
      artist: 'Merkaba Entertainment',
      duration: '30 mins',
    },
    {
      id: '10',
      name: 'Website Development',
      description: 'Experience a tailored website development service designed to enhance user experience and drive traffic.',
      price: 250,
      category: 'Services',
      subcategory: 'Web Development',
      rating: 4.9,
      popularity: 90,
      image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=800&fit=crop&q=80',
      artist: 'Merkaba Entertainment',
      duration: '30 mins',
    },
  ];

  // If no item provided, show service selection screen
  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        {/* Header with Back Button */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Book a Service</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.serviceSelectionContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Select a Service</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
              Choose from our available services to get started
            </Text>

            {availableServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => {
                  // Update the selected item state
                  setSelectedItem(service);
                }}
                activeOpacity={0.7}
              >
                {service.image && (
                  <Image
                    source={{ uri: service.image }}
                    style={styles.serviceImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.serviceCardContent}>
                  <View style={styles.serviceCardHeader}>
                    <Text style={[styles.serviceName, { color: theme.text }]}>{service.name}</Text>
                    {service.isDeal && (
                      <View style={[styles.dealBadge, { backgroundColor: '#34C759' }]}>
                        <Ionicons name="pricetag" size={14} color="#fff" />
                        <Text style={styles.dealBadgeText}>DEAL</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.serviceDescription, { color: theme.subtext }]} numberOfLines={2}>
                    {service.description}
                  </Text>
                  <View style={styles.serviceCardFooter}>
                    <View style={styles.serviceRating}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={[styles.serviceRatingText, { color: theme.text }]}>
                        {service.rating?.toFixed(1) || '5.0'}
                      </Text>
                    </View>
                    <Text style={[styles.servicePrice, { color: theme.primary }]}>
                      ${service.isDeal ? service.dealPrice : service.price}
                      {service.isDeal && service.regularPrice && (
                        <Text style={[styles.regularPrice, { color: theme.subtext }]}>
                          {' '}${service.regularPrice}
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Check if early bird pricing is available
  const isEarlyBirdAvailable = useMemo(() => {
    if (item.category !== 'Events' || !item.earlyBirdPrice || !item.earlyBirdEndDate) {
      return false;
    }
    const now = new Date();
    const earlyBirdEnd = item.earlyBirdEndDate?.toDate ? item.earlyBirdEndDate.toDate() : new Date(item.earlyBirdEndDate);
    return now < earlyBirdEnd;
  }, [item.category, item.earlyBirdPrice, item.earlyBirdEndDate]);

  const subtotal = useMemo(() => {
    // Handle events differently
    if (item.category === 'Events') {
      // Determine ticket price based on selected type
      let ticketPrice = item.ticketPrice || 0;
      
      if (formData.ticketType === 'vip' && item.vipPrice) {
        ticketPrice = item.vipPrice;
      } else if (formData.ticketType === 'earlyBird' && isEarlyBirdAvailable && item.earlyBirdPrice) {
        ticketPrice = item.earlyBirdPrice;
      }
      
      // Apply discount if valid code entered
      let finalPrice = ticketPrice;
      if (formData.discountApplied && item.discountPercent) {
        finalPrice = ticketPrice * (1 - item.discountPercent / 100);
      }
      
      return finalPrice * formData.quantity;
    }
    
    // Services use existing logic
    if (item.isDeal && item.dealHours && item.dealPrice) {
      // For deals, price is fixed regardless of quantity
      // Quantity represents number of deal packages
      return item.dealPrice * formData.quantity;
    }
    return (item.price || 0) * formData.quantity;
  }, [item, formData.quantity, formData.ticketType, formData.discountApplied, isEarlyBirdAvailable]);

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
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      setFormData({ ...formData, serviceDate: formattedDate });
      if (Platform.OS === 'ios') {
        // Don't close modal here - let user tap "Done" button
      }
    }
  };

  const onTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (time) {
      setSelectedTime(time);
      const formattedTime = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setFormData({ ...formData, serviceTime: formattedTime });
      if (Platform.OS === 'ios') {
        // Don't close modal here - let user tap "Done" button
      }
    }
  };

  // Validate discount code for events
  const validateDiscountCode = () => {
    if (item.category === 'Events' && item.discountEnabled && formData.discountCode.trim()) {
      const enteredCode = formData.discountCode.trim().toUpperCase();
      const validCode = item.discountCode?.trim().toUpperCase();
      
      if (enteredCode === validCode) {
        setFormData(prev => ({ ...prev, discountApplied: true }));
        return true;
      } else {
        Alert.alert(
          'Invalid Discount Code',
          'The discount code you entered is not valid. Please check and try again.',
          [{ text: 'OK' }]
        );
        setFormData(prev => ({ ...prev, discountApplied: false }));
        return false;
      }
    }
    return true;
  };

  const validateForm = () => {
    // For events, date/time are pre-set by admin, skip validation
    if (item.category !== 'Events') {
      if (!formData.serviceDate) {
        Alert.alert(
          'Date Required',
          'Please select a date for your service booking.',
          [{ text: 'OK' }]
        );
        return false;
      }
      if (!formData.serviceTime) {
        Alert.alert(
          'Time Required',
          'Please select a time for your service booking.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    if (!formData.contactName || formData.contactName.trim().length < 2) {
      Alert.alert(
        'Contact Name Required',
        'Please enter your full name (at least 2 characters).',
        [{ text: 'OK' }]
      );
      return false;
    }
    if (!formData.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      Alert.alert(
        'Email Required',
        'Please enter a valid email address for your booking confirmation.',
        [{ text: 'OK' }]
      );
      return false;
    }
    if (formData.quantity < 1) {
      Alert.alert(
        'Invalid Quantity',
        'Please select a quantity of at least 1.',
        [{ text: 'OK' }]
      );
      return false;
    }
    // Validate discount code if entered
    if (!validateDiscountCode()) {
      return false;
    }
    // For events, ticket price can be 0 (free tickets are allowed)
    // No validation needed - free tickets are valid
    return true;
  };

  const saveOrderToFirestore = async (orderData) => {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        try {
          // Determine collection based on item category
          const collectionName = item.category === 'Events' ? 'eventOrders' : 'serviceOrders';
          
          // Add event-specific fields for events
          const orderDataWithEventFields = item.category === 'Events' ? {
            ...orderData,
            eventId: item.id,
            eventName: item.name,
            ticketType: formData.ticketType || 'regular',
            ticketPrice: formData.ticketType === 'vip' ? (item.vipPrice || item.ticketPrice) :
                        formData.ticketType === 'earlyBird' ? (item.earlyBirdPrice || item.ticketPrice) :
                        (item.ticketPrice || 0),
            discountCode: formData.discountCode || null,
            discountApplied: formData.discountApplied || false,
            discountPercent: formData.discountApplied && item.discountPercent ? item.discountPercent : null,
          } : orderData;
          
          const orderRef = await addDoc(collection(db, collectionName), {
            ...orderDataWithEventFields,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          
          // Create guest list entry for events
          if (item.category === 'Events') {
            const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await addDoc(collection(db, 'eventBookings'), {
              eventId: item.id,
              eventName: item.name,
              userId: user.uid,
              userEmail: user.email,
              userName: formData.contactName,
              ticketType: formData.ticketType || 'regular',
              quantity: formData.quantity,
              orderId: orderRef.id,
              status: 'confirmed',
              ticketId: ticketId,
              createdAt: serverTimestamp(),
            });
            console.log('✅ Guest list entry created in eventBookings');
          }
          
          return orderRef.id;
        } catch (firestoreError) {
          console.error('Firestore save failed:', firestoreError);
          throw firestoreError;
        }
      } else {
        throw new Error('Firestore not ready');
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
      Alert.alert(
        'Login Required',
        'Please log in to complete your booking. You\'ll be redirected to the login page.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Login', 
            onPress: () => navigation.navigate('ProfileTab')
          }
        ]
      );
      return;
    }
    trackFunnelStep('service_booking', 'payment', 1);
    setShowPaymentModal(true);
    setPaymentStep('payment');
  };

  const handleStripePayment = async () => {
    console.log('💳 Payment button clicked - handleStripePayment called');
    
    if (!user) {
      console.log('❌ User not logged in');
      Alert.alert(
        'Login Required',
        'Please log in to complete your order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Login', 
            onPress: () => {
              setShowPaymentModal(false);
              navigation.navigate('ProfileTab');
            }
          }
        ]
      );
      return;
    }

    try {
      console.log('✅ Starting payment process...');
      setProcessingPayment(true);
      setPaymentError(null);
      
      // Use network IP for physical devices, localhost for web/simulator
      const getApiBaseUrl = () => {
        if (process.env.EXPO_PUBLIC_API_BASE_URL) {
          return process.env.EXPO_PUBLIC_API_BASE_URL;
        }
        if (Platform.OS === 'web') {
          return 'http://localhost:8001';
        }
        // Fallback for development (use environment variable in production)
        return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001';
      };
      const API_BASE_URL = getApiBaseUrl();
      
      // Calculate unit price for order data
      let unitPriceForOrder = item.price || 0;
      if (item.category === 'Events') {
        // Use ticket price based on selected type
        if (formData.ticketType === 'vip' && item.vipPrice) {
          unitPriceForOrder = item.vipPrice;
        } else if (formData.ticketType === 'earlyBird' && isEarlyBirdAvailable && item.earlyBirdPrice) {
          unitPriceForOrder = item.earlyBirdPrice;
        } else {
          unitPriceForOrder = item.ticketPrice || 0;
        }
        // Apply discount if valid
        if (formData.discountApplied && item.discountPercent) {
          unitPriceForOrder = unitPriceForOrder * (1 - item.discountPercent / 100);
        }
      } else if (item.isDeal) {
        unitPriceForOrder = item.dealPrice;
      }

      const orderData = {
        userId: user.uid,
        userEmail: user.email,
        serviceId: item.id,
        serviceName: item.name,
        serviceCategory: item.category,
        quantity: formData.quantity,
        unitPrice: unitPriceForOrder,
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

      // Submit booking to backend API first (skip for events and free tickets)
      let backendResult = { success: false };
      // Only submit to backend for paid service bookings (not events, not free tickets)
      if (item.category !== 'Events' && total > 0) {
        try {
          // Show loading state for backend submission
          setPaymentStep('submitting');
          setLoadingMessage('Submitting booking...');
          
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
            // Handle 404 gracefully (backend not configured)
            if (response.status === 404) {
              console.log('Backend not configured (404) - continuing with local booking');
              // Silently continue - backend is optional
            } else {
              throw new Error(`Backend error: ${response.status} ${response.statusText}`);
            }
          } else {
            const result = await response.json();
            backendResult = result;
            
            if (!result.success) {
              throw new Error(result.error || 'Failed to create service booking');
            }
            
            console.log('✅ Service booking created:', result.bookingId);
          }
        } catch (backendError) {
          // Handle network errors and other issues gracefully
          const errorMessage = backendError.message || '';
          
          // Silently handle 404 (backend not configured) and abort errors (timeout)
          if (errorMessage.includes('404') || errorMessage.includes('aborted')) {
            console.log('Backend submission skipped - backend not available');
            // Continue with booking - backend is optional
          } else {
            // Log other errors but don't block the user
            console.warn('Backend submission failed (non-critical):', backendError);
            // Don't show alert - backend submission is optional
            // The booking will still be saved to Firestore
          }
        }
      } else {
        console.log('Skipping backend booking submission for event or free ticket');
      }

      // Check availability via backend BEFORE payment (uses admin's calendar)
      if (formData.serviceDate && formData.serviceTime && item.category !== 'Events') {
        try {
          // Show loading state for availability check
          setPaymentStep('checking');
          setLoadingMessage('Checking availability...');
          
          // Parse service date and time to create start/end dates
          const serviceDateStr = formData.serviceDate;
          const serviceTimeStr = formData.serviceTime;
          
          // Parse date (format: "Monday, January 1, 2024")
          const dateMatch = serviceDateStr.match(/(\w+), (\w+) (\d+), (\d+)/);
          if (dateMatch) {
            const [, , monthName, day, year] = dateMatch;
            const monthMap = {
              'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
              'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
            };
            const month = monthMap[monthName] || 0;
            
            // Parse time (format: "6:00 PM" or "18:00")
            let startHour, startMinute;
            if (serviceTimeStr.includes('AM') || serviceTimeStr.includes('PM')) {
              const timeParts = serviceTimeStr.replace(/[AP]M/i, '').trim().split(':');
              startHour = parseInt(timeParts[0]);
              startMinute = parseInt(timeParts[1] || 0);
              if (serviceTimeStr.toUpperCase().includes('PM') && startHour !== 12) {
                startHour += 12;
              } else if (serviceTimeStr.toUpperCase().includes('AM') && startHour === 12) {
                startHour = 0;
              }
            } else {
              const timeParts = serviceTimeStr.split(':');
              startHour = parseInt(timeParts[0]);
              startMinute = parseInt(timeParts[1] || 0);
            }
            
            const startDate = new Date(parseInt(year), month, parseInt(day), startHour, startMinute);
            
            // Calculate end date based on service duration
            const durationHours = item.isDeal && item.dealHours ? item.dealHours * formData.quantity : formData.quantity;
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + durationHours);
            
            // Check availability via backend
            const idToken = await user.getIdToken();
            const availabilityResponse = await fetch(`${API_BASE_URL}/api/calendar/check-availability`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
              }),
            });

            if (availabilityResponse.ok) {
              const availabilityData = await availabilityResponse.json();
              if (!availabilityData.available) {
                Alert.alert(
                  'Time Unavailable',
                  availabilityData.reason || 'This time slot is already booked. Please select another time.',
                  [{ text: 'OK' }]
                );
                setProcessingPayment(false);
                setPaymentStep('form');
                return;
              }
            }
          }
        } catch (availabilityError) {
          // If availability check fails, log but don't block (backend will check again)
          console.warn('Availability check error, proceeding with booking. Backend will verify:', availabilityError);
        }
      }

      // Process payment with Stripe Checkout Session
      // Update loading state
      setPaymentStep('processing');
      setLoadingMessage('Processing payment...');
      
      // Calculate unit price based on item type
      let unitPrice = item.price || 0;
      if (item.category === 'Events') {
        // Use ticket price based on selected type
        if (formData.ticketType === 'vip' && item.vipPrice) {
          unitPrice = item.vipPrice;
        } else if (formData.ticketType === 'earlyBird' && isEarlyBirdAvailable && item.earlyBirdPrice) {
          unitPrice = item.earlyBirdPrice;
        } else {
          unitPrice = item.ticketPrice || 0;
        }
        // Apply discount if valid
        if (formData.discountApplied && item.discountPercent) {
          unitPrice = unitPrice * (1 - item.discountPercent / 100);
        }
      } else if (item.isDeal) {
        unitPrice = item.dealPrice;
      }
      
      const orderItems = [{
        id: item.id,
        name: item.name,
        price: unitPrice,
        quantity: formData.quantity,
        isDeal: item.isDeal || false,
        dealHours: item.isDeal ? item.dealHours * formData.quantity : null,
        ticketType: item.category === 'Events' ? formData.ticketType : null,
        discountApplied: item.category === 'Events' ? formData.discountApplied : false,
      }];

      // Handle free tickets (total === 0) - skip Stripe checkout
      if (total === 0) {
        console.log('Free ticket detected - skipping Stripe checkout');
        
        // Save order to Firestore with COMPLETED payment status
        const orderId = await saveOrderToFirestore({
          ...orderData,
          paymentStatus: 'completed',
          paymentMethod: 'free',
          backendBookingId: backendResult.bookingId || null,
        });

        // Close payment modal and reset states immediately
        setShowPaymentModal(false);
        setProcessingPayment(false);
        setPaymentStep('none');
        setOrderNumber(null);
        
        // Small delay to ensure modal closes before showing alert
        setTimeout(() => {
          // Show success message
          Alert.alert(
            'Ticket Confirmed!',
            `Your ticket for ${item.name} has been confirmed.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate back to the previous screen (HomeMain)
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    // If we can't go back, reset to HomeMain
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'HomeMain' }],
                    });
                  }
                },
              },
            ]
          );
        }, 100);
        return;
      }

      // For paid tickets, try Stripe checkout first, then fall back to wallet payment
      let orderId;
      let paymentMethod = 'stripe';
      let useWalletPayment = false;

      console.log(`💳 Processing payment: Total = $${total.toFixed(2)}, Stripe configured = ${StripeService.isConfigured()}`);

      // Try Stripe checkout first if configured
      if (StripeService.isConfigured()) {
        console.log('💳 Attempting Stripe checkout...');
        try {
          // Save order to Firestore with PENDING payment status first
          // This ensures we have an order ID before redirecting to Stripe
          orderId = await saveOrderToFirestore({
            ...orderData,
            paymentStatus: 'pending', // Will be updated to 'completed' via webhook
            paymentMethod: 'stripe',
            backendBookingId: backendResult.bookingId || null,
          });

          // Create success and cancel URLs for Stripe Checkout redirect
          const baseUrl = Linking.createURL('/');
          const successUrl = `${baseUrl}payment-success?orderId=${orderId}&session_id={CHECKOUT_SESSION_ID}`;
          const cancelUrl = `${baseUrl}payment-cancel?orderId=${orderId}`;

          // Create Stripe Checkout Session
          const checkoutResult = await StripeService.createCheckoutSession(
            total,
            'usd',
            {
              type: item.category === 'Events' ? 'event_booking' : 'service_booking',
              orderType: item.category === 'Events' ? 'event_booking' : 'service_booking',
              serviceId: item.id,
              serviceName: item.name,
              eventId: item.category === 'Events' ? item.id : null,
              eventName: item.category === 'Events' ? item.name : null,
              userId: user.uid,
              orderId: orderId,
              ticketType: item.category === 'Events' ? formData.ticketType : null,
              discountCode: item.category === 'Events' && formData.discountApplied ? formData.discountCode : null,
            },
            orderItems,
            successUrl,
            cancelUrl
          );

          if (checkoutResult.success && checkoutResult.url) {
            // Update order with checkout session ID
            try {
              if (isFirebaseReady() && db) {
                // Using Firestore v9 syntax
                const { doc, updateDoc } = await import('firebase/firestore');
                // Use correct collection based on item category
                const collectionName = item.category === 'Events' ? 'eventOrders' : 'serviceOrders';
                const orderRef = doc(db, collectionName, orderId);
                await updateDoc(orderRef, {
                  checkoutSessionId: checkoutResult.sessionId,
                  updatedAt: serverTimestamp(),
                });
                console.log('✅ Updated order with checkout session ID');
              }
            } catch (updateError) {
              console.warn('Failed to update order with checkout session ID:', updateError);
              // Continue anyway - order will still be processed via webhook
            }

            // Open Stripe Checkout in browser
            console.log('Opening Stripe Checkout:', checkoutResult.url);
            
            // Use WebBrowser for better UX - opens in-app browser
            const result = await WebBrowser.openBrowserAsync(checkoutResult.url, {
              showTitle: true,
              toolbarColor: theme.primary,
              enableBarCollapsing: false,
            });

            // If user closes browser without completing payment, they'll be redirected to cancelUrl
            if (result.type === 'cancel') {
              // User canceled - keep order as pending
              setPaymentStep('payment');
              setPaymentError('Payment was canceled. You can try again.');
              setProcessingPayment(false);
              return;
            }

            // Payment completed - webhook will handle the rest
            // Track analytics and send notifications before showing success
            await trackEventBookingCompleted({
              id: orderId,
              eventType: item.name,
              total,
            });
              
            await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.SERVICE_BOOKED, {
              serviceName: item.name,
              total,
              quantity: formData.quantity,
            });
              
            await sendPaymentConfirmation({
              id: orderId,
              amount: total,
            });
            await sendOrderStatusUpdate({
              id: orderId,
              status: 'confirmed',
            });
            
            // Send email notifications
            if (user?.email) {
              if (item.category === 'Events') {
                // Send RSVP confirmation for event tickets
                await sendRSVPConfirmationEmail({
                  userEmail: user.email,
                  userName: user.displayName || user.name || 'Valued Customer',
                  orderId,
                  eventName: item.name,
                  ticketType: formData.ticketType || 'General Admission',
                  quantity: formData.quantity || 1,
                  amount: total,
                  paymentMethod: 'stripe',
                  eventDate: item.eventDate ? new Date(item.eventDate) : (formData.serviceDate ? new Date(formData.serviceDate) : null),
                  location: item.location || formData.location || null,
                }).catch(err => console.warn('Failed to send RSVP email:', err));
              } else {
                // Send booking confirmation for services
                await sendBookingConfirmationEmail({
                  userEmail: user.email,
                  userName: user.displayName || user.name || 'Valued Customer',
                  orderId,
                  serviceName: item.name,
                  amount: total,
                  paymentMethod: 'stripe',
                  date: formData.serviceDate ? new Date(formData.serviceDate) : null,
                  location: item.location || formData.location || null,
                }).catch(err => console.warn('Failed to send booking email:', err));
              }
              
              // Send payment confirmation (only if not free)
              if (total > 0) {
                await sendPaymentConfirmationEmail({
                  userEmail: user.email,
                  userName: user.displayName || user.name || 'Valued Customer',
                  transactionId: orderId,
                  amount: total,
                  description: `Payment for ${item.category === 'Events' ? 'event' : 'service'}: ${item.name}`,
                }).catch(err => console.warn('Failed to send payment email:', err));
              }
            }
            
            // Sync to Google Calendar (admin@merkabaent.com)
            await syncBookingToCalendar(orderId, item, formData, total, user).catch(err => 
              console.warn('Failed to sync booking to calendar:', err)
            );
            
            // Show success message
            setOrderNumber(orderId);
            setPaymentStep('success');
            return; // Exit early - Stripe payment successful
          } else {
            // Stripe checkout failed, fall back to wallet
            console.log('Stripe checkout failed, falling back to wallet payment');
            useWalletPayment = true;
            // orderId is already set, we'll update it instead of creating a new one
          }
        } catch (stripeError) {
          // Stripe error - always fall back to wallet payment
          const errorMessage = stripeError.message || '';
          console.log('❌ Stripe error caught:', errorMessage);
          console.log('💳 Falling back to wallet payment due to Stripe error');
          useWalletPayment = true;
          // If orderId was already created, we'll update it; otherwise create new one
        }
      } else {
        // Stripe not configured, use wallet payment
        console.log('Stripe not configured, using wallet payment');
        useWalletPayment = true;
      }

      // Fall back to wallet payment if Stripe failed or not configured
      if (useWalletPayment) {
        console.log('💳 Falling back to wallet payment...');
        console.log('💳 useWalletPayment flag is true, proceeding with wallet payment');
        // Refresh wallet balance to get latest amount
        await refreshBalance();
        const currentBalance = await WalletService.getBalance(user.uid);
        console.log(`💳 Current wallet balance: $${currentBalance.toFixed(2)}, Required: $${total.toFixed(2)}`);
        
        if (!user?.uid) {
          throw new Error('User not authenticated. Please log in and try again.');
        }
        
        if (currentBalance < total) {
          const insufficientAmount = total - currentBalance;
          // If order was already created, update it to failed status
          if (orderId && isFirebaseReady() && db) {
            try {
              const { doc, updateDoc } = await import('firebase/firestore');
              const collectionName = item.category === 'Events' ? 'eventOrders' : 'serviceOrders';
              const orderRef = doc(db, collectionName, orderId);
              await updateDoc(orderRef, {
                paymentStatus: 'failed',
                paymentError: 'Insufficient wallet balance',
                updatedAt: serverTimestamp(),
              });
            } catch (updateError) {
              console.warn('Failed to update order status:', updateError);
            }
          }
          throw new Error(
            `Insufficient wallet balance. You have $${currentBalance.toFixed(2)} but need $${total.toFixed(2)}. ` +
            `Please add $${insufficientAmount.toFixed(2)} to your wallet or use a different payment method.`
          );
        }

        // If orderId already exists (from failed Stripe attempt), update it; otherwise create new one
        if (!orderId) {
          // Save order to Firestore with COMPLETED payment status (wallet payment is instant)
          orderId = await saveOrderToFirestore({
            ...orderData,
            paymentStatus: 'completed',
            paymentMethod: 'wallet',
            backendBookingId: backendResult.bookingId || null,
          });
        } else {
          // Update existing order to completed status with wallet payment method
          if (isFirebaseReady() && db) {
            try {
              const { doc, updateDoc } = await import('firebase/firestore');
              const collectionName = item.category === 'Events' ? 'eventOrders' : 'serviceOrders';
              const orderRef = doc(db, collectionName, orderId);
              await updateDoc(orderRef, {
                paymentStatus: 'completed',
                paymentMethod: 'wallet',
                updatedAt: serverTimestamp(),
              });
              console.log('✅ Updated existing order to wallet payment');
            } catch (updateError) {
              console.error('Failed to update order to wallet payment:', updateError);
              throw new Error('Failed to update order. Please try again.');
            }
          }
        }

        // Deduct from wallet
        const transactionId = `order_${orderId}_${Date.now()}`;
        await WalletService.updateBalance(user.uid, -total, transactionId);
        
        // Add transaction record
        await WalletService.addTransaction(user.uid, {
          type: 'payment',
          amount: -total,
          description: `Payment for ${item.category === 'Events' ? 'event' : 'service'}: ${item.name}`,
          status: 'completed',
          orderId: orderId,
          orderType: item.category === 'Events' ? 'event_booking' : 'service_booking',
          transactionId: transactionId,
        });

        // Refresh wallet balance in context
        await refreshBalance();

        console.log(`✅ Wallet payment successful: Deducted $${total.toFixed(2)} for order ${orderId}`);
        
        // Track analytics and send notifications
        await trackEventBookingCompleted({
          id: orderId,
          eventType: item.name,
          total,
        });
          
        await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.SERVICE_BOOKED, {
          serviceName: item.name,
          total,
          quantity: formData.quantity,
        });
          
        await sendPaymentConfirmation({
          id: orderId,
          amount: total,
        });
        await sendOrderStatusUpdate({
          id: orderId,
          status: 'confirmed',
        });
        
        // Send email notifications
        if (user?.email) {
          if (item.category === 'Events') {
            // Send RSVP confirmation for event tickets
            await sendRSVPConfirmationEmail({
              userEmail: user.email,
              userName: user.displayName || user.name || 'Valued Customer',
              orderId,
              eventName: item.name,
              ticketType: formData.ticketType || 'General Admission',
              quantity: formData.quantity || 1,
              amount: total,
              paymentMethod: total > 0 ? 'wallet' : 'free',
              eventDate: item.eventDate ? new Date(item.eventDate) : (formData.serviceDate ? new Date(formData.serviceDate) : null),
              location: item.location || formData.location || null,
            }).catch(err => console.warn('Failed to send RSVP email:', err));
          } else {
            // Send booking confirmation for services
            await sendBookingConfirmationEmail({
              userEmail: user.email,
              userName: user.displayName || user.name || 'Valued Customer',
              orderId,
              serviceName: item.name,
              amount: total,
              paymentMethod: 'wallet',
              date: formData.serviceDate ? new Date(formData.serviceDate) : null,
              location: item.location || formData.location || null,
            }).catch(err => console.warn('Failed to send booking email:', err));
          }
          
          // Send payment confirmation (only if not free)
          if (total > 0) {
            await sendPaymentConfirmationEmail({
              userEmail: user.email,
              userName: user.displayName || user.name || 'Valued Customer',
              transactionId: orderId,
              amount: total,
              description: `Payment for ${item.category === 'Events' ? 'event' : 'service'}: ${item.name}`,
            }).catch(err => console.warn('Failed to send payment email:', err));
          }
        }
        
        // Sync to Google Calendar (admin@merkabaent.com)
        await syncBookingToCalendar(orderId, item, formData, total, user).catch(err => 
          console.warn('Failed to sync booking to calendar:', err)
        );
        
        // Payment completed - show success
        setOrderNumber(orderId);
        setPaymentStep('success');
      }
      
      // OLD CODE - Keep for reference but now using backend
      /*let calendarResult = { success: false };
      try {
        const isConnected = await GoogleCalendarService.isConnected();
        if (isConnected && formData.serviceDate && formData.serviceTime) {
          // Parse service date and time to create start/end dates
          const serviceDateStr = formData.serviceDate;
          const serviceTimeStr = formData.serviceTime;
          
          // Parse date (format: "Monday, January 1, 2024")
          const dateMatch = serviceDateStr.match(/(\w+), (\w+) (\d+), (\d+)/);
          if (dateMatch) {
            const [, , monthName, day, year] = dateMatch;
            const monthMap = {
              'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
              'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
            };
            const month = monthMap[monthName] || 0;
            
            // Parse time (format: "6:00 PM" or "18:00")
            let startHour, startMinute;
            if (serviceTimeStr.includes('AM') || serviceTimeStr.includes('PM')) {
              const timeParts = serviceTimeStr.replace(/[AP]M/i, '').trim().split(':');
              startHour = parseInt(timeParts[0]);
              startMinute = parseInt(timeParts[1] || 0);
              if (serviceTimeStr.toUpperCase().includes('PM') && startHour !== 12) {
                startHour += 12;
              } else if (serviceTimeStr.toUpperCase().includes('AM') && startHour === 12) {
                startHour = 0;
              }
            } else {
              const timeParts = serviceTimeStr.split(':');
              startHour = parseInt(timeParts[0]);
              startMinute = parseInt(timeParts[1] || 0);
            }
            
            const startDate = new Date(parseInt(year), month, parseInt(day), startHour, startMinute);
            
            // Calculate end date based on service duration
            // For deals, use dealHours; otherwise estimate 1 hour per service
            const durationHours = item.isDeal && item.dealHours ? item.dealHours * formData.quantity : formData.quantity;
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + durationHours);
            
            // Check availability
            const availability = await GoogleCalendarService.checkAvailability(startDate, endDate);
            if (availability && !availability.available && !availability.warning) {
              console.warn('Service time slot is not available:', availability.reason);
            }
            
            // Create calendar event
            const eventTitle = `${item.name} - ${formData.contactName}`;
            const eventDescription = `Service: ${item.name}\n` +
              `Quantity: ${formData.quantity}\n` +
              (item.isDeal && item.dealHours ? `Hours: ${item.dealHours * formData.quantity}\n` : '') +
              `Total Cost: $${total.toFixed(2)}\n` +
              `Contact: ${formData.contactEmail} | ${formData.contactPhone || 'N/A'}\n` +
              (formData.specialRequests ? `Special Requests: ${formData.specialRequests}\n` : '') +
              `Order ID: ${orderId}`;
            
            calendarResult = await GoogleCalendarService.createEvent({
              title: eventTitle,
              description: eventDescription,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              location: 'Merkaba Venue',
              attendees: [{ email: formData.contactEmail }],
            });
            
            if (!calendarResult.success) {
              console.warn('Failed to create calendar event:', calendarResult.message);
            }
          }
        }
      } catch (calendarError) {
        console.error('Error scheduling service on calendar:', calendarError);
        // Don't block booking if calendar sync fails
      }*/
      
      // Analytics and notifications are now handled within each payment method branch above
    } catch (error) {
      console.error('Payment error:', error);
      trackError('service_payment_failed', { error: error.message, serviceId: item.id });
      const friendlyError = getUserFriendlyError(error);
      setPaymentError(friendlyError);
      setPaymentStep('failed');
      setLoadingMessage('');
      
      // Show error alert to user
      Alert.alert(
        'Payment Failed',
        friendlyError,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset payment step to allow retry
              setPaymentStep('payment');
            }
          }
        ]
      );
      
      // Log error for debugging
      handleError(error, 'Service Booking Payment', 'Payment processing failed');
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
                    {item.category === 'Events' && formData.ticketType && (
                      <Text style={{ color: theme.subtext }}>
                        {' '}({formData.ticketType === 'vip' ? 'VIP' : formData.ticketType === 'earlyBird' ? 'Early Bird' : 'Regular'})
                      </Text>
                    )}
                  </Text>
                  <Text style={[styles.summaryText, { color: theme.text }]}>
                    ${subtotal.toFixed(2)}
                  </Text>
                </View>
                {item.category === 'Events' && formData.discountApplied && item.discountPercent && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryText, { color: '#34C759' }]}>
                      Discount ({item.discountPercent}% OFF)
                    </Text>
                    <Text style={[styles.summaryText, { color: '#34C759' }]}>
                      -${((subtotal / (1 - item.discountPercent / 100)) - subtotal).toFixed(2)}
                    </Text>
                  </View>
                )}
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

          {(paymentStep === 'submitting' || paymentStep === 'checking' || paymentStep === 'processing') && (
            <View style={styles.processingView}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.processingText, { color: theme.text }]}>
                {loadingMessage || 'Processing...'}
              </Text>
              <Text style={[styles.processingSubtext, { color: theme.subtext }]}>
                {paymentStep === 'submitting' && 'Submitting your booking details...'}
                {paymentStep === 'checking' && 'Checking if this time is available...'}
                {paymentStep === 'processing' && 'Please wait while we process your payment'}
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
                  // Navigate back to the previous screen (HomeMain)
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    // If we can't go back, reset to HomeMain
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'HomeMain' }],
                    });
                  }
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {item.category === 'Events' ? 'Buy Ticket' : 'Book Service'}
          </Text>
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

          {/* Date/Time Selection - Only for Services, not Events */}
          {item.category !== 'Events' && (
            <>
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
            </>
          )}

          {/* Event Date Display - Read-only for Events (admin-set date) */}
          {item.category === 'Events' && (item.eventDate || item.startDate) && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Event Date & Time</Text>
              <View style={[styles.eventDateDisplay, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="calendar" size={20} color={theme.primary} />
                <View style={styles.eventDateInfo}>
                  <Text style={[styles.eventDateText, { color: theme.text }]}>
                    {formData.serviceDate || 'Loading...'}
                  </Text>
                  {formData.serviceTime && (
                    <Text style={[styles.eventTimeText, { color: theme.subtext }]}>
                      {formData.serviceTime}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[styles.eventDateNote, { color: theme.subtext }]}>
                This date is set by the event organizer
              </Text>
            </View>
          )}

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

          {/* Event Ticket Type Selection */}
          {item.category === 'Events' && item.ticketsEnabled && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Ticket Type *</Text>
              <View style={styles.ticketTypeContainer}>
                {/* Regular Ticket */}
                <TouchableOpacity
                  style={[
                    styles.ticketTypeOption,
                    { 
                      backgroundColor: formData.ticketType === 'regular' ? theme.primary + '20' : theme.cardBackground,
                      borderColor: formData.ticketType === 'regular' ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => setFormData({ ...formData, ticketType: 'regular' })}
                >
                  <View style={styles.ticketTypeHeader}>
                    <Text style={[styles.ticketTypeName, { color: theme.text }]}>Regular</Text>
                    <Text style={[styles.ticketTypePrice, { color: theme.primary }]}>
                      ${(item.ticketPrice || 0).toFixed(2)}
                    </Text>
                  </View>
                  {formData.ticketType === 'regular' && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>

                {/* Early Bird Ticket */}
                {isEarlyBirdAvailable && item.earlyBirdPrice && (
                  <TouchableOpacity
                    style={[
                      styles.ticketTypeOption,
                      { 
                        backgroundColor: formData.ticketType === 'earlyBird' ? theme.primary + '20' : theme.cardBackground,
                        borderColor: formData.ticketType === 'earlyBird' ? theme.primary : theme.border,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, ticketType: 'earlyBird' })}
                  >
                    <View style={styles.ticketTypeHeader}>
                      <View style={styles.ticketTypeBadge}>
                        <Text style={[styles.ticketTypeBadgeText, { color: '#FF9500' }]}>EARLY BIRD</Text>
                      </View>
                      <Text style={[styles.ticketTypeName, { color: theme.text }]}>Early Bird</Text>
                      <Text style={[styles.ticketTypePrice, { color: '#FF9500' }]}>
                        ${(item.earlyBirdPrice || 0).toFixed(2)}
                      </Text>
                    </View>
                    {item.earlyBirdEndDate && (
                      <Text style={[styles.ticketTypeSubtext, { color: theme.subtext }]}>
                        Ends {item.earlyBirdEndDate?.toDate ? item.earlyBirdEndDate.toDate().toLocaleDateString() : 'soon'}
                      </Text>
                    )}
                    {formData.ticketType === 'earlyBird' && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}

                {/* VIP Ticket */}
                {item.vipPrice && (
                  <TouchableOpacity
                    style={[
                      styles.ticketTypeOption,
                      { 
                        backgroundColor: formData.ticketType === 'vip' ? theme.primary + '20' : theme.cardBackground,
                        borderColor: formData.ticketType === 'vip' ? theme.primary : theme.border,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, ticketType: 'vip' })}
                  >
                    <View style={styles.ticketTypeHeader}>
                      <View style={styles.ticketTypeBadge}>
                        <Text style={[styles.ticketTypeBadgeText, { color: '#FFD700' }]}>VIP</Text>
                      </View>
                      <Text style={[styles.ticketTypeName, { color: theme.text }]}>VIP</Text>
                      <Text style={[styles.ticketTypePrice, { color: '#FFD700' }]}>
                        ${(item.vipPrice || 0).toFixed(2)}
                      </Text>
                    </View>
                    {formData.ticketType === 'vip' && (
                      <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Discount Code Input */}
          {item.category === 'Events' && item.discountEnabled && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Discount Code</Text>
              <View style={styles.discountContainer}>
                <TextInput
                  style={[
                    styles.discountInput,
                    { 
                      backgroundColor: theme.cardBackground,
                      borderColor: formData.discountApplied ? '#34C759' : theme.border,
                      color: theme.text,
                    }
                  ]}
                  placeholder="Enter discount code"
                  placeholderTextColor={theme.subtext}
                  value={formData.discountCode}
                  onChangeText={(text) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      discountCode: text.toUpperCase(),
                      discountApplied: false // Reset when code changes
                    }));
                  }}
                  autoCapitalize="characters"
                />
                {formData.discountApplied && (
                  <View style={styles.discountApplied}>
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                    <Text style={[styles.discountAppliedText, { color: '#34C759' }]}>
                      {item.discountPercent}% OFF
                    </Text>
                  </View>
                )}
              </View>
              {formData.discountCode && !formData.discountApplied && (
                <TouchableOpacity
                  style={[styles.applyDiscountButton, { backgroundColor: theme.primary }]}
                  onPress={validateDiscountCode}
                >
                  <Text style={styles.applyDiscountButtonText}>Apply Code</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

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
            <Text style={styles.bookButtonText}>
              {item.category === 'Events' ? 'Buy Ticket' : 'Proceed to Payment'}
            </Text>
            <Ionicons name={item.category === 'Events' ? 'ticket' : 'arrow-forward'} size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.pickerModalOverlay}>
              <View style={[styles.pickerModalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: theme.border }]}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[styles.pickerModalButton, { color: theme.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerModalTitle, { color: theme.text }]}>Select Date</Text>
                  <TouchableOpacity onPress={() => {
                    setShowDatePicker(false);
                    onDateChange(null, selectedDate);
                  }}>
                    <Text style={[styles.pickerModalButton, { color: theme.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={onDateChange}
                  textColor={theme.text}
                  themeVariant={theme.isDark ? 'dark' : 'light'}
                  style={{ backgroundColor: theme.cardBackground }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={onDateChange}
            textColor={theme.text}
            themeVariant={theme.isDark ? 'dark' : 'light'}
          />
        )
      )}

      {/* Time Picker */}
      {showTimePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showTimePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.pickerModalOverlay}>
              <View style={[styles.pickerModalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: theme.border }]}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={[styles.pickerModalButton, { color: theme.primary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerModalTitle, { color: theme.text }]}>Select Time</Text>
                  <TouchableOpacity onPress={() => {
                    setShowTimePicker(false);
                    onTimeChange(null, selectedTime);
                  }}>
                    <Text style={[styles.pickerModalButton, { color: theme.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="spinner"
                  onChange={onTimeChange}
                  textColor={theme.text}
                  themeVariant={theme.isDark ? 'dark' : 'light'}
                  style={{ backgroundColor: theme.cardBackground }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
            textColor={theme.text}
            themeVariant={theme.isDark ? 'dark' : 'light'}
          />
        )
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Same width as back button to center title
  },
  serviceSelectionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  serviceCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  serviceImage: {
    width: 80,
    height: 80,
  },
  serviceCardContent: {
    flex: 1,
    padding: 12,
  },
  serviceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dealBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  serviceDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  serviceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceRatingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  regularPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginLeft: 4,
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
  eventDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  eventDateInfo: {
    flex: 1,
  },
  eventDateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventTimeText: {
    fontSize: 14,
  },
  eventDateNote: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
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
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '50%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerModalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  ticketTypeContainer: {
    gap: 12,
    marginTop: 8,
  },
  ticketTypeOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketTypeHeader: {
    flex: 1,
  },
  ticketTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    marginBottom: 4,
  },
  ticketTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ticketTypeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketTypePrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  ticketTypeSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  discountInput: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  discountApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#34C75920',
  },
  discountAppliedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyDiscountButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyDiscountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
