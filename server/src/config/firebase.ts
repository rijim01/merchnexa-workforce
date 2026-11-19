import admin from "firebase-admin";
import { config } from "./env.js";

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (!firebaseApp) {
    if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey,
        }),
      });
      console.log("✓ Firebase Admin initialized with service account.");
    } else {
      console.warn("⚠ Firebase credentials not fully configured in .env. Running in mock/development mode.");
    }
  }
  return firebaseApp;
}

export const auth = {
  verifyIdToken: async (token: string) => {
    const app = getFirebaseAdmin();
    if (!app) {
      // Mock dev token verification
      return {
        uid: "mock-admin-uid",
        email: "jim@merchnexa.com",
        role: "ADMIN",
      };
    }
    return admin.auth().verifyIdToken(token);
  },
};
