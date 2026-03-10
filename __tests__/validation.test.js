const { schemas } = require('../middleware/validation.middleware');

describe('Validation Schemas', () => {
    describe('syncUser schema', () => {
        it('should validate correct user data', () => {
            const validData = {
                firebaseUid: 'firebase123',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234567890',
                role: 'citizen',
                location: '28.6139,77.2090'
            };

            const { error } = schemas.syncUser.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject invalid email', () => {
            const invalidData = {
                firebaseUid: 'firebase123',
                name: 'John Doe',
                email: 'not-an-email',
                role: 'citizen'
            };

            const { error } = schemas.syncUser.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject short name', () => {
            const invalidData = {
                firebaseUid: 'firebase123',
                name: 'J',
                email: 'john@example.com'
            };

            const { error } = schemas.syncUser.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject invalid role', () => {
            const invalidData = {
                firebaseUid: 'firebase123',
                name: 'John Doe',
                email: 'john@example.com',
                role: 'invalid_role'
            };

            const { error } = schemas.syncUser.validate(invalidData);
            expect(error).toBeDefined();
        });
    });

    describe('aiGuidance schema', () => {
        it('should validate correct guidance request', () => {
            const validData = {
                crisisType: 'medical',
                description: 'Person collapsed on street'
            };

            const { error } = schemas.aiGuidance.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should allow empty description', () => {
            const validData = {
                crisisType: 'fire',
                description: ''
            };

            const { error } = schemas.aiGuidance.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject missing crisisType', () => {
            const invalidData = {
                description: 'Emergency situation'
            };

            const { error } = schemas.aiGuidance.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject description over 500 chars', () => {
            const invalidData = {
                crisisType: 'medical',
                description: 'a'.repeat(501)
            };

            const { error } = schemas.aiGuidance.validate(invalidData);
            expect(error).toBeDefined();
        });
    });

    describe('triggerSOS schema', () => {
        it('should validate correct SOS data', () => {
            const validData = {
                crisisTypes: ['medical', 'fire'],
                location: {
                    type: 'Point',
                    coordinates: [77.2090, 28.6139]
                },
                isAnonymous: false
            };

            const { error } = schemas.triggerSOS.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should reject empty crisis types', () => {
            const invalidData = {
                crisisTypes: [],
                location: {
                    type: 'Point',
                    coordinates: [77.2090, 28.6139]
                }
            };

            const { error } = schemas.triggerSOS.validate(invalidData);
            expect(error).toBeDefined();
        });

        it('should reject invalid coordinates', () => {
            const invalidData = {
                crisisTypes: ['medical'],
                location: {
                    type: 'Point',
                    coordinates: [77.2090] // Missing latitude
                }
            };

            const { error } = schemas.triggerSOS.validate(invalidData);
            expect(error).toBeDefined();
        });
    });
});
