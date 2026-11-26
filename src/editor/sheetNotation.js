/* ==========================================================================
   MOTOR DE NOTAÇÃO MUSICAL EM PARTITURA (CLAVE DE SOL, PAUTA, NOTAS & PAUSAS)
   ========================================================================== */

import {
    WHISTLE_KEYS_DATA,
    NOTE_TO_SEMITONES,
    getWhistleKeyData
} from '../config/whistleData.js';

export const STAFF_GEOMETRY = {
    VIEWBOX_HEIGHT: 110,
    LINE_SPACING: 8,
    HALF_STEP: 4,
    TOP_LINE_Y: 44,      // F5 (step 8)
    MIDDLE_LINE_Y: 60,   // B4 (step 4)
    BOTTOM_LINE_Y: 76,   // E4 (step 0)
    STAFF_LINES_Y: [44, 52, 60, 68, 76],
    NOTE_CARD_WIDTH: 42,
    BAR_CARD_WIDTH: 22,
    CLEF_WIDTH_WITH_SIG: 58,
    CLEF_WIDTH_ONLY: 36
};

const LETTER_TO_DIATONIC = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const LETTER_TO_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Converte uma nota interna do Tin Whistle (em coordenadas de flauta em D)
 * para sua posição escrita na Clave de Sol considerando a afinação atual.
 *
 * Convenção padrão de Tin Whistle (compatível com abcCodec.js):
 * - A flauta soa 1 oitava acima do escrito.
 * - D5 (nota mais grave da flauta em D) = D4 escrita (MIDI 62, step = -1).
 * - Todos os acidentes (#/b) são retornados explicitamente para exibição direta na nota.
 */
export function getNoteStaffInfo(noteId, whistleKey = 'D') {
    if (!noteId || noteId === 'REST') {
        return {
            isRest: true,
            letter: '',
            accidental: '',
            octave: 4,
            step: 4,
            y: STAFF_GEOMETRY.MIDDLE_LINE_Y,
            ledgerLines: [],
            stemDir: 'up'
        };
    }

    const keyData = getWhistleKeyData(whistleKey);
    const whistleSemitones = typeof keyData.semitones === 'number' ? keyData.semitones : 0;
    const relSemitones = NOTE_TO_SEMITONES[noteId];

    // MIDI escrito (60 = C4, 62 = D4)
    const writtenMidi = 62 + (relSemitones !== undefined ? relSemitones : 0) + whistleSemitones;

    // Extrai grafia enarmônica (letra + acidente) diretamente de WHISTLE_KEYS_DATA
    const noteMeta = (keyData.notes && keyData.notes[noteId]) || null;
    let letter = 'D';
    let accidental = '';

    if (noteMeta && noteMeta.display && noteMeta.display !== 'Pausa') {
        const clean = noteMeta.display.trim();
        const match = clean.match(/^([A-Ga-g])([#b♯♭]?)/);
        if (match) {
            letter = match[1].toUpperCase();
            if (match[2] === '#' || match[2] === '♯') accidental = '#';
            else if (match[2] === 'b' || match[2] === '♭') accidental = 'b';
        }
    } else {
        const pc = ((writtenMidi % 12) + 12) % 12;
        const fallback = [
            ['C', ''], ['C', '#'], ['D', ''], ['D', '#'], ['E', ''], ['F', ''],
            ['F', '#'], ['G', ''], ['G', '#'], ['A', ''], ['B', 'b'], ['B', '']
        ][pc];
        letter = fallback[0];
        accidental = fallback[1];
    }

    // Calcula a oitava escrita exata usando a classe de altura da letra + acidente
    const accOffset = accidental === '#' ? 1 : (accidental === 'b' ? -1 : 0);
    const naturalMidi = writtenMidi - accOffset;
    const letterPc = LETTER_TO_PC[letter] ?? 0;
    // Ajusta caso haja cruzamento de oitava por acidente (ex: Cb / B#)
    const octave = Math.round((naturalMidi - letterPc) / 12) - 1;

    // step = 0 em E4 (diatonicIndex = 4*7 + 2 = 30)
    const diatonicIndex = octave * 7 + (LETTER_TO_DIATONIC[letter] ?? 0);
    const step = diatonicIndex - 30;
    const y = STAFF_GEOMETRY.BOTTOM_LINE_Y - (step * STAFF_GEOMETRY.HALF_STEP);

    const ledgerLines = [];
    if (step <= -2) {
        for (let s = -2; s >= step; s -= 2) {
            ledgerLines.push(STAFF_GEOMETRY.BOTTOM_LINE_Y - (s * STAFF_GEOMETRY.HALF_STEP));
        }
    } else if (step >= 10) {
        for (let s = 10; s <= step; s += 2) {
            ledgerLines.push(STAFF_GEOMETRY.BOTTOM_LINE_Y - (s * STAFF_GEOMETRY.HALF_STEP));
        }
    }

    const stemDir = step >= 4 ? 'down' : 'up';

    return {
        isRest: false,
        letter,
        accidental,
        octave,
        step,
        y,
        ledgerLines,
        stemDir
    };
}

/**
 * Desenha as 5 linhas horizontais do pentagrama de x1 até x2.
 */
export function renderStaffLinesSVG(x1, x2, strokeColor = 'currentColor', strokeWidth = 1.05, opacity = 0.55) {
    return STAFF_GEOMETRY.STAFF_LINES_Y.map(y =>
        `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="staff-line" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="${opacity}" />`
    ).join('');
}

/**
 * Desenha o símbolo vetorial de acidente (# ou b) centrado em (x, y).
 */
export function renderAccidentalSVG(accidental, x, y, color = 'currentColor', scale = 1) {
    if (!accidental) return '';
    if (accidental === '#') {
        return `<g class="staff-accidental" transform="translate(${x}, ${y}) scale(${scale})">
            <line x1="-2.3" y1="-6.8" x2="-2.3" y2="6.8" stroke="${color}" stroke-width="1.2" stroke-linecap="round" />
            <line x1="2.1" y1="-7.6" x2="2.1" y2="6.0" stroke="${color}" stroke-width="1.2" stroke-linecap="round" />
            <line x1="-4.4" y1="-1.6" x2="4.4" y2="-3.6" stroke="${color}" stroke-width="2.0" stroke-linecap="round" />
            <line x1="-4.4" y1="3.4" x2="4.4" y2="1.4" stroke="${color}" stroke-width="2.0" stroke-linecap="round" />
        </g>`;
    }
    if (accidental === 'b') {
        return `<g class="staff-accidental" transform="translate(${x}, ${y}) scale(${scale})">
            <line x1="-2.2" y1="-10.5" x2="-2.2" y2="4.2" stroke="${color}" stroke-width="1.35" stroke-linecap="round" />
            <path d="M-2.2,0.5 C1.5,-2.8 4.4,-0.8 3.6,2.1 C2.9,4.3 0.2,4.8 -2.2,4.1" fill="none" stroke="${color}" stroke-width="1.45" stroke-linejoin="round" />
        </g>`;
    }
    return '';
}

/**
 * Desenha a Clave de Sol vetorial alinhada ao pentagrama padrão (G4 = y 68).
 */
export function renderTrebleClefPath(offsetX = 16, color = 'currentColor') {
    return `<g class="staff-clef-symbol" transform="translate(${offsetX}, 0)">
        <path d="M 1.5 84.5
                 C -2.5 85.2 -5.0 82.0 -4.2 79.0
                 C -3.4 76.2 0.2 75.8 1.2 78.2
                 C 2.2 80.5 -0.2 82.6 -1.5 81.8
                 C 0.6 84.2 4.6 83.2 4.8 78.5
                 L 1.0 34.5
                 C 0.5 29.0 4.8 26.5 6.8 30.8
                 C 8.5 34.6 5.6 41.8 -1.2 49.0
                 C -7.6 55.6 -9.8 62.6 -7.2 69.2
                 C -4.8 75.2 3.2 77.2 8.2 72.8
                 C 12.2 69.2 11.4 62.2 6.6 59.8
                 C 2.2 57.6 -2.6 60.4 -2.4 65.0
                 C -2.2 68.4 0.4 70.6 2.8 70.8
                 C 0.4 69.2 -0.2 65.8 1.8 63.8
                 C 3.8 61.8 7.2 63.4 7.4 67.2
                 C 7.6 71.2 3.4 73.6 -1.0 72.2
                 C -5.8 70.6 -7.2 64.2 -3.6 58.6
                 C 0.6 52.2 7.2 45.2 6.8 36.2
                 C 6.6 32.8 4.4 31.2 3.0 33.8
                 L 5.2 78.8"
              fill="none" stroke="${color}" stroke-width="1.95" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="-1.5" cy="79.5" r="2.1" fill="${color}" />
    </g>`;
}

/**
 * Desenha a Fórmula de Compasso empilhada sobre o pentagrama.
 */
export function renderTimeSignatureSVG(timeSignature = '4/4', cx = 44, color = 'currentColor') {
    const parts = String(timeSignature || '4/4').split('/');
    const num = parts[0] || '4';
    const den = parts[1] || '4';
    return `<g class="staff-time-sig">
        <text x="${cx}" y="58" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="16" font-weight="800" fill="${color}">${num}</text>
        <text x="${cx}" y="74" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="16" font-weight="800" fill="${color}">${den}</text>
    </g>`;
}

/**
 * Desenha o card inicial de Clave de Sol (+ Fórmula de Compasso opcional).
 */
export function createStaffClefSVG(timeSignature = '4/4', showTimeSignature = true) {
    const width = showTimeSignature ? STAFF_GEOMETRY.CLEF_WIDTH_WITH_SIG : STAFF_GEOMETRY.CLEF_WIDTH_ONLY;
    const h = STAFF_GEOMETRY.VIEWBOX_HEIGHT;
    const color = 'var(--parchment-text)';
    return `
        <svg class="staff-svg staff-clef-svg" viewBox="0 0 ${width} ${h}" preserveAspectRatio="xMinYMid meet" aria-hidden="true">
            ${renderStaffLinesSVG(1, width + 60, color)}
            <line x1="1" y1="${STAFF_GEOMETRY.TOP_LINE_Y}" x2="1" y2="${STAFF_GEOMETRY.BOTTOM_LINE_Y}" stroke="${color}" stroke-width="1.8" />
            ${renderTrebleClefPath(16, color)}
            ${showTimeSignature ? renderTimeSignatureSVG(timeSignature, 43, color) : ''}
        </svg>
    `;
}

/**
 * Desenha os elementos internos de uma pausa musical na pauta em torno de cx.
 */
export function renderStaffRestElements(duration, cx, color = 'currentColor') {
    const dur = parseFloat(duration) || 1.0;
    const hasDot = (dur === 1.5 || dur === 3);
    let glyph = '';

    if (dur === 4) {
        // Pausa de Semibreve (pendurada na 4ª linha, y=52)
        glyph = `<rect x="${cx - 5.5}" y="52" width="11" height="4.2" fill="${color}" />`;
    } else if (dur === 2 || dur === 3) {
        // Pausa de Mínima (apoiada na 3ª linha, y=60)
        glyph = `<rect x="${cx - 5.5}" y="55.8" width="11" height="4.2" fill="${color}" />`;
    } else if (dur === 0.5) {
        // Pausa de Colcheia
        glyph = `
            <circle cx="${cx - 2.5}" cy="56" r="2.2" fill="${color}" />
            <path d="M${cx - 1.5},57.5 C${cx + 1.5},58.5 ${cx + 3.2},56.2 ${cx + 4.2},53.5 L${cx - 0.5},70.5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" />
        `;
    } else if (dur === 0.25) {
        // Pausa de Semicolcheia
        glyph = `
            <circle cx="${cx - 1.8}" cy="53.5" r="2.0" fill="${color}" />
            <path d="M${cx - 0.8},54.8 C${cx + 1.8},55.6 ${cx + 3.2},53.6 ${cx + 4.2},51.2" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="${cx - 3.6}" cy="61.5" r="2.0" fill="${color}" />
            <path d="M${cx - 2.6},62.8 C${cx + 0.0},63.6 ${cx + 1.4},61.6 ${cx + 2.4},59.2" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" />
            <line x1="${cx + 4.2}" y1="51.2" x2="${cx - 1.5}" y2="72.5" stroke="${color}" stroke-width="1.75" stroke-linecap="round" />
        `;
    } else {
        // Pausa de Semínima (1 ou 1.5)
        glyph = `
            <path d="M${cx - 2.2},47.5 L${cx + 3.4},54.5 L${cx - 2.6},61.5 L${cx + 3.0},68.0 C${cx - 1.8},67.0 ${cx - 3.4},71.5 ${cx + 1.0},74.2"
                  fill="none" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
        `;
    }

    const dot = hasDot ? `<circle cx="${cx + 8.5}" cy="56" r="1.7" fill="${color}" />` : '';
    return `<g class="staff-rest">${glyph}${dot}</g>`;
}

/**
 * Verifica se uma duração é elegível para barra de união (beaming):
 * semicolcheia (0.25), tercina de colcheia (~0.333), colcheia (0.5) e colcheia pontuada (0.75).
 */
export function isBeamableDuration(duration) {
    const d = parseFloat(duration);
    return Number.isFinite(d) && d > 0 && d <= 0.76;
}

function getBeatGroupSize(timeSignature = '4/4') {
    const ts = String(timeSignature || '4/4').trim();
    if (ts === '6/8' || ts === '9/8' || ts === '12/8') return 1.5; // 3 colcheias por pulso ternário
    if (ts === '2/4' || ts === '3/4') return 1.0; // 2 colcheias por tempo
    return 2.0; // 4/4 e 2/2: até 4 colcheias por meio-compasso (quebradas por espaço/beamBreak do ABC)
}

/**
 * Calcula todos os grupos de barras de união (beaming) para um array de notas.
 * Retorna:
 * - `groups`: lista de grupos com >= 2 notas ({ id, indices, stemDir, beamY, tupletNum })
 * - `byIndex`: Map<index, beamInfo> para uso direto por cada nota no DOM e no exportador SVG
 */
export function computeBeamGroups(notes, timeSignature = '4/4', whistleKey = 'D') {
    const groups = [];
    const byIndex = new Map();
    if (!Array.isArray(notes) || notes.length === 0) {
        return { groups, byIndex };
    }

    const groupBeats = getBeatGroupSize(timeSignature);
    let measureBeat = 0;
    let currentGroup = [];
    let currentGroupBucket = -1;
    let currentGroupTuplet = null;

    const finalizeGroup = () => {
        if (currentGroup.length >= 2) {
            const infos = currentGroup.map(idx => getNoteStaffInfo(notes[idx].note, whistleKey));
            // Direção única da haste para o grupo: baseada na nota mais distante da linha central (step = 4)
            let maxDist = -1;
            let avgStep = 0;
            let decisiveStep = 4;
            infos.forEach(info => {
                const dist = Math.abs(info.step - 4);
                avgStep += info.step;
                if (dist > maxDist) {
                    maxDist = dist;
                    decisiveStep = info.step;
                }
            });
            avgStep /= infos.length;
            const stemDir = (decisiveStep > 4 || (decisiveStep === 4 && avgStep >= 4)) ? 'down' : 'up';

            // Calcula beamY seguro com comprimento mínimo de haste (>= 22px) para TODAS as notas do grupo
            let beamY;
            if (stemDir === 'up') {
                const minNoteY = Math.min(...infos.map(i => i.y));
                beamY = Math.max(8, Math.min(minNoteY - 23, STAFF_GEOMETRY.MIDDLE_LINE_Y));
            } else {
                const maxNoteY = Math.max(...infos.map(i => i.y));
                beamY = Math.min(102, Math.max(maxNoteY + 23, STAFF_GEOMETRY.MIDDLE_LINE_Y));
            }

            const firstTuplet = notes[currentGroup[0]].tuplet || 0;
            const allSameTuplet = firstTuplet > 0 && currentGroup.every(idx => notes[idx].tuplet === firstTuplet);

            const groupId = groups.length;
            const groupObj = {
                id: groupId,
                indices: [...currentGroup],
                stemDir,
                beamY,
                tupletNum: allSameTuplet ? firstTuplet : 0
            };
            groups.push(groupObj);

            const len = currentGroup.length;
            currentGroup.forEach((noteIdx, pos) => {
                const dur = parseFloat(notes[noteIdx].duration) || 1.0;
                const prevDur = pos > 0 ? (parseFloat(notes[currentGroup[pos - 1]].duration) || 1.0) : 1.0;
                const nextDur = pos < len - 1 ? (parseFloat(notes[currentGroup[pos + 1]].duration) || 1.0) : 1.0;
                const is16 = dur <= 0.26;

                byIndex.set(noteIdx, {
                    groupId,
                    posInGroup: pos,
                    groupLen: len,
                    isFirst: pos === 0,
                    isLast: pos === len - 1,
                    stemDir,
                    beamY,
                    is16,
                    hasPrev16: is16 && pos > 0 && prevDur <= 0.26,
                    hasNext16: is16 && pos < len - 1 && nextDur <= 0.26,
                    tupletNum: groupObj.tupletNum,
                    showTupletLabel: groupObj.tupletNum > 0 && pos === Math.floor(len / 2)
                });
            });
        }
        currentGroup = [];
        currentGroupBucket = -1;
        currentGroupTuplet = null;
    };

    notes.forEach((item, index) => {
        if (!item) return;
        if (['BAR', 'DOUBLE_BAR', 'REPEAT_START', 'REPEAT_END', 'LINEBREAK'].includes(item.note)) {
            finalizeGroup();
            measureBeat = 0;
            return;
        }

        const dur = parseFloat(item.duration) || 1.0;
        if (item.note === 'REST' || !isBeamableDuration(dur)) {
            finalizeGroup();
            measureBeat += dur;
            return;
        }

        const bucket = Math.floor((measureBeat + 0.001) / groupBeats);
        const itemTuplet = item.tuplet || null;

        // Quebra de grupo por espaço explícito do ABC, mudança de pulso ou início/fim de tercina
        const shouldBreak =
            currentGroup.length > 0 && (
                item.beamBreak ||
                (itemTuplet !== currentGroupTuplet) ||
                (itemTuplet && item.tupletPos === 'start') ||
                (!itemTuplet && bucket !== currentGroupBucket)
            );

        if (shouldBreak) {
            finalizeGroup();
        }

        if (currentGroup.length === 0) {
            currentGroupBucket = bucket;
            currentGroupTuplet = itemTuplet;
        }
        currentGroup.push(index);

        if (itemTuplet && item.tupletPos === 'end') {
            finalizeGroup();
        }

        measureBeat += dur;
    });

    finalizeGroup();
    return { groups, byIndex };
}

/**
 * Desenha os elementos internos de uma nota musical (linhas suplementares, acidente,
 * cabeça da nota, haste, bandeirolas ou barra de união, ponto de aumento, ligadura, tercina e casa 1ª/2ª vez).
 */
export function renderStaffNoteElements(noteObj, whistleKey, cx, color = 'currentColor', bgColor = '#ffffff', options = null) {
    const dur = parseFloat(noteObj.duration) || 1.0;
    const beamInfo = options && options.beamInfo ? options.beamInfo : null;
    const cardWidth = (options && options.cardWidth) ? options.cardWidth : STAFF_GEOMETRY.NOTE_CARD_WIDTH;
    const drawDomBeamSegments = !(options && options.skipDomBeams);

    // Colchete de Casa de 1ª / 2ª vez (volta) acima da pauta
    let voltaSvg = '';
    if (noteObj && noteObj.volta) {
        voltaSvg = `<g class="staff-volta">
            <path d="M2,18 L2,7 L${cardWidth + 30},7" fill="none" stroke="${color}" stroke-width="1.25" />
            <text x="7" y="16" font-family="Outfit, Arial, sans-serif" font-size="9.5" font-weight="700" fill="${color}">${noteObj.volta}.</text>
        </g>`;
    }

    if (!noteObj || noteObj.note === 'REST') {
        return voltaSvg + renderStaffRestElements(dur, cx, color);
    }

    const info = getNoteStaffInfo(noteObj.note, whistleKey);
    const noteY = info.y;
    const stemDir = beamInfo ? beamInfo.stemDir : info.stemDir;
    const isHollow = (dur === 2 || dur === 3 || dur === 4);
    const hasStem = (dur !== 4);
    const hasDot = (Math.abs(dur - 0.75) < 0.03 || Math.abs(dur - 1.5) < 0.03 || Math.abs(dur - 3) < 0.03);
    const flagsCount = beamInfo ? 0 : (dur <= 0.26 ? 2 : (dur <= 0.76 ? 1 : 0));

    // Linhas suplementares
    const ledgers = info.ledgerLines.map(ly =>
        `<line x1="${cx - 8.5}" y1="${ly}" x2="${cx + 8.5}" y2="${ly}" class="staff-ledger-line" stroke="${color}" stroke-width="1.25" />`
    ).join('');

    // Acidente explícito (# ou b) à esquerda da cabeça da nota
    const accSvg = info.accidental
        ? renderAccidentalSVG(info.accidental, cx - 10.5, noteY, color, 0.92)
        : '';

    // Cabeça da nota
    let headSvg = '';
    if (dur === 4) {
        headSvg = `<ellipse cx="${cx}" cy="${noteY}" rx="5.4" ry="3.5" fill="${bgColor}" stroke="${color}" stroke-width="1.9" />`;
    } else if (isHollow) {
        headSvg = `<ellipse cx="${cx}" cy="${noteY}" rx="4.7" ry="3.3" transform="rotate(-22 ${cx} ${noteY})" fill="${bgColor}" stroke="${color}" stroke-width="1.8" />`;
    } else {
        headSvg = `<ellipse cx="${cx}" cy="${noteY}" rx="4.7" ry="3.3" transform="rotate(-22 ${cx} ${noteY})" fill="${color}" />`;
    }

    // Haste + Bandeirolas ou Barra de União (Beam)
    let stemAndFlagsSvg = '';
    let beamSvg = '';
    let tupletSvg = '';

    if (hasStem) {
        const stemX = stemDir === 'up' ? (cx + 4.2) : (cx - 4.2);
        const stemStartY = stemDir === 'up' ? (noteY - 1.2) : (noteY + 1.2);
        const stemEndY = beamInfo
            ? beamInfo.beamY
            : (stemDir === 'up'
                ? Math.min(noteY - 24, STAFF_GEOMETRY.MIDDLE_LINE_Y)
                : Math.max(noteY + 24, STAFF_GEOMETRY.MIDDLE_LINE_Y));

        stemAndFlagsSvg += `<line x1="${stemX}" y1="${stemStartY}" x2="${stemX}" y2="${stemEndY}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />`;

        if (flagsCount > 0) {
            if (stemDir === 'up') {
                if (flagsCount >= 1) {
                    stemAndFlagsSvg += `<path d="M${stemX},${stemEndY} C${stemX + 4.5},${stemEndY + 3.5} ${stemX + 8.5},${stemEndY + 7.5} ${stemX + 6.5},${stemEndY + 13}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" />`;
                }
                if (flagsCount >= 2) {
                    stemAndFlagsSvg += `<path d="M${stemX},${stemEndY + 5.2} C${stemX + 4.5},${stemEndY + 8.7} ${stemX + 8.5},${stemEndY + 12.7} ${stemX + 6.5},${stemEndY + 18.2}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" />`;
                }
            } else {
                if (flagsCount >= 1) {
                    stemAndFlagsSvg += `<path d="M${stemX},${stemEndY} C${stemX + 4.5},${stemEndY - 3.5} ${stemX + 8.5},${stemEndY - 7.5} ${stemX + 6.5},${stemEndY - 13}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" />`;
                }
                if (flagsCount >= 2) {
                    stemAndFlagsSvg += `<path d="M${stemX},${stemEndY - 5.2} C${stemX + 4.5},${stemEndY - 8.7} ${stemX + 8.5},${stemEndY - 12.7} ${stemX + 6.5},${stemEndY - 18.2}" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" />`;
                }
            }
        } else if (beamInfo && drawDomBeamSegments) {
            // Barra de união principal estendida até a borda do card (0px de emenda)
            const beamThick = 3.8;
            const primaryTopY = stemDir === 'up' ? beamInfo.beamY : (beamInfo.beamY - beamThick);
            const leftX = beamInfo.isFirst ? (stemX - 0.75) : -60;
            const rightX = beamInfo.isLast ? (stemX + 0.75) : (cardWidth + 60);
            beamSvg += `<rect class="staff-beam" x="${leftX}" y="${primaryTopY}" width="${rightX - leftX}" height="${beamThick}" fill="${color}" />`;

            // Segunda barra para semicolcheias (0.25t) ou meia-barra (beamlet) em ritmos pontuados (G>B)
            if (beamInfo.is16) {
                const secOffset = 5.6;
                const secTopY = stemDir === 'up' ? (primaryTopY + secOffset) : (primaryTopY - secOffset);
                if (beamInfo.hasPrev16 || beamInfo.hasNext16) {
                    const secLeft = beamInfo.hasPrev16 ? -60 : (stemX - 0.75);
                    const secRight = beamInfo.hasNext16 ? (cardWidth + 60) : (stemX + 0.75);
                    beamSvg += `<rect class="staff-beam staff-beam-secondary" x="${secLeft}" y="${secTopY}" width="${secRight - secLeft}" height="3.0" fill="${color}" />`;
                } else {
                    // Meia-barra (beamlet) voltada para dentro do grupo
                    const beamletW = 10.5;
                    const secLeft = beamInfo.isFirst ? (stemX - 0.75) : (stemX - beamletW + 0.75);
                    beamSvg += `<rect class="staff-beam staff-beamlet" x="${secLeft}" y="${secTopY}" width="${beamletW}" height="3.0" fill="${color}" />`;
                }
            }

            // Número da tercina / quiáltera (ex: '3') centralizado sobre o grupo
            if (beamInfo.showTupletLabel) {
                const labelY = stemDir === 'up' ? Math.max(9, primaryTopY - 3) : Math.min(108, primaryTopY + beamThick + 10);
                tupletSvg = `<text class="staff-tuplet-num" x="${cx}" y="${labelY}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="10.5" font-weight="800" font-style="italic" fill="${color}">${beamInfo.tupletNum}</text>`;
            }
        }
    }

    // Ponto de aumento (evita sobrepor linha do pentagrama: se estiver em linha par, sobe 2px para o espaço)
    let dotSvg = '';
    if (hasDot) {
        const isOnLine = (info.step % 2 === 0);
        const dotY = isOnLine ? noteY - 2.5 : noteY;
        dotSvg = `<circle cx="${cx + 8.6}" cy="${dotY}" r="1.65" fill="${color}" />`;
    }

    // Ligadura de prolongamento (Tie '-') ou início de Slur '(' no DOM
    let tieSvg = '';
    if (drawDomBeamSegments && (noteObj.tie || (noteObj.slurStart && !noteObj.slurEnd))) {
        const arcDir = stemDir === 'up' ? 1 : -1; // Arco oposto à direção da haste
        const arcY = noteY + (arcDir * 5.2);
        const ctrlY = arcY + (arcDir * 7.5);
        tieSvg = `<path class="staff-tie-arc" d="M${cx + 4},${arcY} Q${cx + 18},${ctrlY} ${cardWidth + 14},${arcY}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" />`;
    }

    return `${voltaSvg}${ledgers}${accSvg}${headSvg}${stemAndFlagsSvg}${beamSvg}${tupletSvg}${dotSvg}${tieSvg}`;
}

/**
 * Gera o SVG completo de uma nota na pauta para um `.note-card` no DOM.
 */
export function createStaffNoteSVG(noteObj, whistleKey = 'D', noteIndex = 0, beamInfo = null) {
    const w = STAFF_GEOMETRY.NOTE_CARD_WIDTH;
    const h = STAFF_GEOMETRY.VIEWBOX_HEIGHT;
    const cx = 23; // Ligeiramente deslocado à direita para acomodar acidentes (#/b) à esquerda
    const color = 'var(--parchment-text)';
    const bgColor = 'var(--parchment-bg, #fcfbf8)';

    return `
        <svg class="staff-svg staff-note-svg" viewBox="0 0 ${w} ${h}" data-note-index="${noteIndex}">
            ${renderStaffLinesSVG(-60, w + 60, color)}
            ${renderStaffNoteElements(noteObj, whistleKey, cx, color, bgColor, { beamInfo, cardWidth: w })}
        </svg>
    `;
}

/**
 * Desenha os elementos internos de uma barra de compasso alinhada ao pentagrama (y=44..76).
 */
export function renderStaffMeasureBarElements(barType, cx, color = 'currentColor') {
    const topY = STAFF_GEOMETRY.TOP_LINE_Y;
    const botY = STAFF_GEOMETRY.BOTTOM_LINE_Y;
    const dotTopY = 56; // 3º espaço (C5)
    const dotBotY = 64; // 2º espaço (A4)

    if (barType === 'DOUBLE_BAR') {
        return `
            <line x1="${cx - 3.2}" y1="${topY}" x2="${cx - 3.2}" y2="${botY}" stroke="${color}" stroke-width="1.4" />
            <line x1="${cx + 1.8}" y1="${topY}" x2="${cx + 1.8}" y2="${botY}" stroke="${color}" stroke-width="3.2" />
        `;
    }
    if (barType === 'REPEAT_START') {
        return `
            <line x1="${cx - 4.5}" y1="${topY}" x2="${cx - 4.5}" y2="${botY}" stroke="${color}" stroke-width="3.2" />
            <line x1="${cx - 0.2}" y1="${topY}" x2="${cx - 0.2}" y2="${botY}" stroke="${color}" stroke-width="1.3" />
            <circle cx="${cx + 4.4}" cy="${dotTopY}" r="1.9" fill="${color}" />
            <circle cx="${cx + 4.4}" cy="${dotBotY}" r="1.9" fill="${color}" />
        `;
    }
    if (barType === 'REPEAT_END') {
        return `
            <circle cx="${cx - 4.4}" cy="${dotTopY}" r="1.9" fill="${color}" />
            <circle cx="${cx - 4.4}" cy="${dotBotY}" r="1.9" fill="${color}" />
            <line x1="${cx + 0.2}" y1="${topY}" x2="${cx + 0.2}" y2="${botY}" stroke="${color}" stroke-width="1.3" />
            <line x1="${cx + 4.5}" y1="${topY}" x2="${cx + 4.5}" y2="${botY}" stroke="${color}" stroke-width="3.2" />
        `;
    }
    return `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${botY}" stroke="${color}" stroke-width="1.7" />`;
}

/**
 * Gera o SVG completo de uma barra de compasso no modo Partitura para `.measure-bar-card`.
 */
export function createStaffMeasureBarSVG(barType) {
    const w = STAFF_GEOMETRY.BAR_CARD_WIDTH;
    const h = STAFF_GEOMETRY.VIEWBOX_HEIGHT;
    const cx = w / 2;
    const color = 'var(--parchment-text)';

    return `
        <svg class="staff-svg staff-bar-svg measure-bar-svg" viewBox="0 0 ${w} ${h}">
            ${renderStaffLinesSVG(-60, w + 60, color)}
            ${renderStaffMeasureBarElements(barType, cx, color)}
        </svg>
    `;
}

/**
 * Gera uma mini-pauta compacta (viewBox="0 0 46 44") para os botões do teclado virtual.
 */
export function createMiniStaffSVG(noteId, whistleKey = 'D') {
    // Escala compacta: lineSpacing = 4.6px (halfStep = 2.3px)
    // E4 (step 0) = y 36, F5 (step 8) = y 17.6
    const bottomY = 36;
    const halfStep = 2.3;
    const lineYs = [17.6, 22.2, 26.8, 31.4, 36];
    const staffLines = lineYs.map(y =>
        `<line x1="2" y1="${y}" x2="44" y2="${y}" stroke="currentColor" stroke-width="0.75" stroke-opacity="0.45" />`
    ).join('');

    if (!noteId || noteId === 'REST') {
        return `
            <svg class="staff-mini" viewBox="0 0 46 44" width="46" height="44" aria-hidden="true">
                ${staffLines}
                <path d="M21.5,19.5 L25.0,24.2 L21.0,28.8 L24.6,33.2 C21.8,32.5 20.8,35.2 23.2,36.8"
                      fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        `;
    }

    const info = getNoteStaffInfo(noteId, whistleKey);
    const noteY = Math.max(4.5, Math.min(40.5, bottomY - (info.step * halfStep)));
    const cx = info.accidental ? 28 : 24;

    const ledgers = [];
    if (info.step <= -2) {
        for (let s = -2; s >= info.step; s -= 2) {
            const ly = bottomY - (s * halfStep);
            if (ly <= 42) {
                ledgers.push(`<line x1="${cx - 6.5}" y1="${ly}" x2="${cx + 6.5}" y2="${ly}" stroke="currentColor" stroke-width="0.95" />`);
            }
        }
    } else if (info.step >= 10) {
        for (let s = 10; s <= info.step; s += 2) {
            const ly = bottomY - (s * halfStep);
            if (ly >= 3) {
                ledgers.push(`<line x1="${cx - 6.5}" y1="${ly}" x2="${cx + 6.5}" y2="${ly}" stroke="currentColor" stroke-width="0.95" />`);
            }
        }
    }

    const accSvg = info.accidental
        ? renderAccidentalSVG(info.accidental, cx - 8.5, noteY, 'currentColor', 0.65)
        : '';

    const stemSvg = info.stemDir === 'up'
        ? `<line x1="${cx + 3.1}" y1="${noteY - 0.5}" x2="${cx + 3.1}" y2="${Math.max(3, noteY - 14)}" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" />`
        : `<line x1="${cx - 3.1}" y1="${noteY + 0.5}" x2="${cx - 3.1}" y2="${Math.min(41.5, noteY + 14)}" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" />`;

    return `
        <svg class="staff-mini" viewBox="0 0 46 44" width="46" height="44" aria-hidden="true">
            ${staffLines}
            ${ledgers.join('')}
            ${accSvg}
            <ellipse cx="${cx}" cy="${noteY}" rx="3.5" ry="2.4" transform="rotate(-20 ${cx} ${noteY})" fill="currentColor" />
            ${stemSvg}
        </svg>
    `;
}
