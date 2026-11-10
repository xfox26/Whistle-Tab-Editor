/* ==========================================================================
   MOTOR DE ÁUDIO POLIFÔNICO & BACKING TRACKS (FASE 10)
   Bodhrán Celta, Violão DADGAD & Irish Bouzouki (Web Audio API)
   ========================================================================== */

import { getOrCreateNoiseBuffer } from './synthEngine.js';

// ==========================================================================
// 1. DICIONÁRIO DE ACORDES CELTAS (AFINAÇÃO DADGAD & BOUZOUKI GDAD)
// ==========================================================================
// Frequências fundamentais das cordas para os acordes mais tradicionais
export const CELTIC_CHORDS = {
    // Acordes com tônica em D (D5 / Dadd9 / D tradicional DADGAD)
    'D':     [146.83, 220.00, 293.66, 370.00, 440.00],        // D3, A3, D4, F#4, A4
    'D5':    [146.83, 220.00, 293.66, 440.00, 587.33],        // D3, A3, D4, A4, D5 (Power chord modal celta)
    'Dadd9': [146.83, 220.00, 329.63, 370.00, 440.00],        // D3, A3, E4, F#4, A4
    'Dm':    [146.83, 220.00, 293.66, 349.23, 440.00],        // D3, A3, D4, F4, A4

    // Acordes com tônica em G (Gadd9 / G modal DADGAD)
    'G':     [98.00, 146.83, 196.00, 246.94, 293.66, 392.00], // G2, D3, G3, B3, D4, G4
    'Gadd9': [98.00, 146.83, 196.00, 293.66, 329.63, 392.00], // G2, D3, G3, D4, E4, G4
    'Gm':    [98.00, 146.83, 196.00, 233.08, 293.66, 392.00], // G2, D3, G3, Bb3, D4, G4

    // Acordes com tônica em A (Asus4 / A tradicional celta)
    'A':     [110.00, 164.81, 220.00, 277.18, 329.63, 440.00],// A2, E3, A3, C#4, E4, A4
    'Asus4': [110.00, 164.81, 220.00, 293.66, 329.63, 440.00],// A2, E3, A3, D4, E4, A4 (clássico DADGAD)
    'Am':    [110.00, 164.81, 220.00, 261.63, 329.63, 440.00],// A2, E3, A3, C4, E4, A4

    // Acordes relativos menores (Bm, Em)
    'Bm':    [123.47, 184.99, 246.94, 293.66, 370.00],        // B2, F#3, B3, D4, F#4
    'Bm7':   [123.47, 184.99, 220.00, 293.66, 370.00],        // B2, F#3, A3, D4, F#4
    'Em':    [82.41, 123.47, 164.81, 196.00, 246.94, 329.63], // E2, B2, E3, G3, B3, E4
    'Em7':   [82.41, 123.47, 164.81, 196.00, 293.66, 329.63], // E2, B2, E3, G3, D4, E4

    // Acordes de passagem celta (C Natural celta, F)
    'C':     [130.81, 196.00, 261.63, 329.63, 392.00, 523.25],// C3, G3, C4, E4, G4, C5
    'Cadd9': [130.81, 196.00, 261.63, 293.66, 392.00],        // C3, G3, C4, D4, G4
    'F':     [87.31, 130.81, 174.61, 220.00, 261.63, 349.23], // F2, C3, F3, A3, C4, F4
    'F#m':   [92.50, 138.59, 185.00, 220.00, 277.18, 370.00]  // F#2, C#3, F#3, A3, C#4, F#4
};

// ==========================================================================
// 2. SINTETIZADOR DE BODHRÁN CELTA ACÚSTICO
// ==========================================================================
/**
 * Toca um golpe no Bodhrán irlandês
 * @param {AudioContext} ctx
 * @param {'bass'|'slap'|'brush'|'rim'} type Tipo de batida do tipper na pele
 * @param {number} time Momento do disparo (ctx.currentTime)
 * @param {number} volume Volume relativo (0.0 a 1.0)
 */
