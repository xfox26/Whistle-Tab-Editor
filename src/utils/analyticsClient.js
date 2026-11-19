/* ==========================================================================
   TELEMETRIA FIRST-PARTY — TIN WHISTLE LIVE
   Coleta leve, anônima e sem dependências externas para o Painel Admin.
   ========================================================================== */

const VISITOR_STORAGE_KEY = 'twl_anon_vid';
const SESSION_STORAGE_KEY = 'twl_anon_sid';
const FLUSH_INTERVAL_MS = 30_000;
const MAX_BATCH_EVENTS = 30;

function generateId() {
    try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
    } catch {}
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateStorageId(storage, key) {
    try {
        const existing = storage.getItem(key);
        if (existing && existing.length >= 8) return existing;
        const fresh = generateId();
        storage.setItem(key, fresh);
        return fresh;
    } catch {
        return generateId();
    }
}

function detectDeviceType() {
    const w = typeof window !== 'undefined' ? window.innerWidth || 0 : 1024;
    if (w > 0 && w <= 680) return 'mobile';
    if (w > 680 && w <= 1024) return 'tablet';
    return 'desktop';
}

function detectDisplayMode() {
    try {
        if (typeof document !== 'undefined' && String(document.referrer || '').startsWith('android-app://')) {
            return 'twa';
        }
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            return 'standalone';
        }
        if (typeof navigator !== 'undefined' && navigator.standalone === true) {
            return 'standalone';
        }
    } catch {}
    return 'browser';
}

const state = {
    initialized: false,
    visitorId: null,
    sessionId: null,
    currentMode: 'studio',
    entryMode: 'studio',
    activeMsBuffer: 0,
    modeMsBuffer: 0,
    lastTickTs: 0,
    events: [],
    flushTimer: null,
    getTheme: () => document.body?.dataset?.theme || 'celtic',
    getLanguage: () => document.documentElement?.lang?.slice(0, 2) || 'pt',
    lastPlayByTune: new Map(),
    lastOpenByTune: new Map()
};

function accumulateTime() {
    if (!state.initialized) return;
    const now = Date.now();
    if (state.lastTickTs > 0 && document.visibilityState === 'visible') {
        const delta = Math.max(0, Math.min(60_000, now - state.lastTickTs));
        state.activeMsBuffer += delta;
        state.modeMsBuffer += delta;
    }
    state.lastTickTs = now;
}

function enqueueEvent(eventType, targetId = null, targetLabel = null, durationSec = 0, meta = null) {
    if (!state.initialized) return;
    if (state.events.length >= 60) {
        state.events.shift();
    }
    state.events.push({
        eventType,
        targetId: targetId != null ? String(targetId).slice(0, 80) : null,
        targetLabel: targetLabel != null ? String(targetLabel).slice(0, 120) : null,
        durationSec: Math.max(0, Math.round(durationSec || 0)),
        meta: meta && typeof meta === 'object' ? meta : undefined
    });
    if (state.events.length >= 20) {
        flushAnalytics(false);
    }
}

export function flushAnalytics(useBeacon = false) {
    if (!state.initialized) return;
    accumulateTime();

    const activeDeltaSec = Math.floor(state.activeMsBuffer / 1000);
    const modeDeltaSec = Math.floor(state.modeMsBuffer / 1000);

    if (modeDeltaSec > 0) {
        state.modeMsBuffer -= modeDeltaSec * 1000;
        state.events.push({
            eventType: 'mode_time',
            targetId: state.currentMode,
            targetLabel: state.currentMode,
            durationSec: Math.min(300, modeDeltaSec)
        });
    }

    if (activeDeltaSec <= 0 && state.events.length === 0) {
        return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return;
    }

    state.activeMsBuffer -= activeDeltaSec * 1000;
    const eventsToSend = state.events.splice(0, MAX_BATCH_EVENTS);

    const payload = JSON.stringify({
        session: {
            sessionId: state.sessionId,
            visitorId: state.visitorId,
            activeDeltaSec: Math.min(300, activeDeltaSec),
            deviceType: detectDeviceType(),
            displayMode: detectDisplayMode(),
            language: (state.getLanguage() || 'pt').slice(0, 2).toLowerCase(),
            theme: (state.getTheme() || 'celtic').slice(0, 30),
            entryMode: state.entryMode,
            screenWidth: typeof window !== 'undefined' ? window.innerWidth || 0 : 0
        },
        events: eventsToSend
    });

    if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        try {
            const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
            navigator.sendBeacon('/api/analytics/collect', blob);
            return;
        } catch {}
    }

    try {
        fetch('/api/analytics/collect', {
            method: 'POST',
            credentials: 'include',
            keepalive: useBeacon,
            headers: { 'Content-Type': 'application/json' },
            body: payload
        }).catch(() => {});
    } catch {}
}

