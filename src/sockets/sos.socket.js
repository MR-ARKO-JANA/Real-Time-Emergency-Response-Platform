const SOS = require('../models/sos.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const sosService = require('../services/sos.service');

// In-Memory State for active fast-tracking, DB is for persistence
const activeSOS = new Map(); // id -> sos payload
const connectedUsers = new Map(); // socketId -> user payload

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

module.exports = function (io) {
    io.on('connection', (socket) => {
        // Handle new connection

        // 1. Initial Connection & Location Update
        socket.on('update_location', async (data) => {
            let userName = data.name;
            let userSkill = data.role;

            try {
                // If we have a firebase UID but missing the display name/role, ask the DB
                if (data.uid && mongoose.connection.readyState === 1 && (!userName || !userSkill)) {
                    const dbUser = await User.findOne({ firebaseUid: data.uid });
                    if (dbUser) {
                        userName = dbUser.name;
                        userSkill = dbUser.role;
                        socket.userPhone = dbUser.phone; // Store phone on socket
                    }
                }
            } catch (err) {
                // Silent DB lookup failure
            }

            connectedUsers.set(socket.id, {
                id: data.uid || socket.id,
                lat: data.lat,
                lng: data.lng,
                name: userName || `User-${socket.id.substring(0, 4)}`,
                skill: userSkill || 'Neighbour',
                phone: socket.userPhone || data.phone || 'N/A'
            });
            // Send back current active SOS
            socket.emit('active_incidents', Array.from(activeSOS.values()));
        });

        // 2. Broadcast SOS
        socket.on('trigger_sos', async (data) => {
            if (data.isVoice) {
                console.log(`[VOICE SOS] Automatic ${data.type.toUpperCase()} trigger activated: ${data.description}`);
            }
            const sosEvent = {
                id: `SOS-${Date.now()}`,
                broadcasterId: socket.id,
                type: data.type,
                lat: data.lat,
                lng: data.lng,
                isAnon: data.isAnon,
                responders: [],
                status: 'active'
            };

            try {
                // 1. Save new SOS incident to MongoDB
                const userSession = connectedUsers.get(socket.id);
                const bId = mongoose.Types.ObjectId.isValid(userSession?.id) ? userSession.id : new mongoose.Types.ObjectId();

                if (mongoose.connection.readyState === 1) {
                    const newDbSos = new SOS({
                        broadcaster: bId,
                        crisisTypes: data.types || [data.type],
                        location: { type: 'Point', coordinates: [data.lng, data.lat] },
                        isAnonymous: data.isAnon
                    });
                    await newDbSos.save();
                    sosEvent.dbId = newDbSos._id.toString();
                } else {
                    throw new Error("MongoDB not connected natively");
                }
            } catch (dbError) {
                sosEvent.dbId = `MOCK-DB-${Date.now()}`;
            }

            try {
                activeSOS.set(sosEvent.id, sosEvent);
                socket.join(`incident_${sosEvent.id}`);

                const crisisTypes = (data.types || [data.type]).filter(Boolean).map(t => t.toLowerCase());
                if (crisisTypes.length === 0) crisisTypes.push('other');

                let targetedResponders = [];

                for (const [sId, uData] of connectedUsers.entries()) {
                    if (sId !== socket.id) {
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

                targetedResponders.sort((a, b) => (a.priority - b.priority) || (a.distance - b.distance));

                targetedResponders.forEach(r => {
                    io.to(r.sId).emit('new_sos', {
                        ...sosEvent,
                        priority: r.priority,
                        matchedDomain: r.skillLabel
                    });
                });

                crisisTypes.forEach(type => {
                    socket.emit('ai_automated_call', {
                        type: type,
                        number: "7478435239",
                        location: [data.lat, data.lng],
                        message: `AI Action: Contacting Emergency ${type.toUpperCase()} Services at 7478435239...`
                    });

                    io.emit('system_message', {
                        text: `NearHelp AI is coordinating with ${type.toUpperCase()} services (7478435239).`,
                        type: 'ai'
                    });
                });

                socket.emit('sos_confirmed', sosEvent);
            } catch (e) {
                // Critical broadcast error
            }
        });

        // 3. Resolve SOS
        socket.on('resolve_sos', async (data) => {
            if (activeSOS.has(data.sosId)) {
                socket.broadcast.emit('sos_resolved', { sosId: data.sosId });
                io.to(`incident_${data.sosId}`).emit('chat_closed', { sosId: data.sosId });
                activeSOS.delete(data.sosId);
                io.emit('admin_update', Array.from(activeSOS.values()));
            }
        });

        // 4. Accept SOS
        socket.on('accept_sos', (data) => {
            if (activeSOS.has(data.sosId)) {
                const event = activeSOS.get(data.sosId);
                const user = connectedUsers.get(socket.id);

                if (user) {
                    socket.join(`incident_${data.sosId}`);
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

                    io.to(event.broadcasterId).emit('responder_assigned', { sosId: data.sosId, responder: responderData });

                    if (event.crisisTypes && event.crisisTypes.length > 1) {
                        const otherType = event.crisisTypes.find(t => t.toLowerCase() !== (user.skill || '').toLowerCase()) || event.crisisTypes[1];
                        io.to(event.broadcasterId).emit('system_message', {
                            text: `AI is handling remaining issues. Contacting ${otherType.toUpperCase()} services...`,
                            type: 'ai'
                        });
                    }

                    io.to(`incident_${data.sosId}`).emit('new_message', {
                        sender: 'System',
                        text: `${user.name} has joined the rescue operation!`,
                        type: 'system'
                    });
                }
            }
        });

        // 5. Chat Messaging
        socket.on('send_message', async (data) => {
            const user = connectedUsers.get(socket.id);
            if (user && data.sosId) {
                const messageData = {
                    sender: user.name,
                    senderId: socket.id,
                    text: data.text,
                    timestamp: new Date().toISOString()
                };
                
                io.to(`incident_${data.sosId}`).emit('new_message', messageData);

                // AI HELPER FEATURE: If message starts with @ai, respond as AI
                if (data.text.toLowerCase().startsWith('@ai')) {
                    const query = data.text.substring(3).trim();
                    if (query) {
                        const aiResponse = await sosService.getChatResponse(query);
                        io.to(`incident_${data.sosId}`).emit('new_message', {
                            sender: 'NearHelp AI',
                            senderId: 'ai_bot',
                            text: aiResponse.emergencySummary,
                            timestamp: new Date().toISOString(),
                            isAi: true
                        });
                    }
                }
            }
        });

        // 6. Live Tracking
        socket.on('responder_moved', (data) => {
            if (data.sosId) {
                io.to(`incident_${data.sosId}`).emit('responder_moved', {
                    responderId: socket.id,
                    lat: data.lat,
                    lng: data.lng
                });
            }
        });

        // Handle disconnects
        socket.on('disconnect', () => {
            connectedUsers.delete(socket.id);
            for (const [id, ev] of activeSOS.entries()) {
                if (ev.broadcasterId === socket.id) {
                    socket.broadcast.emit('sos_resolved', { sosId: id });
                    io.to(`incident_${id}`).emit('chat_closed', { sosId: id });
                    activeSOS.delete(id);
                }
            }
            io.emit('admin_update', Array.from(activeSOS.values()));
        });
    });
};
