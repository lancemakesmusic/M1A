import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ErrorRecovery from '../components/ErrorRecovery';
import { trackEventBookingStarted, trackEventBookingCompleted, trackFunnelStep, trackButtonClick, trackFeatureUsage, trackError } from '../services/AnalyticsService';
import { scheduleEventReminder, sendBookingReminder } from '../services/NotificationService';
import GoogleCalendarService from '../services/GoogleCalendarService';
import BookingCalendar from '../components/BookingCalendar';
import RatingPromptService, { POSITIVE_ACTIONS } from '../services/RatingPromptService';
import StripeService from '../services/StripeService';
import useScreenTracking from '../hooks/useScreenTracking';

const { width } = Dimensions.get('window');

// Event types with visual appeal
const eventTypes = [
    {
        id: 'performance',
        title: 'Performance',
        subtitle: 'Concerts, shows, live music',
        icon: 'musical-notes',
        color: '#007AFF',
        popular: true,
    },
    {
        id: 'party',
        title: 'Party',
        subtitle: 'Birthdays, celebrations',
        icon: 'gift',
        color: '#FF9500',
        popular: true,
    },
    {
        id: 'corporate',
        title: 'Corporate',
        subtitle: 'Business events, meetings',
        icon: 'business',
        color: '#34C759',
    },
    {
        id: 'wedding',
        title: 'Wedding',
        subtitle: 'Receptions, ceremonies',
        icon: 'heart',
        color: '#FF2D92',
    },
    {
        id: 'other',
        title: 'Other',
        subtitle: 'Custom events',
        icon: 'ellipse',
        color: '#8E8E93',
    },
];

// Pricing structure - matches Google Form exactly
// Reference: https://docs.google.com/forms/d/e/1FAIpQLSfC8LAitY57iQDvvP-lMhY5JTXy9OC5reaMh2L4aGL6Y9E1Dg/viewform
const pricing = {
  // Venue rental fee (hourly rate)
  venueRental: {
    weekday: 250,    // Monday-Thursday: $250/hour
    weekend: 300,    // Friday-Sunday: $300/hour
  },
  barPackages: {
    'No Bar – (Free)': { basePrice: 0, hourlyRate: 0, includedHours: 0 },
    'Well Open Bar – $25/person (4 hrs, +$5/hr after)': { basePrice: 25, hourlyRate: 5, includedHours: 4 },
    'Standard Open Bar – $35/person (4 hrs, +$7/hr after)': { basePrice: 35, hourlyRate: 7, includedHours: 4 },
    'Deluxe Open Bar – $50/person (4 hrs, +$10/hr after)': { basePrice: 50, hourlyRate: 10, includedHours: 4 },
  },
  // Add-on services - flat fees
  addOnServices: {
    'Extra Speakers': 150,
    'Extra Lighting': 200,
    'Fog Machine': 100,
    'Highlight Reel and video edit': 500,
    'Live DJ': 600,
    'Flier/Graphic Design': 150,
    'Event Promotion': 300,
    'Pyrotechnics': 1000,
    'Basic Fireworks Display': 5000,
    'Premium Fireworks Display': 10000,
  },
  // Add-on services - hourly rates (multiply by duration)
  addOnServicesHourly: {
    'Photography': 150,  // $150/hr
    'Videography': 200,  // $200/hr
    'MC Services': 100,  // $100/hr
    'Audio Recording of Speeches': 75,  // $75/hr
  },
  bundlePackages: {
    'Performance Package – $1,000 (Speakers, Lighting, DJ, MC)': 1000,
    'Media Coverage Package – $1,000 (Videography, Audio, Reel, Promotion)': 1000,
    'Premium Celebration Package – $16,000 (Pyro + Fireworks)': 16000,
  },
};

