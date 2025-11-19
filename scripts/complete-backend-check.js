/**
 * Complete Backend Setup and Connectivity Check
 * Guides through starting backend and verifying connectivity
 */

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

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

const configuredUrl = envVars.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.111:5000';

console.log('\n' + '='.repeat(60));
console.log('🔌 COMPLETE BACKEND SETUP & CONNECTIVITY CHECK');
console.log('='.repeat(60) + '\n');

// Test backend URL
function testBackend(url, timeout = 3000) {
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
            resolve({ success: true, url, data: json });
          } catch {
            resolve({ success: true, url, data: data });
          }
        });
      });
      
      req.on('error', () => resolve({ success: false, url }));
      req.setTimeout(timeout, () => {
        req.destroy();
        resolve({ success: false, url, error: 'Timeout' });
      });
    } catch {
      resolve({ success: false, url });
    }
  });
}

async function checkBackend() {
  console.log('🔍 Checking if backend is already running...\n');
  
  const testUrls = [
    configuredUrl,
    'http://localhost:8001',
    'http://localhost:5000',
    'http://127.0.0.1:8001',
    'http://192.168.1.111:8001',
    'http://192.168.1.111:5000',
  ];

  for (const url of testUrls) {
    process.stdout.write(`Testing ${url}... `);
    const result = await testBackend(url, 2000);
    if (result.success) {
      console.log('✅ CONNECTED!\n');
      console.log('📊 Backend Status:');
      console.log(`   URL: ${result.url}`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   Status: ${result.data.status || 'unknown'}`);
        console.log(`   Stripe Configured: ${result.data.stripe_configured ? 'Yes ✅' : 'No ❌'}`);
      }
      
      // Check if URL matches configured URL
      if (result.url !== configuredUrl) {
        console.log('\n💡 RECOMMENDATION:');
        console.log(`   Your .env has: ${configuredUrl}`);
        console.log(`   But backend is at: ${result.url}`);
        console.log(`   Update .env to: EXPO_PUBLIC_API_BASE_URL=${result.url}`);
      }
      
      rl.close();
      return { success: true, url: result.url };
    } else {
      console.log('❌');
    }
  }

  return { success: false };
}

async function main() {
  const checkResult = await checkBackend();
  
  if (checkResult.success) {
    console.log('\n✅ Backend is running and accessible!\n');
    process.exit(0);
  }

  console.log('\n❌ Backend is not running\n');
  console.log('📝 To start the backend:\n');
  console.log('   1. Open a NEW terminal window');
  console.log('   2. Run: cd autoposter-backend');
  console.log('   3. Run: python start_backend.py');
  console.log('\n   OR use the helper:');
  console.log('   node scripts/start-backend.js\n');
  
  const startNow = await question('Would you like to start the backend now? (y/n): ');
  
  if (startNow.toLowerCase() === 'y') {
    console.log('\n🚀 Starting backend...\n');
    console.log('   This will open in a new process.');
    console.log('   Keep this terminal open to monitor.\n');
    
    const backendDir = path.join(__dirname, '..', 'autoposter-backend');
    const backend = spawn('python', ['start_backend.py'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true,
      detached: false,
    });

    backend.on('error', (error) => {
      console.error('\n❌ Error starting backend:', error.message);
      console.log('\n💡 Try manually:');
      console.log('   cd autoposter-backend');
      console.log('   python start_backend.py\n');
      rl.close();
      process.exit(1);
    });

    console.log('⏳ Waiting for backend to start (5 seconds)...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test again
    console.log('🔍 Testing backend connectivity...\n');
    const finalCheck = await checkBackend();
    
    if (finalCheck.success) {
      console.log('\n✅ SUCCESS! Backend is now running and accessible!\n');
    } else {
      console.log('\n⚠️  Backend may still be starting...');
      console.log('   Wait a few more seconds and run:');
      console.log('   node scripts/check-backend-connectivity.js\n');
    }
  } else {
    console.log('\n📖 See BACKEND_STARTUP_INSTRUCTIONS.md for manual setup\n');
  }

  rl.close();
}

main();

