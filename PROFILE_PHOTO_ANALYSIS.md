# Profile Photo & Cover Photo - Full Analysis & Fix

## 🔍 Current Issues Identified

### 1. **ProfileScreen Not Refreshing After Upload**
- **Problem**: ProfileScreen uses `useFocusEffect` to refresh, but may not be triggered immediately after upload
- **Location**: `screens/ProfileScreen.js` lines 124-133
- **Impact**: Photos don't appear after selection until user navigates away and back

### 2. **Cache-Busting Inconsistency**
- **Problem**: Cache-busting uses timestamps but may not be synchronized between ProfileEditScreen and ProfileScreen
- **Location**: 
  - `ProfileEditScreen.js`: Uses `cacheBust` state
  - `ProfileScreen.js`: Uses `user.photoUpdatedAt || Date.now()`
- **Impact**: Images may not refresh even after upload

### 3. **UserContext Refresh Timing**
- **Problem**: `refreshUserProfile` is called but ProfileScreen may render before context updates
- **Location**: `contexts/UserContext.js` line 17-35
- **Impact**: ProfileScreen shows old data even after upload

### 4. **Image URL Priority Logic**
- **Problem**: ProfileScreen checks `user.avatarUrl || user.photoURL` but may not handle empty strings correctly
- **Location**: `screens/ProfileScreen.js` lines 276-281
- **Impact**: May show placeholder when URL exists but is empty string

### 5. **Firestore Timestamp Conversion**
- **Problem**: Timestamps are converted but may not be consistent across reads
- **Location**: `firebase.js` lines 319-330
- **Impact**: Cache-busting may fail if timestamps aren't properly converted

## ✅ Required Fixes

### Fix 1: Force ProfileScreen Refresh After Upload
- Add navigation listener to refresh when returning from ProfileEditScreen
- Ensure `refreshUserProfile` completes before showing success message

### Fix 2: Improve Cache-Busting
- Use consistent timestamp source (Firestore `photoUpdatedAt`/`coverUpdatedAt`)
- Add `key` prop to Image components that changes when URL changes
- Force re-render when profile updates

### Fix 3: Better URL Handling
- Check for empty strings, not just falsy values
- Validate URLs before displaying
- Add fallback handling for invalid URLs

### Fix 4: Synchronize State Updates
- Ensure UserContext updates before ProfileScreen renders
- Add loading states during refresh
- Use proper dependency arrays in useEffect

### Fix 5: Image Error Handling
- Add `onError` handlers to Image components
- Fallback to placeholder if image fails to load
- Retry logic for failed image loads

## 📋 Implementation Plan

1. **Update ProfileScreen.js**
   - Improve refresh logic
   - Better URL validation
   - Add error handling
   - Force re-render on profile updates

2. **Update ProfileEditScreen.js**
   - Ensure refresh completes before success message
   - Better error handling
   - Clear local URIs only after successful upload

3. **Update UserContext.js**
   - Ensure profile refresh is synchronous
   - Add loading states
   - Better error handling

4. **Update firebase.js**
   - Ensure timestamp conversion is consistent
   - Better error messages
   - Validate URLs before returning

## 🎯 Expected Behavior After Fix

1. User selects photo → Image appears immediately (local URI)
2. Upload completes → Profile updated in Firestore
3. UserContext refreshes → ProfileScreen receives new data
4. ProfileScreen re-renders → New photo displays with cache-busting
5. Photo persists → Visible on all screens and after app restart

