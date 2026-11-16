/* ==========================================================================
   CONFIGURAÇÕES, DICIONÁRIO DE DEDILHADOS, FREQUÊNCIAS E AFINAÇÕES
   ========================================================================== */

import { t } from '../i18n/index.js';

// Posição dos furos: 1 (topo) a 6 (base).
// Valores: 1 = Fechado (●), 0 = Aberto (○), 0.5 = Meio Furo (◑).
export const STANDARD_FINGERINGS = {
    'D5':  [1, 1, 1, 1, 1, 1], // Grave
    'D#5': [1, 1, 1, 1, 1, 0.5], // Meio-furo
    'E5':  [1, 1, 1, 1, 1, 0],
    'F5':  [1, 1, 1, 1, 0.5, 0], // Meio-furo
    'F#5': [1, 1, 1, 1, 0, 0],
    'G5':  [1, 1, 1, 0, 0, 0],
    'G#5': [1, 1, 0.5, 0, 0, 0], // Meio-furo
    'A5':  [1, 1, 0, 0, 0, 0],
    'A#5': [1, 0.5, 0, 0, 0, 0], // Meio-furo
    'B5':  [1, 0, 0, 0, 0, 0],
    'C5':  [0, 1, 1, 0, 0, 0], // C Natural padrão (1ª oitava)
    'C5_ALT': [0, 1, 1, 1, 1, 0], // C Natural alternativo (1ª oitava)
    'C#6': [0, 0, 0, 0, 0, 0], // C# (1ª oitava)
    
    'D6':  [0, 1, 1, 1, 1, 1], // Agudo (2ª oitava)
    'D#6': [0, 1, 1, 1, 1, 0.5], // Meio-furo (2ª oitava)
    'E6':  [1, 1, 1, 1, 1, 0],
    'F6':  [1, 1, 1, 1, 0.5, 0], // Meio-furo (2ª oitava)
    'F#6': [1, 1, 1, 1, 0, 0],
    'G6':  [1, 1, 1, 0, 0, 0],
    'G#6': [1, 1, 0.5, 0, 0, 0], // Meio-furo (2ª oitava)
    'A6':  [1, 1, 0, 0, 0, 0],
    'A#6': [1, 0.5, 0, 0, 0, 0], // Meio-furo (2ª oitava)
    'B6':  [1, 0, 0, 0, 0, 0],
    'C6':  [0, 1, 1, 0, 0, 0], // C Natural padrão (2ª oitava)
    'C6_ALT': [0, 1, 1, 1, 1, 0], // C Natural alternativo (2ª oitava)
    'C#7': [0, 0, 0, 0, 0, 0],
    
    'REST': [0, 0, 0, 0, 0, 0] // Pausa (Silêncio)
};

// Frequências padrão (para flauta afinada em Ré / D - D5 a D7)
export const NOTE_FREQUENCIES = {
    'D5':  587.33,
    'D#5': 622.25,
    'E5':  659.25,
    'F5':  698.46,
    'F#5': 739.99,
    'G5':  783.99,
    'G#5': 830.61,
    'A5':  880.00,
    'A#5': 932.33,
    'B5':  987.77,
    'C5':  1046.50, // C Natural grave
    'C5_ALT': 1046.50,
    'C#6': 1108.73,
    
    'D6':  1174.66,
    'D#6': 1244.51,
    'E6':  1318.51,
    'F6':  1396.91,
    'F#6': 1479.98,
    'G6':  1567.98,
    'G#6': 1661.22,
    'A6':  1760.00,
    'A#6': 1864.66,
    'B6':  1975.53,
    'C6':  2093.00, // C Natural agudo
    'C6_ALT': 2093.00,
    'C#7': 2217.46,
    
    'REST': 0
};

