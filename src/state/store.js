/* ==========================================================================
   GERENCIAMENTO CENTRALIZADO DE ESTADO, HISTÓRICO (UNDO/REDO) & LOCALSTORAGE
   ========================================================================== */

import { DEFAULT_SONGS } from '../config/whistleData.js';

export const STORAGE_KEYS = {
    USER_SONGS: 'celtic_whistle_tabs_user',
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

    const curatedIdsSet = new Set(curated.map(c => c.id));

    let userSongs = [];
    const savedUserSongs = localStorage.getItem(STORAGE_KEYS.USER_SONGS);

    if (savedUserSongs) {
        try {
            userSongs = JSON.parse(savedUserSongs);
            if (!Array.isArray(userSongs)) userSongs = [];
            // Remove resíduos de músicas padrão que não foram criadas/modificadas pelo usuário
            userSongs = userSongs.filter(s => {
                if (curatedIdsSet.has(s.id) && !s.isUserModified) return false;
                return true;
            });
        } catch (e) {
            console.error('Erro ao ler celtic_whistle_tabs_user:', e);
            userSongs = [];
        }
    }

    const userIds = new Set(userSongs.map(s => s.id));
    const nonOverriddenCurated = curated.filter(c => !userIds.has(c.id)).map(c => ({
        ...c,
        isCurated: true,
        is_curated: 1
    }));
    const songs = [...userSongs, ...nonOverriddenCurated];

    return { userSongs, songs };
}

let lastStorageStatus = { ok: true, trimmedAudio: false, quotaExceeded: false };

export function getLastStorageStatus() {
    return lastStorageStatus;
}

export function saveUserSongsSafely(userSongs, currentSongId = null) {
    const list = Array.isArray(userSongs) ? userSongs : [];
    try {
        localStorage.setItem(STORAGE_KEYS.USER_SONGS, JSON.stringify(list));
        lastStorageStatus = { ok: true, trimmedAudio: false, quotaExceeded: false };
        return lastStorageStatus;
    } catch (err) {
        const isQuota = Boolean(
            err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014)
        );
        if (!isQuota) {
            console.error('Erro ao salvar músicas no localStorage:', err);
            lastStorageStatus = { ok: false, trimmedAudio: false, quotaExceeded: false, error: err };
            return lastStorageStatus;
        }

        // Tenta liberar espaço removendo caches de áudio base64 de músicas já sincronizadas na nuvem
        let trimmed = false;
        const compacted = list.map(song => {
            if (!song || song.id === currentSongId) return song;
            if ((song.audio_demo || song.audioDemo) && song.isCloud) {
                trimmed = true;
                const copy = { ...song };
                delete copy.audio_demo;
                delete copy.audioDemo;
                return copy;
            }
            return song;
        });

        if (trimmed) {
            try {
                localStorage.setItem(STORAGE_KEYS.USER_SONGS, JSON.stringify(compacted));
                if (Array.isArray(userSongs)) {
                    userSongs.splice(0, userSongs.length, ...compacted);
                }
                lastStorageStatus = { ok: true, trimmedAudio: true, quotaExceeded: false };
                return lastStorageStatus;
            } catch (retryErr) {
                // Mesmo compactado excedeu a cota
            }
        }

        console.warn('[Storage] Cota do localStorage excedida ao salvar partituras.');
        lastStorageStatus = { ok: false, trimmedAudio: trimmed, quotaExceeded: true, error: err };
        return lastStorageStatus;
    }
}

export function persistUserSongs(userSongs, currentSong) {
    if (!Array.isArray(userSongs)) userSongs = [];
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
    saveUserSongsSafely(userSongs, currentSong ? currentSong.id : null);
    return userSongs;
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
