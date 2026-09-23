const admin = require('firebase-admin');

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
} else {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is required.");
}

if (!admin.apps.length) {
    admin.initializeApp({ credential });
}

module.exports = admin;
