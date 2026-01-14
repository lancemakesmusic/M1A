/**
 * Email Service
 * Handles email notifications for bookings, payments, and other important events
 * 
 * Note: This service requires a backend API endpoint to actually send emails.
 * The backend should use a service like SendGrid, AWS SES, or Nodemailer.
 * 
 * For production, set up Firebase Cloud Functions or a backend API endpoint
 * at EXPO_PUBLIC_API_BASE_URL/api/send-email
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

/**
 * Send email notification
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML email body
 * @param {string} [emailData.text] - Plain text email body (optional)
 * @param {string} [emailData.from] - Sender email (optional, defaults to noreply@merkabaent.com)
 * @returns {Promise<boolean>} - Success status
 */
export const sendEmail = async (emailData) => {
  try {
    if (!emailData || !emailData.to || !emailData.subject || !emailData.html) {
      throw new Error('Missing required email fields: to, subject, html');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailData.to)) {
      throw new Error('Invalid email address format');
    }

    // If no API base URL is configured, log and return false
    if (!API_BASE_URL) {
      console.warn('⚠️ Email service not configured: EXPO_PUBLIC_API_BASE_URL not set');
      console.log('📧 Would send email:', {
        to: emailData.to,
        subject: emailData.subject,
        from: emailData.from || 'noreply@merkabaent.com',
      });
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        from: emailData.from || 'noreply@merkabaent.com',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Email API error: ${errorText || response.statusText}`);
    }

    console.log('✅ Email sent successfully to:', emailData.to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
};

/**
 * Send booking confirmation email
 * @param {Object} bookingData - Booking data
 * @param {string} bookingData.userEmail - User email address
 * @param {string} bookingData.userName - User display name
 * @param {string} bookingData.orderId - Order ID
 * @param {string} bookingData.serviceName - Service or event name
 * @param {number} bookingData.amount - Total amount paid
 * @param {string} bookingData.paymentMethod - Payment method (stripe, wallet, etc.)
 * @param {Date} [bookingData.date] - Booking date (optional)
 * @param {string} [bookingData.location] - Booking location (optional)
 * @returns {Promise<boolean>} - Success status
 */
export const sendBookingConfirmationEmail = async (bookingData) => {
  try {
    if (!bookingData || !bookingData.userEmail || !bookingData.orderId) {
      throw new Error('Missing required booking data: userEmail, orderId');
    }

    const {
      userEmail,
      userName = 'Valued Customer',
      orderId,
      serviceName = 'Service',
      amount = 0,
      paymentMethod = 'wallet',
      date = null,
      location = null,
    } = bookingData;

    const formattedDate = date 
      ? new Date(date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'TBD';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Booking Confirmed! ✅</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${userName},</p>
            <p style="font-size: 16px;">Thank you for your booking! Your order has been confirmed.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">Booking Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Order ID:</td>
                  <td style="padding: 8px 0;">${orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Service/Event:</td>
                  <td style="padding: 8px 0;">${serviceName}</td>
                </tr>
                ${date ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Date & Time:</td>
                  <td style="padding: 8px 0;">${formattedDate}</td>
                </tr>
                ` : ''}
                ${location ? `
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                  <td style="padding: 8px 0;">${location}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Amount Paid:</td>
                  <td style="padding: 8px 0; color: #667eea; font-size: 18px; font-weight: bold;">$${amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Payment Method:</td>
                  <td style="padding: 8px 0;">${paymentMethod === 'stripe' ? 'Credit/Debit Card' : paymentMethod === 'wallet' ? 'Wallet Balance' : paymentMethod}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 16px;">You can view your booking details in the M1A app under "Orders" or "My Bookings".</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 14px; color: #666;">If you have any questions, please contact us at support@merkabaent.com</p>
            </div>
            
            <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="font-size: 12px; color: #999;">This is an automated confirmation email. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await sendEmail({
      to: userEmail,
      subject: `Booking Confirmation - Order #${orderId}`,
      html,
    });
  } catch (error) {
    console.error('❌ Failed to send booking confirmation email:', error);
    return false;
  }
};

/**
 * Send payment confirmation email
 * @param {Object} paymentData - Payment data
 * @param {string} paymentData.userEmail - User email address
 * @param {string} paymentData.userName - User display name
 * @param {string} paymentData.transactionId - Transaction ID
 * @param {number} paymentData.amount - Amount paid
 * @param {string} paymentData.description - Payment description
 * @returns {Promise<boolean>} - Success status
 */
export const sendPaymentConfirmationEmail = async (paymentData) => {
  try {
    if (!paymentData || !paymentData.userEmail || !paymentData.transactionId) {
      throw new Error('Missing required payment data: userEmail, transactionId');
    }

    const {
      userEmail,
      userName = 'Valued Customer',
      transactionId,
      amount = 0,
      description = 'Payment',
    } = paymentData;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Payment Confirmed! 💳</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${userName},</p>
            <p style="font-size: 16px;">Your payment has been processed successfully.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h2 style="margin-top: 0; color: #667eea;">Payment Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Transaction ID:</td>
                  <td style="padding: 8px 0;">${transactionId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Description:</td>
                  <td style="padding: 8px 0;">${description}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                  <td style="padding: 8px 0; color: #667eea; font-size: 18px; font-weight: bold;">$${amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                  <td style="padding: 8px 0;">${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 16px;">You can view your transaction history in the M1A app under "Wallet" or "Transactions".</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 14px; color: #666;">If you have any questions, please contact us at support@merkabaent.com</p>
            </div>
            
            <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="font-size: 12px; color: #999;">This is an automated confirmation email. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return await sendEmail({
      to: userEmail,
      subject: `Payment Confirmation - Transaction #${transactionId}`,
      html,
    });
  } catch (error) {
    console.error('❌ Failed to send payment confirmation email:', error);
    return false;
  }
};

export default {
  sendEmail,
  sendBookingConfirmationEmail,
  sendPaymentConfirmationEmail,
};
