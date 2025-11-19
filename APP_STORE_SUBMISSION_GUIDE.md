# 🍎 App Store Submission Guide - M1A

## ✅ Pre-Submission Checklist

### Build Status
- ✅ Build #8 completed successfully
- ✅ Push notifications configured
- ✅ APNs key created
- ✅ All Firebase rules deployed
- ✅ App version: 1.0.0
- ✅ Bundle ID: com.merkabaent.m1a

### Required Information

Before submitting, you'll need:

1. **App Name**: M1A
2. **Subtitle**: (Optional) Connect artists, vendors, and fans
3. **Description**: (See below)
4. **Keywords**: music, entertainment, booking, artists, vendors, events
5. **Support URL**: Your website (Merkabaent.com)
6. **Marketing URL**: (Optional)
7. **Privacy Policy URL**: **REQUIRED** - You need a privacy policy
8. **Category**: Music / Entertainment
9. **Age Rating**: 17+ (likely, due to social features)
10. **Screenshots**: Required for different device sizes
11. **App Icon**: ✅ Already configured
12. **App Preview Video**: (Optional but recommended)

---

## 📝 Step 1: Submit Build to TestFlight

### Option A: Using EAS Submit (Recommended)

```bash
eas submit --platform ios --profile production --latest
```

This will:
- Find your latest build (#8)
- Upload it to App Store Connect
- Make it available in TestFlight

### Option B: Manual Upload

1. Download the .ipa file from: https://expo.dev/artifacts/eas/aevGh6aBkyPvagqyhMsr5X.ipa
2. Use Transporter app or Xcode to upload

---

## 📋 Step 2: App Store Connect Setup

### 2.1 Create App Listing (if not done)

1. Go to: https://appstoreconnect.apple.com
2. Click **"My Apps"**
3. Click **"+"** to create new app (or select existing)
4. Fill in:
   - **Platform**: iOS
   - **Name**: M1A
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.merkabaent.m1a
   - **SKU**: m1a-ios-001 (or any unique identifier)
   - **User Access**: Full Access

### 2.2 App Information

**Name**: M1A  
**Subtitle**: Connect artists, vendors, and fans  
**Category**: 
- Primary: Music
- Secondary: Entertainment

**Privacy Policy URL**: **REQUIRED** - You need to create this

**Support URL**: https://merkabaent.com (or your support page)

---

## 📝 Step 3: App Description

### App Description (4000 characters max)

```
M1A - Your Complete Entertainment Ecosystem

Connect artists, vendors, and fans in one powerful platform. Book services, schedule events, manage your wallet, and engage with the community—all in one app.

FOR ARTISTS:
• Book recording time and production services
• Manage bookings with Google Calendar sync
• Accept payments through integrated wallet
• Connect directly with fans
• Auto-poster for social media management
• Personalized dashboard with analytics

FOR VENDORS:
• List services and availability
• Accept bookings and payments
• Manage calendar and inventory
• Build reputation through reviews
• Reach new customers through the platform

FOR FANS:
• Discover artists and events
• Book services (recording time, production, etc.)
• Connect with artists through messaging
• Support artists financially through wallet
• Access exclusive content and experiences
• Order from venue bars/menus

KEY FEATURES:
✓ Real-time booking and scheduling
✓ Integrated payment processing
✓ Direct artist-fan messaging
✓ Social feed and profiles
✓ Wallet with QR code payments
✓ Google Calendar integration
✓ Push notifications
✓ Personalized experience based on your role

M1A breaks down barriers between artists, vendors, and fans, creating a transparent, community-driven ecosystem where everyone can thrive.

Join the M1A community today and experience the future of entertainment.
```

### What's New (Version 1.0.0)

```
🎉 Welcome to M1A v1.0!

The complete entertainment ecosystem is here. Connect artists, vendors, and fans in one powerful platform.

• Book services and events
• Integrated wallet and payments
• Direct messaging
• Social profiles and feeds
• Google Calendar sync
• Push notifications
• And much more!

Join the M1A community today.
```

### Keywords (100 characters max)

```
music, entertainment, booking, artists, vendors, events, recording, studio, venue, social, community, wallet, payments, calendar
```

---

## 🖼️ Step 4: Screenshots (REQUIRED)

You need screenshots for different device sizes:

### iPhone 6.7" Display (iPhone 14 Pro Max, etc.)
- Required: 1 screenshot minimum
- Recommended: 3-10 screenshots
- Size: 1290 x 2796 pixels

### iPhone 6.5" Display (iPhone 11 Pro Max, etc.)
- Required: 1 screenshot minimum
- Size: 1242 x 2688 pixels

### iPhone 5.5" Display (iPhone 8 Plus, etc.)
- Required: 1 screenshot minimum
- Size: 1242 x 2208 pixels

### iPad Pro (12.9-inch)
- Optional but recommended
- Size: 2048 x 2732 pixels

**Screenshot Ideas:**
1. Home screen with service cards
2. Profile screen with stats
3. Booking/calendar interface
4. Wallet with QR code
5. Messages/conversations
6. Explore screen with services

**How to Take Screenshots:**
1. Run app in iOS Simulator
2. Use Cmd+S to save screenshot
3. Or use physical device and take screenshots
4. Edit/crop to required sizes

---

## 🔒 Step 5: Privacy Policy (REQUIRED)

You **MUST** have a privacy policy URL. Create one at:

1. **Your website**: https://merkabaent.com/privacy
2. **GitHub Pages**: Free hosting
3. **Privacy Policy Generator**: https://www.privacypolicygenerator.info/

**Privacy Policy Must Include:**
- What data you collect
- How you use the data
- Third-party services (Firebase, Stripe, Google)
- User rights
- Contact information

**Quick Template:**
```
Privacy Policy for M1A

Last updated: [Date]

M1A ("we", "our", "us") is committed to protecting your privacy.

Data We Collect:
- Account information (email, name, profile photos)
- Payment information (processed securely through Stripe)
- Usage data and analytics
- Location data (if you enable location services)

How We Use Your Data:
- To provide and improve our services
- To process payments
- To send notifications
- To personalize your experience

Third-Party Services:
- Firebase (authentication, database, storage)
- Stripe (payment processing)
- Google Calendar (scheduling)

Your Rights:
- Access your data
- Delete your account
- Opt-out of certain data collection

Contact: [Your email]

For full privacy policy, visit: [URL]
```

---

## ⚠️ Step 6: App Store Review Information

### Contact Information
- **First Name**: Lance
- **Last Name**: Brogdon
- **Phone**: [Your phone]
- **Email**: brogdon.lance@gmail.com

### Demo Account (if required)
- **Username**: [Create test account]
- **Password**: [Test password]
- **Notes**: "This is a demo account for App Store review"

### Notes for Review
```
M1A is a platform connecting artists, vendors, and fans. 

Key features:
- User authentication (Firebase)
- Service booking and scheduling
- Payment processing (Stripe)
- Social features (messaging, profiles)
- Calendar integration (Google Calendar)

All features are fully functional. Please use the provided demo account to test the app.

For any questions, contact: brogdon.lance@gmail.com
```

---

## 📊 Step 7: Age Rating

Complete the age rating questionnaire:

**Content:**
- **Unrestricted Web Access**: No
- **Gambling**: No
- **Contests**: No
- **Alcohol/Tobacco**: Possibly (if bar menu includes alcohol)
- **Medical/Treatment Info**: No
- **Violence**: No
- **Sexual Content**: No
- **Profanity**: No
- **Horror/Fear Themes**: No
- **Mature/Suggestive Themes**: Possibly (social features)
- **Simulated Gambling**: No
- **Frequent/Intense Violence**: No
- **Frequent/Intense Sexual Content**: No
- **Frequent/Intense Profanity**: No
- **Frequent/Intense Horror**: No
- **Frequent/Intense Mature Themes**: Possibly

**Likely Rating**: 17+ (due to social features, possibly alcohol if bar menu)

---

## 🚀 Step 8: Submit for Review

### 8.1 Complete All Required Fields

- [ ] App Information
- [ ] Pricing and Availability
- [ ] App Privacy (Data collection disclosure)
- [ ] Version Information
- [ ] Screenshots (at least 1 per device size)
- [ ] App Preview (optional)
- [ ] Description
- [ ] Keywords
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL **REQUIRED**
- [ ] Age Rating
- [ ] Review Information

### 8.2 Build Selection

1. Go to **"TestFlight"** tab
2. Wait for build to process (can take 10-30 minutes)
3. Once processed, go to **"App Store"** tab
4. Select **"1.0.0"** version
5. Under **"Build"**, select your build (#8)

### 8.3 Submit for Review

1. Click **"Submit for Review"**
2. Answer any export compliance questions
3. Confirm submission
4. Wait for review (typically 24-48 hours)

---

## ⏱️ Timeline

- **Build Upload**: 5-10 minutes
- **Build Processing**: 10-30 minutes
- **App Store Connect Setup**: 30-60 minutes
- **Review Time**: 24-48 hours (typically)
- **Total**: 1-3 days from submission to approval

---

## 🎯 Quick Start Commands

### 1. Submit Latest Build
```bash
eas submit --platform ios --profile production --latest
```

### 2. Check Build Status
```bash
eas build:list --platform ios --limit 1
```

### 3. View Submission Status
Visit: https://appstoreconnect.apple.com

---

## 📚 Resources

- **App Store Connect**: https://appstoreconnect.apple.com
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/
- **EAS Submit Docs**: https://docs.expo.dev/submit/introduction/

---

## ✅ Final Checklist Before Submission

- [ ] Build #8 uploaded to App Store Connect
- [ ] App listing created in App Store Connect
- [ ] App description written
- [ ] Screenshots prepared (at least 1 per device size)
- [ ] Privacy policy URL created and accessible
- [ ] Support URL configured
- [ ] Age rating completed
- [ ] Review information filled out
- [ ] Demo account created (if needed)
- [ ] All required fields completed
- [ ] Build selected in version
- [ ] Ready to submit for review

---

**Ready to submit?** Run:
```bash
eas submit --platform ios --profile production --latest
```

Then complete the App Store Connect setup above.

Good luck! 🚀

