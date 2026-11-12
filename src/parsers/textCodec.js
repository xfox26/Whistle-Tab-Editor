/* ==========================================================================
   PARSER E SERIALIZADOR DE NOTAÇÃO RÁPIDA POR TEXTO
   ========================================================================== */

import { STANDARD_FINGERINGS, getWhistleKeyData, getNoteNotationText } from '../config/whistleData.js';

export function parseStringOfNotes(text, whistleKey = 'D') {
    const parsedNotes = [];
    let i = 0;

    const keyData = getWhistleKeyData(whistleKey || 'D');

    const tokens = [];
    if (keyData && keyData.notes) {
        Object.keys(keyData.notes).forEach(noteId => {
            if (noteId === 'REST' || noteId === 'LINEBREAK') return;
            const token = keyData.notes[noteId].text;
            if (token) {
                tokens.push({ token, noteId, octave2: keyData.notes[noteId].octave2 });
            }
        });
        tokens.sort((a, b) => b.token.length - a.token.length);
    }

    const oct1ToOct2 = {
        'D5': 'D6', 'E5': 'E6', 'F#5': 'F#6', 'G5': 'G6',
        'A5': 'A6', 'B5': 'B6', 'C#6': 'C#7', 'C5': 'C6'
    };

    let pendingChord = '';
    let pendingOrnament = '';

    while (i < text.length) {
        const char = text[i];

        // 1. Espaços e Quebras de Linha
        if (/\s/.test(char)) {
            let hasNewline = (char === '\n' || char === '\r');
            while (i + 1 < text.length && /\s/.test(text[i + 1])) {
                i++;
                if (text[i] === '\n' || text[i] === '\r') {
                    hasNewline = true;
                }
            }
            if (hasNewline) {
                parsedNotes.push({ note: 'LINEBREAK', duration: 0 });
            } else {
                parsedNotes.push({ note: 'REST', duration: 1.0, chord: pendingChord, ornament: '' });
                pendingChord = '';
            }
            i++;
            continue;
        }

        // 2. Cifras / Acordes entre aspas: "D", "Em", "G"
        if (char === '"') {
            const closeIdx = text.indexOf('"', i + 1);
            if (closeIdx !== -1) {
                pendingChord = text.substring(i + 1, closeIdx).trim();
                i = closeIdx + 1;
                continue;
            }
        }

        // 3. Barras de Compasso: |:, :|, ||, |
        if (text.startsWith('|:', i)) {
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            i += 2;
            continue;
        }
        if (text.startsWith(':|', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            i += 2;
            continue;
        }
        if (text.startsWith('||', i)) {
            parsedNotes.push({ note: 'DOUBLE_BAR', duration: 0 });
            i += 2;
            continue;
        }
        if (char === '|') {
            parsedNotes.push({ note: 'BAR', duration: 0 });
            i++;
            continue;
        }

        // 4. Ornamentos como prefixo: ~ (roll), ^ (cut), v (strike), * (cran), / (slide)
        if (char === '~') {
            pendingOrnament = 'roll';
            i++;
            continue;
        }
        if (char === '^') {
            pendingOrnament = 'cut';
            i++;
            continue;
        }
        if (char === 'v' && i + 1 < text.length && /[a-gA-G]/.test(text[i + 1])) {
            pendingOrnament = 'strike';
            i++;
            continue;
        }
        if (char === '*') {
            pendingOrnament = 'cran';
            i++;
            continue;
        }
        if (char === '/') {
            pendingOrnament = 'slide';
            i++;
            continue;
        }

        // 5. Palavras reservadas para Pausa
        const remaining = text.substring(i);
        const restMatch = remaining.match(/^(REST|PAUSA|SILENCIO|SILÊNCIO)/i);
        if (restMatch) {
            parsedNotes.push({ note: 'REST', duration: 1.0, chord: pendingChord, ornament: '' });
            pendingChord = '';
            i += restMatch[0].length;
            continue;
        }

        // 6. Tentar casar com os tokens específicos da afinação
        let matched = false;
        for (const t of tokens) {
            if (text.startsWith(t.token, i)) {
                let noteKey = t.noteId;
                i += t.token.length;

                if (i < text.length && text[i] === '+') {
                    if (oct1ToOct2[noteKey]) {
                        noteKey = oct1ToOct2[noteKey];
                    }
                    i++;
                }

                // Duração pós-fixa (ex: d2, d0.5, d4)
                let noteDuration = 1.0;
                const durMatch = text.substring(i).match(/^([0-9]+(\.[0-9]+)?)/);
                if (durMatch) {
                    noteDuration = parseFloat(durMatch[1]) || 1.0;
                    i += durMatch[0].length;
                }

                parsedNotes.push({
                    note: noteKey,
                    duration: noteDuration,
                    chord: pendingChord,
                    ornament: pendingOrnament,
                    lyric: ''
                });
                pendingChord = '';
                pendingOrnament = '';
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // 7. Fallback: Notação tradicional em Ré (A a G)
        if (/[a-gA-G]/.test(char)) {
            const noteLetter = char;
            let isSharp = false;
            let isSecondOctave = (char === char.toUpperCase());

            i++;
            if (i < text.length && text[i] === '#') {
                isSharp = true;
                i++;
            }
            if (i < text.length && text[i] === '+') {
                isSecondOctave = true;
                i++;
            }

            // Duração pós-fixa
            let noteDuration = 1.0;
            const durMatch = text.substring(i).match(/^([0-9]+(\.[0-9]+)?)/);
            if (durMatch) {
                noteDuration = parseFloat(durMatch[1]) || 1.0;
                i += durMatch[0].length;
            }

            const letterUpper = noteLetter.toUpperCase();
            let noteKey = '';

            if (isSecondOctave) {
                if (letterUpper === 'D') noteKey = 'D6';
                else if (letterUpper === 'E') noteKey = 'E6';
                else if (letterUpper === 'F') noteKey = 'F#6';
                else if (letterUpper === 'G') noteKey = 'G6';
                else if (letterUpper === 'A') noteKey = 'A6';
                else if (letterUpper === 'B') noteKey = 'B6';
                else if (letterUpper === 'C') noteKey = isSharp ? 'C#7' : 'C6';
                if (letterUpper === 'F' && isSharp) noteKey = 'F#6';
            } else {
                if (letterUpper === 'D') noteKey = 'D5';
                else if (letterUpper === 'E') noteKey = 'E5';
                else if (letterUpper === 'F') noteKey = 'F#5';
                else if (letterUpper === 'G') noteKey = 'G5';
                else if (letterUpper === 'A') noteKey = 'A5';
                else if (letterUpper === 'B') noteKey = 'B5';
                else if (letterUpper === 'C') noteKey = isSharp ? 'C#6' : 'C5';
                if (letterUpper === 'F' && isSharp) noteKey = 'F#5';
            }

            if (noteKey && STANDARD_FINGERINGS[noteKey]) {
                parsedNotes.push({
                    note: noteKey,
                    duration: noteDuration,
                    chord: pendingChord,
                    ornament: pendingOrnament,
                    lyric: ''
                });
                pendingChord = '';
                pendingOrnament = '';
            } else {
                const invalidToken = `${char}${isSharp ? '#' : ''}${isSecondOctave ? '+' : ''}`;
                return {
                    error: `Combinação de nota inválida: "${invalidToken}"`,
                    errorKey: 'editor.invalidNoteError',
                    errorParams: { note: invalidToken }
                };
            }
        } else {
            return {
                error: `Caractere não reconhecido: "${char}"`,
                errorKey: 'editor.unrecognizedCharError',
                errorParams: { char }
            };
        }
    }

    return { notes: parsedNotes };
}

export function noteObjToNotation(noteObj, whistleKey = 'D') {
    if (!noteObj) return '';
    if (noteObj.note === 'LINEBREAK') return '\n';
    if (noteObj.note === 'BAR') return ' | ';
    if (noteObj.note === 'DOUBLE_BAR') return ' || ';
    if (noteObj.note === 'REPEAT_START') return ' |: ';
    if (noteObj.note === 'REPEAT_END') return ' :| ';
    if (noteObj.note === 'REST') return ' ';

    let str = '';
    if (noteObj.chord) str += `"${noteObj.chord}"`;
    if (noteObj.ornament === 'roll') str += '~';
    else if (noteObj.ornament === 'cut') str += '^';
    else if (noteObj.ornament === 'strike') str += 'v';
    else if (noteObj.ornament === 'cran') str += '*';
    else if (noteObj.ornament === 'slide') str += '/';

    const key = whistleKey || 'D';
    let baseNotation = getNoteNotationText(noteObj.note, key);
    if (!baseNotation) {
        const fallbackMap = {
            'D5': 'd', 'E5': 'e', 'F#5': 'f#', 'G5': 'g', 'A5': 'a', 'B5': 'b', 'C5': 'c', 'C#6': 'c#',
            'D6': 'D', 'E6': 'E', 'F#6': 'F#', 'G6': 'G', 'A6': 'A', 'B6': 'B', 'C6': 'C', 'C#7': 'C#'
        };
        baseNotation = fallbackMap[noteObj.note] || '';
    }
    str += baseNotation;
    if (noteObj.duration && noteObj.duration !== 1.0) {
        str += String(noteObj.duration);
    }
    return str;
}

export function noteKeyToNotation(noteKey, whistleKey = 'D') {
    return noteObjToNotation({ note: noteKey, duration: 1.0 }, whistleKey);
}
