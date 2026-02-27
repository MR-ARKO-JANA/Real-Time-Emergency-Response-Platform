const SOS = require('../models/sos.model');
const User = require('../models/user.model');

// In-Memory State for active fast-tracking, DB is for persistence
const activeSOS = new Map(); // id -> sos payload
const connectedUsers = new Map(); // socketId -> user payload

module.exports = function (io) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // 1. Initial Connection & Location Update
        socket.on('update_location', async (data) => {
            connectedUsers.set(socket.id, {
                id: socket.id, // For a real app, bind the user's JWT _id here
                lat: data.lat,
                lng: data.lng,
                name: `User-${socket.id.substring(0, 4)}`,
                skill: 'Neighbour'
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

            // Persist to mongo asynchronously
            try {
                // In a perfect world, we attach the user _id. Mocking a fake user for DB storage strictly for the prototype if auth isn't enforced strictly here yet.
                // const newDbSos = new SOS({ broadcaster: userId, crisisType: data.type, location: { type: 'Point', coordinates: [data.lng, data.lat] }, isAnonymous: data.isAnon });
                // await newDbSos.save();
            } catch (e) {
                console.error("Failed to persist SOS", e);
            }

            activeSOS.set(sosEvent.id, sosEvent);
            socket.join(`incident_${sosEvent.id}`); // Victim joins room
            socket.broadcast.emit('new_sos', sosEvent);
            socket.emit('sos_confirmed', sosEvent);
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
