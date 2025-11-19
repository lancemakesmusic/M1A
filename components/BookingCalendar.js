/**
 * Booking Calendar Component
 * Embedded calendar for event booking with Google Calendar availability sync
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import GoogleCalendarService from '../services/GoogleCalendarService';

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
  const remainingDays = 42 - days.length;
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

export default function BookingCalendar({ onDateSelect, selectedDate, onAvailabilityCheck }) {
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    background: '#FFFFFF',
    text: '#000000',
    subtext: '#666666',
    border: '#E5E5E7',
    primary: '#007AFF',
    cardBackground: '#F8F9FA',
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState({});

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const calendarDays = generateCalendarDays(currentYear, currentMonth);

  useEffect(() => {
    loadAvailability();
  }, [currentDate]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      // Check if Google Calendar is connected
      const isConnected = await GoogleCalendarService.isConnected();
      if (!isConnected) {
        // If not connected, just show calendar without availability checking
        setEvents([]);
        setAvailabilityMap({});
        setLoading(false);
        return;
      }

      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      const result = await GoogleCalendarService.getEvents(startDate, endDate);
      
      if (result && result.success) {
        setEvents(result.events || []);
        
        // Build availability map
        const map = {};
        if (result.events && Array.isArray(result.events)) {
          result.events.forEach(event => {
            if (event && event.start) {
              const eventDate = new Date(event.start.dateTime || event.start.date);
              const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
              map[dateKey] = false; // Not available
            }
          });
        }
        setAvailabilityMap(map);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      // Continue without availability checking if there's an error
      setEvents([]);
      setAvailabilityMap({});
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (day) => {
    if (!day.isCurrentMonth) {
      setCurrentDate(new Date(day.year, day.month, day.date));
      return;
    }

    const selectedDateObj = new Date(day.year, day.month, day.date);
    const dateKey = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    
    // Check if date is available (only if we have availability data)
    if (availabilityMap[dateKey] === false) {
      // Date is booked, show message
      if (onAvailabilityCheck) {
        onAvailabilityCheck(false, 'This date is already booked. Please select another date.');
      }
      return;
    }

    // Try to check availability with Google Calendar (if connected)
    try {
      const isConnected = await GoogleCalendarService.isConnected();
      if (isConnected) {
        const startTime = new Date(selectedDateObj);
        startTime.setHours(12, 0, 0, 0); // Default to noon
        const endTime = new Date(startTime);
        endTime.setHours(18, 0, 0, 0); // Default 6 hour event

        const availability = await GoogleCalendarService.checkAvailability(startTime, endTime);
        
        if (availability && !availability.available) {
          if (onAvailabilityCheck) {
            onAvailabilityCheck(false, availability.reason || 'This date is not available.');
          }
          return;
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      // Continue with date selection even if availability check fails
    }

    // Select the date
    if (onDateSelect) {
      onDateSelect(selectedDateObj);
    }
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentMonth + direction);
    setCurrentDate(newDate);
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

  const isDateSelected = (day) => {
    if (!selectedDate || !day.isCurrentMonth) return false;
    return selectedDate.toDateString() === new Date(day.year, day.month, day.date).toDateString();
  };

  const isDateUnavailable = (day) => {
    if (!day.isCurrentMonth) return false;
    const dateKey = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    return availabilityMap[dateKey] === false;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Month Header */}
      <View style={[styles.monthHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={styles.monthTitle}>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaders}>
        {dayNames.map((day, index) => (
          <View key={index} style={styles.dayHeader}>
            <Text style={[styles.dayHeaderText, { color: theme.subtext }]}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isSelected = isDateSelected(day);
          const isUnavailable = isDateUnavailable(day);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                {
                  backgroundColor: day.isCurrentMonth ? theme.background : theme.cardBackground,
                  borderColor: isSelected ? theme.primary : 'transparent',
                  opacity: isUnavailable ? 0.5 : 1,
                },
              ]}
              onPress={() => handleDateSelect(day)}
              disabled={isUnavailable}
            >
              <View style={[
                styles.dayNumber,
                {
                  backgroundColor: day.isToday ? theme.primary : 
                                   isSelected ? theme.primary + '20' : 'transparent',
                },
              ]}>
                <Text style={[
                  styles.dayNumberText,
                  {
                    color: day.isToday ? '#fff' : 
                           isSelected ? theme.primary :
                           day.isCurrentMonth ? theme.text : theme.subtext,
                    fontWeight: (day.isToday || isSelected) ? 'bold' : 'normal',
                  },
                ]}>
                  {day.date}
                </Text>
              </View>
              
              {/* Event Indicators */}
              {dayEvents.length > 0 && (
                <View style={styles.eventIndicator}>
                  <View style={[styles.eventDot, { backgroundColor: '#FF3B30' }]} />
                </View>
              )}
              
              {isUnavailable && (
                <View style={styles.unavailableOverlay}>
                  <Ionicons name="close-circle" size={16} color="#FF3B30" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: theme.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.subtext }]}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
          <Text style={[styles.legendText, { color: theme.subtext }]}>Booked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.subtext }]}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
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
    borderWidth: 2,
    padding: 4,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 14,
  },
  eventIndicator: {
    marginTop: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
  },
});

