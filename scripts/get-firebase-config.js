// Script to help get Firebase config values
// Run: node scripts/get-firebase-config.js

console.log(`
🔍 Getting Firebase Config for m1alive project

📋 Steps:
1. Go to: https://console.firebase.google.com/project/m1alive/settings/general
2. Scroll to "Your apps" section
3. If no iOS app exists, click "Add app" → iOS
4. Copy the config values from the Firebase SDK snippet

Or use this direct link to project settings:
👉 https://console.firebase.google.com/project/m1alive/settings/general

📝 You'll see something like:
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "m1alive.firebaseapp.com",
  projectId: "m1alive",
  storageBucket: "m1alive.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:ios:abcdef"
};

✅ Once you have these values, add them to eas.json in the production env section.
`);

