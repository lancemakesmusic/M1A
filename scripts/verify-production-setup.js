/**
 * Production Setup Verification Script
 * Verifies all environment variables and service connections
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Required environment variables
const REQUIRED_VARS = {
  frontend: [
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID',
  ],
  backend: [
    'STRIPE_SECRET_KEY',
  ],
  optional: [
    'EXPO_PUBLIC_API_BASE_URL',
  ],
};

// Get API base URL
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:8001';
  }
  return 'http://172.20.10.3:8001';
};

const API_BASE_URL = getApiBaseUrl();

// Verification results
const results = {
  environment: {},
  stripe: {},
  googleCalendar: {},
  backend: {},
  overall: { status: 'unknown', issues: [], warnings: [] },
};

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...\n');
  
  const env = Constants.expoConfig?.extra || process.env || {};
  const missing = [];
  const present = [];
  const warnings = [];

  // Check frontend variables
  REQUIRED_VARS.frontend.forEach(varName => {
    const value = env[varName] || process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(`Frontend: ${varName}`);
      results.environment[varName] = { status: 'missing', value: null };
    } else {
      // Validate format
      if (varName === 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY') {
        if (!value.startsWith('pk_')) {
          warnings.push(`${varName} doesn't start with 'pk_' - may be invalid`);
          results.environment[varName] = { status: 'warning', value: value.substring(0, 20) + '...' };
        } else {
          results.environment[varName] = { status: 'ok', value: value.substring(0, 20) + '...' };
        }
      } else if (varName === 'EXPO_PUBLIC_GOOGLE_CLIENT_ID') {
        if (!value.includes('.apps.googleusercontent.com')) {
          warnings.push(`${varName} doesn't look like a valid Google Client ID`);
          results.environment[varName] = { status: 'warning', value: value.substring(0, 20) + '...' };
        } else {
          results.environment[varName] = { status: 'ok', value: value.substring(0, 20) + '...' };
        }
      } else if (varName === 'EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID') {
        if (!value.includes('@') && !value.includes('group.calendar.google.com')) {
          warnings.push(`${varName} doesn't look like a valid Calendar ID`);
          results.environment[varName] = { status: 'warning', value: value.substring(0, 20) + '...' };
        } else {
          results.environment[varName] = { status: 'ok', value: value.substring(0, 20) + '...' };
        }
      } else {
        results.environment[varName] = { status: 'ok', value: value.substring(0, 20) + '...' };
      }
      present.push(varName);
    }
  });

  // Check optional variables
  REQUIRED_VARS.optional.forEach(varName => {
    const value = env[varName] || process.env[varName];
    if (!value || value.trim() === '') {
      results.environment[varName] = { status: 'optional', value: 'Not set (using default)' };
    } else {
      results.environment[varName] = { status: 'ok', value: value };
    }
  });

  // Display results
  console.log('✅ Present Variables:');
  present.forEach(v => console.log(`   ✓ ${v}`));
  
  if (missing.length > 0) {
    console.log('\n❌ Missing Variables:');
    missing.forEach(v => console.log(`   ✗ ${v}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`   ⚠ ${w}`));
  }

  results.environment.missing = missing;
  results.environment.warnings = warnings;
  results.environment.present = present;

  return missing.length === 0;
}

// Test Stripe configuration
async function testStripe() {
  console.log('\n💳 Testing Stripe Configuration...\n');
  
  const stripeKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
                    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!stripeKey) {
    console.log('❌ Stripe Publishable Key not found');
    results.stripe = { status: 'error', message: 'Key not configured' };
    return false;
  }

  // Check key format
  if (!stripeKey.startsWith('pk_')) {
    console.log('❌ Invalid Stripe key format (should start with pk_)');
    results.stripe = { status: 'error', message: 'Invalid key format' };
    return false;
  }

  // Check if it's test or live key
  const isTest = stripeKey.startsWith('pk_test_');
  const isLive = stripeKey.startsWith('pk_live_');
  
  if (isTest) {
    console.log('⚠️  Using Stripe TEST key (pk_test_)');
    console.log('   For production, use LIVE key (pk_live_)');
    results.stripe = { status: 'warning', message: 'Using test key', keyType: 'test' };
  } else if (isLive) {
    console.log('✅ Using Stripe LIVE key (pk_live_)');
    results.stripe = { status: 'ok', message: 'Live key configured', keyType: 'live' };
  } else {
    console.log('❌ Unknown Stripe key format');
    results.stripe = { status: 'error', message: 'Unknown key format' };
    return false;
  }

  // Test backend Stripe configuration
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.stripe_configured) {
        console.log('✅ Backend Stripe configured');
        results.stripe.backend = { status: 'ok', configured: true };
      } else {
        console.log('❌ Backend Stripe NOT configured');
        results.stripe.backend = { status: 'error', configured: false };
        return false;
      }
    } else {
      console.log('⚠️  Could not verify backend Stripe (backend may be offline)');
      results.stripe.backend = { status: 'warning', message: 'Backend unreachable' };
    }
  } catch (error) {
    console.log('⚠️  Could not connect to backend:', error.message);
    results.stripe.backend = { status: 'warning', message: error.message };
  }

  return true;
}

// Test Google Calendar configuration
async function testGoogleCalendar() {
  console.log('\n📅 Testing Google Calendar Configuration...\n');
  
  const clientId = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 
                   process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const calendarId = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID || 
                     process.env.EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID;

  if (!clientId) {
    console.log('❌ Google Client ID not found');
    results.googleCalendar = { status: 'error', message: 'Client ID not configured' };
    return false;
  }

  if (!calendarId) {
    console.log('❌ Google Calendar ID not found');
    results.googleCalendar = { status: 'error', message: 'Calendar ID not configured' };
    return false;
  }

  // Validate formats
  if (!clientId.includes('.apps.googleusercontent.com')) {
    console.log('⚠️  Google Client ID format may be invalid');
    results.googleCalendar = { status: 'warning', message: 'Client ID format check failed' };
  } else {
    console.log('✅ Google Client ID format looks valid');
    results.googleCalendar.clientId = { status: 'ok' };
  }

  if (!calendarId.includes('@') && !calendarId.includes('group.calendar.google.com')) {
    console.log('⚠️  Google Calendar ID format may be invalid');
    results.googleCalendar = { status: 'warning', message: 'Calendar ID format check failed' };
  } else {
    console.log('✅ Google Calendar ID format looks valid');
    results.googleCalendar.calendarId = { status: 'ok' };
  }

  // Note: Actual OAuth connection test requires user interaction
  console.log('ℹ️  Note: OAuth connection requires user interaction in app');
  console.log('   Test calendar connection in the app settings');

  results.googleCalendar.status = 'ok';
  return true;
}

// Test backend connectivity
async function testBackend() {
  console.log('\n🔌 Testing Backend Connectivity...\n');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is reachable');
      console.log(`   Status: ${data.status}`);
      console.log(`   Stripe Configured: ${data.stripe_configured ? 'Yes' : 'No'}`);
      results.backend = { 
        status: 'ok', 
        reachable: true,
        stripeConfigured: data.stripe_configured,
        url: API_BASE_URL,
      };
      return true;
    } else {
      console.log(`❌ Backend returned error: ${response.status}`);
      results.backend = { status: 'error', reachable: false, statusCode: response.status };
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot reach backend at ${API_BASE_URL}`);
    console.log(`   Error: ${error.message}`);
    results.backend = { 
      status: 'error', 
      reachable: false, 
      error: error.message,
      url: API_BASE_URL,
    };
    return false;
  }
}

// Generate summary report
function generateSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const issues = [];
  const warnings = [];

  // Environment variables
  if (results.environment.missing && results.environment.missing.length > 0) {
    issues.push(`${results.environment.missing.length} missing environment variable(s)`);
  }
  if (results.environment.warnings && results.environment.warnings.length > 0) {
    warnings.push(`${results.environment.warnings.length} environment variable warning(s)`);
  }

  // Stripe
  if (results.stripe.status === 'error') {
    issues.push('Stripe configuration error');
  } else if (results.stripe.status === 'warning') {
    warnings.push('Stripe using test key (use live key for production)');
  }

  // Google Calendar
  if (results.googleCalendar.status === 'error') {
    issues.push('Google Calendar configuration error');
  } else if (results.googleCalendar.status === 'warning') {
    warnings.push('Google Calendar format warnings');
  }

  // Backend
  if (results.backend.status === 'error') {
    issues.push('Backend not reachable');
  } else if (results.backend.status === 'ok' && !results.backend.stripeConfigured) {
    issues.push('Backend Stripe not configured');
  }

  // Overall status
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ ALL CHECKS PASSED - Production Ready!');
    results.overall.status = 'ready';
  } else if (issues.length === 0) {
    console.log('⚠️  READY WITH WARNINGS');
    results.overall.status = 'ready_with_warnings';
  } else {
    console.log('❌ ISSUES FOUND - Not Production Ready');
    results.overall.status = 'not_ready';
  }

  if (issues.length > 0) {
    console.log('\n❌ Issues:');
    issues.forEach(issue => console.log(`   • ${issue}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   • ${warning}`));
  }

  results.overall.issues = issues;
  results.overall.warnings = warnings;

  console.log('\n' + '='.repeat(60));
  
  return results.overall.status === 'ready' || results.overall.status === 'ready_with_warnings';
}

// Main verification function
export async function verifyProductionSetup() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 PRODUCTION SETUP VERIFICATION');
  console.log('='.repeat(60));

  try {
    // Run all checks
    const envOk = checkEnvironmentVariables();
    await testBackend();
    await testStripe();
    await testGoogleCalendar();

    // Generate summary
    const isReady = generateSummary();

    return {
      success: isReady,
      results,
      ready: isReady,
    };
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    return {
      success: false,
      error: error.message,
      results,
    };
  }
}

// Run if called directly
if (require.main === module) {
  verifyProductionSetup().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

