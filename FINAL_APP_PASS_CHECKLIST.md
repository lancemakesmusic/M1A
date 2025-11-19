# 🚀 Final App Pass Checklist

## Complete pre-release verification for M1A v1.0

---

## 📋 Firebase Configuration

### Storage Rules
- [ ] Verify Storage rules are deployed: `firebase deploy --only storage`
- [ ] Test avatar upload → Should upload successfully
- [ ] Test cover photo upload → Should upload successfully
- [ ] Test post media upload (photo/video/audio) → Should upload successfully
- [ ] Verify images display correctly after upload (no blank images)

### Firestore Rules
- [ ] Verify Firestore rules are deployed: `firebase deploy --only firestore:rules`
- [ ] Check Firebase Console → Firestore → Rules → Should show latest rules
- [ ] Test profile update → Should save successfully
- [ ] Test post creation → Should save successfully
- [ ] Test message sending → Should save successfully

### Firestore Indexes
- [ ] Check index status: https://console.firebase.google.com/project/m1alive/firestore/indexes
- [ ] **Posts Index** (userId + createdAt) → Status: `Enabled` ✅
- [ ] **Services Index** (available + popularity) → Status: `Enabled` ✅
- [ ] **Users Index** (private + displayName) → Status: `Enabled` ✅
- [ ] **Conversations Index** (participants + lastMessageAt) → Status: `Enabled` ✅
- [ ] **Wallet Transactions Index** (userId + timestamp) → Status: `Enabled` ✅
- [ ] All indexes show "Enabled" (not "Building" or "Error")

---

## 🔐 Authentication & User Management

### Login/Signup
- [ ] Email/password login works
- [ ] Sign up creates new user
- [ ] User session persists after app restart
- [ ] Logout works correctly
- [ ] Error handling for invalid credentials

### Profile Management
- [ ] Profile edit screen loads user data
- [ ] Profile photo upload works → Shows immediately
- [ ] Cover photo upload works → Shows immediately
- [ ] Profile changes save to Firestore
- [ ] Profile changes reflect on Profile screen
- [ ] Profile photo displays in hamburger menu
- [ ] Profile photo displays in user lists
- [ ] Profile photo displays in messages
- [ ] Bio, location, website, socials save correctly

---

## 📱 Core Features

### Home Screen
- [ ] Home screen loads without errors
- [ ] Service cards display correctly
- [ ] Navigation to services works
- [ ] Search functionality works
- [ ] Tutorial displays on first launch
- [ ] Hamburger menu button works

### Explore Screen
- [ ] Default category is "Services" (not "Users")
- [ ] Services load from Firestore
- [ ] Events load from Firestore
- [ ] Filter tabs (All, Artist, Vendor, etc.) work
- [ ] Search bar works
- [ ] Navigation to booking screens works
- [ ] "Recording Time" deal displays correctly

### Profile Screen
- [ ] Profile loads user data
- [ ] Avatar displays correctly
- [ ] Cover photo displays correctly
- [ ] Stats load (followers, following, posts)
- [ ] Posts load from Firestore
- [ ] "Create Post" button works
- [ ] Back button works (when accessed from drawer)

### Messages Screen
- [ ] Conversations load from Firestore
- [ ] Available users list loads
- [ ] Send message works
- [ ] Messages save to Firestore
- [ ] Avatar images display in conversations
- [ ] Back button works

### Users Screen
- [ ] Users load from Firestore
- [ ] Filter tabs work (All, Artist, Vendor, etc.)
- [ ] Search functionality works
- [ ] User cards display avatars correctly
- [ ] Navigation to user profiles works
- [ ] Back button works

### Wallet Screen
- [ ] Balance loads correctly
- [ ] Transactions load from Firestore
- [ ] Payment methods load
- [ ] Add funds works
- [ ] Send money works
- [ ] QR code generates correctly
- [ ] Insights calculate correctly
- [ ] Back button works

### Service Booking
- [ ] Services are selectable
- [ ] Booking form works
- [ ] Calendar integration works
- [ ] Payment processing works
- [ ] Orders save to Firestore
- [ ] Google Calendar events created

### Event Booking
- [ ] Events display correctly
- [ ] RSVP functionality works
- [ ] Event details save to Firestore
- [ ] Calendar integration works

