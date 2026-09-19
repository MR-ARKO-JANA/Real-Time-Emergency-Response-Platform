const admin = require('firebase-admin');

let credential;

// Prefer environment variable (production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
} else {
    // Fallback: local file for development only
    // NEVER commit firebase-service-account.json to git
    const serviceAccount = require('./firebase-service-account.json');
    credential = admin.credential.cert(serviceAccount);
}

if (!admin.apps.length) {
    admin.initializeApp({ credential });
}

module.exports = admin;
