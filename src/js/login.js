import { auth, db } from './firebase-config.js';
// Adiciona as funções de persistência e onAuthStateChanged
import { GoogleAuthProvider, signInWithCredential, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. CONFIGURA A PERSISTÊNCIA PARA SALVAR A SESSÃO
    await setPersistence(auth, browserLocalPersistence);

    // --- Seleção de Elementos ---
    const googleLoginBtn = document.getElementById('google-login-btn');
    const loginStatus = document.getElementById('login-status');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');

    // 2. "PORTEIRO": VERIFICA SE JÁ EXISTE UM USUÁRIO LOGADO
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Se encontrou um usuário, redireciona direto para o app
            console.log("Sessão salva encontrada para o usuário:", user.uid);
            loginStatus.textContent = 'Login encontrado. A carregar...';
            loginStatus.classList.remove('hidden');
            googleLoginBtn.style.display = 'none'; // Esconde o botão de login
            checkAndRedirectUser(user);
        } else {
            // Se não, mostra a tela de login para o usuário
            console.log("Nenhum usuário logado. Exibindo tela de login.");
            window.electronAPI.readyToShow();
        }
    });

    // 3. BOTÃO DE LOGIN: Abre o navegador externo (sem alteração)
    googleLoginBtn.addEventListener('click', () => {
        loginStatus.textContent = 'Abrindo o navegador para login...';
        loginStatus.classList.remove('hidden');
        window.electronAPI.openExternalLink('https://minha-lista-ponte.vercel.app'); // Sua URL da Vercel
    });

    // 4. DEEP LINK: Ouve pelo token e faz o login (sem alteração)
    window.electronAPI.handleDeepLink(async (url) => {
        try {
            loginStatus.textContent = 'Autenticando...';
            loginStatus.classList.remove('hidden');
            const urlParams = new URLSearchParams(new URL(url).search);
            const idToken = urlParams.get('idToken');
            if (!idToken) throw new Error("Token não encontrado no link.");
            const credential = GoogleAuthProvider.credential(idToken);
            // Ao fazer o login, a persistência salva a sessão e o onAuthStateChanged é acionado
            await signInWithCredential(auth, credential);
        } catch (error) {
            console.error('Erro ao processar o deep link:', error);
            loginStatus.textContent = `Erro: ${error.message}`;
        }
    });
    
    // --- FUNÇÃO DE REDIRECIONAMENTO ---
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

    // --- CONTROLES DA JANELA ---
    minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
    maximizeBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());
    closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());
});