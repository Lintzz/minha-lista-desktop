const { app, BrowserWindow, ipcMain, dialog, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const log = require('electron-log'); // Adicionado para logs detalhados

// --- Configuração do Logger ---
// Isso força o autoUpdater a registrar tudo em um arquivo
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');


const TMDB_API_KEY = 'c7c876994e8a4d2e7369ab17d2046565';
const GOOGLE_BOOKS_API_KEY = 'AIzaSyD42r6OXZhjh--lcM2vq-kQK2uRQYRGLgM';
const COMIC_VINE_API_KEY = '921dd45c55b4d9c6bd1de9c8449f4ec607d260ac';

let mainWindow;

// Registra o protocolo customizado para o deep link
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('minha-lista', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('minha-lista');
}

// Função para transmitir o deep link para todas as janelas abertas
function broadcastDeepLink(url) {
    if (!url || !url.startsWith('minha-lista://')) return;
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('deep-link-received', url);
    });
}

// Garante que apenas uma instância do app rode por vez
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    const deepLinkUrl = commandLine.find(arg => arg.startsWith('minha-lista://'));
    broadcastDeepLink(deepLinkUrl);
    // Traz a janela existente para o foco
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 680, height: 700, minWidth: 680, minHeight: 500,
    frame: false, show: false, backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    }
  });

   // CORREÇÃO: Handler de janela inteligente
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Se for um link externo, abre no navegador padrão
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' }; // Impede o Electron de criar uma nova janela
    }
    // Para outros casos, também impede
    return { action: 'deny' };
  });

  
  mainWindow.loadFile(path.join(__dirname, 'src/html/login.html'));

  // Lida com o deep link na inicialização do app
  const deepLinkOnStartup = process.argv.find(arg => arg.startsWith('minha-lista://'));
  if (deepLinkOnStartup) {
      mainWindow.webContents.once('dom-ready', () => {
          broadcastDeepLink(deepLinkOnStartup);
      });
  }
}

// --- Ciclo de Vida do App ---

app.whenReady().then(() => {
  createWindow();
  // Inicia a verificação de updates assim que o app estiver pronto
  autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- Listeners do AutoUpdater ---
// Eles nos dirão exatamente o que está acontecendo
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
  log.info('Update available.', info);
});
autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available.', info);
});
autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
  log.info(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded', info);
});


// --- IPC Listeners (Comunicação entre processos) ---

ipcMain.on('ready-to-show', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show(); });
ipcMain.on('open-external-link', (event, url) => { shell.openExternal(url); });
ipcMain.on('navigate-to-app', (event) => { const win = BrowserWindow.fromWebContents(event.sender); if (win) { win.loadFile(path.join(__dirname, 'src/html/index.html')); } });
ipcMain.on('navigate-to-settings', (event) => { const win = BrowserWindow.fromWebContents(event.sender); if (win) { win.loadFile(path.join(__dirname, 'src/html/settings.html')); } });
ipcMain.on('navigate-to-main', (event) => { const win = BrowserWindow.fromWebContents(event.sender); if (win) { win.loadFile(path.join(__dirname, 'src/html/login.html')); } });
ipcMain.on('navigate-to-confirm-register', (event) => { const win = BrowserWindow.fromWebContents(event.sender); if (win) { win.loadFile(path.join(__dirname, 'src/html/confirm-register.html')); } });
ipcMain.on('logout', (event) => { const win = BrowserWindow.fromWebContents(event.sender); if (win) { session.defaultSession.clearStorageData().then(() => { win.loadFile(path.join(__dirname, 'src/html/login.html')); }); }});
ipcMain.on('minimize-window', (event) => { BrowserWindow.fromWebContents(event.sender)?.minimize(); });
ipcMain.on('maximize-window', (event) => { const win = BrowserWindow.fromWebContents(event.sender); if (win) { if (win.isMaximized()) { win.unmaximize(); } else { win.maximize(); } } });
ipcMain.on('close-window', () => {
    app.quit();
});

ipcMain.handle('carregar-settings', async () => {
    try {
        const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
        const defaultConfig = { 
            theme: 'theme-dark', 
            accentColor: 'blue', 
            visibleLists: { anime: true, serie: true, filme: true, manga: true, livro: true, hq: true }
        };
        if (fs.existsSync(settingsFilePath)) {
            const fileData = fs.readFileSync(settingsFilePath, 'utf8');
            const settings = JSON.parse(fileData);
            const mergedVisibleLists = { ...defaultConfig.visibleLists, ...settings.visibleLists };
            return { ...defaultConfig, ...settings, visibleLists: mergedVisibleLists };
        }
        return defaultConfig; 
    } catch (error) {
        console.error('Falha ao carregar configurações:', error);
        return { 
            theme: 'theme-dark', accentColor: 'blue',
            visibleLists: { anime: true, serie: true, filme: true, manga: true, livro: true, hq: true }
        };
    }
});

