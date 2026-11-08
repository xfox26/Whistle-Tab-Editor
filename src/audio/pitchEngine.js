/* ==========================================================================
   MOTOR DE DETECÇÃO DE PITCH POR AUTOCORRELAÇÃO & CONVERSÃO DE ALTURA/MIDI
   ========================================================================== */

let sharedAudioTimeDomainBuffer = null;

export function getSharedAudioBuffer(size) {
    if (!sharedAudioTimeDomainBuffer || sharedAudioTimeDomainBuffer.length !== size) {
        sharedAudioTimeDomainBuffer = new Float32Array(size);
    }
    return sharedAudioTimeDomainBuffer;
}

// Algoritmo de Autocorrelação Rápido Otimizado para Tin Whistle (260 Hz a 2200 Hz)
export function detectWhistlePitch(buf, sampleRate, noiseThreshold = 0.035) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
        rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / SIZE);

    // Descarta se estiver abaixo do corte dinâmico de ruído (evita disparos de ventilador/ambiente)
    const gateMin = Math.max(0.014, noiseThreshold * 0.75);
    if (rms < gateMin) return { pitch: -1, rms: rms };

    // Delimitar estritamente para a extensão real da Tin Whistle (260 Hz a 2200 Hz)
    const minLag = Math.max(1, Math.floor(sampleRate / 2200));
    const maxLag = Math.min(SIZE - 2, Math.ceil(sampleRate / 260));

    let bestLag = -1;
    let bestCorrelation = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
        let corr = 0;
        for (let i = 0; i < SIZE - lag; i += 2) { // Passo de 2 para otimização 2x de CPU
            corr += buf[i] * buf[i + lag];
        }
        if (corr > bestCorrelation) {
            bestCorrelation = corr;
            bestLag = lag;
        }
    }

    if (bestLag <= 0 || bestCorrelation < 0.02) {
        return { pitch: -1, rms: rms };
    }

    // Interpolação parabólica no pico para precisão sub-amostral
    let trueLag = bestLag;
    if (bestLag > minLag && bestLag < maxLag) {
        let cLeft = 0, cRight = 0;
        for (let i = 0; i < SIZE - (bestLag - 1); i += 2) cLeft += buf[i] * buf[i + (bestLag - 1)];
        for (let i = 0; i < SIZE - (bestLag + 1); i += 2) cRight += buf[i] * buf[i + (bestLag + 1)];

        const denom = (2 * bestCorrelation - cLeft - cRight);
        if (Math.abs(denom) > 0.0001) {
            const delta = (cRight - cLeft) / (2 * denom);
            if (Math.abs(delta) < 1) {
                trueLag += delta;
            }
        }
    }

    const frequency = sampleRate / trueLag;
    return { pitch: frequency, rms: rms };
}

export function autoCorrelatePitch(buf, sampleRate, noiseThreshold = 0.035) {
    return detectWhistlePitch(buf, sampleRate, noiseThreshold).pitch;
}

export function noteFromPitchVal(frequency) {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
}

export function frequencyFromNoteNumberVal(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

export function centsOffFromPitchVal(frequency, note) {
    return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumberVal(note)) / Math.log(2));
}
