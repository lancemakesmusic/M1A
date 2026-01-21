# M1A - Merkaba Entertainment Platform

**Version 1.0.5** | **Production Ready** ✅

M1A is the Merkaba Entertainment platform connecting artists, vendors, and fans. Book services, schedule events, manage a wallet, and collaborate with your community.

---

## Features
- Authentication, profiles, messaging, explore feed
- Service booking + Stripe checkout
- Event booking + Google Calendar sync
- Wallet (balance, transactions)
- Admin dashboard
- Content Library (Google Drive-backed)

---

## Tech Stack
- Frontend: React Native (Expo SDK 54)
- Backend: FastAPI (Python) on Google Cloud Run
- Database/Storage: Firebase Firestore + Storage
- Payments: Stripe
- Calendar: Google Calendar API (service account)
- Drive: Google Drive API (service account)

---

## Quick Start (Dev)
```bash
npm install
cd autoposter-backend
pip install -r requirements.txt
```

Start locally:
```bash
# Terminal 1 (backend)
cd autoposter-backend
python -m uvicorn api.main:app --reload --port 8001

# Terminal 2 (frontend)
npx expo start --clear
```

---

## Production Environment (Required)
Set these for builds:
```
EXPO_PUBLIC_API_BASE_URL=https://<cloud-run-url>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
EXPO_PUBLIC_FIREBASE_* (all firebase web keys)
```

Backend env:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_BUSINESS_CALENDAR_ID=...@group.calendar.google.com
GOOGLE_DRIVE_PARENT_FOLDER_ID=<parent-folder-id>
```

---

## Google Drive Content Library
User folder structure:
```
Username/
  ProjectFiles/
```

Workflow:
1. Share the Drive parent folder with the service account (Editor).
2. On signup, backend creates `Username/ProjectFiles`.
3. Files dropped into `ProjectFiles` appear in Wallet → Content Library.

---

## Cloud Deploy (Google Cloud Run)
```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com drive.googleapis.com
cd autoposter-backend
gcloud run deploy m1a-backend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080
```

---

## App Store / TestFlight
Build:
```bash
eas build --platform ios --profile production
```

Submit:
```bash
eas submit --platform ios --profile production --latest
```

If Apple upload returns IrisAPI 500, use Transporter to upload the IPA:
1. Download the IPA from the EAS build URL
2. Open Transporter and drag the IPA to upload

---

## Health Checks
```
https://<cloud-run-url>/api/payments/health
https://<cloud-run-url>/api/calendar/health
```

---

## Security Notes
- Do not commit `.env` files or service account JSON.
- Stripe secret keys stay in backend only.
- Use Cloud Run secrets for credentials.

---

## Support
Email: admin@merkabaent.com  
Privacy Policy: https://www.merkabaent.com/privacypolicy