export function initAnalytics({ initialMode = 'studio', getTheme, getLanguage } = {}) {
    if (state.initialized) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    state.initialized = true;
    state.visitorId = getOrCreateStorageId(window.localStorage, VISITOR_STORAGE_KEY);
    state.sessionId = getOrCreateStorageId(window.sessionStorage, SESSION_STORAGE_KEY);
    state.currentMode = ['studio', 'practice', 'playalong'].includes(initialMode) ? initialMode : 'studio';
    state.entryMode = state.currentMode;
    if (typeof getTheme === 'function') state.getTheme = getTheme;
    if (typeof getLanguage === 'function') state.getLanguage = getLanguage;
    state.lastTickTs = Date.now();

    enqueueEvent('mode_enter', state.currentMode, state.currentMode);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushAnalytics(true);
        } else {
            state.lastTickTs = Date.now();
        }
    });

    window.addEventListener('pagehide', () => {
        flushAnalytics(true);
    });

    state.flushTimer = window.setInterval(() => {
        flushAnalytics(false);
    }, FLUSH_INTERVAL_MS);

    // Envia o registro inicial da sessão logo após o carregamento
    window.setTimeout(() => flushAnalytics(false), 3000);
}

export function trackModeChange(nextMode) {
    if (!state.initialized) return;
    const normalized = ['studio', 'practice', 'playalong'].includes(nextMode) ? nextMode : 'studio';
    if (normalized === state.currentMode) return;

    accumulateTime();
    const modeDeltaSec = Math.floor(state.modeMsBuffer / 1000);
    if (modeDeltaSec > 0) {
        state.modeMsBuffer -= modeDeltaSec * 1000;
        enqueueEvent('mode_time', state.currentMode, state.currentMode, Math.min(300, modeDeltaSec));
    }

    state.currentMode = normalized;
    enqueueEvent('mode_enter', normalized, normalized);
}

export function trackTuneOpen(song) {
    if (!state.initialized || !song || !song.id) return;
    const now = Date.now();
    const last = state.lastOpenByTune.get(song.id) || 0;
    if (now - last < 5000) return;
    state.lastOpenByTune.set(song.id, now);
    enqueueEvent('tune_open', song.id, song.title || song.id, 0, {
        key: song.key || '',
        rhythm: song.rhythm || ''
    });
}

export function trackTunePlay(song, mode = null) {
    if (!state.initialized || !song || !song.id) return;
    const now = Date.now();
    const last = state.lastPlayByTune.get(song.id) || 0;
    if (now - last < 30_000) return;
    state.lastPlayByTune.set(song.id, now);
    enqueueEvent('tune_play', song.id, song.title || song.id, 0, {
        mode: mode || state.currentMode
    });
}

export function trackPlayAlongFinish(song, score) {
    if (!state.initialized || !song || !song.id) return;
    enqueueEvent('playalong_finish', song.id, song.title || song.id, 0, {
        score: Math.max(0, Math.min(100, Math.round(Number(score) || 0)))
    });
}

export function trackToolUse(toolId, label = null, meta = null) {
    if (!state.initialized || !toolId) return;
    enqueueEvent('tool_use', toolId, label || toolId, 0, meta);
}

export function trackExport(format, song = null) {
    if (!state.initialized || !format) return;
    enqueueEvent('export', `export_${format}`, String(format).toUpperCase(), 0, song?.id ? { tuneId: song.id } : null);
}

export function trackImport(format, count = 1) {
    if (!state.initialized || !format) return;
    enqueueEvent('import', `import_${format}`, String(format).toUpperCase(), 0, { count });
}

export function trackShare(channel = 'web_share', song = null) {
    if (!state.initialized) return;
    enqueueEvent('share', channel, channel, 0, song?.id ? { tuneId: song.id } : null);
}

export function trackPwaInstall(outcome = 'accepted') {
    if (!state.initialized) return;
    enqueueEvent('pwa_install', `pwa_${outcome}`, `PWA ${outcome}`, 0, { outcome });
}
