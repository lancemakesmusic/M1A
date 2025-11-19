/**
 * Backend Startup Helper
 * Helps start the backend server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n' + '='.repeat(60));
console.log('🚀 BACKEND STARTUP HELPER');
console.log('='.repeat(60) + '\n');

const backendDir = path.join(__dirname, '..', 'autoposter-backend');

if (!fs.existsSync(backendDir)) {
  console.log('❌ Backend directory not found:', backendDir);
  process.exit(1);
}

// Check for Python
function checkPython() {
  return new Promise((resolve) => {
    const python = spawn('python', ['--version']);
    python.on('close', (code) => {
      if (code === 0) {
        resolve('python');
      } else {
        const python3 = spawn('python3', ['--version']);
        python3.on('close', (code3) => {
          if (code3 === 0) {
            resolve('python3');
          } else {
            resolve(null);
          }
        });
      }
    });
  });
}

// Find backend start script
function findBackendScript() {
  const scripts = [
    'start_backend.py',
    'api/main.py',
    'simple_server.py',
    'simple_api.py',
  ];

  for (const script of scripts) {
    const scriptPath = path.join(backendDir, script);
    if (fs.existsSync(scriptPath)) {
      return script;
    }
  }
  return null;
}

async function startBackend() {
  const pythonCmd = await checkPython();
  
  if (!pythonCmd) {
    console.log('❌ Python not found');
    console.log('   Please install Python 3.7+ to run the backend');
    process.exit(1);
  }

  console.log(`✅ Found Python: ${pythonCmd}\n`);

  const script = findBackendScript();
  
  if (!script) {
    console.log('❌ No backend start script found');
    console.log('   Expected one of: start_backend.py, api/main.py, simple_server.py');
    process.exit(1);
  }

  console.log(`✅ Found backend script: ${script}\n`);
  console.log('🚀 Starting backend server...\n');
  console.log('   Press Ctrl+C to stop the server\n');
  console.log('='.repeat(60) + '\n');

  const scriptPath = path.join(backendDir, script);
  const backend = spawn(pythonCmd, [scriptPath], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
  });

  backend.on('error', (error) => {
    console.error('❌ Error starting backend:', error.message);
    process.exit(1);
  });

  backend.on('close', (code) => {
    if (code !== 0) {
      console.log(`\n⚠️  Backend exited with code ${code}`);
    }
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping backend...');
    backend.kill();
    process.exit(0);
  });
}

startBackend();

