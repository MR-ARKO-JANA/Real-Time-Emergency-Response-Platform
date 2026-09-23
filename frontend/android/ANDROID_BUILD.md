## Android Build Guide

### Prerequisites
- Node.js 18+
- Android Studio (Hedgehog or newer)
- JDK 17

### First-time Setup
```bash
cd frontend
npm install
npx cap add android    # only needed once
```

### Build & Deploy Workflow (repeat every release)
```bash
# 1. Build the React web app
npm run build

# 2. Sync web assets into the Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```

### In Android Studio
1. Wait for Gradle sync to finish
2. Select device / emulator and press ▶ Run to test
3. For Play Store: **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**

### App Details
| Field | Value |
|-------|-------|
| App ID | `com.w3bix.nearhelp` |
| Min SDK | 22 (Android 5.1) |
| Target SDK | 34 (Android 14) |
| Permissions | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `INTERNET` |

### Google Play Submission Checklist
- [ ] App signed with release keystore
- [ ] `versionCode` incremented in `android/app/build.gradle`
- [ ] Privacy Policy URL added in Play Console
- [ ] Data Safety form completed (Location data disclosed)
- [ ] Screenshots uploaded (phone + tablet)
- [ ] Store listing filled (description, category: Tools / Emergency)
