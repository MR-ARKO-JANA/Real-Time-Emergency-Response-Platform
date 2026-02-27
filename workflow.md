# Near Help – 20 Hour Hackathon Master Plan

## Rules

* No optional features (SMS, Guardian, Welfare).
* Use Vanilla JS with a single global `state` object.
* No build tools. Use CDN for Leaflet, Socket.io, Tailwind.
* Build minimum UI to prove concept.

---

# Phase 1 – Backend & Setup (0–3h)

## Backend Setup

```bash
npm init -y
npm i express socket.io mongoose jsonwebtoken dotenv cors
```

Create `server.js` with Express + Socket.io.

## Database (MongoDB)

### Users Schema

```js
{
  name,
  role,
  skills,
  location: {
    type: "Point",
    coordinates: [lng, lat]
  }
}
```

### Incidents Collection

* Must apply **2dsphere index** on `location`.

---

# Frontend Setup

Create exactly:

* `index.html`
* `style.css`
* `app.js`

Add CDNs:

* Leaflet
* Socket.io
* CSS

SPA Sections:

* `#login-screen`
* `#map-screen`
* `#chat-screen`

CSS:

```css
.hidden { display: none; }
```

---

# Phase 2 – SOS + Map (3–8h)

## Map Initialization

```js
const map = L.map('map').setView([lat, lng], 13);
navigator.geolocation.getCurrentPosition(...);
```

Use OpenStreetMap tiles.

## Trigger SOS

Button: HELP + crisis dropdown

```js
socket.emit("trigger_sos", { crisisType, lat, lng });
```

## Backend Radius Logic

* Save incident to MongoDB.
* Use `$near` query (500m / 1km).
* Emit `incoming_sos` only to nearby users.

## Marker Management (Critical)

```js
let state = { markers: {} };

state.markers[id] = L.marker([lat, lng]).addTo(map);
```

---

# Phase 3 – Responder Flow (8–12h)

## Accept SOS

```js
socket.emit("accept_sos", { incidentId });
```

## Live Tracking

```js
navigator.geolocation.watchPosition(...);
socket.emit("responder_moved", { incidentId, lat, lng });
```

Broadcaster updates:

```js
state.markers[id].setLatLng([newLat, newLng]);
```

## Chat (Socket Rooms)

```js
socket.join(incidentId);
```

Frontend:

```js
let li = document.createElement("li");
li.innerText = msg;
ul.appendChild(li);
```

## Resolve Incident

```js
socket.emit("sos_resolved");
```

Frontend cleanup:

```js
map.removeLayer(state.markers[id]);
delete state.markers[id];
```

---

# Phase 4 – AI Assistant (12–14h)

## Backend Route

`POST /api/get-guidance`

Prompt:

> User facing [Crisis Type] emergency.
> Return 3 bullet first-aid steps + 2 sentence emergency call script.

Frontend:

```js
document.getElementById("ai-panel").innerText = response;
```

---

# Phase 5 – Extra Marks (14–17h)

## Skill Registry

* Dropdown: None / CPR / Doctor
* Change marker color based on skill.

## Anonymous Mode

* Checkbox → send "Anonymous User" instead of real name.

## Trust System

* "Flag as Fake" → increment `flags` in DB.

## Admin Dashboard

* Visible only to admin.
* Fetch active incidents.
* Render rows manually.
* "Suspend User" → set `suspended: true`.

---

# Phase 6 – Lockdown (17–20h)

1. Stop adding features.
2. Test resolve flow (remove markers properly).
3. Add backup button with hardcoded lat/lng.
4. Rehearse demo strictly:

Victim → Trigger SOS → Responder Accept → Move → AI → Chat → Resolve

---

# Tech Stack

## Frontend

* HTML
* Vanilla JS
* Leaflet
* Socket.io (client)
* Tailwind (CDN)

## Backend

* Node.js
* Express
* Socket.io
* MongoDB + Mongoose
* OpenAI/Gemini API

---

# Core Scoring Focus

* Geospatial radius query
* Live tracking
* AI integration
* Working resolve flow
* Minimal admin + trust UI
