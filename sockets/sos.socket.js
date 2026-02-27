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
            socket.broadcast.emit('new_sos', sosEvent);
            socket.emit('sos_confirmed', sosEvent);

            // Mock Auto-Assign Responders for Prototype feeling
            setTimeout(() => {
                if (activeSOS.has(sosEvent.id)) {
                    const mock_res = [
                        { id: 'm1', name: "Dr. Sarah", skill: "Doctor", img: "44", time: "2 min" },
                        { id: 'm2', name: "Mike T.", skill: "CPR Cert", img: "59", time: "4 min" }
                    ];

                    mock_res.forEach((m, i) => {
                        setTimeout(() => {
                            if (activeSOS.has(sosEvent.id)) {
                                m.lat = data.lat + (Math.random() - 0.5) * 0.01;
                                m.lng = data.lng + (Math.random() - 0.5) * 0.01;

                                const event = activeSOS.get(sosEvent.id);
                                event.responders.push(m);

                                io.to(sosEvent.broadcasterId).emit('responder_assigned', { sosId: sosEvent.id, responder: m });
                                io.emit('admin_update', Array.from(activeSOS.values()));
                            }
                        }, 1000 + (2500 * i));
                    });
                }
            }, 2000);
        });

        // 3. Resolve SOS
        socket.on('resolve_sos', async (data) => {
            if (activeSOS.has(data.sosId)) {
                // Here we would also update the MongoDB record status to 'resolved'
                socket.broadcast.emit('sos_resolved', { sosId: data.sosId });
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
                    const responderData = { id: user.id, name: user.name, skill: user.skill, lat: user.lat, lng: user.lng, img: 11, time: "3 min" };
                    event.responders.push(responderData);
                    io.to(event.broadcasterId).emit('responder_assigned', { sosId: data.sosId, responder: responderData });
                }
            }
        });

        // Handle disconnects
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            connectedUsers.delete(socket.id);
            for (const [id, ev] of activeSOS.entries()) {
                if (ev.broadcasterId === socket.id) {
                    socket.broadcast.emit('sos_resolved', { sosId: id });
                    activeSOS.delete(id);
                }
            }
            io.emit('admin_update', Array.from(activeSOS.values()));
        });
    });
};
