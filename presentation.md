# NearHelp - activating your immediate community in a crisis

## 1. Introduction
When an emergency strikes—a medical issue, car breakdown, or safety threat—the fastest help is usually a neighbor or someone nearby, not the authorities who might take 30+ minutes to arrive. **NearHelp** bridges this gap, activating your immediate community to respond in real-time, augmented by AI to guide both victims and responders.

## 2. Core Features Implemented

### 🆘 SOS Broadcasting
- **One-Click Trigger:** Users can instantly broadcast an SOS with their precise, auto-detected location.
- **Geospatial Filtering:** Using MongoDB's `$near` operator on a `2dsphere` index, SOS alerts are instantly routed via WebSockets only to users within a configurable radius.
- **Live Maps:** A pulsing pin appears on a live interactive map for everyone in the vicinity.

### 🏃 Responder Flow
- **Opt-in Response:** Nearby users receive the alert and can tap "I'm Responding".
- **Live Tracking:** The broadcaster can see their responder's location moving towards them in real-time.
- **Crisis Coordination:** Secure, real-time chat rooms are created for the responder and the victim to communicate.
- **Incident Resolution:** Broadcasters can mark the crisis as resolved, shutting down the broadcast and instantly removing the map pin for everyone.

### 🤖 AI Crisis Assistant (Powered by Google Gemini)
- **First-Response Guidance:** Instantly provides situational guidance (e.g., "Don't move them if back injury suspected") based on the crisis type.
- **Emergency Summaries:** Generates a concise, pre-filled emergency script that a panicked user can simply read out loud when calling emergency services.
- **Post-Crisis Debrief:** Following resolution, the AI helps capture vital details for subsequent processing or reporting.

## 3. Technology Stack

### Frontend
- **HTML/CSS/JavaScript:** Pure, lightweight vanilla stack for blazing fast load times on mobile devices.
- **Socket.io-client:** For real-time event listening and broadcasting.
- **Leaflet.js:** Fast, open-source library for interactive maps and real-time marker tracking.

### Backend
- **Node.js & Express:** Robust handling of the core API routes and authentication.
- **Socket.io:** Handles all WebSockets for SOS broadcasts, live location updates, and chat rooms.
- **Firebase Admin SDK:** Secure authentication and JWT token verification.

### Database
- **MongoDB & Mongoose:** Highly efficient NoSQL structure.
- **Geospatial Indexing:** Core architecture leverages MongoDB's `2dsphere` indexes and `$near` queries to guarantee O(log N) lookup times for nearby users, avoiding heavy math on the Node server.

### AI Integration
- **Google Gemini API (`@google/generative-ai`):** Contextually aware LLM utilizing structured JSON responses for high-speed, predictable data extraction.

## 4. Workflows & Architecture
1. **The SOS Trigger:** A user hits SOS. The client fetches GPS coordinates and fires a REST API call to `/api/sos/trigger`.
2. **Database Save:** The SOS is logged in MongoDB as `"active"`.
3. **The Broadcast:** The backend fires a geo-query to find all user IDs within the radius. It cross-references these IDs against a `ConnectedUsers` memory map of active WebSockets and emits `new_sos` to *only* those sockets.
4. **The Response:** A responder taps "I'm Responding" -> Socket pushes a notification to the victim -> Room created -> Bi-directional communication channel opened.
5. **The AI Loop:** Concurrently, the backend asks Gemini for an action plan based on the crisis type. The response is parsed and pushed to the victim's UI immediately.

## 5. Unique Selling Proposition (USP)
We don't replace emergency services; we **buy time**. Emergency services are centralized and slow. NearHelp is decentralized and instant.
Additionally, our **AI integration stabilizes the victim**, providing calming instructions and a readable script while they wait for help to arrive.

## 6. Future Roadmap 
- **Skill Registry :** Users registering skills (CPR, Medical) to get priority alerts or distinct map markers.
- **Trust & Verification System :** A rating system for responders to combat misuse, and an anonymous broadcast mode for domestic threat situations.
- **Admin Dashboard :** A city-level heatmap of ongoing crises and response time analytics for local authorities.
- **Offline SMS Fallback :** Allowing the app to format and send a structured SMS to a Twilio endpoint if internet connectivity fails.
