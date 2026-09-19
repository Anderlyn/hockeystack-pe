import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCpGtXAOdB7Qyt4P8lkWjiNZeoY_Ar-xjE",
    authDomain: "hockeystack-pe.firebaseapp.com",
    projectId: "hockeystack-pe",
    storageBucket: "hockeystack-pe.firebasestorage.app",
    messagingSenderId: "990752033117",
    appId: "1:990752033117:web:cd5960ccee13b58956c0b4",
};

export const firebaseApp =
    getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
