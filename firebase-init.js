// Script to import data from JSON to Firebase Realtime Database
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (requires firebase service account key)
const serviceAccount = {
  apiKey: 'AIzaSyA19hRWJOkn6pDGd9DmsydiSW2wRCOfBFo',
  authDomain: 'cinema-0.firebaseapp.com',
  databaseURL: 'https://cinema-0-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'cinema-0',
  storageBucket: 'cinema-0.firebasestorage.app',
  messagingSenderId: '190914981079',
  appId: '1:190914981079:web:2898d4720a28c3d33c1492'
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://cinema-0-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();

// Load data from JSON
const dataPath = path.join(__dirname, 'src/assets/data/data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('Importing data to Firebase...');

// Write data to Firebase
db.ref('/').set(data, (error) => {
  if (error) {
    console.error('Error writing data to Firebase:', error);
    process.exit(1);
  } else {
    console.log('Data successfully imported to Firebase!');
    process.exit(0);
  }
});
