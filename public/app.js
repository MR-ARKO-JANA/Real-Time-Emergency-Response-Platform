// NearHelp Core Logic — Tactical HUD Edition
// Preserves all WebSocket, AI, Map, and Chat functionality from original

document.addEventListener('DOMContentLoaded', () => {
  // ═══════════════ DOM ELEMENTS ═══════════════
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
  const aiInput = document.getElementById('ai-input');
  const btnSendAi = document.getElementById('btn-send-ai');

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
  const profileModal = document.getElementById('profile-modal');
  const btnCloseProfile = document.getElementById('btn-close-profile');
  const profileBtn = document.getElementById('profile-btn');

  // ═══════════════ STATE ═══════════════
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
  let selectedCrisisTypes = ['medical'];

  // ═══════════════ TAB/VIEW NAVIGATION ═══════════════
  const navTabs = document.querySelectorAll('.nav-tab');
  const mobileTabs = document.querySelectorAll('.mobile-tab');
  const viewSections = document.querySelectorAll('.view-section');

  function switchTab(tabId) {
    // Update desktop nav
    navTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    // Update mobile nav
    mobileTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    // Show/hide views
    viewSections.forEach(section => {
      section.classList.toggle('active', section.id === `view-${tabId}`);
    });
    // Adjust map scrim based on active view
    const mapScrim = document.getElementById('map-scrim');
    if (tabId === 'community-map') {
      mapScrim.style.opacity = '0.3';
    } else {
      mapScrim.style.opacity = '1';
    }
    // Refresh map when switching views
    if (map) {
      setTimeout(() => map.invalidateSize(), 100);
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.dataset.tab);
    });
  });

  mobileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // ═══════════════ MODE TOGGLE (Citizen / Responder) ═══════════════
  const modeCitizenBtn = document.getElementById('mode-citizen');
  const modeResponderBtn = document.getElementById('mode-responder');

  function setMode(mode) {
    isResponder = mode === 'responder';
    if (mode === 'responder') {
      modeResponderBtn.className = 'px-unit-xs py-unit-2xs rounded-DEFAULT bg-surface-bright text-on-surface font-label-caps text-label-caps uppercase';
      modeCitizenBtn.className = 'px-unit-xs py-unit-2xs rounded-DEFAULT text-on-surface-variant hover:text-on-surface font-label-caps text-label-caps uppercase transition-colors';
      showToast('Responder Mode Enabled');
    } else {
      modeCitizenBtn.className = 'px-unit-xs py-unit-2xs rounded-DEFAULT bg-surface-bright text-on-surface font-label-caps text-label-caps uppercase';
      modeResponderBtn.className = 'px-unit-xs py-unit-2xs rounded-DEFAULT text-on-surface-variant hover:text-on-surface font-label-caps text-label-caps uppercase transition-colors';
      showToast('Citizen Mode Enabled');
    }
  }

  if (modeCitizenBtn) modeCitizenBtn.addEventListener('click', () => setMode('citizen'));
  if (modeResponderBtn) modeResponderBtn.addEventListener('click', () => setMode('responder'));

  // ═══════════════ USER PROFILE ═══════════════
  async function initUserProfile() {
    let userMeta = JSON.parse(localStorage.getItem('user') || '{}');

    if (!userMeta.name && userMeta.uid) {
      try {
        const res = await fetch(`/api/auth/profile/${userMeta.uid}`);
        if (res.ok) {
          const data = await res.json();
          userMeta = {
            email: data.email || userMeta.email,
            uid: data.firebaseUid || userMeta.uid,
            name: data.name || userMeta.name || 'Set Your Name',
            phone: data.phone || userMeta.phone || 'N/A',
            role: data.role || userMeta.role || 'citizen'
          };
          localStorage.setItem('user', JSON.stringify(userMeta));
          if (!profileModal.classList.contains('hidden')) {
            updateProfileModalUI(userMeta);
          }
        } else if (res.status === 404 && userMeta.uid) {
          updateProfileModalUI(userMeta);
          fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firebaseUid: userMeta.uid,
              name: userMeta.name || userMeta.email?.split('@')[0],
              email: userMeta.email,
              phone: userMeta.phone,
              role: userMeta.role
            })
          }).catch(() => {});
        }
      } catch (err) { /* Silently fail */ }
    }

    const userName = userMeta.name || userMeta.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();

    // Update profile avatar in header
    const profileBtnEl = document.getElementById('profile-btn');
    if (profileBtnEl) {
      const colors = ['#ff516a', '#0566d9', '#4cd7f6', '#009eb9', '#ffb2b7'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      profileBtnEl.style.background = color;
      profileBtnEl.innerHTML = `<span class="text-white font-bold text-sm">${userInitial}</span>`;
    }
  }

  function generateAvatar(name, size = 40) {
    const initial = (name || 'U').charAt(0).toUpperCase();
    const colors = ['#ff516a', '#0566d9', '#4cd7f6', '#009eb9', '#ffb2b7', '#93000a', '#004395'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect fill='${encodeURIComponent(color)}' rx='${size/2}' width='${size}' height='${size}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='${size / 2.2}' font-family='Inter,Arial' font-weight='bold'%3E${initial}%3C/text%3E%3C/svg%3E`;
  }

  // ═══════════════ MAP INITIALIZATION ═══════════════
  function initMap() {
    map = L.map(mapElement, {
      zoomControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true
    }).setView([userLat, userLng], 15);

    map.zoomControl.setPosition('bottomright');

    if (typeof L === 'undefined') {
      showToast('Map library failed to load. Please refresh.');
      return;
    }

    // Google Hybrid Satellite tiles (dark-mode friendly)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps'
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);

    const userIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-user"></div>`,
      iconSize: [20, 20]
    });
    userMarker = L.marker([userLat, userLng], {
      icon: userIcon,
      zIndexOffset: 1000
    }).addTo(map);

    userMarker.accuracyCircle = L.circle([userLat, userLng], {
      radius: 100,
      color: '#4cd7f6',
      fillColor: '#4cd7f6',
      fillOpacity: 0.08,
      weight: 1
    }).addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLat = position.coords.latitude;
          userLng = position.coords.longitude;
          map.setView([userLat, userLng], 15);
          userMarker.setLatLng([userLat, userLng]);

          // Update coordinates display
          const coordsEl = document.getElementById('map-coords');
          if (coordsEl) coordsEl.textContent = `${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° W`;

          const gpsEl = document.getElementById('footer-gps-accuracy');
          if (gpsEl) gpsEl.textContent = `±${Math.round(position.coords.accuracy)}M`;

          const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
          socket.emit('update_location', {
            lat: userLat,
            lng: userLng,
            uid: userMeta.uid,
            name: userMeta.name || userMeta.email?.split('@')[0],
            phone: userMeta.phone,
            skill: userMeta.role || 'citizen'
          });
        },
        () => { /* Geolocation failed */ }
      );
    }
  }

  // ═══════════════ CRISIS CARD SELECTION ═══════════════
  crisisCards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      const selectedCards = document.querySelectorAll('.crisis-card.selected');
      const types = Array.from(selectedCards).map(c => c.getAttribute('data-type'));

      if (types.length === 0) {
        showToast('Please select at least one crisis type.');
        card.classList.add('selected');
        selectedCrisisTypes = [card.getAttribute('data-type')];
        return;
      }
      selectedCrisisTypes = types;
    });
  });

  // ═══════════════ SOS TRIGGER ═══════════════
  btnTriggerSos.addEventListener('click', () => {
    if (selectedCrisisTypes.length === 0) {
      showToast('Please select at least one crisis type.');
      return;
    }
    const isAnon = anonToggle ? anonToggle.checked : false;
    const sosData = {
      type: selectedCrisisTypes[0],
      types: selectedCrisisTypes,
      lat: userLat,
      lng: userLng,
      isAnon: isAnon
    };
    startSosBroadcast(sosData);
  });

  btnResolveSos.addEventListener('click', () => {
    stopSosBroadcast();
    showResolveModal();
  });

  // ═══════════════ AI PANEL ═══════════════
  fabAi.addEventListener('click', () => aiPanel.classList.add('open'));
  closeAi.addEventListener('click', () => aiPanel.classList.remove('open'));

  // ═══════════════ CHAT PANEL ═══════════════
  closeChat.addEventListener('click', () => chatPanel.classList.remove('open'));

  // ═══════════════ DASHBOARD & LOGOUT ═══════════════
  if (btnDashboard) btnDashboard.addEventListener('click', () => window.location.href = 'admin.html');

  const btnLogoutHeader = document.getElementById('btn-logout-header');
  if (btnLogoutHeader) {
    btnLogoutHeader.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'authentication.html';
    });
  }

  // ═══════════════ RATING MODAL ═══════════════
  btnSkipRating.addEventListener('click', hideResolveModal);
  btnSubmitRating.addEventListener('click', () => {
    showToast('Ratings submitted successfully!');
    hideResolveModal();
  });

  // ═══════════════ PROFILE MODAL ═══════════════
  const profileDetailsView = document.getElementById('profile-details-view');
  const profileDetailsEdit = document.getElementById('profile-details-edit');
  const btnEditProfile = document.getElementById('btn-edit-profile');
  const btnSaveProfile = document.getElementById('btn-save-profile');

  function updateProfileModalUI(userMeta) {
    const nameVal = document.getElementById('profile-name-val');
    const nameHeader = document.getElementById('profile-name-header');
    const emailVal = document.getElementById('profile-email-val');
    const phoneVal = document.getElementById('profile-phone-val');
    const roleVal = document.getElementById('profile-role-val');
    const uidVal = document.getElementById('profile-uid-val');
    const roleBadge = document.getElementById('profile-role-badge');
    const avatarLarge = document.getElementById('profile-avatar-large');

    if (nameVal) nameVal.innerText = userMeta.name || 'User Name';
    if (nameHeader) nameHeader.innerText = userMeta.name || 'User Name';
    if (emailVal) emailVal.innerText = userMeta.email || 'user@example.com';
    if (phoneVal) phoneVal.innerText = userMeta.phone || 'N/A';
    if (roleVal) roleVal.innerText = userMeta.role || 'Citizen';
    if (uidVal) uidVal.innerText = userMeta.uid || userMeta.firebaseUid || 'N/A';
    if (roleBadge) roleBadge.innerText = userMeta.role || 'Citizen';
    if (avatarLarge) {
      const name = userMeta.name || 'User';
      const initial = name.charAt(0).toUpperCase();
      const colors = ['#ff516a', '#0566d9', '#4cd7f6', '#009eb9', '#ffb2b7'];
      avatarLarge.style.background = colors[initial.charCodeAt(0) % colors.length];
      avatarLarge.innerText = initial;
    }
  }

  function toggleProfileEditMode(isEdit) {
    if (isEdit) {
      const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
      document.getElementById('edit-profile-name').value = userMeta.name || '';
      document.getElementById('edit-profile-email').value = userMeta.email || '';
      document.getElementById('edit-profile-phone').value = userMeta.phone || '';
      document.getElementById('edit-profile-role').value = userMeta.role || 'citizen';
      profileDetailsView.classList.add('hidden');
      profileDetailsEdit.classList.remove('hidden');
      btnEditProfile.classList.add('hidden');
      btnSaveProfile.classList.remove('hidden');
    } else {
      profileDetailsView.classList.remove('hidden');
      profileDetailsEdit.classList.add('hidden');
      btnEditProfile.classList.remove('hidden');
      btnSaveProfile.classList.add('hidden');
    }
  }

  profileBtn.addEventListener('click', () => {
    const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
    updateProfileModalUI(userMeta);
    toggleProfileEditMode(false);
    profileModal.classList.remove('hidden');
  });

  btnEditProfile.addEventListener('click', () => toggleProfileEditMode(true));

  btnSaveProfile.addEventListener('click', async () => {
    const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedData = {
      name: document.getElementById('edit-profile-name').value,
      email: document.getElementById('edit-profile-email').value,
      phone: document.getElementById('edit-profile-phone').value,
      role: document.getElementById('edit-profile-role').value
    };

    try {
      const res = await fetch(`/api/auth/profile/${userMeta.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        const savedUser = await res.json();
        const newUserMeta = { ...userMeta, name: savedUser.name, email: savedUser.email, phone: savedUser.phone, role: savedUser.role };
        localStorage.setItem('user', JSON.stringify(newUserMeta));
        updateProfileModalUI(newUserMeta);
        toggleProfileEditMode(false);
        showToast('Profile updated successfully!');
        initUserProfile();
      } else {
        const errData = await res.json();
        showToast(`Error: ${errData.msg || 'Update failed'}`);
      }
    } catch (err) {
      showToast('Offline: Saved locally only.');
      const newUserMeta = { ...userMeta, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUserMeta));
      updateProfileModalUI(newUserMeta);
      toggleProfileEditMode(false);
      initUserProfile();
    }
  });

  btnCloseProfile.addEventListener('click', () => profileModal.classList.add('hidden'));

  // ═══════════════ MESSAGING ═══════════════
  function sendMessage() {
    const text = chatInput.value.trim();
    if (text && activeSosId) {
      socket.emit('send_message', { sosId: activeSosId, text });
      chatInput.value = '';
    }
  }

  btnSendChat.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

  async function sendAiMessage() {
    const text = aiInput.value.trim();
    if (!text) return;
    const userMsg = document.createElement('div');
    userMsg.className = 'user-message';
    userMsg.innerHTML = `<strong>You:</strong> ${text}`;
    aiGuidance.appendChild(userMsg);
    aiInput.value = '';
    aiGuidance.scrollTop = aiGuidance.scrollHeight;
    await generateAIGuidance('custom_chat', text);
  }

  btnSendAi.addEventListener('click', sendAiMessage);
  aiInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAiMessage(); });

  function addChatMessage(msg) {
    const div = document.createElement('div');
    if (msg.type === 'system') {
      div.className = 'message system';
      div.innerText = msg.text;
    } else {
      const isMe = msg.senderId === socket.id;
      const isAi = msg.isAi;
      div.className = `message ${isMe ? 'sent' : 'received'} ${isAi ? 'ai-msg-chat' : ''}`;
      div.innerHTML = `
        <span class="msg-sender" ${isAi ? 'style="color:#4cd7f6"' : ''}>
          ${isAi ? '<span class="material-symbols-outlined text-[14px]">auto_awesome</span> ' : ''}${isMe ? 'You' : msg.sender}
        </span>
        ${msg.text}
      `;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function openChat(sosId) {
    activeSosId = sosId;
    chatRoomIdLabel.innerText = `#${sosId}`;
    chatPanel.classList.add('open');
  }

  // ═══════════════ WEBSOCKET ═══════════════
  let socket;
  if (typeof io !== 'undefined') {
    socket = io();
  } else {
    showToast('Connection library failed. Live features disabled.');
    socket = { on: () => {}, emit: () => {}, id: 'mock-id' };
  }
  let currentSosId = null;

  socket.on('connect', () => {
    console.log("Connected to server via WebSocket");
    const footerDot = document.getElementById('footer-connection-dot');
    if (footerDot) footerDot.style.background = '#4cd7f6';

    const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
    socket.emit('update_location', {
      lat: userLat, lng: userLng,
      uid: userMeta.uid,
      name: userMeta.name || userMeta.email?.split('@')[0],
      phone: userMeta.phone,
      skill: userMeta.role || 'citizen'
    });
  });

  socket.on('connect_error', () => {
    const footerDot = document.getElementById('footer-connection-dot');
    if (footerDot) footerDot.style.background = '#ff516a';
  });

  setInterval(() => {
    const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
    socket.emit('update_location', {
      lat: userLat, lng: userLng,
      uid: userMeta.uid,
      name: userMeta.name || userMeta.email?.split('@')[0],
      role: userMeta.role,
      phone: userMeta.phone
    });
  }, 10000);

  // ═══════════════ SOS BROADCAST ═══════════════
  function startSosBroadcast(data) {
    isBroadcasting = true;
    idlePanel.classList.add('hidden');
    activePanel.classList.remove('hidden');
    activeCrisisBadge.innerText = data.types ? data.types.join(' & ') : data.type;

    const combinedType = data.types ? data.types.join(' and ') : data.type;
    generateAIGuidance(combinedType);

    map.removeLayer(userMarker);
    const sosIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-sos"><div class="marker-sos-inner"></div></div>`,
      iconSize: [48, 48]
    });
    sosMarker = L.marker([userLat, userLng], { icon: sosIcon, zIndexOffset: 2000 }).addTo(map);

    const radius = L.circle([userLat, userLng], {
      color: '#ff516a', fillColor: '#ff516a', fillOpacity: 0.08,
      radius: 1000, weight: 2, dashArray: '5, 10'
    }).addTo(map);
    sosMarker.radiusLayer = radius;

    let grow = true;
    sosMarker.radiusInterval = setInterval(() => {
      const r = radius.getRadius();
      if (grow) { radius.setRadius(r + 5); if (r > 1050) grow = false; }
      else { radius.setRadius(r - 5); if (r < 950) grow = true; }
    }, 50);

    socket.emit('trigger_sos', {
      type: data.type, types: data.types, lat: userLat, lng: userLng,
      isAnon: data.isAnon, isVoice: data.isVoice || false,
      confidence: data.confidence || null, urgency: data.urgency || null,
      description: data.description || null
    });

    statNotified.innerText = 'Searching...';
    showToast(`SOS Broadcasted ${data.isAnon ? 'Anonymously' : ''}`);
  }

  function stopSosBroadcast() {
    isBroadcasting = false;
    crisisCards.forEach(c => c.classList.remove('selected'));
    crisisCards[0].classList.add('selected');
    selectedCrisisTypes = ['medical'];

    if (currentSosId) {
      socket.emit('resolve_sos', { sosId: currentSosId });
      currentSosId = null;
    }

    activePanel.classList.add('hidden');
    idlePanel.classList.remove('hidden');
    aiPanel.classList.remove('open');

    if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }

    if (sosMarker) {
      if (sosMarker.radiusInterval) clearInterval(sosMarker.radiusInterval);
      if (sosMarker.radiusLayer) map.removeLayer(sosMarker.radiusLayer);
      map.removeLayer(sosMarker);
    }
    userMarker.addTo(map);

    Object.values(responderMarkers).forEach(m => map.removeLayer(m));
    responderMarkers = {};
    simulatedResponders = [];
    respondersList.innerHTML = '<div class="text-center text-caption font-caption text-on-surface-variant py-4">Waiting for nearby responders to accept...</div>';

    statNotified.innerText = '0';
    statResponds.innerText = '0';
    statEta.innerText = '--';
    generateAIGuidance(null);

    if (SpeechRecognition) setMicState(true);
  }

  // ═══════════════ SOCKET EVENTS ═══════════════
  socket.on('sos_confirmed', (data) => {
    currentSosId = data.id;
    activeSosId = data.id;
    setTimeout(() => { statNotified.innerText = '12'; }, 1000);
  });

  socket.on('responder_assigned', (data) => {
    if (data.sosId === currentSosId) addResponder(data.responder);
  });

  socket.on('new_sos', (data) => {
    const label = data.isVoice ? 'VOICE SOS TRIGGERED' : 'Nearby Emergency';
    let voiceMeta = '';
    if (data.isVoice) {
      const conf = data.confidence ? ` [${(data.confidence * 100).toFixed(0)}% Conf]` : '';
      const urg = data.urgency ? ` [${data.urgency.toUpperCase()}]` : '';
      voiceMeta = `${conf}${urg}`;
    }
    showToast(`${label}: ${data.type}${voiceMeta}`);

    // Add to HUD incidents
    addHudIncident(data);

    // Map marker
    const sIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-sos" style="width:32px;height:32px;"><div class="marker-sos-inner" style="width:12px;height:12px;"></div></div>`
    });
    const marker = L.marker([data.lat, data.lng], { icon: sIcon }).addTo(map);

    const metaHtml = data.isVoice ? `
      <div style="margin-bottom:8px; font-size:0.75rem; display:flex; gap:6px;">
        <span style="background:rgba(76,215,246,0.15); color:#4cd7f6; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600;">VOICE</span>
        ${data.urgency ? `<span style="background:rgba(255,81,106,0.15); color:#ff516a; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600;">${data.urgency.toUpperCase()}</span>` : ''}
      </div>
    ` : '';

    marker.bindPopup(`
      <div class="custom-popup">
        <span class="popup-sos-title">${data.type.toUpperCase()} Emergency</span>
        ${metaHtml}
        <span class="popup-meta" style="margin-bottom:12px;">${data.description || 'Active crisis nearby'}</span>
        <button class="btn-sos" onclick="acceptEmergency('${data.id}')">Accept Incident</button>
      </div>
    `, { closeButton: false }).openPopup();

    responderMarkers[data.id] = marker;
  });

  // HUD Incident Card Builder
  function addHudIncident(data) {
    const container = document.getElementById('hud-incidents');
    const alertCount = document.getElementById('hud-alert-count');

    // Clear placeholder if first incident
    if (container.querySelector('.text-center')) container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'incident-card flex flex-col gap-unit-md';
    card.innerHTML = `
      <div class="flex items-center justify-between flex-wrap gap-unit-xs">
        <div class="flex items-center gap-unit-xs">
          <span class="flex items-center gap-1 font-label-caps text-label-caps px-unit-sm py-unit-2xs rounded-full bg-error-container text-on-error-container">
            <span class="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            ${data.type.toUpperCase()}
          </span>
          ${data.isVoice ? '<span class="font-label-caps text-label-caps text-tertiary bg-tertiary/10 px-unit-xs py-unit-2xs rounded">VOICE</span>' : ''}
        </div>
        <div class="flex items-center gap-1 text-on-surface-variant font-telemetry-time text-telemetry-time">
          <span class="material-symbols-outlined text-sm">schedule</span>
          <span>Just now</span>
        </div>
      </div>
      <div class="flex flex-col gap-unit-2xs">
        <h3 class="font-headline-sm text-headline-sm text-on-surface">${data.description || data.type + ' emergency nearby'}</h3>
      </div>
      <div class="flex flex-col sm:flex-row items-center gap-unit-sm pt-unit-2xs">
        <button class="w-full sm:flex-1 h-12 bg-primary-container hover:bg-on-primary text-on-primary-container hover:text-surface-tint font-headline-sm text-headline-sm rounded-lg flex items-center justify-center gap-unit-xs shadow-xl transition-all duration-200 active:scale-95" onclick="acceptEmergency('${data.id}')">
          <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">navigation</span>
          <span>ACCEPT & NAVIGATE</span>
        </button>
        <button class="w-full sm:w-auto h-12 px-unit-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-bold text-body-bold rounded-lg transition-colors flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-lg">redo</span>
          <span>Pass</span>
        </button>
      </div>
    `;
    container.prepend(card);

    // Update count
    const count = container.querySelectorAll('.incident-card').length;
    if (alertCount) alertCount.textContent = `${count} PENDING`;
  }

  window.acceptEmergency = function (sosId) {
    socket.emit('accept_sos', { sosId });
    showToast("You have accepted the emergency!");
    openChat(sosId);

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          socket.emit('responder_moved', {
            sosId, lat: pos.coords.latitude, lng: pos.coords.longitude
          });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    if (responderMarkers[sosId]) responderMarkers[sosId].closePopup();
  };

  socket.on('new_message', (msg) => {
    addChatMessage(msg);
    if (!chatPanel.classList.contains('open')) {
      showToast('New message available');
    }
  });

  socket.on('chat_closed', (data) => {
    if (activeSosId === data.sosId) {
      showToast("Incident resolved. Chat closed.");
      chatPanel.classList.remove('open');
      if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    }
  });

  socket.on('sos_resolved', (data) => {
    if (responderMarkers[data.sosId]) {
      map.removeLayer(responderMarkers[data.sosId]);
      delete responderMarkers[data.sosId];
    }
    showToast("Incident has been resolved.");
  });

  socket.on('ai_automated_call', (data) => {
    const actionMsg = document.createElement('div');
    actionMsg.className = 'ai-action-tag';
    actionMsg.innerHTML = `<span class="material-symbols-outlined text-[14px]">phone_in_talk</span> <strong>AI Action:</strong> ${data.message}`;
    if (aiGuidance.firstChild) aiGuidance.insertBefore(actionMsg, aiGuidance.firstChild);
    else aiGuidance.appendChild(actionMsg);
    if (!aiPanel.classList.contains('open')) showToast('AI is contacting emergency services...');
  });

  socket.on('system_message', (data) => {
    const msg = document.createElement('div');
    msg.className = 'ai-message';
    msg.style.fontStyle = 'italic';
    msg.style.borderLeftColor = data.type === 'ai' ? '#4cd7f6' : '#ff516a';
    msg.innerText = data.text;
    aiGuidance.appendChild(msg);
    aiGuidance.scrollTop = aiGuidance.scrollHeight;
  });

  socket.on('responder_moved', (data) => {
    const marker = responderMarkers[data.responderId];
    if (isBroadcasting && marker) {
      const startLatLng = marker.getLatLng();
      const endLatLng = L.latLng(data.lat, data.lng);
      if (startLatLng.distanceTo(endLatLng) > 1) marker.setLatLng(endLatLng);
    }
  });

  // ═══════════════ AI GUIDANCE ═══════════════
  async function generateAIGuidance(type, description = '') {
    if (!type) {
      aiGuidance.innerHTML = `
        <div class="ai-message">Welcome to NearHelp AI. I'm here to assist you with any emergency or safety questions.</div>
        <div class="ai-message">Trigger an SOS if you need immediate physical assistance from neighbours.</div>
      `;
      aiSummary.innerHTML = "How can I help you today? Ask about first aid, safety protocols, or local emergency procedures.";
      if (aiStatusDot) { aiStatusDot.style.background = '#4cd7f6'; aiStatusDot.title = 'AI Online'; }
      return;
    }

    if (type === 'custom_chat') {
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'loading-shimmer';
      loadingMsg.id = 'ai-loading';
      loadingMsg.style.height = '40px';
      aiGuidance.appendChild(loadingMsg);
      aiGuidance.scrollTop = aiGuidance.scrollHeight;
    } else {
      if (aiStatusDot) { aiStatusDot.style.background = '#aa888a'; aiStatusDot.title = 'AI Connecting...'; }
      Array.from(aiGuidance.children).forEach(child => {
        if (!child.classList.contains('ai-action-tag')) child.remove();
      });
      const s1 = document.createElement('div'); s1.className = 'loading-shimmer'; s1.style.height = '40px';
      const s2 = document.createElement('div'); s2.className = 'loading-shimmer'; s2.style.height = '40px';
      aiGuidance.appendChild(s1);
      aiGuidance.appendChild(s2);
      aiSummary.innerHTML = `<div class="loading-shimmer" style="height: 40px;"></div>`;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sos/ai-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ crisisType: type, description: description })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch AI guidance');

      if (type === 'custom_chat') {
        const loading = document.getElementById('ai-loading');
        if (loading) loading.remove();
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message';
        aiMsg.innerHTML = `<strong>Assistant:</strong> ${data.emergencySummary || data.firstResponseGuidance?.join(' ') || 'Processing your request.'}`;
        aiGuidance.appendChild(aiMsg);
        aiGuidance.scrollTop = aiGuidance.scrollHeight;
      } else {
        Array.from(aiGuidance.children).forEach(child => {
          if (child.classList.contains('loading-shimmer')) child.remove();
        });
        if (data.firstResponseGuidance && Array.isArray(data.firstResponseGuidance)) {
          data.firstResponseGuidance.forEach((step, i) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'ai-message';
            stepDiv.style.animationDelay = `${i * 0.2}s`;
            stepDiv.innerText = `${i + 1}. ${step}`;
            aiGuidance.appendChild(stepDiv);
          });
        }
        aiSummary.innerHTML = data.emergencySummary || 'Summary not available.';
      }
      if (aiStatusDot) { aiStatusDot.style.background = '#4cd7f6'; aiStatusDot.title = 'AI Online'; }
    } catch (err) {
      if (type === 'custom_chat') {
        const loading = document.getElementById('ai-loading');
        if (loading) loading.remove();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'ai-message';
        errorMsg.style.borderLeftColor = '#ff516a';
        errorMsg.innerText = "Error: Could not get AI response.";
        aiGuidance.appendChild(errorMsg);
      } else {
        aiGuidance.innerHTML = "<div class='ai-message' style='border-left-color:#ff516a'>Failed to load AI guidance.</div>";
        aiSummary.innerHTML = "Expert guidance is currently unavailable.";
      }
      if (aiStatusDot) { aiStatusDot.style.background = '#ff516a'; aiStatusDot.title = 'AI Offline'; }
    }
  }

  // Make globally accessible for inline onclick
  window.generateAIGuidance = generateAIGuidance;

  // ═══════════════ ADD RESPONDER ═══════════════
  function addResponder(r) {
    if (simulatedResponders.length === 0) respondersList.innerHTML = '';
    simulatedResponders.push(r);
    statResponds.innerText = simulatedResponders.length;

    const etas = simulatedResponders.map(res => parseInt(res.time.split(' ')[0]));
    statEta.innerText = Math.min(...etas) + ' min';

    // Update footer
    const footerUnits = document.getElementById('footer-active-units');
    if (footerUnits) footerUnits.textContent = `${simulatedResponders.length} RESPONDERS`;

    const div = document.createElement('div');
    div.className = 'responder-item';
    div.innerHTML = `
      <img src="${generateAvatar(r.name, 40)}" alt="${r.name}">
      <div class="responder-info">
        <span class="r-name">${r.name}</span>
        <div class="r-meta">
          <span class="${r.time === 'Active' ? 'status-active' : ''}">ETA: ${r.time}</span>
          ${r.skill !== 'Neighbour' ? `<span class="r-skill">${r.skill}</span>` : ''}
          <span style="display:block;margin-top:2px;color:#e3bdbf;font-weight:600;font-size:0.75rem;">${r.phone}</span>
        </div>
      </div>
      <button class="btn-chat" onclick="alert('Chat Opened!')">
        <span class="material-symbols-outlined text-[16px]">forum</span>
      </button>
    `;
    respondersList.appendChild(div);

    // Map marker
    const responderInitial = r.name.charAt(0).toUpperCase();
    const rIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-responder">${responderInitial}</div>`,
      iconSize: [38, 38]
    });
    const marker = L.marker([r.lat, r.lng], { icon: rIcon, zIndexOffset: 1500 }).addTo(map);
    marker.bindPopup(`
      <div class="custom-popup">
        <strong style="display:block; color:#adc6ff;">${r.name}</strong>
        <span style="font-size:0.8rem; color:#e3bdbf;">${r.skill}</span>
      </div>
    `, { closeButton: false });

    responderMarkers[r.id] = marker;
    showToast(`${r.name} is responding!`);
  }

  // ═══════════════ UTILITIES ═══════════════
  function showToast(html) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="material-symbols-outlined text-[18px]">info</span> ${html}`;
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-8px)';
      setTimeout(() => t.remove(), 300);
    }, 4000);
  }

  function showResolveModal() {
    resolveModal.classList.remove('hidden');
    ratingList.innerHTML = '';
    if (simulatedResponders.length === 0) {
      ratingList.innerHTML = '<p class="text-on-surface-variant text-caption text-center py-4">No registered responders for this event.</p>';
      return;
    }
    simulatedResponders.forEach(r => {
      const item = document.createElement('div');
      item.className = 'rating-item';
      item.innerHTML = `
        <img src="${generateAvatar(r.name, 40)}">
        <div style="flex:1; text-align:left;">
          <div class="font-body-bold text-body-bold text-on-surface">${r.name}</div>
          <div class="font-caption text-caption text-on-surface-variant">${r.skill}</div>
        </div>
        <div class="stars" id="stars-${r.id}">
          <span class="material-symbols-outlined" data-val="1" style="font-variation-settings: 'FILL' 1;">star</span>
          <span class="material-symbols-outlined" data-val="2" style="font-variation-settings: 'FILL' 1;">star</span>
          <span class="material-symbols-outlined" data-val="3" style="font-variation-settings: 'FILL' 1;">star</span>
          <span class="material-symbols-outlined" data-val="4" style="font-variation-settings: 'FILL' 1;">star</span>
          <span class="material-symbols-outlined" data-val="5" style="font-variation-settings: 'FILL' 1;">star</span>
        </div>
      `;
      ratingList.appendChild(item);
      const stars = item.querySelectorAll('.stars .material-symbols-outlined');
      stars.forEach(s => {
        s.addEventListener('click', (e) => {
          const val = parseInt(e.target.getAttribute('data-val'));
          stars.forEach(st => {
            st.classList.toggle('active', parseInt(st.getAttribute('data-val')) <= val);
          });
        });
      });
    });
  }

  function hideResolveModal() { resolveModal.classList.add('hidden'); }

  // ═══════════════ VOICE SOS (Web Speech API) ═══════════════
  const btnMicToggle = document.getElementById('btn-mic-toggle');
  const micIcon = document.getElementById('mic-icon');
  const micText = document.getElementById('mic-text');
  const micDot = document.getElementById('mic-dot');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition;
  let isListening = false;
  let isRecognitionRunning = false;

  function setMicState(listening) {
    isListening = listening;
    if (listening) {
      btnMicToggle.classList.add('mic-active');
      btnMicToggle.style.background = 'rgba(255, 81, 106, 0.15)';
      btnMicToggle.style.borderColor = '#ff516a';
      micText.innerText = 'Listening... Speak now';
      if (micDot) { micDot.style.background = '#ff516a'; micDot.style.animation = 'pulse-btn 1.5s infinite'; }
      try {
        recognition.start();
        showToast('Microphone active. Listening for emergency keywords...');
      } catch (err) { console.error("Failed to start SpeechRecognition:", err); }
    } else {
      btnMicToggle.classList.remove('mic-active');
      btnMicToggle.style.background = '';
      btnMicToggle.style.borderColor = '';
      micText.innerText = 'Enable Voice Trigger';
      if (micDot) { micDot.style.background = '#ff516a'; micDot.style.animation = 'none'; }
      try { recognition.stop(); } catch (err) {}
    }
  }

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => { isRecognitionRunning = true; };
    recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex][0].transcript.trim().toLowerCase();
      handleBrowserSpeech(transcript);
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        showToast('Microphone permission denied.');
        setMicState(false);
      }
    };
    recognition.onend = () => {
      isRecognitionRunning = false;
      if (isListening) { try { recognition.start(); } catch (e) {} }
    };

    btnMicToggle.addEventListener('click', () => setMicState(!isListening));
    setMicState(true);

    const startOnGesture = () => {
      if (isListening && !isRecognitionRunning) {
        try { recognition.start(); } catch (e) {}
      }
    };
    document.addEventListener('click', startOnGesture, { once: true });
    document.addEventListener('keydown', startOnGesture, { once: true });
  } else {
    btnMicToggle.style.opacity = '0.5';
    btnMicToggle.style.cursor = 'not-allowed';
    micText.innerText = 'Voice Trigger Unsupported';
  }

  function handleBrowserSpeech(text) {
    const medicalKeywords = ["medical", "doctor", "ambulance", "hospital", "heart", "breathing", "bleeding", "wound", "choking", "poison", "seizure", "stroke", "collapsed", "unconscious", "chest pain", "not breathing", "faint"];
    const fireKeywords = ["fire", "smoke", "burn", "burning", "flames"];
    const securityKeywords = ["police", "attack", "stab", "gun", "robbery", "theft", "kidnap", "assault", "threat", "stalking", "stalk", "stalker", "following", "followed"];
    const mechanicKeywords = ["mechanic", "car broke", "flat tire", "accident", "crash", "collision"];
    const generalKeywords = ["help", "emergency", "save", "danger", "stop", "don't", "run", "panic", "trapped", "drowning", "safety", "bachao", "madad", "police ko bulao", "khatra"];

    const triggerPhrases = [
      "i need help", "help me", "save me", "call the police",
      "emergency emergency", "someone help", "i'm in danger",
      "stop it", "get away", "call 112", "call 100", "medical help",
      "i've been in a car accident", "there's been an accident",
      "someone is hurt", "i can't breathe", "i'm trapped"
    ];

    const hasTriggerPhrase = triggerPhrases.some(phrase => text.includes(phrase));
    const hasSecurity = securityKeywords.some(word => text.includes(word));
    const hasMedical = medicalKeywords.some(word => text.includes(word));
    const hasFire = fireKeywords.some(word => text.includes(word));
    const hasMechanic = mechanicKeywords.some(word => text.includes(word));
    const hasGeneral = generalKeywords.some(word => text.includes(word));

    let isEmergency = false;
    let category = "security";
    let reason = "";

    if (hasTriggerPhrase) { isEmergency = true; reason = `Phrase match: ${text}`; }
    else if (hasSecurity || hasMedical || hasFire || hasMechanic || hasGeneral) { isEmergency = true; reason = `Keyword match: ${text}`; }

    if (hasMedical) category = "medical";
    else if (hasFire) category = "fire";
    else if (hasMechanic) category = "mechanic";
    else if (hasSecurity) category = "security";

    if (isEmergency) {
      showToast(`Voice SOS Triggered: ${category.toUpperCase()}`);
      startSosBroadcast({
        type: category, types: [category], lat: userLat, lng: userLng,
        isAnon: anonToggle ? anonToggle.checked : false,
        isVoice: true, confidence: 0.8, urgency: "high",
        description: `Browser Voice Trigger: ${reason}`
      });
      setMicState(false);
    }
  }

  // ═══════════════ FIRST AID: METRONOME ═══════════════
  (function() {
    let isPlaying = false;
    let intervalId = null;
    let audioCtx = null;
    const bpm = 110;
    const intervalMs = (60 / bpm) * 1000;

    const toggleBtn = document.getElementById('toggle-metronome');
    const btnLabel = document.getElementById('audio-btn-label');
    const playIcon = document.getElementById('audio-play-icon');
    const ring = document.getElementById('metronome-ring');

    if (!toggleBtn) return;

    function playBeep() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);

      if (ring) {
        ring.classList.remove('opacity-0', 'scale-95');
        ring.classList.add('opacity-80', 'scale-125');
        setTimeout(() => {
          ring.classList.remove('opacity-80', 'scale-125');
          ring.classList.add('opacity-0', 'scale-95');
        }, 120);
      }
    }

    toggleBtn.addEventListener('click', function() {
      if (isPlaying) {
        clearInterval(intervalId);
        isPlaying = false;
        if (btnLabel) btnLabel.textContent = 'Play Metronome Beat';
        if (playIcon) playIcon.textContent = 'play_arrow';
      } else {
        isPlaying = true;
        playBeep();
        intervalId = setInterval(playBeep, intervalMs);
        if (btnLabel) btnLabel.textContent = 'Pause Beat (110 BPM)';
        if (playIcon) playIcon.textContent = 'pause';
      }
    });
  })();

  // ═══════════════ FIRST AID: VOICE COACH ═══════════════
  (function() {
    const voiceBtn = document.getElementById('voice-coach-btn');
    const voiceLabel = document.getElementById('voice-coach-label');
    const voiceIcon = document.getElementById('voice-coach-icon');
    let isSpeaking = false;

    if (!voiceBtn) return;

    voiceBtn.addEventListener('click', function() {
      if ('speechSynthesis' in window) {
        if (isSpeaking) {
          window.speechSynthesis.cancel();
          isSpeaking = false;
          if (voiceLabel) voiceLabel.textContent = 'Start Spoken Guidance';
          if (voiceIcon) voiceIcon.textContent = 'volume_up';
        } else {
          window.speechSynthesis.cancel();
          const text = "Hands-only C P R. Step one: Tap shoulders firmly and shout: Are you okay? Call 9 1 1 now. Step two: Place the heel of your hand on the center of the chest. Push hard and fast to the beat. Two to two point four inches deep. Do not stop until paramedics take over.";
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.onend = function() {
            isSpeaking = false;
            if (voiceLabel) voiceLabel.textContent = 'Start Spoken Guidance';
            if (voiceIcon) voiceIcon.textContent = 'volume_up';
          };
          window.speechSynthesis.speak(utterance);
          isSpeaking = true;
          if (voiceLabel) voiceLabel.textContent = 'Stop Voice Guide';
          if (voiceIcon) voiceIcon.textContent = 'stop';
        }
      } else {
        alert('Voice synthesis is not supported in this browser.');
      }
    });
  })();

  // ═══════════════ HUD LIVE CLOCK ═══════════════
  setInterval(() => {
    const clock = document.getElementById('hud-live-clock');
    if (clock) {
      const now = new Date();
      clock.innerText = now.toTimeString().split(' ')[0] + ' UTC';
    }
  }, 1000);

  // ═══════════════ INIT ═══════════════
  initUserProfile();
  initMap();
  generateAIGuidance(null);
});
