/**
 * Firebase Setup Script
 * This script helps set up Firebase Storage rules and Firestore indexes
 * 
 * Note: Some operations require Firebase Console access, but this script
 * provides validation and direct links to create indexes.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔥 Firebase Setup Helper\n');
console.log('================================\n');

// Storage Rules
console.log('📋 STEP 1: Firebase Storage Rules');
console.log('-----------------------------------');
console.log('1. Go to: https://console.firebase.google.com/project/m1alive/storage/rules');
console.log('2. Copy the rules below and paste them:');
console.log('3. Click "Publish"\n');

const storageRules = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload their own avatars
    match /avatars/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload their own cover photos
    match /covers/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload posts (photos, videos, audio)
    match /posts/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload media library items
    match /mediaLibrary/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

console.log(storageRules);
console.log('\n');

// Save rules to file for easy copy
const rulesPath = join(process.cwd(), 'firebase-storage-rules.txt');
writeFileSync(rulesPath, storageRules);
console.log(`✅ Storage rules saved to: ${rulesPath}\n`);

// Firestore Indexes
console.log('📊 STEP 2: Firestore Indexes');
console.log('-----------------------------');
console.log('Click each link below to auto-create the index:\n');

const indexes = [
  {
    name: 'Posts Index (userId + createdAt)',
    collection: 'posts',
    fields: ['userId (Ascending)', 'createdAt (Descending)'],
    link: 'https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=CkVwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wb3N0cy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC'
  },
  {
    name: 'Services Index (available + popularity)',
    collection: 'services',
    fields: ['available (Ascending)', 'popularity (Descending)'],
    link: 'https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zZXJ2aWNlcy9pbmRleGVzL18QARoNCglhdmFpbGFibGUQARoOCgpwb3B1bGFyaXR5EAIaDAoIX19uYW1lX18QAg'
  },
  {
    name: 'Users Index (private + displayName)',
    collection: 'users',
    fields: ['private (Ascending)', 'displayName (Ascending)'],
    link: 'https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=CkVwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy91c2Vycy9pbmRleGVzL18QARoLCgdwcml2YXRlEAEaDwoLZGlzcGxheU5hbWUQARoMCghfX25hbWVfXxAB'
  },
  {
    name: 'Conversations Index (participants + lastMessageAt)',
    collection: 'conversations',
    fields: ['participants (Array Contains)', 'lastMessageAt (Descending)'],
    link: 'https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9jb252ZXJzYXRpb25zL2luZGV4ZXMvXxABGhAKDHBhcnRpY2lwYW50cxgBGhEKDWxhc3RNZXNzYWdlQXQQAhoMCghfX25hbWVfXxAC'
  },
  {
    name: 'Wallet Transactions Index (userId + timestamp)',
    collection: 'walletTransactions',
    fields: ['userId (Ascending)', 'timestamp (Descending)'],
    link: 'https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=ClJwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy93YWxsZXRUcmFuc2FjdGlvbnMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJdGltZXN0YW1wEAIaDAoIX19uYW1lX18QAg'
  }
];

indexes.forEach((index, i) => {
  console.log(`${i + 1}. ${index.name}`);
  console.log(`   Collection: ${index.collection}`);
  console.log(`   Fields: ${index.fields.join(', ')}`);
  console.log(`   Link: ${index.link}\n`);
});

// Create HTML file with clickable links
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Firebase Setup - Click to Create Indexes</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #FF6B00; }
        .index { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .index h3 { margin-top: 0; }
        a { display: inline-block; margin-top: 10px; padding: 10px 20px; background: #FF6B00; color: white; text-decoration: none; border-radius: 5px; }
        a:hover { background: #E55A00; }
        .status { margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🔥 Firebase Index Setup</h1>
    <p>Click each button below to create the required Firestore indexes:</p>
    
    ${indexes.map((index, i) => `
    <div class="index">
        <h3>${i + 1}. ${index.name}</h3>
        <p><strong>Collection:</strong> ${index.collection}</p>
        <p><strong>Fields:</strong> ${index.fields.join(', ')}</p>
        <a href="${index.link}" target="_blank">Create Index ${i + 1}</a>
    </div>
    `).join('')}
    
    <div class="status">
        <h3>✅ After Creating Indexes:</h3>
        <p>1. Wait 1-5 minutes for indexes to build</p>
        <p>2. Check status in <a href="https://console.firebase.google.com/project/m1alive/firestore/indexes" target="_blank">Firebase Console</a></p>
        <p>3. All indexes should show "Enabled" status</p>
    </div>
</body>
</html>`;

const htmlPath = join(process.cwd(), 'firebase-indexes.html');
writeFileSync(htmlPath, htmlContent);
console.log(`✅ Index links saved to: ${htmlPath}`);
console.log('   Open this file in your browser and click the links!\n');

console.log('================================\n');
console.log('📝 SUMMARY:');
console.log('1. Storage Rules: Copy from firebase-storage-rules.txt');
console.log('2. Indexes: Open firebase-indexes.html and click all links');
console.log('3. Wait 1-5 minutes for indexes to build');
console.log('4. Test your app - all errors should be gone!\n');
console.log('✅ Setup files created!');

