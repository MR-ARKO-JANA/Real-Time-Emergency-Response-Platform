// NearHelp Core Logic - Mocking WebSocket & AI for Hackathon Prototype

document.addEventListener('DOMContentLoaded', () => {
  // --------- DOM Elements ---------
  const mapElement = document.getElementById('map');
  const idlePanel = document.getElementById('idle-panel');
  const activePanel = document.getElementById('active-panel');
  const btnTriggerSos = document.getElementById('btn-trigger-sos');
  const btnResolveSos = document.getElementById('btn-resolve-sos');
  const crisisCards = document.querySelectorAll('.crisis-card');
  const anonToggle = document.getElementById('anon-toggle');
  const activeCrisisBadge = document.getElementById('active-crisis-badge');

  const respondersList = document.getElementById('responders-list');
  const statNotified = document.getElementById('notified-count');
  const statResponds = document.getElementById('responders-count');
  const statEta = document.getElementById('eta-val');

  const aiPanel = document.getElementById('ai-panel');
  const fabAi = document.getElementById('fab-ai');
  const closeAi = document.getElementById('close-ai');
  const aiGuidance = document.getElementById('ai-guidance');
  const aiSummary = document.getElementById('ai-summary');
  const aiStatusDot = document.getElementById('ai-status-dot');

  const chatPanel = document.getElementById('chat-panel');
  const closeChat = document.getElementById('close-chat');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');
  const chatRoomIdLabel = document.getElementById('chat-room-id');

  const resolveModal = document.getElementById('resolve-modal');
  const ratingList = document.getElementById('rating-list');
  const btnSkipRating = document.getElementById('btn-skip-rating');
  const btnSubmitRating = document.getElementById('btn-submit-rating');
  const toastContainer = document.getElementById('toast-container');
  const btnDashboard = document.getElementById('btn-dashboard');
  const responderToggle = document.getElementById('responder-toggle');

  // --------- State ---------
  let map, userMarker, sosMarker;
  let simulatedResponders = [];
  let responderMarkers = {};
  let isBroadcasting = false;
  let isResponder = true;
  let selectedCrisis = 'medical';
  let userLat = 51.505;
  let userLng = -0.09;
  let activeSosId = null;
  let watchId = null;

  // --------- Map Initialization ---------
  function initMap() {
    map = L.map(mapElement, { zoomControl: false }).setView([userLat, userLng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap | NearHelp',
      maxZoom: 19
    }).addTo(map);

    const userIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [16, 16]
    });
    userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
          map.setView([userLat, userLng], 15);
          userMarker.setLatLng([userLat, userLng]);
          const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
          socket.emit('update_location', {
            lat: userLat,
            lng: userLng,
            uid: userMeta.uid,
            name: userMeta.name || userMeta.email?.split('@')[0]
          });
        },
        (error) => {
          console.warn("Geolocation access denied or failed.");
        }
      );
    }
  }

  // --------- UI Interaction ---------

  responderToggle.addEventListener('change', (e) => {
    isResponder = e.target.checked;
    showToast(isResponder ? "Responder Mode Enabled" : "Responder Mode Disabled");
  });

  crisisCards.forEach(card => {
    card.addEventListener('click', () => {
      crisisCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCrisis = card.getAttribute('data-type');
    });
  });

  crisisCards[0].classList.add('selected');

  btnTriggerSos.addEventListener('click', () => {
    const isAnon = anonToggle.checked;
    startSosBroadcast(selectedCrisis, isAnon);
  });

  btnResolveSos.addEventListener('click', () => {
    stopSosBroadcast();
    showResolveModal();
  });

  fabAi.addEventListener('click', () => aiPanel.classList.add('open'));
  closeAi.addEventListener('click', () => aiPanel.classList.remove('open'));

  closeChat.addEventListener('click', () => chatPanel.classList.add('hidden'));

  btnDashboard.addEventListener('click', () => window.location.href = 'admin.html');

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'authentication.html';
    });
  }

  btnSkipRating.addEventListener('click', hideResolveModal);
  btnSubmitRating.addEventListener('click', () => {
    showToast('<i class="ph-fill ph-check-circle"></i> Ratings submitted successfully');
    hideResolveModal();
  });

  // --------- Messaging Logic ---------

  function sendMessage() {
    const text = chatInput.value.trim();
    if (text && activeSosId) {
      socket.emit('send_message', { sosId: activeSosId, text });
      chatInput.value = '';
    }
  }

  btnSendChat.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  function addChatMessage(msg) {
    const div = document.createElement('div');
    if (msg.type === 'system') {
      div.className = 'message system';
      div.innerText = msg.text;
    } else {
      const isMe = msg.senderId === socket.id;
      div.className = `message ${isMe ? 'sent' : 'received'}`;
      div.innerHTML = `
        <span class="msg-sender">${isMe ? 'You' : msg.sender}</span>
        ${msg.text}
      `;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function openChat(sosId) {
    activeSosId = sosId;
    chatRoomIdLabel.innerText = `#${sosId}`;
    chatPanel.classList.remove('hidden');
  }

  // --------- WebSocket Event Listeners ---------

  const socket = io();
  let currentSosId = null;

  setInterval(() => {
    const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
    socket.emit('update_location', {
      lat: userLat,
      lng: userLng,
      uid: userMeta.uid,
      name: userMeta.name || userMeta.email?.split('@')[0]
    });
  }, 10000);

  const initUserMeta = JSON.parse(localStorage.getItem('user') || '{}');
  socket.emit('update_location', {
    lat: userLat,
    lng: userLng,
    uid: initUserMeta.uid,
    name: initUserMeta.name || initUserMeta.email?.split('@')[0]
  });

  function startSosBroadcast(type, isAnon) {
    isBroadcasting = true;
    idlePanel.classList.add('hidden');
    activePanel.classList.remove('hidden');
    activeCrisisBadge.innerText = type.charAt(0).toUpperCase() + type.slice(1);

    map.removeLayer(userMarker);
    const sosIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-sos"><div class="marker-sos-inner"></div></div>`,
      iconSize: [40, 40]
    });
    sosMarker = L.marker([userLat, userLng], { icon: sosIcon }).addTo(map);

    const radius = L.circle([userLat, userLng], {
      color: '#f43f5e', fillOpacity: 0.1, radius: 1000
    }).addTo(map);
    sosMarker.radiusLayer = radius;

    fabAi.classList.remove('hidden');
    aiPanel.classList.add('open');
    generateAIGuidance(type);

    socket.emit('trigger_sos', { type, lat: userLat, lng: userLng, isAnon });

    statNotified.innerText = 'Searching...';
    showToast(`<i class="ph-fill ph-broadcast"></i> SOS Broadcasted ${isAnon ? 'Anonymously' : ''}`);
  }

  function stopSosBroadcast() {
    isBroadcasting = false;

    if (currentSosId) {
      socket.emit('resolve_sos', { sosId: currentSosId });
      currentSosId = null;
    }

    activePanel.classList.add('hidden');
    idlePanel.classList.remove('hidden');
    aiPanel.classList.remove('open');
    chatPanel.classList.add('hidden');
    fabAi.classList.add('hidden');

    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }

    if (sosMarker) {
      if (sosMarker.radiusLayer) map.removeLayer(sosMarker.radiusLayer);
      map.removeLayer(sosMarker);
    }
    userMarker.addTo(map);

    Object.values(responderMarkers).forEach(m => map.removeLayer(m));
    responderMarkers = {};
    simulatedResponders = [];
    respondersList.innerHTML = '<div class="empty-state">Waiting for nearby responders to accept...</div>';

    statNotified.innerText = '0';
    statResponds.innerText = '0';
    statEta.innerText = '--';
  }

  socket.on('sos_confirmed', (data) => {
    currentSosId = data.id;
    activeSosId = data.id;
    setTimeout(() => { statNotified.innerText = '12'; }, 1000);
  });

  socket.on('responder_assigned', (data) => {
    if (data.sosId === currentSosId) {
      addResponder(data.responder);
    }
  });

  socket.on('new_sos', (data) => {
    if (!isBroadcasting && isResponder) {
      showToast(`<i class="ph-fill ph-warning-circle" style="color:var(--primary)"></i> Nearby Emergency: ${data.type}`);

      const sIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-sos" style="width:24px;height:24px;animation:none;"><div class="marker-sos-inner" style="width:12px;height:12px;"></div></div>`
      });

      const marker = L.marker([data.lat, data.lng], { icon: sIcon }).addTo(map);
      marker.bindPopup(`
        <div style="padding:10px;">
          <strong style="display:block;margin-bottom:5px;">${data.type.toUpperCase()} Emergency</strong>
          <button class="btn-primary" style="width:100%;padding:8px;font-size:0.8rem;" onclick="acceptEmergency('${data.id}')">Accept Incident</button>
        </div>
      `).openPopup();

      responderMarkers[data.id] = marker;
    }
  });

  window.acceptEmergency = function (sosId) {
    socket.emit('accept_sos', { sosId });
    showToast("You have accepted the emergency!");
    openChat(sosId);

    // Start Live Tracking
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          socket.emit('responder_moved', {
            sosId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => console.warn("Live tracking error", err),
        { enableHighAccuracy: true }
      );
    }

    if (responderMarkers[sosId]) {
      responderMarkers[sosId].closePopup();
    }
  };

  socket.on('new_message', (msg) => {
    addChatMessage(msg);
    if (chatPanel.classList.contains('hidden')) {
      showToast(`<i class="ph ph-chat"></i> New message available`);
    }
  });

  socket.on('chat_closed', (data) => {
    if (activeSosId === data.sosId) {
      showToast("Incident resolved. Chat closed.");
      chatPanel.classList.add('hidden');
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    }
  });

  socket.on('sos_resolved', (data) => {
    if (responderMarkers[data.sosId]) {
      map.removeLayer(responderMarkers[data.sosId]);
      delete responderMarkers[data.sosId];
    }
    showToast("Incident has been resolved by the broadcaster.");
  });

  socket.on('responder_moved', (data) => {
    // If I am the broadcaster, update the responder's marker
    if (isBroadcasting && responderMarkers[data.responderId]) {
      responderMarkers[data.responderId].setLatLng([data.lat, data.lng]);
    }
    // Note: In Phase 3 simple version, broadcaster also uses responderMarkers to track people coming to them
  });

  // --------- AI Fetch Logic ---------

  async function generateAIGuidance(type) {
    // Show shimmers
    if (aiStatusDot) {
      aiStatusDot.className = 'ai-status-dot';
      aiStatusDot.title = 'AI Connecting...';
    }
    aiGuidance.innerHTML = `<div class="loading-shimmer ai-shimmer"></div><div class="loading-shimmer ai-shimmer"></div>`;
    aiSummary.innerHTML = `<div class="loading-shimmer ai-shimmer" style="height: 60px;"></div>`;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sos/ai-guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ crisisType: type })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch AI guidance');
      }

      let html = '';
      if (data.firstResponseGuidance && Array.isArray(data.firstResponseGuidance)) {
        data.firstResponseGuidance.forEach((step, i) => {
          html += `<div class="ai-step" style="animation-delay: ${i * 0.2}s">${i + 1}. ${step}</div>`;
        });
      }
      aiGuidance.innerHTML = html;

      aiSummary.innerHTML = `
            ${data.emergencySummary || 'Summary not available.'}
            <button class="icon-btn btn-copy" title="Copy to clipboard"><i class="ph ph-copy"></i></button>
        `;

      if (aiStatusDot) {
        aiStatusDot.className = 'ai-status-dot online';
        aiStatusDot.title = 'AI Online';
      }
    } catch (err) {
      console.error("AI Error:", err);
      aiGuidance.innerHTML = "<p style='color:var(--primary)'>Failed to load AI guidance.</p>";
      if (aiStatusDot) {
        aiStatusDot.className = 'ai-status-dot offline';
        aiStatusDot.title = 'AI Offline';
      }
    }
  }

  // function simulateBackendInteractions() removed in favor of real WebSockets

  function addResponder(r) {
    if (simulatedResponders.length === 0) respondersList.innerHTML = ''; // Clear empty state

    simulatedResponders.push(r);
    statResponds.innerText = simulatedResponders.length;

    // Calculate best ETA
    const etas = simulatedResponders.map(res => parseInt(res.time.split(' ')[0]));
    statEta.innerText = Math.min(...etas) + ' min';

    // Add to UI List
    const div = document.createElement('div');
    div.className = 'responder-item';
    div.innerHTML = `
      <img src="https://i.pravatar.cc/100?img=${r.img}" alt="${r.name}">
      <div class="responder-info">
        <span class="r-name">${r.name}</span>
        <div class="r-meta">
          <span>ETA: ${r.time}</span>
          ${r.skill !== 'Neighbour' ? `<span class="r-skill">${r.skill}</span>` : ''}
        </div>
      </div>
      <div class="responder-actions">
        <button class="btn-chat" onclick="alert('Mock Chat Opened!')"><i class="ph-fill ph-chat-teardrop-dots"></i></button>
      </div>
    `;
    respondersList.appendChild(div);

    // Add UI Marker
    const rIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-responder" style="background-image: url('https://i.pravatar.cc/100?img=${r.img}')"></div>`,
      iconSize: [32, 32]
    });
    responderMarkers[r.id] = L.marker([r.lat, r.lng], { icon: rIcon }).addTo(map);

    showToast(`<i class="ph-fill ph-user-plus"></i> ${r.name} is responding!`);
  }

  // --------- Utilities ---------

  function showToast(html) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 4000);
  }

  function showResolveModal() {
    resolveModal.classList.remove('hidden');
    ratingList.innerHTML = '';

    if (simulatedResponders.length === 0) {
      ratingList.innerHTML = '<p style="color:var(--text-muted)">No registered responders for this event.</p>';
      return;
    }

    simulatedResponders.forEach(r => {
      const item = document.createElement('div');
      item.className = 'rating-item';
      item.innerHTML = `
        <img src="https://i.pravatar.cc/100?img=${r.img}">
        <div style="flex:1; text-align:left;">
          <div style="font-weight:600">${r.name}</div>
          <div style="font-size:0.8rem; color:var(--text-muted)">${r.skill}</div>
        </div>
        <div class="stars" id="stars-${r.id}">
          <i class="ph-fill ph-star" data-val="1"></i>
          <i class="ph-fill ph-star" data-val="2"></i>
          <i class="ph-fill ph-star" data-val="3"></i>
          <i class="ph-fill ph-star" data-val="4"></i>
          <i class="ph-fill ph-star" data-val="5"></i>
        </div>
      `;
      ratingList.appendChild(item);

      // Simple star UI logic
      const stars = item.querySelectorAll('.ph-star');
      stars.forEach(s => {
        s.addEventListener('click', (e) => {
          const val = parseInt(e.target.getAttribute('data-val'));
          stars.forEach(st => {
            if (parseInt(st.getAttribute('data-val')) <= val) st.classList.add('active');
            else st.classList.remove('active');
          });
        });
      });
    });
  }

  function hideResolveModal() {
    resolveModal.classList.add('hidden');
  }

  // Init
  initMap();
});
