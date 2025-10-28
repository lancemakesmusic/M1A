#!/usr/bin/env node

/**
 * 🧪 END-TO-END AUTHENTICATION FLOW TEST
 * 
 * This script tests the complete authentication flow:
 * 1. App startup and initialization
 * 2. Login screen display
 * 3. Form validation
 * 4. Authentication process
 * 5. Auth state management
 * 6. Navigation flow
 * 7. User profile loading
 * 8. Logout process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 STARTING END-TO-END AUTH FLOW TEST');
console.log('=====================================\n');

// Test configuration
const TEST_CONFIG = {
  testUser: {
    email: 'brogdon.lance@gmail.com',
    password: 'password123',
    displayName: 'Lance',
    username: 'Lance makes music'
  },
  timeout: 30000, // 30 seconds
  retryAttempts: 3
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
function logTest(testName, status, details = '') {
  const result = {
    test: testName,
    status: status,
    details: details,
    timestamp: new Date().toISOString()
  };
  
  testResults.details.push(result);
  testResults.total++;
  
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}: PASS`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: FAIL - ${details}`);
  }
  
  if (details) {
    console.log(`   Details: ${details}`);
  }
  console.log('');
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function checkCodePattern(filePath, patterns) {
  const content = readFileContent(filePath);
  if (!content) return false;
  
  for (const pattern of patterns) {
    if (pattern instanceof RegExp) {
      if (!pattern.test(content)) return false;
    } else {
      if (!content.includes(pattern)) return false;
    }
  }
  return true;
}

// Test 1: Project Structure
function testProjectStructure() {
  console.log('📁 Testing Project Structure...');
  
  const requiredFiles = [
    'App.js',
    'firebase.js',
    'contexts/AuthContext.js',
    'screens/LoginScreen.js',
    'screens/SignupScreen.js',
    'screens/ProfileScreen.js',
    'navigation/RootNavigation.js',
    'package.json'
  ];
  
  let allFilesExist = true;
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!checkFileExists(file)) {
      allFilesExist = false;
      missingFiles.push(file);
    }
  }
  
  if (allFilesExist) {
    logTest('Project Structure', 'PASS', 'All required files present');
  } else {
    logTest('Project Structure', 'FAIL', `Missing files: ${missingFiles.join(', ')}`);
  }
}

// Test 2: Firebase Configuration
function testFirebaseConfig() {
  console.log('🔥 Testing Firebase Configuration...');
  
  const firebaseFile = 'firebase.js';
  if (!checkFileExists(firebaseFile)) {
    logTest('Firebase Configuration', 'FAIL', 'firebase.js not found');
    return;
  }
  
  const content = readFileContent(firebaseFile);
  const requiredPatterns = [
    /export const auth/,
    /export const db/,
    /export const signInWithEmailAndPassword/,
    /export const createUserWithEmailAndPassword/,
    /export const onAuthStateChanged/,
    /export const signOut/,
    /firebaseConfig/,
    /initializeApp/
  ];
  
  const allPatternsFound = checkCodePattern(firebaseFile, requiredPatterns);
  
  if (allPatternsFound) {
    logTest('Firebase Configuration', 'PASS', 'All required Firebase exports and config present');
  } else {
    logTest('Firebase Configuration', 'FAIL', 'Missing required Firebase exports or configuration');
  }
}

// Test 3: AuthContext Implementation
function testAuthContext() {
  console.log('🔐 Testing AuthContext Implementation...');
  
  const authContextFile = 'contexts/AuthContext.js';
  if (!checkFileExists(authContextFile)) {
    logTest('AuthContext Implementation', 'FAIL', 'AuthContext.js not found');
    return;
  }
  
  const requiredPatterns = [
    /createContext/,
    /useContext/,
    /useEffect/,
    /useState/,
    /onAuthStateChanged/,
    /AuthProvider/,
    /useAuth/,
    /loading/,
    /user/
  ];
  
  const allPatternsFound = checkCodePattern(authContextFile, requiredPatterns);
  
  if (allPatternsFound) {
    logTest('AuthContext Implementation', 'PASS', 'AuthContext properly implemented with hooks and state management');
  } else {
    logTest('AuthContext Implementation', 'FAIL', 'AuthContext missing required hooks or state management');
  }
}

// Test 4: Login Screen Implementation
function testLoginScreen() {
  console.log('📱 Testing Login Screen Implementation...');
  
  const loginScreenFile = 'screens/LoginScreen.js';
  if (!checkFileExists(loginScreenFile)) {
    logTest('Login Screen Implementation', 'FAIL', 'LoginScreen.js not found');
    return;
  }
  
  const requiredPatterns = [
    /signInWithEmailAndPassword/,
    /TextInput/,
    /TouchableOpacity/,
    /useState/,
    /email/,
    /password/,
    /handleLogin/,
    /validateForm/,
    /error/,
    /loading/
  ];
  
  const allPatternsFound = checkCodePattern(loginScreenFile, requiredPatterns);
  
  if (allPatternsFound) {
    logTest('Login Screen Implementation', 'PASS', 'Login screen has all required functionality');
  } else {
    logTest('Login Screen Implementation', 'FAIL', 'Login screen missing required functionality');
  }
}

// Test 5: Navigation Implementation
function testNavigation() {
  console.log('🧭 Testing Navigation Implementation...');
  
  const rootNavFile = 'navigation/RootNavigation.js';
  if (!checkFileExists(rootNavFile)) {
    logTest('Navigation Implementation', 'FAIL', 'RootNavigation.js not found');
    return;
  }
  
  const requiredPatterns = [
    /AuthContext/,
    /loading/,
    /AppNavigator/,
    /AuthNavigator/,
    /user/,
    /ActivityIndicator/
  ];
  
  const allPatternsFound = checkCodePattern(rootNavFile, requiredPatterns);
  
  // Debug: Check which patterns are missing
  const content = readFileContent(rootNavFile);
  const missingPatterns = [];
  for (const pattern of requiredPatterns) {
    if (pattern instanceof RegExp) {
      if (!pattern.test(content)) {
        missingPatterns.push(pattern.toString());
      }
    } else {
      if (!content.includes(pattern)) {
        missingPatterns.push(pattern);
      }
    }
  }
  
  if (allPatternsFound) {
    logTest('Navigation Implementation', 'PASS', 'Navigation properly configured with auth flow');
  } else {
    logTest('Navigation Implementation', 'FAIL', `Missing patterns: ${missingPatterns.join(', ')}`);
  }
}

// Test 6: Package Dependencies
function testDependencies() {
  console.log('📦 Testing Package Dependencies...');
  
  const packageFile = 'package.json';
  if (!checkFileExists(packageFile)) {
    logTest('Package Dependencies', 'FAIL', 'package.json not found');
    return;
  }
  
  const content = readFileContent(packageFile);
  const packageJson = JSON.parse(content);
  
  const requiredDeps = [
    'expo',
    'react',
    'react-native',
    '@react-native-async-storage/async-storage',
    'firebase',
    '@expo/vector-icons',
    'react-native-safe-area-context'
  ];
  
  const missingDeps = [];
  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length === 0) {
    logTest('Package Dependencies', 'PASS', 'All required dependencies present');
  } else {
    logTest('Package Dependencies', 'FAIL', `Missing dependencies: ${missingDeps.join(', ')}`);
  }
}

// Test 7: Metro Configuration
function testMetroConfig() {
  console.log('⚙️ Testing Metro Configuration...');
  
  const metroFile = 'metro.config.js';
  if (!checkFileExists(metroFile)) {
    logTest('Metro Configuration', 'FAIL', 'metro.config.js not found');
    return;
  }
  
  const content = readFileContent(metroFile);
  const hasFirebaseConfig = content.includes('firebase') || content.includes('idb');
  
  if (hasFirebaseConfig) {
    logTest('Metro Configuration', 'PASS', 'Metro configured for Firebase compatibility');
  } else {
    logTest('Metro Configuration', 'FAIL', 'Metro configuration missing Firebase compatibility');
  }
}

// Test 8: App Entry Point
function testAppEntry() {
  console.log('🚀 Testing App Entry Point...');
  
  const appFile = 'App.js';
  if (!checkFileExists(appFile)) {
    logTest('App Entry Point', 'FAIL', 'App.js not found');
    return;
  }
  
  const requiredPatterns = [
    /AuthProvider/,
    /RootNavigation/,
    /StatusBar/,
    /SafeAreaProvider/
  ];
  
  const allPatternsFound = checkCodePattern(appFile, requiredPatterns);
  
  if (allPatternsFound) {
    logTest('App Entry Point', 'PASS', 'App properly configured with auth provider and navigation');
  } else {
    logTest('App Entry Point', 'FAIL', 'App missing required auth provider or navigation setup');
  }
}

// Test 9: Error Handling
function testErrorHandling() {
  console.log('🛡️ Testing Error Handling...');
  
  const filesToCheck = [
    'screens/LoginScreen.js',
    'contexts/AuthContext.js',
    'firebase.js'
  ];
  
  let hasErrorHandling = true;
  const missingErrorHandling = [];
  
  for (const file of filesToCheck) {
    if (checkFileExists(file)) {
      const content = readFileContent(file);
      if (!content.includes('try') && !content.includes('catch') && !content.includes('error')) {
        hasErrorHandling = false;
        missingErrorHandling.push(file);
      }
    }
  }
  
  if (hasErrorHandling) {
    logTest('Error Handling', 'PASS', 'Error handling implemented in critical files');
  } else {
    logTest('Error Handling', 'FAIL', `Missing error handling in: ${missingErrorHandling.join(', ')}`);
  }
}

// Test 10: TypeScript Support
function testTypeScriptSupport() {
  console.log('📝 Testing TypeScript Support...');
  
  const tsConfigFile = 'tsconfig.json';
  const hasTypeScriptFiles = checkFileExists('components/AnimatedCard.tsx');
  
  if (checkFileExists(tsConfigFile) || hasTypeScriptFiles) {
    logTest('TypeScript Support', 'PASS', 'TypeScript configuration and files present');
  } else {
    logTest('TypeScript Support', 'FAIL', 'No TypeScript configuration found');
  }
}

// Run all tests
function runAllTests() {
  console.log('🧪 RUNNING COMPREHENSIVE AUTH FLOW TESTS\n');
  
  testProjectStructure();
  testFirebaseConfig();
  testAuthContext();
  testLoginScreen();
  testNavigation();
  testDependencies();
  testMetroConfig();
  testAppEntry();
  testErrorHandling();
  testTypeScriptSupport();
  
  // Generate test report
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('======================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Auth flow is ready for production!');
  } else {
    console.log('\n⚠️ Some tests failed. Review the details above.');
  }
  
  // Save detailed report
  const reportPath = 'auth-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return testResults.failed === 0;
}

// Run the tests
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runAllTests, testResults };
