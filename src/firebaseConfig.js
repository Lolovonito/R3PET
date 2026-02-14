import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase - Reemplazada con credenciales del proyecto r3pet-e3978
const firebaseConfig = {
    apiKey: "AIzaSyDmITm8NnBqL2NrV-xQsnxFm-hn5_BfPUk",
    authDomain: "r3pet-e3978.firebaseapp.com",
    projectId: "r3pet-e3978",
    storageBucket: "r3pet-e3978.firebasestorage.app",
    messagingSenderId: "841567121586",
    appId: "1:841567121586:web:2ec9f5067a1b375cb999ab",
    measurementId: "G-L5PYCT865H"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
