// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
// Note: Replace these with your actual Firebase project credentials
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxL3dJQYoaSmlj0O84_mNKJbCV0KnAwJI",
  authDomain: "irrigation-predictor.firebaseapp.com",
  projectId: "irrigation-predictor",
  storageBucket: "irrigation-predictor.firebasestorage.app",
  messagingSenderId: "480714790732",
  appId: "1:480714790732:web:3ec90e7083002131ace1e9",
  measurementId: "G-1CCZFXC97T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// For development, you can use Firebase emulators
// Uncomment these lines if you want to use local emulators
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   connectAuthEmulator(auth, 'http://localhost:9099');
// }

export default app;
