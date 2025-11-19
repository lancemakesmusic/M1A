/**
 * Comprehensive Backend Connectivity Check
 * Tests backend health, endpoints, and configuration
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Read .env file
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
console.log('🔌 BACKEND CONNECTIVITY CHECK');
console.log('='.repeat(60) + '\n');

// Test URLs to try
const testUrls = [
  API_BASE_URL,
  'http://localhost:8001',
  'http://localhost:5000',
  'http://127.0.0.1:8001',
  'http://192.168.1.111:5000',
  'http://192.168.1.111:8001',
  'http://172.20.10.3:8001',
];

// Test a single URL
function testUrl(url, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const req = client.get(`${url}/api/payments/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({
              success: true,
              url,
              status: res.statusCode,
              data: json,
            });
          } catch (e) {
            resolve({
              success: true,
              url,
              status: res.statusCode,
              data: data,
              parseError: true,
            });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({
          success: false,
          url,
          error: error.message,
        });
      });
      
      req.setTimeout(timeout, () => {
        req.destroy();
        resolve({
          success: false,
          url,
          error: 'Timeout',
        });
      });
    } catch (error) {
      resolve({
        success: false,
        url,
        error: error.message,
      });
    }
  });
}

// Test root endpoint
function testRootEndpoint(baseUrl) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(baseUrl);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const req = client.get(`${baseUrl}/`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            success: res.statusCode === 200,
            status: res.statusCode,
            data: data,
          });
        });
      });
      
      req.on('error', () => resolve({ success: false }));
      req.setTimeout(3000, () => {
        req.destroy();
        resolve({ success: false, error: 'Timeout' });
      });
    } catch {
      resolve({ success: false });
    }
  });
}

// Main test function
async function runBackendCheck() {
  console.log('📍 Configured Backend URL:', API_BASE_URL);
  console.log('🔍 Testing multiple endpoints...\n');

  const results = [];
  
  // Test all URLs
  for (const url of testUrls) {
    process.stdout.write(`Testing ${url}... `);
    const result = await testUrl(url);
    results.push(result);
    
    if (result.success) {
      console.log('✅ CONNECTED');
      if (result.data && typeof result.data === 'object') {
        console.log(`   Status: ${result.data.status || 'unknown'}`);
        console.log(`   Stripe Configured: ${result.data.stripe_configured ? 'Yes ✅' : 'No ❌'}`);
      }
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  // Find working backend
  const workingBackend = results.find(r => r.success);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60) + '\n');

  if (workingBackend) {
    console.log('✅ BACKEND FOUND!');
    console.log(`   URL: ${workingBackend.url}`);
    console.log(`   Status Code: ${workingBackend.status}`);
    
    if (workingBackend.data && typeof workingBackend.data === 'object') {
      console.log(`   Health Status: ${workingBackend.data.status || 'unknown'}`);
      console.log(`   Stripe Configured: ${workingBackend.data.stripe_configured ? 'Yes ✅' : 'No ❌'}`);
      
      if (!workingBackend.data.stripe_configured) {
        console.log('\n⚠️  WARNING: Backend Stripe not configured');
        console.log('   Set STRIPE_SECRET_KEY in backend environment');
      }
    }

    // Test additional endpoints
    console.log('\n🔍 Testing Additional Endpoints...\n');
    
    // Test root
    process.stdout.write('Testing root endpoint (/)... ');
    const rootTest = await testRootEndpoint(workingBackend.url);
    if (rootTest.success) {
      console.log('✅ OK');
    } else {
      console.log('❌ Not reachable');
    }

    // Test service booking endpoint
    process.stdout.write('Testing service booking endpoint... ');
    try {
      const urlObj = new URL(workingBackend.url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const testReq = client.request(`${workingBackend.url}/api/service-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        if (res.statusCode === 405 || res.statusCode === 422 || res.statusCode === 400) {
          console.log('✅ Endpoint exists (method validation working)');
        } else if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ Endpoint working');
        } else {
          console.log(`⚠️  Status: ${res.statusCode}`);
        }
      });
      
      testReq.on('error', () => console.log('❌ Not reachable'));
      testReq.write(JSON.stringify({ test: true }));
      testReq.end();
    } catch {
      console.log('❌ Error testing');
    }

    // Recommendation
    if (workingBackend.url !== API_BASE_URL) {
      console.log('\n💡 RECOMMENDATION:');
      console.log(`   Update EXPO_PUBLIC_API_BASE_URL in .env to:`);
      console.log(`   EXPO_PUBLIC_API_BASE_URL=${workingBackend.url}`);
    }

  } else {
    console.log('❌ NO BACKEND FOUND');
    console.log('\nTried the following URLs:');
    testUrls.forEach(url => console.log(`   • ${url}`));
    
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('   1. Make sure backend server is running');
    console.log('   2. Check if backend is on a different port');
    console.log('   3. Verify firewall/network settings');
    console.log('   4. Check backend logs for errors');
    console.log('\n📝 To start backend:');
    console.log('   cd autoposter-backend');
    console.log('   python start_backend.py');
    console.log('   OR');
    console.log('   python api/main.py');
  }

  console.log('\n' + '='.repeat(60) + '\n');
  
  return { success: !!workingBackend, workingBackend };
}

// Run check
runBackendCheck().then(result => {
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

