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

  const resolveModal = document.getElementById('resolve-modal');
  const ratingList = document.getElementById('rating-list');
  const btnSkipRating = document.getElementById('btn-skip-rating');
  const btnSubmitRating = document.getElementById('btn-submit-rating');
  const toastContainer = document.getElementById('toast-container');
  const btnDashboard = document.getElementById('btn-dashboard');

  // --------- State ---------
  let map, userMarker, sosMarker;
  let simulatedResponders = [];
  let responderMarkers = {};
  let isBroadcasting = false;
  let selectedCrisis = 'medical';
  let userLat = 51.505; // Default Mock Location (London or arbitrary)
  let userLng = -0.09;
  let simInterval;

  // --------- Map Initialization ---------
  function initMap() {
    map = L.map(mapElement, { zoomControl: false }).setView([userLat, userLng], 15);

    // Using standard dark tiles or styled OSM
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap | NearHelp',
      maxZoom: 19
    }).addTo(map);

    // Initial User Location Pin (Idle)
    const userIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>`,
      iconSize: [16, 16]
    });
    userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);

    // Request Real Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
          map.setView([userLat, userLng], 15);
          userMarker.setLatLng([userLat, userLng]);
          socket.emit('update_location', { lat: userLat, lng: userLng });
        },
        (error) => {
          console.warn("Geolocation access denied or failed, using default location.");
        }
      );
    }
  }

  // --------- UI Interaction ---------

  // Select Crisis Type
  crisisCards.forEach(card => {
    card.addEventListener('click', () => {
      crisisCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCrisis = card.getAttribute('data-type');
    });
  });

  // Default select first
  crisisCards[0].classList.add('selected');

  // Trigger SOS
  btnTriggerSos.addEventListener('click', () => {
    const isAnon = anonToggle.checked;
    startSosBroadcast(selectedCrisis, isAnon);
  });

  // Resolve SOS
  btnResolveSos.addEventListener('click', () => {
    stopSosBroadcast();
    showResolveModal();
  });

  // AI Panel
  fabAi.addEventListener('click', () => aiPanel.classList.add('open'));
  closeAi.addEventListener('click', () => aiPanel.classList.remove('open'));

  // Dashboard Nav
  btnDashboard.addEventListener('click', () => window.location.href = 'admin.html');

  // Modal Actions
  btnSkipRating.addEventListener('click', hideResolveModal);
  btnSubmitRating.addEventListener('click', () => {
    showToast('<i class="ph-fill ph-check-circle"></i> Ratings submitted successfully');
    hideResolveModal();
  });

  // --------- Core Application Logic (Mocked) ---------

  // --------- Socket.IO Real-Time Engine ---------

  const socket = io(); // Connects to the same origin
  let currentSosId = null;

  // Track My Location (Simulated)
  setInterval(() => {
    socket.emit('update_location', { lat: userLat, lng: userLng });
  }, 10000);

  // Initial Location
  socket.emit('update_location', { lat: userLat, lng: userLng });

  function startSosBroadcast(type, isAnon) {
    isBroadcasting = true;

    // Update UI Panels
    idlePanel.classList.add('hidden');
    activePanel.classList.remove('hidden');
    activeCrisisBadge.innerText = type.charAt(0).toUpperCase() + type.slice(1);

    // Add glowing SOS pin to map
    map.removeLayer(userMarker);
    const sosIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-sos"><div class="marker-sos-inner"></div></div>`,
      iconSize: [40, 40]
    });
    sosMarker = L.marker([userLat, userLng], { icon: sosIcon }).addTo(map);

    // Map radius circle
    const radius = L.circle([userLat, userLng], {
      color: '#f43f5e', fillOpacity: 0.1, radius: 1000 // 1km radius
    }).addTo(map);
    sosMarker.radiusLayer = radius;

    // Trigger AI Generation (Backend)
    fabAi.classList.remove('hidden');
    aiPanel.classList.add('open');
    generateAIGuidance(type);

    // Emit Real WebSocket Event
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

    // Reset UI
    activePanel.classList.add('hidden');
    idlePanel.classList.remove('hidden');
    aiPanel.classList.remove('open');
    fabAi.classList.add('hidden');

    // Reset Map
    if (sosMarker) {
      if (sosMarker.radiusLayer) map.removeLayer(sosMarker.radiusLayer);
      map.removeLayer(sosMarker);
    }
    userMarker.addTo(map);

    // Clear Responders
    Object.values(responderMarkers).forEach(m => map.removeLayer(m));
    responderMarkers = {};
    simulatedResponders = [];
    respondersList.innerHTML = '<div class="empty-state">Waiting for nearby responders to accept...</div>';

    // Reset Stats
    statNotified.innerText = '0';
    statResponds.innerText = '0';
    statEta.innerText = '--';
  }

  // --- WebSocket Event Listeners ---

  socket.on('sos_confirmed', (data) => {
    currentSosId = data.id;
    // Simulate quick notification count increment
    setTimeout(() => { statNotified.innerText = '42'; }, 800);
    setTimeout(() => { statNotified.innerText = '118'; }, 1500);
  });

  socket.on('responder_assigned', (data) => {
    if (data.sosId === currentSosId) {
      addResponder(data.responder);
    }
  });

  // Example listener for responders seeing someone else's SOS
  socket.on('new_sos', (data) => {
    if (!isBroadcasting) {
      showToast(`<i class="ph-fill ph-warning-circle" style="color:var(--primary)"></i> Nearby Emergency: ${data.type}`);
      // Draw pin on my map
      const sIcon = L.divIcon({ className: 'custom-marker', html: `<div class="marker-sos" style="width:24px;height:24px;animation:none;"><div class="marker-sos-inner" style="width:12px;height:12px;"></div></div>` });
      L.marker([data.lat, data.lng], { icon: sIcon }).addTo(map);
    }
  });

  // --------- AI Fetch Logic ---------

  async function generateAIGuidance(type) {
    // Show shimmers
    aiGuidance.innerHTML = `<div class="loading-shimmer ai-shimmer"></div><div class="loading-shimmer ai-shimmer"></div>`;
    aiSummary.innerHTML = `<div class="loading-shimmer ai-shimmer" style="height: 60px;"></div>`;

    try {
      const response = await fetch('/api/ai-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crisisType: type })
      });

      const data = await response.json();

      let html = '';
      data.steps.forEach((step, i) => {
        html += `<div class="ai-step" style="animation-delay: ${i * 0.2}s">${i + 1}. ${step}</div>`;
      });
      aiGuidance.innerHTML = html;

      aiSummary.innerHTML = `
            ${data.summary}
            <button class="icon-btn btn-copy" title="Copy to clipboard"><i class="ph ph-copy"></i></button>
        `;
    } catch (err) {
      console.error("AI Error:", err);
      aiGuidance.innerHTML = "<p style='color:var(--primary)'>Failed to load AI guidance.</p>";
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
