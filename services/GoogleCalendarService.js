/**
 * Google Calendar Service
 * Handles Google Calendar integration, syncing, and venue availability
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const CALENDAR_ID_KEY = 'm1a_google_calendar_id';
const ACCESS_TOKEN_KEY = 'm1a_google_access_token';
const REFRESH_TOKEN_KEY = 'm1a_google_refresh_token';
// Google Business Calendar ID - Admin calendar for syncing all bookings
const VENUE_CALENDAR_ID = process.env.EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID || 'admin@merkabaent.com';

class GoogleCalendarService {
  /**
   * Get Google Calendar OAuth URL
   */
  getOAuthUrl() {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      throw new Error('Google Client ID not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID');
    }
    const redirectUri = Linking.createURL('/auth/google');
    const scope = 'https://www.googleapis.com/auth/calendar';
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;
  }

  /**
   * Check if Google Calendar is connected
   */
  async isConnected() {
    try {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      return !!token;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  }

  /**
   * Get access token
   */
  async getAccessToken() {
    try {
      return await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Save tokens
   */
  async saveTokens(accessToken, refreshToken, calendarId = null) {
    try {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      if (calendarId) {
        await AsyncStorage.setItem(CALENDAR_ID_KEY, calendarId);
      }
      return true;
    } catch (error) {
      console.error('Error saving tokens:', error);
      return false;
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect() {
    try {
      await AsyncStorage.multiRemove([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        CALENDAR_ID_KEY,
      ]);
      return true;
    } catch (error) {
      console.error('Error disconnecting:', error);
      return false;
    }
  }

  /**
   * Check venue availability for a time range
   */
  async checkAvailability(startTime, endTime, calendarId = VENUE_CALENDAR_ID) {
    try {
      // Validate inputs
      if (!startTime || !(startTime instanceof Date)) {
        throw new Error('Invalid start time');
      }
      if (!endTime || !(endTime instanceof Date)) {
        throw new Error('Invalid end time');
      }
      if (startTime >= endTime) {
        throw new Error('Start time must be before end time');
      }
      if (!calendarId || typeof calendarId !== 'string') {
        throw new Error('Invalid calendar ID');
      }

      const isConnected = await this.isConnected();
      if (!isConnected) {
        // Return available but with warning - don't block bookings if calendar not connected
        return { 
          available: true, 
          reason: 'Google Calendar not connected. Availability cannot be verified. Booking may conflict with existing events.',
          warning: 'Calendar not connected',
          error: 'Not connected'
        };
      }

      const token = await this.getAccessToken();
      if (!token) {
        // Return available but with warning
        return { 
          available: true, 
          reason: 'Google Calendar access token missing. Availability cannot be verified. Booking may conflict with existing events.',
          warning: 'No access token',
          error: 'No access token'
        };
      }

      // For now, return mock availability
      // In production, this would call Google Calendar API
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/freebusy?` +
        `timeMin=${startTime.toISOString()}&` +
        `timeMax=${endTime.toISOString()}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            items: [{ id: calendarId }],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        console.error('Google Calendar availability check failed:', errorMessage);
        // Return available but with warning - don't block bookings on API errors
        return { 
          available: true, 
          reason: `Unable to verify availability (${errorMessage}). Booking may conflict with existing events.`,
          warning: 'Availability check failed',
          error: errorMessage
        };
      }

      const data = await response.json();
      const busy = data.calendars?.[calendarId]?.busy || [];
      
      return {
        available: busy.length === 0,
        conflicts: busy,
        reason: busy.length > 0 ? 'Time slot is already booked' : 'Available',
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      // Return available but with warning - don't block bookings on errors
      return { 
        available: true, 
        reason: `Unable to verify availability (${error.message}). Booking may conflict with existing events.`,
        warning: 'Availability check error',
        error: error.message
      };
    }
  }

  /**
   * Get events from Google Calendar
   */
  async getEvents(startDate, endDate, calendarId = VENUE_CALENDAR_ID) {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, events: [], error: 'Not connected' };
      }

      // Mock events for development
      // In production, this would call Google Calendar API
      const mockEvents = [
        {
          id: 'event1',
          summary: 'Private Event',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() },
          colorId: '1',
        },
      ];

      return { success: true, events: mockEvents };
    } catch (error) {
      console.error('Error getting events:', error);
      return { success: false, events: [], error: error.message };
    }
  }

  /**
   * Create event in Google Business Calendar
   */
  async createEvent(eventData, calendarId = VENUE_CALENDAR_ID) {
    try {
      // Validate inputs
      if (!eventData || typeof eventData !== 'object') {
        throw new Error('Invalid event data');
      }
      if (!eventData.title || typeof eventData.title !== 'string') {
        throw new Error('Event title is required');
      }
      if (!eventData.startTime || !eventData.endTime) {
        throw new Error('Event start and end times are required');
      }
      if (!calendarId || typeof calendarId !== 'string') {
        throw new Error('Invalid calendar ID');
      }

      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'Not connected to Google Calendar' };
      }

      const event = {
        summary: eventData.title || 'Merkaba Event',
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: eventData.timeZone || 'America/New_York',
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: eventData.timeZone || 'America/New_York',
        },
        location: eventData.location || 'Merkaba Venue',
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      // For development, simulate API call
      const response = await fetch(
        `${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('Google Calendar API error:', errorMessage);
        return {
          success: false,
          error: errorMessage,
          message: `Failed to create event in Google Calendar: ${errorMessage}. Please check your calendar connection.`,
        };
      }

      const createdEvent = await response.json();
      return {
        success: true,
        eventId: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        message: 'Event created successfully in Google Calendar',
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to create event in Google Calendar: ${error.message}. Please check your calendar connection and try again.`,
      };
    }
  }

  /**
   * Update event in Google Calendar
   */
  async updateEvent(eventId, eventData, calendarId = VENUE_CALENDAR_ID) {
    try {
      // Validate inputs
      if (!eventId || typeof eventId !== 'string') {
        throw new Error('Invalid event ID');
      }
      if (!eventData || typeof eventData !== 'object') {
        throw new Error('Invalid event data');
      }
      if (!calendarId || typeof calendarId !== 'string') {
        throw new Error('Invalid calendar ID');
      }

      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'Not connected to Google Calendar' };
      }

      // Similar to createEvent but with PUT/PATCH
      return { success: true, message: 'Event updated (mock)' };
    } catch (error) {
      console.error('Error updating event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(eventId, calendarId = VENUE_CALENDAR_ID) {
    try {
      // Validate inputs
      if (!eventId || typeof eventId !== 'string') {
        throw new Error('Invalid event ID');
      }
      if (!calendarId || typeof calendarId !== 'string') {
        throw new Error('Invalid calendar ID');
      }

      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, error: 'Not connected to Google Calendar' };
      }

      // Mock delete
      return { success: true, message: 'Event deleted (mock)' };
    } catch (error) {
      console.error('Error deleting event:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get calendar list
   */
  async getCalendarList() {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        return { success: false, calendars: [] };
      }

      // Mock calendar list
      return {
        success: true,
        calendars: [
          {
            id: VENUE_CALENDAR_ID,
            summary: 'Merkaba Master Schedule',
            primary: true,
          },
          {
            id: 'primary',
            summary: 'My Calendar',
            primary: false,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting calendar list:', error);
      return { success: false, calendars: [] };
    }
  }
}

export default new GoogleCalendarService();

