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
  const aiInput = document.getElementById('ai-input');
  const btnSendAi = document.getElementById('btn-send-ai');

  const resolveModal = document.getElementById('resolve-modal');
  const ratingList = document.getElementById('rating-list');
  const btnSkipRating = document.getElementById('btn-skip-rating');
  const btnSubmitRating = document.getElementById('btn-submit-rating');
  const toastContainer = document.getElementById('toast-container');
  const btnDashboard = document.getElementById('btn-dashboard');
  const responderToggle = document.getElementById('responder-toggle');
  const profileModal = document.getElementById('profile-modal');
  const btnCloseProfile = document.getElementById('btn-close-profile');
  const profileBtn = document.getElementById('profile-btn');

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
  let selectedCrisisTypes = ['medical']; // Default selection

  // --------- Initialize User Profile ---------
  async function initUserProfile() {
    let userMeta = JSON.parse(localStorage.getItem('user') || '{}');

    // If name is missing, try to fetch from server
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

          // Update profile modal fields if they are currently visible
          if (!profileModal.classList.contains('hidden')) {
            updateProfileModalUI(userMeta);
          }
        } else if (res.status === 404 && userMeta.uid) {
          // AUTO-SYNC: Server forgotten us (restart), so tell it who we are
          // Update UI immediately from cache while sync happens in background
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
          }).catch(e => { /* Silently fail auto-sync */ });
        }
      } catch (err) {
        // Silently fail profile fetch
      }
    }

    const userName = userMeta.name || userMeta.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();

    // Update user role display if it exists
    const userRoleDisplay = document.getElementById('user-role-display');
    if (userRoleDisplay) {
      userRoleDisplay.innerText = userMeta.role || 'Citizen';
    }

    // Generate profile picture with user initial
    const profileImg = document.getElementById('profile-img');
    if (profileImg) {
      const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      profileImg.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect fill='${encodeURIComponent(color)}' width='40' height='40'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='18' font-family='Arial' font-weight='bold'%3E${userInitial}%3C/text%3E%3C/svg%3E`;
    }
  }

  // Helper function to generate avatar SVG
  function generateAvatar(name, size = 40) {
    const initial = (name || 'U').charAt(0).toUpperCase();
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ff6b6b', '#4ecdc4'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect fill='${encodeURIComponent(color)}' width='${size}' height='${size}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='${size / 2}' font-family='Arial' font-weight='bold'%3E${initial}%3C/text%3E%3C/svg%3E`;
  }

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
            name: userMeta.name || userMeta.email?.split('@')[0],
            phone: userMeta.phone,
            skill: userMeta.role || 'citizen'
          });
        },
        (error) => {
          // Geolocation failed
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
      card.classList.toggle('selected');
      // Find ALL selected types
      const selectedCards = document.querySelectorAll('.crisis-card.selected');
      const types = Array.from(selectedCards).map(c => c.getAttribute('data-type'));

      if (types.length === 0) {
        showToast('<i class="ph ph-warning"></i> Please select at least one crisis type.');
        // Re-select the card that was just unselected to prevent empty selection
        card.classList.add('selected');
        selectedCrisisTypes = [card.getAttribute('data-type')]; // Ensure at least one is selected
        return;
      }
      selectedCrisisTypes = types;
    });
  });

  crisisCards[0].classList.add('selected'); // Ensure 'medical' is selected by default

  btnTriggerSos.addEventListener('click', () => {
    if (selectedCrisisTypes.length === 0) {
      showToast('<i class="ph ph-warning"></i> Please select at least one crisis type before triggering SOS.');
      return;
    }
    const isAnon = anonToggle.checked;
    const sosData = {
      type: selectedCrisisTypes[0], // Primary type
      types: selectedCrisisTypes,    // All selected types
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

  fabAi.addEventListener('click', () => aiPanel.classList.add('open'));
  closeAi.addEventListener('click', () => aiPanel.classList.remove('open'));

  closeChat.addEventListener('click', () => chatPanel.classList.add('hidden'));

  btnSendAi.addEventListener('click', sendAiMessage);
  aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiMessage();
  });


  btnDashboard.addEventListener('click', () => window.location.href = 'admin.html');

  const btnLogoutHeader = document.getElementById('btn-logout-header');
  if (btnLogoutHeader) {
    btnLogoutHeader.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'authentication.html';
    });
  }

  // Display user role
  const userRoleDisplay = document.getElementById('user-role-display');
  if (userRoleDisplay) {
    const userMeta = JSON.parse(localStorage.getItem('user') || '{}');
    userRoleDisplay.innerText = userMeta.role || 'Citizen';
  }

  btnSkipRating.addEventListener('click', hideResolveModal);
  btnSubmitRating.addEventListener('click', () => {
    showToast('<i class="ph-fill ph-check-circle"></i> Ratings submitted successfully');
    hideResolveModal();
  });

  // --------- Profile Modal Logic ---------
  const profileDetailsView = document.getElementById('profile-details-view');
  const profileDetailsEdit = document.getElementById('profile-details-edit');
  const btnEditProfile = document.getElementById('btn-edit-profile');
  const btnSaveProfile = document.getElementById('btn-save-profile');

  function updateProfileModalUI(userMeta) {
    document.getElementById('profile-name-val').innerText = userMeta.name || 'User Name';
    document.getElementById('profile-name-header').innerText = userMeta.name || 'User Name';
    document.getElementById('profile-email-val').innerText = userMeta.email || 'user@example.com';
    document.getElementById('profile-phone-val').innerText = userMeta.phone || 'N/A';
    document.getElementById('profile-role-val').innerText = userMeta.role || 'Citizen';
    document.getElementById('profile-uid-val').innerText = userMeta.uid || userMeta.firebaseUid || 'N/A';

    const roleBadge = document.getElementById('profile-role-badge');
    if (roleBadge) roleBadge.innerText = userMeta.role || 'Citizen';

    const avatarLarge = document.getElementById('profile-avatar-large');
    if (avatarLarge) {
      const name = userMeta.name || 'User';
      const initial = name.charAt(0).toUpperCase();
      const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
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
        const newUserMeta = {
          ...userMeta,
          name: savedUser.name,
          email: savedUser.email,
          phone: savedUser.phone,
          role: savedUser.role
        };
        localStorage.setItem('user', JSON.stringify(newUserMeta));
        updateProfileModalUI(newUserMeta);
        toggleProfileEditMode(false);
        showToast('<i class="ph-fill ph-check-circle"></i> Profile updated successfully!');

        // Refresh UI components
        initUserProfile();
      } else {
        const errData = await res.json();
        showToast(`<i class="ph-fill ph-x-circle"></i> Error: ${errData.msg || 'Update failed'}`);
      }
    } catch (err) {
      showToast('<i class="ph-fill ph-broadcast"></i> Offline Update: Saved locally only.');
      // Persist locally even if server is down (Offline Mode feature)
      const newUserMeta = { ...userMeta, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUserMeta));
      updateProfileModalUI(newUserMeta);
      toggleProfileEditMode(false);
      initUserProfile();
    }
  });

  btnCloseProfile.addEventListener('click', () => {
    profileModal.classList.add('hidden');
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

  async function sendAiMessage() {
    const text = aiInput.value.trim();
    if (!text) return;

    // Add user message to UI
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-step';
    userMsg.style.borderLeft = '3px solid #ec4899';
    userMsg.innerHTML = `<strong>You:</strong> ${text}`;
    aiGuidance.appendChild(userMsg);
    aiInput.value = '';
    aiGuidance.scrollTop = aiGuidance.scrollHeight;

    // Fetch AI response
    await generateAIGuidance('custom_chat', text);
  }

  btnSendAi.addEventListener('click', sendAiMessage);
  aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiMessage();
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
      name: userMeta.name || userMeta.email?.split('@')[0],
      role: userMeta.role,
      phone: userMeta.phone
    });
  }, 10000);

  const initUserMeta = JSON.parse(localStorage.getItem('user') || '{}');
  socket.emit('update_location', {
    lat: userLat,
    lng: userLng,
    uid: initUserMeta.uid,
    name: initUserMeta.name || initUserMeta.email?.split('@')[0],
    phone: initUserMeta.phone
  });

  function startSosBroadcast(data) { // Changed parameter to 'data' object
    isBroadcasting = true;
    idlePanel.classList.add('hidden');
    activePanel.classList.remove('hidden');
    activeCrisisBadge.innerText = data.types ? data.types.join(' & ') : data.type;

    // Trigger ONE AI Guidance for ALL selected domains
    const combinedType = data.types ? data.types.join(' and ') : data.type;
    generateAIGuidance(combinedType);

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
    // aiPanel.classList.add('open'); // Keep it closed by default or open if you want
    // generateAIGuidance(combinedType); // Already called above

    socket.emit('trigger_sos', {
      type: data.type,
      types: data.types,
      lat: userLat,
      lng: userLng,
      isAnon: data.isAnon
    });

    statNotified.innerText = 'Searching...';
    showToast(`<i class="ph-fill ph-broadcast"></i> SOS Broadcasted ${isAnon ? 'Anonymously' : ''}`);
  }

  function stopSosBroadcast() {
    isBroadcasting = false;

    // Clear selections
    crisisCards.forEach(c => c.classList.remove('selected'));
    selectedCrisis = 'Medical'; // Reset to default
    crisisCards[0].classList.add('selected');

    if (currentSosId) {
      socket.emit('resolve_sos', { sosId: currentSosId });
      currentSosId = null;
    }

    activePanel.classList.add('hidden');
    idlePanel.classList.remove('hidden');
    aiPanel.classList.remove('open');
    // fabAi.classList.add('hidden'); // REMOVED: Keep AI button visible

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
    generateAIGuidance(null); // Reset to general guidance
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

  socket.on('ai_automated_call', (data) => {
    const aiMsg = document.createElement('div');
    aiMsg.className = 'ai-step';
    aiMsg.style.borderLeft = '3px solid #a855f7';
    aiMsg.style.background = 'rgba(168, 85, 247, 0.1)';
    aiMsg.innerHTML = `<i class="ph-fill ph-phone-call"></i> <strong>AI Action:</strong> ${data.message}`;
    aiGuidance.prepend(aiMsg);

    showToast(`<i class="ph-fill ph-robot"></i> AI: Notifying ${data.type} services...`);

    // Optionally open AI panel to show the action
    aiPanel.classList.add('open');
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
        (err) => { /* Live tracking error */ },
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

  socket.on('ai_automated_call', (data) => {
    // Add a special action tag to the AI guidance
    const actionMsg = document.createElement('div');
    actionMsg.className = 'ai-action-tag'; // Use a specific class
    actionMsg.innerHTML = `<i class="ph-fill ph-phone-call"></i> <strong>AI Action:</strong> ${data.message}`;

    // Insertion: Prepend to guidance so it's always at the top
    if (aiGuidance.firstChild) {
      aiGuidance.insertBefore(actionMsg, aiGuidance.firstChild);
    } else {
      aiGuidance.appendChild(actionMsg);
    }

    if (aiPanel.classList.contains('hidden')) {
      showToast(`<i class="ph ph-magic-wand"></i> AI is contacting emergency services...`);
    }
  });

  socket.on('system_message', (data) => {
    const msg = document.createElement('div');
    msg.className = 'ai-step';
    msg.style.fontStyle = 'italic';
    msg.style.color = data.type === 'ai' ? '#a855f7' : '#f43f5e';
    msg.innerText = data.text;
    aiGuidance.appendChild(msg);
    aiGuidance.scrollTop = aiGuidance.scrollHeight;
  });

  socket.on('responder_moved', (data) => {
    // If I am the broadcaster, update the responder's marker
    if (isBroadcasting && responderMarkers[data.responderId]) {
      responderMarkers[data.responderId].setLatLng([data.lat, data.lng]);
    }
    // Note: In Phase 3 simple version, broadcaster also uses responderMarkers to track people coming to them
  });

  // --------- AI Fetch Logic ---------

  async function generateAIGuidance(type, description = '') {
    if (!type) {
      aiGuidance.innerHTML = `
        <div class="ai-step">Welcome to NearHelp AI. I'm here to assist you with any emergency or safety questions.</div>
        <div class="ai-step">Trigger an SOS if you need immediate physical assistance from neighbours.</div>
      `;
      aiSummary.innerHTML = "How can I help you today? You can ask me about first aid, safety protocols, or local emergency procedures.";
      if (aiStatusDot) {
        aiStatusDot.className = 'ai-status-dot online';
        aiStatusDot.title = 'AI Online';
      }
      return;
    }

    // Show loading state for custom chat
    if (type === 'custom_chat') {
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'loading-shimmer ai-shimmer';
      loadingMsg.id = 'ai-loading';
      aiGuidance.appendChild(loadingMsg);
      aiGuidance.scrollTop = aiGuidance.scrollHeight;
    } else {
      // Show shimmers for standard SOS - BUT PRESERVE ACTION TAGS
      if (aiStatusDot) {
        aiStatusDot.className = 'ai-status-dot';
        aiStatusDot.title = 'AI Connecting...';
      }

      // Clear ONLY non-action elements
      Array.from(aiGuidance.children).forEach(child => {
        if (!child.classList.contains('ai-action-tag')) child.remove();
      });

      const s1 = document.createElement('div'); s1.className = 'loading-shimmer ai-shimmer';
      const s2 = document.createElement('div'); s2.className = 'loading-shimmer ai-shimmer';
      aiGuidance.appendChild(s1);
      aiGuidance.appendChild(s2);

      aiSummary.innerHTML = `<div class="loading-shimmer ai-shimmer" style="height: 60px;"></div>`;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sos/ai-guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ crisisType: type, description: description })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch AI guidance');
      }

      if (type === 'custom_chat') {
        const loading = document.getElementById('ai-loading');
        if (loading) loading.remove();

        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-step';
        aiMsg.innerHTML = `<strong>Assistant:</strong> ${data.emergencySummary || data.firstResponseGuidance?.join(' ') || 'I am processing your request.'}`;
        aiGuidance.appendChild(aiMsg);
        aiGuidance.scrollTop = aiGuidance.scrollHeight;
      } else {
        // Clear shimmers before adding real content
        Array.from(aiGuidance.children).forEach(child => {
          if (child.classList.contains('loading-shimmer')) child.remove();
        });

        let html = '';
        if (data.firstResponseGuidance && Array.isArray(data.firstResponseGuidance)) {
          data.firstResponseGuidance.forEach((step, i) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'ai-step';
            stepDiv.style.animationDelay = `${i * 0.2}s`;
            stepDiv.innerText = `${i + 1}. ${step}`;
            aiGuidance.appendChild(stepDiv);
          });
        }

        aiSummary.innerHTML = `
                ${data.emergencySummary || 'Summary not available.'}
                <button class="icon-btn btn-copy" title="Copy to clipboard"><i class="ph ph-copy"></i></button>
            `;
      }

      if (aiStatusDot) {
        aiStatusDot.className = 'ai-status-dot online';
        aiStatusDot.title = 'AI Online';
      }
    } catch (err) {
      if (type === 'custom_chat') {
        const loading = document.getElementById('ai-loading');
        if (loading) loading.remove();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'ai-step';
        errorMsg.style.color = 'var(--primary)';
        errorMsg.innerText = "Error: Could not get AI response.";
        aiGuidance.appendChild(errorMsg);
      } else {
        aiGuidance.innerHTML = "<p style='color:var(--primary)'>Failed to load AI guidance.</p>";
        aiSummary.innerHTML = "Expert guidance is currently unavailable. Please follow standard emergency protocols.";
      }
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
      <img src="${generateAvatar(r.name, 36)}" alt="${r.name}">
      <div class="responder-info">
        <span class="r-name">${r.name}</span>
        <div class="r-meta">
          <span class="${r.time === 'Active' ? 'status-active' : ''}">ETA: ${r.time}</span>
          ${r.skill !== 'Neighbour' ? `<span class="r-skill">${r.skill}</span>` : ''}
          <span style="display:block;margin-top:4px;color:rgba(255,255,255,0.7);font-weight:600;font-size:0.8rem;">${r.phone}</span>
        </div>
      </div>
      <div class="responder-actions">
        <button class="btn-chat" onclick="alert('Mock Chat Opened!')"><i class="ph-fill ph-chat-teardrop-dots"></i></button>
      </div>
    `;
    respondersList.appendChild(div);

    // Add UI Marker
    const responderInitial = r.name.charAt(0).toUpperCase();
    const rIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-responder">${responderInitial}</div>`,
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
        <img src="${generateAvatar(r.name, 40)}">
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
  initUserProfile(); // Initialize user profile picture
  initMap();
  generateAIGuidance(null); // Initial welcome message
});