export default function EventBookingScreen({ navigation }) {
    const themeContext = useTheme();
    const theme = themeContext?.theme || {
        background: '#FFFFFF',
        cardBackground: '#F8F9FA',
        text: '#000000',
        subtext: '#666666',
        primary: '#007AFF',
        border: '#E5E5E7',
        shadow: 'rgba(0,0,0,0.1)',
    };
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    useScreenTracking('EventBookingScreen');
    
    // Step management
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;
    
    // Date picker states
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [tempTime, setTempTime] = useState(new Date()); // Temporary time for picker
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showGuestPicker, setShowGuestPicker] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [availabilityError, setAvailabilityError] = useState('');
    const [paymentStep, setPaymentStep] = useState('none'); // 'none', 'processing', 'success', 'failed'
    const [paymentError, setPaymentError] = useState(null);
    const [requiresDeposit, setRequiresDeposit] = useState(true);
    const [depositAmount, setDepositAmount] = useState(0);
    const [paymentIntentId, setPaymentIntentId] = useState(null);
    
    // Form data with better structure
    const [formData, setFormData] = useState({
        // Step 1: Event Overview
        eventType: '',
        eventDate: '',
        eventStartTime: '',
        guestCount: 50,
        duration: 4,
        
        // Step 2: Contact Information
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        
        // Step 3: Event Details
        specialRequirements: '',
        isWeekday: false,
        
        // Step 4: Services
        barPackage: 'No Bar – (Free)',
        addOnServices: [],
        bundlePackage: '',
        
        // Step 5: Final
        agreeToTerms: false,
        notes: '',
    });

    // Validation and UI states
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [totalCost, setTotalCost] = useState(0);
    const [breakdown, setBreakdown] = useState({});

  // Auto-fill form with user data
  useEffect(() => {
    if (user) {
      const email = user.email || '';
      const nameParts = email.split('@')[0].split('.');
      const firstName = nameParts[0] || '';
      const lastName = nameParts[1] || '';
      
      setFormData(prev => ({
        ...prev,
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        email: email,
      }));
    }
  }, [user]);

  // Calculate total cost
  useEffect(() => {
    calculateTotal();
    }, [formData.barPackage, formData.guestCount, formData.duration, formData.addOnServices, formData.bundlePackage, formData.isWeekday]);


  // Calendar date selection handler
  const handleCalendarDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    setAvailabilityError('');
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    updateFormData('eventDate', formattedDate);
    
    // Auto-detect weekday for discount
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4;
    updateFormData('isWeekday', isWeekday);
  };

  // Availability check handler
  const handleAvailabilityCheck = (isAvailable, message) => {
    if (!isAvailable) {
      setAvailabilityError(message);
      Alert.alert('Date Unavailable', message);
    }
  };

  // Date picker handlers (fallback)
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      updateFormData('eventDate', formattedDate);
      
      // Auto-detect weekday for discount
      const dayOfWeek = selectedDate.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4;
      updateFormData('isWeekday', isWeekday);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    // Only update temporary time, don't close picker
    if (selectedTime && Platform.OS === 'ios') {
      setTempTime(selectedTime);
    } else if (selectedTime && Platform.OS === 'android' && event.type === 'set') {
      // Android: only update if user confirmed (not dismissed)
      setTempTime(selectedTime);
      handleTimeConfirm(selectedTime);
    }
  };

  const handleTimeConfirm = (timeToConfirm) => {
    const time = timeToConfirm || tempTime;
    setSelectedTime(time);
    const formattedTime = time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    console.log('Time confirmed:', formattedTime);
    updateFormData('eventStartTime', formattedTime);
    setShowTimePicker(false);
    trackButtonClick('confirm_time', 'EventBookingScreen');
  };

  const handleTimeCancel = () => {
    // Reset temp time to current selected time
    setTempTime(selectedTime);
    setShowTimePicker(false);
    trackButtonClick('cancel_time', 'EventBookingScreen');
  };

  const openTimePicker = () => {
    // Initialize temp time with current selected time or current time
    setTempTime(formData.eventStartTime ? selectedTime : new Date());
    setShowTimePicker(true);
    trackButtonClick('open_time_picker', 'EventBookingScreen');
  };

    const calculateTotal = useCallback(() => {
    let total = 0;
    let breakdown = {};

    // 1. VENUE RENTAL FEE (matches Google Form calculation)
    // Hourly rate: $250 (weekday Monday-Thursday) or $300 (weekend Friday-Sunday)
    const hourlyRate = formData.isWeekday ? pricing.venueRental.weekday : pricing.venueRental.weekend;
    const rentalFee = formData.duration * hourlyRate;
    
    breakdown.venueRental = {
      hourlyRate: hourlyRate,
      duration: formData.duration,
      total: rentalFee,
      label: formData.isWeekday ? 'Venue Rental (Weekday)' : 'Venue Rental (Weekend)',
    };
    total += rentalFee;

    // 2. BAR PACKAGE CALCULATION (matches Google Form exactly)
    const barPackage = pricing.barPackages[formData.barPackage];
    if (barPackage && barPackage.basePrice > 0) {
      // Base cost = basePrice per person
      const baseCost = barPackage.basePrice * formData.guestCount;
      // Extra hours beyond included hours
      const extraHours = Math.max(0, formData.duration - (barPackage.includedHours || 0));
      // Extra cost = extraHours * hourlyRate per person
      const extraCost = extraHours * barPackage.hourlyRate * formData.guestCount;
      const barTotal = baseCost + extraCost;
      
      breakdown.barPackage = {
        name: formData.barPackage,
        baseCost,
        extraCost,
        extraHours,
        guestCount: formData.guestCount,
        total: barTotal,
      };
      total += barTotal;
    }

    // 3. ADD-ON SERVICES - FLAT FEES (matches Google Form)
    let addOnFlatTotal = 0;
    const flatServices = [];
    if (formData.addOnServices && Array.isArray(formData.addOnServices)) {
      formData.addOnServices.forEach(service => {
        // Check if it's a flat fee service
        if (pricing.addOnServices[service]) {
          const serviceCost = pricing.addOnServices[service];
          addOnFlatTotal += serviceCost;
          flatServices.push({ name: service, cost: serviceCost });
        }
      });
    }

    // 4. ADD-ON SERVICES - HOURLY RATES (matches Google Form)
    // Photography, Videography, MC Services, Audio Recording are hourly
    let addOnHourlyTotal = 0;
    const hourlyServices = [];
    if (formData.addOnServices && Array.isArray(formData.addOnServices)) {
      formData.addOnServices.forEach(service => {
        // Check if it's an hourly rate service
        if (pricing.addOnServicesHourly[service]) {
          const hourlyRate = pricing.addOnServicesHourly[service];
          const serviceCost = hourlyRate * formData.duration;
          addOnHourlyTotal += serviceCost;
          hourlyServices.push({ 
            name: service, 
            hourlyRate, 
            duration: formData.duration, 
            cost: serviceCost 
          });
        }
      });
    }

    const addOnTotal = addOnFlatTotal + addOnHourlyTotal;
    if (addOnTotal > 0) {
      breakdown.addOnServices = {
        flatServices: flatServices,
        hourlyServices: hourlyServices,
        flatTotal: addOnFlatTotal,
        hourlyTotal: addOnHourlyTotal,
        total: addOnTotal,
      };
      total += addOnTotal;
    }

    // 5. BUNDLE PACKAGE CALCULATION (matches Google Form)
    if (formData.bundlePackage && pricing.bundlePackages[formData.bundlePackage]) {
      const bundleCost = pricing.bundlePackages[formData.bundlePackage];
      breakdown.bundlePackage = {
        name: formData.bundlePackage,
        total: bundleCost,
      };
      total += bundleCost;
    }

    // Note: Google Form uses different hourly rates for weekday vs weekend
    // ($250 vs $300) instead of a percentage discount, which is already applied above
    // No additional discount needed - the weekday rate is already lower

    breakdown.finalTotal = total;
    setTotalCost(total);
    setBreakdown(breakdown);
    
    // Calculate deposit (50% of total, minimum $100) - matches Google Form
    const calculatedDeposit = total > 0 ? Math.max(100, total * 0.5) : 0;
    setDepositAmount(calculatedDeposit);
    setRequiresDeposit(total > 0);
    }, [formData.barPackage, formData.guestCount, formData.duration, formData.addOnServices, formData.bundlePackage, formData.isWeekday]);

    // Validation functions
    const validateStep = (step) => {
        const newErrors = {};
        
        console.log('Validating step:', step);
        console.log('Current form data:', formData);
        
        switch (step) {
            case 1:
                if (!formData.eventType || formData.eventType === '') {
                    newErrors.eventType = 'Please select an event type';
                }
                if (!formData.eventDate || formData.eventDate === '') {
                    newErrors.eventDate = 'Please select a date';
                } else {
                    // Validate date is not in the past
                    try {
                        const selectedDateObj = new Date(selectedDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (selectedDateObj < today) {
                            newErrors.eventDate = 'Event date cannot be in the past';
                        }
                    } catch (e) {
                        newErrors.eventDate = 'Invalid date format';
                    }
                }
                if (!formData.eventStartTime || formData.eventStartTime === '') {
                    newErrors.eventStartTime = 'Please select a time';
                } else {
                    // Validate time format
                    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM)?$/i;
                    if (!timePattern.test(formData.eventStartTime.replace(/[AP]M/i, '').trim())) {
                        newErrors.eventStartTime = 'Please enter a valid time';
                    }
                }
                if (!formData.guestCount || formData.guestCount < 1) {
                    newErrors.guestCount = 'Guest count must be at least 1';
                } else if (formData.guestCount > 10000) {
                    newErrors.guestCount = 'Guest count cannot exceed 10,000';
                }
                if (!formData.duration || formData.duration < 1) {
                    newErrors.duration = 'Duration must be at least 1 hour';
                } else if (formData.duration > 24) {
                    newErrors.duration = 'Duration cannot exceed 24 hours';
                }
                break;
            case 2:
                if (!formData.firstName || !formData.firstName.trim()) {
                    newErrors.firstName = 'First name is required';
                } else if (formData.firstName.trim().length < 2) {
                    newErrors.firstName = 'First name must be at least 2 characters';
                } else if (formData.firstName.trim().length > 50) {
                    newErrors.firstName = 'First name cannot exceed 50 characters';
                } else if (!/^[a-zA-Z\s'-]+$/.test(formData.firstName.trim())) {
                    newErrors.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
                }
                if (!formData.lastName || !formData.lastName.trim()) {
                    newErrors.lastName = 'Last name is required';
                } else if (formData.lastName.trim().length < 2) {
                    newErrors.lastName = 'Last name must be at least 2 characters';
                } else if (formData.lastName.trim().length > 50) {
                    newErrors.lastName = 'Last name cannot exceed 50 characters';
                } else if (!/^[a-zA-Z\s'-]+$/.test(formData.lastName.trim())) {
                    newErrors.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
                }
                if (!formData.email || !formData.email.trim()) {
                    newErrors.email = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
                    newErrors.email = 'Please enter a valid email address';
                } else if (formData.email.trim().length > 100) {
                    newErrors.email = 'Email cannot exceed 100 characters';
                }
                if (formData.phone && formData.phone.trim()) {
                    // Validate phone format (US format: (123) 456-7890 or 123-456-7890 or 1234567890)
                    const phonePattern = /^[\d\s\-\(\)\+]{10,15}$/;
                    const digitsOnly = formData.phone.replace(/\D/g, '');
                    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
                        newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
                    }
                }
                break;
            case 3:
                // Step 3 is optional, no validation needed
                break;
            case 4:
                // Step 4 is optional, but validate if special requirements are provided
                if (formData.specialRequirements && formData.specialRequirements.length > 1000) {
                    newErrors.specialRequirements = 'Special requirements cannot exceed 1000 characters';
                }
                if (formData.notes && formData.notes.length > 2000) {
                    newErrors.notes = 'Notes cannot exceed 2000 characters';
                }
                break;
            case 5:
                if (!formData.agreeToTerms) {
                    newErrors.agreeToTerms = 'You must agree to the terms and conditions to proceed';
                }
                // Validate total cost
                if (totalCost <= 0) {
                    newErrors.totalCost = 'Invalid total cost. Please review your selections.';
                }
                break;
        }
        
        console.log('Validation errors:', newErrors);
        setErrors(newErrors);
        return {
            isValid: Object.keys(newErrors).length === 0,
            errors: newErrors
        };
    };

    // Navigation functions
  const nextStep = () => {
        console.log('Next button pressed, current step:', currentStep);
        console.log('Form data:', formData);
        
        // Validate step and get errors immediately
        const validationResult = validateStep(currentStep);
        const isValid = validationResult.isValid;
        const newErrors = validationResult.errors;
        
        if (isValid) {
            console.log('Validation passed, moving to next step');
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
                // Track funnel step
                trackFunnelStep('event_booking', currentStep + 1, {
                    step: currentStep + 1,
                    totalSteps,
                });
            }
        } else {
            console.log('Validation failed, errors:', newErrors);
            // Show alert with validation errors
            const errorMessages = Object.values(newErrors).filter(msg => msg).join('\n');
            if (errorMessages) {
                Alert.alert('Please Complete Required Fields', errorMessages);
            }
        }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

    const updateFormData = (field, value) => {
        console.log('Updating form data:', field, '=', value);
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            console.log('New form data:', newData);
            return newData;
        });
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const toggleAddOnService = (service) => {
        setFormData(prev => ({
            ...prev,
            addOnServices: prev.addOnServices.includes(service)
                ? prev.addOnServices.filter(s => s !== service)
                : [...prev.addOnServices, service]
        }));
    };

    const handleSubmit = async () => {
        const validationResult = validateStep(5);
        if (!validationResult.isValid) {
            const errorMessages = Object.values(validationResult.errors).filter(msg => msg).join('\n');
            if (errorMessages) {
                Alert.alert('Please Complete Required Fields', errorMessages);
            }
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Calculate start and end times
            // Parse time string (format: "6:00 PM" or "18:00")
            let startHour, startMinute;
            if (formData.eventStartTime.includes('AM') || formData.eventStartTime.includes('PM')) {
                const timeParts = formData.eventStartTime.replace(/[AP]M/i, '').trim().split(':');
                startHour = parseInt(timeParts[0]);
                startMinute = parseInt(timeParts[1] || 0);
                if (formData.eventStartTime.toUpperCase().includes('PM') && startHour !== 12) {
                    startHour += 12;
                } else if (formData.eventStartTime.toUpperCase().includes('AM') && startHour === 12) {
                    startHour = 0;
                }
            } else {
                const timeParts = formData.eventStartTime.split(':');
                startHour = parseInt(timeParts[0]);
                startMinute = parseInt(timeParts[1] || 0);
            }
            
            const startDate = new Date(selectedDate);
            startDate.setHours(startHour, startMinute || 0, 0, 0);
            
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + formData.duration);

            // Check final availability before submitting (if Google Calendar is connected)
            let calendarResult = { success: false };
            try {
                const isConnected = await GoogleCalendarService.isConnected();
                if (isConnected) {
                    const availability = await GoogleCalendarService.checkAvailability(startDate, endDate);
                    if (availability && !availability.available && !availability.warning) {
                        // Only block if explicitly unavailable (not just a warning)
                        Alert.alert(
                            'Time Unavailable',
                            availability.reason || 'This time slot is no longer available. Please select another time.',
                            [{ text: 'OK' }]
                        );
                        setIsSubmitting(false);
                        return;
                    }
                    // Show warning if calendar check had issues but don't block booking
                    if (availability && availability.warning) {
                        console.warn('Calendar availability warning:', availability.reason);
                        // Optionally show a non-blocking alert
                        // Alert.alert('Availability Warning', availability.reason, [{ text: 'Continue Anyway' }]);
                    }

                    // Create event in Google Business Calendar
                    const eventTitle = `${formData.eventType.charAt(0).toUpperCase() + formData.eventType.slice(1)} - ${formData.firstName} ${formData.lastName}`;
                    const eventDescription = `Event Type: ${formData.eventType}\n` +
                        `Guests: ${formData.guestCount}\n` +
                        `Duration: ${formData.duration} hours\n` +
                        `Bar Package: ${formData.barPackage}\n` +
                        `Total Cost: $${totalCost.toFixed(2)}\n` +
                        `Contact: ${formData.email} | ${formData.phone}\n` +
                        (formData.specialRequirements ? `Special Requirements: ${formData.specialRequirements}\n` : '') +
                        (formData.notes ? `Notes: ${formData.notes}` : '');

                    calendarResult = await GoogleCalendarService.createEvent({
                        title: eventTitle,
                        description: eventDescription,
                        startTime: startDate.toISOString(),
                        endTime: endDate.toISOString(),
                        location: 'Merkaba Venue',
                        attendees: [{ email: formData.email }],
                    });
                    
                    // Show error if calendar event creation failed
                    if (!calendarResult.success) {
                        console.error('Failed to create calendar event:', calendarResult.message);
                        Alert.alert(
                            'Calendar Sync Warning',
                            calendarResult.message || 'Event booking will continue, but it may not appear in Google Calendar. Please contact support.',
                            [{ text: 'Continue' }]
                        );
                    }
                }
            } catch (calendarError) {
                console.error('Error with Google Calendar:', calendarError);
                Alert.alert(
                    'Calendar Sync Error',
                    'Unable to sync with Google Calendar. Event booking will continue, but it may not appear in your calendar. Please contact support if needed.',
                    [{ text: 'Continue' }]
                );
                // Continue with booking even if calendar sync fails
            }

            // Submit booking to backend API
            // Use network IP for physical devices, localhost for web/simulator
            const getApiBaseUrl = () => {
                if (process.env.EXPO_PUBLIC_API_BASE_URL) {
                    return process.env.EXPO_PUBLIC_API_BASE_URL;
                }
                // For physical devices, use network IP (same as Metro bundler)
                // For web/simulator, use localhost
                if (Platform.OS === 'web') {
                    return 'http://localhost:8001';
                }
                // Use the same network IP as Metro bundler (172.20.10.3 from ipconfig)
                // In production, this should be your actual backend URL
                return 'http://172.20.10.3:8001';
            };
            const API_BASE_URL = getApiBaseUrl();
            let backendResult = { success: false };
            
            try {
                const bookingPayload = {
                    userId: user?.uid || 'anonymous',
                    eventType: formData.eventType,
                    eventDate: formData.eventDate,
                    eventStartTime: formData.eventStartTime,
                    guestCount: formData.guestCount,
                    duration: formData.duration,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone || null,
                    barPackage: formData.barPackage || null,
                    bundlePackage: formData.bundlePackage || null,
                    addOnServices: formData.addOnServices || [],
                    specialRequirements: formData.specialRequirements || null,
                    notes: formData.notes || null,
                    totalCost: totalCost,
                    isWeekday: formData.isWeekday || false,
                };

                const response = await fetch(`${API_BASE_URL}/api/event-booking`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bookingPayload),
                });

                if (response.ok) {
                    const result = await response.json();
                    backendResult = result;
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }
            } catch (backendError) {
                console.error('Error submitting booking to backend:', backendError);
                trackError(
                    backendError.message || 'Backend booking submission failed',
                    'event_booking_backend_error',
                    'EventBookingScreen',
                    { userId: user?.uid, eventType: formData.eventType }
                );
                
                // Enhanced error handling with detailed messages
                let errorMessage = 'Booking could not be saved to server. ';
                if (backendError.message) {
                    if (backendError.message.includes('timeout')) {
                        errorMessage += 'The request timed out. Please check your internet connection and try again.';
                    } else if (backendError.message.includes('network')) {
                        errorMessage += 'Network error. Please check your connection and try again.';
                    } else if (backendError.message.includes('500')) {
                        errorMessage += 'Server error. Please try again in a few moments or contact support.';
                    } else if (backendError.message.includes('400')) {
                        errorMessage += 'Invalid booking data. Please review your information and try again.';
                    } else {
                        errorMessage += backendError.message;
                    }
                } else {
                    errorMessage += 'Please contact support with your booking details.';
                }
                
                Alert.alert(
                    'Warning',
                    errorMessage,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
                        { text: 'Continue Anyway', onPress: () => {
                            // Continue with payment even if backend fails
                        }}
                    ]
                );
            }

            // Process payment (deposit) if required
            let paymentResult = { success: false, paymentIntentId: null };
            if (requiresDeposit && depositAmount > 0) {
                setPaymentStep('processing');
                setPaymentError(null);
                
                try {
                    // Check if Stripe is configured
                    if (StripeService.isConfigured()) {
                        // Create payment intent for deposit
                        const paymentIntent = await StripeService.createPaymentIntent(
                            depositAmount,
                            'usd',
                            {
                                orderType: 'event_booking',
                                bookingId: backendResult.bookingId || 'pending',
                                eventType: formData.eventType,
                                depositAmount: depositAmount,
                                totalAmount: totalCost,
                                userId: user?.uid || 'anonymous',
                            },
                            [{
                                id: 'event_booking_deposit',
                                name: `Event Booking Deposit - ${formData.eventType}`,
                                price: depositAmount,
                                quantity: 1,
                            }]
                        );
                        
                        paymentResult = {
                            success: true,
                            paymentIntentId: paymentIntent.id,
                            clientSecret: paymentIntent.client_secret,
                        };
                        setPaymentIntentId(paymentIntent.id);
                        setPaymentStep('success');
                    } else {
                        // Stripe not configured - use mock payment for demo
                        console.log('Stripe not configured, using mock payment for deposit');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        paymentResult = {
                            success: true,
                            paymentIntentId: `mock_${Date.now()}`,
                            clientSecret: null,
                        };
                        setPaymentStep('success');
                    }
                } catch (paymentError) {
                    console.error('Error processing payment:', paymentError);
                    setPaymentStep('failed');
                    setPaymentError(paymentError.message || 'Payment processing failed');
                    
                    // Enhanced payment error handling
                    let paymentErrorMessage = 'Payment processing failed. ';
                    if (paymentError.message) {
                        if (paymentError.message.includes('timeout')) {
                            paymentErrorMessage += 'The payment request timed out. Please check your connection and try again.';
                        } else if (paymentError.message.includes('card')) {
                            paymentErrorMessage += 'Card payment failed. Please check your card details and try again.';
                        } else if (paymentError.message.includes('insufficient')) {
                            paymentErrorMessage += 'Insufficient funds. Please use a different payment method.';
                        } else if (paymentError.message.includes('declined')) {
                            paymentErrorMessage += 'Payment was declined. Please contact your bank or use a different payment method.';
                        } else {
                            paymentErrorMessage += paymentError.message;
                        }
                    } else {
                        paymentErrorMessage += 'Please try again or contact support.';
                    }
                    
                    trackError(
                        paymentError.message || 'Payment processing failed',
                        'event_booking_payment_error',
                        'EventBookingScreen',
                        { 
                            userId: user?.uid, 
                            amount: depositAmount,
                            bookingId: backendResult.bookingId 
                        }
                    );
                    
                    Alert.alert(
                        'Payment Error',
                        paymentErrorMessage,
                        [
                            { text: 'Cancel', style: 'cancel', onPress: () => {
                                setIsSubmitting(false);
                                setPaymentStep('none');
                            }},
                            { text: 'Retry Payment', onPress: () => {
                                setPaymentStep('none');
                                // Will retry on next submit
                            }}
                        ]
                    );
                    setIsSubmitting(false);
                    return;
                }
            } else {
                // No deposit required
                paymentResult = { success: true, paymentIntentId: null };
            }

            // Track booking completion
            trackEventBookingCompleted({
                eventType: formData.eventType,
                guestCount: formData.guestCount,
                totalCost: totalCost,
                depositAmount: depositAmount,
                duration: formData.duration,
                bookingId: backendResult.bookingId,
                paymentIntentId: paymentResult.paymentIntentId,
            });

            // Record positive action for rating prompt
            await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.EVENT_BOOKED, {
                eventType: formData.eventType,
                totalCost,
                guestCount: formData.guestCount,
            });

            // Schedule notifications
            await scheduleEventReminder(startDate, eventTitle);
            await sendBookingReminder(formData.email, {
                eventType: formData.eventType,
                date: formData.eventDate,
                time: formData.eventStartTime,
                totalCost: totalCost,
            });

            setIsSubmitting(false);
            
            // Build success message with detailed status
            let successMessage = `Your event booking request has been submitted successfully!\n\n`;
            successMessage += `Booking ID: ${backendResult.bookingId || 'Pending'}\n`;
            successMessage += `Total Cost: $${totalCost.toFixed(2)}\n`;
            if (requiresDeposit && depositAmount > 0) {
                successMessage += `Deposit Paid: $${depositAmount.toFixed(2)}\n`;
                successMessage += `Remaining Balance: $${(totalCost - depositAmount).toFixed(2)}\n`;
            }
            successMessage += `\n`;
            
            // Status indicators
            const statusItems = [];
            if (calendarResult.success) {
                statusItems.push('✅ Event added to calendar');
            } else {
                statusItems.push('⚠️ Calendar sync pending');
            }
            if (backendResult.success) {
                statusItems.push('✅ Booking saved to system');
            } else {
                statusItems.push('⚠️ Backend save pending');
            }
            if (paymentResult.success && requiresDeposit) {
                statusItems.push('✅ Deposit payment processed');
            } else if (requiresDeposit && !paymentResult.success) {
                statusItems.push('❌ Deposit payment failed');
            }
            
            successMessage += statusItems.join('\n');
            successMessage += `\n\nWe'll send you a detailed agreement for review within 24 hours.`;
            
            Alert.alert(
                'Booking Request Submitted! 🎉',
                successMessage,
                [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]
            );
        } catch (error) {
            console.error('Error submitting booking:', error);
            setIsSubmitting(false);
            setPaymentStep('none');
            
            // Enhanced error handling with detailed messages
            let errorMessage = 'There was an error submitting your booking. ';
            if (error.message) {
                if (error.message.includes('timeout')) {
                    errorMessage += 'The request timed out. Please check your internet connection and try again.';
                } else if (error.message.includes('network')) {
                    errorMessage += 'Network error. Please check your connection and try again.';
                } else if (error.message.includes('validation')) {
                    errorMessage += 'Please check all required fields and try again.';
                } else {
                    errorMessage += error.message;
                }
            } else {
                errorMessage += 'Please try again or contact support if the problem persists.';
            }
            
            trackError(
                error.message || 'Event booking submission failed',
                'event_booking_submission_error',
                'EventBookingScreen',
                { 
                    userId: user?.uid, 
                    eventType: formData.eventType,
                    step: currentStep 
                }
            );
            
            Alert.alert(
                'Error',
                errorMessage,
                [
                    { text: 'OK', onPress: () => {} },
                    { text: 'Retry', onPress: () => {
                        // User can retry by clicking submit again
                    }}
                ]
            );
        }
    };

    // Progress indicator
    const renderProgressIndicator = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
                <View 
                    style={[
                        styles.progressFill, 
                        { 
                            width: `${(currentStep / totalSteps) * 100}%`,
                            backgroundColor: theme.primary 
                        }
                    ]} 
                />
            </View>
            <Text style={[styles.progressText, { color: theme.subtext }]}>
                Step {currentStep} of {totalSteps}
            </Text>
        </View>
    );

    // Step 1: Event Overview
    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>What type of event?</Text>
                <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
                    Choose the type that best fits your event
                </Text>
            </View>

            <View style={styles.eventTypesGrid}>
                {eventTypes.map((event) => (
                    <TouchableOpacity
                        key={event.id}
                        style={[
                            styles.eventTypeCard,
                            { 
                                backgroundColor: theme.cardBackground,
                                borderColor: theme.border,
                                shadowColor: theme.shadow,
                            },
                            formData.eventType === event.id && {
                                borderColor: event.color,
                                borderWidth: 2,
                                shadowOpacity: 0.3,
                            }
                        ]}
                        onPress={() => updateFormData('eventType', event.id)}
                    >
                        {event.popular && (
                            <View style={[styles.popularBadge, { backgroundColor: event.color }]}>
                                <Text style={styles.popularText}>Popular</Text>
                            </View>
                        )}
                        <View style={[styles.eventIcon, { backgroundColor: event.color }]}>
                            <Ionicons name={event.icon} size={24} color="white" />
                        </View>
                        <Text style={[styles.eventTypeTitle, { color: theme.text }]}>
                            {event.title}
                        </Text>
                        <Text style={[styles.eventTypeSubtitle, { color: theme.subtext }]}>
                            {event.subtitle}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.quickDetails}>
                <View style={styles.quickDetailRow}>
                    <Text style={[styles.quickDetailLabel, { color: theme.text }]}>Date</Text>
                    <TouchableOpacity
                        style={[styles.modernPickerButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                        onPress={() => setShowCalendar(true)}
                    >
                        <View style={styles.pickerContent}>
                            <View style={styles.pickerIconContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                            </View>
                            <View style={styles.pickerTextContainer}>
                                <Text style={[styles.pickerMainText, { color: formData.eventDate ? theme.text : theme.subtext }]}>
                                    {formData.eventDate || 'Select date'}
                                </Text>
                                <Text style={[styles.pickerSubText, { color: theme.subtext }]}>
                                    {formData.eventDate ? 'Tap to change' : 'Choose your event date'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                        </View>
                    </TouchableOpacity>
                    {availabilityError ? (
                        <Text style={[styles.errorText, { color: '#FF3B30' }]}>{availabilityError}</Text>
                    ) : null}
                </View>

                <View style={styles.quickDetailRow}>
                    <Text style={[styles.quickDetailLabel, { color: theme.text }]}>Time</Text>
                    <TouchableOpacity
                        style={[styles.modernPickerButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                        onPress={openTimePicker}
                    >
                        <View style={styles.pickerContent}>
                            <View style={styles.pickerIconContainer}>
                                <Ionicons name="time-outline" size={20} color="#34C759" />
                            </View>
                            <View style={styles.pickerTextContainer}>
                                <Text style={[styles.pickerMainText, { color: formData.eventStartTime ? theme.text : theme.subtext }]}>
                                    {formData.eventStartTime || 'Select time'}
                                </Text>
                                <Text style={[styles.pickerSubText, { color: theme.subtext }]}>
                                    {formData.eventStartTime ? 'Tap to change' : 'Choose your event time'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.guestCountSection}>
                    <Text style={[styles.guestCountLabel, { color: theme.text }]}>Guests</Text>
                    <TouchableOpacity
                        style={[styles.modernPickerButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                        onPress={() => setShowGuestPicker(true)}
                    >
                        <View style={styles.pickerContent}>
                            <View style={[styles.pickerIconContainer, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                                <Ionicons name="people-outline" size={20} color="#FF9500" />
                            </View>
                            <View style={styles.pickerTextContainer}>
                                <Text style={[styles.pickerMainText, { color: theme.text }]}>
                                    {formData.guestCount === 3000 ? '3,000+' : formData.guestCount.toLocaleString()}
                                </Text>
                                <Text style={[styles.pickerSubText, { color: theme.subtext }]}>
                                    {formData.guestCount === 3000 ? 'Large event' : 'Tap to change guest count'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {errors.eventType && <Text style={styles.errorText}>{errors.eventType}</Text>}
            {errors.eventDate && <Text style={styles.errorText}>{errors.eventDate}</Text>}
            {errors.eventStartTime && <Text style={styles.errorText}>{errors.eventStartTime}</Text>}
        </View>
    );

    // Step 2: Contact Information
    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Contact Information</Text>
                <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
                    We'll use this to send you updates and confirmations
                </Text>
            </View>

            <View style={styles.contactForm}>
        <View style={styles.inputRow}>
          <View style={styles.halfInput}>
            <Text style={[styles.label, { color: theme.text }]}>First Name *</Text>
            <TextInput
                            style={[
                                styles.input,
                                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                                errors.firstName && { borderColor: '#FF3B30' }
                            ]}
              value={formData.firstName}
              onChangeText={(text) => updateFormData('firstName', text)}
              placeholder="First name"
              placeholderTextColor={theme.subtext}
            />
                        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>
          <View style={styles.halfInput}>
            <Text style={[styles.label, { color: theme.text }]}>Last Name *</Text>
            <TextInput
                            style={[
                                styles.input,
                                { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                                errors.lastName && { borderColor: '#FF3B30' }
                            ]}
              value={formData.lastName}
              onChangeText={(text) => updateFormData('lastName', text)}
              placeholder="Last name"
              placeholderTextColor={theme.subtext}
            />
                        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Email Address *</Text>
          <TextInput
                        style={[
                            styles.input,
                            { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border },
                            errors.email && { borderColor: '#FF3B30' }
                        ]}
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            placeholder="your@email.com"
            placeholderTextColor={theme.subtext}
            keyboardType="email-address"
            autoCapitalize="none"
          />
                    {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            placeholder="(555) 123-4567"
            placeholderTextColor={theme.subtext}
            keyboardType="phone-pad"
          />
        </View>
      </View>

            <View style={[styles.trustSignals, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.trustItem}>
                    <Ionicons name="shield-checkmark" size={20} color="#34C759" />
                    <Text style={[styles.trustText, { color: theme.text }]}>Secure & Private</Text>
          </View>
                <View style={styles.trustItem}>
                    <Ionicons name="people" size={20} color="#007AFF" />
                    <Text style={[styles.trustText, { color: theme.text }]}>1000+ Events Hosted</Text>
          </View>
                <View style={styles.trustItem}>
                    <Ionicons name="star" size={20} color="#FF9500" />
                    <Text style={[styles.trustText, { color: theme.text }]}>4.9/5 Rating</Text>
        </View>
            </View>
        </View>
    );

    // Step 3: Event Details
    const renderStep3 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Event Details</Text>
                <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
                    Tell us more about your event
                </Text>
            </View>

            <View style={styles.eventDetailsForm}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Duration</Text>
                    <View style={styles.durationSelector}>
              {[2, 3, 4, 5, 6, 7, 8].map((hours) => (
                <TouchableOpacity
                  key={hours}
                  style={[
                                    styles.durationButton,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                                    formData.duration === hours && { backgroundColor: theme.primary }
                  ]}
                                onPress={() => updateFormData('duration', hours)}
                >
                  <Text style={[
                                    styles.durationButtonText,
                                    { color: formData.duration === hours ? '#fff' : theme.text }
                  ]}>
                    {hours}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Special Requirements</Text>
                    <TextInput
                        style={[styles.textArea, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                        value={formData.specialRequirements}
                        onChangeText={(text) => updateFormData('specialRequirements', text)}
                        placeholder="Any special requests, dietary restrictions, or requirements..."
                        placeholderTextColor={theme.subtext}
                        multiline
                        numberOfLines={3}
                    />
                </View>

                  <TouchableOpacity
                    style={[styles.checkboxRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => updateFormData('isWeekday', !formData.isWeekday)}
                >
                    <View style={[styles.checkbox, { borderColor: theme.border }]}>
                        {formData.isWeekday && (
                            <Ionicons name="checkmark" size={16} color={theme.primary} />
                        )}
                    </View>
                    <View style={styles.checkboxContent}>
                        <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                            Monday–Thursday Event
                    </Text>
                        <Text style={[styles.checkboxSubtext, { color: theme.subtext }]}>
                            Lower venue rental rate ($250/hr vs $300/hr)
                        </Text>
                    </View>
                  </TouchableOpacity>
            </View>
          </View>
    );

    // Step 4: Services & Packages
    const renderStep4 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Services & Packages</Text>
                <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
                    Choose what you need for your event
                </Text>
      </View>

            <ScrollView style={styles.servicesScroll} showsVerticalScrollIndicator={false}>
      {/* Bar Package */}
                <View style={[styles.serviceSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.serviceSectionTitle, { color: theme.primary }]}>Bar Package</Text>
        {Object.keys(pricing.barPackages).map((packageName) => (
          <TouchableOpacity
            key={packageName}
            style={[
              styles.optionCard,
                                { backgroundColor: theme.background, borderColor: theme.border },
              formData.barPackage === packageName && { borderColor: theme.primary, borderWidth: 2 }
            ]}
            onPress={() => updateFormData('barPackage', packageName)}
          >
                            <View style={[styles.radioCircle, { borderColor: theme.border }]}>
              {formData.barPackage === packageName && (
                <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
              )}
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>{packageName}</Text>
              {packageName !== 'No Bar – (Free)' && (
                <Text style={[styles.optionSubtitle, { color: theme.subtext }]}>
                  {pricing.barPackages[packageName].basePrice}/person for {pricing.barPackages[packageName].includedHours} hours
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add-On Services - Flat Fees */}
                <View style={[styles.serviceSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.serviceSectionTitle, { color: theme.primary }]}>Add-On Services (Flat Fee)</Text>
        <View style={styles.servicesGrid}>
          {Object.keys(pricing.addOnServices).map((service) => (
            <TouchableOpacity
              key={service}
              style={[
                styles.serviceCard,
                                    { backgroundColor: theme.background, borderColor: theme.border },
                formData.addOnServices.includes(service) && { borderColor: theme.primary, borderWidth: 2 }
              ]}
              onPress={() => toggleAddOnService(service)}
            >
                                <View style={[styles.checkbox, { borderColor: theme.border }]}>
                {formData.addOnServices.includes(service) && (
                  <Ionicons name="checkmark" size={16} color={theme.primary} />
                )}
              </View>
              <View style={styles.serviceContent}>
                <Text style={[styles.serviceName, { color: theme.text }]}>{service}</Text>
                <Text style={[styles.servicePrice, { color: theme.primary }]}>
                  ${pricing.addOnServices[service]}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Add-On Services - Hourly Rates */}
                <View style={[styles.serviceSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.serviceSectionTitle, { color: theme.primary }]}>Add-On Services (Hourly Rate)</Text>
                    <Text style={[styles.serviceSectionSubtitle, { color: theme.subtext }]}>
                        These services are charged per hour based on event duration
                    </Text>
        <View style={styles.servicesGrid}>
          {Object.keys(pricing.addOnServicesHourly).map((service) => (
            <TouchableOpacity
              key={service}
              style={[
                styles.serviceCard,
                                    { backgroundColor: theme.background, borderColor: theme.border },
                formData.addOnServices.includes(service) && { borderColor: theme.primary, borderWidth: 2 }
              ]}
              onPress={() => toggleAddOnService(service)}
            >
                                <View style={[styles.checkbox, { borderColor: theme.border }]}>
                {formData.addOnServices.includes(service) && (
                  <Ionicons name="checkmark" size={16} color={theme.primary} />
                )}
              </View>
              <View style={styles.serviceContent}>
                <Text style={[styles.serviceName, { color: theme.text }]}>{service}</Text>
                <Text style={[styles.servicePrice, { color: theme.primary }]}>
                  ${pricing.addOnServicesHourly[service]}/hr
                </Text>
                {formData.addOnServices.includes(service) && formData.duration > 0 && (
                  <Text style={[styles.serviceSubPrice, { color: theme.subtext }]}>
                    ${(pricing.addOnServicesHourly[service] * formData.duration).toFixed(2)} total
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bundle Packages */}
                <View style={[styles.serviceSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.serviceSectionTitle, { color: theme.primary }]}>Bundle Packages</Text>
        {Object.keys(pricing.bundlePackages).map((bundle) => (
          <TouchableOpacity
            key={bundle}
            style={[
              styles.optionCard,
                                { backgroundColor: theme.background, borderColor: theme.border },
              formData.bundlePackage === bundle && { borderColor: theme.primary, borderWidth: 2 }
            ]}
            onPress={() => updateFormData('bundlePackage', bundle)}
          >
                            <View style={[styles.radioCircle, { borderColor: theme.border }]}>
              {formData.bundlePackage === bundle && (
                <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
              )}
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.text }]}>{bundle}</Text>
              <Text style={[styles.optionSubtitle, { color: theme.primary }]}>
                ${pricing.bundlePackages[bundle]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
            </ScrollView>

            {/* Live Quote */}
            <View style={[styles.liveQuote, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.quoteHeader}>
                    <Ionicons name="calculator" size={20} color={theme.primary} />
                    <Text style={[styles.quoteTitle, { color: theme.text }]}>Live Quote</Text>
                </View>
                <Text style={[styles.quoteTotal, { color: theme.primary }]}>
                    ${totalCost.toFixed(2)}
                </Text>
                {breakdown.venueRental && (
                    <Text style={[styles.quoteSubtext, { color: theme.subtext }]}>
                        Venue: ${breakdown.venueRental.total.toFixed(2)} ({breakdown.venueRental.duration} hrs @ ${breakdown.venueRental.hourlyRate}/hr)
                    </Text>
                )}
                {formData.isWeekday && breakdown.venueRental && (
                    <Text style={[styles.quoteDiscount, { color: '#34C759' }]}>
                        Weekday rate: Saves ${((pricing.venueRental.weekend - pricing.venueRental.weekday) * formData.duration).toFixed(2)} vs weekend
                    </Text>
                )}
            </View>
        </View>
    );

    // Step 5: Review & Confirm
    const renderStep5 = () => (
        <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Review & Confirm</Text>
                <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
                    Please review your booking details
                </Text>
            </View>

            <ScrollView style={styles.reviewScroll} showsVerticalScrollIndicator={false}>
                {/* Event Summary */}
                <View style={[styles.reviewSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.reviewSectionTitle, { color: theme.primary }]}>Event Summary</Text>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Event Type:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>
                            {eventTypes.find(e => e.id === formData.eventType)?.title || 'Not selected'}
                        </Text>
                    </View>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Date:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.eventDate}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Time:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.eventStartTime}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Duration:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.duration} hours</Text>
                    </View>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Guests:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.guestCount} people</Text>
                    </View>
                </View>

                {/* Contact Information */}
                <View style={[styles.reviewSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.reviewSectionTitle, { color: theme.primary }]}>Contact Information</Text>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Name:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>
                            {formData.firstName} {formData.lastName}
                        </Text>
                    </View>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Email:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.email}</Text>
                    </View>
                    {formData.phone && (
                        <View style={styles.reviewRow}>
                            <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Phone:</Text>
                            <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.phone}</Text>
                        </View>
            )}
          </View>

                {/* Services */}
                <View style={[styles.reviewSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.reviewSectionTitle, { color: theme.primary }]}>Services</Text>
                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Bar Package:</Text>
                        <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.barPackage}</Text>
                    </View>
                    {formData.addOnServices.length > 0 && (
                        <View style={styles.reviewRow}>
                            <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Add-Ons:</Text>
                            <Text style={[styles.reviewValue, { color: theme.text }]}>
                                {formData.addOnServices.join(', ')}
          </Text>
                        </View>
                    )}
                    {formData.bundlePackage && (
                        <View style={styles.reviewRow}>
                            <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Bundle:</Text>
                            <Text style={[styles.reviewValue, { color: theme.text }]}>{formData.bundlePackage}</Text>
                        </View>
                    )}
                </View>

                {/* Cost Breakdown */}
                <View style={[styles.reviewSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.reviewSectionTitle, { color: theme.primary }]}>Cost Breakdown</Text>
                    {breakdown.venueRental && (
                        <View style={styles.reviewRow}>
                            <Text style={[styles.reviewLabel, { color: theme.subtext }]}>
                                {breakdown.venueRental.label} ({breakdown.venueRental.duration} hrs @ ${breakdown.venueRental.hourlyRate}/hr):
                            </Text>
                            <Text style={[styles.reviewValue, { color: theme.text }]}>
                                ${breakdown.venueRental.total.toFixed(2)}
                            </Text>
                        </View>
                    )}
                    {breakdown.barPackage && breakdown.barPackage.total > 0 && (
                        <View style={styles.reviewRow}>
                            <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Bar Package:</Text>
                            <Text style={[styles.reviewValue, { color: theme.text }]}>
                                ${breakdown.barPackage.total.toFixed(2)}
                            </Text>
                        </View>
                    )}
                    {breakdown.addOnServices && breakdown.addOnServices.total > 0 && (
                        <>
                            {breakdown.addOnServices.flatServices && breakdown.addOnServices.flatServices.length > 0 && (
                                <View style={styles.reviewRow}>
                                    <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Add-On Services (Flat):</Text>
                                    <Text style={[styles.reviewValue, { color: theme.text }]}>
                                        ${breakdown.addOnServices.flatTotal.toFixed(2)}
                                    </Text>
                                </View>
                            )}
                            {breakdown.addOnServices.hourlyServices && breakdown.addOnServices.hourlyServices.length > 0 && (
                                <View style={styles.reviewRow}>
                                    <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Add-On Services (Hourly):</Text>
                                    <Text style={[styles.reviewValue, { color: theme.text }]}>
                                        ${breakdown.addOnServices.hourlyTotal.toFixed(2)}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                    {breakdown.bundlePackage && (
                        <View style={styles.reviewRow}>
                            <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Bundle Package:</Text>
                            <Text style={[styles.reviewValue, { color: theme.text }]}>
                                ${breakdown.bundlePackage.total.toFixed(2)}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.reviewRow, styles.totalRow, { borderTopColor: theme.border }]}>
                        <Text style={[styles.totalLabel, { color: theme.text }]}>Total Cost:</Text>
                        <Text style={[styles.totalValue, { color: theme.primary }]}>
                            ${totalCost.toFixed(2)}
                        </Text>
                    </View>
                    {requiresDeposit && depositAmount > 0 && (
                        <>
                            <View style={[styles.reviewRow, { borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 8, marginTop: 8 }]}>
                                <Text style={[styles.reviewLabel, { color: theme.text, fontWeight: '600' }]}>Deposit Required (50%):</Text>
                                <Text style={[styles.reviewValue, { color: '#FF9500', fontWeight: '600' }]}>
                                    ${depositAmount.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.reviewRow}>
                                <Text style={[styles.reviewLabel, { color: theme.subtext }]}>Remaining Balance:</Text>
                                <Text style={[styles.reviewValue, { color: theme.text }]}>
                                    ${(totalCost - depositAmount).toFixed(2)}
                                </Text>
                            </View>
                            <Text style={[styles.depositNote, { color: theme.subtext }]}>
                                A deposit of ${depositAmount.toFixed(2)} is required to secure your booking. The remaining balance will be due before the event.
                            </Text>
                        </>
                    )}
        </View>

                {/* Terms and Conditions */}
                <View style={[styles.reviewSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <TouchableOpacity
                        style={[styles.checkboxRow, { backgroundColor: theme.background, borderColor: theme.border }]}
          onPress={() => updateFormData('agreeToTerms', !formData.agreeToTerms)}
        >
                        <View style={[styles.checkbox, { borderColor: theme.border }]}>
            {formData.agreeToTerms && (
              <Ionicons name="checkmark" size={16} color={theme.primary} />
            )}
          </View>
                        <View style={styles.checkboxContent}>
          <Text style={[styles.checkboxLabel, { color: theme.text }]}>
                                I agree to the terms of service and privacy policy *
          </Text>
                            <Text style={[styles.checkboxSubtext, { color: theme.subtext }]}>
                                By checking this box, you confirm that you have read and agree to our terms of service and privacy policy.
                            </Text>
                        </View>
        </TouchableOpacity>
                    {errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}
                    {errors.totalCost && <Text style={styles.errorText}>{errors.totalCost}</Text>}
                    {paymentError && (
                        <View style={[styles.paymentErrorContainer, { backgroundColor: '#FFE5E5', borderColor: '#FF3B30' }]}>
                            <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                            <Text style={[styles.paymentErrorText, { color: '#FF3B30' }]}>{paymentError}</Text>
                        </View>
                    )}
      </View>
    </ScrollView>
        </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Schedule an Event</Text>
          <View style={{ width: 24 }} />
        </View>

                {/* Progress Indicator */}
                {renderProgressIndicator()}

                {/* Step Content */}
                <ScrollView 
                    style={styles.stepContent} 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                </ScrollView>

                {/* Fixed Navigation Buttons */}
                <View style={[styles.navigationButtons, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
                    {currentStep > 1 && (
                        <TouchableOpacity
                            style={[styles.navButton, styles.backButton, { borderColor: theme.border }]}
                            onPress={prevStep}
                        >
                            <Ionicons name="arrow-back" size={20} color={theme.text} />
                            <Text style={[styles.navButtonText, { color: theme.text }]}>Back</Text>
                        </TouchableOpacity>
                    )}

          <TouchableOpacity
                        style={[
                            styles.navButton,
                            styles.nextButton,
                            { backgroundColor: theme.primary },
                            (isSubmitting || paymentStep === 'processing') && { opacity: 0.7 }
                        ]}
                        onPress={currentStep === totalSteps ? handleSubmit : nextStep}
                        disabled={isSubmitting || paymentStep === 'processing'}
                    >
                        {isSubmitting || paymentStep === 'processing' ? (
                            <>
                                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                                <Text style={[styles.navButtonText, { color: '#fff' }]}>
                                    {paymentStep === 'processing' ? 'Processing Payment...' : 'Submitting...'}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={[styles.navButtonText, { color: '#fff' }]}>
                                    {currentStep === totalSteps 
                                        ? (requiresDeposit && depositAmount > 0 
                                            ? `Pay Deposit $${depositAmount.toFixed(2)} & Submit` 
                                            : 'Submit Booking')
                                        : 'Next'}
            </Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            </>
                        )}
          </TouchableOpacity>
        </View>

                {/* Calendar Modal */}
        <Modal
            visible={showCalendar}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setShowCalendar(false)}
        >
            <SafeAreaView 
                style={[styles.modalContainer, { backgroundColor: theme?.background || '#FFFFFF' }]}
                edges={['bottom', 'left', 'right']}
            >
                <View style={[
                    styles.modalHeader, 
                    { 
                        borderBottomColor: theme?.border || '#E5E5E7',
                        paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 8 : 12),
                    }
                ]}>
                    <TouchableOpacity onPress={() => setShowCalendar(false)}>
                        <Ionicons name="close" size={24} color={theme?.text || '#000000'} />
                    </TouchableOpacity>
                    <Text style={[styles.modalTitle, { color: theme?.text || '#000000' }]}>Select Date</Text>
                    <View style={{ width: 24 }} />
                </View>
                <ScrollView>
                    <BookingCalendar
                        onDateSelect={handleCalendarDateSelect}
                        selectedDate={selectedDate}
                        onAvailabilityCheck={handleAvailabilityCheck}
                    />
                </ScrollView>
            </SafeAreaView>
        </Modal>

                {/* Modern Date Picker Modal (Fallback) */}
        {showDatePicker && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modernPickerModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Date</Text>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.pickerWrapper}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
                                    display="spinner"
            onChange={onDateChange}
            minimumDate={new Date()}
                                    style={styles.modernDateTimePicker}
          />
                            </View>
                        </View>
                    </View>
        )}
        
                {/* Modern Time Picker Modal */}
        {showTimePicker && (
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modernPickerModal, { backgroundColor: theme.background }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Time</Text>
                                <TouchableOpacity onPress={handleTimeCancel} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={theme.text} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.pickerWrapper}>
                                <DateTimePicker
                                    value={tempTime}
                                    mode="time"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onTimeChange}
                                    style={styles.modernDateTimePicker}
                                />
                            </View>
                            {Platform.OS === 'ios' && (
                                <View style={[styles.pickerActions, { borderTopColor: theme.border }]}>
                                    <TouchableOpacity
                                        style={[styles.pickerCancelButton, { borderColor: theme.border }]}
                                        onPress={handleTimeCancel}
                                    >
                                        <Text style={[styles.pickerCancelText, { color: theme.text }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.pickerConfirmButton, { backgroundColor: theme.primary }]}
                                        onPress={() => handleTimeConfirm()}
                                    >
                                        <Text style={styles.pickerConfirmText}>Confirm</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Modern Guest Count Picker Modal */}
                {showGuestPicker && (
                    <View style={styles.modalOverlay}>
                        <View style={styles.modernPickerModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Guest Count</Text>
                                <TouchableOpacity onPress={() => setShowGuestPicker(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.guestPickerWrapper}>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <View style={styles.guestGrid}>
                                        {[50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1250, 1500, 1750, 2000, 2500, 3000].map((count) => (
                                            <TouchableOpacity
                                                key={count}
                                                style={[
                                                    styles.guestOption,
                                                    {
                                                        backgroundColor: formData.guestCount === count ? '#FF9500' : '#F8F9FA',
                                                        borderColor: formData.guestCount === count ? '#FF9500' : '#E5E5E7',
                                                    }
                                                ]}
                                                onPress={() => {
                                                    updateFormData('guestCount', count);
                                                    setShowGuestPicker(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.guestOptionText,
                                                    {
                                                        color: formData.guestCount === count ? '#fff' : '#1C1C1E',
                                                        fontWeight: formData.guestCount === count ? '700' : '600',
                                                    }
                                                ]}>
                                                    {count === 3000 ? '3,000+' : count.toLocaleString()}
                                                </Text>
                                                {count === 3000 && (
                                                    <Text style={[styles.guestOptionSubtext, { color: formData.guestCount === count ? 'rgba(255,255,255,0.8)' : '#8E8E93' }]}>
                                                        Large Event
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </View>
                )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
    progressContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E5E5E7',
        borderRadius: 2,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center',
    },
    stepContent: {
    flex: 1,
        paddingBottom: 20,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    stepContainer: {
    paddingHorizontal: 20,
        paddingBottom: 30,
        paddingTop: 10,
    },
    stepHeader: {
        marginBottom: 30,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 16,
        lineHeight: 22,
    },
    eventTypesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    eventTypeCard: {
        width: '48%',
        padding: 20,
        borderRadius: 16,
    borderWidth: 1,
        marginBottom: 16,
        alignItems: 'center',
        position: 'relative',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    popularBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularText: {
        color: '#fff',
        fontSize: 12,
    fontWeight: 'bold',
    },
    eventIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    eventTypeTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    eventTypeSubtitle: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 16,
    },
    quickDetails: {
        gap: 20,
        marginBottom: 24,
        paddingVertical: 8,
    },
    quickDetailRow: {
    flexDirection: 'row',
        alignItems: 'center',
    justifyContent: 'space-between',
        marginBottom: 8,
    },
    quickDetailLabel: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    quickDetailButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16, // Increased padding for better touch target
        borderRadius: 8,
        borderWidth: 1,
        marginLeft: 16,
        minHeight: 48, // Ensure minimum touch target size
    },
    quickDetailText: {
        fontSize: 16,
    },
    guestCountSection: {
        marginBottom: 24,
        paddingVertical: 8,
    },
    guestCountLabel: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    guestSelector: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    guestButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 2,
        flex: 1,
        minWidth: 60,
        maxWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    guestButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    contactForm: {
        marginBottom: 30,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  inputGroup: {
        marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
        paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
        paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
    trustSignals: {
    flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        borderRadius: 12,
    borderWidth: 1,
    },
    trustItem: {
        alignItems: 'center',
        gap: 8,
    },
    trustText: {
    fontSize: 12,
    fontWeight: '500',
  },
    eventDetailsForm: {
        marginBottom: 30,
    },
    durationSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    durationButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    durationButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    checkboxContent: {
        flex: 1,
    },
    checkboxLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    checkboxSubtext: {
        fontSize: 14,
        lineHeight: 18,
    },
    servicesScroll: {
        flex: 1,
        marginBottom: 20,
    },
    serviceSection: {
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    serviceSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    serviceSectionSubtitle: {
        fontSize: 12,
        marginBottom: 12,
        fontStyle: 'italic',
    },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
        padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
        padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  serviceContent: {
    flex: 1,
    marginLeft: 8,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  serviceSubPrice: {
    fontSize: 10,
    marginTop: 2,
    fontStyle: 'italic',
  },
  radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
    liveQuote: {
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
    alignItems: 'center',
  },
    quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
        marginBottom: 12,
    },
    quoteTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    quoteTotal: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    quoteSubtext: {
        fontSize: 12,
        marginTop: 4,
    },
    quoteDiscount: {
    fontSize: 14,
        fontWeight: '500',
    },
    reviewScroll: {
    flex: 1,
        marginBottom: 20,
  },
    reviewSection: {
    padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    reviewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
        marginBottom: 16,
  },
    reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
        marginBottom: 8,
  },
    reviewLabel: {
    fontSize: 14,
        flex: 1,
  },
    reviewValue: {
    fontSize: 14,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
  },
    totalRow: {
    borderTopWidth: 1,
        paddingTop: 12,
        marginTop: 8,
  },
    totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
    totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
    navigationButtons: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 25 : 16, // Safe area padding
        borderTopWidth: 1,
        gap: 12,
        // backgroundColor will be set dynamically
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    navButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    borderRadius: 8,
        gap: 8,
    },
    backButton: {
        borderWidth: 1,
    },
    nextButton: {
        // backgroundColor set dynamically
    },
    navButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    pickerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        zIndex: 20, // Higher than other content
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E7',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    alignItems: 'center',
        marginBottom: 16,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    // Modern Picker Styles
    modernPickerButton: {
        borderRadius: 16,
        borderWidth: 1.5,
        marginVertical: 4,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    pickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    pickerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    pickerTextContainer: {
        flex: 1,
    },
    pickerMainText: {
    fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    pickerSubText: {
        fontSize: 13,
        opacity: 0.7,
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    modernPickerModal: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '50%',
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        minHeight: Platform.OS === 'ios' ? 44 : 52,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerWrapper: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    modernDateTimePicker: {
        height: 200,
    },
    pickerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    pickerCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerCancelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    pickerConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    // Guest Picker Styles
    guestPickerWrapper: {
        paddingHorizontal: 20,
        paddingTop: 20,
        maxHeight: 300,
    },
    guestGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    guestOption: {
        width: '30%',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 60,
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    guestOptionText: {
        fontSize: 16,
        textAlign: 'center',
    },
    guestOptionSubtext: {
        fontSize: 11,
        marginTop: 2,
        textAlign: 'center',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 4,
        marginLeft: 4,
    },
    depositNote: {
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    paymentErrorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 12,
        gap: 8,
    },
    paymentErrorText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
});
