const admin = require("firebase-admin");

function parseServiceAccount() {
  const rawValue = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!rawValue) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
  }

  const cleanBase64 = rawValue.trim().replace(/^"|"$/g, "");

  const decoded = Buffer.from(cleanBase64, "base64").toString("utf-8").trim();

  console.log("Decoded Firebase env starts with:", decoded.slice(0, 30));

  let serviceAccount;

  try {
    // Correct Base64 case:
    // {"type":"service_account",...}
    serviceAccount = JSON.parse(decoded);
  } catch (firstError) {
    try {
      // Escaped JSON case:
      // {\"type\":\"service_account\",...}
      const fixedJson = decoded.replace(/^"|"$/g, "").replace(/\\"/g, '"');

      serviceAccount = JSON.parse(fixedJson);
    } catch (secondError) {
      console.error("Invalid Firebase decoded value starts with:");
      console.error(decoded.slice(0, 300));
      throw secondError;
    }
  }

  if (!serviceAccount.project_id) {
    throw new Error("Firebase service account project_id is missing");
  }

  if (!serviceAccount.client_email) {
    throw new Error("Firebase service account client_email is missing");
  }

  if (!serviceAccount.private_key) {
    throw new Error("Firebase service account private_key is missing");
  }

  // Convert private key newlines AFTER JSON.parse()
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

  return serviceAccount;
}

function initFirebase() {
  if (admin.apps.length > 0) {
    return admin;
  }

  const serviceAccount = parseServiceAccount();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });

  console.log("Firebase Admin initialized successfully");

  return admin;
}

module.exports = {
  admin: initFirebase(),
  initFirebase,
};
