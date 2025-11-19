/**
 * Interactive Google Calendar Setup Helper
 * Guides you through the setup process
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

console.log('\n' + '='.repeat(60));
console.log('📅 GOOGLE CALENDAR SETUP HELPER');
console.log('='.repeat(60) + '\n');

console.log('This script will help you set up Google Calendar integration.\n');
console.log('You will need:');
console.log('  1. A Google account');
console.log('  2. Access to Google Cloud Console');
console.log('  3. About 10-15 minutes\n');

async function setup() {
  try {
    // Step 1: Check if .env exists
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    console.log('Step 1: Google Cloud Console Setup\n');
    console.log('Please complete these steps in Google Cloud Console:');
    console.log('  1. Go to: https://console.cloud.google.com');
    console.log('  2. Create a new project (or select existing)');
    console.log('  3. Enable Google Calendar API');
    console.log('  4. Configure OAuth consent screen');
    console.log('  5. Create OAuth 2.0 credentials\n');
    
    const proceed1 = await question('Have you completed the Google Cloud Console setup? (y/n): ');
    if (proceed1.toLowerCase() !== 'y') {
      console.log('\n📖 Please follow the guide in GOOGLE_CALENDAR_SETUP.md');
      console.log('   Then run this script again.\n');
      rl.close();
      return;
    }

    // Step 2: Get Client ID
    console.log('\nStep 2: OAuth Client ID\n');
    console.log('In Google Cloud Console:');
    console.log('  → APIs & Services → Credentials');
    console.log('  → Find your OAuth 2.0 Client ID\n');
    
    const clientId = await question('Enter your Google Client ID (ends with .apps.googleusercontent.com): ');
    
    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      console.log('❌ Invalid Client ID format');
      rl.close();
      return;
    }

    // Step 3: Get Calendar ID
    console.log('\nStep 3: Calendar ID\n');
    console.log('In Google Calendar:');
    console.log('  → Create a new calendar (or use existing)');
    console.log('  → Calendar Settings → Integrate calendar');
    console.log('  → Copy the Calendar ID\n');
    
    const calendarId = await question('Enter your Calendar ID (looks like: xxx@group.calendar.google.com): ');
    
    if (!calendarId || (!calendarId.includes('@') && !calendarId.includes('group.calendar.google.com'))) {
      console.log('⚠️  Calendar ID format may be invalid, but continuing...');
    }

    // Step 4: Update .env file
    console.log('\nStep 4: Updating .env file...\n');
    
    // Remove existing Google Calendar variables if present
    const lines = envContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('EXPO_PUBLIC_GOOGLE_CLIENT_ID') &&
             !trimmed.startsWith('EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID');
    });

    // Add new variables
    const newLines = [
      ...filteredLines,
      '',
      '# Google Calendar Configuration',
      `EXPO_PUBLIC_GOOGLE_CLIENT_ID=${clientId.trim()}`,
      `EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=${calendarId.trim()}`,
    ];

    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('✅ .env file updated!\n');

    // Step 5: Verify
    console.log('Step 5: Verification\n');
    console.log('Verifying environment variables...\n');
    
    // Quick check
    const verifyContent = fs.readFileSync(envPath, 'utf8');
    const hasClientId = verifyContent.includes('EXPO_PUBLIC_GOOGLE_CLIENT_ID=');
    const hasCalendarId = verifyContent.includes('EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=');

    if (hasClientId && hasCalendarId) {
      console.log('✅ Google Calendar variables added successfully!\n');
      console.log('Next steps:');
      console.log('  1. Restart your Expo app to load new variables');
      console.log('  2. Run: node scripts/verify-env.js');
      console.log('  3. Test calendar connection in the app\n');
    } else {
      console.log('⚠️  Variables may not have been added correctly');
      console.log('   Please check your .env file manually\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

setup();

