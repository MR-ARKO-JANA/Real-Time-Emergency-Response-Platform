const SOS = require('../models/sos.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');

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
        console.log('Client connected:', socket.id);

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
                    }
                }
            } catch (err) {
                console.error("DB lookup failed in socket:", err);
            }

            connectedUsers.set(socket.id, {
                id: data.uid || socket.id,
                lat: data.lat,
                lng: data.lng,
                name: userName || `User-${socket.id.substring(0, 4)}`,
                skill: userSkill || 'Neighbour'
            });
            // Send back current active SOS
            socket.emit('active_incidents', Array.from(activeSOS.values()));
        });

        // 2. Broadcast SOS
        socket.on('trigger_sos', async (data) => {
            console.log(`SOS Triggered: ${data.type} at [${data.lat}, ${data.lng}]`);

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
                // For hackathon: generate a valid ObjectId if user id isn't one
                const bId = mongoose.Types.ObjectId.isValid(userSession?.id) ? userSession.id : new mongoose.Types.ObjectId();

                if (mongoose.connection.readyState === 1) {
                    const newDbSos = new SOS({
                        broadcaster: bId,
                        crisisType: data.type,
                        location: { type: 'Point', coordinates: [data.lng, data.lat] },
                        isAnonymous: data.isAnon
                    });
                    await newDbSos.save();
                    sosEvent.dbId = newDbSos._id.toString();
                } else {
                    throw new Error("MongoDB not connected natively");
                }
            } catch (dbError) {
                console.warn("MongoDB Save Failed (ignoring for in-memory broadcast):", dbError.message);
                sosEvent.dbId = `MOCK-DB-${Date.now()}`;
            }

            try {
                activeSOS.set(sosEvent.id, sosEvent);
                socket.join(`incident_${sosEvent.id}`); // Victim joins room

                // 2. Broadcast to connected users within 2km using Haversine formula
                for (const [sId, uData] of connectedUsers.entries()) {
                    // sId !== socket.id avoids sending it back to the broadcaster
                    if (sId !== socket.id) {
                        const dist = getDistance(data.lat, data.lng, uData.lat, uData.lng);

                        // Check if within 2000 meters (2km)
                        if (dist <= 2000) {
                            io.to(sId).emit('new_sos', sosEvent);
                        }
                    }
                }

                socket.emit('sos_confirmed', sosEvent);
            } catch (e) {
                console.error("Failed to persist and broadcast SOS", e);
            }
        });

        // 3. Resolve SOS
        socket.on('resolve_sos', async (data) => {
            if (activeSOS.has(data.sosId)) {
                socket.broadcast.emit('sos_resolved', { sosId: data.sosId });
                io.to(`incident_${data.sosId}`).emit('chat_closed', { sosId: data.sosId });
                activeSOS.delete(data.sosId);
                io.emit('admin_update', Array.from(activeSOS.values()));
                console.log(`SOS Resolved: ${data.sosId}`);
            }
        });

        // 4. Accept SOS (Responder Flow)
        socket.on('accept_sos', (data) => {
            if (activeSOS.has(data.sosId)) {
                const event = activeSOS.get(data.sosId);
                const user = connectedUsers.get(socket.id);

                if (user) {
                    socket.join(`incident_${data.sosId}`); // Responder joins room
                    const responderData = { id: user.id, name: user.name, skill: user.skill, lat: user.lat, lng: user.lng, img: 11, time: "Active" };
                    event.responders.push(responderData);

                    io.to(event.broadcasterId).emit('responder_assigned', { sosId: data.sosId, responder: responderData });
                    io.to(`incident_${data.sosId}`).emit('new_message', {
                        sender: 'System',
                        text: `${user.name} has joined the rescue operation!`,
                        type: 'system'
                    });
                }
            }
        });

        // 5. Chat Messaging
        socket.on('send_message', (data) => {
            const user = connectedUsers.get(socket.id);
            if (user && data.sosId) {
                io.to(`incident_${data.sosId}`).emit('new_message', {
                    sender: user.name,
                    senderId: socket.id,
                    text: data.text,
                    timestamp: new Date().toISOString()
                });
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
            console.log('Client disconnected:', socket.id);
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