export function playBodhranHit(ctx, type, time, volume = 0.8) {
    if (!ctx || volume <= 0.001) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, volume)), time);
    masterGain.connect(ctx.destination);

    if (type === 'bass') {
        // Golpe Grave Central (Mão livre na pele, som encorpado e ressonante)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';

        // Queda de pitch da pele de cabra sob impacto (105Hz -> 54Hz)
        osc.frequency.setValueAtTime(105, time);
        osc.frequency.exponentialRampToValueAtTime(54, time + 0.16);

        // Envelope de ganho com corpo acústico
        oscGain.gain.setValueAtTime(0.001, time);
        oscGain.gain.linearRampToValueAtTime(0.7, time + 0.006);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        // Estalo do tipper (ataque de madeira no couro)
        const noiseBuf = getOrCreateNoiseBuffer(ctx);
        if (noiseBuf) {
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, time);
            filter.Q.setValueAtTime(3.0, time);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.22, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(masterGain);

            noise.start(time);
            noise.stop(time + 0.03);
        }

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.24);

    } else if (type === 'slap' || type === 'rim') {
        // Golpe Seco / Borda (Som cortante de contra-tempo)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(210, time);
        osc.frequency.exponentialRampToValueAtTime(115, time + 0.06);

        oscGain.gain.setValueAtTime(0.001, time);
        oscGain.gain.linearRampToValueAtTime(0.55, time + 0.004);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

        // Ruído percussivo cortante
        const noiseBuf = getOrCreateNoiseBuffer(ctx);
        if (noiseBuf) {
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2200, time);
            filter.Q.setValueAtTime(4.0, time);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.35, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(masterGain);

            noise.start(time);
            noise.stop(time + 0.04);
        }

        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(time);
        osc.stop(time + 0.1);

    } else {
        // Brush / Ghost Note (Toque sutil de retorno da ponta do tipper)
        const noiseBuf = getOrCreateNoiseBuffer(ctx);
        if (noiseBuf) {
            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1600, time);
            filter.Q.setValueAtTime(2.0, time);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.18, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(masterGain);

            noise.start(time);
            noise.stop(time + 0.035);
        }
    }
}

// ==========================================================================
// 3. SINTETIZADOR DE VIOLÃO DADGAD & IRISH BOUZOUKI
// ==========================================================================
/**
 * Toca uma palhetada/acorde acústico com simulação física de cordas dedilhadas
 * @param {AudioContext} ctx
 * @param {string} chordName Nome do acorde (ex: 'D', 'G', 'Bm')
 * @param {number} time Momento de início da palhetada
 * @param {number} duration Duração total da ressonância (em segundos)
 * @param {number} volume Volume relativo (0.0 a 1.0)
 * @param {boolean} isUpstroke Palhetada para cima (inverte a ordem das cordas)
 * @param {'dadgad'|'bouzouki'} instrument Timbre de violão DADGAD ou Bouzouki com cordas duplas
 */
