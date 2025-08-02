import { auth, db } from './firebase-config.js';
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    await setPersistence(auth, browserLocalPersistence);

    const googleLoginBtn = document.getElementById('google-login-btn');
    const loginStatus = document.getElementById('login-status');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginStatus.textContent = 'Login encontrado. A carregar...';
            loginStatus.classList.remove('hidden');
            googleLoginBtn.style.display = 'none';
            checkAndRedirectUser(user);
        } else {
            window.electronAPI.readyToShow();
        }
    });

    googleLoginBtn.addEventListener('click', () => {
        loginStatus.textContent = 'Abrindo o navegador para login...';
        loginStatus.classList.remove('hidden');
        window.electronAPI.openExternalLink('https://minha-lista-ponte.vercel.app');
    });

    window.electronAPI.handleDeepLink(async (url) => {
        if (auth.currentUser) {
            return; 
        }
        try {
            loginStatus.textContent = 'Autenticando...';
            const urlParams = new URLSearchParams(new URL(url).search);
            const idToken = urlParams.get('idToken');
            if (!idToken) throw new Error("Token não encontrado no link.");
            
            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
            
        } catch (error) {
            console.error('Erro ao processar o deep link:', error);
            loginStatus.textContent = `Erro: ${error.message}`;
        }
    });

    async function checkAndRedirectUser(user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists() || !docSnap.data().profileComplete) {
            if (!docSnap.exists()) {
                await setDoc(userDocRef, { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL, profileComplete: false });
            }
            window.electronAPI.navigateToConfirmRegister();
        } else {
            window.electronAPI.navigateToApp();
        }
    }

    minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
    maximizeBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
    closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());
});