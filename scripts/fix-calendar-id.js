/**
 * Fix Google Calendar ID Format
 * Extracts calendar ID from full URL if needed
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let updated = false;

const newLines = lines.map(line => {
  if (line.includes('EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=')) {
    const match = line.match(/EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=(.+)/);
    if (match) {
      let calendarId = match[1].trim().replace(/^["']|["']$/g, '');
      
      // If it's a full URL, extract the calendar ID
      if (calendarId.includes('calendar.google.com') && calendarId.includes('cid=')) {
        const cidMatch = calendarId.match(/cid=([^&]+)/);
        if (cidMatch) {
          // Decode the base64-like ID
          const encodedId = cidMatch[1];
          try {
            // Try to decode (it's URL-safe base64)
            const decoded = Buffer.from(encodedId.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();
            // Extract email-like ID from decoded string
            const emailMatch = decoded.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+)/);
            if (emailMatch) {
              calendarId = emailMatch[1];
              console.log('✅ Extracted Calendar ID from URL');
            } else {
              // If decoding doesn't work, use the encoded ID with @group.calendar.google.com
              calendarId = encodedId + '@group.calendar.google.com';
              console.log('⚠️  Using encoded ID format');
            }
          } catch (e) {
            // If decoding fails, construct from the encoded ID
            calendarId = encodedId + '@group.calendar.google.com';
            console.log('⚠️  Using encoded ID format (decoding failed)');
          }
        }
      }
      
      // Validate format
      if (!calendarId.includes('@') && !calendarId.includes('group.calendar.google.com')) {
        console.log('⚠️  Calendar ID format may still be invalid');
        console.log('   Expected format: xxx@group.calendar.google.com');
        console.log('   Current value:', calendarId.substring(0, 50) + '...');
      }
      
      updated = true;
      return `EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=${calendarId}`;
    }
  }
  return line;
});

if (updated) {
  fs.writeFileSync(envPath, newLines.join('\n'));
  console.log('\n✅ .env file updated with corrected Calendar ID');
  console.log('   Please verify the Calendar ID is correct');
  console.log('   Run: node scripts/verify-env.js\n');
} else {
  console.log('ℹ️  No Calendar ID found to fix');
}

