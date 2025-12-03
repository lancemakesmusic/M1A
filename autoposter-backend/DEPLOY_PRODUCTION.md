# 🚀 Production Deployment Guide

## Issue: Build Failing

The build is failing because some packages (like `moviepy`, `instagrapi`, `TikTokApi`) have complex dependencies that may not build in Cloud Run's environment.

## Solution: Use Production Dockerfile

I've created a production-ready setup with only essential packages.

---

## Option 1: Use Production Dockerfile (Recommended)

This uses only essential packages that are guaranteed to build:

```cmd
cd C:\Users\admin\M1A\autoposter-backend
gcloud run deploy m1a-backend --source . --dockerfile Dockerfile.production --region us-central1 --platform managed --allow-unauthenticated --port 8080 --memory 512Mi --timeout 300 --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=c_b55ae9eeff88509c47f0e3c0e5bd39621524b7d989f012d3cac18f0ed4a35fbb@group.calendar.google.com"
```

**Note:** The `--dockerfile` flag might not work with `--source`. Instead, temporarily rename files:

```cmd
cd C:\Users\admin\M1A\autoposter-backend
ren Dockerfile Dockerfile.original
ren Dockerfile.production Dockerfile
ren requirements.txt requirements-full.txt
ren requirements-production.txt requirements.txt
gcloud run deploy m1a-backend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080 --memory 512Mi --timeout 300 --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=c_b55ae9eeff88509c47f0e3c0e5bd39621524b7d989f012d3cac18f0ed4a35fbb@group.calendar.google.com"
```

---

## Option 2: Check Build Logs First

Before switching, check the exact error:

1. Open: https://console.cloud.google.com/cloud-build/builds;region=us-central1/ff8bb944-a8d3-4ba7-bec4-334abb644c3e?project=83002254287
2. Look for the specific package that's failing
3. We can remove that package or add its dependencies

---

## What's Included in Production Build

✅ FastAPI + Uvicorn (API server)
✅ Stripe (payments)
✅ Firebase Admin (authentication)
✅ Google Calendar API (calendar integration)
✅ JWT (authentication)
✅ HTTP clients (httpx, requests)
✅ Cryptography (security)

❌ Removed (not needed for core API):
- moviepy (video processing)
- instagrapi (Instagram automation)
- TikTokApi (TikTok automation)
- tweepy (Twitter automation)
- facebook-sdk (Facebook automation)
- linkedin-api (LinkedIn automation)

These can be added back later if needed, but they're not required for the core booking/calendar/payment functionality.

---

## After Successful Deployment

1. Get the service URL from the output
2. Test: `curl https://YOUR-SERVICE-URL/api/health`
3. Update frontend `.env` with the new URL
4. Rebuild app