// DADOS DE NOTAS E NOMES POR TOM DE FLAUTA
export const WHISTLE_KEYS_DATA = {
    'D': {
        name: 'D (Ré)',
        semitones: 0,
        notes: {
            'D5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Dó# (C#)', display: 'C#', text: 'c#', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Dó Nat (C)', display: 'C', text: 'c', fingering: [0, 1, 1, 0, 0, 0], octave2: false },
            'C5_ALT': { name: 'Dó Nat Alt (C)', display: 'C', text: 'c_alt', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Dó Nat (C2)', display: 'c', text: 'C', fingering: [0, 1, 1, 0, 0, 0], octave2: true },
            'C6_ALT': { name: 'Dó Nat Alt (C2)', display: 'c', text: 'C_ALT', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'D#5': { name: 'Ré# (D#)', display: 'D#', text: 'd#', fingering: [1, 1, 1, 1, 1, 0.5], octave2: false },
            'F5':  { name: 'Fá Nat (F)', display: 'F', text: 'f', fingering: [1, 1, 1, 1, 0.5, 0], octave2: false },
            'G#5': { name: 'Sol# (G#)', display: 'G#', text: 'g#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: false },
            'A#5': { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 0.5, 0, 0, 0, 0], octave2: false },
            'D#6': { name: 'Ré# (D#2)', display: 'd#', text: 'D#', fingering: [0, 1, 1, 1, 1, 0.5], octave2: true },
            'F6':  { name: 'Fá Nat (F2)', display: 'f', text: 'F', fingering: [1, 1, 1, 1, 0.5, 0], octave2: true },
            'G#6': { name: 'Sol# (G#2)', display: 'g#', text: 'G#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: true },
            'A#6': { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 0.5, 0, 0, 0, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C6', 'C#7'],
        orderSpecials: ['C5_ALT', 'C6_ALT'],
        orderHalfHoles: ['D#5', 'F5', 'G#5', 'A#5', 'D#6', 'F6', 'G#6', 'A#6'],
        helpText: 'Grave: <code>d, e, f#, g, a, b, c, c#</code> | Agudo: <code>D, E, F#, G, A, B, C, C#</code> | Meio-furo: <code>d#, f, g#, bb</code> | Pausa: <code>Espaço</code>'
    },
    'C': {
        name: 'C (Dó)',
        semitones: -2,
        notes: {
            'D5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Si (B)', display: 'B', text: 'b', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Si♭ Nat (Bb)', display: 'Bb', text: 'bb', fingering: [0, 1, 1, 0, 0, 0], octave2: false },
            'C5_ALT': { name: 'Si♭ Nat Alt (Bb)', display: 'Bb', text: 'bb_alt', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Si♭ Nat (Bb2)', display: 'bb', text: 'BB', fingering: [0, 1, 1, 0, 0, 0], octave2: true },
            'C6_ALT': { name: 'Si♭ Nat Alt (Bb2)', display: 'bb', text: 'BB_ALT', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'D#5': { name: 'Dó# (C#)', display: 'C#', text: 'c#', fingering: [1, 1, 1, 1, 1, 0.5], octave2: false },
            'F5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [1, 1, 1, 1, 0.5, 0], octave2: false },
            'G#5': { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: false },
            'A#5': { name: 'Sol# (G#)', display: 'G#', text: 'g#', fingering: [1, 0.5, 0, 0, 0, 0], octave2: false },
            'D#6': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [0, 1, 1, 1, 1, 0.5], octave2: true },
            'F6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [1, 1, 1, 1, 0.5, 0], octave2: true },
            'G#6': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: true },
            'A#6': { name: 'Sol# (G#2)', display: 'g#', text: 'G#', fingering: [1, 0.5, 0, 0, 0, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C6', 'C#7'],
        orderSpecials: ['C5_ALT', 'C6_ALT'],
        orderHalfHoles: ['D#5', 'F5', 'G#5', 'A#5', 'D#6', 'F6', 'G#6', 'A#6'],
        helpText: 'Grave: <code>c, d, e, f, g, a, bb, b</code> | Agudo: <code>C, D, E, F, G, A, BB, B</code> | Meio-furo: <code>c#, eb, f#, g#</code> | Pausa: <code>Espaço</code>'
    },
    'G': {
        name: 'G (Sol)',
        semitones: 5,
        notes: {
            'D5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Fá Nat (F)', display: 'F', text: 'f', fingering: [0, 1, 1, 0, 0, 0], octave2: false },
            'C5_ALT': { name: 'Fá Nat Alt (F)', display: 'F', text: 'f_alt', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Fá Nat (F2)', display: 'f', text: 'F', fingering: [0, 1, 1, 0, 0, 0], octave2: true },
            'C6_ALT': { name: 'Fá Nat Alt (F2)', display: 'f', text: 'F_ALT', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'D#5': { name: 'Sol# (G#)', display: 'G#', text: 'g#', fingering: [1, 1, 1, 1, 1, 0.5], octave2: false },
            'F5':  { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 1, 1, 0.5, 0], octave2: false },
            'G#5': { name: 'Dó# (C#)', display: 'C#', text: 'c#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: false },
            'A#5': { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [1, 0.5, 0, 0, 0, 0], octave2: false },
            'D#6': { name: 'Sol# (G#2)', display: 'g#', text: 'G#', fingering: [0, 1, 1, 1, 1, 0.5], octave2: true },
            'F6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 1, 1, 1, 0.5, 0], octave2: true },
            'G#6': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: true },
            'A#6': { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [1, 0.5, 0, 0, 0, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C6', 'C#7'],
        orderSpecials: ['C5_ALT', 'C6_ALT'],
        orderHalfHoles: ['D#5', 'F5', 'G#5', 'A#5', 'D#6', 'F6', 'G#6', 'A#6'],
        helpText: 'Grave: <code>g, a, b, c, d, e, f, f#</code> | Agudo: <code>G, A, B, C, D, E, F, F#</code> | Meio-furo: <code>g#, bb, c#, eb</code> | Pausa: <code>Espaço</code>'
    },
    'A': {
        name: 'A (Lá)',
        semitones: 7,
        notes: {
            'D5':  { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Dó# (C#)', display: 'C#', text: 'c#', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Sol# (G#)', display: 'G#', text: 'g#', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Sol Nat (G)', display: 'G', text: 'g', fingering: [0, 1, 1, 0, 0, 0], octave2: false },
            'C5_ALT': { name: 'Sol Nat Alt (G)', display: 'G', text: 'g_alt', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Sol# (G#2)', display: 'g#', text: 'G#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Sol Nat (G2)', display: 'g', text: 'G', fingering: [0, 1, 1, 0, 0, 0], octave2: true },
            'C6_ALT': { name: 'Sol Nat Alt (G2)', display: 'g', text: 'G_ALT', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'D#5': { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 1, 1, 1, 0.5], octave2: false },
            'F5':  { name: 'Dó Nat (C)', display: 'C', text: 'c', fingering: [1, 1, 1, 1, 0.5, 0], octave2: false },
            'G#5': { name: 'Ré# (D#)', display: 'D#', text: 'd#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: false },
            'A#5': { name: 'Fá Nat (F)', display: 'F', text: 'f', fingering: [1, 0.5, 0, 0, 0, 0], octave2: false },
            'D#6': { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [0, 1, 1, 1, 1, 0.5], octave2: true },
            'F6':  { name: 'Dó Nat (C2)', display: 'c', text: 'C', fingering: [1, 1, 1, 1, 0.5, 0], octave2: true },
            'G#6': { name: 'Ré# (D#2)', display: 'd#', text: 'D#', fingering: [1, 1, 0.5, 0, 0, 0], octave2: true },
            'A#6': { name: 'Fá Nat (F2)', display: 'f', text: 'F', fingering: [1, 0.5, 0, 0, 0, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C6', 'C#7'],
        orderSpecials: ['C5_ALT', 'C6_ALT'],
        orderHalfHoles: ['D#5', 'F5', 'G#5', 'A#5', 'D#6', 'F6', 'G#6', 'A#6'],
        helpText: 'Grave: <code>a, b, c#, d, e, f#, g, g#</code> | Agudo: <code>A, B, C#, D, E, F#, G, G#</code> | Meio-furo: <code>bb, c, d#, f</code> | Pausa: <code>Espaço</code>'
    },
    'Bb': {
        name: 'B♭ (Si Bemol)',
        semitones: 8,
        notes: {
            'D5':  { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Lá (A)', display: 'A', text: 'a', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Lá♭ (Ab)', display: 'Ab', text: 'ab', fingering: [0, 1, 1, 0, 0, 0], octave2: false },
            'C5_ALT': { name: 'Lá♭ Alt (Ab)', display: 'Ab', text: 'ab_alt', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Lá♭ (Ab2)', display: 'ab', text: 'AB', fingering: [0, 1, 1, 0, 0, 0], octave2: true },
            'C6_ALT': { name: 'Lá♭ Alt (Ab2)', display: 'ab', text: 'AB_ALT', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'D#5': { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 1, 1, 1, 1, 0.5], octave2: false },
            'F5':  { name: 'Ré♭ (Db)', display: 'Db', text: 'db', fingering: [1, 1, 1, 1, 0.5, 0], octave2: false },
            'G#5': { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 0.5, 0, 0, 0], octave2: false },
            'A#5': { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 0.5, 0, 0, 0, 0], octave2: false },
            'D#6': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [0, 1, 1, 1, 1, 0.5], octave2: true },
            'F6':  { name: 'Ré♭ (Db2)', display: 'db', text: 'DB', fingering: [1, 1, 1, 1, 0.5, 0], octave2: true },
            'G#6': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 0.5, 0, 0, 0], octave2: true },
            'A#6': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 0.5, 0, 0, 0, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C6', 'C#7'],
        orderSpecials: ['C5_ALT', 'C6_ALT'],
        orderHalfHoles: ['D#5', 'F5', 'G#5', 'A#5', 'D#6', 'F6', 'G#6', 'A#6'],
        helpText: 'Grave: <code>bb, c, d, eb, f, g, ab, a</code> | Agudo: <code>BB, C, D, EB, F, G, AB, A</code> | Meio-furo: <code>b, db, e, f#</code> | Pausa: <code>Espaço</code>'
    },
    'F': {
        name: 'F (Fá)',
        semitones: 3,
        notes: {
            'D5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Ré (D)', display: 'D', text: 'd', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Mi (E)', display: 'E', text: 'e', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [0, 1, 1, 0, 0, 0], octave2: false },
            'C5_ALT': { name: 'Mi♭ Alt (Eb)', display: 'Eb', text: 'eb_alt', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [0, 1, 1, 0, 0, 0], octave2: true },
            'C6_ALT': { name: 'Mi♭ Alt (Eb2)', display: 'eb', text: 'EB_ALT', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'D#5': { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 1, 1, 1, 1, 0.5], octave2: false },
            'F5':  { name: 'Lá♭ (Ab)', display: 'Ab', text: 'ab', fingering: [1, 1, 1, 1, 0.5, 0], octave2: false },
            'G#5': { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 1, 0.5, 0, 0, 0], octave2: false },
            'A#5': { name: 'Dó# (C#)', display: 'C#', text: 'c#', fingering: [1, 0.5, 0, 0, 0, 0], octave2: false },
            'D#6': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [0, 1, 1, 1, 1, 0.5], octave2: true },
            'F6':  { name: 'Lá♭ (Ab2)', display: 'ab', text: 'AB', fingering: [1, 1, 1, 1, 0.5, 0], octave2: true },
            'G#6': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 1, 0.5, 0, 0, 0], octave2: true },
            'A#6': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [1, 0.5, 0, 0, 0, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C6', 'C#7'],
        orderSpecials: ['C5_ALT', 'C6_ALT'],
        orderHalfHoles: ['D#5', 'F5', 'G#5', 'A#5', 'D#6', 'F6', 'G#6', 'A#6'],
        helpText: 'Grave: <code>f, g, a, bb, c, d, eb, e</code> | Agudo: <code>F, G, A, BB, C, D, EB, E</code> | Meio-furo: <code>f#, ab, b, c#</code> | Pausa: <code>Espaço</code>'
    },
    'Eb': {
        name: 'E♭ (Mi Bemol)',
        semitones: 1,
        notes: {
            'D5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [1, 1, 1, 1, 1, 1], octave2: false },
            'E5':  { name: 'Fá (F)', display: 'F', text: 'f', fingering: [1, 1, 1, 1, 1, 0], octave2: false },
            'F#5': { name: 'Sol (G)', display: 'G', text: 'g', fingering: [1, 1, 1, 1, 0, 0], octave2: false },
            'G5':  { name: 'Lá♭ (Ab)', display: 'Ab', text: 'ab', fingering: [1, 1, 1, 0, 0, 0], octave2: false },
            'A5':  { name: 'Si♭ (Bb)', display: 'Bb', text: 'bb', fingering: [1, 1, 0, 0, 0, 0], octave2: false },
            'B5':  { name: 'Dó (C)', display: 'C', text: 'c', fingering: [1, 0, 0, 0, 0, 0], octave2: false },
            'C#6': { name: 'Ré (D)', display: 'D', text: 'd', fingering: [0, 0, 0, 0, 0, 0], octave2: false },
            'C5':  { name: 'Ré♭ (Db)', display: 'Db', text: 'db', fingering: [0, 1, 1, 0, 0, 0], octave2: false },
            'C5_ALT': { name: 'Ré♭ Alt (Db)', display: 'Db', text: 'db_alt', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Lá♭ (Ab2)', display: 'ab', text: 'AB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Ré♭ (Db2)', display: 'db', text: 'DB', fingering: [0, 1, 1, 0, 0, 0], octave2: true },
            'C6_ALT': { name: 'Ré♭ Alt (Db2)', display: 'db', text: 'DB_ALT', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'D#5': { name: 'Mi (E)', display: 'E', text: 'e', fingering: [1, 1, 1, 1, 1, 0.5], octave2: false },
            'F5':  { name: 'Fá# (F#)', display: 'F#', text: 'f#', fingering: [1, 1, 1, 1, 0.5, 0], octave2: false },
            'G#5': { name: 'Lá (A)', display: 'A', text: 'a', fingering: [1, 1, 0.5, 0, 0, 0], octave2: false },
            'A#5': { name: 'Si (B)', display: 'B', text: 'b', fingering: [1, 0.5, 0, 0, 0, 0], octave2: false },
            'D#6': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [0, 1, 1, 1, 1, 0.5], octave2: true },
            'F6':  { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 1, 1, 1, 0.5, 0], octave2: true },
            'G#6': { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 0.5, 0, 0, 0], octave2: true },
            'A#6': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 0.5, 0, 0, 0, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C6', 'C#7'],
        orderSpecials: ['C5_ALT', 'C6_ALT'],
        orderHalfHoles: ['D#5', 'F5', 'G#5', 'A#5', 'D#6', 'F6', 'G#6', 'A#6'],
        helpText: 'Grave: <code>eb, f, g, ab, bb, c, db, d</code> | Agudo: <code>EB, F, G, AB, BB, C, DB, D</code> | Meio-furo: <code>e, f#, a, b</code> | Pausa: <code>Espaço</code>'
    }
};

// Nomes amigáveis para exibição musical (fallback)
export const NOTE_DISPLAY_NAMES = {
    'D5': 'D', 'D#5': 'D#', 'E5': 'E', 'F5': 'F', 'F#5': 'F#', 'G5': 'G', 'G#5': 'G#', 'A5': 'A', 'A#5': 'Bb', 'B5': 'B', 'C5': 'C', 'C5_ALT': 'C', 'C#6': 'C#',
    'D6': 'd', 'D#6': 'd#', 'E6': 'e', 'F6': 'f', 'F#6': 'f#', 'G6': 'g', 'G#6': 'g#', 'A6': 'a', 'A#6': 'bb', 'B6': 'b', 'C6': 'c', 'C6_ALT': 'c', 'C#7': 'c#',
    'REST': 'Pausa'
};

// Mapeamento de semitons cromáticos em relação à nota fundamental da flauta (D5 = 0)
export const NOTE_TO_SEMITONES = {
    'D5': 0, 'D#5': 1, 'E5': 2, 'F5': 3, 'F#5': 4, 'G5': 5, 'G#5': 6, 'A5': 7, 'A#5': 8, 'B5': 9, 'C5': 10, 'C5_ALT': 10, 'C#6': 11,
    'D6': 12, 'D#6': 13, 'E6': 14, 'F6': 15, 'F#6': 16, 'G6': 17, 'G#6': 18, 'A6': 19, 'A#6': 20, 'B6': 21, 'C6': 22, 'C6_ALT': 22, 'C#7': 23
};

// Mapeamento inverso de semitons para notas nativas da flauta (aproximação diatônica)
export const SEMITONES_TO_NOTE = {
    0: 'D5',
    1: 'D5',
    2: 'E5',
    3: 'F#5',
    4: 'F#5',
    5: 'G5',
    6: 'G5',
    7: 'A5',
    8: 'A5',
    9: 'B5',
    10: 'C5',
    11: 'C#6',
    12: 'D6',
    13: 'D6',
    14: 'E6',
    15: 'F#6',
    16: 'F#6',
    17: 'G6',
    18: 'G6',
    19: 'A6',
    20: 'A6',
    21: 'B6',
    22: 'C6',
    23: 'C#7'
};

// Mapeamento inverso cromático completo (inclui notas de meio-furo)
export const SEMITONES_TO_CHROMATIC_NOTE = {
    0: 'D5',
    1: 'D#5',
    2: 'E5',
    3: 'F5',
    4: 'F#5',
    5: 'G5',
    6: 'G#5',
    7: 'A5',
    8: 'A#5',
    9: 'B5',
    10: 'C5',
    11: 'C#6',
    12: 'D6',
    13: 'D#6',
    14: 'E6',
    15: 'F6',
    16: 'F#6',
    17: 'G6',
    18: 'G#6',
    19: 'A6',
    20: 'A#6',
    21: 'B6',
    22: 'C6',
    23: 'C#7'
};

// Frequências do Bordão Celta (Drone) por Tonalidade
export const DRONE_KEY_FREQUENCIES = {
    'D':  { tonic: 146.83, fifth: 220.00, fifthNote: 'A', label: 'Bordão D + A' },
    'C':  { tonic: 130.81, fifth: 196.00, fifthNote: 'G', label: 'Bordão C + G' },
    'G':  { tonic: 196.00, fifth: 293.66, fifthNote: 'D', label: 'Bordão G + D' },
    'A':  { tonic: 220.00, fifth: 329.63, fifthNote: 'E', label: 'Bordão A + E' },
    'Bb': { tonic: 116.54, fifth: 174.61, fifthNote: 'F', label: 'Bordão B♭ + F' },
    'F':  { tonic: 174.61, fifth: 261.63, fifthNote: 'C', label: 'Bordão F + C' },
    'Eb': { tonic: 155.56, fifth: 233.08, fifthNote: 'B♭', label: 'Bordão E♭ + B♭' }
};

export function getDroneFifthLabel(key) {
    const info = DRONE_KEY_FREQUENCIES[key] || DRONE_KEY_FREQUENCIES['D'];
    if (info.fifthNote) return info.fifthNote;
    return (info.label && info.label.includes('+')) ? info.label.split('+')[1].trim() : '';
}

export const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const ZOOM_LEVELS = ['sm', 'md', 'lg', 'xl'];
export const ZOOM_LABELS = ['85%', '100%', '120%', '140%'];

import { CURATED_REPERTOIRE } from '../../repertoire.js';

// Músicas Padrão (Catálogo oficial completo com 17 partituras curadas em modo somente leitura)
export const DEFAULT_SONGS = CURATED_REPERTOIRE;

export function getWhistleKeyData(whistleKey) {
    return WHISTLE_KEYS_DATA[whistleKey] || WHISTLE_KEYS_DATA['D'];
}

export function getNoteDisplayName(noteKey, whistleKey) {
    if (noteKey === 'REST') return t('music.rest');
    if (noteKey === 'LINEBREAK') return '';
    const keyData = getWhistleKeyData(whistleKey);
    if (keyData && keyData.notes[noteKey]) {
        return keyData.notes[noteKey].display;
    }
    return NOTE_DISPLAY_NAMES[noteKey] || noteKey;
}

export function isNoteOctave2(noteKey, whistleKey) {
    const keyData = getWhistleKeyData(whistleKey);
    if (keyData && keyData.notes[noteKey]) {
        return keyData.notes[noteKey].octave2;
    }
    return noteKey.endsWith('6') || noteKey.endsWith('7');
}

export function getNoteNotationText(noteKey, whistleKey) {
    if (noteKey === 'REST') return ' ';
    if (noteKey === 'LINEBREAK') return '\n';
    const keyData = getWhistleKeyData(whistleKey);
    if (keyData && keyData.notes[noteKey]) {
        return keyData.notes[noteKey].text;
    }
    return '';
}

export function getOrnamentSymbol(ornament) {
    if (!ornament) return '';
    const map = {
        'roll': '~',
        'cut': '^',
        'strike': 'v',
        'cran': '*',
        'slide': '/'
    };
    return map[ornament] || '';
}

export function cycleNextOrnament(current) {
    const sequence = ['', 'roll', 'cut', 'strike', 'cran', 'slide'];
    const idx = sequence.indexOf(current || '');
    return sequence[(idx + 1) % sequence.length];
}

// Ordem dos graus da escala natural da Tin Whistle (1ª e 2ª oitavas)
export const DIATONIC_SCALE_ORDER = [
    'D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6',
    'D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'
];

/**
 * Retorna a nota diatônica superior para corte (Cut) autêntico irlandês.
 * Se a nota for a mais aguda da escala, retorna ela mesma.
 */
export function getDiatonicCutNote(noteKey) {
    const idx = DIATONIC_SCALE_ORDER.indexOf(noteKey);
    if (idx === -1) {
        const chromaticCuts = {
            'C5': 'D6', 'C5_ALT': 'D6', 'C6': 'D6', 'C6_ALT': 'D6',
            'D#5': 'E5', 'F5': 'F#5', 'G#5': 'A5', 'A#5': 'B5',
            'D#6': 'E6', 'F6': 'F#6', 'G#6': 'A6', 'A#6': 'B6'
        };
        return chromaticCuts[noteKey] || noteKey;
    }
    return idx < DIATONIC_SCALE_ORDER.length - 1 ? DIATONIC_SCALE_ORDER[idx + 1] : noteKey;
}

/**
 * Retorna a nota diatônica inferior para batida (Strike) autêntica irlandesa.
 * Se a nota for a mais grave (D5), retorna D5 (onde strike não é possível e usa-se cut/cran).
 */
export function getDiatonicStrikeNote(noteKey) {
    const idx = DIATONIC_SCALE_ORDER.indexOf(noteKey);
    if (idx === -1) {
        const chromaticStrikes = {
            'C5': 'B5', 'C5_ALT': 'B5', 'C6': 'B6', 'C6_ALT': 'B6',
            'D#5': 'D5', 'F5': 'E5', 'G#5': 'G5', 'A#5': 'A5',
            'D#6': 'D6', 'F6': 'E6', 'G#6': 'G6', 'A#6': 'A6'
        };
        return chromaticStrikes[noteKey] || noteKey;
    }
    return idx > 0 ? DIATONIC_SCALE_ORDER[idx - 1] : noteKey;
}

export function getWhistleSemitoneOffset(whistleKey) {
    const data = WHISTLE_KEYS_DATA[whistleKey];
    return data ? data.semitones : 0;
}

export function calculateWhistleKeyDelta(fromKey, toKey) {
    const fromOffset = getWhistleSemitoneOffset(fromKey);
    const toOffset = getWhistleSemitoneOffset(toKey);
    let diff = fromOffset - toOffset;
    // Normalizar para a menor distância angular no círculo cromático (-6 a +6)
    diff = ((diff + 6) % 12 + 12) % 12 - 6;
    return diff;
}

export function getMeasureBeatsPerBar(timeSig) {
    if (timeSig === '3/4') return 3;
    if (timeSig === '2/4') return 2;
    if (timeSig === '6/8') return 3; // 6 colcheias = 3 tempos de semínima na convenção interna
    if (timeSig === '9/8') return 4.5;
    if (timeSig === '12/8') return 6;
    return 4;
}

export function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
