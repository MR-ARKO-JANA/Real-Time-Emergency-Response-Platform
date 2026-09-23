const { calculateDistance, isWithinRadius, isValidCoordinate } = require('../src/utils/geo.utils');

describe('Geo Utilities Tests', () => {
    describe('calculateDistance', () => {
        it('should return 0 when coordinates are identical', () => {
            const dist = calculateDistance(28.6139, 77.2090, 28.6139, 77.2090);
            expect(dist).toBe(0);
        });

        it('should calculate approximate distance between New Delhi and Mumbai (~1148 km)', () => {
            // New Delhi: 28.6139, 77.2090; Mumbai: 19.0760, 72.8777
            const dist = calculateDistance(28.6139, 77.2090, 19.0760, 72.8777);
            expect(dist).toBeGreaterThan(1100);
            expect(dist).toBeLessThan(1200);
        });
    });

    describe('isWithinRadius', () => {
        it('should return true for points within 5km radius', () => {
            // Very close points (approx ~1km apart)
            const result = isWithinRadius(22.7788, 86.1441, 22.7820, 86.1450, 5);
            expect(result).toBe(true);
        });

        it('should return false for points outside 5km radius', () => {
            // Points ~50km apart
            const result = isWithinRadius(22.7788, 86.1441, 23.2000, 86.6000, 5);
            expect(result).toBe(false);
        });
    });

    describe('isValidCoordinate', () => {
        it('should return true for valid latitude and longitude', () => {
            expect(isValidCoordinate(22.7788, 86.1441)).toBe(true);
            expect(isValidCoordinate(0, 0)).toBe(true);
            expect(isValidCoordinate(-45.0, 120.0)).toBe(true);
        });

        it('should return false for invalid coordinates', () => {
            expect(isValidCoordinate(95.0, 86.1441)).toBe(false); // lat > 90
            expect(isValidCoordinate(-95.0, 86.1441)).toBe(false); // lat < -90
            expect(isValidCoordinate(22.7788, 185.0)).toBe(false); // lon > 180
            expect(isValidCoordinate('invalid', 86.1441)).toBe(false);
            expect(isValidCoordinate(NaN, 86.1441)).toBe(false);
        });
    });
});
