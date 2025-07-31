import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTdAqCIi3YsvrJUo958ZHLBj9OD2MjKR8",
  authDomain: "minha-lista-desktop.firebaseapp.com",
  projectId: "minha-lista-desktop",
  storageBucket: "minha-lista-desktop.firebasestorage.app",
  messagingSenderId: "954288998094",
  appId: "1:954288998094:web:80ce2579d95670c023f29f"
};

// Inicializa e exporta o app principal
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Múltiplas abas abertas, a persistência offline pode não funcionar corretamente.");
    } else if (err.code == 'unimplemented') {
        console.error("O navegador atual não suporta a persistência offline.");
    }
  });