### Auto-Poster
- [ ] Content generation works
- [ ] Media upload works
- [ ] Post scheduling works
- [ ] Scheduled posts save to Firestore
- [ ] Back button works

### Create Post
- [ ] Text posts work
- [ ] Photo posts work
- [ ] Video posts work
- [ ] Audio posts work
- [ ] Posts save to Firestore
- [ ] Posts appear on profile

### Bar Menu
- [ ] Menu items load
- [ ] Add to cart works
- [ ] Checkout works
- [ ] Orders save to Firestore
- [ ] Payment processing works

---

## 🍔 Navigation & UI

### Hamburger Menu
- [ ] Menu opens/closes smoothly
- [ ] All navigation links work
- [ ] User avatar displays correctly
- [ ] User name/email display correctly
- [ ] Logout button works
- [ ] Settings screen accessible
- [ ] Back buttons work on all sub-screens

### Settings Screen
- [ ] All settings categories accessible
- [ ] Language settings work
- [ ] Timezone settings work
- [ ] Notification preferences work
- [ ] Back button works
- [ ] Changes save correctly

### M1A Dashboard
- [ ] Dashboard loads stats
- [ ] Stats calculate correctly
- [ ] Quick actions work
- [ ] Back button works (when accessed from drawer)
- [ ] No back button on first launch (onboarding)

### Back Navigation
- [ ] All screens have back buttons (except initial screens)
- [ ] Back buttons navigate correctly
- [ ] No navigation loops
- [ ] Deep linking works

---

## 💳 Payments & Services

### Stripe Integration
- [ ] Payment methods load
- [ ] Add payment method works
- [ ] Set default payment method works
- [ ] Delete payment method works
- [ ] Payment processing works (test mode)
- [ ] Error handling for failed payments

### Service Purchases
- [ ] All services are selectable
- [ ] Service booking works
- [ ] Event booking works
- [ ] Bar orders work
- [ ] Prices calculate correctly
- [ ] Deals apply correctly (Recording Time: 10hrs/$200)

### Google Calendar
- [ ] Calendar integration configured
- [ ] Availability checks work
- [ ] Events created in calendar
- [ ] Event details correct (date, time, duration)

---

## 🔔 Notifications

### Push Notifications
- [ ] Push token registered
- [ ] Message notifications work
- [ ] Event notifications work
- [ ] Discount notifications work
- [ ] Notification preferences save
- [ ] Users can enable/disable notification types

---

## 📊 Data & Persistence

### Firestore
- [ ] All data saves to Firestore
- [ ] No mock data fallbacks
- [ ] Real-time updates work
- [ ] Data persists after app restart
- [ ] No data loss

### Local Storage
- [ ] User preferences save
- [ ] Persona selection persists
- [ ] Tutorial completion tracked
- [ ] Settings persist

---

## 🎨 UI/UX Polish

### Images
- [ ] All profile photos display correctly
- [ ] All cover photos display correctly
- [ ] No blank/placeholder images where real photos exist
- [ ] Images load without errors
- [ ] Cache-busting works (images update when changed)

### Animations
- [ ] Home screen service cards animate smoothly
- [ ] No white screens during animations
- [ ] Content doesn't disappear on scroll
- [ ] Animations don't break functionality

### Layout
- [ ] No overlapping text
- [ ] All text is legible
- [ ] Proper spacing and margins
- [ ] Hamburger menu properly formatted
- [ ] Filter tabs properly contained
- [ ] No cut-off content

### Empty States
- [ ] Empty states display when no data
- [ ] Helpful messages for empty states
- [ ] No errors when collections are empty

---

## 🐛 Error Handling

### Network Errors
- [ ] Graceful handling of network failures
- [ ] User-friendly error messages
- [ ] Retry mechanisms work
- [ ] Offline state handled

### Firebase Errors
- [ ] Permission errors handled gracefully
- [ ] Index errors show helpful messages
- [ ] Storage errors handled
- [ ] Firestore errors handled

### Validation
- [ ] Form validation works
- [ ] Required fields enforced
- [ ] Email format validation
- [ ] Password strength validation

---

## 🔧 Technical

