const { contextBridge, ipcRenderer } = require('electron');

// --- APLICAÇÃO IMEDIATA DO TEMA PARA EVITAR "PISCA-PISCA" ---
// Garante que o código só rode depois que o HTML básico for carregado
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const settings = await ipcRenderer.invoke('carregar-settings');
        const theme = settings.theme || 'theme-dark';
        const accentColor = settings.accentColor || 'blue';

        // Aplica as configurações diretamente no HTML
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.setProperty('--accent-color', `var(--accent-color-${accentColor})`);
    } catch (error) {
        console.error("Falha ao aplicar o tema no pré-carregamento:", error);
        // Aplica um tema padrão em caso de erro
        document.documentElement.dataset.theme = 'theme-dark';
        document.documentElement.style.setProperty('--accent-color', 'var(--accent-color-blue)');
    }
});

// --- EXPOSIÇÃO DAS FUNÇÕES DA API PARA AS PÁGINAS ---
// O contextBridge não precisa esperar e pode ficar fora do listener
contextBridge.exposeInMainWorld('electronAPI', {
  // ... todas as suas funções da API continuam aqui, sem alteração ...
    searchJikan: (term, type) => ipcRenderer.invoke('search-jikan', term, type),
    searchTmdb: (term, type) => ipcRenderer.invoke('search-tmdb', term, type),
    saveSettings: (settings) => ipcRenderer.send('salvar-settings', settings),
    loadSettings: () => ipcRenderer.invoke('carregar-settings'),
    importarJson: () => ipcRenderer.invoke('importar-json'),
    exportarJson: (dados) => ipcRenderer.invoke('exportar-json', dados),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),
    navigateToApp: () => ipcRenderer.send('navigate-to-app'),
    logout: () => ipcRenderer.send('logout'),
    navigateToSettings: () => ipcRenderer.send('navigate-to-settings'),
    navigateToMain: () => ipcRenderer.send('navigate-to-main'),
    navigateToConfirmRegister: () => ipcRenderer.send('navigate-to-confirm-register'),
    readyToShow: () => ipcRenderer.send('ready-to-show'),
    handleDeepLink: (callback) => ipcRenderer.on('deep-link-received', (event, url) => callback(url)),
    openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
    
    searchGoogleBooks: (term) => ipcRenderer.invoke('search-google-books', term),
    searchComicVine: (term) => ipcRenderer.invoke('search-comic-vine', term),
});