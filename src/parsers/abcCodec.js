/* ==========================================================================
   MÓDULO DE NOTAÇÃO ABC TRADICIONAL (TheSession.org)
   ========================================================================== */

import {
    STANDARD_FINGERINGS,
    WHISTLE_KEYS_DATA,
    NOTE_TO_SEMITONES,
    SEMITONES_TO_NOTE
} from '../config/whistleData.js';

const BASE_LETTER_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const MAJOR_FIFTHS = {
    C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
    F: -1, BB: -2, EB: -3, AB: -4, DB: -5, GB: -6, CB: -7
};

function resolveABCKeyInfo(keyStr = 'D') {
    const clean = (keyStr || 'D').trim();
    const upper = clean.toUpperCase();

    if (upper === 'HP') {
        return {
            whistleKey: 'D',
            fifths: 2,
            accidentals: { F: 1, C: 1 }
        };
    }

    const match = upper.match(/^([A-G])([#B]?)(.*)$/);
    if (!match) {
        return {
            whistleKey: 'D',
            fifths: 2,
            accidentals: { F: 1, C: 1 }
        };
    }

    const tonic = match[1] + match[2];
    const modeRaw = (match[3] || '').trim();
    let fifths = MAJOR_FIFTHS[tonic] !== undefined ? MAJOR_FIFTHS[tonic] : 2;
    let isMajorMode = false;

    if (!modeRaw || modeRaw.startsWith('MAJ') || modeRaw.startsWith('ION')) {
        isMajorMode = true;
    } else if (modeRaw.startsWith('MIX')) {
        fifths -= 1;
    } else if (modeRaw.startsWith('DOR')) {
        fifths -= 2;
    } else if (modeRaw.startsWith('PHR')) {
        fifths -= 4;
    } else if (modeRaw.startsWith('LYD')) {
        fifths += 1;
    } else if (modeRaw.startsWith('LOC')) {
        fifths -= 5;
    } else if (modeRaw.startsWith('MIN') || modeRaw.startsWith('AEO') || modeRaw === 'M') {
        fifths -= 3;
    } else {
        isMajorMode = true;
    }

    fifths = Math.max(-7, Math.min(7, fifths));
    const accidentals = {};
    if (fifths > 0) {
        for (let k = 0; k < fifths; k++) accidentals[SHARP_ORDER[k]] = 1;
    } else if (fifths < 0) {
        for (let k = 0; k < -fifths; k++) accidentals[FLAT_ORDER[k]] = -1;
    }

    const whistleKeyMap = { C: 'C', G: 'G', A: 'A', BB: 'Bb', F: 'F', EB: 'Eb', D: 'D' };
    const whistleKey = (isMajorMode && whistleKeyMap[tonic]) ? whistleKeyMap[tonic] : 'D';

    return { whistleKey, fifths, accidentals };
}

export function parseABCNotation(abcText) {
    if (!abcText || !abcText.trim()) {
        return { error: 'O texto ABC fornecido está vazio.', errorKey: 'abc.emptyError' };
    }

    const lines = abcText.split(/\r?\n/);
    let title = 'Melodia Celta (ABC)';
    let artist = 'Tradicional';
    let meter = '4/4';
    let unitLength = '1/8'; // Default clássico no ABC
    let tempo = 110;
    let key = 'D'; // Tonalidade ABC
    let bodyText = '';
    let readingBody = false;

    // 1. Extração dos Cabeçalhos ABC
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Linhas de comentário ou instruções especiais
        if (trimmed.startsWith('%')) continue;

        // Se começa com campo de cabeçalho tipo "T:", "M:", "K:", etc.
        const headerMatch = trimmed.match(/^([A-Za-z]):\s*(.*)$/);
        if (headerMatch && !readingBody) {
            const field = headerMatch[1].toUpperCase();
            const val = headerMatch[2].trim();
            if (field === 'T') {
                if (title === 'Melodia Celta (ABC)') title = val;
            } else if (field === 'C') {
                artist = val;
            } else if (field === 'M') {
                meter = val;
                if (meter === 'C') meter = '4/4';
                if (meter === 'C|') meter = '2/2';
            } else if (field === 'L') {
                unitLength = val;
            } else if (field === 'Q') {
                const bpmMatch = val.match(/=\s*([0-9]+)/) || val.match(/([0-9]+)/);
                if (bpmMatch) tempo = parseInt(bpmMatch[1], 10);
            } else if (field === 'K') {
                key = val.split(/\s+/)[0] || 'D'; // ex: "D", "G", "Edor", "Am"
                readingBody = true; // No padrão ABC, a música começa após K:
            }
        } else {
            // Corpo da melodia
            if (trimmed.match(/^[A-Za-z]:/)) {
                const field = trimmed[0].toUpperCase();
                const val = trimmed.substring(2).trim();
                if (field === 'K') key = val.split(/\s+/)[0] || key;
                if (field === 'M') meter = val;
                if (field === 'L') unitLength = val;
                if (field === 'Q') {
                    const bpmMatch = val.match(/=\s*([0-9]+)/) || val.match(/([0-9]+)/);
                    if (bpmMatch) tempo = parseInt(bpmMatch[1], 10);
                }
            } else {
                bodyText += ' ' + trimmed;
                readingBody = true;
            }
        }
    }

    // Calcular o fator da duração base (L:) em relação a 1 tempo (semínima = 1.0)
    let baseUnitBeats = 0.5; // Se L: 1/8, cada nota base tem 0.5 tempo
    const unitMatch = unitLength.match(/^([0-9]+)\/([0-9]+)$/);
    if (unitMatch) {
        const uNum = parseFloat(unitMatch[1]) || 1;
        const uDen = parseFloat(unitMatch[2]) || 8;
        baseUnitBeats = 4 * (uNum / uDen);
    }

    // Configuração real da armadura de clave e flauta correspondente
    const keyInfo = resolveABCKeyInfo(key);
    const whistleKey = keyInfo.whistleKey;
    const keyAccidentals = keyInfo.accidentals;
    const whistleSemitones = (WHISTLE_KEYS_DATA[whistleKey] && WHISTLE_KEYS_DATA[whistleKey].semitones) || 0;

    // 2. Parser do Corpo Melódico
    const parsedNotes = [];
    let i = 0;
    let pendingChord = '';
    let pendingOrnament = '';
    let measureAccidentals = {};

    while (i < bodyText.length) {
        const char = bodyText[i];

        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Cifra entre aspas: "D", "G", "Em", "A7"
        if (char === '"') {
            const endIdx = bodyText.indexOf('"', i + 1);
            if (endIdx !== -1) {
                pendingChord = bodyText.substring(i + 1, endIdx).trim();
                i = endIdx + 1;
                continue;
            }
        }

        // Barras de Compasso (reiniciam acidentes temporários do compasso)
        if (bodyText.startsWith('|:', i) || bodyText.startsWith('[|:', i)) {
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            measureAccidentals = {};
            i += (bodyText.startsWith('[|:', i) ? 3 : 2);
            continue;
        }
        if (bodyText.startsWith(':|', i) || bodyText.startsWith(':|]', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            measureAccidentals = {};
            i += (bodyText.startsWith(':|]', i) ? 3 : 2);
            continue;
        }
        if (bodyText.startsWith('::', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            measureAccidentals = {};
            i += 2;
            continue;
        }
        if (bodyText.startsWith('||', i) || bodyText.startsWith('[|', i) || bodyText.startsWith('|]', i)) {
            parsedNotes.push({ note: 'DOUBLE_BAR', duration: 0 });
            measureAccidentals = {};
            i += 2;
            continue;
        }
        if (char === '|') {
            parsedNotes.push({ note: 'BAR', duration: 0 });
            measureAccidentals = {};
            i++;
            continue;
        }

        // Ornamentos ABC
        if (char === '~') {
            pendingOrnament = 'roll';
            i++;
            continue;
        }
        if (char === '{') {
            const endBrace = bodyText.indexOf('}', i + 1);
            if (endBrace !== -1) {
                pendingOrnament = 'cut';
                i = endBrace + 1;
                continue;
            }
        }
        if (char === 'v' && i + 1 < bodyText.length && /[A-Ga-gzZ]/.test(bodyText[i + 1])) {
            pendingOrnament = 'strike';
            i++;
            continue;
        }

        // Acidentes explícitos antes da nota: ^ / ^^ (sustenido), _ / __ (bemol), = (bequadro)
        let explicitAccidentalOffset = null;
        if (bodyText.startsWith('^^', i)) {
            explicitAccidentalOffset = 2;
            i += 2;
        } else if (char === '^') {
            explicitAccidentalOffset = 1;
            i++;
        } else if (bodyText.startsWith('__', i)) {
            explicitAccidentalOffset = -2;
            i += 2;
        } else if (char === '_') {
            explicitAccidentalOffset = -1;
            i++;
        } else if (char === '=') {
            explicitAccidentalOffset = 0;
            i++;
        }

        if (i >= bodyText.length) break;
        const noteLetter = bodyText[i];

        // Pausa no ABC: 'z' ou 'x'
        if (noteLetter === 'z' || noteLetter === 'Z' || noteLetter === 'x' || noteLetter === 'X') {
            i++;
            let durMult = 1.0;
            const durMatch = bodyText.substring(i).match(/^([0-9]*\/[0-9]+|[0-9]+|\/)/);
            if (durMatch) {
                const durStr = durMatch[1];
                if (durStr === '/') durMult = 0.5;
                else if (durStr.includes('/')) {
                    const parts = durStr.split('/');
                    const num = parts[0] ? parseFloat(parts[0]) : 1;
                    const den = parseFloat(parts[1]) || 2;
                    durMult = num / den;
                } else {
                    durMult = parseFloat(durStr) || 1;
                }
                i += durMatch[0].length;
            }
            parsedNotes.push({
                note: 'REST',
                duration: baseUnitBeats * durMult,
                chord: pendingChord,
                ornament: ''
            });
            pendingChord = '';
            continue;
        }

        // Nota Musical ABC (A-G ou a-g) -> MIDI escrito padrão ABC -> transposto para dedilhado na flauta
        if (/[a-gA-G]/.test(noteLetter)) {
            i++;
            let octaveModifiers = 0;
            while (i < bodyText.length && (bodyText[i] === "'" || bodyText[i] === ",")) {
                if (bodyText[i] === "'") octaveModifiers++;
                if (bodyText[i] === ",") octaveModifiers--;
                i++;
            }

            let durMult = 1.0;
            const durMatch = bodyText.substring(i).match(/^([0-9]*\/[0-9]+|[0-9]+|\/)/);
            if (durMatch) {
                const durStr = durMatch[1];
                if (durStr === '/') durMult = 0.5;
                else if (durStr.includes('/')) {
                    const parts = durStr.split('/');
                    const num = parts[0] ? parseFloat(parts[0]) : 1;
                    const den = parseFloat(parts[1]) || 2;
                    durMult = num / den;
                } else {
                    durMult = parseFloat(durStr) || 1;
                }
                i += durMatch[0].length;
            }

            const isUpperLetter = (noteLetter === noteLetter.toUpperCase());
            const letterUpper = noteLetter.toUpperCase();

            let accOffset;
            if (explicitAccidentalOffset !== null) {
                accOffset = explicitAccidentalOffset;
                measureAccidentals[letterUpper] = accOffset;
            } else if (measureAccidentals[letterUpper] !== undefined) {
                accOffset = measureAccidentals[letterUpper];
            } else {
                accOffset = keyAccidentals[letterUpper] || 0;
            }

            // ABC padrão: C = 60, c = 72; tin whistle soa 1 oitava acima (+12)
            const writtenMidi = (isUpperLetter ? 60 : 72) + BASE_LETTER_SEMITONE[letterUpper] + (octaveModifiers * 12) + accOffset;
            const soundingMidi = writtenMidi + 12;
            let fingeringMidi = soundingMidi - whistleSemitones;

            while (fingeringMidi < 74) fingeringMidi += 12;
            while (fingeringMidi > 97) fingeringMidi -= 12;

            const relSemitone = fingeringMidi - 74;
            const whistleNote = SEMITONES_TO_NOTE[relSemitone] || 'D5';

            if (whistleNote && STANDARD_FINGERINGS[whistleNote]) {
                parsedNotes.push({
                    note: whistleNote,
                    duration: baseUnitBeats * durMult,
                    chord: pendingChord,
                    ornament: pendingOrnament,
                    lyric: ''
                });
                pendingChord = '';
                pendingOrnament = '';
            }
            continue;
        }

        i++;
    }

    if (parsedNotes.length === 0) {
        return { error: 'Nenhuma nota musical válida foi encontrada no código ABC.', errorKey: 'abc.noNotesError' };
    }

    return {
        title,
        artist,
        key: whistleKey,
        timeSignature: meter,
        tempo,
        notes: parsedNotes
    };
}

const SHARP_SPELLING = [
    ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
    ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]
];
const FLAT_SPELLING = [
    ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
    ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]
];

function midiToABCToken(writtenMidi, keySig, measureAccidentals, preferFlats) {
    const pitchClass = ((writtenMidi % 12) + 12) % 12;
    const octave = Math.floor(writtenMidi / 12) - 1; // 60 -> octave 4 ('C')
    const [letter, targetAcc] = (preferFlats ? FLAT_SPELLING : SHARP_SPELLING)[pitchClass];

    const currentActiveAcc = (measureAccidentals[letter] !== undefined)
        ? measureAccidentals[letter]
        : (keySig[letter] || 0);

    let accPrefix = '';
    if (targetAcc !== currentActiveAcc) {
        if (targetAcc === 0) accPrefix = '=';
        else if (targetAcc === 1) accPrefix = '^';
        else if (targetAcc === -1) accPrefix = '_';
        measureAccidentals[letter] = targetAcc;
    }

    let noteBody = letter;
    if (octave <= 4) {
        noteBody = letter.toUpperCase() + ','.repeat(Math.max(0, 4 - octave));
    } else if (octave === 5) {
        noteBody = letter.toLowerCase();
    } else {
        noteBody = letter.toLowerCase() + "'".repeat(octave - 5);
    }

    return accPrefix + noteBody;
}

export function exportSongToABC(song) {
    if (!song) return '';

    const title = song.title || 'Melodia Sem Título';
    const artist = song.artist || 'Tradicional';
    const timeSig = song.timeSignature || '4/4';
    const tempo = song.tempo || 110;
    const key = song.key || 'D';

    const keyInfo = resolveABCKeyInfo(key);
    const whistleSemitones = (WHISTLE_KEYS_DATA[key] && WHISTLE_KEYS_DATA[key].semitones) || 0;
    const preferFlats = keyInfo.fifths < 0 || key === 'C';

    let abc = `X: 1\n`;
    abc += `T: ${title}\n`;
    abc += `C: ${artist}\n`;
    abc += `M: ${timeSig}\n`;
    abc += `L: 1/8\n`;
    abc += `Q: 1/4=${tempo}\n`;
    abc += `K: ${key}\n`;

    let line = '';
    let measuresInLine = 0;
    let measureAccidentals = {};

    (song.notes || []).forEach((n) => {
        if (n.note === 'LINEBREAK') {
            abc += line.trim() + '\n';
            line = '';
            measuresInLine = 0;
            return;
        }

        if (n.note === 'BAR') {
            line += ' | ';
            measureAccidentals = {};
            measuresInLine++;
            if (measuresInLine >= 4) {
                abc += line.trim() + '\n';
                line = '';
                measuresInLine = 0;
            }
            return;
        }
        if (n.note === 'DOUBLE_BAR') {
            line += ' || ';
            measureAccidentals = {};
            measuresInLine++;
            return;
        }
        if (n.note === 'REPEAT_START') {
            line += ' |: ';
            measureAccidentals = {};
            return;
        }
        if (n.note === 'REPEAT_END') {
            line += ' :| ';
            measureAccidentals = {};
            measuresInLine++;
            if (measuresInLine >= 4) {
                abc += line.trim() + '\n';
                line = '';
                measuresInLine = 0;
            }
            return;
        }

        if (n.chord) {
            line += `"${n.chord}"`;
        }

        if (n.ornament === 'roll') line += '~';
        else if (n.ornament === 'cut') line += '{g}';
        else if (n.ornament === 'strike') line += 'v';

        if (n.note === 'REST') {
            line += 'z';
        } else if (NOTE_TO_SEMITONES[n.note] !== undefined) {
            const writtenMidi = 62 + NOTE_TO_SEMITONES[n.note] + whistleSemitones;
            line += midiToABCToken(writtenMidi, keyInfo.accidentals, measureAccidentals, preferFlats);
        } else {
            line += 'd';
        }

        const dur = n.duration !== undefined ? n.duration : 1.0;
        const mult = Math.round(dur / 0.5);
        if (mult === 2) line += '2';
        else if (mult === 3) line += '3';
        else if (mult === 4) line += '4';
        else if (mult === 6) line += '6';
        else if (mult === 8) line += '8';
        else if (dur === 0.25) line += '/';
        else if (mult !== 1 && mult > 0) line += String(mult);
    });

    if (line.trim()) {
        abc += line.trim();
        if (!line.trim().endsWith('|') && !line.trim().endsWith(':|')) {
            abc += ' |';
        }
        abc += '\n';
    }

    return abc;
}
