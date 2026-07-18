// Firebase client SDK — client-side only, lazy initialized
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "AIzaSyBwDi5SOFvQU_k-2U36V8vphzTs7Df6lSw",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "reachthesoul-prod.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "reachthesoul-prod",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "reachthesoul-prod.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "211204916402",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:211204916402:web:c906137a259dfc675bb5ab",
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID     || "G-EN9GZFLR7W",
};

// Lazy singletons — only initialized in browser, never during SSR
let _app:       FirebaseApp | undefined;
let _auth:      Auth       | undefined;
let _db:        Firestore  | undefined;
let _functions: Functions  | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
    // Force session to persist in localStorage — survives page reloads, tab
    // close, and navigation. Without this, some environments (in-app browsers,
    // restricted IndexedDB) fall back to in-memory persistence, which logs the
    // user out the moment they navigate. Fire-and-forget: the promise resolves
    // before any sign-in call that depends on it.
    if (typeof window !== "undefined") {
      setPersistence(_auth, browserLocalPersistence).catch((err) => {
        console.warn("[firebase] Failed to set local persistence:", err);
      });
    }
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
  }
  return _db;
}

export function getFirebaseFunctions(): Functions {
  if (!_functions) {
    _functions = getFunctions(getFirebaseApp(), "asia-southeast1");
  }
  return _functions;
}

// Convenience re-exports — safe to use in client components
export const auth      = getFirebaseAuth();
export const db        = getFirebaseDb();
export const functions = getFirebaseFunctions();