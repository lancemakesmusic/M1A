/**
 * Test Actual Service Connections
 * Tests Stripe backend, Google Calendar API, etc.
 */

const https = require('https');
const http = require('http');

// Read .env file
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value.trim();
    }
  });
} else {
  envVars = process.env;
}

const API_BASE_URL = envVars.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.3:8001';

console.log('\n' + '='.repeat(60));
console.log('🔌 TESTING SERVICE CONNECTIONS');
console.log('='.repeat(60) + '\n');

// Test Backend Health
async function testBackendHealth() {
  console.log('1️⃣  Testing Backend Health...');
  
  try {
    const url = new URL(API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    return new Promise((resolve) => {
      const req = client.get(`${API_BASE_URL}/api/payments/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === 'healthy') {
              console.log('   ✅ Backend is healthy');
              console.log(`   ✅ Stripe configured: ${json.stripe_configured ? 'Yes' : 'No'}`);
              if (!json.stripe_configured) {
                console.log('   ⚠️  Backend Stripe key not set (STRIPE_SECRET_KEY)');
              }
              resolve({ success: true, stripeConfigured: json.stripe_configured });
            } else {
              console.log('   ⚠️  Backend returned unexpected status');
              resolve({ success: false });
            }
          } catch (e) {
            console.log('   ⚠️  Could not parse backend response');
            resolve({ success: false });
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`   ❌ Cannot connect to backend: ${error.message}`);
        console.log(`   📍 Backend URL: ${API_BASE_URL}`);
        console.log('   💡 Make sure backend server is running');
        resolve({ success: false, error: error.message });
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        console.log('   ❌ Backend connection timeout');
        resolve({ success: false, error: 'Timeout' });
      });
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test Stripe Key Format
function testStripeKey() {
  console.log('\n2️⃣  Testing Stripe Key Format...');
  
  const key = envVars.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!key) {
    console.log('   ❌ Stripe key not found');
    return { success: false };
  }
  
  if (key.startsWith('pk_test_')) {
    console.log('   ⚠️  Using TEST key (pk_test_)');
    console.log('   💡 Switch to LIVE key (pk_live_) for production');
    return { success: true, isTest: true };
  } else if (key.startsWith('pk_live_')) {
    console.log('   ✅ Using LIVE key (pk_live_)');
    return { success: true, isTest: false };
  } else {
    console.log('   ❌ Invalid key format (should start with pk_test_ or pk_live_)');
    return { success: false };
  }
}

// Test Google Calendar Configuration
function testGoogleCalendarConfig() {
  console.log('\n3️⃣  Testing Google Calendar Configuration...');
  
  const clientId = envVars.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const calendarId = envVars.EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID;
  
  let allOk = true;
  
  if (!clientId) {
    console.log('   ❌ Google Client ID not found');
    allOk = false;
  } else {
    if (clientId.includes('.apps.googleusercontent.com')) {
      console.log('   ✅ Google Client ID format valid');
    } else {
      console.log('   ⚠️  Google Client ID format may be invalid');
      allOk = false;
    }
  }
  
  if (!calendarId) {
    console.log('   ❌ Google Calendar ID not found');
    allOk = false;
  } else {
    if (calendarId.includes('@') || calendarId.includes('group.calendar.google.com')) {
      console.log('   ✅ Google Calendar ID format valid');
    } else {
      console.log('   ⚠️  Google Calendar ID format may be invalid');
      allOk = false;
    }
  }
  
  if (allOk) {
    console.log('   ℹ️  Note: OAuth connection requires testing in app');
  }
  
  return { success: allOk };
}

// Generate Summary
async function runTests() {
  const results = {
    backend: await testBackendHealth(),
    stripe: testStripeKey(),
    googleCalendar: testGoogleCalendarConfig(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 CONNECTION TEST SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const issues = [];
  const warnings = [];
  
  if (!results.backend.success) {
    issues.push('Backend not reachable');
  } else if (!results.backend.stripeConfigured) {
    issues.push('Backend Stripe not configured');
  }
  
  if (!results.stripe.success) {
    issues.push('Stripe key invalid');
  } else if (results.stripe.isTest) {
    warnings.push('Using Stripe test key (switch to live for production)');
  }
  
  if (!results.googleCalendar.success) {
    issues.push('Google Calendar configuration incomplete');
  }
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ ALL CONNECTIONS WORKING!');
    console.log('   Your services are properly configured.\n');
  } else {
    if (issues.length > 0) {
      console.log('❌ Issues Found:');
      issues.forEach(issue => console.log(`   • ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    console.log('\n');
  }
  
  return { success: issues.length === 0, issues, warnings };
}

// Run tests
runTests().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});

