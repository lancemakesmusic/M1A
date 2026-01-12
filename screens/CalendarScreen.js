/**
 * Calendar Screen
 * Google Calendar-style booking interface with venue availability sync
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import GoogleCalendarService from '../services/GoogleCalendarService';
import { trackFeatureUsage, trackButtonClick } from '../services/AnalyticsService';
import useScreenTracking from '../hooks/useScreenTracking';
import * as Notifications from 'expo-notifications';
import { scheduleEventReminder } from '../services/NotificationService';

// Generate calendar days for a month
const generateCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  // Add days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: prevMonthLastDay - i,
      month: month - 1,
      year: year,
      isCurrentMonth: false,
    });
  }
  
  // Add days from current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: i,
      month: month,
      year: year,
      isCurrentMonth: true,
      isToday: new Date(year, month, i).toDateString() === new Date().toDateString(),
    });
  }
  
  // Add days from next month to fill the grid
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      date: i,
      month: month + 1,
      year: year,
      isCurrentMonth: false,
    });
  }
  
  return days;
};

export default function CalendarScreen({ navigation }) {
  const { theme } = useTheme();
  useScreenTracking('CalendarScreen');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState('start'); // 'start' or 'end'
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calendarView, setCalendarView] = useState('month'); // 'month', 'week', 'day', 'agenda'
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderTime, setSelectedReminderTime] = useState('10'); // minutes before
  
  // Event form data
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'Event',
    allDay: false,
    startDate: new Date(),
    startTime: new Date(),
    endDate: new Date(),
    endTime: new Date(new Date().getTime() + 3600000), // 1 hour later
    calendar: 'Merkaba Master Schedule',
    location: '',
    description: '',
    guests: [],
    reminders: ['10'], // Default: 10 minutes before
  });

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const calendarDays = generateCalendarDays(currentYear, currentMonth);

  useEffect(() => {
    checkConnection();
    loadEvents();
  }, [currentDate]);

  const checkConnection = async () => {
    const connected = await GoogleCalendarService.isConnected();
    setIsConnected(connected);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      const result = await GoogleCalendarService.getEvents(startDate, endDate);
      if (result.success) {
        setEvents(result.events);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (day) => {
    if (!day.isCurrentMonth) {
      // Navigate to that month
      setCurrentDate(new Date(day.year, day.month, day.date));
      return;
    }
    
    setSelectedDate(new Date(day.year, day.month, day.date));
    setEventForm(prev => ({
      ...prev,
      startDate: new Date(day.year, day.month, day.date),
      endDate: new Date(day.year, day.month, day.date),
    }));
    setShowEventModal(true);
    trackButtonClick('select_date', 'CalendarScreen');
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    setLoading(true);
    try {
      // Check availability
      const startDateTime = new Date(eventForm.startDate);
      startDateTime.setHours(eventForm.startTime.getHours());
      startDateTime.setMinutes(eventForm.startTime.getMinutes());
      
      const endDateTime = new Date(eventForm.endDate);
      endDateTime.setHours(eventForm.endTime.getHours());
      endDateTime.setMinutes(eventForm.endTime.getMinutes());

      const availability = await GoogleCalendarService.checkAvailability(
        startDateTime,
        endDateTime
      );

      if (!availability.available) {
        Alert.alert(
          'Time Unavailable',
          availability.reason || 'This time slot is already booked. Please choose another time.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      // Create event
      const result = await GoogleCalendarService.createEvent({
        title: eventForm.title,
        description: eventForm.description,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: eventForm.location || 'Merkaba Venue',
        attendees: eventForm.guests,
      });

      if (result.success) {
        Alert.alert(
          'Event Created!',
          result.message || 'Your event has been added to the calendar.',
          [{ text: 'OK', onPress: () => {
            setShowEventModal(false);
            loadEvents();
            trackFeatureUsage('CalendarEventCreated');
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create event');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create event. Please try again.');
      console.error('Error creating event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const url = GoogleCalendarService.getOAuthUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, Linking.createURL('/auth/google'));
      
      if (result.type === 'success') {
        // Handle OAuth callback
        // In production, exchange code for tokens
        Alert.alert('Connected!', 'Google Calendar has been connected successfully.');
        await checkConnection();
        await loadEvents();
        trackFeatureUsage('GoogleCalendarConnected');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect Google Calendar');
      console.error('OAuth error:', error);
    }
  };

  const getEventsForDate = (day) => {
    if (!day.isCurrentMonth) return [];
    const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      return eventDateStr === dateStr;
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentMonth + direction);
    setCurrentDate(newDate);
    trackButtonClick(`navigate_month_${direction > 0 ? 'next' : 'prev'}`, 'CalendarScreen');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <TouchableOpacity 
            style={styles.monthSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.monthText, { color: theme.text }]}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.subtext} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => {}} style={styles.headerIcon}>
            <Ionicons name="search" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.todayText}>{new Date().getDate()}</Text>
          </View>
        </View>
      </View>

      {/* Month Navigation */}
      <View style={[styles.monthNav, { backgroundColor: theme.cardBackground }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Nov', 'Dec', '2026', 'Jan', 'Feb', 'Mar'].map((month, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.monthNavItem,
                {
                  backgroundColor: index === 0 ? theme.primary + '20' : 'transparent',
                  borderColor: index === 0 ? theme.primary : 'transparent',
                },
              ]}
            >
              <Text style={[
                styles.monthNavText,
                { color: index === 0 ? theme.primary : theme.text }
              ]}>
                {month}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Calendar Grid */}
      <ScrollView style={styles.calendarContainer}>
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {dayNames.map((day, index) => (
            <View key={index} style={styles.dayHeader}>
              <Text style={[styles.dayHeaderText, { color: theme.subtext }]}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Days */}
        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate.toDateString() === new Date(day.year, day.month, day.date).toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: day.isCurrentMonth ? theme.background : theme.cardBackground,
                    borderColor: isSelected ? theme.primary : 'transparent',
                  },
                ]}
                onPress={() => handleDateSelect(day)}
              >
                <View style={[
                  styles.dayNumber,
                  {
                    backgroundColor: day.isToday ? theme.primary : 'transparent',
                  },
                ]}>
                  <Text style={[
                    styles.dayNumberText,
                    {
                      color: day.isToday ? '#fff' : 
                             day.isCurrentMonth ? theme.text : theme.subtext,
                      fontWeight: day.isToday ? 'bold' : 'normal',
                    },
                  ]}>
                    {day.date}
                  </Text>
                </View>
                
                {/* Event Labels */}
                <View style={styles.eventsContainer}>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <View
                      key={eventIndex}
                      style={[
                        styles.eventLabel,
                        { backgroundColor: event.colorId === '1' ? '#4285F4' : '#34C759' },
                      ]}
                    >
                      <Text style={styles.eventLabelText} numberOfLines={1}>
                        {event.summary}
                      </Text>
                    </View>
                  ))}
                  {dayEvents.length > 3 && (
                    <Text style={[styles.moreEventsText, { color: theme.subtext }]}>
                      +{dayEvents.length - 3}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Connect Google Calendar Button */}
      {!isConnected && (
        <View style={[styles.connectBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="calendar" size={20} color={theme.primary} />
          <Text style={[styles.connectText, { color: theme.text }]}>
            Connect Google Calendar to sync venue availability
          </Text>
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: theme.primary }]}
            onPress={handleConnectGoogle}
          >
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {
          setEventForm(prev => ({
            ...prev,
            startDate: selectedDate,
            endDate: selectedDate,
          }));
          setShowEventModal(true);
          trackButtonClick('create_event_fab', 'CalendarScreen');
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Event Creation Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <Text style={[styles.modalButton, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalHeaderCenter} />
              <TouchableOpacity onPress={handleCreateEvent} disabled={loading}>
                <Text style={[
                  styles.modalButton,
                  { color: eventForm.title.trim() ? theme.primary : theme.subtext }
                ]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Title */}
              <TextInput
                style={[styles.titleInput, { color: theme.text }]}
                placeholder="Add title"
                placeholderTextColor={theme.subtext}
                value={eventForm.title}
                onChangeText={(text) => setEventForm(prev => ({ ...prev, title: text }))}
              />

              {/* Event Type */}
              <View style={styles.typeSelector}>
                {['Event', 'Task', 'Working location', 'Out of office'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: eventForm.type === type ? theme.primary + '20' : theme.background,
                        borderColor: eventForm.type === type ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setEventForm(prev => ({ ...prev, type }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      { color: eventForm.type === type ? theme.primary : theme.text }
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* All-day Toggle */}
              <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
                <View style={styles.toggleLeft}>
                  <Ionicons name="time-outline" size={20} color={theme.text} />
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>All-day</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: eventForm.allDay ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setEventForm(prev => ({ ...prev, allDay: !prev.allDay }))}
                >
                  <View style={[
                    styles.toggleThumb,
                    {
                      transform: [{ translateX: eventForm.allDay ? 20 : 0 }],
                    },
                  ]} />
                </TouchableOpacity>
              </View>

              {/* Date/Time Pickers */}
              {!eventForm.allDay && (
                <>
                  <View style={[styles.dateTimeRow, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.dateTimeLabel, { color: theme.text }]}>
                        {eventForm.startDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={() => {
                        setTimePickerMode('start');
                        setShowTimePicker(true);
                      }}
                    >
                      <Text style={[styles.dateTimeValue, { color: theme.primary }]}>
                        {eventForm.startTime.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.dateTimeRow, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.dateTimeLabel, { color: theme.text }]}>
                        {eventForm.endDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={() => {
                        setTimePickerMode('end');
                        setShowTimePicker(true);
                      }}
                    >
                      <Text style={[styles.dateTimeValue, { color: theme.primary }]}>
                        {eventForm.endTime.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Calendar Selection */}
              <View style={[styles.calendarSelector, { borderBottomColor: theme.border }]}>
                <View style={styles.calendarAccount}>
                  <View style={[styles.accountIcon, { backgroundColor: theme.primary }]}>
                    <Text style={styles.accountIconText}>L</Text>
                  </View>
                  <Text style={[styles.accountEmail, { color: theme.text }]}>
                    admin@merkabaent.com
                  </Text>
                </View>
                <View style={styles.calendarButtons}>
                  <TouchableOpacity
                    style={[
                      styles.calendarButton,
                      {
                        backgroundColor: eventForm.calendar === 'My calendar' ? theme.primary + '20' : theme.background,
                        borderColor: eventForm.calendar === 'My calendar' ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setEventForm(prev => ({ ...prev, calendar: 'My calendar' }))}
                  >
                    <View style={[styles.calendarDot, { backgroundColor: theme.primary }]} />
                    <Text style={[
                      styles.calendarButtonText,
                      { color: eventForm.calendar === 'My calendar' ? theme.primary : theme.text }
                    ]}>
                      My calendar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.calendarButton,
                      {
                        backgroundColor: eventForm.calendar === 'Merkaba Master Schedule' ? theme.primary + '20' : theme.background,
                        borderColor: eventForm.calendar === 'Merkaba Master Schedule' ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setEventForm(prev => ({ ...prev, calendar: 'Merkaba Master Schedule' }))}
                  >
                    <View style={[styles.calendarDot, { backgroundColor: theme.primary }]} />
                    <Text style={[
                      styles.calendarButtonText,
                      { color: eventForm.calendar === 'Merkaba Master Schedule' ? theme.primary : theme.text }
                    ]}>
                      Merkaba Master Schedule
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Additional Options */}
              <TouchableOpacity style={[styles.optionRow, { borderBottomColor: theme.border }]}>
                <Ionicons name="people-outline" size={20} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Add guests</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.optionRow, { borderBottomColor: theme.border }]}>
                <Ionicons name="videocam-outline" size={20} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Add video conferencing</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.optionRow, { borderBottomColor: theme.border }]}>
                <Ionicons name="location-outline" size={20} color={theme.text} />
                <Text style={[styles.optionText, { color: theme.text }]}>Add location</Text>
              </TouchableOpacity>

              {/* Reminders */}
              <View style={[styles.remindersSection, { borderBottomColor: theme.border }]}>
                <View style={styles.remindersHeader}>
                  <Ionicons name="notifications-outline" size={20} color={theme.text} />
                  <Text style={[styles.optionText, { color: theme.text }]}>Reminders</Text>
                </View>
                {eventForm.reminders && eventForm.reminders.length > 0 && (
                  <View style={styles.remindersList}>
                    {eventForm.reminders.map((minutes, index) => (
                      <View key={index} style={[styles.reminderChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <Text style={[styles.reminderChipText, { color: theme.text }]}>
                          {minutes} minutes before
                        </Text>
                        <TouchableOpacity onPress={() => removeReminder(minutes)}>
                          <Ionicons name="close-circle" size={18} color={theme.subtext} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity 
                  style={[styles.optionRow]}
                  onPress={() => setShowReminderModal(true)}
                >
                  <Text style={[styles.optionText, { color: theme.primary }]}>+ Add reminder</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={eventForm.startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setEventForm(prev => ({
                ...prev,
                startDate: date,
                endDate: date,
              }));
            }
          }}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={timePickerMode === 'start' ? eventForm.startTime : eventForm.endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, time) => {
            setShowTimePicker(false);
            if (time) {
              if (timePickerMode === 'start') {
                setEventForm(prev => ({ ...prev, startTime: time }));
              } else {
                setEventForm(prev => ({ ...prev, endTime: time }));
              }
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    padding: 8,
  },
  todayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  monthNav: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  monthNavItem: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  monthNavText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarContainer: {
    flex: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    padding: 4,
    minHeight: 60,
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  dayNumberText: {
    fontSize: 14,
  },
  eventsContainer: {
    flex: 1,
    gap: 2,
  },
  eventLabel: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  eventLabelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  moreEventsText: {
    fontSize: 10,
    marginTop: 2,
  },
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  connectText: {
    flex: 1,
    fontSize: 14,
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalHeaderCenter: {
    flex: 1,
  },
  modalBody: {
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingVertical: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  dateTimeRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeLabel: {
    fontSize: 16,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  calendarSelector: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  calendarAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountIconText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  accountEmail: {
    fontSize: 14,
  },
  calendarButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  calendarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  calendarButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
});

