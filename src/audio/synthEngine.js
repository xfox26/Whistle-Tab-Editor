/* ==========================================================================
   MOTOR DE SÍNTESE WEB AUDIO API (TIN WHISTLE, ORNAMENTOS, METRÔNOMO & DRONE)
   ========================================================================== */

import { NOTE_FREQUENCIES, WHISTLE_KEYS_DATA, getDiatonicCutNote, getDiatonicStrikeNote } from '../config/whistleData.js';

// Cache do buffer de ruído branco (Breath Chiff) por AudioContext/OfflineAudioContext
const noiseBufferCache = new WeakMap();

export function getOrCreateNoiseBuffer(ctx) {
    if (!ctx) return null;
    if (noiseBufferCache.has(ctx)) {
        return noiseBufferCache.get(ctx);
    }
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const bufferData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        bufferData[i] = Math.random() * 2 - 1;
    }
    noiseBufferCache.set(ctx, noiseBuffer);
    return noiseBuffer;
}

export function getTransposedFrequency(noteName, whistleKey) {
    const standardFreq = NOTE_FREQUENCIES[noteName];
    if (standardFreq === undefined || standardFreq === 0) return 0;

    const keyData = WHISTLE_KEYS_DATA[whistleKey];
    const semitones = keyData ? keyData.semitones : 0;
    return standardFreq * Math.pow(2, semitones / 12);
}

