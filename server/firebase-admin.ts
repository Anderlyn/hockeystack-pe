import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";

export const firebaseAdminApp =
    getApps()[0] ??
    initializeApp({
        credential: applicationDefault(),
    });
