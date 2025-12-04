# ✅ Deployment Checklist

## Pre-Deployment

- [x] Google Cloud SDK installer downloaded
- [x] Deployment script created (`deploy-cloud-run.ps1`)
- [x] CORS configuration updated for Cloud Run
- [x] Dockerfile verified (uses PORT env var)
- [x] Hardcoded IPs removed from frontend
- [ ] **Google Cloud SDK installed** ← YOU ARE HERE
- [ ] **Google Cloud authenticated**
- [ ] **Project created/set**

## During Deployment

- [ ] APIs enabled (Cloud Run, Cloud Build)
- [ ] Environment variables ready:
  - [ ] GOOGLE_BUSINESS_CALENDAR_ID
  - [ ] STRIPE_SECRET_KEY
  - [ ] STRIPE_WEBHOOK_SECRET
- [ ] Backend deployed to Cloud Run
- [ ] Service URL obtained

## Post-Deployment

- [ ] Backend health check passes
- [ ] Calendar health check passes
- [ ] Frontend `.env` updated with backend URL
- [ ] Frontend rebuilt with new API URL
- [ ] App tested on device
- [ ] All features working

---

## 🎯 Current Status

**Step:** Installing Google Cloud SDK  
**Next:** Authenticate and deploy

---

## 📝 Notes

- Calendar ID: `c_b55ae9eeff88509c47f0e3c0e5bd39621524b7d989f012d3cac18f0ed4a35fbb@group.calendar.google.com`
- Service account JSON: `autoposter-backend/firebase-admin.json`
- Deployment script: `autoposter-backend/deploy-cloud-run.ps1`




