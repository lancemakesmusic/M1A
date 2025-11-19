// scripts/verify-app-features.js
// Comprehensive feature verification script

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    results.passed.push(`✅ ${description}: ${filePath} exists`);
    return true;
  } else {
    results.failed.push(`❌ ${description}: ${filePath} missing`);
    return false;
  }
}

function checkFileContent(filePath, searchText, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(searchText)) {
      results.passed.push(`✅ ${description}`);
      return true;
    } else {
      results.warnings.push(`⚠️ ${description}: Pattern not found`);
      return false;
    }
  } else {
    results.failed.push(`❌ ${description}: File not found`);
    return false;
  }
}

console.log('🔍 M1A Feature Verification\n');
console.log('================================\n');

// Firebase Configuration
console.log('📋 Firebase Configuration...');
checkFile('firebase.js', 'Firebase initialization');
checkFile('firestore.rules', 'Firestore security rules');
checkFile('storage.rules', 'Storage security rules');
checkFile('firestore.indexes.json', 'Firestore indexes');
checkFileContent('firebase.js', 'initializeApp', 'Firebase app initialization');
checkFileContent('firebase.js', 'getFirestore', 'Firestore initialization');
checkFileContent('firebase.js', 'getStorage', 'Storage initialization');
checkFileContent('firebase.js', 'getAuth', 'Auth initialization');

// Core Screens
console.log('\n📱 Core Screens...');
const screens = [
  'screens/HomeScreen.js',
  'screens/ProfileScreen.js',
  'screens/ExploreScreen.js',
  'screens/MessagesScreen.js',
  'screens/UsersScreen.js',
  'screens/WalletScreen.js',
  'screens/ServiceBookingScreen.js',
  'screens/EventBookingScreen.js',
  'screens/AutoPosterScreen.js',
  'screens/CreatePostScreen.js',
  'screens/BarMenuScreen.js',
  'screens/M1ADashboardScreen.js',
  'screens/ProfileEditScreen.js',
  'screens/LoginScreen.js',
  'screens/SignupScreen.js'
];

screens.forEach(screen => {
  checkFile(screen, `Screen: ${path.basename(screen)}`);
});

// Navigation
console.log('\n🧭 Navigation...');
checkFile('navigation/AppNavigator.js', 'Main navigator');
checkFile('navigation/DrawerNavigator.js', 'Drawer navigator');
// TabNavigator not needed - using DrawerNavigator instead

// Contexts
console.log('\n🔧 Contexts...');
checkFile('contexts/AuthContext.js', 'Auth context');
checkFile('contexts/UserContext.js', 'User context');
checkFile('contexts/ThemeContext.js', 'Theme context');

// Services
console.log('\n⚙️ Services...');
const services = [
  'services/WalletService.js',
  'services/StripePaymentMethodsService.js',
  'services/ReviewService.js',
  'services/AnalyticsService.js',
  'services/NotificationService.js'
];

services.forEach(service => {
  checkFile(service, `Service: ${path.basename(service)}`);
});

// Utilities
console.log('\n🛠️ Utilities...');
checkFile('utils/photoUtils.js', 'Photo utilities');
checkFileContent('utils/photoUtils.js', 'getAvatarSource', 'Avatar source utility');
checkFileContent('utils/photoUtils.js', 'getCoverSource', 'Cover photo utility');

// Components
console.log('\n🧩 Components...');
const components = [
  'components/ServiceCardWithAnimation.js',
  'components/EmptyState.js',
  'components/ScrollIndicator.js'
];

components.forEach(component => {
  checkFile(component, `Component: ${path.basename(component)}`);
});

// Configuration
console.log('\n⚙️ Configuration...');
checkFile('app.json', 'App configuration');
checkFile('package.json', 'Package configuration');
checkFile('eas.json', 'EAS build configuration');
checkFile('.env', 'Environment variables (if exists)');

// Check for mock implementations (should be removed)
console.log('\n🔍 Checking for Mock Implementations...');
const firebaseContent = fs.readFileSync(path.join(__dirname, '..', 'firebase.js'), 'utf8');
if (firebaseContent.includes('mockFirestore') || firebaseContent.includes('mockStorage')) {
  results.failed.push('❌ Mock Firebase implementations still present');
} else {
  results.passed.push('✅ No mock Firebase implementations found');
}

// Check for real Firebase usage
if (firebaseContent.includes('initializeApp') && firebaseContent.includes('getFirestore')) {
  results.passed.push('✅ Real Firebase implementation detected');
} else {
  results.failed.push('❌ Real Firebase implementation not found');
}

// Summary
console.log('\n================================\n');
console.log('📊 Verification Summary\n');
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️ Warnings: ${results.warnings.length}\n`);

if (results.passed.length > 0) {
  console.log('✅ Passed Checks:');
  results.passed.forEach(item => console.log(`  ${item}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️ Warnings:');
  results.warnings.forEach(item => console.log(`  ${item}`));
}

if (results.failed.length > 0) {
  console.log('\n❌ Failed Checks:');
  results.failed.forEach(item => console.log(`  ${item}`));
  console.log('\n⚠️ Please fix the failed checks before release.');
  process.exit(1);
} else {
  console.log('\n🎉 All checks passed! App is ready for testing.');
  process.exit(0);
}

