// Firebase Client SDK Configuration
// These are PUBLIC keys — safe to commit (they only identify your project)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: 'phoenix-resumebuilder.firebaseapp.com',
  projectId: 'phoenix-resumebuilder',
  storageBucket: 'phoenix-resumebuilder.firebasestorage.app',
  messagingSenderId: '678167122990',
  appId: '1:678167122990:web:10ff06fd024cb2cc6a7bbf',
  measurementId: 'G-T9SPJ1RT43',
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth instance
const auth = getAuth(app);

// Social providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export { app, auth, googleProvider, githubProvider };
