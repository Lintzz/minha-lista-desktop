import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicUrlInput = document.getElementById('profile-pic-url-input');
    const nicknameInput = document.getElementById('nickname-input');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const statusMessage = document.getElementById('status-message');
    const defaultAvatar = 'https://placehold.co/100x100/2C2C2C/E0E0E0?text=Foto';

    let currentUser = null;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            // Preenche os campos com as informações do Google como sugestão
            profilePicPreview.src = user.photoURL || defaultAvatar;
            profilePicUrlInput.value = user.photoURL || '';
            nicknameInput.value = user.displayName || '';
            window.electronAPI?.readyToShow();
        } else {
            window.location.href = '/src/html/login.html';
        }
    });

    // Atualiza a pré-visualização da imagem em tempo real
    profilePicUrlInput.addEventListener('input', () => {
        const newUrl = profilePicUrlInput.value.trim();
        if (newUrl) {
            profilePicPreview.src = newUrl;
        } else {
            profilePicPreview.src = defaultAvatar;
        }
    });

    // Adiciona um fallback caso o link da imagem falhe
    profilePicPreview.onerror = () => {
        profilePicPreview.src = defaultAvatar;
    };

    saveProfileBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        const newNickname = nicknameInput.value.trim();
        if (!newNickname) {
            statusMessage.textContent = 'Por favor, insira um nome de utilizador.';
            statusMessage.classList.remove('hidden');
            return;
        }

        saveProfileBtn.disabled = true;
        statusMessage.textContent = 'A guardar o seu perfil...';
        statusMessage.classList.remove('hidden');

        try {
            const photoURL = profilePicUrlInput.value.trim() || currentUser.photoURL;

            // Atualiza o documento do utilizador no Firestore
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                displayName: newNickname,
                photoURL: photoURL,
                profileComplete: true // Marca o perfil como completo
            });

            // Navega para a aplicação principal
            window.electronAPI?.navigateToApp();

        } catch (error) {
            console.error("Erro ao guardar o perfil:", error);
            statusMessage.textContent = 'Erro ao guardar. Tente novamente.';
            saveProfileBtn.disabled = false;
        }
    });
});