export function playCelticStringStrum(ctx, chordName, time, duration = 1.0, volume = 0.5, isUpstroke = false, instrument = 'dadgad') {
    if (!ctx || volume <= 0.001) return;

    let freqs = CELTIC_CHORDS[chordName];
    if (!freqs) {
        // Fallback para Ré Maior se não encontrado
        freqs = CELTIC_CHORDS['D'];
    }

    const chordStrings = isUpstroke ? [...freqs].reverse() : [...freqs];
    const strumDelay = instrument === 'bouzouki' ? 0.014 : 0.018; // Tempo entre o toque de cada corda

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0, volume * 0.45)), time);
    masterGain.connect(ctx.destination);

    chordStrings.forEach((freq, idx) => {
        const stringTime = time + (idx * strumDelay);
        const stringDuration = Math.max(0.2, duration - (idx * strumDelay));

        // 1. Oscilador Primário (Dente-de-serra rico em harmônicos de corda metálica)
        const oscSaw = ctx.createOscillator();
        oscSaw.type = 'sawtooth';
        oscSaw.frequency.setValueAtTime(freq, stringTime);

        // 2. Oscilador Secundário (Triangular para dar peso à fundamental)
        const oscTri = ctx.createOscillator();
        oscTri.type = 'triangle';
        oscTri.frequency.setValueAtTime(freq, stringTime);

        // Se for Bouzouki, adiciona detune de coro acústico (cordas duplas emparelhadas)
        if (instrument === 'bouzouki') {
            oscSaw.detune.setValueAtTime(idx % 2 === 0 ? 5 : -5, stringTime);
            oscTri.detune.setValueAtTime(idx % 2 === 0 ? -4 : 4, stringTime);
        }

        // Filtro passa-baixo ressonante (simula a caixa harmônica de jacarandá/mogno)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(instrument === 'bouzouki' ? 3.5 : 2.2, stringTime);
        // O brilho metálico abre no ataque da palheta e decai naturalmente
        const peakCutoff = instrument === 'bouzouki' ? 4200 : 3200;
        filter.frequency.setValueAtTime(1200, stringTime);
        filter.frequency.linearRampToValueAtTime(peakCutoff, stringTime + 0.012);
        filter.frequency.exponentialRampToValueAtTime(500, stringTime + Math.min(0.6, stringDuration));

        // Envelope de Ganho (Pluck Attack & Decay)
        const stringGain = ctx.createGain();
        stringGain.gain.setValueAtTime(0.0001, stringTime);
        stringGain.gain.linearRampToValueAtTime(0.18, stringTime + 0.008);
        stringGain.gain.exponentialRampToValueAtTime(0.05, stringTime + 0.15);
        stringGain.gain.exponentialRampToValueAtTime(0.0001, stringTime + stringDuration);

        oscSaw.connect(filter);
        oscTri.connect(filter);
        filter.connect(stringGain);
        stringGain.connect(masterGain);

        oscSaw.start(stringTime);
        oscTri.start(stringTime);
        oscSaw.stop(stringTime + stringDuration);
        oscTri.stop(stringTime + stringDuration);
    });
}

// ==========================================================================
// 4. INFERÊNCIA INTELIGENTE DE HARMONIA CELTA
// ==========================================================================
/**
 * Infere o acorde tradicional correspondente para a nota e o tom da flauta
 * quando a partitura não possui acorde anotado manualmente.
 * @param {string} noteName Nota atual (ex: 'D5', 'G5', 'A5', 'REST')
 * @param {string} key Tom da flauta (ex: 'D', 'C', 'G')
 * @param {number} beatPos Posição no compasso
 * @returns {string} Nome do acorde correspondente
 */
export function inferCelticChord(noteName, key = 'D', beatPos = 0) {
    if (!noteName || noteName === 'REST') return key === 'G' ? 'G' : 'D';

    const cleanNote = noteName.replace(/[0-9]/g, '');

    // Harmonização Modal Celta para Tom em Ré (D) - o mais comum no tin whistle
    if (key === 'D') {
        if (cleanNote === 'D' || cleanNote === 'F#') return beatPos < 2 ? 'D' : 'Bm';
        if (cleanNote === 'G' || cleanNote === 'B') return 'G';
        if (cleanNote === 'A' || cleanNote === 'C#') return 'A';
        if (cleanNote === 'E') return 'Em';
        if (cleanNote === 'C') return 'C'; // Acorde de C no D Mixolídio
        return 'D';
    }

    // Harmonização para Tom em Sol (G)
    if (key === 'G') {
        if (cleanNote === 'G' || cleanNote === 'B') return 'G';
        if (cleanNote === 'C' || cleanNote === 'E') return 'C';
        if (cleanNote === 'D' || cleanNote === 'F#') return 'D';
        if (cleanNote === 'A') return 'Am';
        return 'G';
    }

    // Harmonização para Tom em Dó (C)
    if (key === 'C') {
        if (cleanNote === 'C' || cleanNote === 'E') return 'C';
        if (cleanNote === 'F' || cleanNote === 'A') return 'F';
        if (cleanNote === 'G' || cleanNote === 'B') return 'G';
        if (cleanNote === 'D') return 'Dm';
        return 'C';
    }

    return key;
}

