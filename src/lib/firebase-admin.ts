
'use server';

import * as admin from 'firebase-admin';

// This is a placeholder for the service account configuration.
// In a real application, this should be loaded securely from environment variables.
const serviceAccountConfig = process.env.FIREBASE_ADMIN_SDK_CONFIG;

let initialized = false;

if (serviceAccountConfig) {
  try {
    const serviceAccount = JSON.parse(serviceAccountConfig);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      initialized = true;
    } else {
      initialized = true; // Already initialized
    }
  } catch (error) {
    console.error("Failed to parse or initialize Firebase Admin SDK:", error);
    initialized = false;
  }
} else {
  console.warn('Firebase Admin SDK config is not set. Firebase-dependent features may not work.');
}

export const isFirebaseAdminInitialized = initialized;
export default admin;
