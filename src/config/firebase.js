const admin = require("firebase-admin");

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
    initialized = true;
  } catch (err) {
    console.error("Firebase initialization error:", err.message);
  }

  return admin;
}

module.exports = { admin: initFirebase(), initFirebase };
