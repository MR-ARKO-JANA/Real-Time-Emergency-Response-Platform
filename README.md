# NearHelp - Real-Time Emergency Response Platform

A full-stack emergency response system that connects people in crisis with nearby responders using real-time geolocation, AI-powered guidance, and WebSocket communication.

## 🚀 Features

- **Real-Time SOS Broadcasting**: Instant emergency alerts with geospatial radius matching
- **AI Crisis Assistant**: Gemini-powered emergency guidance and automated service notifications
- **Live Location Tracking**: Real-time responder tracking with ETA calculations
- **Multi-Crisis Support**: Medical, Fire, Security, Health, Mechanic emergencies
- **Anonymous Mode**: Privacy-focused emergency broadcasting
- **WebSocket Communication**: Real-time chat between broadcasters and responders
- **Admin Dashboard**: Monitor all active and resolved incidents
- **Firebase Authentication**: Secure user authentication and authorization

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **MongoDB** + **Mongoose** - Database with geospatial indexing
- **Socket.io** - Real-time bidirectional communication
- **Firebase Admin SDK** - Authentication
- **Google Gemini AI** - Crisis guidance generation

### Frontend
- **Vanilla JavaScript** (ES6+) - Core logic
- **Leaflet.js** - Interactive mapping
- **Socket.io Client** - Real-time updates

## 📋 Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Firebase Project
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nearhelp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your `MONGO_URI`, `GEMINI_API_KEY`, and Firebase credentials.

4. **Setup Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com/).
   - Download the service account JSON and place it at `config/firebase-service-account.json`.

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the application**
   - Main App: `http://localhost:3000`
   - Admin Dashboard: `http://localhost:3000/admin.html`
   - API Docs: `http://localhost:3000/api-docs`

## 📚 API & WebSockets

### REST Endpoints
- `POST /api/auth/sync`: Sync Firebase user to MongoDB.
- `POST /api/sos/ai-guidance`: Get Gemini-powered crisis guidance.
- `GET /api/sos/alerts`: Get all SOS records (Admin).

### WebSocket Events
- `trigger_sos`: Broadcast emergency.
- `accept_sos`: Responder accepts incident.
- `send_message`: Real-time incident chat.
- `update_location`: GPS tracking updates.

## 🌐 Deployment

NearHelp is containerized and ready for cloud deployment.

### Docker (Recommended)
```bash
docker-compose up -d
```

### Hosting Options
- **Backend/Frontend**: Heroku, Railway, Render, DigitalOcean App Platform.
- **Database**: MongoDB Atlas (Free Tier available).

## 🔧 Troubleshooting & FAQ

- **Database Connection Error**: Ensure MongoDB service is running or check your Atlas IP whitelist.
- **Firebase Auth Error**: Verify `config/firebase-service-account.json` is present and valid.
- **Port In Use**: Change `PORT` in `.env` if 3000 is occupied.

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit changes.
4. Open a Pull Request.

---

**Built for emergency response and community safety**

## Deployment
This platform is deployed on [Render](https://render.com).
