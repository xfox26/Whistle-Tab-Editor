/* ==========================================================================
   MÓDULO DE NOTAÇÃO ABC TRADICIONAL (TheSession.org)
   ========================================================================== */

import { STANDARD_FINGERINGS } from '../config/whistleData.js';

export function parseABCNotation(abcText) {
    if (!abcText || !abcText.trim()) {
        return { error: 'O texto ABC fornecido está vazio.' };
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
                key = val.split(' ')[0]; // ex: "D", "G", "Edor", "Am"
                readingBody = true; // No padrão ABC, a música começa após K:
            }
        } else {
            // Corpo da melodia
            if (trimmed.match(/^[A-Za-z]:/)) {
                const field = trimmed[0].toUpperCase();
                const val = trimmed.substring(2).trim();
                if (field === 'K') key = val.split(' ')[0];
                if (field === 'M') meter = val;
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
    if (unitLength === '1/4') baseUnitBeats = 1.0;
    else if (unitLength === '1/16') baseUnitBeats = 0.25;
    else if (unitLength === '1/2') baseUnitBeats = 2.0;

    // Configuração de armadura de clave para acidentes automáticos
    const keyClean = key.toUpperCase();
    const hasFSharp = !keyClean.startsWith('C') && !keyClean.startsWith('F') && !keyClean.startsWith('DM') && !keyClean.startsWith('AM');
    const hasCSharp = keyClean.startsWith('D') || keyClean.startsWith('A') || keyClean.startsWith('E') || keyClean.startsWith('B');

    // 2. Parser do Corpo Melódico
    const parsedNotes = [];
    let i = 0;
    let pendingChord = '';
    let pendingOrnament = '';

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

        // Barras de Compasso
        if (bodyText.startsWith('|:', i) || bodyText.startsWith('[|:', i)) {
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            i += (bodyText.startsWith('[|:', i) ? 3 : 2);
            continue;
        }
        if (bodyText.startsWith(':|', i) || bodyText.startsWith(':|]', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            i += (bodyText.startsWith(':|]', i) ? 3 : 2);
            continue;
        }
        if (bodyText.startsWith('::', i)) {
            parsedNotes.push({ note: 'REPEAT_END', duration: 0 });
            parsedNotes.push({ note: 'REPEAT_START', duration: 0 });
            i += 2;
            continue;
        }
        if (bodyText.startsWith('||', i) || bodyText.startsWith('[|', i) || bodyText.startsWith('|]', i)) {
            parsedNotes.push({ note: 'DOUBLE_BAR', duration: 0 });
            i += 2;
            continue;
        }
        if (char === '|') {
            parsedNotes.push({ note: 'BAR', duration: 0 });
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

        // Acidentes explícitos antes da nota: ^ (sustenido), _ (bemol), = (bequadro)
        let accidental = null;
        if (char === '^') {
            accidental = 'sharp';
            i++;
        } else if (char === '_') {
            accidental = 'flat';
            i++;
        } else if (char === '=') {
            accidental = 'natural';
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

        // Nota Musical ABC (A-G ou a-g)
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

            let octave = isUpperLetter ? 5 : 6;
            if (octaveModifiers > 0) octave += octaveModifiers;
            if (octaveModifiers < 0) octave += octaveModifiers;

            let isSharp = false;
            if (accidental === 'sharp') isSharp = true;
            else if (accidental !== 'natural') {
                if (letterUpper === 'F' && hasFSharp) isSharp = true;
                if (letterUpper === 'C' && hasCSharp) isSharp = true;
            }

            let whistleNote = '';
            if (letterUpper === 'D') whistleNote = octave <= 5 ? 'D5' : 'D6';
            else if (letterUpper === 'E') whistleNote = octave <= 5 ? 'E5' : 'E6';
            else if (letterUpper === 'F') {
                whistleNote = octave <= 5 ? 'F#5' : 'F#6';
            } else if (letterUpper === 'G') whistleNote = octave <= 5 ? 'G5' : 'G6';
            else if (letterUpper === 'A') whistleNote = octave <= 5 ? 'A5' : 'A6';
            else if (letterUpper === 'B') whistleNote = octave <= 5 ? 'B5' : 'B6';
            else if (letterUpper === 'C') {
                if (isSharp) whistleNote = octave <= 5 ? 'C#6' : 'C#7';
                else whistleNote = octave <= 5 ? 'C5' : 'C6';
            }

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
        return { error: 'Nenhuma nota musical válida foi encontrada no código ABC.' };
    }

    let whistleKey = 'D';
    if (['C', 'G', 'A', 'BB', 'F', 'EB'].includes(keyClean)) {
        whistleKey = keyClean === 'BB' ? 'Bb' : keyClean === 'EB' ? 'Eb' : keyClean;
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

export function exportSongToABC(song) {
    if (!song) return '';

    const title = song.title || 'Melodia Sem Título';
    const artist = song.artist || 'Tradicional';
    const timeSig = song.timeSignature || '4/4';
    const tempo = song.tempo || 110;
    const key = song.key || 'D';

    let abc = `X: 1\n`;
    abc += `T: ${title}\n`;
    abc += `C: ${artist}\n`;
    abc += `M: ${timeSig}\n`;
    abc += `L: 1/8\n`;
    abc += `Q: 1/4=${tempo}\n`;
    abc += `K: ${key}\n`;

    let line = '';
    let measuresInLine = 0;

    (song.notes || []).forEach((n) => {
        if (n.note === 'LINEBREAK') {
            abc += line.trim() + '\n';
            line = '';
            measuresInLine = 0;
            return;
        }

        if (n.note === 'BAR') {
            line += ' | ';
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
            measuresInLine++;
            return;
        }
        if (n.note === 'REPEAT_START') {
            line += ' |: ';
            return;
        }
        if (n.note === 'REPEAT_END') {
            line += ' :| ';
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
        } else {
            const abcNoteMap = {
                'D5': 'D', 'E5': 'E', 'F#5': 'F', 'G5': 'G', 'A5': 'A', 'B5': 'B', 'C5': '=c', 'C#6': 'c',
                'D6': 'd', 'E6': 'e', 'F#6': 'f', 'G6': 'g', 'A6': 'a', 'B6': 'b', 'C6': '=c\'', 'C#7': 'c\''
            };
            line += (abcNoteMap[n.note] || 'd');
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
