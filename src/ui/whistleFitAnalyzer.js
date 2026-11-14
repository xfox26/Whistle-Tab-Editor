/* ==========================================================================
   ANALISADOR "CABE NA MINHA FLAUTA?" (ITEM 3.7)
   Avalia tessitura, notas fora de extensão, meio-furos e sugere flauta/oitava ideal
   ========================================================================== */

import { WHISTLE_KEYS_DATA, NOTE_TO_SEMITONES } from '../config/whistleData.js';
import { parseABCNotation } from '../parsers/abcCodec.js';

const CHROMATIC_REL_SEMITONES = new Set([1, 3, 6, 8, 13, 15, 18, 20]);
const HALF_HOLE_REL_SEMITONES = new Set([10, 22]);

export function evaluateSoundingMidisForWhistle(soundingMidis, whistleKey = 'D') {
    const keyData = WHISTLE_KEYS_DATA[whistleKey] || WHISTLE_KEYS_DATA['D'];
    const whistleSemitones = keyData.semitones || 0;

    let outOfRangeLow = 0;
    let outOfRangeHigh = 0;
    let chromaticCount = 0;
    let halfHoleCount = 0;

    for (const midi of soundingMidis) {
        let fingeringMidi = midi - whistleSemitones;
        if (fingeringMidi < 74) outOfRangeLow++;
        else if (fingeringMidi > 97) outOfRangeHigh++;

        while (fingeringMidi < 74) fingeringMidi += 12;
        while (fingeringMidi > 97) fingeringMidi -= 12;

        const rel = fingeringMidi - 74;
        if (CHROMATIC_REL_SEMITONES.has(rel)) chromaticCount++;
        else if (HALF_HOLE_REL_SEMITONES.has(rel)) halfHoleCount++;
    }

    const penalty = (outOfRangeLow + outOfRangeHigh) * 10 + chromaticCount * 5 + halfHoleCount;
    return {
        whistleKey,
        outOfRangeLow,
        outOfRangeHigh,
        outOfRangeTotal: outOfRangeLow + outOfRangeHigh,
        chromaticCount,
        halfHoleCount,
        penalty
    };
}

export function findBestWhistleKeyForMidis(soundingMidis, currentKey = 'D') {
    const currentEval = evaluateSoundingMidisForWhistle(soundingMidis, currentKey);
    const candidateKeys = Object.keys(WHISTLE_KEYS_DATA);

    let bestKey = currentKey;
    let bestEval = currentEval;

    for (const candidateKey of candidateKeys) {
        if (candidateKey === currentKey) continue;
        const ev = evaluateSoundingMidisForWhistle(soundingMidis, candidateKey);
        if (ev.penalty < bestEval.penalty) {
            bestEval = ev;
            bestKey = candidateKey;
        }
    }

    // Avaliar se +1 oitava ou -1 oitava na flauta atual melhora a extensão
    let bestOctaveShift = 0;
    let bestShiftPenalty = currentEval.penalty;
    for (const shift of [-1, 1]) {
        const shiftedMidis = soundingMidis.map(m => m + shift * 12);
        const ev = evaluateSoundingMidisForWhistle(shiftedMidis, currentKey);
        if (ev.penalty < bestShiftPenalty) {
            bestShiftPenalty = ev.penalty;
            bestOctaveShift = shift;
        }
    }

    return {
        currentEval,
        bestKey,
        bestEval,
        improvesFit: bestKey !== currentKey && bestEval.penalty < currentEval.penalty,
        bestOctaveShift
    };
}

export function analyzeABCWhistleFit(abcText, options = {}) {
    const parsed = parseABCNotation(abcText, options);
    if (parsed.error) {
        return { error: parsed.error, errorKey: parsed.errorKey };
    }

    const report = parsed.fitReport || {
        whistleKey: parsed.key || 'D',
        totalPlayableNotes: 0,
        outOfRangeLowCount: 0,
        outOfRangeHighCount: 0,
        chromaticCount: 0,
        halfHoleCount: 0,
        soundingMidis: []
    };

    const currentKey = parsed.key || 'D';
    const comparison = findBestWhistleKeyForMidis(report.soundingMidis, currentKey);

    const outOfRangeTotal = report.outOfRangeLowCount + report.outOfRangeHighCount;
    let status = 'perfect';
    if (outOfRangeTotal > 0) status = 'out_of_range';
    else if (report.chromaticCount > 0) status = 'chromatic';
    else if (report.halfHoleCount > 0) status = 'halfholes';

    return {
        status,
        whistleKey: currentKey,
        totalNotes: report.totalPlayableNotes,
        outOfRangeLowCount: report.outOfRangeLowCount,
        outOfRangeHighCount: report.outOfRangeHighCount,
        outOfRangeTotal,
        chromaticCount: report.chromaticCount,
        halfHoleCount: report.halfHoleCount,
        bestKey: comparison.bestKey,
        bestEval: comparison.bestEval,
        improvesFit: comparison.improvesFit,
        bestOctaveShift: comparison.bestOctaveShift
    };
}

export function analyzeSongWhistleFit(song) {
    if (!song || !Array.isArray(song.notes)) {
        return { status: 'empty', totalNotes: 0 };
    }

    const currentKey = song.key || 'D';
    const keyData = WHISTLE_KEYS_DATA[currentKey] || WHISTLE_KEYS_DATA['D'];
    const currentSemitones = keyData.semitones || 0;

    let totalNotes = 0;
    let halfHoleCount = 0;
    let canShiftOctaveUp = true;
    let canShiftOctaveDown = true;
    const soundingMidis = [];
    const halfHoleNotes = new Set();

    for (const item of song.notes) {
        if (!item || !item.note) continue;
        const n = item.note;
        if (['REST', 'LINEBREAK', 'BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END'].includes(n)) {
            continue;
        }
        const rel = NOTE_TO_SEMITONES[n];
        if (rel === undefined) continue;

        totalNotes++;
        if (rel === 10 || rel === 22) {
            halfHoleCount++;
            const noteInfo = keyData.notes && keyData.notes[n];
            halfHoleNotes.add(noteInfo ? noteInfo.display : n);
        }
        if (rel + 12 > 23) canShiftOctaveUp = false;
        if (rel - 12 < 0) canShiftOctaveDown = false;

        soundingMidis.push(74 + currentSemitones + rel);
    }

    if (totalNotes === 0) {
        return { status: 'empty', totalNotes: 0 };
    }

    const comparison = findBestWhistleKeyForMidis(soundingMidis, currentKey);
    const status = halfHoleCount > 0 ? 'halfholes' : 'perfect';

    return {
        status,
        whistleKey: currentKey,
        totalNotes,
        halfHoleCount,
        halfHoleNotes: Array.from(halfHoleNotes),
        canShiftOctaveUp,
        canShiftOctaveDown,
        bestKey: comparison.bestKey,
        bestEval: comparison.bestEval,
        improvesFit: comparison.improvesFit
    };
}