### Code Quality
- [ ] No console errors
- [ ] No linting errors
- [ ] No TypeScript errors (if applicable)
- [ ] No unused imports
- [ ] No deprecated APIs

### Performance
- [ ] App loads quickly
- [ ] Images load efficiently
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] No lag on interactions

### Dependencies
- [ ] All packages up to date (or compatible)
- [ ] No security vulnerabilities
- [ ] Peer dependencies resolved
- [ ] No conflicting versions

---

## 📱 Platform-Specific

### iOS
- [ ] App builds successfully
- [ ] TestFlight build works
- [ ] All permissions requested
- [ ] App icons correct
- [ ] Splash screen works

### Android (if applicable)
- [ ] App builds successfully
- [ ] Permissions requested
- [ ] App icons correct
- [ ] Splash screen works

---

## 🧪 Testing Scenarios

### User Flows
- [ ] **New User Flow:**
  - [ ] Sign up → Persona selection → Tutorial → Home screen
  - [ ] All steps work smoothly
  - [ ] No back button on persona selection

- [ ] **Returning User Flow:**
  - [ ] Login → Home screen
  - [ ] Data persists
  - [ ] Profile loads correctly

- [ ] **Profile Update Flow:**
  - [ ] Edit profile → Upload photo → Save → View profile
  - [ ] Photo displays immediately
  - [ ] Photo persists after app restart

- [ ] **Service Booking Flow:**
  - [ ] Browse services → Select service → Book → Pay → Confirm
  - [ ] Order saves to Firestore
  - [ ] Calendar event created

- [ ] **Messaging Flow:**
  - [ ] View users → Select user → Send message → View conversation
  - [ ] Messages save and display

---

## 🚀 Pre-Release

### Environment
- [ ] `.env` file configured with real credentials
- [ ] No mock/placeholder values
- [ ] All API keys valid
- [ ] Backend API accessible

### Documentation
- [ ] README.md updated
- [ ] Setup instructions clear
- [ ] Known issues documented
- [ ] Changelog updated

### Build Configuration
- [ ] `app.json` configured correctly
- [ ] `eas.json` configured correctly
- [ ] Version number correct
- [ ] Build number correct
- [ ] Bundle identifier correct

### Git
- [ ] All changes committed
- [ ] Code pushed to GitHub
- [ ] No sensitive data in commits
- [ ] `.env` in `.gitignore`

---

## ✅ Final Verification

### Smoke Test
- [ ] App launches without crashes
- [ ] Login works
- [ ] Home screen loads
- [ ] Profile loads
- [ ] Can navigate to all screens
- [ ] Can upload photos
- [ ] Can create posts
- [ ] Can send messages
- [ ] Can book services

### Firebase Console Check
- [ ] Go to: https://console.firebase.google.com/project/m1alive
- [ ] Storage → Rules → Latest rules deployed ✅
- [ ] Firestore → Rules → Latest rules deployed ✅
- [ ] Firestore → Indexes → All 5 indexes "Enabled" ✅
- [ ] Authentication → Users → Test user exists ✅

### TestFlight Ready
- [ ] Build number incremented
- [ ] Version number correct
- [ ] All features tested
- [ ] No critical bugs
- [ ] Ready for TestFlight submission

---

## 📝 Notes

**Current Status:**
- ✅ Storage rules: Deployed
- ✅ Firestore rules: Deployed  
- ✅ Firestore indexes: Deployed (building...)
- ✅ All mock implementations: Removed
- ✅ Real Firebase: Fully operational

**Estimated Time to Complete:** 30-60 minutes

**Priority Order:**
1. Wait for indexes to finish building (1-5 min)
2. Test all core features (15-20 min)
3. Fix any issues found (10-15 min)
4. Final smoke test (5-10 min)
5. Ready for release! 🎉

---

## 🎯 Success Criteria

**App is ready for release when:**
- ✅ All Firebase indexes are "Enabled"
- ✅ All features work without errors
- ✅ All images upload and display correctly
- ✅ All data persists correctly
- ✅ No console errors
- ✅ Smooth user experience
- ✅ All navigation works
- ✅ All payments process correctly

---

**Last Updated:** After Firebase rules and indexes deployment
**Next Review:** After indexes finish building

