/* ==========================================================================
   TIN WHISTLE LIVE — MOTOR DE INTERNACIONALIZAÇÃO (i18n)
   Vanilla ES6 Zero-Build • Reativo • Sem dependências externas
   ========================================================================== */

import pt from './pt.js';
import en from './en.js';
import es from './es.js';

export const LANGUAGES = {
    pt: { code: 'pt', name: 'Português', short: 'PT', flag: '🇧🇷' },
    en: { code: 'en', name: 'English', short: 'EN', flag: '🇬🇧' },
    es: { code: 'es', name: 'Español', short: 'ES', flag: '🇪🇸' }
};

const DICTIONARIES = { pt, en, es };
const STORAGE_KEY = 'celtic_whistle_lang';
const DEFAULT_LANG = 'en'; // Padrão universal para o mundo (exceto se detectado pt/es)

let currentLang = DEFAULT_LANG;

/**
 * Resolve o idioma inicial através da cascata:
 * 1. Parâmetro explícito na URL: ?lang=en|pt|es
 * 2. Preferência salva no localStorage
 * 3. Idioma do sistema/navegador via navigator.languages
 * 4. Fallback padrão: 'en'
 */
export function detectInitialLanguage() {
    // 1. URL Query Param
    try {
        if (typeof window !== 'undefined' && window.location) {
            const params = new URLSearchParams(window.location.search);
            const queryLang = (params.get('lang') || '').toLowerCase().trim();
            if (DICTIONARIES[queryLang]) {
                return queryLang;
            }
        }
    } catch (_) {}

    // 2. LocalStorage
    try {
        if (typeof localStorage !== 'undefined') {
            const saved = (localStorage.getItem(STORAGE_KEY) || '').toLowerCase().trim();
            if (DICTIONARIES[saved]) {
                return saved;
            }
        }
    } catch (_) {}

    // 3. Detecção do Navegador
    try {
        if (typeof navigator !== 'undefined') {
            const browserLangs = navigator.languages || [navigator.language || navigator.userLanguage];
            for (const bl of browserLangs) {
                if (!bl) continue;
                const clean = bl.toLowerCase();
                if (clean.startsWith('pt')) return 'pt';
                if (clean.startsWith('es')) return 'es';
                if (clean.startsWith('en')) return 'en';
            }
        }
    } catch (_) {}

    // 4. Fallback universal
    return DEFAULT_LANG;
}

/**
 * Retorna o idioma atualmente ativo
 */
export function getCurrentLanguage() {
    return currentLang;
}

/**
 * Retorna o mapa de idiomas disponíveis
 */
export function getAvailableLanguages() {
    return Object.values(LANGUAGES);
}

/**
 * Recupera valor aninhado em um objeto por caminho com pontos ('sidebar.title')
 */
function getNestedValue(obj, keyPath) {
    if (!obj || typeof obj !== 'object') return null;
    const parts = keyPath.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur && typeof cur === 'object' && p in cur) {
            cur = cur[p];
        } else {
            return null;
        }
    }
    return typeof cur === 'string' ? cur : null;
}

/**
 * Função principal de tradução com interpolação de variáveis
 * Ex: t('sidebar.resultsCount', { shown: 5, total: 10 })
 */
export function t(key, vars = {}) {
    if (!key) return '';

    // Busca no dicionário atual
    let str = getNestedValue(DICTIONARIES[currentLang], key);

    // Fallback para inglês se não encontrar
    if (str === null && currentLang !== 'en') {
        str = getNestedValue(DICTIONARIES['en'], key);
    }

    // Fallback para português se ainda assim não encontrar
    if (str === null && currentLang !== 'pt') {
        str = getNestedValue(DICTIONARIES['pt'], key);
    }

    // Se a chave não existir em nenhum dicionário, retorna a própria chave
    if (str === null) {
        return key;
    }

    // Interpolação de variáveis {varName}
    if (vars && typeof vars === 'object') {
        Object.keys(vars).forEach(vKey => {
            const val = vars[vKey];
            str = str.replace(new RegExp(`\\{${vKey}\\}`, 'g'), val !== undefined ? val : '');
        });
    }

    return str;
}

/**
 * Traduz declarativamente os elementos do DOM que possuem atributos data-i18n*
 */
export function applyTranslationsToDOM(root = null) {
    if (typeof document === 'undefined') return;
    const targetRoot = root || document;

    // 1. Textos internos (textContent)
    const textEls = targetRoot.querySelectorAll('[data-i18n]');
    textEls.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            el.textContent = t(key);
        }
    });

    // 2. Tooltips e Títulos (title)
    const titleEls = targetRoot.querySelectorAll('[data-i18n-title]');
    titleEls.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            el.title = t(key);
        }
    });

    // 3. Placeholders de input
    const placeholderEls = targetRoot.querySelectorAll('[data-i18n-placeholder]');
    placeholderEls.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            el.placeholder = t(key);
        }
    });

    // 4. Acessibilidade (aria-label)
    const ariaEls = targetRoot.querySelectorAll('[data-i18n-aria]');
    ariaEls.forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        if (key) {
            el.setAttribute('aria-label', t(key));
        }
    });

    // 5. Atualiza o atributo lang do HTML
    if (document.documentElement) {
        document.documentElement.lang = currentLang;
    }
}

/**
 * Altera o idioma ativo da aplicação em tempo real
 */
export function setLanguage(lang) {
    if (!DICTIONARIES[lang]) {
        console.warn(`[i18n] Idioma não suportado: "${lang}", mantendo "${currentLang}".`);
        return false;
    }

    if (currentLang === lang) return true;

    currentLang = lang;

    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, lang);
        }
    } catch (_) {}

    applyTranslationsToDOM();

    // Notifica toda a aplicação (componentes dinâmicos, sidebar, player)
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('languagechange', {
            detail: { lang, dictionary: DICTIONARIES[lang] }
        }));
    }

    return true;
}

/**
 * Inicializa o subsistema de i18n
 */
export function initI18n() {
    currentLang = detectInitialLanguage();
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => applyTranslationsToDOM());
        } else {
            applyTranslationsToDOM();
        }
    }
    return currentLang;
}
