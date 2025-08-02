const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const settings = await ipcRenderer.invoke('carregar-settings');
        const theme = settings.theme || 'theme-dark';
        const accentColor = settings.accentColor || 'blue';
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.setProperty('--accent-color', `var(--accent-color-${accentColor})`);
    } catch (error) {
        console.error("Falha ao aplicar o tema no pré-carregamento:", error);
    }
});

contextBridge.exposeInMainWorld('electronAPI', {
    // Funções de Navegação e Autenticação
    navigateToApp: () => ipcRenderer.send('navigate-to-app'),
    logout: () => ipcRenderer.send('logout'),
    navigateToSettings: () => ipcRenderer.send('navigate-to-settings'),
    navigateToMain: () => ipcRenderer.send('navigate-to-main'),
    navigateToConfirmRegister: () => ipcRenderer.send('navigate-to-confirm-register'),
    
    // Funções para o fluxo de login
    openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
    handleDeepLink: (callback) => ipcRenderer.on('deep-link-received', (event, url) => callback(url)),

    // Sinal para mostrar a janela
    readyToShow: () => ipcRenderer.send('ready-to-show'),

    // Funções de Janela
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),

    // Funções de Dados e APIs
    loadSettings: () => ipcRenderer.invoke('carregar-settings'),
    saveSettings: (settings) => ipcRenderer.send('salvar-settings', settings),
    importarJson: () => ipcRenderer.invoke('importar-json'),
    exportarJson: (dados) => ipcRenderer.invoke('exportar-json', dados),
    searchJikan: (term, type) => ipcRenderer.invoke('search-jikan', term, type),
    searchTmdb: (term, type) => ipcRenderer.invoke('search-tmdb', term, type),
    searchGoogleBooks: (term) => ipcRenderer.invoke('search-google-books', term),
    searchComicVine: (term) => ipcRenderer.invoke('search-comic-vine', term),

    onUpdateReady: (callback) => ipcRenderer.on('update-ready', () => callback()),
    quitAndInstallUpdate: () => ipcRenderer.send('quit-and-install-update'),
});