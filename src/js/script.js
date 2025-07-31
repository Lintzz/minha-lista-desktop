import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading-screen');
    const appContent = document.getElementById('app-content');
    const userProfileArea = document.getElementById('user-profile-area');
    const userAvatar = document.getElementById('user-avatar');
    const userNickname = document.getElementById('user-nickname');
    const userProfileDropdown = document.getElementById('user-profile-dropdown');
    const btnSettings = document.getElementById('btn-settings');
    const btnLogout = document.getElementById('btn-logout');
    const minhaLista = document.getElementById('minhaLista');
    const pesquisaInput = document.getElementById('pesquisaInput');
    const mostrarFormBtn = document.getElementById('mostrarFormBtn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const statusDropdown = document.getElementById('status-dropdown');
    const btnDropdownEdit = document.getElementById('btn-dropdown-edit');
    const btnDropdownDelete = document.getElementById('btn-dropdown-delete');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');
    const closeBtn = document.getElementById('close-btn');
    const headerNome = document.getElementById('header-nome');
    const sortIndicator = document.getElementById('sort-indicator');
    const headerCol1 = document.getElementById('header-col-1');
    const headerCol2 = document.getElementById('header-col-2');
    const listTabsContainer = document.getElementById('list-tabs-container');
    const filterMenuBtn = document.getElementById('filter-menu-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const randomItemBtn = document.getElementById('random-item-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    let currentUser = null;
    let allData = { anime: [], serie: [], filme: [], manga: [], livro: [], hq: [] };
    let activeList = 'anime';
    let isAdding = false;
    let nextItemId = 0;
    let sortState = 'default';
    let activeFilter = 'todos';
    let visibleLists = { anime: true, serie: true, filme: true, manga: true, livro: true, hq: true };
    let debounceTimer;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userDocRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                userNickname.textContent = userData.displayName || user.email.split('@')[0];
                userAvatar.src = userData.photoURL || 'https://placehold.co/40x40/1f1f1f/ffffff?text=U';
            } else {
                userNickname.textContent = user.displayName || user.email.split('@')[0];
                userAvatar.src = user.photoURL || 'https://placehold.co/40x40/1f1f1f/ffffff?text=U';
            }
            iniciarApp();
        }
    });

    async function iniciarApp() {
        loadingScreen.style.display = 'flex';
        appContent.classList.add('hidden');
        try {
            if (window.electronAPI) {
                const settings = await window.electronAPI.loadSettings();
                visibleLists = settings.visibleLists;
            }
            allData = await carregarDadosDoFirestore();
            const allItems = [].concat(...Object.values(allData));
            if (allItems.length > 0) {
                const maxId = Math.max(...allItems.map(s => s.id || 0));
                nextItemId = isFinite(maxId) ? maxId + 1 : 0;
            }
            updateVisibleTabs();
            renderizarLista();
        } catch (error) {
            console.error("Erro fatal ao iniciar o aplicativo:", error);
            showCustomAlert("Erro Crítico", "Não foi possível carregar os dados do aplicativo. Por favor, reinicie.");
        } finally {
            loadingScreen.style.display = 'none';
            appContent.classList.remove('hidden');
            window.electronAPI?.readyToShow();
        }
    }

    async function carregarDadosDoFirestore() {
        if (!currentUser) return { anime: [], serie: [], filme: [], manga: [], livro: [], hq: [] };
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists() && docSnap.data().lists) {
                const lists = docSnap.data().lists;
                return {
                    anime: lists.anime || [], serie: lists.serie || [], filme: lists.filme || [],
                    manga: lists.manga || [], livro: lists.livro || [], hq: lists.hq || [],
                };
            }
            return { anime: [], serie: [], filme: [], manga: [], livro: [], hq: [] };
        } catch (error) {
            console.error("Erro ao carregar dados do Firestore:", error);
            showCustomAlert("Erro de Dados", "Não foi possível carregar suas listas.");
            return { anime: [], serie: [], filme: [], manga: [], livro: [], hq: [] };
        }
    }

    async function salvarDadosNoFirestore() {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
            await setDoc(userDocRef, { lists: allData }, { merge: true });
        } catch (error) {
            console.error("Erro ao salvar no Firestore:", error);
        }
    }

    function showCustomAlert(title, message) { modalTitle.textContent = title; modalMessage.innerHTML = message; modalOverlay.classList.remove('hidden'); setTimeout(() => modalOverlay.classList.add('visible'), 10); }
    function hideCustomAlert() { modalOverlay.classList.remove('visible'); setTimeout(() => modalOverlay.classList.add('hidden'), 200); }
    
    function abrirDropdown(event, menu) {
        const button = event.currentTarget;
        event.stopPropagation();
        const rect = button.getBoundingClientRect();

        if (menu === dropdownMenu) {
            const itemDiv = button.closest('.item-lista');
            menu.dataset.id = itemDiv.dataset.id;
            const rightEdgeDistance = window.innerWidth - rect.right;
            menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
            menu.style.right = `${rightEdgeDistance}px`;
            menu.style.left = 'auto';
        } else if (menu === statusDropdown) {
            const itemDiv = button.closest('.item-lista');
            menu.dataset.id = itemDiv.dataset.id;
            menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
            menu.style.left = `${rect.left + window.scrollX}px`;
        } else if (menu === userProfileDropdown) {
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.left = `${rect.left}px`;
        }
        menu.classList.remove('hidden');
    }

    function fecharDropdowns() {
        dropdownMenu.classList.add('hidden');
        statusDropdown.classList.add('hidden');
        filterDropdown.classList.add('hidden');
        userProfileDropdown.classList.add('hidden');
        document.querySelectorAll('.autocomplete-suggestions').forEach(el => el.classList.add('hidden'));
    }
    
    function updateVisibleTabs() {
        const tabs = listTabsContainer.querySelectorAll('.list-tab');
        let firstVisibleTab = null;
        let activeTabIsVisible = false;

        tabs.forEach(tab => {
            const listName = tab.dataset.list;
            if (visibleLists[listName]) {
                tab.style.display = 'inline-block';
                if (!firstVisibleTab) firstVisibleTab = listName;
                if (activeList === listName) activeTabIsVisible = true;
            } else {
                tab.style.display = 'none';
                if (activeList === listName) tab.classList.remove('active');
            }
        });

        if (!activeTabIsVisible && firstVisibleTab) {
            activeList = firstVisibleTab;
            const newActiveTab = listTabsContainer.querySelector(`.list-tab[data-list="${firstVisibleTab}"]`);
            if(newActiveTab) newActiveTab.classList.add('active');
        } else if (!firstVisibleTab) {
            minhaLista.innerHTML = '<div class="empty-state">Habilite uma lista nas configurações para começar.</div>';
            atualizarCabecalhoLista();
        }
    }

    function atualizarCabecalhoLista() {
        const anyListVisible = Object.values(visibleLists).some(v => v);
        headerCol1.style.display = 'none';
        headerCol2.style.display = 'none';
        if (!anyListVisible) return;

        switch (activeList) {
            case 'manga':
                headerCol1.textContent = 'Volume'; headerCol2.textContent = 'Capítulo';
                headerCol1.style.display = 'block'; headerCol2.style.display = 'block';
                break;
            case 'filme':
                headerCol1.textContent = 'Assistido';
                headerCol1.style.display = 'block';
                break;
            case 'livro':
                headerCol1.textContent = 'Capítulo'; headerCol2.textContent = 'Página';
                headerCol1.style.display = 'block'; headerCol2.style.display = 'block';
                break;
            case 'hq':
                headerCol1.textContent = 'Edição';
                headerCol1.style.display = 'block';
                break;
            default: // anime, serie
                headerCol1.textContent = 'Temporada'; headerCol2.textContent = 'Episódio';
                headerCol1.style.display = 'block'; headerCol2.style.display = 'block';
                break;
        }
    }

    function renderizarLista() {
        if (isAdding) finalizarAcao();
        minhaLista.innerHTML = '';
        if(!visibleLists[activeList] && Object.values(visibleLists).some(v => v)) {
            updateVisibleTabs();
        }
        atualizarCabecalhoLista();
        let listaAtual = allData[activeList] || [];
        const termoPesquisa = pesquisaInput.value.toLowerCase();
        if (termoPesquisa) {
            listaAtual = listaAtual.filter(item => item.nome.toLowerCase().includes(termoPesquisa));
        }
        const listaFiltrada = listaAtual.filter(item => activeFilter === 'todos' || item.status === activeFilter);
        const filterButtonText = filterDropdown.querySelector(`[data-filter="${activeFilter}"]`).textContent;
        filterMenuBtn.textContent = `▾ Filtro: ${filterButtonText} (${listaFiltrada.length})`;
        const fragment = document.createDocumentFragment();
        listaFiltrada.forEach((item) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-lista';
            itemDiv.dataset.id = item.id;
            let colTempHTML = '', colEpHTML = '', subTitleHTML = '';

            switch (activeList) {
                case 'manga':
                    colTempHTML = `<span class="coluna-temp">${item.volume || 0}</span>`;
                    colEpHTML = `<span class="coluna-ep">${item.capitulo || 0}</span>`;
                    break;
                case 'filme':
                    colTempHTML = `<span class="coluna-temp">${item.status === 'terminado' ? 'Sim' : 'Não'}</span>`;
                    break;
                case 'livro':
                    subTitleHTML = `<span class="coluna-subtitulo">${item.autor || ''}</span>`;
                    colTempHTML = `<span class="coluna-temp">${item.capitulo || 0}</span>`;
                    colEpHTML = `<span class="coluna-ep">${item.pagina || 0}</span>`;
                    break;
                case 'hq':
                    subTitleHTML = `<span class="coluna-subtitulo">${item.editora || ''}</span>`;
                    colTempHTML = `<span class="coluna-temp">${item.edicao || '#'}</span>`;
                    break;
                default:
                    colTempHTML = `<span class="coluna-temp">${item.temporada || 0}</span>`;
                    colEpHTML = `<span class="coluna-ep">${item.ultimoEpisodio || 0}</span>`;
                    break;
            }

            itemDiv.innerHTML = `
                <div class="col-group-left">
                    <span class="coluna-status"><div class="status-dot status-${item.status}" title="Mudar status"></div></span>
                    <div class="nome-container">
                        <span class="coluna-nome" title="${item.nome}">${item.nome}</span>
                        ${subTitleHTML}
                    </div>
                </div>
                <div class="col-group-middle">${colTempHTML}${colEpHTML}</div>
                <div class="col-group-right"><span class="coluna-acoes"><button class="btn-opcoes" title="Opções">⋮</button></span></div>`;
            fragment.appendChild(itemDiv);
        });
        minhaLista.appendChild(fragment);
        adicionarEventListenersAosItens();
    }

    function adicionarEventListenersAosItens() {
        minhaLista.querySelectorAll('.btn-opcoes').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const isVisible = !dropdownMenu.classList.contains('hidden') && dropdownMenu.dataset.id === button.closest('.item-lista').dataset.id;
                fecharDropdowns();
                if (!isVisible) abrirDropdown(event, dropdownMenu);
            });
        });
        minhaLista.querySelectorAll('.status-dot').forEach(dot => {
            dot.addEventListener('click', (event) => {
                event.stopPropagation();
                const isVisible = !statusDropdown.classList.contains('hidden') && statusDropdown.dataset.id === dot.closest('.item-lista').dataset.id;
                fecharDropdowns();
                if (!isVisible) abrirDropdown(event, statusDropdown);
            });
        });
    }

    function apagarItem(itemId) {
        const index = allData[activeList].findIndex(item => item.id == itemId);
        if (index > -1) {
            allData[activeList].splice(index, 1);
            salvarDadosNoFirestore();
            renderizarLista();
        }
    }

    function ordenarLista(changeState = true) {
        if (changeState) {
            if (sortState === 'default') sortState = 'asc';
            else if (sortState === 'asc') sortState = 'desc';
            else sortState = 'default';
        }
        if (sortState === 'default') {
            sortIndicator.textContent = '';
            // Se quiser que a ordem volte à original (por adição), você precisaria recarregar os dados.
            // Por simplicidade, vamos apenas remover a ordenação alfabética.
        } else {
            sortIndicator.textContent = sortState === 'asc' ? '▲' : '▼';
            allData[activeList].sort((a, b) => {
                const nomeA = a.nome.toLowerCase();
                const nomeB = b.nome.toLowerCase();
                if (nomeA < nomeB) return sortState === 'asc' ? -1 : 1;
                if (nomeA > nomeB) return sortState === 'asc' ? 1 : -1;
                return 0;
            });
        }
        renderizarLista();
    }

    function renderSuggestions(suggestions, inputElement) {
        const container = inputElement.closest('.autocomplete-container');
        if (!container) return;
        const suggestionsDiv = container.querySelector('.autocomplete-suggestions');
        if (!suggestionsDiv) return;
        suggestionsDiv.innerHTML = '';
        if (!suggestions || suggestions.length === 0) {
            suggestionsDiv.classList.add('hidden');
            return;
        }

        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            
            let displayText = '';
            let clickValue = '';

            // Verifica se a sugestão é um objeto (livro) ou um texto (outros)
            if (typeof suggestion === 'object' && suggestion !== null && suggestion.title) {
                // É um livro! Formata para mostrar Título e Autor.
                displayText = `<strong>${suggestion.title}</strong><br><small>${suggestion.author}</small>`;
                clickValue = suggestion.title;
            } else {
                // É um texto simples
                displayText = suggestion;
                clickValue = suggestion;
            }

            item.innerHTML = displayText; // Usamos innerHTML para renderizar o HTML
            item.title = clickValue; // Dica de ferramenta mostra apenas o título

            item.addEventListener('click', () => {
                inputElement.value = clickValue;
                suggestionsDiv.classList.add('hidden');

                // BÔNUS: Se for um livro, preenche o campo de autor!
                if (typeof suggestion === 'object' && suggestion.author) {
                    const form = inputElement.closest('.form-inline, .is-editing');
                    if (form) {
                        const authorInput = form.querySelector('input[name="autor"]');
                        if (authorInput) {
                            authorInput.value = suggestion.author;
                        }
                    }
                }
            });
            suggestionsDiv.appendChild(item);
        });
        suggestionsDiv.classList.remove('hidden');
    }
    
    function setupAutocomplete(inputElement) {
        inputElement.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const term = inputElement.value;
            if (term.length < 3) {
                renderSuggestions([], inputElement);
                return;
            }
            debounceTimer = setTimeout(async () => {
                if(!window.electronAPI) return;
                let response;
                
                if (activeList === 'livro') {
                    response = await window.electronAPI.searchGoogleBooks(term);
                } else if (activeList === 'hq') {
                    response = await window.electronAPI.searchComicVine(term);
                } else if (activeList === 'anime' || activeList === 'manga') {
                    response = await window.electronAPI.searchJikan(term, activeList);
                } else if (activeList === 'serie' || activeList === 'filme') {
                    const searchType = (activeList === 'serie') ? 'tv' : 'movie';
                    response = await window.electronAPI.searchTmdb(term, searchType);
                }
                
                if (response && response.success) {
                    // Precisamos ajustar renderSuggestions para lidar com objetos (título + autor)
                    renderSuggestions(response.data, inputElement);
                } else if (response) {
                    console.error(`Falha no autocomplete para ${activeList}:`, response.error);
                }
            }, 500);
        });
    }

    function adicionarFormularioAoInicio() {
        if (isAdding || document.querySelector('.is-editing')) return;
        isAdding = true;
        mostrarFormBtn.style.display = 'none';
        const formDiv = document.createElement('div');
        formDiv.className = 'item-lista form-inline';
        let groupLeftHTML = '', groupMiddleHTML = '';
        
        const nomeInputHTML = `<div class="autocomplete-container"><input type="text" name="nome" placeholder="Nome do Título"><div class="autocomplete-suggestions hidden"></div></div>`;
        
        switch (activeList) {
            case 'livro':
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML.replace('placeholder="Nome do Título"', 'placeholder="Nome do Livro"')}<input type="text" name="autor" placeholder="Autor"></span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="number" name="capitulo" min="0" placeholder="Cap"></span><span class="coluna-ep"><input type="number" name="pagina" min="0" placeholder="Pág"></span>`;
                break;
            case 'hq':
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML.replace('placeholder="Nome do Título"', 'placeholder="Nome da HQ"')}<input type="text" name="editora" placeholder="Editora"></span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="text" name="edicao" placeholder="Edição #"></span>`;
                break;
            case 'manga':
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}</span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="number" name="volume" min="0" placeholder="Vol"></span><span class="coluna-ep"><input type="number" name="capitulo" min="0" placeholder="Cap"></span>`;
                break;
            case 'filme':
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}</span>`;
                groupMiddleHTML = `<span class="coluna-temp"><div class="sim-nao-container"><button class="sim-nao-btn" data-value="naoComecei">Não</button><button class="sim-nao-btn selected" data-value="terminado">Sim</button></div></span>`;
                break;
            default:
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}</span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="number" name="temporada" min="0" placeholder="Temp"></span><span class="coluna-ep"><input type="number" name="ultimoEpisodio" min="0" placeholder="Ep"></span>`;
                break;
        }
        
        formDiv.innerHTML = `
            <div class="edit-inputs-wrapper">
                <div class="col-group-left">${groupLeftHTML}</div>
                <div class="col-group-middle">${groupMiddleHTML}</div>
                <div class="col-group-right"><span class="coluna-acoes">&nbsp;</span></div>
            </div>
            <div class="edit-actions-row">
                <button class="btn-cancel-edit">Cancelar</button>
                <button class="btn-save-edit">Salvar</button>
            </div>`;
        
        minhaLista.prepend(formDiv);
        const nomeInput = formDiv.querySelector('input[name="nome"]');
        nomeInput.focus();
        setupAutocomplete(nomeInput);
        formDiv.querySelector('.btn-save-edit').addEventListener('click', () => salvarItem(formDiv));
        formDiv.querySelector('.btn-cancel-edit').addEventListener('click', renderizarLista);
    }
    
    function salvarItem(formDiv) {
        const nome = formDiv.querySelector('input[name="nome"]').value.trim();
        if (nome) {
            let novoItem = { id: nextItemId++, nome: nome, status: 'naoComecei' };
            switch (activeList) {
                case 'livro':
                    novoItem.autor = formDiv.querySelector('input[name="autor"]').value.trim();
                    novoItem.capitulo = parseInt(formDiv.querySelector('input[name="capitulo"]').value) || 0;
                    novoItem.pagina = parseInt(formDiv.querySelector('input[name="pagina"]').value) || 0;
                    break;
                case 'hq':
                    novoItem.editora = formDiv.querySelector('input[name="editora"]').value.trim();
                    novoItem.edicao = formDiv.querySelector('input[name="edicao"]').value.trim() || '#';
                    break;
                case 'manga':
                    novoItem.volume = parseInt(formDiv.querySelector('input[name="volume"]').value) || 0;
                    novoItem.capitulo = parseInt(formDiv.querySelector('input[name="capitulo"]').value) || 0;
                    break;
                case 'filme':
                    novoItem.status = formDiv.querySelector('.sim-nao-btn.selected').dataset.value || 'naoComecei';
                    break;
                default:
                    novoItem.temporada = parseInt(formDiv.querySelector('input[name="temporada"]').value) || 0;
                    novoItem.ultimoEpisodio = parseInt(formDiv.querySelector('input[name="ultimoEpisodio"]').value) || 0;
                    break;
            }
            allData[activeList].unshift(novoItem);
            salvarDadosNoFirestore();
            renderizarLista();
        } else {
            showCustomAlert('Atenção', 'O campo de nome é obrigatório.');
        }
    }
    
    function iniciarEdicao(itemId) {
        if (isAdding || document.querySelector('.is-editing')) renderizarLista();
        const itemIndex = allData[activeList].findIndex(i => i.id == itemId);
        if (itemIndex === -1) return;
        const item = allData[activeList][itemIndex];
        const itemDiv = minhaLista.querySelector(`.item-lista[data-id='${item.id}']`);
        itemDiv.classList.add('is-editing');
        let groupLeftHTML = '', groupMiddleHTML = '';
        const nomeInputHTML = `<div class="autocomplete-container"><input type="text" name="nome" value="${item.nome}"><div class="autocomplete-suggestions hidden"></div></div>`;

        switch (activeList) {
            case 'livro':
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}<input type="text" name="autor" value="${item.autor || ''}"></span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="number" name="capitulo" min="0" value="${item.capitulo || 0}"></span><span class="coluna-ep"><input type="number" name="pagina" min="0" value="${item.pagina || 0}"></span>`;
                break;
            case 'hq':
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}<input type="text" name="editora" value="${item.editora || ''}"></span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="text" name="edicao" value="${item.edicao || '#'}"></span>`;
                break;
            case 'manga':
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}</span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="number" name="volume" min="0" value="${item.volume || 0}"></span><span class="coluna-ep"><input type="number" name="capitulo" min="0" value="${item.capitulo || 0}"></span>`;
                break;
            case 'filme':
                const isTerminado = item.status === 'terminado';
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}</span>`;
                groupMiddleHTML = `<span class="coluna-temp"><div class="sim-nao-container"><button class="sim-nao-btn ${!isTerminado ? 'selected' : ''}" data-value="naoComecei">Não</button><button class="sim-nao-btn ${isTerminado ? 'selected' : ''}" data-value="terminado">Sim</button></div></span>`;
                break;
            default:
                groupLeftHTML = `<span class="coluna-status">&nbsp;</span><span class="coluna-nome">${nomeInputHTML}</span>`;
                groupMiddleHTML = `<span class="coluna-temp"><input type="number" name="temporada" min="0" value="${item.temporada || 0}"></span><span class="coluna-ep"><input type="number" name="ultimoEpisodio" min="0" value="${item.ultimoEpisodio || 0}"></span>`;
                break;
        }

        itemDiv.innerHTML = `
            <div class="edit-inputs-wrapper">
                <div class="col-group-left">${groupLeftHTML}</div>
                <div class="col-group-middle">${groupMiddleHTML}</div>
                <div class="col-group-right"><span class="coluna-acoes">&nbsp;</span></div>
            </div>
            <div class="edit-actions-row">
                <button class="btn-cancel-edit">Cancelar</button>
                <button class="btn-save-edit">Salvar</button>
            </div>`;
        
        const nomeInput = itemDiv.querySelector('input[name="nome"]');
        setupAutocomplete(nomeInput);

        itemDiv.querySelector('.btn-save-edit').addEventListener('click', () => salvarEdicao(itemIndex, itemDiv));
        itemDiv.querySelector('.btn-cancel-edit').addEventListener('click', () => renderizarLista());
    }
    
    function salvarEdicao(index, itemDiv) {
        const item = allData[activeList][index];
        const nome = itemDiv.querySelector('input[name="nome"]').value.trim();
        if (nome) {
            item.nome = nome;
            switch (activeList) {
                case 'livro':
                    item.autor = itemDiv.querySelector('input[name="autor"]').value.trim();
                    item.capitulo = parseInt(itemDiv.querySelector('input[name="capitulo"]').value) || 0;
                    item.pagina = parseInt(itemDiv.querySelector('input[name="pagina"]').value) || 0;
                    break;
                case 'hq':
                    item.editora = itemDiv.querySelector('input[name="editora"]').value.trim();
                    item.edicao = itemDiv.querySelector('input[name="edicao"]').value.trim() || '#';
                    break;
                case 'manga':
                    item.volume = parseInt(itemDiv.querySelector('input[name="volume"]').value) || 0;
                    item.capitulo = parseInt(itemDiv.querySelector('input[name="capitulo"]').value) || 0;
                    break;
                case 'filme':
                    item.status = itemDiv.querySelector('.sim-nao-btn.selected').dataset.value || 'naoComecei';
                    break;
                default:
                    item.temporada = parseInt(itemDiv.querySelector('input[name="temporada"]').value) || 0;
                    item.ultimoEpisodio = parseInt(itemDiv.querySelector('input[name="ultimoEpisodio"]').value) || 0;
                    break;
            }
            salvarDadosNoFirestore();
            renderizarLista();
        } else {
            showCustomAlert('Atenção', 'O campo de nome não pode ficar em branco.');
        }
    }

    function finalizarAcao() {
        isAdding = false;
        mostrarFormBtn.style.display = 'block';
    }

    function sortearItem() {
        const listaNaoComecei = (allData[activeList] || []).filter(item => item.status === 'naoComecei');
        if (listaNaoComecei.length === 0) {
            showCustomAlert('Sorteio', `Não há itens na categoria "Não Comecei" para sortear na lista de ${activeList}s.`);
            return;
        }
        const randomIndex = Math.floor(Math.random() * listaNaoComecei.length);
        const itemSorteado = listaNaoComecei[randomIndex];
        showCustomAlert('Sugestão para Você!', `O item sorteado foi:<br><br><strong>${itemSorteado.nome}</strong>`);
    }

    // --- EVENT LISTENERS ---
    mostrarFormBtn.addEventListener('click', adicionarFormularioAoInicio);
    pesquisaInput.addEventListener('input', renderizarLista);
    headerNome.addEventListener('click', () => ordenarLista(true));
    minimizeBtn.addEventListener('click', () => window.electronAPI?.minimizeWindow());
    maximizeBtn.addEventListener('click', () => window.electronAPI?.maximizeWindow());
    closeBtn.addEventListener('click', () => window.electronAPI?.closeWindow());
    btnDropdownDelete.addEventListener('click', () => { const itemId = dropdownMenu.dataset.id; apagarItem(itemId); fecharDropdowns(); });
    btnDropdownEdit.addEventListener('click', () => { const itemId = dropdownMenu.dataset.id; iniciarEdicao(itemId); fecharDropdowns(); });
    statusDropdown.addEventListener('click', (event) => { if (event.target.tagName === 'BUTTON') { const itemId = statusDropdown.dataset.id; const itemIndex = allData[activeList].findIndex(i => i.id == itemId); if (itemIndex > -1) { allData[activeList][itemIndex].status = event.target.dataset.status; salvarDadosNoFirestore(); renderizarLista(); } fecharDropdowns(); } });
    userProfileArea.addEventListener('click', (event) => { event.stopPropagation(); const isVisible = !userProfileDropdown.classList.contains('hidden'); fecharDropdowns(); if (!isVisible) abrirDropdown(event, userProfileDropdown); });
    filterMenuBtn.addEventListener('click', (event) => { event.stopPropagation(); const isVisible = !filterDropdown.classList.contains('hidden'); fecharDropdowns(); if (!isVisible) { const rect = filterMenuBtn.getBoundingClientRect(); filterDropdown.style.top = `${rect.bottom + 5}px`; filterDropdown.style.left = `${rect.left}px`; filterDropdown.classList.remove('hidden'); } });
    filterDropdown.addEventListener('click', (event) => { if (event.target.classList.contains('filter-option')) { activeFilter = event.target.dataset.filter; renderizarLista(); fecharDropdowns(); } });
    btnSettings.addEventListener('click', () => window.electronAPI?.navigateToSettings());
    btnLogout.addEventListener('click', () => window.electronAPI?.logout());
    listTabsContainer.addEventListener('click', (event) => { if (event.target.classList.contains('list-tab')) { listTabsContainer.querySelectorAll('.list-tab').forEach(tab => tab.classList.remove('active')); event.target.classList.add('active'); activeList = event.target.dataset.list; renderizarLista(); } });
    randomItemBtn.addEventListener('click', sortearItem);
    [dropdownMenu, statusDropdown, filterDropdown, userProfileDropdown].forEach(menu => menu.addEventListener('click', (event) => event.stopPropagation()));
    window.addEventListener('click', fecharDropdowns);
    window.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); pesquisaInput.focus(); } if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') { event.preventDefault(); adicionarFormularioAoInicio(); } if (event.key === 'Escape') { fecharDropdowns(); hideCustomAlert(); renderizarLista(); } });
    modalCloseBtn.addEventListener('click', hideCustomAlert);
    modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) hideCustomAlert(); });
});