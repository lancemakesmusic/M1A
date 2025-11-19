/**
 * Simple Backend Test
 * Tests if backend is accessible
 */

const http = require('http');

const testUrls = [
  'http://localhost:8001/api/payments/health',
  'http://127.0.0.1:8001/api/payments/health',
];

console.log('\n🔍 Testing Backend Connectivity...\n');

function testUrl(url) {
  return new Promise((resolve) => {
    process.stdout.write(`Testing ${url}... `);
    
    const req = http.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('✅ CONNECTED!\n');
          console.log('📊 Backend Status:');
          console.log(`   Status: ${json.status || 'unknown'}`);
          console.log(`   Stripe Configured: ${json.stripe_configured ? 'Yes ✅' : 'No ❌'}`);
          if (!json.stripe_configured) {
            console.log('\n⚠️  Backend Stripe not configured');
            console.log('   Set STRIPE_SECRET_KEY in backend environment\n');
          }
          resolve({ success: true, url, data: json });
        } catch {
          console.log('✅ Connected (non-JSON response)');
          resolve({ success: true, url });
        }
      });
    });
    
    req.on('error', () => {
      console.log('❌');
      resolve({ success: false, url });
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('⏱️  Timeout');
      resolve({ success: false, url, error: 'Timeout' });
    });
  });
}

async function runTests() {
  for (const url of testUrls) {
    const result = await testUrl(url);
    if (result.success) {
      process.exit(0);
    }
    // Wait before next test
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n❌ Backend not accessible on localhost:8001');
  console.log('\n💡 Make sure:');
  console.log('   1. Backend is running (python start_backend.py)');
  console.log('   2. Backend is on port 8001');
  console.log('   3. No firewall blocking the connection');
  console.log('   4. Check backend terminal for errors\n');
  process.exit(1);
}

runTests();

