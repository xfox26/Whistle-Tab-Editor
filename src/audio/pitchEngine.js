/* ==========================================================================
   MOTOR DE DETECÇÃO DE PITCH POR NSDF (McLEOD) & CONVERSÃO DE ALTURA/MIDI
   ========================================================================== */

let sharedAudioTimeDomainBuffer = null;
let referenceA4Hz = 440;

export function getReferenceA4() {
    return referenceA4Hz;
}

export function setReferenceA4(hz) {
    const num = Number(hz);
    if (!Number.isFinite(num)) return referenceA4Hz;
    referenceA4Hz = Math.min(466, Math.max(415, num));
    return referenceA4Hz;
}

export function getSharedAudioBuffer(size) {
    if (!sharedAudioTimeDomainBuffer || sharedAudioTimeDomainBuffer.length !== size) {
        sharedAudioTimeDomainBuffer = new Float32Array(size);
    }
    return sharedAudioTimeDomainBuffer;
}

// Algoritmo NSDF (McLeod Pitch Method) otimizado para Tin Whistle (260 Hz a 2250 Hz)
// Normalizado e com seleção de primeiro pico chave para evitar saltos de oitava (D5 <-> D6)
export function detectWhistlePitch(buf, sampleRate, noiseThreshold = 0.035) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / SIZE);

    // Descarta se estiver abaixo do corte dinâmico de ruído (evita disparos de ventilador/ambiente)
    const gateMin = Math.max(0.014, noiseThreshold * 0.75);
    if (rms < gateMin) return { pitch: -1, rms, clarity: 0 };

    // Delimitar estritamente para a extensão real da Tin Whistle (260 Hz a 2250 Hz)
    const minLag = Math.max(2, Math.floor(sampleRate / 2350));
    const maxLag = Math.min(SIZE - 16, Math.ceil(sampleRate / 260));
    const W = Math.min(1024, SIZE - maxLag - 2);
    if (W <= 16 || maxLag <= minLag) {
        return { pitch: -1, rms, clarity: 0 };
    }

    const startLag = Math.max(1, minLag - 1);
    const endLag = Math.min(SIZE - W - 1, maxLag + 1);
    const nsdf = new Float32Array(endLag + 1);

    for (let lag = startLag; lag <= endLag; lag++) {
        let acf = 0;
        let m = 0;
        for (let i = 0; i < W; i++) {
            const a = buf[i];
            const b = buf[i + lag];
            acf += a * b;
            m += (a * a) + (b * b);
        }
        nsdf[lag] = m > 1e-10 ? (2 * acf) / m : 0;
    }

    // Coletar máximos locais positivos (picos chave) ignorando a queda inicial em torno de lag=0
    const peaks = [];
    let globalMax = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
        const val = nsdf[lag];
        if (val > 0 && val > nsdf[lag - 1] && val >= nsdf[lag + 1]) {
            peaks.push({ lag, val });
            if (val > globalMax) globalMax = val;
        }
    }

    // Rejeita sinais ruidosos ou aperiódicos sem clareza tonal suficiente
    if (peaks.length === 0 || globalMax < 0.55) {
        return { pitch: -1, rms, clarity: globalMax };
    }

    // Seleciona o primeiro pico positivo >= 85% do máximo global (identifica a fundamental real)
    const keyThreshold = 0.85 * globalMax;
    const chosen = peaks.find(p => p.val >= keyThreshold) || peaks[0];
    const bestLag = chosen.lag;

    // Interpolação parabólica no pico para precisão sub-amostral
    let trueLag = bestLag;
    if (bestLag > startLag && bestLag < endLag) {
        const cLeft = nsdf[bestLag - 1];
        const cRight = nsdf[bestLag + 1];
        const denom = (2 * chosen.val - cLeft - cRight);
        if (Math.abs(denom) > 0.0001) {
            const delta = (cRight - cLeft) / (2 * denom);
            if (Math.abs(delta) < 1) {
                trueLag += delta;
            }
        }
    }

    const frequency = sampleRate / trueLag;
    if (frequency < 250 || frequency > 2350 || !Number.isFinite(frequency)) {
        return { pitch: -1, rms, clarity: chosen.val };
    }
    return { pitch: frequency, rms, clarity: chosen.val };
}

export function autoCorrelatePitch(buf, sampleRate, noiseThreshold = 0.035) {
    return detectWhistlePitch(buf, sampleRate, noiseThreshold).pitch;
}

export function noteFromPitchVal(frequency, a4Ref = referenceA4Hz) {
    const noteNum = 12 * (Math.log(frequency / a4Ref) / Math.log(2));
    return Math.round(noteNum) + 69;
}

export function frequencyFromNoteNumberVal(note, a4Ref = referenceA4Hz) {
    return a4Ref * Math.pow(2, (note - 69) / 12);
}

export function centsOffFromPitchVal(frequency, note, a4Ref = referenceA4Hz) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumberVal(note, a4Ref)) / Math.log(2));
}