// ==========================================================================
// 5. SEQUENCIADOR RÍTMICO DE BACKING TRACKS
// ==========================================================================
/**
 * Agenda o Bodhrán e os acordes de violão no momento correto da nota
 * @param {AudioContext} ctx
 * @param {Object} noteObj Nota tocada pelo sequenciador
 * @param {number} startTime Tempo de início em segundos (ctx.currentTime)
 * @param {number} realDuration Duração da nota
 * @param {number} bpm Batimentos por minuto
 * @param {number} startBeat Pulso inicial no compasso
 * @param {number} beatsPerBar Batidas por compasso (ex: 4 para reel, 3 para valsa, 2 para polka/jig)
 * @param {Object} settings Preferências do usuário (volumes e estados ativados)
 */
/**
 * Agenda o Bodhrán e os acordes de violão ao longo de toda a duração da nota/pausa,
 * mantendo o pulso e o groove contínuo em mínimas, semibreves e pausas longas.
 * @param {AudioContext} ctx
 * @param {Object} noteObj Nota tocada pelo sequenciador
 * @param {number} startTime Tempo de início em segundos (ctx.currentTime)
 * @param {number} realDuration Duração da nota em segundos
 * @param {number} bpm Batimentos por minuto
 * @param {number} startBeat Pulso inicial no compasso
 * @param {number} beatsPerBar Batidas por compasso (ex: 4 para reel, 3 para valsa, 2 para polka/jig)
 * @param {Object} settings Preferências do usuário (volumes, instrumentos e swing celta)
 */
