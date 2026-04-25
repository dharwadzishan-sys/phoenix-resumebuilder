const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, '..', 'serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

// Firestore instance
const db = admin.firestore();

// Firebase Auth instance
const auth = admin.auth();

console.log('🔥 Firebase Admin SDK initialized for project:', serviceAccount.project_id);

module.exports = { admin, db, auth };
