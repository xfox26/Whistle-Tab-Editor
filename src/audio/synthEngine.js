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
export function scheduleWhistleVoice(ctx, frequency, duration, startTime, ornament = null, noteKey = null, whistleKey = 'D', isSlurred = false, outputNode = null) {
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

    // 3. Modulador de Frequência (Vibrato) - LFO sutil e expressivo estilo celta
    // Notas rápidas de passagem (< 0.28s) mantêm afinação estável sem oscilação prematura
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.8, startTime);

    const lfoGain = ctx.createGain();
    if (duration < 0.28) {
        lfoGain.gain.setValueAtTime(0, startTime);
    } else {
        // Entrada gradual e natural do vibrato após o ataque da nota
        lfoGain.gain.setValueAtTime(0, startTime);
        const vibratoDelay = startTime + Math.min(0.12, duration * 0.25);
        lfoGain.gain.setValueAtTime(0, vibratoDelay);
        lfoGain.gain.linearRampToValueAtTime(frequency * 0.0055, vibratoDelay + 0.12);
    }

    lfo.connect(lfoGain);
    lfoGain.connect(oscTri.frequency);
    lfoGain.connect(oscSine.frequency);

    // 4. Gerador de Ruído em Cache (Sopro/Chiff característico do sopro humano)
    // Usamos Q moderado (3.5) para emular a turbulência de ar aerodinâmica da boquilha
    const noiseBuffer = getOrCreateNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.Q.setValueAtTime(3.5, startTime);
    noiseFilter.frequency.setValueAtTime(frequency, startTime);

    // Fator de amortecimento de sibilância em notas agudas da 2ª oitava
    const chiffDamp = frequency > 1400 ? Math.max(0.45, 1.0 - ((frequency - 1400) / 1600) * 0.55) : 1.0;

    const noiseGain = ctx.createGain();
    if (isSlurred) {
        // Nota ligada (Slur): sem ataque áspero de golpe de língua, sopro suave contínuo
        const startNoise = 0.005 * chiffDamp;
        noiseGain.gain.setValueAtTime(startNoise, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.003 * chiffDamp, startTime + 0.08);
    } else {
        // Nota articulada normal (Tonguing): chiff característico de ataque
        const startNoise = 0.025 * chiffDamp;
        noiseGain.gain.setValueAtTime(startNoise, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.006 * chiffDamp, startTime + 0.08);
    }

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // 5. Filtro Suave Anti-Estridência para harmônicos agudos
    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.Q.setValueAtTime(0.7, startTime); // Resposta Butterworth suave sem ressonância
    toneFilter.frequency.setValueAtTime(Math.max(5000, frequency * 3.2), startTime);

    // 6. Envelopes de Ganho (ADSR do Whistle) calibrados com compensação acústica de Fletcher-Munson
    const octaveComp = frequency > 1200 ? 0.84 : 1.0;
    const mainGain = ctx.createGain();
    if (isSlurred) {
        // Transição suave para notas ligadas
        mainGain.gain.setValueAtTime(0.12 * octaveComp, startTime);
        mainGain.gain.linearRampToValueAtTime(0.18 * octaveComp, startTime + 0.02);
        mainGain.gain.setValueAtTime(0.16 * octaveComp, Math.max(startTime + 0.05, startTime + duration - 0.03));
        mainGain.gain.linearRampToValueAtTime(0, startTime + duration);
    } else {
        mainGain.gain.setValueAtTime(0, startTime);
        mainGain.gain.linearRampToValueAtTime(0.20 * octaveComp, startTime + 0.04);
        mainGain.gain.linearRampToValueAtTime(0.16 * octaveComp, startTime + 0.12);
        mainGain.gain.setValueAtTime(0.16 * octaveComp, Math.max(startTime + 0.12, startTime + duration - 0.04));
        mainGain.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    oscTri.connect(toneFilter);
    oscSine.connect(toneFilter);
    toneFilter.connect(mainGain);
    noiseGain.connect(mainGain);

    const targetDest = outputNode || ctx.destination;
    mainGain.connect(targetDest);

    oscTri.start(startTime);
    oscSine.start(startTime);
    lfo.start(startTime);
    noiseSource.start(startTime);

    oscTri.stop(startTime + duration);
    oscSine.stop(startTime + duration);
    lfo.stop(startTime + duration);
    noiseSource.stop(startTime + duration);
}

export function resolveMetronomeAccentMode(accentSetting, timeSig = '4/4', rhythmStyle = 'reel') {
    if (accentSetting && accentSetting !== 'auto') return accentSetting;
    if (timeSig === '9/8') return 'slipjig';
    if (timeSig === '6/8' || timeSig === '12/8') return 'jig';
    if ((timeSig === '4/4' || timeSig === '2/4') && (rhythmStyle === 'reel' || rhythmStyle === 'polka')) {
        return 'reel';
    }
    return 'standard';
}

export function getMetronomePulseStep(resolvedAccentMode) {
    if (resolvedAccentMode === 'jig' || resolvedAccentMode === 'slipjig') {
        return 0.5; // Subdivisão em colcheias para marcar 1-2-3 4-5-6 / 1-2-3 4-5-6 7-8-9
    }
    return 1;
}

export function getMetronomeBeatAccent(beatIndex, beatsPerBar, resolvedAccentMode) {
    const eps = 1e-4;
    const pos = ((beatIndex % beatsPerBar) + beatsPerBar) % beatsPerBar;
    const isBarStart = pos < eps || Math.abs(pos - beatsPerBar) < eps;

    if (resolvedAccentMode === 'jig' || resolvedAccentMode === 'slipjig') {
        if (isBarStart) return 'strong';
        // Colcheias 4 (1.5), 7 (3.0), 10 (4.5) recebem acento secundário
        const eighthIndex = Math.round(pos * 2);
        if (eighthIndex > 0 && eighthIndex % 3 === 0) return 'secondary';
        return 'normal';
    }

    if (resolvedAccentMode === 'reel') {
        const beatNum = Math.round(pos);
        if (beatsPerBar >= 4) {
            if (beatNum === 1 || beatNum === 3) return 'strong'; // Backbeat nos tempos 2 e 4
            if (beatNum === 0) return 'secondary';
            return 'normal';
        }
        if (beatsPerBar >= 2) {
            if (beatNum === 1) return 'strong'; // Backbeat no tempo 2 (2/4)
            return 'normal';
        }
    }

    return isBarStart ? 'strong' : 'normal';
}

// Som do metrônomo para manter o tempo (suporta 'strong' | 'secondary' | 'normal' ou boolean legado)
export function playMetronomeClickOnContext(ctx, startTime, accent = false) {
    if (!ctx) return;
    let level = 'normal';
    if (accent === true || accent === 'strong') level = 'strong';
    else if (accent === 'secondary') level = 'secondary';

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = level === 'strong' ? 1400 : (level === 'secondary' ? 1180 : 960);
    const amp = level === 'strong' ? 0.09 : (level === 'secondary' ? 0.065 : 0.04);

    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(amp, startTime);
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
