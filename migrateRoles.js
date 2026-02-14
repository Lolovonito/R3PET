import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDmITm8NnBqL2NrV-xQsnxFm-hn5_BfPUk",
    authDomain: "r3pet-e3978.firebaseapp.com",
    projectId: "r3pet-e3978",
    storageBucket: "r3pet-e3978.firebasestorage.app",
    messagingSenderId: "841567121586",
    appId: "1:841567121586:web:2ec9f5067a1b375cb999ab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateRoles() {
    console.log("Iniciando migración de roles...");
    const querySnapshot = await getDocs(collection(db, "profiles"));
    let count = 0;

    for (const document of querySnapshot.docs) {
        const data = document.data();
        let newRole = null;

        if (data.role === 'student') newRole = 'alumno';
        else if (data.role === 'registrar') newRole = 'registrador';

        if (newRole) {
            await updateDoc(doc(db, "profiles", document.id), {
                role: newRole
            });
            console.log(`Actualizado ${data.email || document.id}: ${data.role} -> ${newRole}`);
            count++;
        }
    }

    console.log(`Migración completada. ${count} perfiles actualizados.`);
    process.exit(0);
}

migrateRoles().catch(err => {
    console.error("Error en la migración:", err);
    process.exit(1);
});
