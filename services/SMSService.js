/**
 * SMS Service for sending text messages with QR codes
 * Uses backend API to send SMS via Twilio or similar service
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001';

class SMSService {
  /**
   * Send RSVP confirmation SMS with QR code
   * @param {string} phoneNumber - Phone number to send SMS to (E.164 format)
   * @param {string} eventName - Name of the event
   * @param {string} ticketId - Unique ticket ID for QR code
   * @param {string} qrCodeUrl - URL or data for QR code
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  static async sendRSVPConfirmation(phoneNumber, eventName, ticketId, qrCodeUrl) {
    try {
      const idToken = await this.getIdToken();
      if (!idToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/sms/send-rsvp-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          phoneNumber,
          eventName,
          ticketId,
          qrCodeUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send SMS');
      }

      return {
        success: true,
        message: data.message || 'SMS sent successfully',
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS',
      };
    }
  }

  /**
   * Get Firebase Auth ID token
   * @returns {Promise<string|null>}
   */
  static async getIdToken() {
    try {
      const { auth } = await import('../firebase');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  }
}

export default SMSService;









