# 🔧 TestFlight Crash Fix

## Problem
App crashes immediately after splash screen in TestFlight build.

## Root Cause
Multiple services are instantiated at module load time and throw errors if `EXPO_PUBLIC_API_BASE_URL` is not set in production:

- `AutoPosterService` (line 169: `export default new AutoPosterService()`)
- `StripeService` (line 288: `export default new StripeService()`)
- `WalletService` (line 946: `export default new WalletService()`)
- `GoogleDriveService` (line 260: `export default new GoogleDriveService()`)

All of these services check for `EXPO_PUBLIC_API_BASE_URL` in their constructors and throw errors in production if it's missing.

## Solution
Added `EXPO_PUBLIC_API_BASE_URL` to `eas.json` production build profile:

```json
"env": {
  "EXPO_PUBLIC_API_BASE_URL": "https://m1a-backend-83002254287.us-central1.run.app",
  ...
}
```

## Next Steps

1. **Rebuild the app:**
   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

2. **Submit to TestFlight:**
   ```bash
   npx eas-cli@latest submit --platform ios --profile production --latest
   ```

3. **Test the build** - The app should now load past the splash screen.

## Verification

After rebuilding, verify:
- ✅ App loads past splash screen
- ✅ Can authenticate/login
- ✅ API calls work (check network tab)
- ✅ No console errors about missing API URL

## Backend URL
- Production: `https://m1a-backend-83002254287.us-central1.run.app`
- Health Check: `https://m1a-backend-83002254287.us-central1.run.app/api/health`













