# NearHelp Architecture

## System Overview

NearHelp is a real-time emergency response platform built with a microservices-inspired architecture using Node.js, MongoDB, and WebSockets.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │    Admin     │  │   Mobile     │      │
│  │  (Leaflet)   │  │  Dashboard   │  │  (Future)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express.js Server (server.js)                       │   │
│  │  - CORS, Helmet, Rate Limiting                       │   │
│  │  - Request Validation                                │   │
│  │  - Error Handling                                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   REST API Routes       │   │   WebSocket Layer       │
│  ┌──────────────────┐   │   │  ┌──────────────────┐   │
│  │  /api/auth       │   │   │  │  Socket.io       │   │
│  │  /api/sos        │   │   │  │  - SOS Events    │   │
│  └──────────────────┘   │   │  │  - Chat Events   │   │
└─────────────────────────┘   │  │  - Location      │   │
            │                 │  └──────────────────┘   │
            ▼                 └─────────────────────────┘
┌─────────────────────────┐               │
│   Controller Layer      │               │
│  ┌──────────────────┐   │               │
│  │  Auth Controller │   │               │
│  │  SOS Controller  │   │               │
│  └──────────────────┘   │               │
└─────────────────────────┘               │
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Firebase   │  │   Gemini AI  │  │  Geospatial  │      │
│  │     Auth     │  │   Guidance   │  │   Queries    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MongoDB (Mongoose ODM)                              │   │
│  │  - User Collection (2dsphere index)                  │   │
│  │  - SOS Collection (2dsphere index)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. API Gateway (server.js)

**Responsibilities:**
- Request routing
- Security middleware (Helmet, CORS, Rate Limiting)
- Body parsing and validation
- Error handling
- WebSocket initialization

**Key Middleware:**
- `helmet()` - Security headers
- `cors()` - Cross-origin resource sharing
- `express.json()` - JSON body parser
- `generalLimiter` - Rate limiting
- `errorHandler` - Centralized error handling

### 2. Authentication Layer

**Components:**
- Firebase Admin SDK for token verification
- MongoDB for user profile storage
- JWT for session management

**Flow:**
```
Client → Firebase Auth → Token → Backend Verification → MongoDB Sync
```

### 3. SOS Broadcasting System

**Real-time Flow:**
```
1. User triggers SOS
2. Location captured (Geolocation API)
3. Socket.io broadcasts to nearby users
4. MongoDB geospatial query ($near)
5. AI generates guidance (Gemini API)
6. Responders notified in real-time
7. Live location tracking begins
```

**Key Features:**
- Geospatial radius matching (MongoDB 2dsphere)
- Multi-crisis type support
- Anonymous broadcasting option
- Real-time responder tracking

### 4. AI Integration

**Gemini AI Pipeline:**
```
Crisis Type + Description
        ↓
   Prompt Engineering
        ↓
   Gemini API Call
        ↓
   JSON Response Parsing
        ↓
   Structured Guidance
   - First Response Steps
   - Emergency Summary
   - Debrief Questions
```

**Fallback Strategy:**
- Primary: Gemini API
- Fallback: Hardcoded guidance templates
- Error handling: Always return actionable guidance

### 5. WebSocket Events

**Client → Server:**
- `trigger_sos` - Broadcast emergency
- `accept_sos` - Responder accepts
- `send_message` - Chat message
- `update_location` - Location update
- `resolve_sos` - Close incident
- `responder_moved` - Live tracking

**Server → Client:**
- `sos_confirmed` - SOS created
- `new_sos` - Emergency nearby
- `responder_assigned` - Help coming
- `new_message` - Chat update
- `responder_moved` - Responder location
- `ai_automated_call` - AI action
- `sos_resolved` - Incident closed

### 6. Database Schema

**User Model:**
```javascript
{
  firebaseUid: String (unique),
  name: String,
  email: String (unique),
  phone: String,
  role: Enum ['citizen', 'responder', 'admin'],
  skills: [String],
  rating: Number,
  location: {
    type: 'Point',
    coordinates: [lng, lat] // GeoJSON format
  }
}
```

**SOS Model:**
```javascript
{
  broadcaster: ObjectId (ref: User),
  crisisTypes: [Enum],
  location: {
    type: 'Point',
    coordinates: [lng, lat]
  },
  isAnonymous: Boolean,
  status: Enum ['active', 'resolved', 'flagged'],
  responders: [{
    user: ObjectId,
    status: Enum,
    eta: String
  }],
  notifiedCount: Number
}
```

**Indexes:**
- `User.location` - 2dsphere (geospatial queries)
- `SOS.location` - 2dsphere (radius matching)
- `User.firebaseUid` - unique
- `User.email` - unique

## Security Architecture

### Defense Layers

1. **Network Layer**
   - CORS with whitelist
   - Rate limiting per endpoint
   - Helmet security headers

2. **Application Layer**
   - Input validation (Joi schemas)
   - NoSQL injection prevention
   - XSS protection

3. **Authentication Layer**
   - Firebase token verification
   - JWT session management
   - Role-based access control

4. **Data Layer**
   - Mongoose schema validation
   - Query sanitization
   - Encrypted connections

## Scalability Considerations

### Current Architecture
- Single Node.js instance
- Single MongoDB instance
- In-memory Socket.io

### Future Scaling Path

**Horizontal Scaling:**
```
Load Balancer
    ↓
[App 1] [App 2] [App 3]
    ↓
Redis (Socket.io adapter)
    ↓
MongoDB Replica Set
```

**Microservices Split:**
- Auth Service
- SOS Service
- AI Service
- Notification Service

## Performance Optimizations

1. **Database:**
   - Geospatial indexes for fast radius queries
   - Compound indexes on frequently queried fields
   - Connection pooling

2. **API:**
   - Response caching (future)
   - Pagination for list endpoints
   - Compression middleware

3. **WebSocket:**
   - Room-based broadcasting
   - Event throttling
   - Connection pooling

## Monitoring & Observability

**Current:**
- Winston logging
- Morgan HTTP logging
- Console error tracking

**Future:**
- APM (Application Performance Monitoring)
- Error tracking (Sentry)
- Metrics dashboard (Grafana)
- Distributed tracing

## Deployment Architecture

**Development:**
```
Local Machine → MongoDB Local → Firebase Dev
```

**Production:**
```
GitHub → CI/CD → Docker → Cloud Platform
                              ↓
                    MongoDB Atlas + Firebase Prod
```

## Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Node.js | Non-blocking I/O for real-time |
| Framework | Express.js | Mature, flexible, large ecosystem |
| Database | MongoDB | Geospatial queries, flexible schema |
| Real-time | Socket.io | Reliable WebSocket with fallbacks |
| Auth | Firebase | Managed auth, easy integration |
| AI | Gemini | Free tier, good for emergencies |
| Maps | Leaflet | Lightweight, open-source |

## Future Enhancements

1. **Mobile Apps** (React Native)
2. **Push Notifications** (FCM)
3. **Video Calls** (WebRTC)
4. **Offline Mode** (Service Workers)
5. **Analytics Dashboard**
6. **Machine Learning** (Incident prediction)

---

**Last Updated:** March 2026
