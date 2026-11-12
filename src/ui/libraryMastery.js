/* ==========================================================================
   TIN WHISTLE LIVE — FASE 14: BIBLIOTECA INTELIGENTE, MAESTRIA & SETS
   Vanilla ES6 Zero-Build • Análise de Tessitura • Progresso • Sets Irlandeses
   ========================================================================== */

import { t } from '../i18n/index.js';

const STORAGE_MASTERY_KEY = 'tinwhistle_mastery_v1';

/**
 * Analisa a tessitura (alcance), presença de meio-furo, contagem de compassos
 * e duração estimada da música em segundos e formato mm:ss.
 */
export function analyzeSongTessitura(notes, tempo = 100) {
    if (!notes || !Array.isArray(notes)) {
        return {
            range: 'octave1',
            hasHalfHole: false,
            measures: 0,
            durationSec: 0,
            durationStr: '0:00',
            highestNote: '--',
            lowestNote: '--'
        };
    }

    let hasOctave2 = false;
    let hasHalfHole = false;
    let measureCount = 0;
    let totalQuarterBeats = 0;
    let pitchNumbers = [];

    // Tabela de alturas MIDI relativas para determinar menor e maior nota
    const noteMidiMap = {
        'D5': 74, 'D#5': 75, 'EB5': 75, 'E5': 76, 'F5': 77, 'F#5': 78,
        'G5': 79, 'G#5': 80, 'AB5': 80, 'A5': 81, 'A#5': 82, 'BB5': 82, 'B5': 83,
        'C5': 72, 'C#5': 73, 'C6': 84, 'C#6': 85,
        'D6': 86, 'D#6': 87, 'EB6': 87, 'E6': 88, 'F6': 89, 'F#6': 90,
        'G6': 91, 'G#6': 92, 'A6': 93, 'B6': 95, 'D7': 98
    };

    let minMidi = 999;
    let maxMidi = -1;
    let minNoteName = '--';
    let maxNoteName = '--';

    for (const n of notes) {
        if (!n || !n.note) continue;
        const note = n.note;

        if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(note)) {
            measureCount++;
            continue;
        }
        if (note === 'LINEBREAK') continue;

        const dur = parseFloat(n.duration) || 1.0;
        totalQuarterBeats += dur;

        if (note === 'REST') continue;

        // Oitava 2 na flauta em D (D6 em diante, com D5-C#6 sendo a 1ª oitava)
        if (note.includes('6') || note.includes('7')) {
            if (note !== 'C#6') {
                hasOctave2 = true;
            }
        }

        // Detecção de notas acidentadas / meio-furo na flauta em D
        // Na escala natural de D (D, E, F#, G, A, B, C#), C natural (C5/C6) exige dedilhado cruzado OXXOOO ou meio-furo.
        const upper = note.toUpperCase();
        if (upper === 'C5' || upper === 'C6' || upper.includes('BB') || upper.includes('EB') || 
            upper.includes('G#') || upper.includes('D#') || (upper.includes('F') && !upper.includes('F#'))) {
            hasHalfHole = true;
        }

        const midi = noteMidiMap[upper] || 0;
        if (midi > 0) {
            pitchNumbers.push(midi);
            if (midi < minMidi) { minMidi = midi; minNoteName = note; }
            if (midi > maxMidi) { maxMidi = midi; maxNoteName = note; }
        }
    }

    const bpm = tempo > 0 ? tempo : 100;
    const durationSec = Math.round(totalQuarterBeats * (60 / bpm));
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return {
        range: hasOctave2 ? 'octave1-2' : 'octave1',
        rangeType: hasOctave2 ? 'octave1-2' : 'octave1',
        hasHalfHole,
        measures: measureCount > 0 ? measureCount : Math.max(1, Math.ceil(totalQuarterBeats / 4)),
        measuresCount: measureCount > 0 ? measureCount : Math.max(1, Math.ceil(totalQuarterBeats / 4)),
        durationSec,
        durationSeconds: durationSec,
        durationStr,
        durationFormatted: durationStr,
        lowestNote: minNoteName,
        highestNote: maxNoteName
    };
}

/**
 * Carrega todo o registro de maestria pessoal do localStorage
 */
