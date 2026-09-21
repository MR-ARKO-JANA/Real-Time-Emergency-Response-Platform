// Calculates distance between two coordinates in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Matches an SOS event to nearby responders based on distance and priority skills.
 * @param {Object} data - SOS payload containing lat, lng, and types
 * @param {Map} connectedUsers - Map of currently connected Socket.IO users
 * @param {String} broadcasterSocketId - Socket ID of the user triggering the SOS
 * @returns {Array} List of matched responders sorted by priority and distance
 */
function matchResponders(data, connectedUsers, broadcasterSocketId) {
    const crisisTypes = (data.types || [data.type]).filter(Boolean).map(t => t.toLowerCase());
    if (crisisTypes.length === 0) crisisTypes.push('other');

    let targetedResponders = [];

    for (const [sId, uData] of connectedUsers.entries()) {
        if (sId !== broadcasterSocketId) {
            const dist = getDistance(data.lat, data.lng, uData.lat, uData.lng);
            const userSkill = (uData.skill || '').toLowerCase();

            const hasPrimarySkill = crisisTypes.some(type => {
                if (type === 'medical' || type === 'health') return userSkill.includes('doctor') || userSkill.includes('medical') || userSkill.includes('nurse');
                if (type === 'fire') return userSkill.includes('fire');
                if (type === 'security' || type === 'police') return userSkill.includes('security') || userSkill.includes('police');
                if (type === 'mechanic') return userSkill.includes('mechanic');
                return userSkill === type.toLowerCase();
            });

            const isVolunteer = userSkill === 'volunteer' || userSkill === 'neighbour' || userSkill === 'citizen' || userSkill === '';

            if (dist <= 5000 && hasPrimarySkill) {
                targetedResponders.push({ sId, distance: dist, priority: 1, skillLabel: "Domain Specialist" });
            } else if (dist <= 2000 && isVolunteer) {
                targetedResponders.push({ sId, distance: dist, priority: 2, skillLabel: "Nearby Helper" });
            }
        }
    }

    // Sort by priority first (1 is higher), then by distance
    targetedResponders.sort((a, b) => (a.priority - b.priority) || (a.distance - b.distance));
    return targetedResponders;
}

module.exports = {
    getDistance,
    matchResponders
};
