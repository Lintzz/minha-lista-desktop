// /app/appearance.js

/**
 * Aplica as configurações de tema e cor de destaque a uma página.
 * @param {object} settings - O objeto de configurações carregado.
 */
export function applyAppearance(settings) {
    const theme = settings.theme || 'theme-dark';
    const accentColor = settings.accentColor || 'blue';

    // Altera o tema mudando o atributo no body
    document.body.dataset.theme = theme;
    
    // Altera a cor de destaque mudando a variável CSS no :root
    const root = document.documentElement;
    root.style.setProperty('--accent-color', `var(--accent-color-${accentColor})`);
}