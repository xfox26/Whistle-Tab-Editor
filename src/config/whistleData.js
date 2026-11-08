/* ==========================================================================
   CONFIGURAÇÕES, DICIONÁRIO DE DEDILHADOS, FREQUÊNCIAS E AFINAÇÕES
   ========================================================================== */

// Posição dos furos: 1 (topo) a 6 (base).
// Valores: 1 = Fechado (●), 0 = Aberto (○), 0.5 = Meio Furo (◑).
export const STANDARD_FINGERINGS = {
    'D5':  [1, 1, 1, 1, 1, 1], // Grave
    'E5':  [1, 1, 1, 1, 1, 0],
    'F#5': [1, 1, 1, 1, 0, 0],
    'G5':  [1, 1, 1, 0, 0, 0],
    'A5':  [1, 1, 0, 0, 0, 0],
    'B5':  [1, 0, 0, 0, 0, 0],
    'C5':  [0, 1, 1, 1, 1, 0], // C Natural (1ª oitava)
    'C#6': [0, 0, 0, 0, 0, 0], // C# (1ª oitava)
    
    'D6':  [0, 1, 1, 1, 1, 1], // Agudo (2ª oitava)
    'E6':  [1, 1, 1, 1, 1, 0],
    'F#6': [1, 1, 1, 1, 0, 0],
    'G6':  [1, 1, 1, 0, 0, 0],
    'A6':  [1, 1, 0, 0, 0, 0],
    'B6':  [1, 0, 0, 0, 0, 0],
    'C6':  [0, 1, 1, 1, 1, 0], // C Natural (2ª oitava)
    'C#7': [0, 0, 0, 0, 0, 0],
    
    'REST': [0, 0, 0, 0, 0, 0] // Pausa (Silêncio)
};

