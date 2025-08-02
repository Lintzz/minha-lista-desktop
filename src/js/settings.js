import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, deleteUser, GoogleAuthProvider, reauthenticateWithCredential, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { applyAppearance } from './appearance.js';

document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let currentSettings = {};
    let confirmCallback = null;
    let isReauthenticatingForDelete = false;

    const sidebarLinks = document.querySelectorAll('.settings-sidebar .nav-link');
    const tabContents = document.querySelectorAll('.settings-content .tab-content');
    const btnBack = document.getElementById('btn-back');
    const themeSelector = document.getElementById('theme-selector');
    const accentColorSelector = document.getElementById('accent-color-selector');
    const listVisibilityContainer = document.getElementById('list-visibility-container');
    const btnDeleteAllLists = document.getElementById('btn-delete-all-lists');
    const btnDeleteAccount = document.getElementById('btn-delete-account');
    const btnImport = document.getElementById('btn-import');
    const btnExport = document.getElementById('btn-export');
    const btnGithub = document.getElementById('btn-github');
    const linkJikan = document.getElementById('link-jikan');
    const linkTmdb = document.getElementById('link-tmdb');
    const linkGoogleBooks = document.getElementById('link-google-books');
    const linkComicVine = document.getElementById('link-comic-vine');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalBtnConfirm = document.getElementById('modal-btn-confirm');
    const modalBtnCancel = document.getElementById('modal-btn-cancel');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const nicknameInput = document.getElementById('nickname-input');
    const profilePicUrlInput = document.getElementById('profile-pic-url-input');
    const btnSaveProfile = document.getElementById('btn-save-profile');
    const profileStatusMessage = document.getElementById('profile-status-message');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadAndApplySettings();
            setupEventListeners();
            
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                nicknameInput.value = userData.displayName || '';
                profilePicUrlInput.value = userData.photoURL || '';
                profilePicPreview.src = userData.photoURL || 'https://placehold.co/100x100/2C2C2C/E0E0E0?text=Foto';
            }
        } else {
            window.electronAPI.navigateToMain();
        }
    });

    async function loadAndApplySettings() {
        try {
            if (window.electronAPI) {
                currentSettings = await window.electronAPI.loadSettings();
            }
        } catch (error) {
            console.error("Falha ao carregar as configurações:", error);
            currentSettings = {
                theme: 'theme-dark', accentColor: 'blue',
                visibleLists: { anime: true, serie: true, filme: true, manga: true, livro: true, hq: true }
            };
        } finally {
            applyAppearance(currentSettings);
            themeSelector.value = currentSettings.theme || 'theme-dark';
            accentColorSelector.value = currentSettings.accentColor || 'blue';
            renderListVisibilityToggles();
            window.electronAPI?.readyToShow();
        }
    }

    function renderListVisibilityToggles() {
        listVisibilityContainer.innerHTML = '';
        const listKeys = ['anime', 'serie', 'filme', 'manga', 'livro', 'hq'];
        listKeys.forEach(key => {
            const isVisible = currentSettings.visibleLists[key] !== false;
            const div = document.createElement('div');
            div.className = 'list-toggle';
            div.innerHTML = `
                <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                <label class="switch">
                    <input type="checkbox" data-list="${key}" ${isVisible ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            listVisibilityContainer.appendChild(div);
        });

        listVisibilityContainer.querySelectorAll('input[type="checkbox"]').forEach(toggle => {
            toggle.addEventListener('change', handleListVisibilityChange);
        });
    }

    function showConfirmationModal(title, message, onConfirm) {
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        confirmCallback = onConfirm;
        modalBtnCancel.classList.remove('hidden');
        modalBtnConfirm.textContent = 'Confirmar';
        modalBtnConfirm.classList.add('destructive');
        modalOverlay.classList.remove('hidden');
        setTimeout(() => modalOverlay.classList.add('visible'), 10);
    }

    function showCustomAlert(title, message) {
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        modalBtnCancel.classList.add('hidden');
        modalBtnConfirm.textContent = 'OK';
        modalBtnConfirm.classList.remove('destructive');
        confirmCallback = () => hideModal();
        modalOverlay.classList.remove('hidden');
        setTimeout(() => modalOverlay.classList.add('visible'), 10);
    }

    function hideModal() {
        modalOverlay.classList.remove('visible');
        setTimeout(() => {
            modalOverlay.classList.add('hidden');
            modalBtnCancel.classList.remove('hidden');
            modalBtnConfirm.textContent = 'Confirmar';
            modalBtnConfirm.classList.add('destructive');
        }, 200);
        confirmCallback = null;
    }

    function setupEventListeners() {
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                sidebarLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                tabContents.forEach(content => {
                    content.classList.toggle('active', content.id === tab);
                });
            });
        });

        btnBack.addEventListener('click', () => window.electronAPI?.navigateToApp());
        minimizeBtn.addEventListener('click', () => window.electronAPI?.minimizeWindow());
        maximizeBtn.addEventListener('click', () => window.electronAPI?.maximizeWindow());
        closeBtn.addEventListener('click', () => window.electronAPI?.closeWindow());
        themeSelector.addEventListener('change', handleThemeChange);
        accentColorSelector.addEventListener('change', handleAccentColorChange);
        btnDeleteAllLists.addEventListener('click', handleDeleteAllLists);
        btnDeleteAccount.addEventListener('click', handleDeleteAccount);
        btnImport.addEventListener('click', handleImportJson);
        btnExport.addEventListener('click', handleExportJson);
        btnGithub.addEventListener('click', () => window.electronAPI.openExternalLink('https://github.com/Lintzz'));
        linkJikan.addEventListener('click', () => window.electronAPI.openExternalLink('https://jikan.moe'));
        linkTmdb.addEventListener('click', () => window.electronAPI.openExternalLink('https://www.themoviedb.org/'));
        linkGoogleBooks.addEventListener('click', () => window.electronAPI.openExternalLink('https://developers.google.com/books'));
        linkComicVine.addEventListener('click', () => window.electronAPI.openExternalLink('https://comicvine.gamespot.com/api/'));
        modalBtnCancel.addEventListener('click', hideModal);
        modalBtnConfirm.addEventListener('click', () => { if (typeof confirmCallback === 'function') { confirmCallback(); } });
        modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });

        btnSaveProfile.addEventListener('click', handleProfileSave);
        profilePicUrlInput.addEventListener('input', () => {
            const newUrl = profilePicUrlInput.value.trim();
            profilePicPreview.src = newUrl || 'https://placehold.co/100x100/2C2C2C/E0E0E0?text=Foto';
        });

        window.electronAPI.handleDeepLink(async (url) => {
            if (!isReauthenticatingForDelete || !currentUser) return;
            isReauthenticatingForDelete = false;

            try {
                const urlParams = new URLSearchParams(new URL(url).search);
                const idToken = urlParams.get('idToken');
                if (!idToken) throw new Error("Token não encontrado.");

                const credential = GoogleAuthProvider.credential(idToken);
                await reauthenticateWithCredential(currentUser, credential);
                
                showCustomAlert('Sucesso', 'Reautenticação concluída. Apagando a conta agora...');
                
                const userDocRef = doc(db, 'users', currentUser.uid);
                await deleteDoc(userDocRef);
                await deleteUser(currentUser);

            } catch (error) {
                console.error("Erro ao reautenticar e apagar conta:", error);
                showCustomAlert('Falha', 'A reautenticação falhou. A conta não foi apagada.');
            }
        });
    }

    async function handleThemeChange(e) {
        currentSettings.theme = e.target.value;
        applyAppearance(currentSettings);
        await window.electronAPI?.saveSettings(currentSettings);
    }

    async function handleAccentColorChange(e) {
        currentSettings.accentColor = e.target.value;
        applyAppearance(currentSettings);
        await window.electronAPI?.saveSettings(currentSettings);
    }

    async function handleListVisibilityChange(e) {
        const listName = e.target.dataset.list;
        const isVisible = e.target.checked;
        const visibleCount = Object.values(currentSettings.visibleLists).filter(v => v).length;
        if (visibleCount === 1 && !isVisible) {
            e.target.checked = true;
            showCustomAlert('Aviso', 'Pelo menos uma lista deve permanecer visível.');
            return;
        }
        currentSettings.visibleLists[listName] = isVisible;
        await window.electronAPI?.saveSettings(currentSettings);
    }
    
    async function handleExportJson() {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().lists) {
            const allData = docSnap.data().lists;
            const resultado = await window.electronAPI.exportarJson(allData);
            if (resultado.success) {
                showCustomAlert('Sucesso', 'Backup exportado com sucesso!');
            } else if (!resultado.message.includes('cancelada')) {
                showCustomAlert('Erro', `Ocorreu um erro ao exportar: ${resultado.message}`);
            }
        } else {
            showCustomAlert('Aviso', 'Não há dados para exportar.');
        }
    }

    async function handleImportJson() {
        if (!currentUser) return;
        const importedData = await window.electronAPI.importarJson();
        if (importedData) {
            showConfirmationModal(
                'Restaurar Backup?',
                '<strong>Atenção:</strong> Tem a certeza de que deseja substituir todos os seus dados atuais por este backup? Esta ação não pode ser desfeita.',
                async () => {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    await setDoc(userDocRef, { lists: importedData }, { merge: true });
                    hideModal();
                    showCustomAlert('Sucesso', 'Backup restaurado com sucesso! Os dados serão atualizados da próxima vez que abrir a lista.');
                }
            );
        } else {
            showCustomAlert('Aviso', 'Importação cancelada ou o ficheiro de backup é inválido.');
        }
    }

    function handleDeleteAllLists() {
        showConfirmationModal(
            'Apagar Todas as Listas?',
            '<strong>Atenção:</strong> Esta ação é irreversível e apagará todos os itens de todas as suas listas. Deseja continuar?',
            async () => {
                if (!currentUser) return;
                const emptyLists = { anime: [], serie: [], filme: [], manga: [], livro: [], hq: [] };
                const userDocRef = doc(db, 'users', currentUser.uid);
                await setDoc(userDocRef, { lists: emptyLists }, { merge: true });
                hideModal();
                showCustomAlert('Sucesso', 'Todas as listas foram apagadas.');
            }
        );
    }

    async function handleProfileSave() {
        if (!currentUser) return;

        const newNickname = nicknameInput.value.trim();
        const newPhotoURL = profilePicUrlInput.value.trim();

        if (!newNickname) {
            profileStatusMessage.textContent = 'O nome de usuário não pode ficar em branco.';
            return;
        }

        profileStatusMessage.textContent = 'Salvando...';
        btnSaveProfile.disabled = true;

        try {
            await updateProfile(currentUser, {
                displayName: newNickname,
                photoURL: newPhotoURL
            });

            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                displayName: newNickname,
                photoURL: newPhotoURL
            });

            profileStatusMessage.textContent = 'Perfil atualizado com sucesso!';
            setTimeout(() => profileStatusMessage.textContent = '', 3000);

        } catch (error) {
            console.error("Erro ao salvar perfil:", error);
            profileStatusMessage.textContent = 'Erro ao salvar. Tente novamente.';
        } finally {
            btnSaveProfile.disabled = false;
        }
    }

    function handleDeleteAccount() {
        showConfirmationModal(
            'Apagar a sua Conta?',
            'Esta é a sua última oportunidade. Apagar a sua conta removerá permanentemente todos os seus dados.',
            () => {
                if (!currentUser) return;
                hideModal();
                
                showCustomAlert('Ação Necessária', 'Por segurança, seu navegador será aberto para você fazer login novamente e confirmar a exclusão.');
                isReauthenticatingForDelete = true;
                window.electronAPI.openExternalLink('https://minha-lista-ponte.vercel.app');
            }
        );
    }
});