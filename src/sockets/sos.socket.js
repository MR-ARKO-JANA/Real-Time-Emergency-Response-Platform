const SOS = require('../models/sos.model');
const User = require('../models/user.model');
const mongoose = require('mongoose');
const sosService = require('../services/sos.service');
const incidentService = require('../services/incident.service');
const responderService = require('../services/responder.service');
const logger = require('../loaders/logger');

// In-Memory State for active fast-tracking, DB is for persistence
const activeSOS = new Map(); // id -> sos payload
const connectedUsers = new Map(); // socketId -> user payload

// Removed old getDistance function, now located in incidentService

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
                const conf = data.confidence != null ? ` [conf=${(data.confidence * 100).toFixed(0)}%]` : '';
                const urg = data.urgency ? ` [urgency=${data.urgency.toUpperCase()}]` : '';
                logger.info(`[VOICE SOS] Automatic ${data.type.toUpperCase()} trigger activated${conf}${urg}: ${data.description}`);
            }
            const sosEvent = {
                id: `SOS-${Date.now()}`,
                broadcasterId: socket.id,
                type: data.type,
                lat: data.lat,
                lng: data.lng,
                isAnon: data.isAnon,
                isVoice: data.isVoice || false,
                confidence: data.confidence || null,
                urgency: data.urgency || null,
                responders: [],
                status: 'active'
            };

            try {
                // 1. Save new SOS incident to MongoDB
                const userSession = connectedUsers.get(socket.id);
                if (!userSession) {
                    socket.emit('sos_failed', { message: "Authentication required to broadcast SOS" });
                    return;
                }
                const bId = mongoose.Types.ObjectId.isValid(userSession.id) ? userSession.id : new mongoose.Types.ObjectId();

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
                    throw new Error("MongoDB not connected");
                }
            } catch (dbError) {
                logger.error(`[SOS FAILED] Failed to save SOS to database: ${dbError.message}`);
                socket.emit('sos_failed', { message: "Failed to persist SOS event to the dispatch system. Please use SMS fallback." });
                return; // Stop execution, do NOT broadcast fake incidents
            }

            try {
                activeSOS.set(sosEvent.id, sosEvent);
                socket.join(`incident_${sosEvent.id}`);

                const targetedResponders = incidentService.matchResponders(data, connectedUsers, socket.id);

                targetedResponders.forEach(r => {
                    io.to(r.sId).emit('new_sos', {
                        ...sosEvent,
                        priority: r.priority,
                        matchedDomain: r.skillLabel
                    });
                });

                // ── Global Broadcast for Voice SOS (Safety override) ──
                if (data.isVoice) {
                    const responderIds = new Set(targetedResponders.map(r => r.sId));
                    for (const [sId, uData] of connectedUsers.entries()) {
                        if (sId !== socket.id && !responderIds.has(sId)) {
                            io.to(sId).emit('new_sos', {
                                ...sosEvent,
                                priority: 3,
                                matchedDomain: "Global Alert (Voice)"
                            });
                        }
                    }
                }

                // NOTE: This emits a UI notification to the broadcaster only.
                // NearHelp does NOT automatically contact external emergency services.
                // Users must call 112 directly for official dispatch.
                const emergencyNumber = process.env.EMERGENCY_CONTACT_NUMBER || "112";
                (data.types || [data.type]).forEach(type => {
                    socket.emit('ai_automated_call', {
                        type: type,
                        number: emergencyNumber,
                        location: [data.lat, data.lng],
                        message: `NearHelp has notified nearby responders for ${type.toUpperCase()}. Please also dial ${emergencyNumber} for official emergency services.`
                    });

                    io.emit('system_message', {
                        text: `NearHelp is coordinating nearby responders for ${type.toUpperCase()} emergency. Dial ${emergencyNumber} for official dispatch.`,
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
            const event = activeSOS.get(data.sosId);
            if (event) {
                // Only the original broadcaster can resolve their own SOS
                if (event.broadcasterId !== socket.id) {
                    socket.emit('error_msg', { message: 'Unauthorized: Only the person who triggered this SOS can resolve it.' });
                    return;
                }
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

                const result = responderService.acceptIncident(event, user);
                
                if (!result.success) {
                    socket.emit('error_msg', { message: result.error });
                    return;
                }

                socket.join(`incident_${data.sosId}`);

                io.to(event.broadcasterId).emit('responder_assigned', { sosId: data.sosId, responder: result.responderData });

                if (result.secondaryMessage) {
                    io.to(event.broadcasterId).emit('system_message', {
                        text: result.secondaryMessage,
                        type: 'ai'
                    });
                }

                io.to(`incident_${data.sosId}`).emit('new_message', {
                    sender: 'System',
                    text: `${user.name} has joined the rescue operation!`,
                    type: 'system'
                });
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

        // 7. WebRTC Voice Call Signaling
        socket.on('webrtc_signal', (data) => {
            // Broadcast signal to everyone in the incident room except the sender
            socket.to(`incident_${data.sosId}`).emit('webrtc_signal', {
                senderId: socket.id,
                type: data.type,
                payload: data.payload
            });
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
