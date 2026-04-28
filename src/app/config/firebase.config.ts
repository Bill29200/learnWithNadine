import { initializeApp } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyA19hRWJOkn6pDGd9DmsydiSW2wRCOfBFo',
  authDomain: 'cinema-0.firebaseapp.com',
  databaseURL: 'https://cinema-0-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'cinema-0',
  storageBucket: 'cinema-0.firebasestorage.app',
  messagingSenderId: '190914981079',
  appId: '1:190914981079:web:2898d4720a28c3d33c1492'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const db: Database = getDatabase(app);
export default app;
