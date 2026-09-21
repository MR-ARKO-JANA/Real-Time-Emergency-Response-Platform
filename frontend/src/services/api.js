// NearHelp API Client
// Centralizes all REST API calls to the backend

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Sync Firebase user to MongoDB
 */
export async function syncUser(firebaseToken, userData) {
  const res = await fetch(`${API_BASE}/auth/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${firebaseToken}`,
    },
    body: JSON.stringify(userData),
  });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return res.json();
}

/**
 * Get user profile by Firebase UID
 */
export async function getUserProfile(uid) {
  const res = await fetch(`${API_BASE}/auth/profile/${uid}`);
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Update user profile
 */
export async function updateUserProfile(uid, data, firebaseToken) {
  const res = await fetch(`${API_BASE}/auth/profile/${uid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${firebaseToken}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Profile update failed: ${res.status}`);
  return res.json();
}

/**
 * Get AI crisis guidance — requires Firebase auth token
 */
export async function getAiGuidance(crisisType, description, firebaseToken) {
  const res = await fetch(`${API_BASE}/sos/ai-guidance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${firebaseToken}`,
    },
    body: JSON.stringify({ crisisType, description }),
  });
  if (!res.ok) throw new Error(`AI guidance failed: ${res.status}`);
  return res.json();
}

/**
 * Get all SOS alerts (Admin only)
 */
export async function getAllAlerts(firebaseToken) {
  const res = await fetch(`${API_BASE}/sos/alerts`, {
    headers: { 'Authorization': `Bearer ${firebaseToken}` },
  });
  if (!res.ok) throw new Error(`Alerts fetch failed: ${res.status}`);
  return res.json();
}
