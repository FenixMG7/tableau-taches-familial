import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

// Configuration du projet Firebase de l'utilisateur.
const firebaseConfig = {
  apiKey: "AIzaSyAOnDVgTN-ZfVUXFbLaProJ32cTKe9yB2Q",
  authDomain: "app-croix.firebaseapp.com",
  projectId: "app-croix",
  storageBucket: "app-croix.appspot.com",
  messagingSenderId: "852438161438",
  appId: "1:852438161438:web:6187bcc3946a926c8b760f",
  measurementId: "G-B8PY372JYL"
};

// Initialise Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporte les services Firebase que vous utiliserez
const db = firebase.firestore();
const auth = firebase.auth();

// Active la persistance hors ligne
db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
        // Plusieurs onglets sont ouverts, la persistance ne peut être activée
        // que dans un seul onglet à la fois.
        console.warn('La persistance Firebase a échoué : plusieurs onglets ouverts.');
    } else if (err.code == 'unimplemented') {
        // Le navigateur actuel ne prend pas en charge toutes les fonctionnalités
        // requises pour activer la persistance.
        console.warn('La persistance Firebase n\'est pas disponible dans ce navigateur.');
    }
});

export { db, auth };