// Motor unificado de voz de Tin Whistle (usado tanto em tempo real quanto em OfflineAudioContext para WAV)
export function scheduleWhistleVoice(ctx, frequency, duration, startTime, ornament = null, noteKey = null, whistleKey = 'D', isSlurred = false) {
    if (!ctx || frequency <= 0 || duration <= 0) return;

    // 1. Oscilador Principal (Onda Triangular - som amadeirado, doce)
    const oscTri = ctx.createOscillator();
    oscTri.type = 'triangle';

    // 2. Oscilador Secundário (Onda Senoidal - adiciona peso e pureza na fundamental)
    const oscSine = ctx.createOscillator();
    oscSine.type = 'sine';

    // Cálculo diatônico autêntico de ornamentações tradicionais irlandesas
    let cutFreq = frequency * 1.122; // fallback padrão (+2 semitons)
    let strikeFreq = frequency * 0.891; // fallback padrão (-2 semitons)

    if (noteKey) {
        const cutNote = getDiatonicCutNote(noteKey);
        const transCut = getTransposedFrequency(cutNote, whistleKey);
        if (transCut > 0 && transCut > frequency) {
            cutFreq = transCut;
        }

        const strikeNote = getDiatonicStrikeNote(noteKey);
        const transStrike = getTransposedFrequency(strikeNote, whistleKey);
        if (transStrike > 0 && transStrike < frequency) {
            strikeFreq = transStrike;
        }
    }

    // Aplicação acústica de ornamentações tradicionais irlandesas
    if (ornament === 'cut' && duration > 0.1) {
        // Cut: Graça rápida superior diatônica nos primeiros 35ms
        oscTri.frequency.setValueAtTime(cutFreq, startTime);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.035);
        oscSine.frequency.setValueAtTime(cutFreq, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.035);
    } else if (ornament === 'strike' && duration > 0.1) {
        // Strike: Batida rápida inferior diatônica nos primeiros 35ms
        oscTri.frequency.setValueAtTime(strikeFreq, startTime);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.035);
        oscSine.frequency.setValueAtTime(strikeFreq, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.035);
    } else if (ornament === 'roll' && duration > 0.25) {
        // Roll irlandês autêntico: Nota -> Cut diatônico -> Nota -> Strike diatônico -> Nota
        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscTri.frequency.setValueAtTime(cutFreq, startTime + 0.035);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.07);
        oscTri.frequency.setValueAtTime(strikeFreq, startTime + 0.105);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.14);

        oscSine.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(cutFreq, startTime + 0.035);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.07);
        oscSine.frequency.setValueAtTime(strikeFreq, startTime + 0.105);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.14);
    } else if (ornament === 'cran' && duration > 0.2) {
        // Cran autêntico (típico do Ré grave D5 onde não há orifício abaixo para strike):
        // Cortes rápidos superiores sucessivos alternando notas diatônicas
        let cranCut1 = cutFreq;
        let cranCut2 = cutFreq;
        let cranCut3 = cutFreq;
        if (noteKey === 'D5') {
            const eFreq = getTransposedFrequency('E5', whistleKey);
            const fFreq = getTransposedFrequency('F#5', whistleKey);
            const aFreq = getTransposedFrequency('A5', whistleKey);
            if (eFreq > 0) cranCut1 = eFreq;
            if (fFreq > 0) cranCut2 = fFreq;
            if (aFreq > 0) cranCut3 = aFreq;
        }

        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscTri.frequency.setValueAtTime(cranCut1, startTime + 0.025);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.05);
        oscTri.frequency.setValueAtTime(cranCut2, startTime + 0.075);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.10);
        oscTri.frequency.setValueAtTime(cranCut3, startTime + 0.125);
        oscTri.frequency.setValueAtTime(frequency, startTime + 0.15);

        oscSine.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(cranCut1, startTime + 0.025);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.05);
        oscSine.frequency.setValueAtTime(cranCut2, startTime + 0.075);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.10);
        oscSine.frequency.setValueAtTime(cranCut3, startTime + 0.125);
        oscSine.frequency.setValueAtTime(frequency, startTime + 0.15);
    } else if (ornament === 'slide' && duration > 0.1) {
        // Slide: Glissando ascendente contínuo
        const startSlideFreq = strikeFreq;
        oscTri.frequency.setValueAtTime(startSlideFreq, startTime);
        oscTri.frequency.exponentialRampToValueAtTime(frequency, startTime + 0.08);
        oscSine.frequency.setValueAtTime(startSlideFreq, startTime);
        oscSine.frequency.exponentialRampToValueAtTime(frequency, startTime + 0.08);
    } else {
        oscTri.frequency.setValueAtTime(frequency, startTime);
        oscSine.frequency.setValueAtTime(frequency, startTime);
    }

    // 3. Modulador de Frequência (Vibrato) - LFO sutil a 5.8Hz
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.8, startTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(frequency * 0.007, startTime);

    lfo.connect(lfoGain);
    lfoGain.connect(oscTri.frequency);
    lfoGain.connect(oscSine.frequency);

    // 4. Gerador de Ruído em Cache (Sopro/Chiff característico do sopro humano)
    const noiseBuffer = getOrCreateNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.setValueAtTime(20, startTime);
    noiseFilter.frequency.setValueAtTime(frequency, startTime);

    const noiseGain = ctx.createGain();
    if (isSlurred) {
        // Nota ligada (Slur): sem ataque áspero de golpe de língua, sopro suave contínuo
        noiseGain.gain.setValueAtTime(0.005, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.003, startTime + 0.08);
    } else {
        // Nota articulada normal (Tonguing): chiff característico de ataque
        noiseGain.gain.setValueAtTime(0.025, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.006, startTime + 0.08);
    }

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // 5. Envelopes de Ganho (ADSR do Whistle)
    const mainGain = ctx.createGain();
    if (isSlurred) {
        // Transição suave para notas ligadas
        mainGain.gain.setValueAtTime(0.12, startTime);
        mainGain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        mainGain.gain.setValueAtTime(0.16, Math.max(startTime + 0.05, startTime + duration - 0.03));
        mainGain.gain.linearRampToValueAtTime(0, startTime + duration);
    } else {
        mainGain.gain.setValueAtTime(0, startTime);
        mainGain.gain.linearRampToValueAtTime(0.2, startTime + 0.04);
        mainGain.gain.linearRampToValueAtTime(0.16, startTime + 0.12);
        mainGain.gain.setValueAtTime(0.16, Math.max(startTime + 0.12, startTime + duration - 0.04));
        mainGain.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    oscTri.connect(mainGain);
    oscSine.connect(mainGain);
    noiseGain.connect(mainGain);

    mainGain.connect(ctx.destination);

    oscTri.start(startTime);
    oscSine.start(startTime);
    lfo.start(startTime);
    noiseSource.start(startTime);

    oscTri.stop(startTime + duration);
    oscSine.stop(startTime + duration);
    lfo.stop(startTime + duration);
    noiseSource.stop(startTime + duration);
}

// Som do metrônomo para manter o tempo (com acento diferenciado no tempo forte do compasso)
export function playMetronomeClickOnContext(ctx, startTime, isDownbeat = false) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1400 : 1050, startTime);

    gain.gain.setValueAtTime(isDownbeat ? 0.08 : 0.045, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.06);
}

export function playHitFeedbackOnContext(ctx) {
    if (!ctx) return;
    try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.05); // E6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.065);
    } catch (e) {}
}
