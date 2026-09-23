# Changelog

All notable changes to the **NearHelp (Real-Time Emergency Response Platform)** project will be documented in this file.

## [2.0.0] - 2026-09-23 - Google Play & Production Release Milestone

### Added
- **Capacitor Android Core**: Integrated `@capacitor/core`, `@capacitor/android`, `@capacitor/geolocation`, `@capacitor/status-bar`, and `@capacitor/splash-screen`.
- **Offline SOS Queue**: Added localStorage-backed queue (`offlineSosQueue`) and `useOfflineQueue` React hook to capture and dispatch emergency broadcasts when offline or in intermittent connectivity.
- **Burn & Natural Disaster Triage**: Expanded offline first-aid cards with burn management instructions and added Flood/Natural Disaster incident types to `CrisisSelector`.
- **System Health Endpoint**: Created `GET /api/sos/health` route for load balancer uptime and health checking.
- **Geospatial Utilities**: Added `src/utils/geo.utils.js` for Haversine distance calculations, proximity radius checking, and GPS coordinate validation with full Jest test suite.
- **Android Release Guide**: Added `frontend/android/ANDROID_BUILD.md` containing step-by-step keystore signing, ProGuard configuration, and Play Console submission checklist.
- **Privacy Policy**: Created comprehensive, Play Store-compliant `public/privacy.html` covering emergency geolocation, health triage, and account data deletion.
- **PWA Asset Manifest**: Updated `manifest.json` with theme color `#dc2626`, standalone display mode, emergency responder categories, and Play Store package metadata.

### Security
- **Firebase Key Exposure Fix**: Neutralized and securely replaced placeholder Firebase credentials in client JavaScript.
- **Security Hardening**: Documented strict `.env` variables and environment separation in `.env.example`.

### Refactored & Optimized
- **Native Geolocation Fallback**: Enhanced `useLocation` hook to automatically detect Capacitor native environment and seamlessly fallback to Web Geolocation API in browser.
- **Constants Centralization**: Extracted socket events, crisis categories, and queue keys into `src/constants.js`.
- **Service Worker Cache Invalidation**: Bumped service worker cache name to `nearhelp-v2` for immediate client cache invalidation on release.

---

## [1.0.0] - Initial Release
- Multi-channel SOS broadcasting with Socket.io real-time websockets.
- Interactive Leaflet emergency map with live responder tracking.
- AI emergency triage guidance with fallback protocol.
- Voice assistant emergency trigger integration.
