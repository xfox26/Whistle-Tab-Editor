/* ==========================================================================
   GERENCIAMENTO CENTRALIZADO DE ESTADO, HISTÓRICO (UNDO/REDO) & LOCALSTORAGE
   ========================================================================== */

import { DEFAULT_SONGS } from '../config/whistleData.js';

export const STORAGE_KEYS = {
    USER_SONGS: 'celtic_whistle_tabs_user',
    LEGACY_SONGS: 'celtic_whistle_tabs',
    SIDEBAR_COLLAPSED: 'sidebar_collapsed',
    NOISE_THRESHOLD: 'whistle_noise_threshold',
    NOISE_CALIBRATED: 'whistle_noise_calibrated',
    THEME: 'celtic_whistle_theme',
    DISPLAY_PREFS: 'celtic_whistle_display_prefs'
};

export const MAX_UNDO_HISTORY = 50;

export const DEFAULT_DISPLAY_PREFS = {
    pitch: true,
    chords: true,
    lyrics: true,
    durations: true,
    ornaments: true,
    fingeringOnly: false,
    spacing: 'normal' // 'compact' | 'normal' | 'wide'
};

export function loadCatalogAndUserSongs(curatedRepertoire) {
    const curated = (Array.isArray(curatedRepertoire) && curatedRepertoire.length > 0)
        ? JSON.parse(JSON.stringify(curatedRepertoire))
        : JSON.parse(JSON.stringify(DEFAULT_SONGS));

    let userSongs = [];
    const savedUserSongs = localStorage.getItem(STORAGE_KEYS.USER_SONGS);
    const legacySaved = localStorage.getItem(STORAGE_KEYS.LEGACY_SONGS);

    if (savedUserSongs) {
        try {
            userSongs = JSON.parse(savedUserSongs);
        } catch (e) {
            console.error('Erro ao ler celtic_whistle_tabs_user:', e);
            userSongs = [];
        }
        if (legacySaved) {
            localStorage.removeItem(STORAGE_KEYS.LEGACY_SONGS);
        }
    } else if (legacySaved) {
        try {
            const parsedLegacy = JSON.parse(legacySaved);
            userSongs = parsedLegacy.filter(s => s.id !== 'amazing-grace' && s.id !== 'morrison-jig-theme');
            localStorage.setItem(STORAGE_KEYS.USER_SONGS, JSON.stringify(userSongs));
            localStorage.removeItem(STORAGE_KEYS.LEGACY_SONGS);
        } catch (e) {
            userSongs = [];
        }
    }

    const userIds = new Set(userSongs.map(s => s.id));
    const nonOverriddenCurated = curated.filter(c => !userIds.has(c.id));
    const songs = [...userSongs, ...nonOverriddenCurated];

    return { userSongs, songs };
}

export function persistUserSongs(userSongs, currentSong) {
    if (currentSong) {
        const uIdx = userSongs.findIndex(s => s.id === currentSong.id);
        if (uIdx !== -1) {
            userSongs[uIdx] = JSON.parse(JSON.stringify(currentSong));
        } else if (!currentSong.isCurated) {
            userSongs.unshift(JSON.parse(JSON.stringify(currentSong)));
        } else {
            const modifiedCurated = JSON.parse(JSON.stringify(currentSong));
            modifiedCurated.isUserModified = true;
            userSongs.push(modifiedCurated);
        }
    }
    localStorage.setItem(STORAGE_KEYS.USER_SONGS, JSON.stringify(userSongs));
}

export function createSongSnapshot(song, action = '') {
    if (!song) return null;
    return {
        action,
        title: song.title,
        artist: song.artist,
        key: song.key,
        timeSignature: song.timeSignature || '4/4',
        tempo: song.tempo,
        notes: JSON.parse(JSON.stringify(song.notes))
    };
}

export function loadSavedTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'celtic';
}

export function saveThemeToStorage(themeId) {
    localStorage.setItem(STORAGE_KEYS.THEME, themeId);
}

export function loadSavedDisplayPrefs(targetPrefs) {
    const saved = localStorage.getItem(STORAGE_KEYS.DISPLAY_PREFS);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(targetPrefs, parsed);
        } catch (e) {
            console.warn('Erro ao carregar displayPrefs:', e);
        }
    }
    return targetPrefs;
}

export function saveDisplayPrefsToStorage(displayPrefs) {
    localStorage.setItem(STORAGE_KEYS.DISPLAY_PREFS, JSON.stringify(displayPrefs));
}
