/**
 * Geo Utilities for NearHelp Dispatch Engine
 * Calculates Haversine distance and geospatial bounding boxes
 */

/**
 * Calculates the great-circle distance between two coordinates in kilometers using Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;

    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}

/**
 * Checks whether a given location is within a radius of a center coordinate.
 * @param {number} centerLat Center latitude
 * @param {number} centerLon Center longitude
 * @param {number} targetLat Target latitude
 * @param {number} targetLon Target longitude
 * @param {number} radiusKm Radius in km (default: 5km)
 * @returns {boolean}
 */
function isWithinRadius(centerLat, centerLon, targetLat, targetLon, radiusKm = 5) {
    const dist = calculateDistance(centerLat, centerLon, targetLat, targetLon);
    return dist <= radiusKm;
}

/**
 * Validates whether latitude and longitude are valid GPS coordinates
 * @param {number} lat
 * @param {number} lon
 * @returns {boolean}
 */
function isValidCoordinate(lat, lon) {
    return (
        typeof lat === 'number' &&
        typeof lon === 'number' &&
        !isNaN(lat) &&
        !isNaN(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
    );
}

module.exports = {
    calculateDistance,
    isWithinRadius,
    isValidCoordinate
};
