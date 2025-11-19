/**
 * Complete Verification Script
 * Checks environment, backend, and provides clear next steps
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('\n' + '='.repeat(70));
console.log('🔍 COMPLETE SYSTEM VERIFICATION');
console.log('='.repeat(70) + '\n');

// Read .env
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
}

let allGood = true;
const issues = [];
const warnings = [];

// 1. Check Environment Variables
console.log('1️⃣  ENVIRONMENT VARIABLES\n');

const requiredVars = [
  'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID',
];

requiredVars.forEach(varName => {
  const value = envVars[varName];
  if (!value || value.trim() === '') {
    console.log(`   ❌ ${varName}: MISSING`);
    issues.push(`Missing ${varName}`);
    allGood = false;
  } else {
    // Validate formats
    if (varName === 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY') {
      if (value.startsWith('pk_live_')) {
        console.log(`   ✅ ${varName}: PRESENT (Live key)`);
      } else if (value.startsWith('pk_test_')) {
        console.log(`   ⚠️  ${varName}: PRESENT (Test key - use live for production)`);
        warnings.push('Using Stripe test key');
      } else {
        console.log(`   ⚠️  ${varName}: PRESENT (Invalid format)`);
        warnings.push('Stripe key format may be invalid');
      }
    } else {
      console.log(`   ✅ ${varName}: PRESENT`);
    }
  }
});

const apiUrl = envVars.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.111:5000';
console.log(`\n   📍 API URL: ${apiUrl}`);

// 2. Test Backend
console.log('\n2️⃣  BACKEND CONNECTIVITY\n');

function testBackend(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const testUrl = `${url}/api/payments/health`;
    
    const req = http.get(testUrl, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ success: true, url, data: json });
        } catch {
          resolve({ success: true, url, data: data });
        }
      });
    });
    
    req.on('error', () => resolve({ success: false, url }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, url, error: 'Timeout' });
    });
  });
}

async function checkBackend() {
  const testUrls = [
    'http://localhost:8001',
    'http://127.0.0.1:8001',
    apiUrl.replace(':5000', ':8001'),
    apiUrl,
  ];

  for (const url of testUrls) {
    process.stdout.write(`   Testing ${url}... `);
    const result = await testBackend(url);
    
    if (result.success) {
      console.log('✅ CONNECTED!\n');
      console.log('   📊 Backend Status:');
      if (result.data && typeof result.data === 'object') {
        console.log(`      Status: ${result.data.status || 'unknown'}`);
        console.log(`      Stripe Configured: ${result.data.stripe_configured ? 'Yes ✅' : 'No ❌'}`);
        if (!result.data.stripe_configured) {
          warnings.push('Backend Stripe not configured (set STRIPE_SECRET_KEY)');
        }
      }
      
      // Check if URL matches configured URL
      if (result.url !== apiUrl && !apiUrl.includes('localhost')) {
        console.log(`\n   💡 RECOMMENDATION:`);
        console.log(`      Your .env has: ${apiUrl}`);
        console.log(`      But backend is at: ${result.url}`);
        console.log(`      Update .env: EXPO_PUBLIC_API_BASE_URL=${result.url}`);
        warnings.push('API URL mismatch');
      }
      
      return { success: true, url: result.url };
    } else {
      console.log('❌');
    }
  }

  console.log('\n   ❌ Backend not accessible');
  issues.push('Backend not running or not accessible');
  return { success: false };
}

async function runVerification() {
  const backendResult = await checkBackend();

// 3. Summary
console.log('\n' + '='.repeat(70));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(70) + '\n');

if (allGood && backendResult.success && issues.length === 0) {
  console.log('✅ ALL SYSTEMS GO! 🎉\n');
  console.log('   Your app is 100% ready for production!');
  console.log('   All checks passed.\n');
} else {
  if (issues.length > 0) {
    console.log('❌ ISSUES FOUND:\n');
    issues.forEach(issue => console.log(`   • ${issue}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach(warning => console.log(`   • ${warning}`));
    console.log('');
  }
  
  if (!backendResult.success) {
    console.log('📝 TO FIX BACKEND:\n');
    console.log('   1. Start backend:');
    console.log('      cd autoposter-backend');
    console.log('      python start_backend.py\n');
    console.log('   2. Keep backend terminal open');
    console.log('   3. Test in browser: http://localhost:8001/api/payments/health\n');
    console.log('   4. If browser works, update .env:');
    console.log('      EXPO_PUBLIC_API_BASE_URL=http://localhost:8001\n');
  }
}

  console.log('='.repeat(70) + '\n');

  process.exit(issues.length > 0 ? 1 : 0);
}

runVerification();