// Frequências padrão (para flauta afinada em Ré / D - D5 a D7)
export const NOTE_FREQUENCIES = {
    'D5':  587.33,
    'E5':  659.25,
    'F#5': 739.99,
    'G5':  783.99,
    'A5':  880.00,
    'B5':  987.77,
    'C5':  1046.50, // C Natural grave
    'C#6': 1108.73,
    
    'D6':  1174.66,
    'E6':  1318.51,
    'F#6': 1479.98,
    'G6':  1567.98,
    'A6':  1760.00,
    'B6':  1975.53,
    'C6':  2093.00, // C Natural agudo
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
            'C5':  { name: 'Dó Nat (C)', display: 'C', text: 'c', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Dó Nat (C2)', display: 'c', text: 'C', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>d, e, f#, g, a, b, c#</code> (7ª menor: <code>c</code>) | Agudo: <code>D, E, F#, G, A, B, C#</code> | Pausa: <code>Espaço</code>'
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
            'C5':  { name: 'Si♭ Nat (Bb)', display: 'Bb', text: 'bb', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Si♭ Nat (Bb2)', display: 'bb', text: 'BB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>c, d, e, f, g, a, b</code> (7ª menor: <code>bb</code>) | Agudo: <code>C, D, E, F, G, A, B</code> | Pausa: <code>Espaço</code>'
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
            'C5':  { name: 'Fá Nat (F)', display: 'F', text: 'f', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Fá Nat (F2)', display: 'f', text: 'F', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>g, a, b, c, d, e, f#</code> (7ª menor: <code>f</code>) | Agudo: <code>G, A, B, C, D, E, F#</code> | Pausa: <code>Espaço</code>'
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
            'C5':  { name: 'Sol Nat (G)', display: 'G', text: 'g', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Si (B2)', display: 'b', text: 'B', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Dó# (C#2)', display: 'c#', text: 'C#', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Fá# (F#2)', display: 'f#', text: 'F#', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Sol# (G#2)', display: 'g#', text: 'G#', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Sol Nat (G2)', display: 'g', text: 'G', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>a, b, c#, d, e, f#, g#</code> (7ª menor: <code>g</code>) | Agudo: <code>A, B, C#, D, E, F#, G#</code> | Pausa: <code>Espaço</code>'
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
            'C5':  { name: 'Lá♭ (Ab)', display: 'Ab', text: 'ab', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Lá♭ (Ab2)', display: 'ab', text: 'AB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>bb, c, d, eb, f, g, a</code> (7ª menor: <code>ab</code>) | Agudo: <code>BB, C, D, EB, F, G, A</code> | Pausa: <code>Espaço</code>'
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
            'C5':  { name: 'Mi♭ (Eb)', display: 'Eb', text: 'eb', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Lá (A2)', display: 'a', text: 'A', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Mi (E2)', display: 'e', text: 'E', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>f, g, a, bb, c, d, e</code> (7ª menor: <code>eb</code>) | Agudo: <code>F, G, A, BB, C, D, E</code> | Pausa: <code>Espaço</code>'
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
            'C5':  { name: 'Ré♭ (Db)', display: 'Db', text: 'db', fingering: [0, 1, 1, 1, 1, 0], octave2: false },
            
            'D6':  { name: 'Mi♭ (Eb2)', display: 'eb', text: 'EB', fingering: [0, 1, 1, 1, 1, 1], octave2: true },
            'E6':  { name: 'Fá (F2)', display: 'f', text: 'F', fingering: [1, 1, 1, 1, 1, 0], octave2: true },
            'F#6': { name: 'Sol (G2)', display: 'g', text: 'G', fingering: [1, 1, 1, 1, 0, 0], octave2: true },
            'G6':  { name: 'Lá♭ (Ab2)', display: 'ab', text: 'AB', fingering: [1, 1, 1, 0, 0, 0], octave2: true },
            'A6':  { name: 'Si♭ (Bb2)', display: 'bb', text: 'BB', fingering: [1, 1, 0, 0, 0, 0], octave2: true },
            'B6':  { name: 'Dó (C2)', display: 'c', text: 'C', fingering: [1, 0, 0, 0, 0, 0], octave2: true },
            'C#7': { name: 'Ré (D2)', display: 'd', text: 'D', fingering: [0, 0, 0, 0, 0, 0], octave2: true },
            'C6':  { name: 'Ré♭ (Db2)', display: 'db', text: 'DB', fingering: [0, 1, 1, 1, 1, 0], octave2: true },
            'REST':{ name: 'Pausa', display: 'Pausa', text: ' ', fingering: [0, 0, 0, 0, 0, 0], octave2: false }
        },
        orderOct1: ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6'],
        orderOct2: ['D6', 'E6', 'F#6', 'G6', 'A6', 'B6', 'C#7'],
        orderSpecials: ['C5', 'C6'],
        helpText: 'Grave: <code>eb, f, g, ab, bb, c, d</code> (7ª menor: <code>db</code>) | Agudo: <code>EB, F, G, AB, BB, C, D</code> | Pausa: <code>Espaço</code>'
    }
};

// Nomes amigáveis para exibição musical (fallback)
export const NOTE_DISPLAY_NAMES = {
    'D5': 'D', 'E5': 'E', 'F#5': 'F#', 'G5': 'G', 'A5': 'A', 'B5': 'B', 'C5': 'C', 'C#6': 'C#',
    'D6': 'd', 'E6': 'e', 'F#6': 'f#', 'G6': 'g', 'A6': 'a', 'B6': 'b', 'C6': 'c', 'C#7': 'c#',
    'REST': 'Pausa'
};

// Mapeamento de semitons cromáticos em relação à nota fundamental da flauta (D5 = 0)
export const NOTE_TO_SEMITONES = {
    'D5': 0, 'E5': 2, 'F#5': 4, 'G5': 5, 'A5': 7, 'B5': 9, 'C5': 10, 'C#6': 11,
    'D6': 12, 'E6': 14, 'F#6': 16, 'G6': 17, 'A6': 19, 'B6': 21, 'C6': 22, 'C#7': 23
};

// Mapeamento inverso de semitons para notas nativas da flauta
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

// Frequências do Bordão Celta (Drone) por Tonalidade
export const DRONE_KEY_FREQUENCIES = {
    'D':  { tonic: 146.83, fifth: 220.00, label: 'Bordão D + A' },
    'C':  { tonic: 130.81, fifth: 196.00, label: 'Bordão C + G' },
    'G':  { tonic: 196.00, fifth: 293.66, label: 'Bordão G + D' },
    'A':  { tonic: 220.00, fifth: 329.63, label: 'Bordão A + E' },
    'Bb': { tonic: 116.54, fifth: 174.61, label: 'Bordão B♭ + F' },
    'F':  { tonic: 174.61, fifth: 261.63, label: 'Bordão F + C' },
    'Eb': { tonic: 155.56, fifth: 233.08, label: 'Bordão E♭ + B♭' }
};

export const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const ZOOM_LEVELS = ['sm', 'md', 'lg', 'xl'];
export const ZOOM_LABELS = ['85%', '100%', '120%', '140%'];

// Músicas Padrão (Carregadas se o localStorage e o catálogo curado estiverem vazios)
export const DEFAULT_SONGS = [
    {
        id: 'amazing-grace',
        title: 'Amazing Grace',
        artist: 'Tradicional',
        key: 'D',
        tempo: 100,
        notes: [
            { note: 'D5', duration: 1, lyric: 'A' },
            { note: 'G5', duration: 2, lyric: 'ma' },
            { note: 'B5', duration: 0.5, lyric: 'zing' },
            { note: 'G5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 2, lyric: 'grace,' },
            { note: 'A5', duration: 1, lyric: 'how' },
            { note: 'G5', duration: 2, lyric: 'sweet' },
            { note: 'E5', duration: 1, lyric: 'the' },
            { note: 'D5', duration: 2, lyric: 'sound,' },
            { note: 'REST', duration: 1, lyric: '' },
            { note: 'D5', duration: 1, lyric: 'that' },
            { note: 'G5', duration: 2, lyric: 'saved' },
            { note: 'B5', duration: 0.5, lyric: 'a' },
            { note: 'G5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 2, lyric: 'wretch' },
            { note: 'A5', duration: 1, lyric: 'like' },
            { note: 'D6', duration: 3, lyric: 'me.' }
        ]
    },
    {
        id: 'morrison-jig-theme',
        title: 'Morrison\'s Jig (Tema)',
        artist: 'Irish Trad',
        key: 'D',
        tempo: 120,
        notes: [
            { note: 'E5', duration: 1, lyric: '' },
            { note: 'E5', duration: 0.5, lyric: '' },
            { note: 'E5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 0.5, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 0.5, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'G5', duration: 1, lyric: '' },
            { note: 'F#5', duration: 0.5, lyric: '' },
            { note: 'G5', duration: 1, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'B5', duration: 1, lyric: '' },
            { note: 'A5', duration: 0.5, lyric: '' },
            { note: 'G5', duration: 0.5, lyric: '' },
            { note: 'F#5', duration: 0.5, lyric: '' },
            { note: 'E5', duration: 0.5, lyric: '' },
            { note: 'D5', duration: 1, lyric: '' }
        ]
    }
];

export function getWhistleKeyData(whistleKey) {
    return WHISTLE_KEYS_DATA[whistleKey] || WHISTLE_KEYS_DATA['D'];
}

export function getNoteDisplayName(noteKey, whistleKey) {
    if (noteKey === 'REST') return 'Pausa';
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