ipcMain.on('salvar-settings', (event, settings) => {
    try {
        const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
    } catch (error) { console.error('Falha ao salvar configurações:', error); }
});

ipcMain.handle('importar-json', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [ { name: 'JSON Files', extensions: ['json'] } ] });
    if (canceled || filePaths.length === 0) return null;
    try {
        const fileData = fs.readFileSync(filePaths[0], 'utf8');
        const parsedData = JSON.parse(fileData);
        const requiredLists = ['anime', 'serie', 'filme', 'manga', 'livro', 'hq'];
        const hasAllLists = requiredLists.every(list => parsedData.hasOwnProperty(list));
        if (hasAllLists) {
            return parsedData;
        }
        console.error('Arquivo de backup inválido. Nem todas as listas necessárias foram encontradas.');
        return null; 
    } catch (error) {
        console.error('Falha ao importar o arquivo JSON:', error);
        return null;
    }
});

ipcMain.handle('exportar-json', async (event, dados) => {
    try {
        const { canceled, filePath } = await dialog.showSaveDialog({ title: 'Salvar Backup Completo', defaultPath: `backup_minha_lista_${new Date().toISOString().slice(0, 10)}.json`, filters: [ { name: 'JSON Files', extensions: ['json'] } ]});
        if (canceled || !filePath) return { success: false, message: 'Exportação cancelada.' };
        const jsonString = JSON.stringify(dados, null, 2);
        fs.writeFileSync(filePath, jsonString, 'utf-8');
        return { success: true, message: 'Backup exportado com sucesso!' };
    } catch (error) {
        console.error("Falha ao exportar JSON:", error);
        return { success: false, message: 'Falha ao exportar arquivo.' };
    }
});

ipcMain.handle('search-tmdb', async (event, searchTerm, searchType) => {
    if (!TMDB_API_KEY) return { success: false, error: 'Chave de API do TMDB não configurada.' };
    if (!searchTerm || searchTerm.length < 3) return { success: true, data: [] };
    const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTerm)}&language=pt-BR&page=1`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) return { success: false, error: data.status_message || `API retornou erro: ${response.statusText}` };
        const titles = data.results?.map(item => item.title || item.name) || [];
        return { success: true, data: titles.slice(0, 5) };
    } catch (error) { return { success: false, error: 'Falha de rede ou API offline.' }; }
});

ipcMain.handle('search-jikan', async (event, searchTerm, searchType) => {
    if (!searchTerm || searchTerm.length < 3) return { success: true, data: [] };
    const url = `https://api.jikan.moe/v4/${searchType}?q=${encodeURIComponent(searchTerm)}&limit=5`;
    try {
        const response = await fetch(url);
        if (!response.ok) return { success: false, error: `API retornou erro: ${response.statusText}` };
        const data = await response.json();
        const titles = data.data?.map(item => item.title) || [];
        return { success: true, data: titles };
    } catch (error) { return { success: false, error: 'Falha de rede ou API offline.' }; }
});

ipcMain.handle('search-google-books', async (event, searchTerm) => {
    if (!GOOGLE_BOOKS_API_KEY) return { success: false, error: 'Chave de API do Google Books não configurada.' };
    if (!searchTerm || searchTerm.length < 3) return { success: true, data: [] };
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=5`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) return { success: false, error: 'Erro na API do Google Books.' };
        const results = data.items?.map(item => {
            const title = item.volumeInfo.title;
            const author = item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Autor desconhecido';
            return { title, author };
        }) || [];
        return { success: true, data: results };
    } catch (error) { return { success: false, error: 'Falha de rede ou API offline.' }; }
});

ipcMain.handle('search-comic-vine', async (event, searchTerm) => {
    if (!COMIC_VINE_API_KEY) return { success: false, error: 'Chave de API da Comic Vine não configurada.' };
    if (!searchTerm || searchTerm.length < 3) return { success: true, data: [] };
    const url = `https://comicvine.gamespot.com/api/search/?api_key=${COMIC_VINE_API_KEY}&format=json&query=${encodeURIComponent(searchTerm)}&resources=volume&limit=5`;
    try {
        const response = await fetch(url, { headers: { 'User-Agent': 'MinhaListaDesktopApp/1.0' } });
        const data = await response.json();
        if (data.error !== 'OK') return { success: false, error: data.error };
        const titles = data.results?.map(item => item.name) || [];
        return { success: true, data: titles };
    } catch (error) { return { success: false, error: 'Falha de rede ou API offline.' }; }
});