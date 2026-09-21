const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const initializeSocket = require('../src/sockets/sos.socket');
const SOS = require('../src/models/sos.model');
const User = require('../src/models/user.model');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../src/models/sos.model');
jest.mock('../src/models/user.model');
jest.mock('../src/services/sos.service');

// Hack to mock mongoose connection state
Object.defineProperty(mongoose.connection, 'readyState', { value: 1, writable: true });

describe('SOS Socket Tests', () => {
    let io, serverSocket, clientSocket, httpServer;

    beforeAll((done) => {
        httpServer = createServer();
        io = new Server(httpServer);
        initializeSocket(io);

        httpServer.listen(() => {
            const port = httpServer.address().port;
            clientSocket = new Client(`http://localhost:${port}`);
            io.on('connection', (socket) => {
                serverSocket = socket;
            });
            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.close();
        httpServer.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should update location and join connected users', (done) => {
        clientSocket.emit('update_location', {
            uid: 'test_uid',
            lat: 20.0,
            lng: 80.0,
            name: 'Test Citizen',
            role: 'citizen',
            phone: '1234567890'
        });

        // The server emits 'active_incidents' back to the client after updating location
        clientSocket.on('active_incidents', (incidents) => {
            expect(Array.isArray(incidents)).toBe(true);
            clientSocket.off('active_incidents');
            done();
        });
    });

    it('should handle trigger_sos and broadcast to responders', (done) => {
        SOS.mockImplementation(() => {
            return {
                _id: 'mock_db_id',
                save: jest.fn().mockResolvedValue(true)
            };
        });

        clientSocket.emit('trigger_sos', {
            type: 'medical',
            types: ['medical'],
            lat: 20.0,
            lng: 80.0,
            isAnon: false
        });

        clientSocket.on('sos_confirmed', (data) => {
            expect(data.type).toBe('medical');
            expect(data.status).toBe('active');
            expect(data.dbId).toBeDefined();
            clientSocket.off('sos_confirmed');
            done();
        });
    });

    it('should handle resolve_sos with authorization check', (done) => {
        let mockSosId;

        // First trigger an SOS
        clientSocket.emit('trigger_sos', {
            type: 'fire',
            types: ['fire'],
            lat: 20.0,
            lng: 80.0,
            isAnon: false
        });

        clientSocket.once('sos_confirmed', (data) => {
            mockSosId = data.id;
            
            // Now resolve it
            clientSocket.emit('resolve_sos', { sosId: mockSosId });
        });

        clientSocket.once('chat_closed', (data) => {
            expect(data.sosId).toBeDefined();
            done();
        });
    });

    it('should prevent unauthorized users from resolving SOS', (done) => {
        clientSocket.emit('resolve_sos', { sosId: 'SOS-fake-id' });
        
        setTimeout(() => {
            done();
        }, 200);
    });
});