export function scheduleBackingTrackStep(ctx, noteObj, startTime, realDuration, bpm, startBeat, beatsPerBar, settings = {}) {
    if (!ctx) return;

    const bodhranActive = !!settings.bodhranActive;
    const guitarActive = !!settings.guitarActive;
    if (!bodhranActive && !guitarActive) return;

    const bodhranVolume = parseFloat(settings.bodhranVolume) || 0.7;
    const guitarVolume = parseFloat(settings.guitarVolume) || 0.55;
    const instrument = settings.guitarInstrument || 'dadgad'; // 'dadgad' | 'bouzouki'
    const rhythmStyle = (settings.rhythmStyle || 'reel').toLowerCase();
    const swingMode = (settings.swing || 'straight').toLowerCase(); // 'straight' | 'light' | 'heavy'

    // Deslocamento temporal sutil do contratempo para o balanço típico celta (Celtic Lilt)
    const swingOffset = swingMode === 'heavy' ? 0.08 : (swingMode === 'light' ? 0.045 : 0);

    const noteBeats = parseFloat(noteObj.duration) || 1.0;
    const beatDuration = 60 / bpm;
    const endBeat = startBeat + noteBeats;

    // Identificar acorde: prioridade para o campo da nota, ou inferido pelo tom
    let chord = noteObj.chord;
    if (!chord || !CELTIC_CHORDS[chord]) {
        chord = inferCelticChord(noteObj.note, settings.songKey || 'D', startBeat);
    }

    // 1. DISPARO NO MOMENTO INICIAL DA NOTA (START_BEAT)
    if (bodhranActive) {
        if (rhythmStyle.includes('jig')) {
            const isDownbeat = (Math.abs(startBeat % 3) < 0.25);
            playBodhranHit(ctx, isDownbeat ? 'bass' : 'slap', startTime, isDownbeat ? bodhranVolume : bodhranVolume * 0.85);
        } else if (rhythmStyle.includes('waltz')) {
            const isDownbeat = (Math.abs(startBeat % 3) < 0.25);
            playBodhranHit(ctx, isDownbeat ? 'bass' : 'slap', startTime, isDownbeat ? bodhranVolume : bodhranVolume * 0.7);
        } else if (rhythmStyle.includes('polka')) {
            const isDownbeat = (Math.abs(startBeat % 2) < 0.25);
            playBodhranHit(ctx, isDownbeat ? 'bass' : 'slap', startTime, isDownbeat ? bodhranVolume : bodhranVolume * 0.8);
        } else {
            // Reel / 4/4 tradicional
            const isBarAccent = (Math.abs(startBeat % 4) < 0.25);
            const isDownbeat = (Math.abs(startBeat % 2) < 0.25);
            const isOffbeat = (startBeat % 1.0 > 0.3);

            if (isBarAccent) {
                playBodhranHit(ctx, 'bass', startTime, bodhranVolume);
            } else if (isDownbeat) {
                playBodhranHit(ctx, 'slap', startTime, bodhranVolume * 0.85);
            } else if (isOffbeat) {
                playBodhranHit(ctx, 'brush', startTime, bodhranVolume * 0.6);
            } else {
                playBodhranHit(ctx, 'slap', startTime, bodhranVolume * 0.75);
            }
        }

        // Se a nota tiver duração suficiente para contratempo (>= 0.75 beats), agendar ghost note (brush)
        if (noteBeats >= 0.75 && (startBeat % 1.0 < 0.25)) {
            const brushTime = startTime + ((0.5 + swingOffset) * beatDuration);
            if (brushTime < startTime + realDuration - 0.04) {
                playBodhranHit(ctx, 'brush', brushTime, bodhranVolume * 0.55);
            }
        }
    }

    if (guitarActive) {
        const isStrumMoment = (startBeat % 1.0 < 0.25) || (noteBeats >= 1.0);
        if (isStrumMoment) {
            const isUpstroke = (Math.floor(startBeat) % 2 === 1);
            const strumDuration = Math.min(Math.max(0.35, realDuration * 1.2), 1.6);
            playCelticStringStrum(ctx, chord, startTime, strumDuration, guitarVolume, isUpstroke, instrument);
        }
    }

    // 2. GROOVE CONTÍNUO: PREENCHIMENTO DOS PULSOS INTERMEDIÁRIOS EM NOTAS LONGAS E PAUSAS
    // Ex: Mínima (2 tempos), Semibreve (4 tempos), Pausas longas
    if (noteBeats > 1.0) {
        const firstIntermediateBeat = Math.floor(startBeat) + 1;
        for (let b = firstIntermediateBeat; b < endBeat - 1e-4; b++) {
            const offsetBeats = b - startBeat;
            const pulseTime = startTime + (offsetBeats * beatDuration);
            const beatInBar = b % beatsPerBar;
            const isDownbeat = Math.abs(beatInBar) < 1e-4;

            if (bodhranActive) {
                if (rhythmStyle.includes('waltz')) {
                    playBodhranHit(ctx, isDownbeat ? 'bass' : 'slap', pulseTime, isDownbeat ? bodhranVolume : bodhranVolume * 0.7);
                } else if (rhythmStyle.includes('jig')) {
                    playBodhranHit(ctx, isDownbeat ? 'bass' : 'slap', pulseTime, isDownbeat ? bodhranVolume : bodhranVolume * 0.85);
                } else if (rhythmStyle.includes('polka')) {
                    playBodhranHit(ctx, isDownbeat ? 'bass' : 'slap', pulseTime, isDownbeat ? bodhranVolume : bodhranVolume * 0.8);
                } else {
                    const isBarAccent = Math.abs(b % 4) < 1e-4;
                    const isBeatAccent = Math.abs(b % 2) < 1e-4;
                    const hitType = isBarAccent ? 'bass' : (isBeatAccent ? 'slap' : 'brush');
                    const volFactor = isBarAccent ? 1.0 : (isBeatAccent ? 0.82 : 0.65);
                    playBodhranHit(ctx, hitType, pulseTime, bodhranVolume * volFactor);
                }

                // Subdivisão de contratempo (off-beat) com swing celta
                const offbeatTime = pulseTime + ((0.5 + swingOffset) * beatDuration);
                if (offbeatTime < startTime + realDuration - 0.04) {
                    playBodhranHit(ctx, 'brush', offbeatTime, bodhranVolume * 0.5);
                }
            }

            if (guitarActive) {
                // Violão dedilha/palheta ritmicamente nos tempos intermediários
                const isUpstroke = (b % 2 === 1);
                const interDuration = Math.min(0.45, beatDuration * 0.95);
                playCelticStringStrum(ctx, chord, pulseTime, interDuration, guitarVolume * 0.8, isUpstroke, instrument);
            }
        }
    }
}
