/**
 * Simple Environment Variable Verification
 * Run with: node scripts/verify-env.js
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const REQUIRED_VARS = {
  frontend: [
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID',
  ],
  optional: [
    'EXPO_PUBLIC_API_BASE_URL',
  ],
};

console.log('\n' + '='.repeat(60));
console.log('🔍 ENVIRONMENT VARIABLES VERIFICATION');
console.log('='.repeat(60) + '\n');

// Try to read .env file
const envPath = path.join(__dirname, '..', '.env');
let envVars = {};

if (fs.existsSync(envPath)) {
  console.log('📄 Reading .env file...\n');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Parse .env file
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
      envVars[key.trim()] = value.trim();
    }
  });
} else {
  console.log('⚠️  .env file not found at:', envPath);
  console.log('   Checking process.env instead...\n');
  envVars = process.env;
}

// Check each variable
const results = {
  present: [],
  missing: [],
  warnings: [],
};

REQUIRED_VARS.frontend.forEach(varName => {
  const value = envVars[varName];
  
  if (!value || value.trim() === '') {
    results.missing.push(varName);
    console.log(`❌ ${varName}: MISSING`);
  } else {
    // Validate format
    let isValid = true;
    let warning = null;
    
    if (varName === 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY') {
      if (!value.startsWith('pk_')) {
        isValid = false;
        warning = "Should start with 'pk_'";
      } else if (value.startsWith('pk_test_')) {
        warning = "Using TEST key (use 'pk_live_' for production)";
      }
    } else if (varName === 'EXPO_PUBLIC_GOOGLE_CLIENT_ID') {
      if (!value.includes('.apps.googleusercontent.com')) {
        warning = "May not be a valid Google Client ID";
      }
    } else if (varName === 'EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID') {
      if (!value.includes('@') && !value.includes('group.calendar.google.com')) {
        warning = "May not be a valid Calendar ID";
      }
    }
    
    if (warning) {
      results.warnings.push({ var: varName, message: warning });
      console.log(`⚠️  ${varName}: PRESENT (${warning})`);
      console.log(`   Value: ${value.substring(0, 30)}...`);
    } else {
      results.present.push(varName);
      console.log(`✅ ${varName}: PRESENT`);
      console.log(`   Value: ${value.substring(0, 30)}...`);
    }
  }
});

// Check optional variables
console.log('\n📋 Optional Variables:');
REQUIRED_VARS.optional.forEach(varName => {
  const value = envVars[varName];
  if (value) {
    console.log(`✅ ${varName}: PRESENT`);
    console.log(`   Value: ${value}`);
  } else {
    console.log(`ℹ️  ${varName}: Not set (will use default)`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

if (results.missing.length === 0 && results.warnings.length === 0) {
  console.log('\n✅ ALL REQUIRED VARIABLES PRESENT AND VALID!');
  console.log('   Your .env file is properly configured.\n');
  process.exit(0);
} else {
  if (results.missing.length > 0) {
    console.log(`\n❌ ${results.missing.length} MISSING VARIABLE(S):`);
    results.missing.forEach(v => console.log(`   • ${v}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  ${results.warnings.length} WARNING(S):`);
    results.warnings.forEach(w => console.log(`   • ${w.var}: ${w.message}`));
  }
  
  console.log('\n📝 Please fix the issues above and run this script again.\n');
  process.exit(1);
}