export function getAllMasteryData() {
    try {
        if (typeof localStorage === 'undefined') return {};
        const raw = localStorage.getItem(STORAGE_MASTERY_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (_) {
        return {};
    }
}

/**
 * Obtém o status de progresso e melhor performance de uma música
 */
export function getSongMastery(songId) {
    if (!songId) return null;
    const all = getAllMasteryData();
    return all[songId] || null;
}

/**
 * Salva ou atualiza a maestria de uma música (status, acurácia, pontuação, maxBpm)
 */
export function saveSongMastery(songId, data = {}) {
    if (!songId) return;
    try {
        const all = getAllMasteryData();
        const existing = all[songId] || {
            status: 'learning', // 'learning' | 'practicing' | 'mastered'
            bestAccuracy: 0,
            bestScore: 0,
            maxBpm: 0,
            playCount: 0,
            lastPlayed: Date.now()
        };

        const updated = {
            ...existing,
            ...data,
            lastPlayed: Date.now(),
            playCount: (existing.playCount || 0) + (data.played ? 1 : 0)
        };

        // Se passar nova pontuação/acurácia, mantém o recorde máximo
        if (typeof data.bestAccuracy === 'number') {
            updated.bestAccuracy = Math.max(existing.bestAccuracy || 0, data.bestAccuracy);
        }
        if (typeof data.bestScore === 'number') {
            updated.bestScore = Math.max(existing.bestScore || 0, data.bestScore);
        }
        if (typeof data.maxBpm === 'number') {
            updated.maxBpm = Math.max(existing.maxBpm || 0, data.maxBpm);
        }

        all[songId] = updated;
        localStorage.setItem(STORAGE_MASTERY_KEY, JSON.stringify(all));
        return updated;
    } catch (e) {
        console.error('Falha ao salvar maestria:', e);
        return null;
    }
}

/**
 * Lista de Sets tradicionais conhecidos do repertório céltico
 */
export const TRADITIONAL_SETS = [
    {
        id: 'set-jigs-1',
        titleKey: 'sets.jigsTitle',
        descKey: 'sets.jigsDesc',
        title: 'Celtic Jigs Set (The Session)',
        rhythm: 'jig',
        description: 'Set clássico de Jigs irlandesas animadas em Ré e Mi menor',
        songIds: ['hTCzCb2Q', 'u7DFPn7Z', 'VrJZfUbO'] // The Kesh Jig, Morrison's Jig, The Butterfly
    },
    {
        id: 'set-reels-1',
        titleKey: 'sets.reelsTitle',
        descKey: 'sets.reelsDesc',
        title: 'Irish Reels Set (Speed & Drive)',
        rhythm: 'reel',
        description: 'Set tradicional de Reels de alta energia para treino de velocidade',
        songIds: ['Yi6dPPdy', 'BEu8DMiy'] // Drowsy Maggie, Cooley's Reel
    },
    {
        id: 'set-airs-1',
        titleKey: 'sets.airsTitle',
        descKey: 'sets.airsDesc',
        title: 'Celtic Slow Airs (Expressão e Sopro)',
        rhythm: 'air',
        description: 'Belas baladas tradicionais para trabalhar timbre, vibrato e respiração',
        songIds: ['a3lzmxaX', '4z5Qx_Qr', 'MkgNwBQ7'] // Salley Gardens, Foggy Dew, Sí Bheag Sí Mhór
    },
    {
        id: 'set-fantasy-1',
        titleKey: 'sets.fantasyTitle',
        descKey: 'sets.fantasyDesc',
        title: 'Fantasy & Cinema Themes',
        rhythm: 'soundtrack',
        description: 'Temas icônicos de fantasia e cinema adaptados para Tin Whistle',
        songIds: ['DkuEQVzq', 'dnlFBlfV'] // Concerning Hobbits, Song of Storms
    }
];

export function getLocalizedSetText(set) {
    if (!set) return { title: '', description: '' };
    return {
        title: set.titleKey ? t(set.titleKey) : (set.title || ''),
        description: set.descKey ? t(set.descKey) : (set.description || '')
    };
}

/**
 * Localiza em qual Set tradicional uma determinada música está incluída
 */
export function findSetForSong(songId) {
    if (!songId) return null;
    for (const set of TRADITIONAL_SETS) {
        const idx = set.songIds.indexOf(songId);
        if (idx !== -1) {
            const nextIndex = (idx + 1) % set.songIds.length;
            const nextSongId = set.songIds[nextIndex];
            return {
                set,
                currentIndex: idx,
                nextIndex,
                nextSongId
            };
        }
    }
    return null;
}

/**
 * Retorna 2 recomendações inteligentes de músicas semelhantes baseadas na música atual
 */
export function getSimilarTuneRecommendations(currentSong, allSongs = [], count = 2) {
    if (!currentSong || !Array.isArray(allSongs) || allSongs.length <= 1) return [];

    const otherSongs = allSongs.filter(s => s && s.id !== currentSong.id);
    if (otherSongs.length === 0) return [];

    // Sistema de pontuação de compatibilidade
    const scored = otherSongs.map(song => {
        let score = 0;

        // 1. Mesmo ritmo tem peso máximo (essencial para tradição de sets)
        if (song.rhythm && currentSong.rhythm && song.rhythm === currentSong.rhythm) {
            score += 40;
        }

        // 2. Mesma tonalidade / flauta (evita troca de flauta na estante)
        if (song.key && currentSong.key && song.key === currentSong.key) {
            score += 25;
        }

        // 3. Mesma categoria (celta, pop, rock...)
        if (song.category && currentSong.category && song.category === currentSong.category) {
            score += 15;
        }

        // 4. Dificuldade próxima
        const diffRank = { 'iniciante': 1, 'intermediario': 2, 'avancado': 3 };
        const diffA = diffRank[currentSong.difficulty] || 2;
        const diffB = diffRank[song.difficulty] || 2;
        const diffDistance = Math.abs(diffA - diffB);
        if (diffDistance === 0) score += 15;
        else if (diffDistance === 1) score += 8;

        // 5. Popularidade / likes como desempate suave
        score += Math.min(10, (song.likes || 0));

        return { song, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(entry => entry.song);
}

/**
 * Sorteia uma música aleatória da lista fornecida
 */
export function pickRandomTune(songList = []) {
    if (!Array.isArray(songList) || songList.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * songList.length);
    return songList[randomIndex];
}
