const request = require('supertest');
const express = require('express');
const authRoutes = require('../src/api/routes/auth.routes');
const User = require('../src/models/user.model');

// Mock the User model
jest.mock('../src/models/user.model');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Hack to mock mongoose connection state for the controller
const mongoose = require('mongoose');
Object.defineProperty(mongoose.connection, 'readyState', { value: 1, writable: true });

describe('Auth API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/sync', () => {
        it('should sync a new user successfully', async () => {
            const mockUser = {
                _id: 'mockId',
                name: 'Test User',
                email: 'test@example.com',
                firebaseUid: 'firebase123',
                role: 'citizen'
            };

            User.findOne.mockResolvedValue(null);
            User.prototype.save = jest.fn().mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/api/auth/sync')
                .send({
                    firebaseUid: 'firebase123',
                    name: 'Test User',
                    email: 'test@example.com',
                    phone: '1234567890',
                    role: 'citizen',
                    location: '28.6139,77.2090'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('msg');
            expect(response.body.msg).toContain('synced');
        });

        it('should return 400 for invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/sync')
                .send({
                    firebaseUid: 'firebase123',
                    name: 'Test User',
                    email: 'invalid-email',
                    role: 'citizen'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/api/auth/sync')
                .send({
                    name: 'Test User'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle existing user', async () => {
            const existingUser = {
                _id: 'existingId',
                name: 'Existing User',
                email: 'existing@example.com',
                firebaseUid: 'firebase123'
            };

            User.findOne.mockResolvedValue(existingUser);

            const response = await request(app)
                .post('/api/auth/sync')
                .send({
                    firebaseUid: 'firebase123',
                    name: 'Existing User',
                    email: 'existing@example.com',
                    phone: '0987654321'
                });

            expect(response.status).toBe(200);
            expect(response.body.msg).toContain('already synced');
        });
    });
});
