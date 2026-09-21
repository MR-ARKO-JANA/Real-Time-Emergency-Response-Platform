/**
 * Processes a responder accepting an SOS incident.
 * @param {Object} event - The active SOS event payload from the Map
 * @param {Object} user - The responder's user data
 * @returns {Object} result - Contains success status, error message, and response data
 */
function acceptIncident(event, user) {
    if (!event || !user) {
        return { success: false, error: 'Invalid incident or user data.' };
    }

    // Deduplication: prevent same responder from accepting twice
    const alreadyAccepted = event.responders.some(r => r.id === user.id);
    if (alreadyAccepted) {
        return { success: false, error: 'You have already accepted this SOS.' };
    }

    const responderData = {
        id: user.id,
        name: user.name,
        skill: user.skill,
        phone: user.phone,
        lat: user.lat,
        lng: user.lng,
        time: "Active"
    };
    
    event.responders.push(responderData);

    let secondaryMessage = null;
    if (event.crisisTypes && event.crisisTypes.length > 1) {
        const otherType = event.crisisTypes.find(t => t.toLowerCase() !== (user.skill || '').toLowerCase()) || event.crisisTypes[1];
        secondaryMessage = `Responder accepted. For remaining issues, please also contact ${otherType.toUpperCase()} services directly.`;
    }

    return {
        success: true,
        responderData,
        secondaryMessage
    };
}

module.exports = {
    acceptIncident
};
