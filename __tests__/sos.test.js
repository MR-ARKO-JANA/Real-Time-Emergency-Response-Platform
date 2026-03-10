const request = require('supertest');
const express = require('express');
const sosRoutes = require('../routes/sos.routes');
const SOS = require('../models/sos.model');

// Mock the SOS model
jest.mock('../models/sos.model');

const app = express();
app.use(express.json());
app.use('/api/sos', sosRoutes);

describe('SOS API Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/sos/ai-guidance', () => {
        it('should return AI guidance for valid crisis type', async () => {
            const response = await request(app)
                .post('/api/sos/ai-guidance')
                .send({
                    crisisType: 'medical',
                    description: 'Person having chest pain'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('firstResponseGuidance');
            expect(response.body).toHaveProperty('emergencySummary');
        });

        it('should return 400 for missing crisisType', async () => {
            const response = await request(app)
                .post('/api/sos/ai-guidance')
                .send({
                    description: 'Emergency'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle AI service errors gracefully', async () => {
            const response = await request(app)
                .post('/api/sos/ai-guidance')
                .send({
                    crisisType: 'fire'
                });

            // Should return fallback guidance even if AI fails
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('firstResponseGuidance');
        });
    });

    describe('GET /api/sos/alerts', () => {
        it('should return all SOS alerts', async () => {
            const mockAlerts = [
                {
                    _id: 'alert1',
                    crisisTypes: ['medical'],
                    status: 'active',
                    broadcaster: { name: 'User 1' }
                },
                {
                    _id: 'alert2',
                    crisisTypes: ['fire'],
                    status: 'resolved',
                    broadcaster: { name: 'User 2' }
                }
            ];

            SOS.find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    sort: jest.fn().mockResolvedValue(mockAlerts)
                })
            });

            const response = await request(app)
                .get('/api/sos/alerts');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });
    });
});
