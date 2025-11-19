# How to Update TestFlight

## Quick Steps

### 1. Build a New iOS Version
```bash
eas build --platform ios --profile production
```

This will:
- Automatically increment your build number (since you're using `appVersionSource: "remote"`)
- Create a new build with all your latest code changes
- Upload it to EAS servers

**Note:** The build process takes about 10-20 minutes. You can press `Ctrl+C` to exit and check progress later.

### 2. Submit to TestFlight
Once the build completes, submit it:

```bash
eas submit --platform ios --profile production
```

This will:
- Automatically find your latest build
- Upload it to App Store Connect
- Make it available in TestFlight after Apple processes it (5-10 minutes)

---

## Alternative: Build and Submit in One Command

You can also do both steps at once:

```bash
eas build --platform ios --profile production --auto-submit
```

This builds and automatically submits when done.

---

## Check Build Status

To see your build progress:
- Visit: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
- Or check the URL provided in the terminal after starting the build

---

## After Submission

1. **Apple Processing**: Takes 5-10 minutes after submission
2. **TestFlight**: Your build will appear in TestFlight automatically
3. **Testers**: Existing testers will be notified of the new build
4. **Version**: The build number increments automatically (1 → 2 → 3, etc.)

---

## Important Notes

- ✅ Your `appVersionSource: "remote"` setting means EAS handles version numbers automatically
- ✅ You don't need to manually update `buildNumber` in `app.json`
- ✅ The `version` in `app.json` (currently "1.0.0") only changes when you manually update it for major releases
- ✅ Each build gets a new build number automatically

---

## Troubleshooting

**Build fails?**
- Check the build logs at the URL provided
- Common issues: missing credentials, code signing problems

**Submission fails?**
- Make sure your Apple Developer account is still active
- Check that the build completed successfully first
- Verify your App Store Connect API key is valid

**Need to update version number?**
- Edit `app.json` and change `"version": "1.0.0"` to `"1.0.1"` (or whatever version you want)
- Then build and submit as normal

